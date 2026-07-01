import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import { getConversations, createConversation, deleteConversation } from './api';

function App() {
  const [conversations, setConversations] = useState([]);
  const [activeId,      setActiveId]      = useState(null);

  useEffect(() => { loadConversations(); }, []);

  const loadConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err.message);
    }
  };

  const handleNewChat = async () => {
    try {
      const newConv = await createConversation();
      setConversations(prev => [newConv, ...prev]);
      setActiveId(newConv.id);
    } catch (err) {
      console.error('Failed to create conversation:', err.message);
    }
  };

  const handleTitleUpdate = (id, newTitle) => {
    setConversations(prev =>
      prev.map(c => c.id === id ? { ...c, title: newTitle } : c)
    );
  };

  const handleDelete = async (id) => {
    try {
      await deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeId === id) setActiveId(null);
    } catch (err) {
      console.error('Failed to delete:', err.message);
    }
  };

  return (
    <>
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNewChat={handleNewChat}
        onDelete={handleDelete}
      />
      <ChatWindow
        conversationId={activeId}
        onTitleUpdate={handleTitleUpdate}
      />
    </>
  );
}

export default App;
