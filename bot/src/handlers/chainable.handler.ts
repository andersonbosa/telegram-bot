import { Context } from "grammy"
import { BaseHandler } from "./base.handler"

/**
 * Abstract class representing a chainable handler in the chain of responsibility pattern.
 * Allows chaining of handlers, where each handler can process the context and pass it to the next handler.
 */
export abstract class ChainableHandler extends BaseHandler {
    /**
     * The handler to be wrapped by this chainable handler.
     * @protected
     */
    protected handler: BaseHandler

    /**
     * The next handler in the chain.
     * @public
     */
    public next: BaseHandler | null = null;

    /**
     * Constructs a new ChainableHandler.
     * @param {BaseHandler} handler - The handler to be wrapped.
     */
    constructor(handler: BaseHandler) {
        super()
        this.handler = handler
    }

    /**
     * Sets the next handler in the chain.
     * @param {BaseHandler} handler - The next handler to be set.
     * @returns {BaseHandler} The handler that was set as next.
     */
    public setNext(handler: BaseHandler): BaseHandler {
        this.next = handler
        return handler
    }

    /**
     * Validates the context by executing the wrapped handler.
     * Returns true if execution succeeds, false otherwise.
     * @param {Context} ctx - The context from grammy.
     * @returns {Promise<boolean>} True if validation passes, false otherwise.
     * @protected
     */
    protected async validation(ctx: Context): Promise<boolean> {
        return this.handler.execute(ctx).then(() => true).catch(() => false)
    }

    /**
     * This method is kept to fulfill the contract of the BaseHandler class.
     * The handling logic has already been executed during validation,
     * so this method remains empty.
     * 
     * @param {Context} ctx - The context from grammy.
     * @protected
     */
    protected async handle(ctx: Context): Promise<void> { }

    /**
     * Executes the handler and, if present, the next handler in the chain.
     * @param {Context} ctx - The context from grammy.
     * @returns {Promise<void>}
     * @public
     */
    public async execute(ctx: Context): Promise<void> {
        await super.execute(ctx)

        if (this.next) {
            await this.next.execute(ctx)
        }
    }
}