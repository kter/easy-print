import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchPage, hashUrl, normalizeUrl, FetchError } from '../../src/services/fetcher.js';

describe('normalizeUrl', () => {
  it('strips trailing slash', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
  });

  it('sorts query params', () => {
    const a = normalizeUrl('https://example.com?b=2&a=1');
    const b = normalizeUrl('https://example.com?a=1&b=2');
    expect(a).toBe(b);
  });

  it('lowercases hostname', () => {
    expect(normalizeUrl('https://EXAMPLE.COM/path')).toContain('example.com');
  });

  it('throws on invalid URL', () => {
    expect(() => normalizeUrl('not-a-url')).toThrow(FetchError);
  });

  it('throws on non-http protocol', () => {
    expect(() => normalizeUrl('ftp://example.com')).toThrow(FetchError);
  });
});

describe('hashUrl', () => {
  it('returns consistent hash for same URL', () => {
    expect(hashUrl('https://example.com')).toBe(hashUrl('https://example.com'));
  });

  it('returns different hash for different URLs', () => {
    expect(hashUrl('https://example.com')).not.toBe(hashUrl('https://example.org'));
  });
});

describe('fetchPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws FetchError for private IP', async () => {
    await expect(fetchPage('http://192.168.1.1/')).rejects.toThrow(FetchError);
  });

  it('throws FetchError for localhost', async () => {
    await expect(fetchPage('http://localhost/')).rejects.toThrow(FetchError);
  });

  it('throws FetchError for 127.0.0.1', async () => {
    await expect(fetchPage('http://127.0.0.1/')).rejects.toThrow(FetchError);
  });

  it('returns HTML on success', async () => {
    const mockHtml = '<html><body>Hello</body></html>';
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
              return { done: false, value: new TextEncoder().encode(mockHtml) };
            },
            cancel: vi.fn(),
          };
        },
      },
    };
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as unknown as Response);

    const result = await fetchPage('https://example.com');
    expect(result).toBe(mockHtml);
  });

  it('throws FetchError on HTTP error', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: { get: () => 'text/html' },
    };
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as unknown as Response);

    await expect(fetchPage('https://example.com')).rejects.toThrow(FetchError);
  });

  it('throws FetchError for non-HTML content type', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
    };
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as unknown as Response);

    await expect(fetchPage('https://example.com')).rejects.toThrow(FetchError);
  });
});
