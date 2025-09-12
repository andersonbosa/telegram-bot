import { Bot } from "grammy"
import { configDotenv } from "dotenv"
import { EventHandlerManager } from "./internal/event-handler.manager"
import { HelloHandler } from "./handlers/hello.handler"
import { VideoCategorizerHandler } from "./handlers/video-categorizer.handler"
import logger from "./external/logger.service"
import { GroupMetadataHandler } from "./handlers/group-metadata.handler"
import { config } from "./config/config"

configDotenv()

export function createBot() {
    logger.info("Bot is starting...")

    const bot = new Bot(config.telegram.botToken!)

    const eventHandlerManager = new EventHandlerManager()
    // eventHandlerManager.register("message", new HelloHandler())
    // eventHandlerManager.register("::mention", new HelloHandler())
    // eventHandlerManager.register("::mention", new VideoCategorizerHandler())
    eventHandlerManager.attach(bot)

    bot.command("chatinfo", ctx => new GroupMetadataHandler().execute(ctx))

    bot.catch((err) => {
        const ctx = err.ctx
        logger.error({ error: err, update: ctx.update }, "Error while handling update")
    })
    return bot
}

async function main() {
    const bot = createBot()
    bot.start()
}

main().catch((err) => {
    logger.error({ err }, "Unhandled error starting the bot")
    process.exit(1)
})