import logger from "./logger.service"
import ytdlp from "youtube-dl-exec"

type YoutubeServiceDownloadVideoInput = {
    videoUrl: string
    outputPath: string
}

export class YoutubeService {
    private readonly logger = logger.child({ service: YoutubeService.name })

    constructor() {
    }

    async downloadVideo(input: YoutubeServiceDownloadVideoInput): Promise<any> {
        this.logger.info(`Downloading video ${input.videoUrl}`)

        const output = await ytdlp(input.videoUrl, {
            output: input.outputPath,
        })

        this.logger.info(`Video downloaded to ${output}`)

        return output
    }
}