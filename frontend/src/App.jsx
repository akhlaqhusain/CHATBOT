import { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';

const SAMPLE_CONVERSATIONS = [
  { id: 1, title: 'React performance tips', group: 'Today' },
  { id: 2, title: 'Best Python libraries 2024', group: 'Today' },
  { id: 3, title: 'How does HTTPS work?', group: 'Yesterday' },
  { id: 4, title: 'SQL vs NoSQL databases', group: 'Yesterday' },
  { id: 5, title: 'Docker basics explained', group: 'Previous 7 Days' },
  { id: 6, title: 'CSS Grid vs Flexbox', group: 'Previous 7 Days' },
];

let nextId = 100;

function App() {
  const [conversations, setConversations] = useState(SAMPLE_CONVERSATIONS);
  const [activeId, setActiveId] = useState(null);

  const handleNewChat = () => {
    const id = nextId++;
    const newConv = { id, title: 'New conversation', group: 'Today' };
    setConversations(prev => [newConv, ...prev]);
    setActiveId(id);
  };

  const handleSelect = (id) => {
    setActiveId(id);
  };

  return (
    <>
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelect}
        onNewChat={handleNewChat}
      />
      <ChatWindow conversationId={activeId} />
    </>
  );
}

export default App;
