#!/usr/bin/env node

import { Command } from 'commander'
import { Bot } from 'grammy'
import { config } from './config/config'
import { UploadFileCommand } from './commands/upload-file.command'
import { GetChatCommand } from './commands/get-chat.command'
import { SendMessageCommand } from './commands/send-message.command'

export const program = new Command()

program
    .name('telegram-bot-cli')
    .description('CLI for managing Telegram bot operations')
    .version('1.0.0')

const bot = new Bot(config.telegram.botToken || '')

// Initialize command instances
const uploadFileCommand = new UploadFileCommand(bot)
const getChatCommand = new GetChatCommand(bot)
const sendMessageCommand = new SendMessageCommand(bot)

program
    .command('get-chat')
    .description('Get a specific chat')
    .argument('<groupId>', 'Telegram group ID')
    .action(async (groupId: string) => {
        await getChatCommand.execute(groupId)
    })

program
    .command('send-message')
    .description('Send a message to a specific group')
    .argument('<groupId>', 'Telegram group ID')
    .argument('<topicId>', 'Telegram topic ID')
    .argument('<message>', 'Message to send')
    .action(async (groupId: string, topicId: string, message: string) => {
        await sendMessageCommand.execute({ groupId, topicId, message })
    })

program
    .command('upload-file')
    .description('Upload a file to a specific group and topic')
    .argument('<groupId>', 'Telegram group ID')
    .argument('<topicId>', 'Telegram topic ID')
    .argument('<filePath>', 'Path to the file to upload')
    .option('-c, --caption <caption>', 'Caption for the file', '')
    .action(async (groupId: string, topicId: string, filePath: string, options: { caption?: string }) => {
        await uploadFileCommand.uploadSingleFile({
            groupId,
            topicId,
            filePath,
            caption: options.caption
        })
    })


program
    .command('upload-folder')
    .description('Upload all files from a folder to a specific group and topic')
    .argument('<groupId>', 'Telegram group ID')
    .argument('<folderPath>', 'Path to the folder to upload')
    .argument('<referenceBasePath>', 'Path to the reference base path')
    .action(async (groupId: string, folderPath: string, referenceBasePath: string) => {
        await uploadFileCommand.uploadFolder({
            groupId,
            folderPath,
            referenceBasePath
        })
    })

// Parse command line arguments
program.parse()