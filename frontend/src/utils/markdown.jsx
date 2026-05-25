import React from 'react';

/**
 * Parses inline markdown tags such as bold (**text**), italics (*text*), and code (`code`).
 * Returns an array of React elements or plain text.
 */
export const parseInlineMarkdown = (text) => {
  if (!text) return '';
  
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const splits = text.split(regex);
  
  return splits.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="md-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="md-italic">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="md-code">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

/**
 * Formats a block of markdown text, handling paragraphs, headers, and consecutive lists.
 */
export const formatMarkdown = (text) => {
  if (!text) return '';
  
  const lines = text.split('\n');
  const elements = [];
  let currentList = null; // { type: 'ul'|'ol', items: [] }
  let currentListKey = 0;

  const flushList = () => {
    if (currentList) {
      const Tag = currentList.type;
      elements.push(
        <Tag key={`list-${currentListKey}`} className={`markdown-${currentList.type}`}>
          {currentList.items.map((item, itemIdx) => (
            <li key={itemIdx} className="markdown-li">
              {parseInlineMarkdown(item)}
            </li>
          ))}
        </Tag>
      );
      currentList = null;
      currentListKey++;
    }
  };

  lines.forEach((line, idx) => {
    // Check for headers (e.g. ### Header)
    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      flushList();
      const level = headerMatch[1].length;
      const textVal = headerMatch[2];
      const parsedText = parseInlineMarkdown(textVal);
      const Tag = `h${level}`;
      elements.push(<Tag key={`h-${idx}`} className={`markdown-h${level}`}>{parsedText}</Tag>);
      return;
    }
    
    // Check for bullet lists (e.g. * item, - item)
    const bulletMatch = line.match(/^[\*\-\+]\s+(.*)$/);
    if (bulletMatch) {
      if (currentList && currentList.type === 'ul') {
        currentList.items.push(bulletMatch[1]);
      } else {
        flushList();
        currentList = { type: 'ul', items: [bulletMatch[1]] };
      }
      return;
    }

    // Check for ordered lists (e.g. 1. item)
    const numberMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numberMatch) {
      if (currentList && currentList.type === 'ol') {
        currentList.items.push(numberMatch[2]);
      } else {
        flushList();
        currentList = { type: 'ol', items: [numberMatch[2]] };
      }
      return;
    }
    
    // Non-list line: flush active list
    flushList();

    // Empty line (spacer)
    if (!line.trim()) {
      elements.push(<div key={`spacer-${idx}`} className="markdown-spacer" />);
      return;
    }
    
    // Normal paragraph line
    elements.push(
      <p key={`p-${idx}`} className="markdown-p">
        {parseInlineMarkdown(line)}
      </p>
    );
  });

  // Flush remaining list
  flushList();

  return elements;
};
