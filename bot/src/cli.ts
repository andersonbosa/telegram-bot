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

// Setup basic CLI info
program
    .name('telegram-bot-cli')
    .description('CLI for managing Telegram bot operations')
    .version('1.0.0')

// Initialize bot instance
const bot = new Bot(config.telegram.botToken || '')

// Command to list group topics
program
    .command('list-topics')
    .description('List all topics in a specific group')
    .argument('<groupId>', 'Telegram group ID')
    .action(async (groupId: string) => {
        const spinner = ora('Fetching group topics...').start()

        try {
            // Get forum topics
            const response = await fetch(
                `https://api.telegram.org/bot${config.telegram.botToken}/getForumTopics?chat_id=${groupId}`
            ).then(res => res.json()) as TelegramResponse

            if (!response.ok) {
                throw new Error(response.description || 'Failed to fetch forum topics')
            }

            const topics = response.result
            spinner.succeed('Successfully fetched group topics')

            if (topics.length === 0) {
                console.log(chalk.yellow('\nNo topics found in this group.'))
                return
            }

            console.log('\nGroup Topics:')
            topics.forEach((topic: ForumTopic, index: number) => {
                console.log(
                    chalk.green(`\n${index + 1}. ${topic.name}`)
                    + chalk.gray(`\n   Created: ${new Date(topic.creation_date * 1000).toLocaleString()}`)
                    + chalk.gray(`\n   Icon: ${topic.icon?.custom_emoji_id || 'None'}`)
                    + chalk.gray(`\n   ID: ${topic.message_thread_id}`)
                )
            })
        } catch (error) {
            spinner.fail('Failed to fetch group topics')
            logger.error('Error fetching group topics:', error)
            process.exit(1)
        }
    })

// Parse command line arguments
program.parse()