import { Bot, InputFile } from 'grammy'
import { existsSync, createReadStream, statSync } from 'fs'
import { basename, extname } from 'path'
import { FileType, FileUploadResult, UploadFileOptions } from '../types'
import { logger } from './logger.service'
import { config } from '../config/config'

export class FileUploadService {
    private bot: Bot

    constructor(bot: Bot) {
        this.bot = bot
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
     * Detects file type based on file extension
     */
    private detectFileType(filePath: string): FileType {
        const extension = extname(filePath).toLowerCase()

        const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.m4v']
        const audioExtensions = ['.mp3', '.wav', '.aac', '.ogg', '.m4a', '.flac']
        const photoExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']

        if (videoExtensions.includes(extension)) {
            return FileType.VIDEO
        } else if (audioExtensions.includes(extension)) {
            return FileType.AUDIO
        } else if (photoExtensions.includes(extension)) {
            return FileType.PHOTO
        } else {
            return FileType.DOCUMENT
        }
    }

    /**
     * Validates if file exists and is accessible
     */
    private validateFile(filePath: string): boolean {
        return existsSync(filePath)
    }

    /**
     * Gets file size in bytes
     */
    private getFileSize(filePath: string): number {
        try {
            const stats = statSync(filePath)
            return stats.size
        } catch {
            return 0
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
     * Uploads a single file to Telegram or simulates the upload in dry-run mode
     */
    async uploadFile(options: UploadFileOptions): Promise<FileUploadResult> {
        const { groupId, topicId, filePath, caption, dryRun = false } = options

        try {
            // Validate file exists
            if (!this.validateFile(filePath)) {
                return {
                    success: false,
                    fileName: basename(filePath),
                    error: 'File does not exist',
                    dryRun
                }
            }

            const fileName = basename(filePath)
            const fileType = this.detectFileType(filePath)
            const fileSize = this.getFileSize(filePath)

            // If dry-run mode, just return the file information without uploading
            if (dryRun) {
                logger.info({
                    fileName,
                    fileType,
                    fileSize: this.formatFileSize(fileSize),
                    groupId,
                    topicId,
                    caption: caption || fileName
                }, 'DRY RUN: Would upload file')

                return {
                    success: true,
                    fileName,
                    dryRun: true,
                    fileType,
                    fileSize
                }
            }

            const fileStream = createReadStream(filePath)
            const inputFile = new InputFile(fileStream, fileName)

            // Select appropriate Telegram API method based on file type
            let response
            const messageOptions = {
                message_thread_id: Number(topicId),
                caption: caption || fileName,
            }

            switch (fileType) {
                case FileType.VIDEO:
                    response = await this.bot.api.sendVideo(groupId, inputFile, messageOptions)
                    break
                case FileType.AUDIO:
                    response = await this.bot.api.sendAudio(groupId, inputFile, messageOptions)
                    break
                case FileType.PHOTO:
                    response = await this.bot.api.sendPhoto(groupId, inputFile, messageOptions)
                    break
                case FileType.DOCUMENT:
                default:
                    response = await this.bot.api.sendDocument(groupId, inputFile, messageOptions)
                    break
            }

            logger.info({ fileName, fileType, messageId: response.message_id }, 'File uploaded successfully')

            return {
                success: true,
                fileName,
                messageId: response.message_id,
                fileType,
                fileSize
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            logger.error({ error, fileName: basename(filePath) }, 'Failed to upload file')

            return {
                success: false,
                fileName: basename(filePath),
                error: errorMessage,
                dryRun
            }
        }
    }

    /**
     * Uploads multiple files from a list of file paths with rate limiting
     */
    async uploadFiles(filePaths: string[], groupId: string, topicId: string, caption?: string, dryRun = false): Promise<FileUploadResult[]> {
        const results: FileUploadResult[] = []

        for (let i = 0; i < filePaths.length; i++) {
            const filePath = filePaths[i]

            // Apply rate limiting delay before each upload (except the first one)
            if (i > 0) {
                await this.applyRateLimit()
            }

            const result = await this.uploadFile({
                groupId,
                topicId,
                filePath: filePath.trim(),
                caption,
                dryRun
            })
            results.push(result)
        }

        return results
    }
}
