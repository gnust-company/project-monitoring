/**
 * Markdown renderer tối giản, an toàn (KHÔNG dùng dangerouslySetInnerHTML) cho
 * body thông báo admin (#27). Hỗ trợ: heading (#..######), danh sách (-, *, 1.),
 * trích dẫn (>), code block (```), và inline: **đậm**, *nghiêng*, `code`, [link](url).
 *
 * Cố ý nhỏ gọn — không cần phụ thuộc thư viện markdown ngoài. Link chỉ nhận
 * http/https/mailto để tránh javascript: scheme.
 */
import { createElement, type ReactNode } from 'react';

const SAFE_LINK = /^(https?:\/\/|mailto:)/i;

// Inline: tách **bold**, *italic*, `code`, [text](href) thành React node an toàn.
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const k = `${keyPrefix}-${i++}`;
    if (m[2] !== undefined) nodes.push(<strong key={k}>{m[2]}</strong>);
    else if (m[4] !== undefined) nodes.push(<em key={k}>{m[4]}</em>);
    else if (m[6] !== undefined) nodes.push(<code key={k} className="px-1 py-0.5 bg-stone-100 rounded text-[0.85em] font-mono">{m[6]}</code>);
    else if (m[8] !== undefined && m[9] !== undefined) {
      const href = m[9].trim();
      nodes.push(SAFE_LINK.test(href)
        ? <a key={k} href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-700">{m[8]}</a>
        : <span key={k}>{m[8]}</span>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ source, className = '' }: { source: string; className?: string }) {
  const lines = (source || '').replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let code: string[] | null = null;
  let key = 0;

  const flushPara = () => {
    if (para.length) {
      blocks.push(<p key={key++} className="leading-relaxed">{renderInline(para.join(' '), `p${key}`)}</p>);
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const items = list.items.map((it, idx) => <li key={idx}>{renderInline(it, `li${key}-${idx}`)}</li>);
      blocks.push(list.ordered
        ? <ol key={key++} className="list-decimal pl-5 space-y-1">{items}</ol>
        : <ul key={key++} className="list-disc pl-5 space-y-1">{items}</ul>);
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw;
    // code fence
    if (/^```/.test(line.trim())) {
      if (code === null) { flushPara(); flushList(); code = []; }
      else {
        blocks.push(<pre key={key++} className="bg-stone-900 text-stone-100 rounded-lg p-3 text-xs font-mono overflow-x-auto"><code>{code.join('\n')}</code></pre>);
        code = null;
      }
      continue;
    }
    if (code !== null) { code.push(line); continue; }

    const trimmed = line.trim();
    if (trimmed === '') { flushPara(); flushList(); continue; }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushPara(); flushList();
      const level = heading[1].length;
      const sizes = ['text-xl font-bold', 'text-lg font-bold', 'text-base font-semibold', 'text-sm font-semibold', 'text-sm font-semibold', 'text-xs font-semibold'];
      blocks.push(createElement(
        `h${Math.min(level, 6)}`,
        { key: key++, className: `${sizes[level - 1]} text-ink mt-1` },
        renderInline(heading[2], `h${key}`),
      ));
      continue;
    }

    if (trimmed.startsWith('>')) {
      flushPara(); flushList();
      blocks.push(<blockquote key={key++} className="border-l-2 border-stone-300 pl-3 text-stone-500 italic">{renderInline(trimmed.replace(/^>\s?/, ''), `q${key}`)}</blockquote>);
      continue;
    }

    const ul = /^[-*]\s+(.*)$/.exec(trimmed);
    const ol = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (ul || ol) {
      flushPara();
      const ordered = !!ol;
      if (!list || list.ordered !== ordered) { flushList(); list = { ordered, items: [] }; }
      list.items.push((ul ? ul[1] : ol![1]));
      continue;
    }

    flushList();
    para.push(trimmed);
  }
  flushPara(); flushList();
  if (code !== null) blocks.push(<pre key={key++} className="bg-stone-900 text-stone-100 rounded-lg p-3 text-xs font-mono overflow-x-auto"><code>{code.join('\n')}</code></pre>);

  return <div className={`space-y-2 text-sm text-stone-700 ${className}`}>{blocks}</div>;
}
