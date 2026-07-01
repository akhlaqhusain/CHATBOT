import React from 'react';
import { IoCopyOutline, IoDocumentOutline, IoImageOutline, IoCheckmark } from 'react-icons/io5';
import { PiDiamondsFourFill } from 'react-icons/pi';
import { useState } from 'react';

// ── File attachment chip ──────────────────────────────────────────────────────
function FileChip({ file }) {
  const isImage = file.mimeType?.startsWith('image/');
  const sizeKb  = file.sizeBytes ? (file.sizeBytes / 1024).toFixed(0) : null;

  return (
    <div style={fs.chip}>
      <div style={fs.chipIcon}>
        {isImage
          ? <IoImageOutline size={14} color="var(--accent-light)" />
          : <IoDocumentOutline size={14} color="var(--accent-light)" />
        }
      </div>
      <div style={fs.chipInfo}>
        <span style={fs.chipName}>{file.name}</span>
        {sizeKb && <span style={fs.chipSize}>{sizeKb} KB</span>}
      </div>
    </div>
  );
}

const fs = {
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--accent-dim)',
    border: '1px solid var(--accent-glow)',
    borderRadius: 'var(--r-sm)',
    padding: '6px 10px',
    marginBottom: 8,
    maxWidth: 260,
  },
  chipIcon: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
  chipInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    overflow: 'hidden',
  },
  chipName: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chipSize: {
    fontSize: 10.5,
    color: 'var(--text-muted)',
  },
};

// ── Text renderer: **bold**, `code` ──────────────────────────────────────────
function RenderText({ text }) {
  const lines = (text || '').split('\n');
  return lines.map((line, li) => {
    const parts = [];
    const pattern = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
    let lastIndex = 0, key = 0, match;
    while ((match = pattern.exec(line)) !== null) {
      if (match.index > lastIndex)
        parts.push(<span key={key++}>{line.slice(lastIndex, match.index)}</span>);
      if (match[2])
        parts.push(<strong key={key++}>{match[2]}</strong>);
      else if (match[3])
        parts.push(<code key={key++} style={inlineCode}>{match[3]}</code>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length)
      parts.push(<span key={key++}>{line.slice(lastIndex)}</span>);

    return (
      <React.Fragment key={li}>
        {li > 0 && <br />}
        {parts}
      </React.Fragment>
    );
  });
}

const inlineCode = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 4,
  padding: '1px 5px',
  fontSize: 13,
  fontFamily: "'Fira Code', 'Menlo', monospace",
  color: 'var(--accent-light)',
};

// ── Main Message component ────────────────────────────────────────────────────
function Message({ sender, text, file, isStreaming }) {
  const isUser = sender === 'User';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div style={{ ...ms.row, ...(isUser ? ms.userRow : ms.botRow) }}>

      {/* Bot avatar */}
      {!isUser && (
        <div style={ms.avatar}>
          <PiDiamondsFourFill size={13} color="var(--accent)" />
        </div>
      )}

      <div style={{ ...ms.bubble, ...(isUser ? ms.userBubble : ms.botBubble) }}>

        {/* Sender label for bot */}
        {!isUser && (
          <div style={ms.botLabel}>ChatBot</div>
        )}

        {/* File attachment chip */}
        {file && <FileChip file={file} />}

        {/* Message text */}
        <div style={ms.text}>
          {isStreaming && !text ? (
            <span style={ms.dots}>
              <span /><span /><span />
            </span>
          ) : (
            <RenderText text={text} />
          )}
          {isStreaming && text && <span style={ms.cursor}>▋</span>}
        </div>

        {/* Copy button — only on finished bot messages */}
        {!isUser && !isStreaming && text && (
          <button style={ms.copyBtn} onClick={handleCopy}>
            {copied
              ? <><IoCheckmark size={12} /> Copied</>
              : <><IoCopyOutline size={12} /> Copy</>
            }
          </button>
        )}
      </div>
    </div>
  );
}

const ms = {
  row: {
    display: 'flex',
    gap: 10,
    width: '100%',
    alignItems: 'flex-start',
  },
  userRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  botRow: {},
  avatar: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: 'var(--accent-dim)',
    border: '1px solid var(--accent-glow)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  bubble: {
    maxWidth: '82%',
    lineHeight: 1.7,
    fontSize: 14,
  },
  userBubble: {
    background: 'var(--bg-user-msg)',
    border: '1px solid var(--user-border)',
    borderRadius: 'var(--r-lg)',
    borderBottomRightRadius: 4,
    padding: '10px 15px',
    color: 'var(--text-primary)',
  },
  botBubble: {
    padding: '2px 0',
    color: 'var(--text-primary)',
  },
  botLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.9px',
    color: 'var(--accent)',
    marginBottom: 6,
  },
  text: {
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  },
  copyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-muted)',
    fontSize: 11.5,
    fontFamily: 'var(--font)',
    padding: '4px 9px',
    cursor: 'pointer',
    transition: 'color 0.12s, border-color 0.12s',
  },
  dots: {
    display: 'inline-flex',
    gap: 4,
    alignItems: 'center',
    height: 20,
  },
  cursor: {
    display: 'inline',
    color: 'var(--accent)',
    marginLeft: 1,
    fontWeight: 300,
    animation: 'blink 1s step-end infinite',
  },
};

export default Message;
