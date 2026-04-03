import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  hr: '---',
});

// Preserve code blocks
turndown.addRule('fencedCodeBlock', {
  filter: (node) => {
    return (
      node.nodeName === 'PRE' &&
      node.firstChild !== null &&
      (node.firstChild as Element).nodeName === 'CODE'
    );
  },
  replacement: (_content, node) => {
    const code = node.firstChild as Element;
    const language = (code.getAttribute('class') ?? '').replace(/language-/, '');
    return `\n\`\`\`${language}\n${code.textContent ?? ''}\n\`\`\`\n`;
  },
});

export function toMarkdown(html: string): string {
  return turndown.turndown(html);
}
