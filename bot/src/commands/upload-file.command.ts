
import { existsSync } from 'fs'
import { Bot } from 'grammy'
import ora from 'ora'
import { FileUploadService } from '../external/file-upload.service'
import { logger } from '../external/logger.service'
import { FileUploadResult, UploadFileOptions, UploadFolderOptions } from '../types'
import { FolderTreeFactory } from '../internal/tree-node.lib'

export class UploadFileCommand {
    private fileUploadService: FileUploadService

    constructor(bot: Bot) {
        this.fileUploadService = new FileUploadService(bot)
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
                logger.info(result)
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
        const processingText = dryRun ? 'Analyzing files...' : 'Processing files...'
        const spinner = ora(processingText).start()

        try {
            // Validate input file exists
            if (!existsSync(folderPath)) {
                spinner.fail('Input file does not exist')
                throw new FileNotFoundError(folderPath)
            }

            // 1. Criar uma "arvore de nós" com os arquivos e pastas. Assim teremos uma estrutura de dados com os dados que precisamos (por exemplo, caminho absoluto de cada arquivo/pasta/nó)
            const tree = await FolderTreeFactory.create(folderPath)
            console.log(tree)
            // Read and split file into lines
            // const fileContent = readFileSync(folderPath, 'utf-8')
            // const filePaths = fileContent.split('\n').filter(line => line.trim())

            //     const modeText = dryRun ? 'to analyze' : 'to process'
            //     spinner.text = `Found ${filePaths.length} files ${modeText}`
            return []

            //     // Topic mapping - this should be moved to a configuration file in the future
            //     const TOPIC_MAPPING: Record<string, number> = {
            //         'FullCycle': 523
            //     }

            //     if (!(referenceBasePath in TOPIC_MAPPING)) {
            //         spinner.fail(`Tópico não foi mapeado: ${referenceBasePath}`)
            //         process.exit(1)
            //     }

            //     const topicId = TOPIC_MAPPING[referenceBasePath].toString()
            //     const results: FileUploadResult[] = []
            //     let totalSize = 0

            //     // Process each file
            //     for (const [index, filePath] of filePaths.entries()) {
            //         const cleanPath = filePath.trim()

            //         if (!existsSync(cleanPath)) {
            //             logger.warn(`File does not exist: ${cleanPath}`)
            //             results.push({
            //                 success: false,
            //                 fileName: cleanPath,
            //                 error: 'File does not exist',
            //                 dryRun
            //             })
            //             continue
            //         }

            //         const actionText = dryRun ? 'Analyzing' : 'Uploading'
            //         spinner.text = `${actionText} file ${index + 1}/${filePaths.length}: ${cleanPath}`

            //         const result = await this.fileUploadService.uploadFile({
            //             groupId,
            //             topicId,
            //             filePath: cleanPath,
            //             dryRun
            //         })

            //         results.push(result)

            //         if (result.fileSize) {
            //             totalSize += result.fileSize
            //         }
            //     }

            //     // Summary
            //     const successful = results.filter(r => r.success).length
            //     const failed = results.filter(r => !r.success).length
            //     const totalSizeText = totalSize > 0 ? ` (Total size: ${this.formatFileSize(totalSize)})` : ''

            //     if (dryRun) {
            //         spinner.succeed(`DRY RUN - Analysis completed: ${successful} files ready for upload, ${failed} failed${totalSizeText}`)

            //         // Group by file type for summary
            //         const fileTypeStats = results
            //             .filter(r => r.success && r.fileType)
            //             .reduce((acc, r) => {
            //                 const type = r.fileType!
            //                 acc[type] = (acc[type] || 0) + 1
            //                 return acc
            //             }, {} as Record<string, number>)

            //         if (Object.keys(fileTypeStats).length > 0) {
            //             const typesSummary = Object.entries(fileTypeStats)
            //                 .map(([type, count]) => `${type}: ${count}`)
            //                 .join(', ')
            //             logger.info(`File types: ${typesSummary}`)
            //         }
            //     } else {
            //         spinner.succeed(`Upload completed: ${successful} successful, ${failed} failed${totalSizeText}`)
            //     }

            //     if (failed > 0) {
            //         logger.warn('Failed operations:', results.filter(r => !r.success))
            //     }

            //     return results

        } catch (error) {
            const mode = dryRun ? 'Failed to analyze files' : 'Failed to process files'
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
