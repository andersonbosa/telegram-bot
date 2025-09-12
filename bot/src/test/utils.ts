import { readFileSync } from "node:fs"
import { resolve } from "node:path"

export class TestUtils {

    static getMockFromJsonFile(fileName: string): any {
        const filePath = resolve(__dirname, `./mocks/${fileName}.json`)
        const fileContent = readFileSync(filePath, 'utf8')
        return JSON.parse(fileContent)
    }
}