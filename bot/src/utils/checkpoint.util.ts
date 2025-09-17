import { createHash } from 'crypto'

/**
 * Generates a unique hash for checkpoint identification
 * Based on groupId + folderPath + referenceBasePath
 */
export function generateCheckpointHash(groupId: string, folderPath: string, referenceBasePath: string): string {
    const combined = `${groupId}${folderPath}${referenceBasePath}`
    return createHash('md5').update(combined).digest('hex')
}

/**
 * Gets the checkpoint filename for given parameters
 */
export function getCheckpointFilename(groupId: string, folderPath: string, referenceBasePath: string): string {
    const hash = generateCheckpointHash(groupId, folderPath, referenceBasePath)
    return `checkpoint_${hash}.json`
}
