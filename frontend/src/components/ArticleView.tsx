import type { Article } from '../types/article';
import './ArticleView.css';

interface ArticleViewProps {
  article: Article;
}

export function ArticleView({ article }: ArticleViewProps) {
  return (
    <article className="article-view">
      <header className="article-header">
        <h1 className="article-title">{article.title}</h1>
        {(article.byline || article.siteName) && (
          <p className="article-meta">
            {article.byline && <span className="article-byline">{article.byline}</span>}
            {article.byline && article.siteName && <span className="article-meta-sep"> — </span>}
            {article.siteName && <span className="article-sitename">{article.siteName}</span>}
          </p>
        )}
        <p className="article-source-url">
          元記事:{' '}
          <a href={article.url} target="_blank" rel="noopener noreferrer">
            {article.url}
          </a>
        </p>
      </header>
      <div className="article-content" dangerouslySetInnerHTML={{ __html: article.content }} />
    </article>
  );
}
