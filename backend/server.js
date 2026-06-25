import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const client = new MongoClient(process.env.MONGODB_URI);
let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db('chatbot');
    console.log('Connected to MongoDB - chatbot database');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

const chats = () => db.collection('chats');

// ─── Helper: safe ObjectId parse ─────────────────────────────────────────────
function toObjectId(id) {
  try { return new ObjectId(id); }
  catch { return null; }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({ message: 'ChatBot API is running...' });
});

// GET all conversations (sidebar list)
app.get('/api/conversations', async (req, res) => {
  try {
    const conversations = await chats()
      .find({}, { projection: { title: 1, createdAt: 1, updatedAt: 1 } })
      .sort({ updatedAt: -1 })
      .toArray();

    const now = new Date();
    const result = conversations.map(c => {
      const diff = (now - new Date(c.updatedAt)) / (1000 * 60 * 60 * 24);
      let group = 'Previous 7 Days';
      if (diff < 1) group = 'Today';
      else if (diff < 2) group = 'Yesterday';
      return { id: c._id.toString(), title: c.title || 'New conversation', group };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create a new conversation
app.post('/api/conversations', async (req, res) => {
  try {
    const now = new Date();
    const result = await chats().insertOne({
      title: 'New conversation',
      messages: [],
      createdAt: now,
      updatedAt: now,
    });
    res.json({ id: result.insertedId.toString(), title: 'New conversation', group: 'Today' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET messages for a conversation
app.get('/api/conversations/:id/messages', async (req, res) => {
  try {
    const oid = toObjectId(req.params.id);
    if (!oid) return res.status(400).json({ error: 'Invalid conversation ID' });

    const chat = await chats().findOne({ _id: oid });
    if (!chat) return res.status(404).json({ error: 'Conversation not found' });

    res.json(chat.messages || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST save a message pair (user + bot) after each exchange
app.post('/api/conversations/:id/messages', async (req, res) => {
  try {
    const oid = toObjectId(req.params.id);
    if (!oid) return res.status(400).json({ error: 'Invalid conversation ID' });

    const { userMessage, botMessage, title } = req.body;

    const newMessages = [
      { sender: 'User', text: userMessage, timestamp: new Date() },
      { sender: 'Bot',  text: botMessage,  timestamp: new Date() },
    ];

    const update = {
      $push: { messages: { $each: newMessages } },
      $set:  { updatedAt: new Date() },
    };

    // Set title only on first message
    if (title) update.$set.title = title;

    await chats().updateOne({ _id: oid }, update);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH rename a conversation title
app.patch('/api/conversations/:id', async (req, res) => {
  try {
    const oid = toObjectId(req.params.id);
    if (!oid) return res.status(400).json({ error: 'Invalid conversation ID' });

    const { title } = req.body;
    await chats().updateOne({ _id: oid }, { $set: { title, updatedAt: new Date() } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a conversation
app.delete('/api/conversations/:id', async (req, res) => {
  try {
    const oid = toObjectId(req.params.id);
    if (!oid) return res.status(400).json({ error: 'Invalid conversation ID' });

    await chats().deleteOne({ _id: oid });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
