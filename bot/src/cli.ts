#!/usr/bin/env node

import { Command } from 'commander'
import { Bot } from 'grammy'
import { GetChatCommand } from './commands/get-chat.command'
import { SendMessageCommand } from './commands/send-message.command'
import { UploadFileCommand } from './commands/upload-file.command'
import { config } from './config/config'

const cli = new Command()

cli
    .name('telegram-bot-cli')
    .description('CLI for managing Telegram bot operations')
    .version('1.0.0')

const bot = new Bot(config.telegram.botToken || '')

// Initialize command instances
const uploadFileCommand = new UploadFileCommand(bot)
const getChatCommand = new GetChatCommand(bot)
const sendMessageCommand = new SendMessageCommand(bot)

cli
    .command('get-chat')
    .description('Get a specific chat')
    .argument('<groupId>', 'Telegram group ID')
    .action(async (groupId: string) => {
        const response = await getChatCommand.execute(groupId)
        console.log(JSON.stringify(response, null, 2))
    })

cli
    .command('send-message')
    .description('Send a message to a specific group')
    .argument('<groupId>', 'Telegram group ID')
    .argument('<topicId>', 'Telegram topic ID')
    .argument('<message>', 'Message to send')
    .action(async (groupId: string, topicId: string, message: string) => {
        const response = await sendMessageCommand.execute({ groupId, topicId, message })
        console.log(JSON.stringify(response, null, 2))
    })

cli
    .command('upload-file')
    .description('Upload a file to a specific group and topic')
    .argument('<groupId>', 'Telegram group ID')
    .argument('<topicId>', 'Telegram topic ID')
    .argument('<filePath>', 'Path to the file to upload')
    .option('-c, --caption <caption>', 'Caption for the file', '')
    .option('-d, --dry-run', 'Simulate the upload without actually uploading the file', false)
    .action(async (groupId: string, topicId: string, filePath: string, options: { caption?: string; dryRun?: boolean }) => {
        const response = await uploadFileCommand.uploadSingleFile({
            groupId,
            topicId,
            filePath,
            caption: options.caption,
            dryRun: options.dryRun
        })
        console.log(JSON.stringify(response, null, 2))
    })


cli
    .command('upload-folder')
    .description('Upload all files from a folder to a specific group and topic')
    .argument('<groupId>', 'Telegram group ID')
    .argument('<folderPath>', 'Path to the folder to upload')
    .argument('<referenceBasePath>', 'Path to the reference base path')
    .option('-d, --dry-run', 'Simulate the uploads without actually uploading the files', false)
    .action(async (groupId: string, folderPath: string, referenceBasePath: string, options: { dryRun?: boolean }) => {
        const response = await uploadFileCommand.uploadFolder({
            groupId,
            folderPath,
            referenceBasePath,
            dryRun: options.dryRun
        })
        console.log(JSON.stringify(response, null, 2))
    })

// Parse command line arguments
if (config.env !== 'test') {
    cli.parse()
}

export { cli }
