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
  ttl: number;
}

export interface ExtractedContent {
  title: string;
  content: string;
  excerpt: string;
  image: string | null;
  byline: string | null;
  siteName: string | null;
}

export interface RenderResponse {
  article: Article;
  cached: boolean;
}

export interface OgpMetadata {
  title: string;
  description: string;
  image: string | null;
  url: string;
}
