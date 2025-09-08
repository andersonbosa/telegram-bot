import { Bot } from 'grammy';
import ora from 'ora';
import { logger } from '../services/logger.service';

export class GetChatCommand {
    private bot: Bot;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    /**
     * Gets information about a specific chat/group
     */
    async execute(groupId: string): Promise<void> {
        const spinner = ora('Fetching group information...').start();

        try {
            const response = await this.bot.api.getChat(groupId);
            if (!response) {
                throw new Error('Failed to fetch chat information');
            }

            spinner.succeed('Successfully fetched group information');
            logger.info(response);

        } catch (error) {
            spinner.fail('Failed to fetch group information');
            logger.error('Error fetching group information:', error);
            process.exit(1);
        }
    }
}
