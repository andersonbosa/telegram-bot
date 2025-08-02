import { configDotenv } from "dotenv"

configDotenv()

export const config = {
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
    },
}