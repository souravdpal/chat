const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const fs = require('fs').promises;
const mongoose = require('mongoose');
const runPythonChat = require('./runPythonChat');
const runWikiProcess = require('./runWikiProcess');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;
const saltRounds = 10;
const DATA_DIR = path.join(__dirname, '..', 'data', 'json');
const CHAT_FILE = path.join(DATA_DIR, 'chat_history.json');
const MAX_MESSAGES_PER_TYPE = 20;

// CORS configuration
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://46fc-49-36-191-72.ngrok-free.app',
      'https://chatgpt-voice-assistant.vercel.app',
      'https://192.168.0.123:3000',
      'https://1cb5-49-36-191-72.ngrok-free.app',
      '192.168.0.123:3000',
      // Replace 'https://your-ngrok-id.ngrok.io' with actual ngrok URL or use dynamic handling
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
//const runPythonChat = require('./runPythonChat');
//const runWikiProcess = require('./runWikiProcess'); // Add new handler

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());
app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));

// Serve welcome page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'welcome.html'));
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chat_app')
  .then(() => console.log('Connected to MongoDB!'))
  .catch((err) => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    user: { type: String, required: true, unique: true },
    key1: { type: String, required: true },
    f: { type: [String], default: [] }, // Friends list
    fr_await: { type: [String], default: [] }, // Friend requests awaiting response
    status: { type: Boolean, default: false }, // Online status
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

// Initialize chat history file
async function initChatFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(CHAT_FILE);
    } catch {
      console.log(`Chat history file not found at ${CHAT_FILE}. Creating a new one...`);
      await fs.writeFile(CHAT_FILE, JSON.stringify({ msg: [] }, null, 2));
      console.log(`New chat history file created at ${CHAT_FILE}`);
    }
  } catch (err) {
    console.error('Error initializing chat file:', err);
    throw err;
  }
}

