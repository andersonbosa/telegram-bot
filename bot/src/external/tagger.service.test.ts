import assert from "node:assert"
import { describe, test } from "vitest"
import { TaggerService } from "./tagger.service"

describe("TaggerService", () => {
    test("should generate tags for a file", async () => {
        const taggerService = new TaggerService()
        const output = await taggerService.classify({
            referenceBasePath: "FullCycle",
            filePath: "/Users/anbosa/devspace/__vibe_coding__/telegram_bot/data/FullCycle/001 - curso docker/002 - aula de docker 2/002 - Nome da aula 2.ext"
        })
        assert.deepStrictEqual(output, [
            "#fullcycle",
            "#001_curso_docker_002_aula_de_docker_2"
        ])
    })

    test("should generate tags for all files in demo.txt", async () => {
        const taggerService = new TaggerService()
        const demoFilePaths = [
            "/Users/anbosa/devspace/__vibe_coding__/telegram_bot/data/FullCycle/001 - curso docker/001 - aula de docker/001 - Nome da aula 1.mp4",
            "/Users/anbosa/devspace/__vibe_coding__/telegram_bot/data/FullCycle/001 - curso docker/001 - aula de docker/002 - Nome da aula 2.mp4",
            "/Users/anbosa/devspace/__vibe_coding__/telegram_bot/data/FullCycle/001 - curso docker/002 - aula de docker 2/001 - Nome da aula 1.mp4",
            "/Users/anbosa/devspace/__vibe_coding__/telegram_bot/data/FullCycle/001 - curso docker/002 - aula de docker 2/002 - Nome da aula 2.mp4",
            "/Users/anbosa/devspace/__vibe_coding__/telegram_bot/data/FullCycle/002 - outro curso/001 - aula de outro curso/001 - Nome da aula 1.mp4",
            "/Users/anbosa/devspace/__vibe_coding__/telegram_bot/data/FullCycle/002 - outro curso/001 - aula de outro curso/002 - Nome da aula 2.mp4",
            "/Users/anbosa/devspace/__vibe_coding__/telegram_bot/data/FullCycle/002 - outro curso/002 - aula de outro curso 2/001 - Nome da aula 1.mp4",
            "/Users/anbosa/devspace/__vibe_coding__/telegram_bot/data/FullCycle/002 - outro curso/002 - aula de outro curso 2/002 - Nome da aula 2.mp4"
        ]
        const expectedTags = [
            [
                "#fullcycle",
                "#001_curso_docker_001_aula_de_docker"
            ],
            [
                "#fullcycle",
                "#001_curso_docker_001_aula_de_docker"
            ],
            [
                "#fullcycle",
                "#001_curso_docker_002_aula_de_docker_2"
            ],
            [
                "#fullcycle",
                "#001_curso_docker_002_aula_de_docker_2"
            ],
            [
                "#fullcycle",
                "#002_outro_curso_001_aula_de_outro_curso"
            ],
            [
                "#fullcycle",
                "#002_outro_curso_001_aula_de_outro_curso"
            ],
            [
                "#fullcycle",
                "#002_outro_curso_002_aula_de_outro_curso_2"
            ],
            [
                "#fullcycle",
                "#002_outro_curso_002_aula_de_outro_curso_2"
            ]
        ]
        for (let i = 0; i < demoFilePaths.length; i++) {
            const output = await taggerService.classify({
                referenceBasePath: "FullCycle",
                filePath: demoFilePaths[i]
            })
            assert.deepStrictEqual(output, expectedTags[i], `Failed for file: ${demoFilePaths[i]}`)
        }
    })
})