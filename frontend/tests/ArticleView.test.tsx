import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArticleView } from '../src/components/ArticleView';
import type { Article } from '../src/types/article';

const mockArticle: Article = {
  url: 'https://example.com/article',
  urlHash: 'abc123',
  title: 'テスト記事タイトル',
  content: '<p>記事本文のテキストです。</p>',
  markdown: '記事本文のテキストです。',
  excerpt: '記事の要約です。',
  image: 'https://example.com/image.jpg',
  byline: '著者名',
  siteName: 'テストサイト',
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('ArticleView', () => {
  it('displays article title', () => {
    render(<ArticleView article={mockArticle} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('テスト記事タイトル');
  });

  it('displays byline and site name', () => {
    render(<ArticleView article={mockArticle} />);
    expect(screen.getByText('著者名')).toBeInTheDocument();
    expect(screen.getByText('テストサイト')).toBeInTheDocument();
  });

  it('displays article content', () => {
    render(<ArticleView article={mockArticle} />);
    expect(screen.getByText('記事本文のテキストです。')).toBeInTheDocument();
  });

  it('renders source URL link', () => {
    render(<ArticleView article={mockArticle} />);
    const link = screen.getByRole('link', { name: /https:\/\/example\.com\/article/i });
    expect(link).toHaveAttribute('href', 'https://example.com/article');
  });

  it('hides byline section when not provided', () => {
    const articleWithoutByline: Article = { ...mockArticle, byline: null, siteName: null };
    render(<ArticleView article={articleWithoutByline} />);
    expect(screen.queryByText('著者名')).not.toBeInTheDocument();
  });
});
