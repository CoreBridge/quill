import '../../../src/quill.js';
import hljs from 'highlight.js';
import { beforeAll, describe, expect, test } from 'vitest';
import Bold from '../../../src/formats/bold.js';
import Quill from '../../../src/core/quill.js';
import Syntax, { CodeBlock, CodeToken } from '../../../src/modules/syntax.js';
import { createRegistry } from '../__helpers__/factory.js';
import { normalizeHTML } from '../__helpers__/utils.js';

const createQuill = (html = '<p><br></p>') => {
  const container = document.createElement('div');
  container.innerHTML = normalizeHTML(html);
  document.body.appendChild(container);
  return new Quill(container);
};

describe('HTML export security (GHSA-v3m3-f69x-jf25)', () => {
  test('escapes formula values in getSemanticHTML', () => {
    // @ts-expect-error test stub
    window.katex = {
      render(value: string, node: Element) {
        node.textContent = value;
      },
    };
    const quill = createQuill();
    quill.insertEmbed(0, 'formula', 'x"><img src=x onerror=alert(1)>');
    const parsed = new DOMParser().parseFromString(
      quill.getSemanticHTML(),
      'text/html',
    );
    expect(parsed.querySelector('img')).toBeNull();
    expect(parsed.querySelector('[onerror]')).toBeNull();
    expect(parsed.querySelector('span')?.textContent).toBe(
      'x"><img src=x onerror=alert(1)>',
    );
  });

  test('sanitizes and escapes video URLs in getSemanticHTML', () => {
    const quill = createQuill();
    quill.insertEmbed(0, 'video', 'https://example.com/v');
    const iframe = quill.root.querySelector('iframe');
    expect(iframe).not.toBeNull();
    iframe!.setAttribute('src', 'javascript:alert(1)');
    const html = quill.getSemanticHTML();
    expect(html).not.toMatch(/javascript:/i);
    expect(html).toContain('about:blank');
  });

  test('escapes image width/height attributes instead of interpolating properties', () => {
    const quill = createQuill();
    quill.insertEmbed(0, 'image', 'https://example.com/a.png');
    const img = quill.root.querySelector('img');
    expect(img).not.toBeNull();
    img!.setAttribute('width', '100" onerror="alert(1)');
    img!.setAttribute('height', '50" onload="alert(1)');
    const parsed = new DOMParser().parseFromString(
      quill.getSemanticHTML(),
      'text/html',
    );
    const exported = parsed.querySelector('img');
    expect(exported).not.toBeNull();
    expect(exported!.getAttribute('onerror')).toBeNull();
    expect(exported!.getAttribute('onload')).toBeNull();
    expect(exported!.getAttribute('width')).toBe('100" onerror="alert(1)');
    expect(exported!.getAttribute('height')).toBe('50" onload="alert(1)');
  });

  test('preserves partial link ranges and sanitizes href', () => {
    const quill = createQuill(
      '<p>0<a href="https://quilljs.com" rel="noopener noreferrer" target="_blank">12</a>3</p>',
    );
    expect(quill.getSemanticHTML(1, 1)).toEqual(
      '<a href="https://quilljs.com" rel="noopener noreferrer" target="_blank">1</a>',
    );
    const anchor = quill.root.querySelector('a')!;
    anchor.setAttribute('href', 'javascript:alert(1)');
    expect(quill.getSemanticHTML(1, 2)).not.toMatch(/javascript:/i);
    expect(quill.getSemanticHTML(1, 2)).toContain('href="about:blank"');
  });

  test('drops event handlers when reconstructing parent markup', () => {
    const quill = createQuill('<p><strong>Test</strong></p>');
    quill.root.querySelector('strong')!.setAttribute('onclick', 'alert(1)');
    const html = quill.getSemanticHTML();
    expect(html).not.toMatch(/onclick/i);
    expect(html).toContain('<strong>Test</strong>');
  });

  test('does not emit outerHTML of unknown leaf embeds with handlers', () => {
    const quill = createQuill();
    quill.insertEmbed(0, 'image', 'https://example.com/a.png');
    const img = quill.root.querySelector('img')!;
    img.setAttribute('onclick', 'alert(1)');
    img.setAttribute('onerror', 'alert(1)');
    const html = quill.getSemanticHTML();
    expect(html).not.toMatch(/onclick/i);
    expect(html).not.toMatch(/onerror/i);
  });
});

describe('syntax HTML export security', () => {
  beforeAll(() => {
    Quill.register({ 'modules/syntax': Syntax }, true);
    Syntax.register();
    Syntax.DEFAULTS.languages = [
      { key: 'javascript', label: 'JavaScript' },
      { key: 'ruby', label: 'Ruby' },
    ];
  });

  test('escapes data-language in getSemanticHTML', () => {
    const container = document.body.appendChild(document.createElement('div'));
    container.innerHTML = normalizeHTML(
      '<pre data-language="javascript">var test = 1;</pre>',
    );
    const quill = new Quill(container, {
      modules: { syntax: { hljs, interval: 10 } },
      registry: createRegistry([
        Bold,
        CodeToken,
        CodeBlock,
        Quill.import('formats/code-block-container'),
      ]),
    });
    const block = quill.root.querySelector('.ql-code-block');
    expect(block).not.toBeNull();
    block!.setAttribute('data-language', 'js"><img src=x onerror=alert(1)>');
    const parsed = new DOMParser().parseFromString(
      quill.getSemanticHTML(),
      'text/html',
    );
    const pre = parsed.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre!.querySelector('img')).toBeNull();
    expect(pre!.getAttribute('onerror')).toBeNull();
    expect(pre!.getAttribute('data-language')).toBe(
      'js"><img src=x onerror=alert(1)>',
    );
  });
});
