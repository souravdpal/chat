const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const mongoose = require('mongoose');
const runPythonChat = require('./runPythonChat');
const runWikiProcess = require('./runWikiProcess');
require('dotenv').config();
const winston = require('winston');
const rateLimit = require('express-rate-limit');
const lockfile = require('proper-lockfile');
const { body, validationResult } = require('express-validator');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;


const saltRounds = parseInt(process.env.SALT_ROUNDS) || 12;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data', 'json');
const WORLD_CHAT_DIR = path.join(__dirname, '..', 'data', 'worldchat');
const CHAT_FILE_PREFIX = path.join(DATA_DIR, 'chat_history');
const WORLD_CHAT_FILE = path.join(WORLD_CHAT_DIR, 'worldchat.json');
const MAX_MESSAGES_PER_FILE = parseInt(process.env.MAX_MESSAGES_PER_FILE) || 10000;
let chatFileIndex = 0;

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

// Helper to get all chat history files (for AI chats)
async function getAllChatFiles() {
  try {
    const files = await fs.readdir(DATA_DIR);
    return files
      .filter((f) => f.startsWith('chat_history') && f.endsWith('.json'))
      .sort((a, b) => {
        const ai = parseInt(a.replace('chat_history', '').replace('.json', '')) || 0;
        const bi = parseInt(b.replace('chat_history', '').replace('.json', '')) || 0;
        return ai - bi;
      })
      .map((f) => path.join(DATA_DIR, f));
  } catch (err) {
    logger.error('Error listing chat files:', err);
    return [path.join(DATA_DIR, 'chat_history.json')];
  }
}

// Helper to get current chat file path (for AI chats)
function getCurrentChatFile() {
  return chatFileIndex === 0
    ? `${CHAT_FILE_PREFIX}.json`
    : `${CHAT_FILE_PREFIX}${chatFileIndex}.json`;
}

// Initialize chat history file (for AI chats)
async function initChatFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const files = await getAllChatFiles();
    if (files.length === 0) {
      await fs.writeFile(`${CHAT_FILE_PREFIX}.json`, JSON.stringify({ msg: [] }, null, 2));
      chatFileIndex = 0;
      logger.info(`Created new chat history file at ${CHAT_FILE_PREFIX}.json`);
    } else {
      const lastFile = files[files.length - 1];
      const match = lastFile.match(/chat_history(\d*)\.json$/);
      chatFileIndex = match && match[1] ? parseInt(match[1]) : 0;
      logger.info(`Using chat history file: ${lastFile}`);
    }
  } catch (err) {
    logger.error('Error initializing chat file:', err);
    throw err;
  }
}

// Initialize world chat file
async function initWorldChatFile() {
  try {
    await fs.mkdir(WORLD_CHAT_DIR, { recursive: true });
    try {
      await fs.access(WORLD_CHAT_FILE);
    } catch {
      await fs.writeFile(WORLD_CHAT_FILE, JSON.stringify({ messages: [] }, null, 2));
      logger.info(`Created new world chat file at ${WORLD_CHAT_FILE}`);
    }
  } catch (err) {
    logger.error('Error initializing world chat file:', err);
    throw err;
  }
}

// Save AI message to JSON file (for AI chats)
async function saveMessage(type, message) {
  if (type !== 'msg') return;
  const filePath = getCurrentChatFile();
  try {
    const release = await lockfile.lock(filePath, { retries: 5 });
    try {
      let data;
      try {
        data = JSON.parse(await fs.readFile(filePath));
      } catch {
        data = { msg: [] };
      }
      data.msg = data.msg || [];
      data.msg.push(message);

      if (data.msg.length >= MAX_MESSAGES_PER_FILE) {
        chatFileIndex += 1;
        const newFilePath = getCurrentChatFile();
        await fs.writeFile(newFilePath, JSON.stringify({ msg: [message] }, null, 2));
        logger.info(`Rotated chat history to ${newFilePath}`);
      } else {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      }
    } finally {
      await release();
    }
  } catch (err) {
    logger.error('Error saving AI message:', err);
  }
}

