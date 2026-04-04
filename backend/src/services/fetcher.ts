import { createHash } from 'crypto';

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
  /^localhost$/i,
];

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB
const TLS_ERROR_CODES = new Set([
  'CERT_HAS_EXPIRED',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_GET_ISSUER_CERT',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
]);

export class FetchError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

function getNestedErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const maybeErr = err as { code?: unknown; cause?: unknown };
  if (typeof maybeErr.code === 'string') return maybeErr.code;
  return getNestedErrorCode(maybeErr.cause);
}

function getNestedErrorMessage(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const maybeErr = err as { message?: unknown; cause?: unknown };
  if (typeof maybeErr.message === 'string' && maybeErr.message) return maybeErr.message;
  return getNestedErrorMessage(maybeErr.cause);
}

function validateUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new FetchError(`Invalid URL: ${rawUrl}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new FetchError(`Unsupported protocol: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.toLowerCase();
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new FetchError(`Access to private/internal addresses is not allowed: ${hostname}`);
    }
  }

  return parsed;
}

export function normalizeUrl(rawUrl: string): string {
  const parsed = validateUrl(rawUrl);
  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.replace(/\/$/, '') || '';
  const searchParams = new URLSearchParams(parsed.search);
  searchParams.sort();
  const sortedSearch = searchParams.toString();
  const base = `${parsed.protocol}//${hostname}${pathname}`;
  return sortedSearch ? `${base}?${sortedSearch}` : base;
}

export function hashUrl(url: string): string {
  return createHash('sha256').update(normalizeUrl(url)).digest('hex');
}

export async function fetchPage(rawUrl: string): Promise<string> {
  const parsed = validateUrl(rawUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new FetchError(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    const errorCode = getNestedErrorCode(err);
    if (errorCode && TLS_ERROR_CODES.has(errorCode)) {
      const detail = getNestedErrorMessage((err as { cause?: unknown }).cause) ?? errorCode;
      throw new FetchError(`TLS certificate validation failed: ${detail}`, 400);
    }
    throw new FetchError(`Failed to fetch URL: ${getNestedErrorMessage(err) ?? 'Unknown error'}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new FetchError(`HTTP error: ${response.status} ${response.statusText}`, response.status);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    throw new FetchError(`Unsupported content type: ${contentType}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return response.text();
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_RESPONSE_SIZE) {
      reader.cancel();
      throw new FetchError(`Response too large (max ${MAX_RESPONSE_SIZE} bytes)`);
    }
    chunks.push(value);
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder('utf-8').decode(combined);
}
