import { Context } from "grammy"
import logger from "../services/logger.service"

export abstract class BaseHandler {
    protected logger = logger
    public next: BaseHandler | null = null

    public setNext(handler: BaseHandler): BaseHandler {
        this.next = handler
        return handler
    }

    protected abstract validation(ctx: Context): Promise<boolean>
    protected abstract handle(ctx: Context): Promise<void>
    
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

        if (this.next) {
            await this.next.execute(ctx)
        }
    }
}
