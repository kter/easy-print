import { test, expect } from '@playwright/test';

const APP_URL = 'https://print.dev.devtools.site';
const TARGET_URL = 'https://zenn.dev/nrs/articles/c6842288a526d7';

test('URLを入力して記事を印刷表示できる', async ({ page }) => {
  await page.goto(APP_URL);

  // 入力フォームが表示される
  const input = page.locator('input').first();
  await expect(input).toBeVisible();

  // URLを入力して表示ボタンをクリック
  await input.fill(TARGET_URL);
  await page.getByRole('button').first().click();

  // 「読込中」が消えて記事タイトルが表示されるまで待機（最大60秒 - コールドスタートを考慮）
  await expect(page.locator('body')).not.toContainText('読込中', { timeout: 60000 });
  await expect(page.locator('body')).toContainText('TAKT', { timeout: 5000 });

  const bodyText = await page.locator('body').innerText();
  console.log('Body text (first 200):', bodyText.slice(0, 200));

  // スクリーンショットを保存
  await page.screenshot({ path: 'e2e/screenshot-result.png', fullPage: true });
  console.log('Screenshot saved.');
});
