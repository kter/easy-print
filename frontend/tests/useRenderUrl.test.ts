import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRenderUrl } from '../src/hooks/useRenderUrl';
import type { RenderResponse } from '../src/types/article';

const mockRenderResponse: RenderResponse = {
  article: {
    url: 'https://example.com/article',
    urlHash: 'abc',
    title: 'Test Article',
    content: '<p>Content</p>',
    markdown: 'Content',
    excerpt: 'Summary',
    image: null,
    byline: null,
    siteName: null,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  cached: false,
};

describe('useRenderUrl', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts with null article and no error', () => {
    const { result } = renderHook(() => useRenderUrl());
    expect(result.current.article).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('sets loading during fetch', async () => {
    let resolvePromise!: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => { resolvePromise = resolve; });

    vi.mocked(fetch).mockReturnValueOnce(pendingPromise as Promise<Response>);

    const { result } = renderHook(() => useRenderUrl());

    act(() => {
      result.current.renderUrl('https://example.com');
    });

    expect(result.current.loading).toBe(true);
    resolvePromise({ ok: false, status: 500, json: async () => ({}) });
  });

  it('sets article on successful fetch', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRenderResponse,
    } as Response);

    const { result } = renderHook(() => useRenderUrl());

    await act(async () => {
      await result.current.renderUrl('https://example.com/article');
    });

    expect(result.current.article).toEqual(mockRenderResponse.article);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error on failed fetch', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid URL' }),
    } as Response);

    const { result } = renderHook(() => useRenderUrl());

    await act(async () => {
      await result.current.renderUrl('https://example.com');
    });

    expect(result.current.error).toBe('Invalid URL');
    expect(result.current.article).toBeNull();
  });

  it('sets error on network failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useRenderUrl());

    await act(async () => {
      await result.current.renderUrl('https://example.com');
    });

    expect(result.current.error).toBe('Network error');
  });

  it('reset clears article and error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRenderResponse,
    } as Response);

    const { result } = renderHook(() => useRenderUrl());

    await act(async () => {
      await result.current.renderUrl('https://example.com/article');
    });

    expect(result.current.article).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.article).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets cached=true when API returns cached=true', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockRenderResponse, cached: true }),
    } as Response);

    const { result } = renderHook(() => useRenderUrl());

    await act(async () => {
      await result.current.renderUrl('https://example.com/article');
    });

    expect(result.current.cached).toBe(true);
  });
});
