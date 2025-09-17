export interface CommandOptions {
    caption?: string
    dryRun?: boolean
}

export interface UploadFileOptions extends CommandOptions {
    groupId: string
    topicId: string
    filePath: string
}

export interface UploadFolderOptions extends CommandOptions {
    groupId: string
    folderPath: string
    referenceBasePath: string
}

export enum FileType {
    VIDEO = 'video',
    AUDIO = 'audio',
    PHOTO = 'photo',
    DOCUMENT = 'document'
}

export interface FileUploadResult {
    success: boolean
    fileName: string
    messageId?: number
    error?: string
    dryRun?: boolean
    fileType?: FileType
    fileSize?: number
}

// Tree node types
export enum NodeType {
    FILE = 'file',
    DIRECTORY = 'directory'
}

export interface TreeNode {
    id: string
    name: string
    absolutePath: string
    relativePath: string
    extension?: string
    type: NodeType
    size?: number
    parentId?: string
    childrenIds: string[]
}

export type NodeCallback = (node: TreeNode) => void | Promise<void>

// Checkpoint types
export interface UploadCheckpoint {
    sessionId: string
    startTime: string
    lastUpdate: string
    params: {
        groupId: string
        folderPath: string
        referenceBasePath: string
        dryRun: boolean
    }
    stats: {
        totalFiles: number
        processedFiles: number
        successfulUploads: number
        failedUploads: number
    }
    completedFiles: string[] // Array of relative paths of completed files
}