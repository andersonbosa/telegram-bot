import { Context } from "grammy"
import logger from "../external/logger.service"

/**
 * Abstract base class for all handlers.
 * Provides a template for validation and handling logic,
 * as well as a standard execution flow with logging and error handling.
 */
export abstract class BaseHandler {
    /**
     * Logger instance for logging handler activity.
     * @protected
     */
    protected logger = logger

    /**
     * Validates whether the handler should process the given context.
     * Must be implemented by subclasses.
     * 
     * @param {Context} ctx - The context from grammy.
     * @returns {Promise<boolean>} - True if the handler should process the context, false otherwise.
     * @protected
     * @abstract
     */
    protected abstract validation(ctx: Context): Promise<boolean>

    /**
     * Handles the processing logic for the given context.
     * Must be implemented by subclasses.
     * 
     * @param {Context} ctx - The context from grammy.
     * @returns {Promise<void>}
     * @protected
     * @abstract
     */
    protected abstract handle(ctx: Context): Promise<void>
    
    /**
     * Executes the handler: validates the context, logs execution, and handles errors.
     * 
     * @param {Context} ctx - The context from grammy.
     * @returns {Promise<void>}
     * @public
     */
    public async execute(ctx: Context): Promise<void> {
        try {
            const isValid = await this.validation(ctx)
            if (isValid) {
                this.logger.info(
                    `Executing handler: ${this.constructor.name}`,
                )
                await this.handle(ctx)
            }
        } catch (error) {
            this.logger.error(
                { err: error },
                `Error in handler ${this.constructor.name}`,
            )
        }
    }
}
