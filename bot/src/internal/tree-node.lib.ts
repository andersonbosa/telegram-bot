import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'
import { TreeNode, NodeType, NodeCallback } from '../types'
import logger from '../external/logger.service'

export type TreeNodeConstructorProps = {
    name: string
    absolutePath: string
    relativePath: string
    type: NodeType
    extension?: string
    size?: number
    parentId?: string
}

export class FolderTree {
    private readonly logger = logger.child({ component: FolderTree.name })
    private nodes = new Map<string, TreeNode>()
    private rootId: string | null = null

    constructor() {}

    /**
     * Gets a node by its ID
     */
    getNode(id: string): TreeNode | undefined {
        return this.nodes.get(id)
    }

    /**
     * Gets the root node
     */
    getRootNode(): TreeNode | undefined {
        return this.rootId ? this.nodes.get(this.rootId) : undefined
    }

    /**
     * Gets all nodes
     */
    getAllNodes(): TreeNode[] {
        return Array.from(this.nodes.values())
    }

    /**
     * Gets the parent of a node
     */
    getParent(node: TreeNode): TreeNode | undefined {
        return node.parentId ? this.nodes.get(node.parentId) : undefined
    }

    /**
     * Gets all children of a node
     */
    getChildren(node: TreeNode): TreeNode[] {
        return node.childrenIds
            .map(id => this.nodes.get(id))
            .filter((child): child is TreeNode => child !== undefined)
    }

    /**
     * Gets the path from root to the given node
     */
    getPath(node: TreeNode): TreeNode[] {
        const path: TreeNode[] = []
        let current: TreeNode | undefined = node

        while (current) {
            path.unshift(current)
            current = this.getParent(current)
        }

        return path
    }

    /**
     * Gets the depth of a node (root = 0)
     */
    getDepth(node: TreeNode): number {
        let depth = 0
        let current: TreeNode | undefined = node

        while (current?.parentId) {
            depth++
            current = this.getParent(current)
        }

        return depth
    }

    /**
     * Iterates through all nodes and executes a callback for each
     */
    async forEachNode(callback: NodeCallback, startNode?: TreeNode): Promise<void> {
        const root = startNode || this.getRootNode()
        if (!root) {
            throw new Error('No tree has been created or no start node provided')
        }

        await this.traverseNodes(root, callback)
    }

    /**
     * Recursively traverses nodes and executes callback
     */
    private async traverseNodes(node: TreeNode, callback: NodeCallback): Promise<void> {
        await callback(node)

        const children = this.getChildren(node)
        for (const child of children) {
            await this.traverseNodes(child, callback)
        }
    }

    /**
     * Finds nodes by name pattern
     */
    async findNodes(pattern: string | RegExp): Promise<TreeNode[]> {
        const matches: TreeNode[] = []
        const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern

        await this.forEachNode((node) => {
            if (regex.test(node.name)) {
                matches.push(node)
            }
        })

        return matches
    }

    /**
     * Gets all files with a specific extension
     */
    async getFilesByExtension(extension: string): Promise<TreeNode[]> {
        const files: TreeNode[] = []

        await this.forEachNode((node) => {
            if (node.type === NodeType.FILE && node.extension === extension) {
                files.push(node)
            }
        })

        return files
    }

    /**
     * Adds a node to the tree
     */
    addNode(nodeData: TreeNodeConstructorProps): TreeNode {
        const id = this.generateNodeId(nodeData.absolutePath)
        
        const node: TreeNode = {
            id,
            name: nodeData.name,
            absolutePath: nodeData.absolutePath,
            relativePath: nodeData.relativePath,
            type: nodeData.type,
            extension: nodeData.extension,
            size: nodeData.size,
            parentId: nodeData.parentId,
            childrenIds: []
        }

        this.nodes.set(id, node)

        // Add to parent's children list
        if (nodeData.parentId) {
            const parent = this.nodes.get(nodeData.parentId)
            if (parent && !parent.childrenIds.includes(id)) {
                parent.childrenIds.push(id)
            }
        } else {
            // This is the root node
            this.rootId = id
        }

        return node
    }

    /**
     * Generates a unique ID for a node based on its path
     */
    private generateNodeId(absolutePath: string): string {
        return crypto.createHash('md5').update(absolutePath).digest('hex')
    }

