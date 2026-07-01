// models/Chat.js
// Schema reference for the chatbot.chats collection in MongoDB.
// Uses native MongoDB driver (not Mongoose).

/*
  Collection: chatbot.chats

  Document shape:
  {
    _id:       ObjectId,
    title:     String,            // set from first user message (max 50 chars)

    messages: [
      {
        sender:    "User" | "Bot",
        text:      String,
        timestamp: Date,

        // Only present on User messages that include a file upload:
        file?: {
          name:      String,      // original filename e.g. "report.pdf"
          mimeType:  String,      // e.g. "application/pdf"
          sizeBytes: Number,
        }
      }
    ],

    // All files ever uploaded in this conversation (full base64 stored here)
    files: [
      {
        originalName: String,
        mimeType:     String,
        sizeBytes:    Number,
        data:         String,     // base64-encoded file content
        uploadedAt:   Date,
      }
    ],

    createdAt: Date,
    updatedAt: Date,
  }
*/

export const CHAT_SCHEMA = {
  title:     { type: 'string',  default: 'New conversation' },
  messages:  { type: 'array',   default: [] },
  files:     { type: 'array',   default: [] },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' },
};
