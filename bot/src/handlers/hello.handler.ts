
import { Context } from "grammy"
import { BaseHandler } from "./base.handler"

export class HelloHandler extends BaseHandler {
    protected async validation(ctx: Context): Promise<boolean> {
        const isTextMessage = !!ctx.message?.text
        this.logger.debug( `HelloHandler validation: ${isTextMessage ? "passed" : "failed"}`, )
        return isTextMessage
    }

    protected async handle(ctx: Context): Promise<void> {
        await ctx.reply("Hello from the new HelloHandler! 👋", {
            reply_to_message_id: ctx.message!.message_id,
        })
    }
}
