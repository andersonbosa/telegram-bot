
import { Context } from "grammy"
import { BaseHandler } from "./base.handler"

export class GroupMetadataHandler extends BaseHandler {
    protected async validation(ctx: Context): Promise<boolean> {
        this.logger.debug(`GroupMetadataHandler validation: passed`)
        return true
    }

    protected async handle(ctx: Context): Promise<void> {
        const groupId = ctx.message?.chat.id
        if (!groupId) {
            this.logger.error("GroupMetadataHandler: No group ID found")
            return
        }
        
        const groupMetadata = {
            ...ctx.message,
            message_thread_id: ctx.message.message_thread_id,
        }
        this.logger.info(`GroupMetadataHandler: Group ID: ${groupId}`)
        this.logger.info(`GroupMetadataHandler: Group Metadata: ${JSON.stringify(groupMetadata)}`)
        ctx.reply(JSON.stringify(groupMetadata, null, 2), {
            reply_to_message_id: ctx.message!.message_id,
        })
    }
}