// Save world chat message to JSON file
async function saveWorldChatMessage(message) {
  try {
    const release = await lockfile.lock(WORLD_CHAT_FILE, { retries: 5 });
    try {
      let data;
      try {
        data = JSON.parse(await fs.readFile(WORLD_CHAT_FILE));
      } catch {
        data = { messages: [] };
      }
      data.messages = data.messages || [];
      data.messages.push(message);
      await fs.writeFile(WORLD_CHAT_FILE, JSON.stringify(data, null, 2));
    } finally {
      await release();
    }
  } catch (err) {
    logger.error('Error saving world chat message:', err);
  }
}

// Get AI chat history
async function getChatHistory(type, user1) {
  if (type !== 'msg') return [];
  try {
    const files = await getAllChatFiles();
    let messages = [];
    for (const file of files) {
      try {
        const data = JSON.parse(await fs.readFile(file));
        if (Array.isArray(data.msg)) {
          messages = messages.concat(data.msg);
        }
      } catch { }
    }
    if (user1) {
      messages = messages.filter((msg) => msg.username === user1);
    }
    return messages.slice(-1000);
  } catch (err) {
    logger.error('Error reading AI message history:', err);
    return [];
  }
}

// Get world chat history
async function getWorldChatHistory() {
  try {
    const data = JSON.parse(await fs.readFile(WORLD_CHAT_FILE));
    if (Array.isArray(data.messages)) {
      return data.messages.slice(-1000); // Limit to last 1000 messages
    }
    return [];
  } catch (err) {
    logger.error('Error reading world chat history:', err);
    return [];
  }
}
app.set('trust proxy', 1);
// CORS configuration
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000', 'https://chatgpt-voice-assistant.vercel.app', 'https://hina-ai.onrender.com/'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000', 'https://chatgpt-voice-assistant.vercel.app', 'https://hina-ai.onrender.com/'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));
app.use(express.static(path.join(__dirname, '..', 'assets', 'images'), { extensions: ['png'] }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use('/msghome', limiter);
app.use('/wiki_cmd', limiter);

// API Key Authentication Middleware (not used in /api/hina)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
});

const authenticateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    logger.error('API request denied: No API key provided');
    return res.status(400).json({ error: 'API key required' });
  }
  try {
    if (apiKey !== process.env.HINA_API_KEY) {
      logger.error('API request denied: Invalid API key');
      return res.status(401).json({ error: 'Invalid API key' });
    }
    logger.info('API key validated successfully');
    next();
  } catch (error) {
    logger.error('Error validating API key:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
  }
};

// Public API Endpoint for Hina
app.post(
  '/api/hina',
  [apiLimiter],
  [
    body('msg').notEmpty().withMessage('Message required'),
    body('username').notEmpty().withMessage('Username required'),
    body('name').optional().trim().escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.error('API validation error:', errors.array()[0].msg);
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { msg, username, name } = req.body;
    try {
      const { reply } = await runPythonChat({ msg, username, name });
      logger.info(`API response for "${msg}" by ${username}: ${reply}`);
      const message = { message: msg, reply, timestamp: new Date().toISOString(), username };
      await saveMessage('msg', message);
      res.json({ reply });
    } catch (err) {
      logger.error(`API error in /api/hina: ${err.message}`);
      res.status(500).json({ error: 'Failed to get AI reply' });
    }
  }
);

// Serve welcome page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'welcome.html'));
});

