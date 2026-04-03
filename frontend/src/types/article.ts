export interface Article {
  url: string;
  urlHash: string;
  title: string;
  content: string;
  markdown: string;
  excerpt: string;
  image: string | null;
  byline: string | null;
  siteName: string | null;
  createdAt: string;
}

export interface RenderResponse {
  article: Article;
  cached: boolean;
}
