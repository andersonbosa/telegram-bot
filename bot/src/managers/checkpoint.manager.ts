import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { UploadFolderOptions, UploadCheckpoint } from '../types'
import { getCheckpointFilename } from '../utils/checkpoint.util'
import { logger } from '../external/logger.service'

export class CheckpointManager {
    private filename: string
    private checkpoint: UploadCheckpoint | null = null

    constructor(options: UploadFolderOptions) {
        this.filename = getCheckpointFilename(
            options.groupId,
            options.folderPath,
            options.referenceBasePath
        )
    }

    /**
     * Load existing checkpoint or create a new one
     */
    load(options: UploadFolderOptions): UploadCheckpoint {
        if (existsSync(this.filename)) {
            try {
                const data = JSON.parse(readFileSync(this.filename, 'utf8'))
                this.checkpoint = data
                logger.info(`📂 Loaded checkpoint: ${this.checkpoint?.completedFiles.length ?? 0} files already processed`)
                return data
            } catch (error) {
                logger.warn(`⚠️  Checkpoint file corrupted, starting fresh`)
            }
        }

        // Create new checkpoint
        this.checkpoint = {
            sessionId: Date.now().toString(),
            startTime: new Date().toISOString(),
            lastUpdate: new Date().toISOString(),
            params: {
                groupId: options.groupId,
                folderPath: options.folderPath,
                referenceBasePath: options.referenceBasePath,
                dryRun: options.dryRun || false
            },
            stats: {
                totalFiles: 0,
                processedFiles: 0,
                successfulUploads: 0,
                failedUploads: 0
            },
            completedFiles: []
        }

        return this.checkpoint
    }

    /**
     * Check if a file has already been processed
     */
    isCompleted(relativePath: string): boolean {
        return this.checkpoint?.completedFiles.includes(relativePath) ?? false
    }

    /**
     * Mark a file as successfully completed
     */
    markCompleted(relativePath: string): void {
        if (this.checkpoint && !this.isCompleted(relativePath)) {
            this.checkpoint.completedFiles.push(relativePath)
            this.checkpoint.stats.successfulUploads++
            this.checkpoint.stats.processedFiles++
            this.checkpoint.lastUpdate = new Date().toISOString()
        }
    }

    /**
     * Mark a file as failed
     */
    markFailed(): void {
        if (this.checkpoint) {
            this.checkpoint.stats.failedUploads++
            this.checkpoint.stats.processedFiles++
            this.checkpoint.lastUpdate = new Date().toISOString()
        }
    }

    /**
     * Update total files count
     */
    setTotalFiles(count: number): void {
        if (this.checkpoint) {
            this.checkpoint.stats.totalFiles = count
        }
    }

    /**
     * Save checkpoint to disk
     */
    save(): void {
        if (this.checkpoint) {
            try {
                writeFileSync(this.filename, JSON.stringify(this.checkpoint, null, 2))
                logger.debug(`💾 Checkpoint saved: ${this.filename}`)
            } catch (error) {
                logger.error('Failed to save checkpoint:', error)
            }
        }
    }

    /**
     * Remove checkpoint file (when upload is complete)
     */
    cleanup(): void {
        try {
            if (existsSync(this.filename)) {
                unlinkSync(this.filename)
                logger.info(`🗑️  Checkpoint cleaned up: ${this.filename}`)
            }
        } catch (error) {
            logger.error('Failed to cleanup checkpoint:', error)
        }
    }

    /**
     * Get current statistics
     */
    getStats() {
        return this.checkpoint?.stats ?? null
    }

    /**
     * Get checkpoint filename for user reference
     */
    getFilename(): string {
        return this.filename
    }

    /**
     * Check if this is a resume operation
     */
    isResume(): boolean {
        return (this.checkpoint?.completedFiles.length ?? 0) > 0
    }
}
