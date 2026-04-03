import { describe, it, expect } from 'vitest';
import { extractContent } from '../../src/services/extractor.js';

const SAMPLE_ARTICLE_HTML = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <title>テスト記事タイトル</title>
  <meta property="og:image" content="https://example.com/og-image.jpg" />
</head>
<body>
  <header>
    <nav><a href="/">Home</a><a href="/articles">Articles</a></nav>
  </header>
  <aside class="sidebar">
    <h3>関連記事</h3>
    <ul><li><a href="/other">他の記事</a></li></ul>
  </aside>
  <main>
    <article>
      <h1>テスト記事タイトル</h1>
      <p class="byline">著者: テスト太郎</p>
      <p>これはテスト用の記事です。印刷に適したフォーマットで表示するためのサービスをテストしています。</p>
      <p>Readability.jsを使用することで、サイドバーやナビゲーションを除去し、記事本文だけを抽出できます。</p>
      <p>このサービスはZenn.devなどのWebサイトを印刷しやすくするために作られました。
         記事のコンテンツを用紙全幅で印刷できるよう整形します。</p>
      <p>さらに詳しい説明をここに書きます。印刷プレビューでサイドバーが消え、
         文章が用紙全体に広がることを確認できます。</p>
    </article>
  </main>
  <footer>フッター情報</footer>
</body>
</html>
`;

describe('extractContent', () => {
  it('extracts article content from HTML', () => {
    const result = extractContent(SAMPLE_ARTICLE_HTML, 'https://example.com/article');
    expect(result).not.toBeNull();
    expect(result!.title).toContain('テスト記事タイトル');
    expect(result!.content).toBeTruthy();
    expect(result!.content.length).toBeGreaterThan(100);
  });

  it('extracts OG image', () => {
    const result = extractContent(SAMPLE_ARTICLE_HTML, 'https://example.com/article');
    expect(result?.image).toBe('https://example.com/og-image.jpg');
  });

  it('returns null for empty HTML', () => {
    const result = extractContent('<html><body></body></html>', 'https://example.com');
    expect(result).toBeNull();
  });

  it('returns null for very short content', () => {
    const result = extractContent('<html><body><p>短い</p></body></html>', 'https://example.com');
    expect(result).toBeNull();
  });

  it('handles malformed HTML gracefully', () => {
    const result = extractContent('<html><body><p>unclosed tag<div>content', 'https://example.com');
    // Should not throw, may return null or partial result
    expect(() => result).not.toThrow();
  });
});
