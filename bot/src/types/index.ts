
// Command interfaces
export interface CommandOptions {
    caption?: string;
}

export interface UploadFileOptions extends CommandOptions {
    groupId: string;
    topicId: string;
    filePath: string;
}

export interface UploadFolderOptions {
    groupId: string;
    folderPath: string;
    referenceBasePath: string;
}

export enum FileType {
    VIDEO = 'video',
    AUDIO = 'audio',
    PHOTO = 'photo',
    DOCUMENT = 'document'
}

export interface FileUploadResult {
    success: boolean;
    fileName: string;
    messageId?: number;
    error?: string;
}

export interface ForumTopic {
    message_thread_id: number;
    name: string;
    icon?: {
        custom_emoji_id: string;
    };
    creation_date: number;
}

export interface TelegramResponse {
    ok: boolean;
    result: ForumTopic[];
    description?: string;
}

// só para ajudar a entender o payload
export interface TelegramMessage {
    message_id: number,
    from: {
        id: number,
        is_bot: boolean,
        first_name: string,
        username: string,
        language_code: string
    },
    chat: {
        id: number,
        title: string,
        is_forum: boolean,
        type: string
    },
    date: number,
    message_thread_id: number,
    reply_to_message: {
        message_id: number,
        from: {
            id: number,
            is_bot: boolean,
            first_name: string,
            username: string,
            language_code: string
        },
        chat: {
            id: number,
            title: string,
            is_forum: boolean,
            type: string
        },
        date: number,
        message_thread_id: number,
        forum_topic_created: {
            name: string,
            icon_color: number,
            icon_custom_emoji_id: string
        },
        is_topic_message: true
    },
    video: {
        duration: number,
        width: number,
        height: number,
        file_name: string,
        mime_type: string,
        thumbnail: {
            file_id: string,
            file_unique_id: string,
            file_size: number,
            width: number,
            height: number
        },
        thumb: {
            file_id: string,
            file_unique_id: string,
            file_size: number,
            width: number,
            height: number
        },
        file_id: string,
        file_unique_id: string,
        file_size: number
    },
    is_topic_message: boolean
}