import type { CloudFrontRequestHandler, CloudFrontRequest } from 'aws-lambda';

const CRAWLER_USER_AGENTS = [
  'twitterbot',
  'facebookexternalhit',
  'linkedinbot',
  'slackbot',
  'discordbot',
  'whatsapp',
  'telegrambot',
  'googlebot',
  'bingbot',
  'applebot',
];

const API_BASE_URL = process.env.API_BASE_URL ?? '';

function isCrawler(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return CRAWLER_USER_AGENTS.some((bot) => ua.includes(bot));
}

function buildOgpHtml(meta: {
  title: string;
  description: string;
  image: string | null;
  url: string;
}): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escape(meta.title)}</title>
  <meta property="og:title" content="${escape(meta.title)}" />
  <meta property="og:description" content="${escape(meta.description)}" />
  <meta property="og:url" content="${escape(meta.url)}" />
  <meta property="og:type" content="article" />
  ${meta.image ? `<meta property="og:image" content="${escape(meta.image)}" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escape(meta.title)}" />
  <meta name="twitter:description" content="${escape(meta.description)}" />
  ${meta.image ? `<meta name="twitter:image" content="${escape(meta.image)}" />` : ''}
</head>
<body></body>
</html>`;
}

export const handler: CloudFrontRequestHandler = async (event) => {
  const request: CloudFrontRequest = event.Records[0].cf.request;
  const userAgent = request.headers['user-agent']?.[0]?.value ?? '';

  if (!isCrawler(userAgent)) {
    return request;
  }

  const queryString = request.querystring ?? '';
  const params = new URLSearchParams(queryString);
  const targetUrl = params.get('url');

  if (!targetUrl || !API_BASE_URL) {
    return request;
  }

  try {
    const apiUrl = `${API_BASE_URL}/api/ogp?url=${encodeURIComponent(targetUrl)}`;
    const apiResponse = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });

    if (!apiResponse.ok) {
      return request;
    }

    const meta = (await apiResponse.json()) as {
      title: string;
      description: string;
      image: string | null;
      url: string;
    };

    const html = buildOgpHtml(meta);

    return {
      status: '200',
      statusDescription: 'OK',
      headers: {
        'content-type': [{ key: 'Content-Type', value: 'text/html; charset=utf-8' }],
        'cache-control': [{ key: 'Cache-Control', value: 'max-age=3600' }],
      },
      body: html,
    };
  } catch (err) {
    console.error('OGP edge error:', err);
    return request;
  }
};
