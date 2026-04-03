import { useState, useCallback } from 'react';
import type { Article, RenderResponse } from '../types/article';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

interface UseRenderUrlResult {
  article: Article | null;
  loading: boolean;
  error: string | null;
  cached: boolean;
  renderUrl: (url: string) => Promise<void>;
  reset: () => void;
}

export function useRenderUrl(): UseRenderUrlResult {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  const renderUrl = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    setArticle(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/render?url=${encodeURIComponent(url)}`, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error ?? `HTTP error: ${response.status}`);
      }

      const data = (await response.json()) as RenderResponse;
      setArticle(data.article);
      setCached(data.cached);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setArticle(null);
    setError(null);
    setCached(false);
  }, []);

  return { article, loading, error, cached, renderUrl, reset };
}
