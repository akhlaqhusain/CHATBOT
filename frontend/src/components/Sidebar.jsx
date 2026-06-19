import React from 'react';
import { AiOutlinePlus } from 'react-icons/ai';
import { IoChatbubbleOutline } from 'react-icons/io5';
import { PiDiamondsFourFill } from 'react-icons/pi';

function Sidebar({ conversations, activeId, onSelect, onNewChat }) {
  const grouped = {
    Today: conversations.filter(c => c.group === 'Today'),
    Yesterday: conversations.filter(c => c.group === 'Yesterday'),
    'Previous 7 Days': conversations.filter(c => c.group === 'Previous 7 Days'),
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
        {Object.entries(grouped).map(([label, items]) =>
          items.length > 0 ? (
            <div className="nav-group" key={label}>
              <span className="nav-group-label">{label}</span>
              {items.map(c => (
                <button
                  key={c.id}
                  className={`nav-item ${c.id === activeId ? 'active' : ''}`}
                  onClick={() => onSelect(c.id)}
                  title={c.title}
                >
                  <IoChatbubbleOutline size={14} />
                  <span className="nav-item-title">{c.title}</span>
                </button>
              ))}
            </div>
          ) : null
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-row">
          <div className="avatar">A</div>
          <div className="user-info">
            <span className="user-name">Akhlaq Husain</span>
            <span className="user-plan">Premium Plan</span>
          </div>
        </div>
      </div>

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
        }
        .nav-item:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .nav-item.active {
          background: var(--bg-active);
          color: var(--text-primary);
        }
        .nav-item-title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sidebar-footer {
          padding: 12px;
          border-top: 1px solid var(--border);
        }

        .user-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background 0.12s;
        }
        .user-row:hover { background: var(--bg-hover); }

        .avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), #c084fc);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          flex-shrink: 0;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .user-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .user-plan {
          font-size: 11px;
          color: var(--text-muted);
        }
      `}</style>
    </aside>
  );
}

export default Sidebar;
