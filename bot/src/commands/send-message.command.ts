import { Bot } from 'grammy'
import { Message } from 'grammy/types'
import ora from 'ora'
import { logger } from '../external/logger.service'

export interface SendMessageOptions {
    groupId: string;
    topicId: string;
    message: string;
}

export class SendMessageCommand {
    private bot: Bot;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    /**
     * Sends a message to a specific group and topic
     */
    async execute(options: SendMessageOptions): Promise<Message.TextMessage> {
        const { groupId, topicId, message } = options;
        const spinner = ora('Sending message...').start();
        
        try {
            const response = await this.bot.api.sendMessage(groupId, message, {
                message_thread_id: Number(topicId),
            });
            
            spinner.succeed('Message sent successfully');
            logger.info(response);
            return response;
        } catch (error) {
            spinner.fail('Failed to send message');
            logger.error('Error sending message:', error);
            process.exit(1);
        }
    }
}
