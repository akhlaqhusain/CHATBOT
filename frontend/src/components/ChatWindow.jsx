import React, { useState, useRef, useEffect } from 'react';
import { IoSendSharp, IoStopCircleOutline, IoAttachOutline, IoCloseOutline,
         IoDocumentOutline, IoImageOutline } from 'react-icons/io5';
import { PiDiamondsFourFill } from 'react-icons/pi';
import Message from './Message';
import { getMessages, saveMessages, saveMessagesWithFile } from '../api';

// Gemini stays as native fetch (external API)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SUPPORTED_GEMINI_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const SUGGESTIONS = [
  'Explain quantum mechanics simply',
  'Write a C++ STL program for stack',
  'Best practices for REST APIs',
  'History of Formula 1 in brief',
];

// ── Convert File to base64 for Gemini inline_data ────────────────────────────
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ── File preview chip in input bar ───────────────────────────────────────────
function AttachedFileChip({ file, onRemove }) {
  const isImage = file.type.startsWith('image/');
  return (
    <div style={cs.attachChip}>
      {isImage
        ? <IoImageOutline size={14} color="var(--accent-light)" />
        : <IoDocumentOutline size={14} color="var(--accent-light)" />
      }
      <span style={cs.attachName}>{file.name}</span>
      <button style={cs.attachRemove} onClick={onRemove} title="Remove file">
        <IoCloseOutline size={14} />
      </button>
    </div>
  );
}

