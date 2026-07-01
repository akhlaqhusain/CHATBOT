import React, { useState } from 'react';
import { AiOutlinePlus } from 'react-icons/ai';
import { IoChatbubbleOutline, IoTrashOutline } from 'react-icons/io5';
import { PiDiamondsFourFill } from 'react-icons/pi';

function Sidebar({ conversations, activeId, onSelect, onNewChat, onDelete }) {
  const [hoveredId, setHoveredId] = useState(null);

  const grouped = {
    Today:            conversations.filter(c => c.group === 'Today'),
    Yesterday:        conversations.filter(c => c.group === 'Yesterday'),
    'Past 7 days':    conversations.filter(c => c.group === 'Previous 7 Days'),
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) onDelete(id);
  };

  return (
    <aside style={s.sidebar}>
      {/* Brand */}
      <div style={s.header}>
        <div style={s.brand}>
          <PiDiamondsFourFill size={18} color="var(--accent)" />
          <span style={s.brandName}>ChatBot</span>
        </div>
      </div>

      {/* New Chat */}
      <div style={s.newChatWrap}>
        <button style={s.newChatBtn} onClick={onNewChat}>
          <AiOutlinePlus size={15} />
          New conversation
        </button>
      </div>

      {/* History */}
      <nav style={s.nav}>
        {conversations.length === 0 && (
          <p style={s.empty}>No conversations yet.<br />Start one above.</p>
        )}
        {Object.entries(grouped).map(([label, items]) =>
          items.length === 0 ? null : (
            <div key={label} style={s.group}>
              <span style={s.groupLabel}>{label}</span>
              {items.map(c => {
                const isActive  = c.id === activeId;
                const isHovered = c.id === hoveredId;
                return (
                  <div
                    key={c.id}
                    style={{
                      ...s.navItem,
                      ...(isActive  ? s.navItemActive  : {}),
                      ...(isHovered ? s.navItemHovered : {}),
                    }}
                    onClick={() => onSelect(c.id)}
                    onMouseEnter={() => setHoveredId(c.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    title={c.title}
                  >
                    <IoChatbubbleOutline size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
                    <span style={s.navTitle}>{c.title}</span>
                    {(isHovered || isActive) && (
                      <button
                        style={s.deleteBtn}
                        onClick={e => handleDelete(e, c.id)}
                        title="Delete"
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <IoTrashOutline size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </nav>

      {/* Footer */}
      <div style={s.footer}>
        <div style={s.footerInner}>
          <div style={s.avatar}>A</div>
          <div>
            <div style={s.userName}>Akhlaq Husain</div>
            <div style={s.userPlan}>Premium plan</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

const s = {
  sidebar: {
    width: 'var(--sidebar-w)',
    minWidth: 'var(--sidebar-w)',
    height: '100vh',
    background: 'var(--bg-sidebar)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '20px 16px 10px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
  },
  brandName: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.3px',
  },
  newChatWrap: {
    padding: '6px 12px 10px',
  },
  newChatBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '9px 14px',
    background: 'var(--accent-dim)',
    border: '1px solid var(--accent-glow)',
    borderRadius: 'var(--r-sm)',
    color: 'var(--accent-light)',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'var(--font)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  nav: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 8px',
  },
  empty: {
    fontSize: 12,
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '28px 16px',
    lineHeight: 1.7,
  },
  group: {
    marginBottom: 18,
  },
  groupLabel: {
    display: 'block',
    fontSize: 10.5,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: 'var(--text-muted)',
    padding: '4px 8px 6px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 10px',
    borderRadius: 'var(--r-sm)',
    color: 'var(--text-secondary)',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'background 0.1s, color 0.1s',
    userSelect: 'none',
  },
  navItemHovered: {
    background: 'var(--bg-hover)',
    color: 'var(--text-primary)',
  },
  navItemActive: {
    background: 'var(--bg-active)',
    color: 'var(--text-primary)',
  },
  navTitle: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  deleteBtn: {
    flexShrink: 0,
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '2px 3px',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.12s',
  },
  footer: {
    borderTop: '1px solid var(--border)',
    padding: '12px',
  },
  footerInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 8px',
    borderRadius: 'var(--r-sm)',
    cursor: 'pointer',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    flexShrink: 0,
  },
  userName: {
    fontSize: 12.5,
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  userPlan: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 1,
  },
};

export default Sidebar;
