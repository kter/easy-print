import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Article } from '../types/article.js';

const TABLE_NAME = process.env.CACHE_TABLE_NAME ?? 'easy-print-cache';
const TTL_DAYS = parseInt(process.env.CACHE_TTL_DAYS ?? '30', 10);

let docClient: DynamoDBDocumentClient | null = null;

function getDocClient(): DynamoDBDocumentClient {
  if (!docClient) {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION ?? 'ap-northeast-1',
    });
    docClient = DynamoDBDocumentClient.from(client);
  }
  return docClient;
}

export async function getFromCache(urlHash: string): Promise<Article | null> {
  const client = getDocClient();
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { urlHash },
    }),
  );

  if (!result.Item) return null;

  const now = Math.floor(Date.now() / 1000);
  if (result.Item.ttl && result.Item.ttl < now) {
    return null;
  }

  return result.Item as Article;
}

export async function putToCache(article: Article): Promise<void> {
  const client = getDocClient();
  await client.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: article,
    }),
  );
}

export function buildArticleTtl(): number {
  return Math.floor(Date.now() / 1000) + TTL_DAYS * 24 * 60 * 60;
}
