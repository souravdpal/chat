  const express = require('express');
  const cors = require('cors');
  const path = require('path');
  const bcrypt = require('bcryptjs');
  const round = 10;
  const port = process.env.PORT || 3000;
  const axios = require('axios');
  const mongoose = require('mongoose');
  require('dotenv').config();
  const http = require('http');
  const { Server } = require('socket.io');

  // Initialize app
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: ['http://localhost:3000', 'https://your-ngrok-id.ngrok.io'], // Update with your production URL
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.text());
  app.use(express.static(path.join(__dirname, '..', 'public')));

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
  const userSchema = new mongoose.Schema({
    name: String,
    user: String,
    key1: String,
    f: [String],
    fr_await: [String],
    status: { type: Boolean, default: false },
  });
  const userCredData = mongoose.models.user || mongoose.model('user', userSchema);

  // Check if user exists
  const exist = async (username) => {
    const user = await userCredData.findOne({ user: username }, { user: 1, name: 1 });
    return user ? true : false;
  };

  // User Registration
  app.post('/user', async (req, res) => {
    const { name, user, key } = req.body;
    const userExists = await exist(user);
    if (userExists) {
      console.log('User already exists');
      return res.status(400).send('User already exists!');
    }
    try {
      const key1 = await bcrypt.hash(key, round);
      const data = new userCredData({ name, user, key1 });
      await data.save();
      console.log(`${data.name} registered successfully`);
      res.status(200).send(`${data.name} registered successfully! Please login!`);
    } catch (err) {
      console.error('Registration error:', err);
      res.status(400).send('Registration failed!');
    }
  });

  // User Login
  app.post('/cred', async (req, res) => {
    const { user_log, key_log } = req.body;
    console.log(`${user_log} attempting login`);
    try {
      const user = await userCredData.findOne(
        { user: user_log },
        { user: 1, name: 1, key1: 1 }
      );
      if (!user) {
        console.log('User not found');
        return res.status(400).send('User does not exist!');
      }
      const result = await bcrypt.compare(key_log, user.key1);
      if (result) {
        res.status(200).json({ name: user.name, user: user.user });
      } else {
        console.log('Incorrect password');
        res.status(400).send('Incorrect password!');
      }
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).send('Server error!');
    }
  });

  // Wikipedia API endpoint
  app.post("/wiki_cmd", async (req, res) => {
    const { msg } = req.body;
    console.log(`user ask from wiki  ${msg}`);
    try {
      const response = await axios.post("http://localhost:4000/wiki", {
        prompt: msg,
      });
      let wiki_ans = response.data.reply;
      console.log("wiki" + wiki_ans);
      res.json({ reply: `wiki says : ${wiki_ans}` });
    } catch (error) {
      console.error(
        "Error from Python server:",
        error.response?.data || error.message
      
      );
      res.json({ reply: "server: page not found" });
    }
    
  });

  // AI Chat endpoint
  app.post('/msg', async (req, res) => {
    const { msg } = req.body;
    console.log(`AI message: ${msg}`);
    try {
      const response = await axios.post('http://localhost:6000/chat', {
        prompt: msg,
        model: 'deepseek-r1',
      });
      const aiReply = response.data.reply;
      console.log(`AI response: ${aiReply}`);
      res.json({ reply: ` ${aiReply}` });
    } catch (error) {
      console.error('AI error:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to get AI reply' });
    }
  });

  app.post('/msghome', async (req, res) => {
    const { msg } = req.body;
    console.log(`AI message: ${msg}`);
    try {
      const response = await axios.post('http://localhost:6000/chat', {
        prompt: msg,
        model: 'deepseek-r1',
      });
      const aiReply = response.data.reply;
      console.log(`AI response: ${aiReply}`);
      res.json({ reply: `${aiReply}` });
    } catch (error) {
      console.error('AI error:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to get AI reply' });
    }
  });

  // Send Friend Request
  app.post('/friend_request', async (req, res) => {
    const { from, to } = req.body;
    //  console.log(`Friend request from ${from} to ${to}`);
    try {
      const recipient = await userCredData.findOne({ user: to }, { user: 1, fr_await: 1 });
      if (!recipient) {
        console.log(`User ${to} not found`);
        return res.status(400).json({ error: `${to} not found` });
      }
      if (recipient.fr_await.includes(from)) {
        console.log(`Friend request already sent to ${to}`);
        return res.status(400).json({ error: `Friend request already sent to ${to}` });
      }
      await userCredData.updateOne({ user: to }, { $addToSet: { fr_await: from } });
      console.log(`Friend request sent`);
      res.status(200).json({ message: `Friend request sent to ${to}` });
    } catch (err) {
      console.error('Friend request error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Fetch Friend Requests
  app.get('/fr_requests', async (req, res) => {
    const { user } = req.query;
    //console.log(`Fetching friend requests for ${user}`);
    if (!user) {
      return res.status(400).json({ error: 'User parameter required' });
    }
    try {
      const userData = await userCredData.findOne({ user }, { fr_await: 1 });
      if (userData) {
        res.status(200).json({ requests: userData.fr_await });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (err) {
      console.error('Friend requests error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Accept/Reject Friend Request
  app.post('/fr_response', async (req, res) => {
    const { action, from, to } = req.body;
    console.log(`${action} friend request from ${from} to ${to}`);
    try {
      if (action === 'accept') {
        await userCredData.updateOne({ user: from }, { $addToSet: { f: to } });
        await userCredData.updateOne(
          { user: to },
          { $addToSet: { f: from }, $pull: { fr_await: from } }
        );
        console.log(`Friend request accepted`);
        res.status(200).json({ message: 'Friend request accepted', from });
      } else if (action === 'reject') {
        await userCredData.updateOne({ user: to }, { $pull: { fr_await: from } });
        console.log(`Friend request rejected`);
        res.status(200).json({ message: 'Friend request rejected', from });
      } else {
        res.status(400).json({ error: 'Invalid action' });
      }
    } catch (err) {
      console.error('Friend response error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Fetch Friends List
  app.get('/friends', async (req, res) => {
    const { user } = req.query;
    console.log(`Fetching friends for ${user}`);
    if (!user) {
      return res.status(400).json({ error: 'User parameter required' });
    }
    try {
      const userData = await userCredData.findOne({ user }, { f: 1 });
      if (userData) {
        res.status(200).json({ friends: userData.f });
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
    console.log(`Fetching batch statuses for users: ${users.join(', ')}`);
    if (!Array.isArray(users)) {
      return res.status(400).json({ error: 'Users parameter must be an array' });
    }
    try {
      const statuses = await userCredData.find(
        { user: { $in: users } },
        { user: 1, status: 1 }
      );
      const statusMap = statuses.reduce((map, user) => {
        map[user.user] = user.status ? 'online' : 'offline';
        return map;
      }, {});
      res.status(200).json({ statuses: statusMap });
    } catch (err) {
      console.error('Batch status error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // User Status
  app.get('/status', async (req, res) => {
    const { user } = req.query;
    console.log(`Checking status for ${user}`);
    if (!user) {
      return res.status(400).json({ error: 'User parameter required' });
    }
    try {
      const userData = await userCredData.findOne({ user }, { status: 1 });
      if (!userData) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(200).json({ status: userData.status ? 'online' : 'offline' });
    } catch (err) {
      console.error('Status error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Delete User
  app.delete('/dl/:username', async (req, res) => {
    const username = req.params.username;
    console.log(`Deleting user ${username}`);
    try {
      const result = await userCredData.deleteOne({ user: username });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      console.log(`User deleted`);
      res.status(200).json({ message: `User ${username} deleted successfully` });
    } catch (err) {
      console.error('Delete user error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Socket.IO Connection
  const userSocketMap = {};

  io.of('/').on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    socket.on('auth', async ({ user }) => {
      if (!user) {
        console.error('No user provided for auth');
        return;
      }
      // Remove stale sockets
      for (const [existingUser, socketId] of Object.entries(userSocketMap)) {
        if (existingUser === user && socketId !== socket.id) {
          delete userSocketMap[existingUser];
          console.log(`Removed stale socket for ${user}`);
        }
      }
      userSocketMap[user] = socket.id;
      console.log(`Authenticated user: ${user}`);
      
      // Update status to online
      try {
        await userCredData.findOneAndUpdate(
          { user },
          { $set: { status: true } },
          { upsert: true, new: true }
        );
        console.log(`User ${user} set to online`);
        socket.emit('status update', { user, status: true });
        // Broadcast status to friends
        const userData = await userCredData.findOne({ user }, { f: 1 });
        if (userData && userData.f) {
          userData.f.forEach((friend) => {
            const friendSocketId = userSocketMap[friend];
            if (friendSocketId) {
              io.to(friendSocketId).emit('status update', { user, status: true });
            }
          });
        }
      } catch (err) {
        console.error('Status update error:', err);
        socket.emit('error', { message: 'Failed to update status' });
      }
    });

    socket.on('chat message2', ({ user }) => {
      console.log(`Chat message ping from ${user}`);
    });

    socket.on('privateMessage', ({ from, to, message }) => {
      const toSocketId = userSocketMap[to];
      if (toSocketId) {
        io.to(toSocketId).emit('privateMessage', { from, message });
        io.to(socket.id).emit('privateMessage', { from, message, isSender: true });
        console.log(`Message from ${from} to ${to}: ${message}`);
      } else {
        socket.emit('error', { message: `${to} is offline` });
        console.log(`Message failed: ${to} offline`);
      }
    });

    socket.on('offer', ({ from, to, offer }) => {
      const toSocketId = userSocketMap[to];
      if (toSocketId) {
        io.to(toSocketId).emit('offer', { from, to, offer });
        console.log(`Offer sent from ${from} to ${to}`);
      } else {
        socket.emit('error', { message: `${to} is offline` });
      }
    });

    socket.on('answer', ({ from, to, answer }) => {
      const toSocketId = userSocketMap[to];
      if (toSocketId) {
        io.to(toSocketId).emit('answer', { from, to, answer });
        console.log(`Answer sent from ${from} to ${to}`);
      }
    });

    socket.on('iceCandidate', ({ from, to, ice }) => {
      const toSocketId = userSocketMap[to];
      if (toSocketId) {
        io.to(toSocketId).emit('iceCandidate', { from, to, ice });
        console.log(`ICE candidate sent from ${from} to ${to}`);
      }
    });

    socket.on('endCall', ({ from, to }) => {
      const toSocketId = userSocketMap[to];
      if (toSocketId) {
        io.to(toSocketId).emit('endCall', { from, to });
        console.log(`End call signal sent from ${from} to ${to}`);
      }
    });

    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${socket.id}`);
      for (const [user, id] of Object.entries(userSocketMap)) {
        if (id === socket.id) {
          try {
            await userCredData.findOneAndUpdate(
              { user },
              { $set: { status: false } }
            );
            console.log(`User ${user} set to offline`);
            // Broadcast offline status to friends
            const userData = await userCredData.findOne({ user }, { f: 1 });
            if (userData && userData.f) {
              userData.f.forEach((friend) => {
                const friendSocketId = userSocketMap[friend];
                if (friendSocketId) {
                  io.to(friendSocketId).emit('status update', { user, status: false });
                }
              });
            }
            delete userSocketMap[user];
            break;
          } catch (err) {
            console.error('Disconnect status update error:', err);
          }
        }
      }
    });
  });

  // Call/Text Initiation
  app.get('/initiate', async (req, res) => {
    const { user, to, mode } = req.query;
    console.log(`${user} initiating ${mode} with ${to}`);
    try {
      const toUser = await userCredData.findOne({ user: to }, { status: 1 });
      if (!toUser) {
        return res.status(404).json({ error: `${to} not found` });
      }
      if (!toUser.status) {
        return res.status(400).json({ error: `${to} is offline` });
      }
      const toSocketId = userSocketMap[to];
      if (toSocketId) {
        io.to(toSocketId).emit('incomingRequest', { from: user, mode });
        res.status(200).json({ message: `Connecting to ${to} for ${mode}` });
      } else {
        res.status(400).json({ error: `${to} is offline` });
      }
    } catch (err) {
      console.error('Initiate error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });