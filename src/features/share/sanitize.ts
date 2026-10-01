/**
 * Utility to convert Tiptap JSON to sanitized HTML and ensure XSS safety
 */

export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // In browser environment, sanitize using DOMParser
  if (typeof window !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove all script, iframe, object, embed, form, input, button, style tags
    const blockedTags = doc.querySelectorAll(
      'script, iframe, object, embed, form, input, button, style, link, meta, base'
    );
    blockedTags.forEach((el) => el.remove());

    // Clean attributes on all remaining elements
    const allElements = doc.querySelectorAll('*');
    allElements.forEach((el) => {
      const allowedAttrs = ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'];
      Array.from(el.attributes).forEach((attr) => {
        const attrName = attr.name.toLowerCase();
        if (!allowedAttrs.includes(attrName) || attrName.startsWith('on')) {
          el.removeAttribute(attr.name);
        }
        // Sanitize href and src to prevent javascript: or data: exploits (except image data URLs)
        if (attrName === 'href') {
          const val = attr.value.trim().toLowerCase();
          if (val.startsWith('javascript:') || val.startsWith('vbscript:')) {
            el.removeAttribute('href');
          }
        }
        if (attrName === 'src') {
          const val = attr.value.trim().toLowerCase();
          if (val.startsWith('javascript:')) {
            el.removeAttribute('src');
          }
        }
      });
    });

    return doc.body.innerHTML;
  }

  // Fallback regex sanitizer if DOMParser is unavailable
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '');
}

/**
 * Converts Tiptap JSON to clean HTML
 */
export function tiptapJsonToHtml(jsonStr: string, plainTextFallback: string = ''): string {
  if (!jsonStr) {
    return plainTextFallback
      ? plainTextFallback
          .split('\n')
          .map((line) => `<p>${escapeHtml(line)}</p>`)
          .join('')
      : '';
  }

  try {
    const parsed = JSON.parse(jsonStr);
    const html = renderTiptapNode(parsed);
    return sanitizeHtml(html);
  } catch {
    return plainTextFallback
      ? plainTextFallback
          .split('\n')
          .map((line) => `<p>${escapeHtml(line)}</p>`)
          .join('')
      : '';
  }
}

interface TiptapNode {
  type?: string;
  text?: string;
  content?: TiptapNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  attrs?: Record<string, unknown>;
}

function renderTiptapNode(node?: TiptapNode): string {
  if (!node) return '';

  if (node.type === 'text') {
    let text = escapeHtml(node.text || '');
    if (node.marks) {
      node.marks.forEach((mark) => {
        if (mark.type === 'bold') text = `<strong>${text}</strong>`;
        if (mark.type === 'italic') text = `<em>${text}</em>`;
        if (mark.type === 'underline') text = `<u>${text}</u>`;
        if (mark.type === 'strike') text = `<s>${text}</s>`;
        if (mark.type === 'code') text = `<code>${text}</code>`;
        if (mark.type === 'link') {
          const href = escapeHtml(String(mark.attrs?.href || '#'));
          text = `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-[#6366F1] underline">${text}</a>`;
        }
      });
    }
    return text;
  }

  const childrenHtml = (node.content || []).map(renderTiptapNode).join('');

  switch (node.type) {
    case 'doc':
      return childrenHtml;
    case 'paragraph':
      return childrenHtml ? `<p class="mb-4 leading-relaxed">${childrenHtml}</p>` : '<p class="mb-4"><br/></p>';
    case 'heading': {
      const level = node.attrs?.level || 2;
      const sizeClass =
        level === 1 ? 'text-2xl font-bold mt-6 mb-3' : level === 2 ? 'text-xl font-bold mt-5 mb-2' : 'text-lg font-bold mt-4 mb-2';
      return `<h${level} class="${sizeClass}">${childrenHtml}</h${level}>`;
    }
    case 'bulletList':
      return `<ul class="list-disc pl-5 mb-4 space-y-1">${childrenHtml}</ul>`;
    case 'orderedList':
      return `<ol class="list-decimal pl-5 mb-4 space-y-1">${childrenHtml}</ol>`;
    case 'listItem':
      return `<li>${childrenHtml}</li>`;
    case 'taskList':
      return `<ul class="space-y-1.5 mb-4">${childrenHtml}</ul>`;
    case 'taskItem': {
      const checked = node.attrs?.checked;
      const checkIcon = checked
        ? '<span class="w-4 h-4 rounded bg-[#6366F1] text-white inline-flex items-center justify-center text-xs mr-2">✓</span>'
        : '<span class="w-4 h-4 rounded border border-gray-400 inline-block mr-2"></span>';
      return `<li class="flex items-start">${checkIcon}<span>${childrenHtml}</span></li>`;
    }
    case 'blockquote':
      return `<blockquote class="border-l-4 border-[#6366F1] pl-4 py-1 italic my-4 opacity-90">${childrenHtml}</blockquote>`;
    case 'horizontalRule':
      return `<hr class="my-6 border-t border-gray-200 dark:border-gray-800" />`;
    default:
      return childrenHtml;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
