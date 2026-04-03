import { useRenderUrl } from './hooks/useRenderUrl';
import { UrlInput } from './components/UrlInput';
import { ArticleView } from './components/ArticleView';
import { PrintButton } from './components/PrintButton';
import './styles/global.css';
import './styles/print.css';
import './App.css';

export default function App() {
  const { article, loading, error, cached, renderUrl } = useRenderUrl();

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <h1 className="app-logo">Easy Print</h1>
          <p className="app-tagline">URLを入力して、印刷に適したフォーマットで表示します</p>
        </div>
      </header>

      <main className="app-main">
        <section className="app-input-section">
          <UrlInput onSubmit={renderUrl} loading={loading} />
        </section>

        {loading && (
          <div className="app-loading" role="status" aria-live="polite">
            <div className="app-spinner" />
            <p>ページを読み込んでいます...</p>
          </div>
        )}

        {error && (
          <div className="app-error" role="alert">
            <p>エラーが発生しました: {error}</p>
          </div>
        )}

        {article && !loading && (
          <div className="app-article-wrapper">
            <div className="app-actions">
              <PrintButton />
              {cached && <span className="app-cache-badge">キャッシュ済み</span>}
            </div>
            <ArticleView article={article} />
          </div>
        )}
      </main>
    </div>
  );
}