// ── Empty / welcome screen ────────────────────────────────────────────────────
function EmptyState({ onSuggest }) {
  return (
    <div style={cs.emptyWrap}>
      <div style={cs.emptyLogo}>
        <PiDiamondsFourFill size={32} color="var(--accent)" />
      </div>
      <h2 style={cs.emptyTitle}>What can I help with?</h2>
      <p style={cs.emptySub}>Ask anything, or attach a file to get started.</p>
      <div style={cs.chips}>
        {SUGGESTIONS.map((s, i) => (
          <button key={i} style={cs.chip} onClick={() => onSuggest(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main ChatWindow ───────────────────────────────────────────────────────────
function ChatWindow({ conversationId, onTitleUpdate }) {
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [file,       setFile]       = useState(null);   // File object from input
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState('');

  const abortRef    = useRef(null);
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Load history on conversation switch ──────────────────────────────────
  useEffect(() => {
    setMessages([]);
    setInput('');
    setFile(null);
    setError('');
    if (!conversationId) return;

    const load = async () => {
      try {
        const data = await getMessages(conversationId);
        setMessages(data.map(m => ({ sender: m.sender, text: m.text, file: m.file || null })));
      } catch (err) {
        console.error('Failed to load messages:', err.message);
      }
    };
    load();
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  };

  // ── Build Gemini request contents (with or without file) ─────────────────
  const buildGeminiContents = async (history, userText, attachedFile) => {
    // Previous messages (text only)
    const contents = history.map(m => ({
      role:  m.sender === 'User' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

    // Current user message
    const userParts = [];

    if (attachedFile) {
      if (SUPPORTED_GEMINI_IMAGE_TYPES.includes(attachedFile.type)) {
        // Image → inline base64
        const b64 = await fileToBase64(attachedFile);
        userParts.push({ inline_data: { mime_type: attachedFile.type, data: b64 } });
      } else {
        // Non-image: extract text content and send as text
        const textContent = await attachedFile.text();
        userParts.push({
          text: `[Attached file: ${attachedFile.name}]\n\n${textContent}\n\n---\n${userText}`,
        });
        // Return early (don't add userText again below)
        contents.push({ role: 'user', parts: userParts });
        return contents;
      }
    }

    userParts.push({ text: userText });
    contents.push({ role: 'user', parts: userParts });
    return contents;
  };

  // ── Send handler ──────────────────────────────────────────────────────────
  const handleSend = async (text = input) => {
    const trimmed = text.trim();
    if ((!trimmed && !file) || isLoading || !conversationId) return;

    const attachedFile    = file;
    const isFirstMessage  = messages.length === 0;

    setInput('');
    setFile(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setError('');

    // Optimistic UI
    setMessages(prev => [
      ...prev,
      { sender: 'User', text: trimmed, file: attachedFile
          ? { name: attachedFile.name, mimeType: attachedFile.type, sizeBytes: attachedFile.size }
          : null },
      { sender: 'Bot', text: '', isStreaming: true },
    ]);
    setIsLoading(true);

    let botText = '';

    try {
      const controller  = new AbortController();
      abortRef.current  = controller;

      // Build Gemini payload
      const contents = await buildGeminiContents(messages, trimmed, attachedFile);

      const res = await fetch(GEMINI_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  controller.signal,
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.9, maxOutputTokens: 2048 },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      botText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '(no response)';

      // Simulate streaming
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

      // Mark done
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { sender: 'Bot', text: botText, isStreaming: false };
        return copy;
      });

      // ── Save to MongoDB ─────────────────────────────────────────────────
      const titleToSave = isFirstMessage
        ? trimmed.slice(0, 50) + (trimmed.length > 50 ? '…' : '')
        : undefined;

      if (attachedFile) {
        await saveMessagesWithFile(conversationId, {
          file:        attachedFile,
          userMessage: trimmed,
          botMessage:  botText,
          title:       titleToSave,
        });
      } else {
        await saveMessages(conversationId, {
          userMessage: trimmed,
          botMessage:  botText,
          title:       titleToSave,
        });
      }

      if (isFirstMessage && titleToSave) {
        onTitleUpdate?.(conversationId, titleToSave);
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], isStreaming: false };
          return copy;
        });
      } else {
        setError(err.message || 'Something went wrong. Check your API key.');
        setMessages(prev => prev.slice(0, -2));
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
    e.target.value = '';
  };

  const isEmpty = messages.length === 0;

  // No conversation selected
  if (!conversationId) {
    return (
      <div style={cs.window}>
        <div style={cs.messagesArea}>
          <div style={cs.emptyWrap}>
            <div style={cs.emptyLogo}>
              <PiDiamondsFourFill size={32} color="var(--accent)" />
            </div>
            <h2 style={cs.emptyTitle}>Select or start a new chat</h2>
            <p style={cs.emptySub}>Choose a conversation from the sidebar.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={cs.window}>

      {/* Top bar */}
      <div style={cs.topBar}>
        <span style={cs.topTitle}>ChatBot</span>
        <span style={cs.topModel}>Gemini 2.5 Flash</span>
      </div>

      {/* Messages */}
      <div style={cs.messagesArea}>
        {isEmpty ? (
          <EmptyState onSuggest={s => { setInput(s); handleSend(s); }} />
        ) : (
          <div style={cs.messagesList}>
            {messages.map((msg, i) => (
              <Message
                key={i}
                sender={msg.sender}
                text={msg.text}
                file={msg.file}
                isStreaming={msg.isStreaming}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={cs.errorBar}>
          <span>⚠ {error}</span>
          <button style={cs.errorClose} onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Input area */}
      <div style={cs.inputOuter}>
        <div style={cs.inputBox}>

          {/* Attached file preview */}
          {file && (
            <div style={cs.attachRow}>
              <AttachedFileChip file={file} onRemove={() => setFile(null)} />
            </div>
          )}

          <div style={cs.inputRow}>
            {/* Attach button */}
            <button
              style={cs.attachBtn}
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
              disabled={isLoading}
            >
              <IoAttachOutline size={18} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt,.csv,.json,.doc,.docx"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {/* Text input */}
            <textarea
              ref={textareaRef}
              style={cs.textarea}
              placeholder="Ask anything, or attach a file…"
              value={input}
              rows={1}
              onChange={e => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />

            {/* Send / Stop */}
            {isLoading ? (
              <button style={{ ...cs.sendBtn, ...cs.stopBtn }} onClick={handleStop}>
                <IoStopCircleOutline size={17} />
              </button>
            ) : (
              <button
                style={{ ...cs.sendBtn, ...(!input.trim() && !file ? cs.sendDisabled : {}) }}
                onClick={() => handleSend()}
                disabled={!input.trim() && !file}
              >
                <IoSendSharp size={14} />
              </button>
            )}
          </div>
        </div>
        <p style={cs.hint}>Enter to send · Shift+Enter for new line · Max file size 10 MB</p>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const cs = {
  window: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    background: 'var(--bg-chat)',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 24px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  topTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.2px',
  },
  topModel: {
    fontSize: 11.5,
    color: 'var(--text-muted)',
    background: 'var(--bg-active)',
    padding: '3px 9px',
    borderRadius: 20,
    border: '1px solid var(--border)',
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  messagesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 22,
    padding: '28px 24px 16px',
    maxWidth: 820,
    width: '100%',
    margin: '0 auto',
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    textAlign: 'center',
    gap: 10,
  },
  emptyLogo: {
    width: 60,
    height: 60,
    borderRadius: '50%',
    background: 'var(--accent-dim)',
    border: '1px solid var(--accent-glow)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 500,
    color: 'var(--text-primary)',
    letterSpacing: '-0.4px',
  },
  emptySub: {
    fontSize: 13.5,
    color: 'var(--text-secondary)',
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
    maxWidth: 520,
  },
  chip: {
    background: 'var(--bg-input)',
    border: '1px solid var(--border-input)',
    borderRadius: 20,
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontFamily: 'var(--font)',
    padding: '7px 15px',
    cursor: 'pointer',
  },

  // Error
  errorBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    background: 'var(--danger-dim)',
    border: '1px solid rgba(248,113,113,0.2)',
    borderRadius: 'var(--r-sm)',
    color: 'var(--danger)',
    fontSize: 13,
    margin: '0 20px 8px',
    padding: '9px 14px',
  },
  errorClose: {
    background: 'none',
    border: 'none',
    color: 'var(--danger)',
    cursor: 'pointer',
    fontSize: 15,
    lineHeight: 1,
  },

  // Input
  inputOuter: {
    padding: '10px 20px 14px',
    maxWidth: 820,
    width: '100%',
    margin: '0 auto',
  },
  inputBox: {
    background: 'var(--bg-input)',
    border: '1px solid var(--border-input)',
    borderRadius: 'var(--r-md)',
    overflow: 'hidden',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  attachRow: {
    padding: '10px 12px 0',
  },
  attachChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    background: 'var(--accent-dim)',
    border: '1px solid var(--accent-glow)',
    borderRadius: 'var(--r-sm)',
    padding: '5px 10px',
    maxWidth: 260,
  },
  attachName: {
    fontSize: 12,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  attachRemove: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
  },
  inputRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 6,
    padding: '8px 10px 8px 8px',
  },
  attachBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: 'var(--r-sm)',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    transition: 'color 0.12s, background 0.12s',
  },
  textarea: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    resize: 'none',
    color: 'var(--text-primary)',
    fontSize: 14,
    fontFamily: 'var(--font)',
    lineHeight: 1.6,
    minHeight: 24,
    maxHeight: 160,
    overflowY: 'auto',
    padding: '4px 0',
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 'var(--r-sm)',
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.15s, opacity 0.15s',
  },
  sendDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  },
  stopBtn: {
    background: 'var(--danger-dim)',
    color: 'var(--danger)',
    border: '1px solid rgba(248,113,113,0.25)',
  },
  hint: {
    textAlign: 'center',
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 7,
  },
};

export default ChatWindow;
