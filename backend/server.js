import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));
app.use(cors());

// ─── Multer Setup ─────────────────────────────────────────────────────────────
// Files are stored temporarily in /uploads, then saved to MongoDB, then deleted
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/csv',
  'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/msword',                                                       // doc
];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`File type not allowed: ${file.mimetype}`));
  },
});

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

function toObjectId(id) {
  try   { return new ObjectId(id); }
  catch { return null; }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/', (req, res) => res.json({ message: 'ChatBot API is running...' }));

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

// POST create new conversation
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

// POST save a user+bot message pair (no file)
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
    if (title) update.$set.title = title;

    await chats().updateOne({ _id: oid }, update);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST upload a file + save message pair ───────────────────────────────────
// Frontend sends: multipart/form-data with fields:
//   file         → the actual file
//   userMessage  → text prompt from user
//   botMessage   → Gemini's response text
//   title        → (optional) first-message title
app.post('/api/conversations/:id/messages/upload', upload.single('file'), async (req, res) => {
  const tempPath = req.file?.path;

  try {
    const oid = toObjectId(req.params.id);
    if (!oid) return res.status(400).json({ error: 'Invalid conversation ID' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { userMessage, botMessage, title } = req.body;

    // Read file into buffer and convert to base64 for MongoDB storage
    const fileBuffer  = fs.readFileSync(tempPath);
    const base64Data  = fileBuffer.toString('base64');

    const fileMetadata = {
      originalName: req.file.originalname,
      mimeType:     req.file.mimetype,
      sizeBytes:    req.file.size,
      data:         base64Data,          // stored in MongoDB
      uploadedAt:   new Date(),
    };

    const newMessages = [
      {
        sender:    'User',
        text:      userMessage || '',
        file:      {
          name:     req.file.originalname,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
          // Only store a reference in the message; full data lives in files array
        },
        timestamp: new Date(),
      },
      { sender: 'Bot', text: botMessage || '', timestamp: new Date() },
    ];

    const update = {
      $push: {
        messages: { $each: newMessages },
        files:    fileMetadata,           // dedicated array for all uploaded files
      },
      $set: { updatedAt: new Date() },
    };
    if (title) update.$set.title = title;

    await chats().updateOne({ _id: oid }, update);

    // Clean up temp file
    fs.unlinkSync(tempPath);

    res.json({ success: true, fileName: req.file.originalname });
  } catch (err) {
    // Always clean up temp file on error
    if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    res.status(500).json({ error: err.message });
  }
});

// PATCH rename conversation
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

// DELETE conversation
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

// ─── Multer error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large. Max 10 MB.' });
    return res.status(400).json({ error: err.message });
  }
  if (err) return res.status(400).json({ error: err.message });
  next();
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
