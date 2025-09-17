
import { existsSync } from 'fs'
import { Bot } from 'grammy'
import ora from 'ora'
import { FileUploadService } from '../external/file-upload.service'
import { logger } from '../external/logger.service'
import { FileUploadResult, UploadFileOptions, UploadFolderOptions, TreeNode, NodeType } from '../types'
import { FolderTreeFactory, FolderTree } from '../internal/tree-node.lib'
import { parseToTelegramHashtag } from '../utils'
import { config } from '../config/config'
import { CheckpointManager } from '../managers/checkpoint.manager'

export class UploadFileCommand {
    private fileUploadService: FileUploadService

    constructor(bot: Bot) {
        this.fileUploadService = new FileUploadService(bot)
    }

    /**
     * Applies rate limiting delay if enabled
     */
    private async applyRateLimit(): Promise<void> {
        if (!config.telegram.rateLimiting.enabled) {
            return
        }

        const delayMs = config.telegram.rateLimiting.uploadDelayMs
        if (delayMs > 0) {
            logger.debug({ delayMs }, 'Applying rate limit delay')
            await new Promise(resolve => setTimeout(resolve, delayMs))
        }
    }

    /**
     * Formats file size for display
     */
    private formatFileSize(bytes: number): string {
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        if (bytes === 0) return '0 Bytes'
        const i = Math.floor(Math.log(bytes) / Math.log(1024))
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
    }

    /**
     * Uploads a single file to a Telegram topic or simulates the upload in dry-run mode
     */
    async uploadSingleFile(options: UploadFileOptions): Promise<FileUploadResult> {
        const { dryRun = false } = options
        const spinnerText = dryRun ? 'Analyzing file...' : 'Uploading file...'
        const spinner = ora(spinnerText).start()

        try {
            const result = await this.fileUploadService.uploadFile(options)

            if (result.success) {
                if (result.dryRun) {
                    const fileInfo = [
                        `File: ${result.fileName}`,
                        `Type: ${result.fileType}`,
                        result.fileSize ? `Size: ${this.formatFileSize(result.fileSize)}` : '',
                        `Group ID: ${options.groupId}`,
                        `Topic ID: ${options.topicId}`,
                        options.caption ? `Caption: ${options.caption}` : `Caption: ${result.fileName}`
                    ].filter(Boolean).join(' | ')

                    spinner.succeed(`DRY RUN - Would upload: ${fileInfo}`)
                } else {
                    const fileInfo = result.fileSize ? ` (${this.formatFileSize(result.fileSize)})` : ''
                    spinner.succeed(`File uploaded successfully: ${result.fileName}${fileInfo}`)
                }

                return result
            } else {
                const mode = result.dryRun ? 'DRY RUN - Failed to analyze file' : 'Failed to upload file'
                spinner.fail(`${mode}: ${result.error}`)
                process.exit(1)
            }
        } catch (error) {
            const mode = dryRun ? 'Failed to analyze file' : 'Failed to upload file'
            spinner.fail(mode)
            logger.error('Error:', error)
            process.exit(1)
        }
    }