// MongoDB connection
async function connectMongoDB() {
  const maxRetries = 5;
  let retries = 0;
  while (retries < maxRetries) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      logger.info('Connected to MongoDB!');
      return;
    } catch (err) {
      retries += 1;
      logger.error(`MongoDB connection attempt ${retries} failed:`, err);
      if (retries === maxRetries) {
        logger.error('Max MongoDB connection retries reached. Server will continue without MongoDB.');
        return; // Continue without exiting
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}
// User Schema
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    user: { type: String, required: true, unique: true, index: true },
    key1: { type: String, required: true },
    f: { type: [String], default: [], index: true },
    fr_await: { type: [String], default: [] },
    status: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

// Input validation middleware
const sanitizeInput = [body('*').trim().escape()];

// User Registration
app.post(
  '/user',
  sanitizeInput,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('user').notEmpty().withMessage('Username is required'),
    body('key').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { name, user, key } = req.body;
    try {
      const existingUser = await User.findOne({ user });
      if (existingUser) {
        logger.info(`Registration attempt failed: User ${user} already exists`);
        return res.status(400).json({ error: 'User already exists!' });
      }
      const hashedKey = await bcrypt.hash(key, saltRounds);
      const newUser = new User({ name, user, key1: hashedKey });
      await newUser.save();
      logger.info(`${newUser.name} registered successfully`);
      res.status(200).json({ message: `${newUser.name} registered successfully! Please login.` });
    } catch (err) {
      logger.error('Registration error:', err);
      res.status(500).json({ error: 'Registration failed due to server error.' });
    }
  }
);

// User Login
app.post(
  '/cred',
  sanitizeInput,
  [
    body('user_log').notEmpty().withMessage('Username is required'),
    body('key_log').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { user_log, key_log } = req.body;
    try {
      const user = await User.findOne({ user: user_log }, { user: 1, name: 1, key1: 1 });
      if (!user) {
        logger.info(`Login attempt failed: User ${user_log} not found`);
        return res.status(400).json({ error: 'User does not exist!' });
      }
      const passwordMatch = await bcrypt.compare(key_log, user.key1);
      if (!passwordMatch) {
        logger.info(`Login attempt failed: Incorrect password for ${user_log}`);
        return res.status(400).json({ error: 'Incorrect password!' });
      }
      res.status(200).json({ name: user.name, user: user.user });
    } catch (err) {
      logger.error('Login error:', err);
      res.status(500).json({ error: 'Server error during login.' });
    }
  }
);

app.get('/msghome', async (req, res) => {
  const { msg, user, name } = req.query;
  if (!msg || !user) {
    logger.error('GET /msghome validation error: Message and user required');
    return res.status(400).json({ error: 'Message and user required' });
  }
  try {
    const { reply } = await runPythonChat({ msg, username: user, name });
    logger.info(`GET /msghome response for "${msg}" by ${user}: ${reply}`);
    const message = { message: msg, reply, timestamp: new Date().toISOString(), username: user };
    await saveMessage('msg', message);
    res.json({ reply });
  } catch (err) {
    logger.error(`GET /msghome error: ${err.message}`);
    res.status(500).json({ error: 'Failed to get AI reply' });
  }
});

