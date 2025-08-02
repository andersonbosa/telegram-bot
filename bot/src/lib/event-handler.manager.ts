import { Bot, FilterQuery } from "grammy"
import { BaseHandler } from "../handlers/base.handler"
import { ChainableHandlerImpl } from "./chainable-handler-impl"
import { ChainableHandler } from "../handlers/chainable.handler"
import logger from "../services/logger.service"

/**
 * Manages the registration and attachment of event handlers for a Telegram bot.
 * Supports chaining multiple handlers for the same event using the chain of responsibility pattern.
 */
export class EventHandlerManager {
    /**
     * Stores the mapping between events and their corresponding handler chains.
     * @private
     */
    private chains: Map<FilterQuery, BaseHandler> = new Map()

    /**
     * Registers a handler for a specific event. If a handler already exists for the event,
     * the new handler is appended to the end of the chain.
     *
     * @param {FilterQuery} event - The event to register the handler for.
     * @param {BaseHandler} handler - The handler to be registered.
     * @returns {void}
     */
    public register(event: FilterQuery, handler: BaseHandler): void {
        logger.info(`Registering handler ${handler.constructor.name} for event '${event}'`)
        if (!this.chains.has(event)) {
            this.chains.set(event, handler)
        } else {
            const lastHandler = this.chains.get(event)!

            // If the last handler is not chainable, wrap it in a ChainableHandlerImpl
            if (!(lastHandler instanceof ChainableHandler)) {
                this.chains.set(event, new ChainableHandlerImpl(lastHandler))
            }

            // Add the new handler to the end of the chain
            const chainableHandler = this.chains.get(event) as ChainableHandler
            let current = chainableHandler
            while (current.next) {
                current = current.next as ChainableHandler
            }

            // If the new handler is not chainable, wrap it in a ChainableHandlerImpl
            const nextHandler = handler instanceof ChainableHandler ? handler : new ChainableHandlerImpl(handler)
            current.setNext(nextHandler)
        }
    }

    /**
     * Attaches all registered event handlers to the provided bot instance.
     *
     * @param {Bot} bot - The Telegram bot instance to attach handlers to.
     * @returns {void}
     */
    public attach(bot: Bot): void {
        logger.info("Attaching event handlers to the bot")
        for (const [event, handler] of this.chains.entries()) {
            bot.on(event, (ctx) => handler.execute(ctx))
        }
    }
}