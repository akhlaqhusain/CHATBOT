import React from 'react';
import { IoCopyOutline } from 'react-icons/io5';
import { PiDiamondsFourFill } from 'react-icons/pi';

const GeminiAvatar = () => (
  <div className="msg-avatar bot-avatar">
    <PiDiamondsFourFill size={14} style={{ color: '#7c5cfc' }} />
  </div>
);

function Message({ sender, text, isStreaming }) {
  const isUser = sender === 'User';

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  // Simple text renderer: converts **bold** and `code` inline
  const renderText = (raw) => {
    const lines = raw.split('\n');
    return lines.map((line, li) => {
      // Bold + code inline parse
      const parts = [];
      let remaining = line;
      let key = 0;
      const pattern = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
      let lastIndex = 0;
      let match;
      while ((match = pattern.exec(remaining)) !== null) {
        if (match.index > lastIndex) parts.push(<span key={key++}>{remaining.slice(lastIndex, match.index)}</span>);
        if (match[2]) parts.push(<strong key={key++}>{match[2]}</strong>);
        else if (match[3]) parts.push(<code key={key++} className="inline-code">{match[3]}</code>);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < remaining.length) parts.push(<span key={key++}>{remaining.slice(lastIndex)}</span>);

      return (
        <React.Fragment key={li}>
          {li > 0 && <br />}
          {parts}
        </React.Fragment>
      );
    });
  };

  return (
    <div className={`message-row ${isUser ? 'user-row' : 'bot-row'}`}>
      {!isUser && <GeminiAvatar />}

      <div className={`bubble ${isUser ? 'user-bubble' : 'bot-bubble'}`}>
        {!isUser && (
          <div className="bot-label">Gemini</div>
        )}
        <div className="msg-text">
          {isStreaming && !text ? (
            <span className="typing-dots">
              <span /><span /><span />
            </span>
          ) : renderText(text)}
          {isStreaming && text && <span className="cursor-blink">▋</span>}
        </div>
        {!isUser && !isStreaming && text && (
          <div className="msg-actions">
            <button className="msg-action-btn" onClick={handleCopy} title="Copy">
              <IoCopyOutline size={13} /> Copy
            </button>
          </div>
        )}
      </div>

      <style>{`
        .message-row {
          display: flex;
          gap: 12px;
          padding: 4px 0;
          max-width: 780px;
          width: 100%;
          align-items: flex-start;
        }
        .user-row {
          align-self: flex-end;
          flex-direction: row-reverse;
          margin-left: auto;
        }
        .bot-row {
          align-self: flex-start;
        }

        .msg-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .bot-avatar {
          background: linear-gradient(135deg, rgba(124,92,252,0.2), rgba(192,132,252,0.2));
          border: 1px solid rgba(124,92,252,0.3);
        }

        .bubble {
          padding: 12px 16px;
          border-radius: var(--radius-lg);
          max-width: 90%;
          line-height: 1.65;
          font-size: 14.5px;
        }

        .user-bubble {
          background: var(--user-bubble);
          border: 1px solid var(--user-border);
          color: var(--text-user);
          border-bottom-right-radius: 4px;
        }

        .bot-bubble {
          background: var(--bg-message-bot);
          color: var(--text-primary);
          padding-left: 0;
        }

        .bot-label {
          font-size: 11.5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: var(--accent);
          margin-bottom: 6px;
        }

        .msg-text {
          word-break: break-word;
          white-space: pre-wrap;
        }

        .inline-code {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          padding: 1px 5px;
          font-size: 13px;
          font-family: 'Menlo', 'Fira Code', monospace;
          color: #c084fc;
        }

        .msg-actions {
          display: flex;
          gap: 6px;
          margin-top: 10px;
        }
        .msg-action-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-muted);
          font-size: 12px;
          font-family: var(--font);
          padding: 4px 9px;
          cursor: pointer;
          transition: background 0.12s, color 0.12s;
        }
        .msg-action-btn:hover {
          background: rgba(255,255,255,0.1);
          color: var(--text-primary);
        }

        .typing-dots {
          display: inline-flex;
          gap: 4px;
          align-items: center;
          height: 20px;
        }
        .typing-dots span {
          width: 6px;
          height: 6px;
          background: var(--text-muted);
          border-radius: 50%;
          animation: bounce 1.2s infinite ease-in-out;
        }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }

        .cursor-blink {
          display: inline;
          color: var(--accent);
          animation: blink 1s step-end infinite;
          margin-left: 1px;
          font-weight: 300;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default Message;
