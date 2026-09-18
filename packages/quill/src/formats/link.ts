import Inline from '../blots/inline.js';
import { escapeText } from '../blots/text.js';
import { convertHTML } from '../core/editor.js';

class Link extends Inline {
  static blotName = 'link';
  static tagName = 'A';
  static SANITIZED_URL = 'about:blank';
  static PROTOCOL_WHITELIST = ['http', 'https', 'mailto', 'tel', 'sms'];

  static create(value: string) {
    const node = super.create(value) as HTMLElement;
    node.setAttribute('href', this.sanitize(value));
    node.setAttribute('rel', 'noopener noreferrer');
    node.setAttribute('target', '_blank');
    return node;
  }

  static formats(domNode: HTMLElement) {
    return domNode.getAttribute('href');
  }

  static sanitize(url: string) {
    return sanitize(url, this.PROTOCOL_WHITELIST) ? url : this.SANITIZED_URL;
  }

  format(name: string, value: unknown) {
    if (name !== this.statics.blotName || !value) {
      super.format(name, value);
    } else {
      // @ts-expect-error
      this.domNode.setAttribute('href', this.constructor.sanitize(value));
    }
  }

  html(index: number, length: number) {
    const href = Link.sanitize(this.domNode.getAttribute('href') || '');
    const rel = this.domNode.getAttribute('rel');
    const target = this.domNode.getAttribute('target');
    const attrs = [`href="${escapeText(href)}"`];
    if (rel) {
      attrs.push(`rel="${escapeText(rel)}"`);
    }
    if (target) {
      attrs.push(`target="${escapeText(target)}"`);
    }
    const parts: string[] = [];
    this.children.forEachAt(index, length, (child, offset, childLength) => {
      parts.push(convertHTML(child, offset, childLength));
    });
    return `<a ${attrs.join(' ')}>${parts.join('')}</a>`;
  }
}

function sanitize(url: string, protocols: string[]) {
  const anchor = document.createElement('a');
  anchor.href = url;
  const protocol = anchor.href.slice(0, anchor.href.indexOf(':'));
  return protocols.indexOf(protocol) > -1;
}

export { Link as default, sanitize };
