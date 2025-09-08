import { Bot, InputFile } from 'grammy';
import { existsSync, createReadStream } from 'fs';
import { basename, extname } from 'path';
import { FileType, FileUploadResult, UploadFileOptions } from '../types';
import { logger } from './logger.service';

export class FileUploadService {
    private bot: Bot;
    
    constructor(bot: Bot) {
        this.bot = bot;
    }

    /**
     * Detects file type based on file extension
     */
    private detectFileType(filePath: string): FileType {
        const extension = extname(filePath).toLowerCase();
        
        const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.m4v'];
        const audioExtensions = ['.mp3', '.wav', '.aac', '.ogg', '.m4a', '.flac'];
        const photoExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
        
        if (videoExtensions.includes(extension)) {
            return FileType.VIDEO;
        } else if (audioExtensions.includes(extension)) {
            return FileType.AUDIO;
        } else if (photoExtensions.includes(extension)) {
            return FileType.PHOTO;
        } else {
            return FileType.DOCUMENT;
        }
    }

    /**
     * Validates if file exists and is accessible
     */
    private validateFile(filePath: string): boolean {
        return existsSync(filePath);
    }

    /**
     * Uploads a single file to Telegram
     */
    async uploadFile(options: UploadFileOptions): Promise<FileUploadResult> {
        const { groupId, topicId, filePath, caption } = options;
        
        try {
            // Validate file exists
            if (!this.validateFile(filePath)) {
                return {
                    success: false,
                    fileName: basename(filePath),
                    error: 'File does not exist'
                };
            }

            const fileName = basename(filePath);
            const fileType = this.detectFileType(filePath);
            const fileStream = createReadStream(filePath);
            const inputFile = new InputFile(fileStream, fileName);

            // Select appropriate Telegram API method based on file type
            let response;
            const messageOptions = {
                message_thread_id: Number(topicId),
                caption: caption || fileName,
            };

            switch (fileType) {
                case FileType.VIDEO:
                    response = await this.bot.api.sendVideo(groupId, inputFile, messageOptions);
                    break;
                case FileType.AUDIO:
                    response = await this.bot.api.sendAudio(groupId, inputFile, messageOptions);
                    break;
                case FileType.PHOTO:
                    response = await this.bot.api.sendPhoto(groupId, inputFile, messageOptions);
                    break;
                case FileType.DOCUMENT:
                default:
                    response = await this.bot.api.sendDocument(groupId, inputFile, messageOptions);
                    break;
            }

            logger.info({ fileName, fileType, messageId: response.message_id }, 'File uploaded successfully');
            
            return {
                success: true,
                fileName,
                messageId: response.message_id
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error({ error, fileName: basename(filePath) }, 'Failed to upload file');
            
            return {
                success: false,
                fileName: basename(filePath),
                error: errorMessage
            };
        }
    }

    /**
     * Uploads multiple files from a list of file paths
     */
    async uploadFiles(filePaths: string[], groupId: string, topicId: string, caption?: string): Promise<FileUploadResult[]> {
        const results: FileUploadResult[] = [];
        
        for (const filePath of filePaths) {
            const result = await this.uploadFile({
                groupId,
                topicId,
                filePath: filePath.trim(),
                caption
            });
            results.push(result);
        }
        
        return results;
    }
}