// Save AI message to JSON file
async function saveMessage(type, message) {
  if (type !== 'msg') return;
  try {
    const data = JSON.parse(await fs.readFile(CHAT_FILE));
    data.msg = data.msg || [];
    data.msg.push(message);
    if (data.msg.length > MAX_MESSAGES_PER_TYPE) {
      data.msg = data.msg.slice(-MAX_MESSAGES_PER_TYPE);
    }
    await fs.writeFile(CHAT_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving AI message:', err);
  }
}

// Get AI chat history
async function getChatHistory(type, user1) {
  if (type !== 'msg') return [];
  try {
    const data = JSON.parse(await fs.readFile(CHAT_FILE));
    let messages = data.msg || [];
    if (user1) {
      messages = messages.filter((msg) => msg.username === user1);
    }
    return messages;
  } catch (err) {
    console.error('Error reading AI message history:', err);
    return [];
  }
}

// Check if user exists
async function exist(username) {
  try {
    const user = await User.findOne({ user: username }, { user: 1, name: 1, fr_await: 1, f: 1, status: 1 });
    return user;
  } catch (err) {
    console.error('Error checking user existence:', err);
    return null;
  }
}

// User Registration
app.post('/user', async (req, res) => {
  const { name, user, key } = req.body;

  if (!name || !user || !key) {
    return res.status(400).json({ error: 'Name, username, and password are required.' });
  }

  try {
    const existingUser = await User.findOne({ user });
    if (existingUser) {
      console.log('User already exists');
      return res.status(400).json({ error: 'User already exists!' });
    }

    const hashedKey = await bcrypt.hash(key, saltRounds);
    const newUser = new User({ name, user, key1: hashedKey });
    await newUser.save();

    console.log(`${newUser.name} registered successfully`);
    res.status(200).json({ message: `${newUser.name} registered successfully! Please login.` });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed due to server error.' });
  }
});



// User Login
app.post('/cred', async (req, res) => {
    console.log('Request body:', req.body); // Log the request body
    const { user_log, key_log } = req.body;

    if (!user_log || !key_log) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const user = await User.findOne({ user: user_log }, { user: 1, name: 1, key1: 1 });
        console.log('User found:', user); // Log the user document

        if (!user) {
            console.log('User not found');
            return res.status(400).json({ error: 'User does not exist!' });
        }

        if (!user.key1) {
            console.log('No key1 field found for user:', user_log);
            return res.status(500).json({ error: 'User password not set in database.' });
        }

        const passwordMatch = await bcrypt.compare(key_log, user.key1);
        if (!passwordMatch) {
            console.log('Incorrect password');
            return res.status(400).json({ error: 'Incorrect password!' });
        }

        res.status(200).json({ name: user.name, user: user.user });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});
// AI Chat Endpoint
// AI Home Chat Endpoint (Using runPythonChat)
app.post('/msghome', async (req, res) => {
  const { msg } = req.body;
  if (!msg) {
    console.log('Missing msg field for /msghome');
    return res.status(400).json({ error: 'Message required' });
  }
  console.log(`AI message: ${msg}`);
  try {
    const { reply } = await runPythonChat({ msg });
    console.log(`AI response: ${reply}`);
    res.json({ reply });
  } catch (err) {
    console.error(`AI error in /msghome: ${err.message}`, err.stack);
    res.status(500).json({ error: 'Failed to get AI reply', details: err.message });
  }
});
// Home AI Chat Endpoint (Original, using axios)
// AI Home Chat Endpoint (Using runPythonChat)
app.post('/msg', async (req, res) => {
  const { msg } = req.body;
  if (!msg) {
    console.log('Missing msg field for /msghome');
    return res.status(400).json({ error: 'Message required' });
  }
  console.log(`${msg}`);
  try {
    const { reply } = await runPythonChat({ msg });
    console.log(`AI response: ${reply}`);
    res.json({reply});
  } catch (err) {
    console.error(`AI error in /msghome: ${err.message}`, err.stack);
    res.status(500).json({ error: 'Failed to get AI reply', details: err.message });
  }
});

// Wikipedia API Endpoint (Using runWikiProcess)
app.post('/wiki_cmd', async (req, res) => {
  const { msg } = req.body;
  if (!msg) {
    console.log('Missing msg field for /wiki_cmd');
    return res.status(400).json({ error: 'Message required' });
  }
  console.log(`user ask from wiki ${msg}`);
  try {
    const { reply } = await runWikiProcess({ prompt: msg });
    if (reply) {
      console.log(`wiki ${reply}`);
    } else {
      console.warn('Wiki reply is undefined or empty');
    }
    res.json({ reply: `wiki says : ${reply}` });
  } catch (err) {
    console.error(`Wiki error in /wiki_cmd:${err.message}`, err.stack);
    res.json({ reply: 'server: page not found', details: err.message });
  }
});
// Chat History Endpoint
app.get('/chat_history', async (req, res) => {
  const { type, user1 } = req.query;
  if (!type || !user1) {
    return res.status(400).json({ error: 'Type and user1 are required' });
  }
  try {
    const messages = await getChatHistory(type, user1);
    res.json({ messages });
  } catch (err) {
    console.error(`Error fetching ${type} history:`, err);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Send Friend Request
app.post('/friend_request', async (req, res) => {
  const { from, to } = req.body;
  if (!from || !to) {
    return res.status(400).json({ error: 'From and to required' });
  }
  if (from === to) {
    return res.status(400).json({ error: 'Cannot add yourself' });
  }
  try {
    const recipient = await User.findOne({ user: to }, { user: 1, fr_await: 1, f: 1 });
    if (!recipient) {
      console.log(`User ${to} not found`);
      return res.status(400).json({ error: `${to} not found` });
    }
    if (recipient.fr_await.includes(from)) {
      console.log(`Friend request already sent to ${to}`);
      return res.status(400).json({ error: `Friend request already sent to ${to}` });
    }
    if (recipient.f.includes(from)) {
      console.log(`${to} is already a friend`);
      return res.status(400).json({ error: `${to} is already a friend` });
    }
    await User.updateOne({ user: to }, { $addToSet: { fr_await: from } });
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('friendRequest', { from });
    }
    console.log(`Friend request sent from ${from} to ${to}`);
    res.json({ message: `Friend request sent to ${to}` });
  } catch (err) {
    console.error('Friend request error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept/Reject Friend Request
app.post('/fr_response', async (req, res) => {
  const { action, from, to } = req.body;
  if (!action || !from || !to) {
    return res.status(400).json({ error: 'Action, from, and to required' });
  }
  try {
    const recipient = await User.findOne({ user: to }, { fr_await: 1, f: 1 });
    if (!recipient || !recipient.fr_await.includes(from)) {
      return res.status(400).json({ error: 'No such friend request' });
    }
    if (action === 'accept') {
      const sender = await User.findOne({ user: from }, { f: 1 });
      if (!sender) {
        return res.status(400).json({ error: `${from} not found` });
      }
      await User.updateOne({ user: from }, { $addToSet: { f: to } });
      await User.updateOne(
        { user: to },
        { $addToSet: { f: from }, $pull: { fr_await: from } }
      );
      const recipientSocketId = userSocketMap.get(to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('friendRequestAccepted', { from });
      }
      console.log(`Friend request accepted from ${from} to ${to}`);
      res.json({ message: 'Friend request accepted', from });
    } else if (action === 'reject') {
      await User.updateOne({ user: to }, { $pull: { fr_await: from } });
      console.log(`Friend request rejected from ${from} to ${to}`);
      res.json({ message: 'Friend request rejected', from });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (err) {
    console.error('Friend response error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fetch Friend Requests
app.get('/fr_requests', async (req, res) => {
  const { user } = req.query;
  if (!user) {
    return res.status(400).json({ error: 'User parameter required' });
  }
  try {
    const userData = await User.findOne({ user }, { fr_await: 1 });
    if (userData) {
      res.json({ requests: userData.fr_await });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error('Friend requests error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fetch Friends List
app.get('/friends', async (req, res) => {
  const { user } = req.query;
  if (!user) {
    return res.status(400).json({ error: 'User parameter required' });
  }
  try {
    const userData = await User.findOne({ user }, { f: 1 });
    if (userData) {
      res.json({ friends: userData.f });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error('Friends fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Batch Fetch User Statuses
app.post('/batch_status', async (req, res) => {
  const { users } = req.body;
  if (!Array.isArray(users)) {
    return res.status(400).json({ error: 'Users parameter must be an array' });
  }
  try {
    const statuses = await User.find({ user: { $in: users } }, { user: 1, status: 1 });
    const statusMap = statuses.reduce((map, user) => {
      map[user.user] = user.status ? 'online' : 'offline';
      return map;
    }, {});
    res.json({ statuses: statusMap });
  } catch (err) {
    console.error('Batch status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// User Status
app.get('/status', async (req, res) => {
  const { user } = req.query;
  if (!user) {
    return res.status(400).json({ error: 'User parameter required' });
  }
  try {
    const userData = await User.findOne({ user }, { status: 1 });
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ status: userData.status ? 'online' : 'offline' });
  } catch (err) {
    console.error('Status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete User
app.delete('/dl/:username', async (req, res) => {
  const { username } = req.params;
  console.log(`Deleting user ${username}`);
  try {
    const result = await User.deleteOne({ user: username });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    console.log(`User ${username} deleted`);
    res.json({ message: `User ${username} deleted successfully` });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Initiate Call/Text
// --- WebRTC signaling endpoints and helpers (integrated with main server) ---

// Initiate Call/Text (for compatibility with your API)
app.get('/initiate', async (req, res) => {
  const { user, to, mode } = req.query;
  if (!user || !to || !mode) {
    return res.status(400).json({ error: 'User, to, and mode required' });
  }
  if (!['text', 'call'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode' });
  }
  try {
    const recipient = await User.findOne({ user: to }, { status: 1 });
    if (!recipient) {
      return res.status(404).json({ error: `${to} not found` });
    }
    if (!recipient.status) {
      return res.status(400).json({ error: `${to} is offline` });
    }
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('incomingRequest', { from: user, mode });
      res.json({ message: `Connecting to ${to} for ${mode}` });
    } else {
      res.status(400).json({ error: `${to} is offline` });
    }
  } catch (err) {
    console.error('Initiate error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- WebRTC signaling events (compatible with your provided code) ---
/*
  The following events are handled in the main io.on('connection') block below,
  so you do NOT need a separate server for WebRTC signaling.
  The handlers below are already present in your socket.io section:
    - offer
    - answer
    - iceCandidate
    - endCall
    - auth (user status)
    - disconnect (user status)
  All events use userSocketMap for user <-> socket.id mapping.
*/

// Socket.IO Connection
const userSocketMap = new Map();

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  socket.on('auth', async ({ user }) => {
    if (!user) {
      socket.emit('error', { message: 'No user provided' });
      return;
    }
    userSocketMap.set(user, socket.id);
    socket.user = user;
    try {
      await User.findOneAndUpdate(
        { user },
        { $set: { status: true } },
        { upsert: true, new: true }
      );
      socket.emit('status update', { user, status: true });
      const userData = await User.findOne({ user }, { f: 1 });
      if (userData && userData.f && Array.isArray(userData.f)) {
        userData.f.forEach((friend) => {
          const friendSocketId = userSocketMap.get(friend);
          if (friendSocketId) {
            io.to(friendSocketId).emit('status update', { user, status: true });
          }
        });
      }
      console.log(`${user} authenticated and set to online`);
    } catch (err) {
      console.error('Auth error:', err);
      socket.emit('error', { message: 'Failed to authenticate' });
    }
  });

  socket.on('chat message2', ({ user }) => {
    if (user) socket.user = user;
    console.log(`Chat message ping from ${user}`);
  });

  socket.on('privateMessage', ({ from, to, message, timestamp }) => {
    if (!from || !to || !message) {
      socket.emit('error', { message: 'Invalid message data' });
      return;
    }
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('privateMessage', { from, message, isSender: false, timestamp });
      socket.emit('privateMessage', { from, message, isSender: true, timestamp });
      console.log(`Message from ${from} to ${to}: ${message}`);
    } else {
      socket.emit('error', { message: `${to} is offline` });
      console.log(`Message failed: ${to} offline`);
    }
  });

  socket.on('getOldMessages', async ({ from, to }) => {
    const messages = await getChatHistory('personalchat', from, to);
    socket.emit('oldMessages', { messages });
  });

  socket.on('offer', ({ from, to, offer }) => {
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('offer', { from, offer });
      console.log(`Offer sent from ${from} to ${to}`);
    } else {
      socket.emit('error', { message: `${to} is offline` });
    }
  });

  socket.on('callBusy', ({ from, to }) => {
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('callBusy', { from });
      console.log(`Call busy signal from ${from} to ${to}`);
    }
  });

  socket.on('answer', ({ from, to, answer }) => {
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('answer', { from, answer });
      console.log(`Answer sent from ${from} to ${to}`);
    } else {
      socket.emit('error', { message: `${to} is offline` });
    }
  });

  socket.on('iceCandidate', ({ from, to, candidate }) => {
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('iceCandidate', { from, candidate });
      console.log(`ICE candidate sent from ${from} to ${to}`);
    } else {
      socket.emit('error', { message: `${to} is offline` });
    }
  });

  socket.on('endCall', ({ from, to }) => {
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('endCall', { from });
      console.log(`End call signal from ${from} to ${to}`);
    }
  });

  socket.on('friendRequestAccepted', ({ from, to }) => {
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('friendRequestAccepted', { from });
      console.log(`Friend request accepted notification from ${from} to ${to}`);
    }
  });

  socket.on('disconnect', async () => {
    const user = socket.user;
    if (user) {
      userSocketMap.delete(user);
      try {
        await User.findOneAndUpdate({ user }, { $set: { status: false } });
        const userData = await User.findOne({ user }, { f: 1 });
        if (userData && userData.f && Array.isArray(userData.f)) {
          userData.f.forEach((friend) => {
            const friendSocketId = userSocketMap.get(friend);
            if (friendSocketId) {
              io.to(friendSocketId).emit('status update', { user, status: false });
            }
          });
        }
        console.log(`${user} disconnected and set to offline`);
      } catch (err) {
        console.error('Disconnect error:', err);
      }
    }
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// Start server
initChatFile()
  .then(() => {
    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Trying port ${parseInt(port) + 1}...`);
        server.listen(parseInt(port) + 1, () => {
          console.log(`Server running on http://localhost:${parseInt(port) + 1}`);
        });
      } else if (err.code === 'EACCES') {
        console.error(`Permission denied on port ${port}. Try running with elevated privileges or using a different port.`);
        process.exit(1);
      } else {
        console.error('Unexpected server error:', err);
        process.exit(1);
      }
    });
  })
  .catch((err) => {
    console.error('Failed to initialize chat file:', err);
    process.exit(1);
  });