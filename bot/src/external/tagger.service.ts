import { sep } from "path"
import { logger } from "./logger.service"

interface TaggerServiceInput {
    referenceBasePath: string
    filePath: string
}

export class TaggerService {
    private readonly logger = logger.child({ service: TaggerService.name })

    constructor() {
    }

    private sanitizeTag(tag: string): string {
        return tag
            .toLowerCase()
            // Replace spaces and dashes with underscores
            .replace(/[\s-]+/g, '_')
            // Normalize to NFD form to separate diacritics from letters
            .normalize('NFD')
            // Remove diacritical marks (accents)
            .replace(/[\u0300-\u036f]/g, '')
            // Remove any character that is not a letter, digit, or underscore
            .replace(/[^a-zA-Z0-9_]/g, '')
    }

    private generatePathTag(relativePath: string): string {
        const parts = relativePath.split(sep)
            .slice(0, -1)
            .map(part => this.sanitizeTag(part))
            .filter(Boolean)
        return parts.join('_')
    }

    async classify(input: TaggerServiceInput): Promise<string[]> {
        this.logger.debug({ input }, "Classifying input")

        const tags: string[] = []
        tags.push(`#${this.sanitizeTag(input.referenceBasePath)}`)

        // Encontra o índice do referenceBasePath no caminho completo
        const basePathIndex = input.filePath.indexOf(input.referenceBasePath)
        if (basePathIndex === -1) {
            this.logger.warn("Reference base path not found in file path")
            return tags
        }

        const pathAfterBase = input.filePath.slice(basePathIndex + input.referenceBasePath.length + 1)
        const pathTag = this.generatePathTag(pathAfterBase)
        if (pathTag) {
            tags.push(`#${pathTag}`)
        }

        this.logger.debug({ tags }, "Input classified")
        return tags
    }
}