// Wiki Query Endpoint
app.post(
  '/wiki_cmd',
  sanitizeInput,
  [
    body('msg').notEmpty().withMessage('Message required'),
    body('username').notEmpty().withMessage('Username required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { msg, username } = req.body;
    try {
      const { reply } = await runWikiProcess({ prompt: msg });
      logger.info(`Wiki response for "${msg}" by ${username}: ${reply || 'No reply'}`);
      const userSocketId = userSocketMap.get(username);
      if (userSocketId) {
        io.to(userSocketId).emit('wiki message', {
          username: 'Hina',
          reply: reply || 'page not found',
          timestamp: new Date().toISOString(),
        });
      }
      res.json({ reply: `wiki says: ${reply || 'page not found'}` });
    } catch (err) {
      logger.error(`Wiki error in /wiki_cmd: ${err.message}`);
      res.json({ error: 'server: page not found' });
    }
  }
);

// Chat History Endpoint
app.get('/chat_history', async (req, res) => {
  const { type, user1 } = req.query;
  if (type === 'msg' && user1) {
    try {
      const messages = await getChatHistory(type, user1);
      res.json({ messages });
    } catch (err) {
      logger.error(`Error fetching AI chat history:`, err);
      res.status(500).json({ error: 'Failed to fetch chat history' });
    }
  } else if (type === 'worldchat') {
    try {
      const messages = await getWorldChatHistory();
      res.json({ messages });
    } catch (err) {
      logger.error(`Error fetching world chat history:`, err);
      res.status(500).json({ error: 'Failed to fetch world chat history' });
    }
  } else {
    return res.status(400).json({ error: 'Type must be "msg" (with user1) or "worldchat"' });
  }
});

// Friend Request and Other Endpoints
app.post(
  '/friend_request',
  sanitizeInput,
  [
    body('from').notEmpty().withMessage('From is required'),
    body('to').notEmpty().withMessage('To is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { from, to } = req.body;
    if (from === to) {
      return res.status(400).json({ error: 'Cannot add yourself' });
    }
    try {
      const recipient = await User.findOne({ user: to }, { user: 1, fr_await: 1, f: 1 });
      if (!recipient) {
        logger.info(`Friend request failed: User ${to} not found`);
        return res.status(400).json({ error: `${to} not found` });
      }
      if (recipient.fr_await.includes(from)) {
        logger.info(`Friend request already sent from ${from} to ${to}`);
        return res.status(400).json({ error: `Friend request already sent to ${to}` });
      }
      if (recipient.f.includes(from)) {
        logger.info(`${to} is already a friend of ${from}`);
        return res.status(400).json({ error: `${to} is already a friend` });
      }
      await User.updateOne({ user: to }, { $addToSet: { fr_await: from } });
      const recipientSocketId = userSocketMap.get(to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('friendRequest', { from });
      }
      logger.info(`Friend request sent from ${from} to ${to}`);
      res.json({ message: `Friend request sent to ${to}` });
    } catch (err) {
      logger.error('Friend request error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

app.post(
  '/fr_response',
  sanitizeInput,
  [
    body('action').isIn(['accept', 'reject']).withMessage('Invalid action'),
    body('from').notEmpty().withMessage('From is required'),
    body('to').notEmpty().withMessage('To is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { action, from, to } = req.body;
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
        const socket = io('https://hina-ai.onrender.com', {
          transports: ['polling'], // Force polling to bypass WebSocket issues
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          extraHeaders: {
            'ngrok-skip-browser-warning': 'true',
          },
        }); await User.updateOne({ user: to }, { $addToSet: { f: from }, $pull: { fr_await: from } });
        const recipientSocketId = userSocketMap.get(to);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('friendRequestAccepted', { from });
        }
        logger.info(`Friend request accepted from ${from} to ${to}`);
        res.json({ message: 'Friend request accepted', from });
      } else {
        await User.updateOne({ user: to }, { $pull: { fr_await: from } });
        logger.info(`Friend request rejected from ${from} to ${to}`);
        res.json({ message: 'Friend request rejected', from });
      }
    } catch (err) {
      logger.error('Friend response error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

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
    logger.error('Friend requests error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

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
    logger.error('Friends fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post(
  '/batch_status',
  sanitizeInput,
  [body('users').isArray().withMessage('Users must be an array')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { users } = req.body;
    try {
      const statuses = await User.find({ user: { $in: users } }, { user: 1, status: 1 });
      const statusMap = statuses.reduce((map, user) => {
        map[user.user] = user.status ? 'online' : 'offline';
        return map;
      }, {});
      res.json({ statuses: statusMap });
    } catch (err) {
      logger.error('Batch status error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

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
    logger.error('Status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/dl/:username', async (req, res) => {
  const { username } = req.params;
  logger.info(`Deleting user ${username}`);
  try {
    const result = await User.deleteOne({ user: username });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    logger.info(`User ${username} deleted`);
    res.json({ message: `User ${username} deleted successfully` });
  } catch (err) {
    logger.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

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
    logger.error('Initiate error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Socket.IO Connection
const userSocketMap = new Map();

io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  socket.on('auth', async ({ user }) => {
    if (!user) {
      socket.emit('error', { message: 'No user provided' });
      return;
    }
    userSocketMap.set(user, socket.id);
    socket.user = user;
    try {
      await User.findOneAndUpdate({ user }, { $set: { status: true } }, { upsert: true, new: true });
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
      logger.info(`${user} authenticated and set to online`);
    } catch (err) {
      logger.error('Auth error:', err);
      socket.emit('error', { message: 'Failed to authenticate' });
    }
  });

  socket.on('world message', async ({ username, message, timestamp }) => {
    if (!username || !message || !timestamp) {
      socket.emit('error', { message: 'Invalid world message data' });
      return;
    }
    const messageData = { username, message, timestamp };
    await saveWorldChatMessage(messageData);
    logger.info(`World message from ${username}: ${message}`);
    // Notify all clients to refresh their chat
    io.emit('new world message');
  });

  socket.on('chat message2', ({ user }) => {
    if (user) socket.user = user;
    logger.info(`Chat message ping from ${user}`);
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
      logger.info(`Message from ${from} to ${to}: ${message}`);
    } else {
      socket.emit('error', { message: `${to} is offline` });
      logger.info(`Message failed: ${to} offline`);
    }
  });

  socket.on('offer', ({ from, to, offer }) => {
    if (!from || !to || !offer) {
      socket.emit('error', { message: 'Invalid offer data' });
      return;
    }
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('offer', { from, offer });
      logger.info(`Offer sent from ${from} to ${to}`);
    } else {
      socket.emit('error', { message: `${to} is offline` });
    }
  });

  socket.on('answer', ({ from, to, answer }) => {
    if (!from || !to || !answer) {
      socket.emit('error', { message: 'Invalid answer data' });
      return;
    }
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('answer', { from, answer });
      logger.info(`Answer sent from ${from} to ${to}`);
    } else {
      socket.emit('error', { message: `${to} is offline` });
    }
  });

  socket.on('iceCandidate', ({ from, to, candidate }) => {
    if (!from || !to || !candidate) {
      socket.emit('error', { message: 'Invalid ICE candidate data' });
      return;
    }
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('iceCandidate', { from, candidate });
      logger.info(`ICE candidate sent from ${from} to ${to}`);
    } else {
      socket.emit('error', { message: `${to} is offline` });
    }
  });

  socket.on('endCall', ({ from, to }) => {
    if (!from || !to) {
      socket.emit('error', { message: 'Invalid end call data' });
      return;
    }
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('endCall', { from });
      logger.info(`End call signal from ${from} to ${to}`);
    }
  });

  socket.on('friendRequestAccepted', ({ from, to }) => {
    if (!from || !to) {
      socket.emit('error', { message: 'Invalid friend request accepted data' });
      return;
    }
    const recipientSocketId = userSocketMap.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('friendRequestAccepted', { from });
      logger.info(`Friend request accepted notification from ${from} to ${to}`);
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
        logger.info(`${user} disconnected and set to offline`);
      } catch (err) {
        logger.error('Disconnect error:', err);
      }
    }
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// Graceful shutdown
// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Starting graceful shutdown...');
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  } catch (err) {
    logger.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err.stack);
  console.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('Unhandled Rejection:', reason);
});

// Start server
startServer();
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
// Start server
async function startServer() {
  try {
    await initChatFile();
    await initWorldChatFile();
    await connectMongoDB();
    server.listen(port, '0.0.0.0', () => {
      logger.info(`Server running on http://0.0.0.0:${port}`);
      console.log(`Server is listening on port ${port}`);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is already in use. Trying port ${parseInt(port) + 1}...`);
        server.listen(parseInt(port) + 1, '0.0.0.0', () => {
          logger.info(`Server running on http://0.0.0.0:${parseInt(port) + 1}`);
          console.log(`Server is listening on port ${parseInt(port) + 1}`);
        });
      } else {
        logger.error('Unexpected server error:', err.stack);
        console.error('Server error:', err.message);
        process.exit(1);
      }
    });
  } catch (err) {
    logger.error('Failed to start server:', err.stack);
    console.error('Startup error:', err.message);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err.stack);
  console.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('Unhandled Rejection:', reason);
});


// Handle uncaught errors
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err.stack);
  console.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('Unhandled Rejection:', reason);
});

startServer()