    /**
     * Uploads multiple files from a folder or file list, or simulates the uploads in dry-run mode
     */
    async uploadFolder(options: UploadFolderOptions): Promise<FileUploadResult[]> {
        const { groupId, folderPath, referenceBasePath, dryRun = false } = options

        // 1. Initialize checkpoint manager
        const checkpointManager = new CheckpointManager(options)
        const checkpoint = checkpointManager.load(options)
        const isResume = checkpointManager.isResume()

        const processingText = dryRun ? 'Analyzing files...' : 'Processing files...'
        const resumeInfo = isResume ? ` (Resuming: ${checkpoint.completedFiles.length} files already processed)` : ''
        const spinner = ora(processingText + resumeInfo).start()

        try {
            // Validate input file exists
            if (!existsSync(folderPath)) {
                spinner.fail('Input file does not exist')
                throw new FileNotFoundError(folderPath)
            }

            // 1. Criar uma "arvore de nós" com os arquivos e pastas. Assim teremos uma estrutura de dados com os dados que precisamos (por exemplo, caminho absoluto de cada arquivo/pasta/nó)
            const tree = await FolderTreeFactory.create(folderPath)
            const stats = tree.getStats()

            // Log da estrutura criada
            logger.info(`Tree structure created: ${stats.totalNodes} nodes (${stats.fileCount} files, ${stats.directoryCount} directories)`)

            // 2. Collect all files and filter already processed ones
            const allFiles: Array<{ node: TreeNode; index: number }> = []
            const skippedFiles: Array<TreeNode> = []
            let fileIndex = 0

            await tree.forEachNode((node) => {
                if (node.type === NodeType.FILE) {
                    if (checkpointManager.isCompleted(node.relativePath)) {
                        skippedFiles.push(node)
                    } else {
                        allFiles.push({ node, index: fileIndex++ })
                    }
                }
            })

            // Update total files count in checkpoint
            const totalFiles = allFiles.length + skippedFiles.length
            checkpointManager.setTotalFiles(totalFiles)

            const modeText = dryRun ? 'to analyze' : 'to process'
            const filesInfo = isResume ?
                `${allFiles.length} remaining files ${modeText} (${skippedFiles.length} already completed)` :
                `${allFiles.length} files ${modeText}`
            spinner.text = filesInfo

            // 3. Topic mapping - this should be moved to a configuration file in the future
            const TOPIC_MAPPING: Record<string, number> = {
                'FullCycle': 523
            }

            if (!(referenceBasePath in TOPIC_MAPPING)) {
                spinner.fail(`Tópico não foi mapeado: ${referenceBasePath}`)
                process.exit(1)
            }

            const topicId = TOPIC_MAPPING[referenceBasePath].toString()
            const results: FileUploadResult[] = []
            let totalSize = 0

            // 4. Process each file from the tree with rate limiting
            for (const { node, index } of allFiles) {
                const filePath = node.absolutePath

                if (!existsSync(filePath)) {
                    logger.warn(`File does not exist: ${filePath}`)
                    const failedResult = {
                        success: false,
                        fileName: node.name,
                        error: 'File does not exist',
                        dryRun
                    }
                    results.push(failedResult)
                    checkpointManager.markFailed()
                    continue
                }

                // Apply rate limiting delay before each upload (except the first one)
                if (index > 0) {
                    await this.applyRateLimit()

                    // Update spinner text to show rate limiting
                    if (config.telegram.rateLimiting.enabled && config.telegram.rateLimiting.uploadDelayMs > 0) {
                        const actionText = dryRun ? 'Analyzing' : 'Uploading'
                        const currentFile = checkpoint.stats.processedFiles + 1
                        spinner.text = `${actionText} file ${currentFile}/${totalFiles}: ${node.relativePath} (applied ${config.telegram.rateLimiting.uploadDelayMs}ms delay)`
                    }
                }

                const actionText = dryRun ? 'Analyzing' : 'Uploading'
                const currentFile = checkpoint.stats.processedFiles + 1
                spinner.text = `${actionText} file ${currentFile}/${totalFiles}: ${node.relativePath}`

                const [tagGroup, tagSubGroup] = node.relativePath.split('/').map(parseToTelegramHashtag)

                const input = {
                    groupId,
                    topicId,
                    filePath,
                    dryRun,
                    caption: `${node.name} \n#${tagGroup} #${tagSubGroup} `,
                }

                try {
                    const result = await this.fileUploadService.uploadFile(input)
                    results.push(result)

                    if (result.success) {
                        checkpointManager.markCompleted(node.relativePath)
                    } else {
                        checkpointManager.markFailed()
                    }

                    if (result.fileSize) {
                        totalSize += result.fileSize
                    } else if (node.size) {
                        totalSize += node.size
                    }

                    // Save checkpoint every file
                    if (checkpoint.stats.processedFiles % 1 === 0) {
                        checkpointManager.save()
                    }

                    setInterval(() => { throw new Error('teste') }, 2000)


                } catch (error) {
                    const failedResult = {
                        success: false,
                        fileName: node.name,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        dryRun
                    }
                    results.push(failedResult)
                    checkpointManager.markFailed()
                    logger.error(`Failed to upload ${node.relativePath}:`, error)
                }
            }

            // 5. Summary and checkpoint management
            const checkpointStats = checkpointManager.getStats()
            const successful = checkpointStats?.successfulUploads ?? 0
            const failed = checkpointStats?.failedUploads ?? 0
            const totalSizeText = totalSize > 0 ? ` (Total size: ${this.formatFileSize(totalSize)})` : ''

            // Save final checkpoint state
            checkpointManager.save()

            if (dryRun) {
                spinner.succeed(`DRY RUN - Analysis completed: ${successful} files ready for upload, ${failed} failed${totalSizeText}`)

                // Group by file type for summary using tree data
                const fileTypeStats: Record<string, number> = {}

                await tree.forEachNode((node) => {
                    if (node.type === NodeType.FILE && node.extension) {
                        const ext = node.extension.toLowerCase()
                        fileTypeStats[ext] = (fileTypeStats[ext] || 0) + 1
                    }
                })

                if (Object.keys(fileTypeStats).length > 0) {
                    const typesSummary = Object.entries(fileTypeStats)
                        .map(([type, count]) => `${type}: ${count}`)
                        .join(', ')
                    logger.info(`File types: ${typesSummary}`)
                }

                // Additional tree statistics
                logger.info(`Directory structure depth: ${this.getMaxDepth(tree)}`)
                const videoFiles = await tree.getFilesByExtension('mp4')
                if (videoFiles.length > 0) {
                    logger.info(`Video files found: ${videoFiles.length}`)
                }
            } else {
                spinner.succeed(`Upload completed: ${successful} successful, ${failed} failed${totalSizeText}`)
            }

            // Checkpoint cleanup and user feedback
            if (failed === 0 && allFiles.length === 0) {
                // All files processed successfully or no files to process
                checkpointManager.cleanup()
                if (isResume) {
                    console.log('✅ All files processed successfully - checkpoint cleaned up')
                }
            } else if (failed > 0) {
                console.log(`\n💾 Progress saved. To retry failed uploads, run the same command again.`)
                console.log(`📁 To start fresh, delete: ${checkpointManager.getFilename()}`)
                logger.warn('Failed operations:', results.filter(r => !r.success))
            } else {
                // Successful completion
                checkpointManager.cleanup()
                console.log('✅ Upload completed successfully - checkpoint cleaned up')
            }

            return results

        } catch (error) {
            // Save progress even in case of critical error
            checkpointManager.save()

            const mode = dryRun ? 'Failed to analyze files' : 'Failed to process files'
            spinner.fail(mode)
            logger.error('Error:', error)

            console.log(`\n💾 Progress saved. To retry, run the same command again.`)
            console.log(`📁 To start fresh, delete: ${checkpointManager.getFilename()}`)

            if (!isCommandError(error)) {
                logger.info('Error is not a command error', error)
                throw error
            }
            return []
        }
    }