    /**
     * Gets statistics about the tree
     */
    getStats() {
        let fileCount = 0
        let directoryCount = 0
        let totalSize = 0

        for (const node of this.nodes.values()) {
            if (node.type === NodeType.FILE) {
                fileCount++
                totalSize += node.size || 0
            } else {
                directoryCount++
            }
        }

        return {
            totalNodes: this.nodes.size,
            fileCount,
            directoryCount,
            totalSize: this.formatFileSize(totalSize)
        }
    }

    /**
     * Formats file size in human-readable format
     */
    private formatFileSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB']
        let size = bytes
        let unitIndex = 0

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024
            unitIndex++
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`
    }

    /**
     * Prints the tree structure to console
     */
    printTree(startNode?: TreeNode, indent: string = ''): void {
        const node = startNode || this.getRootNode()
        if (!node) return

        const typeSymbol = node.type === NodeType.DIRECTORY ? '📁' : '📄'
        const sizeInfo = node.size ? ` (${this.formatFileSize(node.size)})` : ''
        console.log(`${indent}${typeSymbol} ${node.name}${sizeInfo}`)

        const children = this.getChildren(node)
        for (const child of children) {
            this.printTree(child, indent + '  ')
        }
    }

    /**
     * Serializes the tree to JSON (without circular references)
     */
    toJSON(): string {
        const data = {
            rootId: this.rootId,
            nodes: Object.fromEntries(this.nodes)
        }
        return JSON.stringify(data, null, 2)
    }

    /**
     * Deserializes the tree from JSON
     */
    static fromJSON(json: string): FolderTree {
        const data = JSON.parse(json)
        const tree = new FolderTree()
        
        tree.rootId = data.rootId
        tree.nodes = new Map(Object.entries(data.nodes))
        
        return tree
    }
}

export class FolderTreeFactory {
    private static readonly logger = logger.child({ component: FolderTreeFactory.name })

    /**
     * Creates a tree structure from a given folder path
     */
    static async create(folderPath: string): Promise<FolderTree> {
        this.logger.info(`Creating folder tree for path: ${folderPath}`)
        
        try {
            const absolutePath = path.resolve(folderPath)
            const stats = await fs.stat(absolutePath)
            
            if (!stats.isDirectory()) {
                throw new Error(`Path ${folderPath} is not a directory`)
            }

            const tree = new FolderTree()
            await this.buildTreeRecursively(tree, absolutePath, absolutePath)
            
            const stats_tree = tree.getStats()
            this.logger.info(`Tree created successfully: ${stats_tree.totalNodes} nodes (${stats_tree.fileCount} files, ${stats_tree.directoryCount} directories)`)
            
            return tree
        } catch (error) {
            this.logger.error(`Error creating tree structure: ${error}`)
            throw error
        }
    }

    /**
     * Recursively builds tree nodes
     */
    private static async buildTreeRecursively(
        tree: FolderTree,
        currentPath: string,
        basePath: string,
        parentId?: string
    ): Promise<void> {
        const stats = await fs.stat(currentPath)
        const name = path.basename(currentPath)
        const relativePath = path.relative(basePath, currentPath)
        
        // Create the current node
        const node = tree.addNode({
            name,
            absolutePath: currentPath,
            relativePath: relativePath || '.',
            type: stats.isDirectory() ? NodeType.DIRECTORY : NodeType.FILE,
            extension: stats.isFile() ? this.getFileExtension(name) : undefined,
            size: stats.isFile() ? stats.size : undefined,
            parentId
        })

        // Process children for directories
        if (stats.isDirectory()) {
            try {
                const entries = await fs.readdir(currentPath)
                
                // Process each entry
                for (const entry of entries) {
                    // Skip hidden files and directories
                    if (entry.startsWith('.')) continue
                    
                    const entryPath = path.join(currentPath, entry)
                    await this.buildTreeRecursively(tree, entryPath, basePath, node.id)
                }

                // Sort children: directories first, then files, both alphabetically
                const children = tree.getChildren(node)
                children.sort((a, b) => {
                    if (a.type === b.type) {
                        return a.name.localeCompare(b.name)
                    }
                    return a.type === NodeType.DIRECTORY ? -1 : 1
                })

                // Update the sorted children IDs
                node.childrenIds = children.map(child => child.id)
            } catch (error) {
                this.logger.warn(`Error reading directory ${currentPath}: ${error}`)
            }
        }
    }

    /**
     * Extracts file extension from filename
     */
    private static getFileExtension(filename: string): string | undefined {
        const ext = path.extname(filename)
        return ext ? ext.substring(1) : undefined // Remove the dot
    }
}
