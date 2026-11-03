import { Inngest } from 'inngest'

export const inngest = new Inngest({
    id: 'vectoralpha',
    isDev: process.env.NODE_ENV === 'development',
    ai: { gemini: { apiKey: process.env.GEMINI_API_KEY } }
})
