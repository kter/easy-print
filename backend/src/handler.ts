import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { fetchPage, hashUrl, normalizeUrl, FetchError } from './services/fetcher.js';
import { extractContent } from './services/extractor.js';
import { toMarkdown } from './services/markdown.js';
import { extractWithBedrock } from './services/bedrock.js';
import { getFromCache, putToCache, buildArticleTtl } from './services/cache.js';
import type { Article, RenderResponse, OgpMetadata } from './types/article.js';

const ALLOWED_ORIGINS = [
  'https://print.dev.devtools.site',
  'https://print.devtools.site',
  'http://localhost:5173',
  'http://localhost:4173',
];

function corsHeaders(origin: string | undefined): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function response(statusCode: number, body: unknown, origin?: string): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
    body: JSON.stringify(body),
  };
}

async function renderUrl(rawUrl: string): Promise<{ article: Article; cached: boolean }> {
  const urlHash = hashUrl(rawUrl);

  const cached = await getFromCache(urlHash);
  if (cached) {
    return { article: cached, cached: true };
  }

  const html = await fetchPage(rawUrl);

  let extracted = extractContent(html, rawUrl);
  if (!extracted) {
    console.log('Readability extraction failed, falling back to Bedrock');
    extracted = await extractWithBedrock(html, rawUrl);
  }

  const markdown = toMarkdown(extracted.content);
  const now = new Date().toISOString();

  const article: Article = {
    url: rawUrl,
    urlHash,
    title: extracted.title,
    content: extracted.content,
    markdown,
    excerpt: extracted.excerpt,
    image: extracted.image,
    byline: extracted.byline,
    siteName: extracted.siteName,
    createdAt: now,
    ttl: buildArticleTtl(),
  };

  await putToCache(article);
  return { article, cached: false };
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const origin = event.headers?.origin;
  const path = event.rawPath ?? '';
  const method = event.requestContext.http.method;

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  }

  if (path === '/api/render' || path === '/api/ogp') {
    const rawUrl = event.queryStringParameters?.url;
    if (!rawUrl) {
      return response(400, { error: 'Missing required query parameter: url' }, origin);
    }

    let decodedUrl: string;
    try {
      decodedUrl = decodeURIComponent(rawUrl);
      normalizeUrl(decodedUrl);
    } catch {
      return response(400, { error: 'Invalid URL' }, origin);
    }

    try {
      if (path === '/api/ogp') {
        const { article } = await renderUrl(decodedUrl);
        const ogp: OgpMetadata = {
          title: article.title,
          description: article.excerpt,
          image: article.image,
          url: article.url,
        };
        return response(200, ogp, origin);
      }

      const result: RenderResponse = await renderUrl(decodedUrl);
      return response(200, result, origin);
    } catch (err) {
      if (err instanceof FetchError) {
        return response(
          err.statusCode && err.statusCode >= 400 && err.statusCode < 500 ? 400 : 502,
          { error: err.message },
          origin,
        );
      }
      console.error('Unexpected error:', err);
      return response(500, { error: 'Internal server error' }, origin);
    }
  }

  return response(404, { error: 'Not found' }, origin);
};
