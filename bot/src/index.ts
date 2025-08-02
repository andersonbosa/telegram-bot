import { Bot } from "grammy"
import { configDotenv } from "dotenv"
import { EventHandlerManager } from "./lib/event-handler.manager"
import { HelloHandler } from "./handlers/hello.handler"
import { VideoCategorizerHandler } from "./handlers/video-categorizer.handler"
import logger from "./services/logger.service"
import { GroupMetadataHandler } from "./handlers/group-metadata.handler"

configDotenv()

async function main() {
    logger.info("Bot is starting...")

    const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!)

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

    bot.start()
}

main().catch((err) => {
    logger.error({ err }, "Unhandled error starting the bot")
    process.exit(1)
})