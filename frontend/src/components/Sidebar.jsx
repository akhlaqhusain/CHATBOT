import React, { useState } from 'react';
import { AiOutlinePlus } from 'react-icons/ai';
import { IoChatbubbleOutline, IoTrashOutline } from 'react-icons/io5';
import { PiDiamondsFourFill } from 'react-icons/pi';

function Sidebar({ conversations, activeId, onSelect, onNewChat, onDelete }) {
  const [hoveredId, setHoveredId] = useState(null);

  const grouped = {
    Today: conversations.filter(c => c.group === 'Today'),
    Yesterday: conversations.filter(c => c.group === 'Yesterday'),
    'Previous 7 Days': conversations.filter(c => c.group === 'Previous 7 Days'),
  };

  const handleDelete = (e, id) => {
    e.stopPropagation(); // don't trigger onSelect
    if (confirm('Delete this conversation?')) {
      onDelete(id);
    }
  };

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <PiDiamondsFourFill size={20} style={{ color: '#7c5cfc' }} />
          <span>ChatBot</span>
        </div>
      </div>

      {/* New Chat */}
      <button className="new-chat-btn" onClick={onNewChat}>
        <AiOutlinePlus size={16} />
        New chat
      </button>

      {/* History */}
      <nav className="sidebar-nav">
        {conversations.length === 0 && (
          <p className="no-chats">No conversations yet</p>
        )}
        {Object.entries(grouped).map(([label, items]) =>
          items.length > 0 ? (
            <div className="nav-group" key={label}>
              <span className="nav-group-label">{label}</span>
              {items.map(c => (
                <div
                  key={c.id}
                  className={`nav-item ${c.id === activeId ? 'active' : ''}`}
                  onClick={() => onSelect(c.id)}
                  onMouseEnter={() => setHoveredId(c.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  title={c.title}
                >
                  <IoChatbubbleOutline size={14} className="nav-icon" />
                  <span className="nav-item-title">{c.title}</span>
                  {(hoveredId === c.id || activeId === c.id) && (
                    <button
                      className="delete-btn"
                      onClick={(e) => handleDelete(e, c.id)}
                      title="Delete"
                    >
                      <IoTrashOutline size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : null
        )}
      </nav>

      <style>{`
        .sidebar {
          width: var(--sidebar-w);
          min-width: var(--sidebar-w);
          height: 100vh;
          background: var(--bg-sidebar);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .sidebar-header {
          padding: 18px 16px 12px;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: -0.2px;
        }

        .new-chat-btn {
          margin: 4px 12px 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          width: calc(100% - 24px);
          padding: 9px 12px;
          background: var(--accent);
          border: none;
          border-radius: var(--radius-sm);
          color: #fff;
          font-size: 13.5px;
          font-weight: 500;
          font-family: var(--font);
          cursor: pointer;
          transition: background 0.15s, box-shadow 0.15s;
        }
        .new-chat-btn:hover {
          background: var(--accent-hover);
          box-shadow: 0 0 20px var(--accent-glow);
        }

        .sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: 4px 8px;
        }

        .no-chats {
          font-size: 12px;
          color: var(--text-muted);
          text-align: center;
          padding: 20px 0;
        }

        .nav-group {
          margin-bottom: 16px;
        }

        .nav-group-label {
          display: block;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          color: var(--text-muted);
          padding: 6px 8px 4px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 9px;
          width: 100%;
          padding: 8px 10px;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: 13px;
          font-family: var(--font);
          cursor: pointer;
          text-align: left;
          transition: background 0.12s, color 0.12s;
          position: relative;
        }
        .nav-item:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .nav-item.active {
          background: var(--bg-active);
          color: var(--text-primary);
        }
        .nav-icon {
          flex-shrink: 0;
        }
        .nav-item-title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }

        .delete-btn {
          flex-shrink: 0;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 2px 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          transition: color 0.12s, background 0.12s;
        }
        .delete-btn:hover {
          color: #f87171;
          background: rgba(239,68,68,0.12);
        }
      `}</style>
    </aside>
  );
}

export default Sidebar;