    /**
     * Uploads multiple files from an array of file paths or simulates the uploads in dry-run mode
     */
    async uploadMultipleFiles(filePaths: string[], groupId: string, topicId: string, caption?: string, dryRun = false): Promise<FileUploadResult[]> {
        const actionText = dryRun ? 'Analyzing' : 'Uploading'
        const spinner = ora(`${actionText} ${filePaths.length} files...`).start()

        try {
            const results = await this.fileUploadService.uploadFiles(filePaths, groupId, topicId, caption, dryRun)

            const successful = results.filter(r => r.success).length
            const failed = results.filter(r => !r.success).length

            const totalSize = results.reduce((sum, r) => sum + (r.fileSize || 0), 0)
            const totalSizeText = totalSize > 0 ? ` (Total size: ${this.formatFileSize(totalSize)})` : ''

            if (dryRun) {
                spinner.succeed(`DRY RUN - Batch analysis completed: ${successful} files ready for upload, ${failed} failed${totalSizeText}`)
            } else {
                spinner.succeed(`Batch upload completed: ${successful} successful, ${failed} failed${totalSizeText}`)
            }

            return results
        } catch (error) {
            const mode = dryRun ? 'Failed to analyze files' : 'Failed to upload files'
            spinner.fail(mode)
            logger.error('Error:', error)

            if (!isCommandError(error)) {
                logger.info('Error is not a command error', error)
                throw error
            }

            return []
        }
    }

    /**
     * Helper method to get maximum depth of the tree
     */
    private getMaxDepth(tree: FolderTree): number {
        let maxDepth = 0
        const rootNode = tree.getRootNode()

        if (rootNode) {
            const calculateMaxDepth = (node: TreeNode, currentDepth: number): void => {
                maxDepth = Math.max(maxDepth, currentDepth)
                const children = tree.getChildren(node)
                for (const child of children) {
                    calculateMaxDepth(child, currentDepth + 1)
                }
            }

            calculateMaxDepth(rootNode, 0)
        }

        return maxDepth
    }
}

export function isCommandError(error: unknown): boolean {
    return error instanceof CommandError
}

export class CommandError extends Error {
    constructor(message: string) {
        super(message)
        this.name = this.constructor.name
    }
}

export class FileNotFoundError extends CommandError {
    constructor(filePath: string) {
        super(`File not found: ${filePath}`)
    }
}

export class FolderNotFoundError extends CommandError {
    constructor(folderPath: string) {
        super(`Folder not found: ${folderPath}`)
    }
}
