import { inngest } from "@/lib/inngest/client";
import { PERSONALIZED_WELCOME_EMAIL_PROMPT } from "./prompts";
import { sendWelcomeEmail } from "../nodemailer";

export const sendSignUpEmail = inngest.createFunction(
    { 
        id: 'sign-up-email',
        triggers: [{ event: 'app/user.created' }],
    },
    async ({ event, step }) => {
        const userProfile = `
            - Country: ${event.data.country}
            - Investment goals: ${event.data.investmentGoals}
            - Risk tolerance: ${event.data.riskTolerance}
            - Preferred industry: ${event.data.preferredIndustry}
        `

        const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace(`{{userProfile}}`, userProfile)

        let introText = 'Thanks for joining VectorAlpha. You now have the tools to track markets and make smarter moves'

        try {
            const response = await step.ai.infer('generate-welcome-intro', {
                model: step.ai.models.gemini({ model: 'gemini-3.8-flash' }), 
                body: {
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                { text: prompt }
                            ]
                        }
                    ]
                }
            })

            const part = response?.candidates?.[0]?.content?.parts?.[0];
            if (part && 'text' in part && typeof part.text === 'string' && part.text.trim()) {
                introText = part.text;
            }
        } catch (e) {
            console.error('Failed to generate AI welcome intro, falling back to default:', e);
        }

        await step.run('send-welcome-email', async () => {
            const { data: { email, name } } = event
            return await sendWelcomeEmail({
                email, name, intro: introText
            })
        })

        return {
            success: true,
            message: 'Welcome email sent successfully'
        }
    }
)
