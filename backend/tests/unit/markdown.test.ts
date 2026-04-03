import { describe, it, expect } from 'vitest';
import { toMarkdown } from '../../src/services/markdown.js';

describe('toMarkdown', () => {
  it('converts headings', () => {
    const result = toMarkdown('<h1>タイトル</h1>');
    expect(result).toContain('# タイトル');
  });

  it('converts paragraphs', () => {
    const result = toMarkdown('<p>段落テキスト</p>');
    expect(result).toContain('段落テキスト');
  });

  it('converts links', () => {
    const result = toMarkdown('<a href="https://example.com">リンク</a>');
    expect(result).toContain('[リンク](https://example.com)');
  });

  it('converts code blocks', () => {
    const result = toMarkdown('<pre><code class="language-typescript">const x = 1;</code></pre>');
    expect(result).toContain('```typescript');
    expect(result).toContain('const x = 1;');
  });

  it('converts unordered lists', () => {
    const result = toMarkdown('<ul><li>item1</li><li>item2</li></ul>');
    expect(result).toMatch(/-\s+item1/);
    expect(result).toMatch(/-\s+item2/);
  });

  it('converts bold text', () => {
    const result = toMarkdown('<strong>太字</strong>');
    expect(result).toContain('**太字**');
  });
});
