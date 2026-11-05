'use server';

import { formatArticle, getDateRange, validateArticle } from '@/lib/utils';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const NEXT_PUBLIC_FINNHUB_API_KEY =
  process.env.NEXT_PUBLIC_FINNHUB_API_KEY || process.env.FINNHUB_API_KEY || '';

export async function fetchJSON<T = unknown>(
  url: string,
  revalidateSeconds?: number
): Promise<T> {
  const options: RequestInit =
    typeof revalidateSeconds === 'number'
      ? {
          cache: 'force-cache',
          next: { revalidate: revalidateSeconds },
        }
      : {
          cache: 'no-store',
        };

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Finnhub request failed with status ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function getNews(symbols?: string[]): Promise<MarketNewsArticle[]> {
  try {
    const cleanSymbols = (symbols || [])
      .map((sym) => sym.trim().toUpperCase())
      .filter((sym) => sym.length > 0);

    // If symbols exist:
    if (cleanSymbols.length > 0) {
      const { from, to } = getDateRange(5);
      const collectedArticles: MarketNewsArticle[] = [];
      const seenUrls = new Set<string>();
      const seenHeadlines = new Set<string>();
      const symbolNewsCache = new Map<string, RawNewsArticle[]>();
      const symbolTracker = new Map<string, number>();

      // Loop max 6 times, round-robin through symbols
      for (let i = 0; i < 6; i++) {
        const symbol = cleanSymbols[i % cleanSymbols.length];

        if (!symbolNewsCache.has(symbol)) {
          try {
            const url = `${FINNHUB_BASE_URL}/company-news?symbol=${encodeURIComponent(
              symbol
            )}&from=${from}&to=${to}&token=${NEXT_PUBLIC_FINNHUB_API_KEY}`;
            const news = await fetchJSON<RawNewsArticle[]>(url);
            symbolNewsCache.set(symbol, Array.isArray(news) ? news : []);
            symbolTracker.set(symbol, 0);
          } catch (fetchError) {
            console.error(`Failed to fetch company news for ${symbol}:`, fetchError);
            symbolNewsCache.set(symbol, []);
            symbolTracker.set(symbol, 0);
          }
        }

        const articles = symbolNewsCache.get(symbol) || [];
        let index = symbolTracker.get(symbol) || 0;

        while (index < articles.length) {
          const rawArticle = articles[index++];
          symbolTracker.set(symbol, index);

          if (
            validateArticle(rawArticle) &&
            rawArticle.url &&
            !seenUrls.has(rawArticle.url) &&
            rawArticle.headline &&
            !seenHeadlines.has(rawArticle.headline)
          ) {
            seenUrls.add(rawArticle.url);
            seenHeadlines.add(rawArticle.headline);
            collectedArticles.push(
              formatArticle(rawArticle, true, symbol, collectedArticles.length)
            );
            break; // Take one valid article per round
          }
        }
      }

      if (collectedArticles.length > 0) {
        collectedArticles.sort((a, b) => b.datetime - a.datetime);
        return collectedArticles.slice(0, 6);
      }
    }

    // If no symbols (or fallback if symbol news was empty):
    const generalNewsUrl = `${FINNHUB_BASE_URL}/news?category=general&token=${NEXT_PUBLIC_FINNHUB_API_KEY}`;
    const rawGeneralArticles = await fetchJSON<RawNewsArticle[]>(generalNewsUrl);
    const articlesList = Array.isArray(rawGeneralArticles) ? rawGeneralArticles : [];

    const validArticles: MarketNewsArticle[] = [];
    const seenIds = new Set<number>();
    const seenUrls = new Set<string>();
    const seenHeadlines = new Set<string>();

    for (let i = 0; i < articlesList.length; i++) {
      const rawArticle = articlesList[i];

      // Always validate articles before formatting
      if (!validateArticle(rawArticle)) continue;

      const { id, url, headline } = rawArticle;

      // Deduplicate by id/url/headline
      if (
        (id !== undefined && seenIds.has(id)) ||
        (url && seenUrls.has(url)) ||
        (headline && seenHeadlines.has(headline))
      ) {
        continue;
      }

      if (id !== undefined) seenIds.add(id);
      if (url) seenUrls.add(url);
      if (headline) seenHeadlines.add(headline);

      validArticles.push(formatArticle(rawArticle, false, undefined, i));

      // Take top 6
      if (validArticles.length >= 6) {
        break;
      }
    }

    return validArticles;
  } catch (error) {
    console.error('Error fetching news:', error);
    throw new Error('Failed to fetch news');
  }
}

