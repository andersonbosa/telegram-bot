#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { Bot } from 'grammy'
import { config } from './config/config'
import { logger } from './services/logger.service'

interface ForumTopic {
    message_thread_id: number
    name: string
    icon?: {
        custom_emoji_id: string
    }
    creation_date: number
}

interface TelegramResponse {
    ok: boolean
    result: ForumTopic[]
    description?: string
}

const program = new Command()

program
    .name('telegram-bot-cli')
    .description('CLI for managing Telegram bot operations')
    .version('1.0.0')

const bot = new Bot(config.telegram.botToken || '')

program
    .command('list-topics')
    .description('List all topics in a specific group')
    .argument('<groupId>', 'Telegram group ID')
    .action(async (groupId: string) => {
        const spinner = ora('Fetching group topics...').start()

        try {
            const response = await bot.api.getChat(groupId)
            if (!response) {
                throw new Error('Failed to fetch forum topics')
            }

            spinner.succeed('Successfully fetched group topics')
            logger.info(response)

        } catch (error) {
            spinner.fail('Failed to fetch group topics')
            logger.error('Error fetching group topics:', error)
            process.exit(1)
        }
    })

program
    .command('send-message')
    .description('Send a message to a specific group')
    .argument('<groupId>', 'Telegram group ID')
    .argument('<topicId>', 'Telegram topic ID')
    .argument('<message>', 'Message to send')
    .action(async (groupId: string, topicId: string, message: string) => {
        const spinner = ora('Sending message...').start()
        try {
            const response = await bot.api.sendMessage(groupId, message, {
                message_thread_id: Number(topicId),
            })
            spinner.succeed('Message sent successfully')
            logger.info(response)
        } catch (error) {
            spinner.fail('Failed to send message')
            logger.error('Error sending message:', error)
            process.exit(1)
        }
    })


    
// Parse command line arguments
program.parse()