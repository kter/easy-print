import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import type { ExtractedContent } from '../types/article.js';

const MIN_CONTENT_LENGTH = 200;

export function extractContent(html: string, url: string): ExtractedContent | null {
  let dom: JSDOM;
  try {
    dom = new JSDOM(html, { url });
  } catch (err) {
    console.error('JSDOM parse error:', err);
    return null;
  }

  const reader = new Readability(dom.window.document, {
    charThreshold: MIN_CONTENT_LENGTH,
  });

  let article: ReturnType<Readability['parse']>;
  try {
    article = reader.parse();
  } catch (err) {
    console.error('Readability parse error:', err);
    return null;
  }

  if (!article || !article.content || article.content.length < MIN_CONTENT_LENGTH) {
    return null;
  }

  const image = extractOpenGraphImage(html) ?? extractFirstImage(article.content);

  return {
    title: article.title ?? '',
    content: article.content,
    excerpt: article.excerpt ?? '',
    image,
    byline: article.byline ?? null,
    siteName: article.siteName ?? null,
  };
}

function extractOpenGraphImage(html: string): string | null {
  const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (match) return match[1];
  const match2 = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return match2 ? match2[1] : null;
}

function extractFirstImage(content: string): string | null {
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}
