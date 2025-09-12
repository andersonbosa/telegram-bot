import { describe, it, expect, beforeEach } from 'vitest'
import { FolderTree, FolderTreeFactory } from './tree-node.lib'
import { NodeType, TreeNode } from '../types'
import * as path from 'path'

describe('FolderTree', () => {
    let tree: FolderTree
    const testDataPath = path.resolve(__dirname, '../../../data/FullCycle')

    beforeEach(async () => {
        tree = await FolderTreeFactory.create(testDataPath)
    })

    describe('FolderTreeFactory.create', () => {
        it('should create a tree structure from FullCycle folder', async () => {
            const rootNode = tree.getRootNode()
            
            expect(rootNode).toBeDefined()
            expect(rootNode!.type).toBe(NodeType.DIRECTORY)
            expect(rootNode!.name).toBe('FullCycle')
            expect(rootNode!.childrenIds.length).toBeGreaterThan(0)
        })

        it('should throw error for non-existent path', async () => {
            await expect(FolderTreeFactory.create('/non/existent/path'))
                .rejects.toThrow()
        })

        it('should throw error for file path instead of directory', async () => {
            // Assuming there's at least one MP4 file in the test data
            const filePath = path.join(testDataPath, '001 - curso docker/001 - aula de docker/001 - Nome da aula 1.mp4')
            await expect(FolderTreeFactory.create(filePath))
                .rejects.toThrow('is not a directory')
        })
    })

    describe('Tree Navigation', () => {
        it('should navigate parent-child relationships correctly', async () => {
            const rootNode = tree.getRootNode()!
            const children = tree.getChildren(rootNode)
            
            expect(children.length).toBeGreaterThan(0)
            
            // Test parent relationship
            for (const child of children) {
                const parent = tree.getParent(child)
                expect(parent).toBe(rootNode)
                expect(child.parentId).toBe(rootNode.id)
            }
        })

        it('should get correct path from root to node', async () => {
            let deepestNode: TreeNode | undefined

            await tree.forEachNode((node) => {
                if (!deepestNode || tree.getDepth(node) > tree.getDepth(deepestNode)) {
                    deepestNode = node
                }
            })

            if (deepestNode) {
                const pathToNode = tree.getPath(deepestNode)
                expect(pathToNode.length).toBeGreaterThan(0)
                expect(pathToNode[0]).toBe(tree.getRootNode()) // First should be root
                expect(pathToNode[pathToNode.length - 1]).toBe(deepestNode) // Last should be the node itself
            }
        })

        it('should calculate depth correctly', async () => {
            const rootNode = tree.getRootNode()!
            expect(tree.getDepth(rootNode)).toBe(0)

            const children = tree.getChildren(rootNode)
            if (children.length > 0) {
                expect(tree.getDepth(children[0])).toBe(1)
            }
        })
    })

    describe('forEachNode', () => {
        it('should iterate through all nodes', async () => {
            const visitedNodes: TreeNode[] = []
            
            await tree.forEachNode((node) => {
                visitedNodes.push(node)
            })

            expect(visitedNodes.length).toBeGreaterThan(0)
            expect(visitedNodes[0]).toBe(tree.getRootNode()) // First node should be root
        })

        it('should execute callback for each node type', async () => {
            const directories: TreeNode[] = []
            const files: TreeNode[] = []
            
            await tree.forEachNode((node) => {
                if (node.type === NodeType.DIRECTORY) {
                    directories.push(node)
                } else {
                    files.push(node)
                }
            })

            expect(directories.length).toBeGreaterThan(0)
            expect(files.length).toBeGreaterThan(0)
        })

        it('should handle async callbacks', async () => {
            const processedNodes: string[] = []
            
            await tree.forEachNode(async (node) => {
                // Simulate async operation
                await new Promise(resolve => setTimeout(resolve, 1))
                processedNodes.push(node.name)
            })

            expect(processedNodes.length).toBeGreaterThan(0)
        })
    })

    describe('findNodes', () => {
        it('should find nodes by string pattern', async () => {
            const dockerNodes = await tree.findNodes('docker')
            
            expect(dockerNodes.length).toBeGreaterThan(0)
            dockerNodes.forEach(node => {
                expect(node.name.toLowerCase()).toContain('docker')
            })
        })

        it('should find nodes by regex pattern', async () => {
            const videoNodes = await tree.findNodes(/\.mp4$/i)
            
            expect(videoNodes.length).toBeGreaterThan(0)
            videoNodes.forEach(node => {
                expect(node.name).toMatch(/\.mp4$/i)
                expect(node.type).toBe(NodeType.FILE)
            })
        })
    })

    describe('getFilesByExtension', () => {
        it('should get all MP4 files', async () => {
            const mp4Files = await tree.getFilesByExtension('mp4')
            
            expect(mp4Files.length).toBeGreaterThan(0)
            mp4Files.forEach(file => {
                expect(file.type).toBe(NodeType.FILE)
                expect(file.extension).toBe('mp4')
                expect(file.name).toMatch(/\.mp4$/)
            })
        })

        it('should return empty array for non-existent extension', async () => {
            const txtFiles = await tree.getFilesByExtension('txt')
            expect(txtFiles).toEqual([])
        })
    })

    describe('Tree Properties - No Circular References', () => {
        it('should have no circular references in nodes', async () => {
            await tree.forEachNode((node) => {
                // Every node should have basic properties
                expect(node.id).toBeDefined()
                expect(node.name).toBeDefined()
                expect(node.absolutePath).toBeDefined()
                expect(node.relativePath).toBeDefined()
                expect(node.type).toBeDefined()
                expect(node.childrenIds).toBeDefined()
                expect(Array.isArray(node.childrenIds)).toBe(true)

                // Files should have extension and size
                if (node.type === NodeType.FILE) {
                    expect(node.size).toBeDefined()
                    expect(node.size).toBeGreaterThan(0)
                    if (node.name.includes('.')) {
                        expect(node.extension).toBeDefined()
                    }
                }

                // Directories should have children IDs
                if (node.type === NodeType.DIRECTORY) {
                    expect(Array.isArray(node.childrenIds)).toBe(true)
                }

                // Should not have direct parent reference (avoiding circular)
                expect(node).not.toHaveProperty('parent')
                expect(node).not.toHaveProperty('children')
            })
        })

        it('should be serializable to JSON', () => {
            expect(() => {
                const json = tree.toJSON()
                expect(json).toBeDefined()
                expect(typeof json).toBe('string')
                
                // Should be valid JSON
                const parsed = JSON.parse(json)
                expect(parsed.rootId).toBeDefined()
                expect(parsed.nodes).toBeDefined()
            }).not.toThrow()
        })

        it('should be deserializable from JSON', () => {
            const json = tree.toJSON()
            const deserializedTree = FolderTree.fromJSON(json)
            
            expect(deserializedTree.getRootNode()?.name).toBe(tree.getRootNode()?.name)
            expect(deserializedTree.getAllNodes().length).toBe(tree.getAllNodes().length)
        })
    })

    describe('Tree Statistics', () => {
        it('should provide correct statistics', () => {
            const stats = tree.getStats()
            
            expect(stats.totalNodes).toBeGreaterThan(0)
            expect(stats.fileCount).toBeGreaterThan(0)
            expect(stats.directoryCount).toBeGreaterThan(0)
            expect(stats.totalSize).toBeDefined()
            
            // Total nodes should equal files + directories
            expect(stats.totalNodes).toBe(stats.fileCount + stats.directoryCount)
        })
    })

    describe('Tree Display', () => {
        it('should print tree without errors', () => {
            // Mock console.log to capture output
            const logs: string[] = []
            const originalLog = console.log
            console.log = (message: string) => logs.push(message)

            tree.printTree()

            // Restore console.log
            console.log = originalLog

            expect(logs.length).toBeGreaterThan(0)
            expect(logs[0]).toContain('FullCycle')
        })
    })
})
