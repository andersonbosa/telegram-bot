import { configDotenv } from "dotenv"

configDotenv()

export const config = {
    env: process.env.NODE_ENV || 'development',
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        rateLimiting: {
            uploadDelayMs: parseInt(process.env.TELEGRAM_UPLOAD_DELAY_MS || '1000'),
            enabled: process.env.TELEGRAM_RATE_LIMITING_ENABLED !== 'false'
        }
    },
}