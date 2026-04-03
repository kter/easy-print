import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  type BedrockRuntimeClientConfig,
} from '@aws-sdk/client-bedrock-runtime';
import type { ExtractedContent } from '../types/article.js';

const DEFAULT_MODEL_ID = process.env.BEDROCK_MODEL_ID ?? 'anthropic.claude-3-haiku-20240307-v1:0';
const MAX_HTML_LENGTH = 50_000;

export interface BedrockClientProvider {
  client: BedrockRuntimeClient;
}

function createDefaultClient(): BedrockRuntimeClient {
  const config: BedrockRuntimeClientConfig = {
    region: process.env.AWS_REGION ?? 'ap-northeast-1',
  };
  return new BedrockRuntimeClient(config);
}

export async function extractWithBedrock(
  html: string,
  url: string,
  provider?: BedrockClientProvider,
): Promise<ExtractedContent> {
  const client = provider?.client ?? createDefaultClient();

  const truncatedHtml = html.length > MAX_HTML_LENGTH ? html.slice(0, MAX_HTML_LENGTH) : html;

  const prompt = `Extract the main article content from the following HTML page (URL: ${url}).
Return a JSON object with exactly these fields:
- title: The article title (string)
- content: The main article content as clean HTML, removing navigation, sidebars, ads, and other non-article elements (string)
- excerpt: A brief 1-2 sentence summary of the article (string)
- byline: The author name if available, or null (string | null)
- siteName: The website/publication name if available, or null (string | null)
- image: The main article image URL if available, or null (string | null)

HTML:
${truncatedHtml}

Respond with only the JSON object, no additional text.`;

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const command = new InvokeModelCommand({
    modelId: DEFAULT_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body,
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const text: string = responseBody.content[0].text;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Bedrock response did not contain valid JSON');
  }

  const extracted = JSON.parse(jsonMatch[0]) as ExtractedContent;

  return {
    title: extracted.title ?? '',
    content: extracted.content ?? '',
    excerpt: extracted.excerpt ?? '',
    image: extracted.image ?? null,
    byline: extracted.byline ?? null,
    siteName: extracted.siteName ?? null,
  };
}
