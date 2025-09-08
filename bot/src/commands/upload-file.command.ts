
import { Bot } from 'grammy';
import { existsSync, readFileSync } from 'fs';
import ora from 'ora';
import { UploadFileOptions, UploadFolderOptions, FileUploadResult } from '../types';
import { FileUploadService } from '../services/file-upload.service';
import { logger } from '../services/logger.service';

export class UploadFileCommand {
    private fileUploadService: FileUploadService;

    constructor(bot: Bot) {
        this.fileUploadService = new FileUploadService(bot);
    }

    /**
     * Uploads a single file to a Telegram topic
     */
    async uploadSingleFile(options: UploadFileOptions): Promise<void> {
        const spinner = ora('Uploading file...').start();
        
        try {
            const result = await this.fileUploadService.uploadFile(options);
            
            if (result.success) {
                spinner.succeed(`File uploaded successfully: ${result.fileName}`);
                logger.info(result);
            } else {
                spinner.fail(`Failed to upload file: ${result.error}`);
                process.exit(1);
            }
        } catch (error) {
            spinner.fail('Failed to upload file');
            logger.error('Error uploading file:', error);
            process.exit(1);
        }
    }

    /**
     * Uploads multiple files from a folder or file list
     */
    async uploadFolder(options: UploadFolderOptions): Promise<void> {
        const { groupId, folderPath, referenceBasePath } = options;
        const spinner = ora('Processing files...').start();
        
        try {
            // Validate input file exists
            if (!existsSync(folderPath)) {
                spinner.fail('Input file does not exist');
                process.exit(1);
            }

            // Read and split file into lines
            const fileContent = readFileSync(folderPath, 'utf-8');
            const filePaths = fileContent.split('\n').filter(line => line.trim());

            spinner.text = `Found ${filePaths.length} files to process`;

            // Topic mapping - this should be moved to a configuration file in the future
            const TOPIC_MAPPING: Record<string, number> = {
                'FullCycle': 523
            };

            if (!(referenceBasePath in TOPIC_MAPPING)) {
                spinner.fail(`Tópico não foi mapeado: ${referenceBasePath}`);
                process.exit(1);
            }

            const topicId = TOPIC_MAPPING[referenceBasePath].toString();
            const results: FileUploadResult[] = [];

            // Process each file
            for (const [index, filePath] of filePaths.entries()) {
                const cleanPath = filePath.trim();
                
                if (!existsSync(cleanPath)) {
                    logger.warn(`File does not exist: ${cleanPath}`);
                    results.push({
                        success: false,
                        fileName: cleanPath,
                        error: 'File does not exist'
                    });
                    continue;
                }

                spinner.text = `Uploading file ${index + 1}/${filePaths.length}: ${cleanPath}`;

                const result = await this.fileUploadService.uploadFile({
                    groupId,
                    topicId,
                    filePath: cleanPath
                });

                results.push(result);
            }

            // Summary
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            spinner.succeed(`Upload completed: ${successful} successful, ${failed} failed`);
            
            if (failed > 0) {
                logger.warn('Failed uploads:', results.filter(r => !r.success));
            }

        } catch (error) {
            spinner.fail('Failed to process files');
            logger.error('Error processing files:', error);
            process.exit(1);
        }
    }

    /**
     * Uploads multiple files from an array of file paths
     */
    async uploadMultipleFiles(filePaths: string[], groupId: string, topicId: string, caption?: string): Promise<FileUploadResult[]> {
        const spinner = ora(`Uploading ${filePaths.length} files...`).start();
        
        try {
            const results = await this.fileUploadService.uploadFiles(filePaths, groupId, topicId, caption);
            
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;
            
            spinner.succeed(`Batch upload completed: ${successful} successful, ${failed} failed`);
            
            return results;
        } catch (error) {
            spinner.fail('Failed to upload files');
            logger.error('Error uploading files:', error);
            throw error;
        }
    }
}