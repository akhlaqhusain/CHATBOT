import React, { useState, useRef, useEffect } from 'react';
import { IoSendSharp, IoStopCircleOutline } from 'react-icons/io5';
import { PiDiamondsFourFill } from 'react-icons/pi';
import Message from './Message';
import { getMessages, saveMessages } from '../api';  // ✅ axios functions

// Gemini is an external API — we keep native fetch for it (no backend proxy)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SUGGESTIONS = [
  'Explain quantum mechanics simply',
  'Write a C++ STL program for stack',
  'What are the best practices for REST APIs?',
  'Summarize the history of Formula 1',
];

function EmptyState({ onSuggest }) {
  return (
    <div className="empty-state">
      <div className="empty-logo">
        <PiDiamondsFourFill size={36} style={{ color: '#7c5cfc' }} />
      </div>
      <h1 className="empty-title">How can I help you today?</h1>
      <div className="suggestions">
        {SUGGESTIONS.map((s, i) => (
          <button key={i} className="suggestion-chip" onClick={() => onSuggest(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatWindow({ conversationId, onTitleUpdate }) {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState('');
  const abortRef    = useRef(null);
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);

  // ── Load message history whenever active conversation changes ───────────────
  useEffect(() => {
    setMessages([]);
    setInput('');
    setError('');
    if (!conversationId) return;

    const load = async () => {
      try {
        const data = await getMessages(conversationId); // ✅ axios
        setMessages(data.map(m => ({ sender: m.sender, text: m.text })));
      } catch (err) {
        console.error('Failed to load messages:', err.message);
      }
    };
    load();
  }, [conversationId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px';
  };

  const handleSend = async (text = input) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || !conversationId) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setError('');

    const isFirstMessage = messages.length === 0;

    // Optimistically show user message + streaming bot placeholder
    setMessages(prev => [
      ...prev,
      { sender: 'User', text: trimmed },
      { sender: 'Bot', text: '', isStreaming: true },
    ]);
    setIsLoading(true);

    // Build full history for Gemini context
    const history = messages.map(m => ({
      role: m.sender === 'User' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));
    history.push({ role: 'user', parts: [{ text: trimmed }] });

    let botText = '';

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      // ── Call Gemini (external — stays as fetch) ───────────────────────────
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: history,
          generationConfig: { temperature: 0.9, maxOutputTokens: 2048 },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      botText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '(no response)';

      // Simulate character-by-character streaming
      let displayed = '';
      for (let i = 0; i < botText.length; i++) {
        if (controller.signal.aborted) break;
        displayed += botText[i];
        const chunk = displayed;
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { sender: 'Bot', text: chunk, isStreaming: true };
          return copy;
        });
        await new Promise(r => setTimeout(r, 8));
      }

      // Mark streaming done
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { sender: 'Bot', text: botText, isStreaming: false };
        return copy;
      });

      // ── Save message pair to MongoDB via axios ────────────────────────────
      const titleToSave = isFirstMessage
        ? trimmed.slice(0, 50) + (trimmed.length > 50 ? '…' : '')
        : undefined;

      await saveMessages(conversationId, {  // ✅ axios
        userMessage: trimmed,
        botMessage: botText,
        title: titleToSave,
      });

      // Update sidebar title after first message
      if (isFirstMessage && titleToSave) {
        onTitleUpdate?.(conversationId, titleToSave);
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        // Stop was clicked — freeze whatever was streamed
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], isStreaming: false };
          return copy;
        });
      } else {
        setError(err.message || 'Something went wrong. Check your API key.');
        setMessages(prev => prev.slice(0, -2)); // remove optimistic messages
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  // Nothing selected yet
  if (!conversationId) {
    return (
      <div className="chat-window">
        <div className="messages-area">
          <div className="empty-state">
            <div className="empty-logo">
              <PiDiamondsFourFill size={36} style={{ color: '#7c5cfc' }} />
            </div>
            <h1 className="empty-title">Select or start a new chat</h1>
          </div>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Messages */}
      <div className="messages-area">
        {isEmpty ? (
          <EmptyState onSuggest={(s) => { setInput(s); handleSend(s); }} />
        ) : (
          <div className="messages-list">
            {messages.map((msg, i) => (
              <Message key={i} sender={msg.sender} text={msg.text} isStreaming={msg.isStreaming} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="error-bar">
          ⚠ {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Input */}
      <div className="input-wrapper">
        <div className="input-box">
          <textarea
            ref={textareaRef}
            className="chat-input"
            placeholder="Ask ChatBot anything…"
            value={input}
            rows={1}
            onChange={e => { setInput(e.target.value); autoResize(); }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <div className="input-actions">
            {isLoading ? (
              <button className="send-btn stop-btn" onClick={handleStop} title="Stop">
                <IoStopCircleOutline size={17} />
              </button>
            ) : (
              <button
                className="send-btn"
                onClick={() => handleSend()}
                disabled={!input.trim()}
                title="Send (Enter)"
              >
                <IoSendSharp size={15} />
              </button>
            )}
          </div>
        </div>
        <p className="input-hint">Press Enter to send · Shift+Enter for new line</p>
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .chat-window {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background: var(--bg-chat);
  }
  .messages-area {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  .messages-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 32px 24px 20px;
    max-width: 860px;
    width: 100%;
    margin: 0 auto;
  }
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
    gap: 12px;
    text-align: center;
  }
  .empty-logo {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(124,92,252,0.15), rgba(192,132,252,0.15));
    border: 1px solid rgba(124,92,252,0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
  }
  .empty-title {
    font-size: 24px;
    font-weight: 500;
    color: var(--text-primary);
    letter-spacing: -0.4px;
    margin: 0;
  }
  .suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-top: 20px;
    max-width: 560px;
  }
  .suggestion-chip {
    background: var(--bg-input);
    border: 1px solid var(--border-input);
    border-radius: 20px;
    color: var(--text-secondary);
    font-size: 13px;
    font-family: var(--font);
    padding: 8px 16px;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
  }
  .suggestion-chip:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: rgba(124,92,252,0.35);
  }
  .error-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: rgba(239,68,68,0.12);
    border: 1px solid rgba(239,68,68,0.25);
    border-radius: var(--radius-sm);
    color: #f87171;
    font-size: 13.5px;
    margin: 0 24px 8px;
    padding: 10px 14px;
  }
  .error-bar button {
    background: none;
    border: none;
    color: #f87171;
    cursor: pointer;
    font-size: 16px;
  }
  .input-wrapper {
    padding: 12px 24px 16px;
    max-width: 860px;
    width: 100%;
    margin: 0 auto;
  }
  .input-box {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    background: var(--bg-input);
    border: 1px solid var(--border-input);
    border-radius: var(--radius-md);
    padding: 10px 10px 10px 16px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .input-box:focus-within {
    border-color: rgba(124,92,252,0.5);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }
  .chat-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    color: var(--text-primary);
    font-size: 14.5px;
    font-family: var(--font);
    line-height: 1.6;
    min-height: 24px;
    max-height: 180px;
    overflow-y: auto;
  }
  .chat-input::placeholder { color: var(--text-muted); }
  .chat-input:disabled { opacity: 0.5; }
  .input-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .send-btn {
    width: 34px;
    height: 34px;
    border-radius: var(--radius-sm);
    border: none;
    background: var(--accent);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s, box-shadow 0.15s, opacity 0.15s;
    flex-shrink: 0;
  }
  .send-btn:hover:not(:disabled) {
    background: var(--accent-hover);
    box-shadow: 0 0 16px var(--accent-glow);
  }
  .send-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .stop-btn {
    background: rgba(239,68,68,0.15);
    color: #f87171;
    border: 1px solid rgba(239,68,68,0.3);
  }
  .stop-btn:hover {
    background: rgba(239,68,68,0.25) !important;
    box-shadow: none !important;
  }
  .input-hint {
    text-align: center;
    font-size: 11.5px;
    color: var(--text-muted);
    margin-top: 8px;
  }
`;

export default ChatWindow;
