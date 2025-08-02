
import { Context } from "grammy"
import { BaseHandler } from "./base.handler"

export class GroupMetadataHandler extends BaseHandler {
    protected async validation(ctx: Context): Promise<boolean> {
        const hasMsg = Boolean(ctx.message?.text)
        this.logger.debug(`GroupMetadataHandler validation: ${hasMsg ? "passed" : "failed"}`,)
        return hasMsg
    }

    protected async handle(ctx: Context): Promise<void> {
        const groupId = ctx.message?.chat.id
        if (!groupId) {
            this.logger.error("GroupMetadataHandler: No group ID found")
            return
        }

        const groupMetadata = ctx.message.chat
        this.logger.info(`GroupMetadataHandler: Group ID: ${groupId}`)
        this.logger.info(`GroupMetadataHandler: Group Metadata: ${JSON.stringify(groupMetadata)}`)
    }
}
