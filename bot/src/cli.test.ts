import { Bot } from "grammy"
import { describe, expect, test, vi } from "vitest"
import { GetChatCommand } from "./commands/get-chat.command"
import { SendMessageCommand, SendMessageOptions } from "./commands/send-message.command"
import { UploadFileCommand } from "./commands/upload-file.command"
import { config } from "./config/config"
import { Message } from "grammy/types"
import { UploadFileOptions, UploadFolderOptions } from "./types"


describe('CLI', () => {
    const bot = new Bot(config.telegram.botToken!)
    const uploadFileCommand = new UploadFileCommand(bot)
    const getChatCommand = new GetChatCommand(bot)
    const sendMessageCommand = new SendMessageCommand(bot)
    bot.start()

    test('should be able to get a chat', async () => {
        const response = await getChatCommand.execute('-1002046679214')
        expect(response).toBeDefined()
        expect(response.id).toBe(-1002046679214)
    })

    test('should be able to send a message', async () => {
        // arrange
        const responseMock: Message.TextMessage = { "message_id": 761, "from": { "id": 8379104327, "is_bot": true, "first_name": "sharizard", "username": "sharichan_bot" }, "chat": { "id": -1002046679214, "title": "Sharizard II", "is_forum": true, "type": "supergroup" }, "date": 1757629071, "message_thread_id": 523, "reply_to_message": { "message_id": 523, "from": { "id": 6498809249, "is_bot": false, "first_name": "Anderson", "username": "andersounde", "language_code": "en" }, "chat": { "id": -1002046679214, "title": "Sharizard II", "is_forum": true, "type": "supergroup" }, "date": 1753792425, "message_thread_id": 523, "forum_topic_created": { "name": "Software/FullCycle/Curso3.0", "icon_color": 9367192 }, "is_topic_message": true }, "text": "teste", "is_topic_message": true }
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
        console.log('==== response:', response)

        // assert
        expect(response).toBeDefined()
    })
})