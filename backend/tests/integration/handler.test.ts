import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

// Mock AWS SDK modules before importing handler
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn().mockReturnValue({
      send: vi.fn(),
    }),
  },
  GetCommand: vi.fn(),
  PutCommand: vi.fn(),
}));

const mockDynamoSend = vi.fn();

vi.mock('../../src/services/cache.js', () => ({
  getFromCache: vi.fn(),
  putToCache: vi.fn(),
  buildArticleTtl: vi.fn().mockReturnValue(9999999999),
}));

import { handler } from '../../src/handler.js';
import * as cache from '../../src/services/cache.js';

const SAMPLE_ARTICLE_HTML = `
<!DOCTYPE html>
<html>
<head><title>Test Article</title><meta property="og:image" content="https://example.com/img.jpg" /></head>
<body>
<main>
<article>
<h1>Test Article Title</h1>
<p>This is a long test article with enough content for Readability to parse successfully.
It needs to have multiple paragraphs with substantial content to pass the minimum length threshold
set in the extractor service. Here is more content to make it long enough for testing purposes.</p>
<p>Second paragraph with more content to ensure proper extraction by the Readability library.
This should be sufficient for the test to pass without needing Bedrock fallback.</p>
</article>
</main>
</body>
</html>
`;

function makeEvent(path: string, params?: Record<string, string>): APIGatewayProxyEventV2 {
  return {
    rawPath: path,
    queryStringParameters: params,
    headers: { origin: 'http://localhost:5173' },
    requestContext: {
      http: { method: 'GET' },
    },
  } as unknown as APIGatewayProxyEventV2;
}

describe('handler', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.mocked(cache.getFromCache).mockResolvedValue(null);
    vi.mocked(cache.putToCache).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('returns 404 for unknown path', async () => {
    const event = makeEvent('/unknown');
    const result = await handler(event);
    expect(result.statusCode).toBe(404);
  });

  it('returns 400 when url parameter is missing', async () => {
    const event = makeEvent('/api/render');
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  it('returns 400 for invalid URL', async () => {
    const event = makeEvent('/api/render', { url: 'not-a-url' });
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  it('returns 204 for OPTIONS preflight', async () => {
    const event = {
      rawPath: '/api/render',
      headers: { origin: 'http://localhost:5173' },
      requestContext: { http: { method: 'OPTIONS' } },
    } as unknown as APIGatewayProxyEventV2;
    const result = await handler(event);
    expect(result.statusCode).toBe(204);
  });

  it('returns cached article with cached=true', async () => {
    const cachedArticle = {
      url: 'https://example.com',
      urlHash: 'abc',
      title: 'Cached Title',
      content: '<p>cached</p>',
      markdown: 'cached',
      excerpt: 'cached excerpt',
      image: null,
      byline: null,
      siteName: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      ttl: 9999999999,
    };
    vi.mocked(cache.getFromCache).mockResolvedValueOnce(cachedArticle);

    const event = makeEvent('/api/render', { url: 'https://example.com' });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.cached).toBe(true);
    expect(body.article.title).toBe('Cached Title');
  });

  it('fetches, extracts and caches article on cache miss', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: { get: () => 'text/html; charset=utf-8' },
      body: {
        getReader: () => {
          let done = false;
          return {
            read: async () => {
              if (done) return { done: true, value: undefined };
              done = true;
              return { done: false, value: new TextEncoder().encode(SAMPLE_ARTICLE_HTML) };
            },
            cancel: vi.fn(),
          };
        },
      },
    };
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as unknown as Response);

    const event = makeEvent('/api/render', { url: 'https://example.com/article' });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.cached).toBe(false);
    expect(body.article.title).toBeTruthy();
    expect(vi.mocked(cache.putToCache)).toHaveBeenCalledOnce();
  });

  it('sets CORS headers', async () => {
    const event = makeEvent('/api/render');
    const result = await handler(event);
    expect(
      (result.headers as Record<string, string>)?.['Access-Control-Allow-Origin'],
    ).toBeTruthy();
  });

  it('/api/ogp returns OGP metadata', async () => {
    const cachedArticle = {
      url: 'https://example.com',
      urlHash: 'abc',
      title: 'OGP Title',
      content: '<p>content</p>',
      markdown: 'content',
      excerpt: 'OGP description',
      image: 'https://example.com/img.jpg',
      byline: null,
      siteName: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      ttl: 9999999999,
    };
    vi.mocked(cache.getFromCache).mockResolvedValueOnce(cachedArticle);

    const event = makeEvent('/api/ogp', { url: 'https://example.com' });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.title).toBe('OGP Title');
    expect(body.description).toBe('OGP description');
    expect(body.image).toBe('https://example.com/img.jpg');
  });

  it('returns 502 when fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    const event = makeEvent('/api/render', { url: 'https://example.com' });
    const result = await handler(event);
    expect(result.statusCode).toBe(502);
  });

  it('returns 400 when upstream TLS certificate validation fails', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(
      Object.assign(new TypeError('fetch failed'), {
        cause: Object.assign(new Error('unable to get local issuer certificate'), {
          code: 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
        }),
      }),
    );

    const event = makeEvent('/api/render', { url: 'https://example.com' });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(result.body).toContain('TLS certificate validation failed');
  });
});

void mockDynamoSend;
