import { Bot } from "grammy"
import { Message } from "grammy/types"
import { describe, expect, test, vi } from "vitest"
import { GetChatCommand } from "./commands/get-chat.command"
import { SendMessageCommand, SendMessageOptions } from "./commands/send-message.command"
import { UploadFileCommand } from "./commands/upload-file.command"
import { config } from "./config/config"
import { TestUtils } from "./test/utils"
import { UploadFileOptions, UploadFolderOptions } from "./types"


describe('CLI', () => {
    const bot = new Bot(config.telegram.botToken!)
    const uploadFileCommand = new UploadFileCommand(bot)
    const getChatCommand = new GetChatCommand(bot)
    const sendMessageCommand = new SendMessageCommand(bot)
    bot.start()

    test('should be able to get a chat', async () => {
        // arrange
        const responseMock = TestUtils.getMockFromJsonFile('command-get-chat')
        const getChatStub = vi
            .spyOn(getChatCommand['bot'].api, 'getChat')
            .mockResolvedValue(responseMock)
        const commandInput = '-1002046679214'

        // act
        const response = await getChatCommand.execute(commandInput)

        // assert
        expect(response).toBeDefined()
        expect(response.id).toBe(-1002046679214)
        expect(getChatStub).toHaveBeenCalledWith(commandInput)
    })

    test('should be able to send a message', async () => {
        // arrange
        const responseMock: Message.TextMessage = TestUtils.getMockFromJsonFile('command-send-message')
        const sendMessageStub = vi
            .spyOn(sendMessageCommand['bot'].api, 'sendMessage')
            .mockResolvedValue(responseMock)
        const input: SendMessageOptions = { groupId: '-1002046679214', topicId: '523', message: 'teste' }

        // act
        const response = await sendMessageCommand.execute(input)

        // assert
        expect(response).toBeDefined()
        expect(sendMessageStub).toHaveBeenCalledWith(input.groupId, input.message, { message_thread_id: Number(input.topicId) })
    })

    test('should be able to upload a file', async () => {
        // arrange
        // const responseMock =  {"success":true,"fileName":"001 - Nome da aula 1.mp4","messageId":763,"fileType":"video","fileSize":42887}
        const input: UploadFileOptions = {
            groupId: '-1002046679214',
            topicId: '523',
            filePath: '../data/FullCycle/001 - curso docker/001 - aula de docker/001 - Nome da aula 1.mp4',
            caption: 'lalalalala',
            dryRun: true
        }

        // act
        const response = await uploadFileCommand.uploadSingleFile(input)

        // assert
        expect(response).toBeDefined()
        expect(response.success).toBe(true)
    })

    test('should be able to upload a folder', async () => {
        // arrange
        const input: UploadFolderOptions = {
            groupId: '-1002046679214',
            folderPath: '../data/FullCycle',
            referenceBasePath: 'FullCycle',
            dryRun: true
        }

        // act
        const response = await uploadFileCommand.uploadFolder(input)

        // assert
        expect(response).toBeDefined()
    })
})