import React from 'react';

interface TiptapRendererProps {
  bodyJson?: string;
  plainText?: string;
  className?: string;
}

interface InlineNode {
  type: string;
  text?: string;
  marks?: Array<{
    type: string;
    attrs?: Record<string, unknown>;
  }>;
}

interface BlockNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: (BlockNode | InlineNode)[];
  text?: string;
}

interface DocNode {
  type: 'doc';
  content?: BlockNode[];
}

export const TiptapRenderer: React.FC<TiptapRendererProps> = ({
  bodyJson,
  plainText,
  className = '',
}) => {
  let doc: DocNode | null = null;

  if (bodyJson) {
    try {
      const parsed = typeof bodyJson === 'string' ? JSON.parse(bodyJson) : bodyJson;
      if (parsed && parsed.type === 'doc') {
        doc = parsed as DocNode;
      }
    } catch {
      doc = null;
    }
  }

  // Fallback to plain text if JSON not available
  if (!doc || !doc.content || doc.content.length === 0) {
    if (!plainText) return null;
    const paras = plainText.split('\n\n').filter(Boolean);
    return (
      <div className={`space-y-3 selectable-text ${className}`}>
        {paras.map((p, idx) => (
          <p key={idx} className="text-[17px] leading-[26px] text-app-text-primary whitespace-pre-wrap">
            {p}
          </p>
        ))}
      </div>
    );
  }

  const renderInline = (node: InlineNode, key: number | string) => {
    let element: React.ReactNode = node.text || '';

    if (node.marks) {
      node.marks.forEach((mark) => {
        if (mark.type === 'bold') {
          element = <strong key="b">{element}</strong>;
        } else if (mark.type === 'italic') {
          element = <em key="i">{element}</em>;
        } else if (mark.type === 'underline') {
          element = <u key="u">{element}</u>;
        } else if (mark.type === 'strike') {
          element = <s key="s">{element}</s>;
        } else if (mark.type === 'link' && mark.attrs?.href) {
          element = (
            <a
              key="a"
              href={String(mark.attrs.href)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-app-accent underline decoration-app-accent/40 hover:decoration-app-accent"
            >
              {element}
            </a>
          );
        }
      });
    }

    return <React.Fragment key={key}>{element}</React.Fragment>;
  };

  const renderBlock = (node: BlockNode, idx: number): React.ReactNode => {
    const children = node.content
      ? node.content.map((child, cIdx) => {
          if ('text' in child && !('content' in child)) {
            return renderInline(child as InlineNode, cIdx);
          }
          return renderBlock(child as BlockNode, cIdx);
        })
      : null;

    switch (node.type) {
      case 'heading': {
        const level = node.attrs?.level || 1;
        if (level === 1) {
          return (
            <h1 key={idx} className="text-2xl font-bold text-app-text-primary tracking-tight mt-4 mb-2">
              {children}
            </h1>
          );
        }
        if (level === 2) {
          return (
            <h2 key={idx} className="text-xl font-semibold text-app-text-primary tracking-tight mt-3 mb-1.5">
              {children}
            </h2>
          );
        }
        return (
          <h3 key={idx} className="text-lg font-semibold text-app-text-primary tracking-tight mt-2.5 mb-1">
            {children}
          </h3>
        );
      }

      case 'paragraph':
        return (
          <p key={idx} className="text-[17px] leading-[26px] text-app-text-primary mb-3">
            {children || <br />}
          </p>
        );

      case 'blockquote':
        return (
          <blockquote
            key={idx}
            className="border-l-3 border-app-accent pl-4 my-3 text-app-text-secondary italic text-[17px] leading-relaxed"
          >
            {children}
          </blockquote>
        );

      case 'bulletList':
        return (
          <ul key={idx} className="list-disc list-inside space-y-1 my-2 pl-2 text-[17px] text-app-text-primary">
            {children}
          </ul>
        );

      case 'orderedList':
        return (
          <ol key={idx} className="list-decimal list-inside space-y-1 my-2 pl-2 text-[17px] text-app-text-primary">
            {children}
          </ol>
        );

      case 'listItem':
        return <li key={idx}>{children}</li>;

      case 'taskList':
        return (
          <ul key={idx} className="space-y-1.5 my-2 pl-1">
            {children}
          </ul>
        );

      case 'taskItem': {
        const checked = Boolean(node.attrs?.checked);
        return (
          <li key={idx} className="flex items-start gap-2.5 text-[17px] text-app-text-primary">
            <span
              className={`w-5 h-5 rounded-md mt-0.5 flex items-center justify-center shrink-0 border transition-colors ${
                checked
                  ? 'bg-app-accent border-app-accent text-white'
                  : 'border-app-hairline bg-app-card'
              }`}
            >
              {checked && (
                <svg className="w-3.5 h-3.5 stroke-[3] fill-none stroke-current" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <span className={checked ? 'line-through text-app-text-tertiary' : ''}>
              {children}
            </span>
          </li>
        );
      }

      case 'horizontalRule':
        return <hr key={idx} className="border-app-hairline my-4" />;

      default:
        return (
          <div key={idx} className="text-[17px] leading-[26px] text-app-text-primary mb-3">
            {children}
          </div>
        );
    }
  };

  return (
    <div className={`selectable-text ${className}`}>
      {doc.content.map((block, idx) => renderBlock(block, idx))}
    </div>
  );
};
