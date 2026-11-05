import { inngest } from "@/lib/inngest/client";
import { NEWS_SUMMARY_EMAIL_PROMPT, PERSONALIZED_WELCOME_EMAIL_PROMPT } from "./prompts";
import { sendNewsSummaryEmail, sendWelcomeEmail } from "../nodemailer";
import { getAllUsersForNewsEmail } from "../actions/user.actions";
import { getWatchlistSymbolsByEmail } from "../actions/watchlist.actions";
import { getNews } from "../actions/finnhub.actions";
import { formatDateToday, getFormattedTodayDate } from "../utils";

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

export const sendDailyNewsSummary = inngest.createFunction(
    {
        id: 'daily-news-summary',
        triggers: [
            { event: 'app/send.daily.news' },
            { cron: 'TZ=Asia/Kolkata 0 12 * * *' },
        ],
    },
    async ({ step }) => {
        // Step 1: get all users (getAllUsersForNewsEmail)
        const users = await step.run('get-all-users', getAllUsersForNewsEmail);

        if (!users || users.length === 0) {
            return { success: false, message: 'No users found for news email' };
        }

        // Step 2: For each user, get their watchlist symbols -> fetch news (or general if none)
        const userNewsData = await step.run('fetch-user-news', async () => {
            const results: {
                user: { id: string; email: string; name: string };
                symbols: string[];
                news: MarketNewsArticle[];
            }[] = [];

            for (const user of users) {
                try {
                    const symbols = await getWatchlistSymbolsByEmail(user.email);
                    let news: MarketNewsArticle[] = [];

                    try {
                        news = await getNews(symbols);
                    } catch (error) {
                        console.error(`Failed to fetch news for ${user.email}, falling back to general news:`, error);
                        try {
                            news = await getNews();
                        } catch {
                            news = [];
                        }
                    }

                    results.push({
                        user,
                        symbols,
                        news: news.slice(0, 6),
                    });
                } catch (error) {
                    console.error(`Error processing news for user ${user.email}:`, error);
                    results.push({
                        user,
                        symbols: [],
                        news: [],
                    });
                }
            }

            return results;
        });

        // Step 3: (placeholder) Summarize news via AI
        const userNewsSummaries: { user: User; newsContent: string | null}[] = [];

        for(const { user, news } of userNewsData) {
            try{
                const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace('{{newsData}}', JSON.stringify(news, null, 2))

                const response = await step.ai.infer(`summarize-news-${user.email}`, {
                    model: step.ai.models.gemini({ model: 'gemini-2.5-flash-lite-preview-06-17'}),
                    body: {
                        contents: [{ role: 'user', parts: [{ text:prompt }]}]
                    }
                })

                const part = response.candidates?.[0]?.content?.parts?.[0];
                const newsContent = (part && 'text' in part ? part.text : null) || 'No market news.'

                userNewsSummaries.push({ user, newsContent })
            }
            catch {
                console.error('Failed to summarise news for : ', user.email)
                userNewsSummaries.push({ user, newsContent: null });
            }
        }

        // Step 4: (placeholder) Send the emails
        await step.run('send-news-emails', async () => {
            await Promise.all(
                userNewsSummaries.map(async ({ user, newsContent }) => {
                    if(!newsContent) return false

                    return await sendNewsSummaryEmail({ email: user.email, date: getFormattedTodayDate(), newsContent })
                })
            )
        });

        return { success: true, message: 'Daily news summary emails sent successfully' };
    }
);
