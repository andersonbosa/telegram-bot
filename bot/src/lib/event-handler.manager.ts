import { Bot, FilterQuery } from "grammy"
import { BaseHandler } from "../handlers/base.handler"
import logger from "../services/logger.service"

export class EventHandlerManager {
    private chains: Map<FilterQuery, BaseHandler> = new Map()

    public register(event: FilterQuery, handler: BaseHandler): void {
        logger.info(`Registering handler ${handler.constructor.name} for event '${event}'`)
        if (!this.chains.has(event)) {
            this.chains.set(event, handler)
        } else {
            let lastHandler = this.chains.get(event)!
            while (lastHandler.next) {
                lastHandler = lastHandler.next
            }
            lastHandler.setNext(handler)
        }
    }

    public attach(bot: Bot): void {
        logger.info("Attaching event handlers to the bot")
        for (const [event, handler] of this.chains.entries()) {
            bot.on(event, (ctx) => handler.execute(ctx))
        }
    }
}