import { Context, Filter } from "grammy"
import path from "path"
import { BaseHandler } from "./base.handler"

export class VideoCategorizerHandler extends BaseHandler {
    protected async validation(ctx: Context): Promise<boolean> {
        const isVideoMention = !!ctx.message?.video && !!ctx.message?.caption?.includes("@") // Simplified mention check
        this.logger.debug(`VideoCategorizer validation: ${isVideoMention ? "passed" : "failed"}`,)
        return isVideoMention
    }

    protected async handle(ctx: Context): Promise<void> {
        const fileName = ctx.message!.video!.file_name
        if (!fileName) {
            this.logger.warn({ messageId: ctx.message!.message_id }, "Video has no filename.")
            return
        }

        const fileNameWithoutExt = path.parse(fileName).name
        const captionParts = fileNameWithoutExt
            .split("-")
            .map((part) => part.trim())

        if (captionParts.length < 3) {
            this.logger.warn({ fileName }, "Filename does not follow expected format.")
            await ctx.reply(
                "Filename format error. Use: `Course - Lesson - Title.mp4`",
                { reply_to_message_id: ctx.message!.message_id },
            )
            return
        }

        const [courseName, lesson, title] = captionParts
        const courseTag = `#${courseName.replace(/\s+/g, "")}`
        const lessonTag = `#${lesson.replace(/\s+/g, "")}`
        const newCaption = `${title}\n\n${courseTag}\n${lessonTag}`

        try {
            await ctx.editMessageCaption({ caption: newCaption })
            this.logger.info("Successfully categorized video from filename.")
        } catch (error) {
            this.logger.error({ error }, "Failed to edit message caption.")
            await ctx.reply("Error editing caption. Check permissions.", {
                reply_to_message_id: ctx.message!.message_id,
            })
        }
    }
}