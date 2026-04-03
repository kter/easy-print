import { describe, it, expect, vi } from 'vitest';
import { extractWithBedrock } from '../../src/services/bedrock.js';
import type { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

const mockBedrockResponse = {
  title: 'テスト記事',
  content: '<p>記事の本文です。</p>',
  excerpt: '記事の要約です。',
  byline: 'テスト著者',
  siteName: 'テストサイト',
  image: 'https://example.com/image.jpg',
};

describe('extractWithBedrock', () => {
  it('parses Bedrock response into ExtractedContent', async () => {
    const mockSend = vi.fn().mockResolvedValueOnce({
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [
            {
              text: JSON.stringify(mockBedrockResponse),
            },
          ],
        }),
      ),
    });

    const mockClient = { send: mockSend } as unknown as BedrockRuntimeClient;

    const result = await extractWithBedrock(
      '<html><body>test</body></html>',
      'https://example.com',
      {
        client: mockClient,
      },
    );

    expect(result.title).toBe('テスト記事');
    expect(result.content).toBe('<p>記事の本文です。</p>');
    expect(result.excerpt).toBe('記事の要約です。');
    expect(result.byline).toBe('テスト著者');
    expect(result.image).toBe('https://example.com/image.jpg');
  });

  it('handles null fields gracefully', async () => {
    const mockSend = vi.fn().mockResolvedValueOnce({
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [
            {
              text: JSON.stringify({
                title: 'タイトル',
                content: '<p>本文</p>',
                excerpt: '要約',
                byline: null,
                siteName: null,
                image: null,
              }),
            },
          ],
        }),
      ),
    });

    const mockClient = { send: mockSend } as unknown as BedrockRuntimeClient;

    const result = await extractWithBedrock('<html></html>', 'https://example.com', {
      client: mockClient,
    });

    expect(result.byline).toBeNull();
    expect(result.image).toBeNull();
  });

  it('throws if response contains no JSON', async () => {
    const mockSend = vi.fn().mockResolvedValueOnce({
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [{ text: 'no json here' }],
        }),
      ),
    });

    const mockClient = { send: mockSend } as unknown as BedrockRuntimeClient;

    await expect(
      extractWithBedrock('<html></html>', 'https://example.com', { client: mockClient }),
    ).rejects.toThrow();
  });
});
