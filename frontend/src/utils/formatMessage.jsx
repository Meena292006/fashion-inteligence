import React from 'react';

/**
 * Parses AI response text into beautifully formatted React elements.
 * Handles: bullet points (* / - / •), numbered lists, bold (**text**),
 * italic (*text*), headers (#), and paragraph breaks.
 */
export function formatMessage(text) {
  if (!text) return null;

  // Split into lines
  const lines = text.split('\n');
  const elements = [];
  let currentListItems = [];
  let currentListType = null; // 'ul' or 'ol'
  let paragraphBuffer = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      const content = paragraphBuffer.join(' ').trim();
      if (content) {
        elements.push(
          <p key={`p-${key++}`} className="msg-paragraph">
            {formatInlineText(content)}
          </p>
        );
      }
      paragraphBuffer = [];
    }
  };

  const flushList = () => {
    if (currentListItems.length > 0) {
      if (currentListType === 'ol') {
        elements.push(
          <ol key={`ol-${key++}`} className="msg-list msg-ordered-list">
            {currentListItems.map((item, i) => (
              <li key={i} className="msg-list-item">
                <span className="list-item-marker ordered">{i + 1}</span>
                <span className="list-item-content">{formatInlineText(item)}</span>
              </li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${key++}`} className="msg-list msg-unordered-list">
            {currentListItems.map((item, i) => (
              <li key={i} className="msg-list-item">
                <span className="list-item-marker">
                  <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
                    <circle cx="3" cy="3" r="3" />
                  </svg>
                </span>
                <span className="list-item-content">{formatInlineText(item)}</span>
              </li>
            ))}
          </ul>
        );
      }
      currentListItems = [];
      currentListType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines — they separate blocks
    if (!trimmedLine) {
      flushParagraph();
      flushList();
      continue;
    }

    // Check for headers (## Header or ### Header)
    const headerMatch = trimmedLine.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      flushParagraph();
      flushList();
      const level = headerMatch[1].length;
      const headerText = headerMatch[2];
      const HeaderTag = `h${Math.min(level + 1, 6)}`; // shift: # -> h2, ## -> h3
      elements.push(
        <HeaderTag key={`h-${key++}`} className={`msg-heading msg-h${level}`}>
          {formatInlineText(headerText)}
        </HeaderTag>
      );
      continue;
    }

    // Check for unordered list items: *, -, •, →
    const ulMatch = trimmedLine.match(/^[\*\-\•\→]\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      if (currentListType === 'ol') flushList();
      currentListType = 'ul';
      currentListItems.push(ulMatch[1]);
      continue;
    }

    // Check for ordered list items: 1. , 2. , etc.
    const olMatch = trimmedLine.match(/^\d+[\.\)]\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      if (currentListType === 'ul') flushList();
      currentListType = 'ol';
      currentListItems.push(olMatch[1]);
      continue;
    }

    // Otherwise, it's a paragraph line
    flushList();
    paragraphBuffer.push(trimmedLine);
  }

  // Flush remaining content
  flushParagraph();
  flushList();

  return <div className="formatted-message">{elements}</div>;
}

/**
 * Handles inline formatting: **bold**, *italic*, `code`, and plain text.
 */
function formatInlineText(text) {
  if (!text) return text;

  const parts = [];
  // Regex to match **bold**, *italic*, or `code`
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // **bold**
      parts.push(
        <strong key={`b-${match.index}`} className="msg-bold">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // *italic*
      parts.push(
        <em key={`i-${match.index}`} className="msg-italic">
          {match[3]}
        </em>
      );
    } else if (match[4]) {
      // `code`
      parts.push(
        <code key={`c-${match.index}`} className="msg-code">
          {match[4]}
        </code>
      );
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining plain text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : parts;
}

export default formatMessage;
