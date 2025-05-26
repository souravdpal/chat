const app = require("express")();
const exp = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const round = 10;
const port = process.env.PORT || 3000;
const axios = require("axios");
const mongo = require("mongoose");
require("dotenv").config();
let mongo_uri = process.env.MONGO_URI;
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
//const router  = exp.Router();
//routes

//const st_user = require('./status');
//st_user(io);

app.use(cors());
app.use(exp.json());
app.use(exp.text());

app.use(exp.static(path.join(__dirname, "..", "public")));
app.use(exp.static(path.join(__dirname, "..", "data")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "welcome.html"));
});

mongo
  .connect("mongodb://localhost:27017/chat_app")
  .then(() => {
    console.log("mongo_db connected!");
  })
  .catch((err) => {
    console.log(err);
  });

const user_body = new mongo.Schema({
  name: String,
  user: String,
  key1: String,
  f: [String],
  fr_await: [String],
  status: {
    type: Boolean,
    default: false,
  },
});
const user_cred_data = mongo.models.user || mongo.model("user", user_body);
let exist = async (username_user) => {
  const db_user_cheker = await user_cred_data.findOne(
    { user: username_user }, // Fixed this
    { user: 1, _id: 0, name: 1 }
  );

  if (!db_user_cheker) {
    return false; // User not found
  }

  return db_user_cheker.user === username_user;
};

app.post("/user", async (req, res) => {
  let { name, user, key } = req.body;

  let auth1 = await user_cred_data.findOne({ user: user }, { user: 1, _id: 0 });
  let auth = auth1 && auth1.user == user;
  console.log(auth);
  if (auth) {
    console.log("user already exist error");
    res.status(400).send("user already exist!");
  } else if (!auth) {
    try {
      let key1 = await bcrypt.hash(key, round);
      let data = new user_cred_data({ name, user, key1 });
      await data.save();
      console.log(data.name + "registerd!");
      res.status(200).send(`${data.name} sucefully register! now plz login!`);
    } catch (err) {
      console.log(err);
      res.status(400);
    }
  }
});

app.post("/cred", async (req, res) => {
  const { user_log, key_log } = req.body;
  console.log(user_log + "login to server");

  try {
    const auth1_log = await user_cred_data.findOne(
      { user: user_log },
      { user: 1, name: 1, key1: 1, _id: 0 }
    );

    if (!auth1_log) {
      console.log("User not found");
      return res.status(400).send("User does not exist!");
    }

    const result = await bcrypt.compare(key_log, auth1_log.key1);

    if (result) {
      res.status(200).json({ name: auth1_log.name, user: auth1_log.user });
    } else {
      res.status(400).send("Incorrect password!");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error!");
  }
});
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
  }
  res.json({ reply: "server: page not found" });
});
app.post("/msg", async (req, res) => {
  const { msg } = req.body;
  console.log(`user:${msg}`);

  try {
    const response = await axios.post("http://localhost:6000/chat", {
      prompt: msg,
      model: "deepseek-r1:1.5b",
    });

    const aiReply = response.data.reply;
    console.log(`AI : ${aiReply}`);
    res.json({ reply: `AI: ${aiReply}` });
  } catch (error) {
    console.error(
      "Error from Python server:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to get reply from AI." });
  }
});

let sock = () => {
  // Socket.io connection
  io.on("connection", (socket) => {
    console.log("✅ A user connected");

    socket.on("chat message", (data) => {
      console.log("📩 Message:", data);
      io.emit("chat message", data);
    });

    socket.on("disconnect", () => {
      console.log("❌ A user disconnected");
    });
  });
};
sock();

app.post("/get/send", async (req, res) => {
  let { from, to } = req.body;
  try {
    const chk_fr = await user_cred_data.findOne(
      { user: to },
      { user: 1, name: 1, key1: 1, _id: 0, fr_await: 1 }
    );

    if (!chk_fr) {
      console.log("error user not found by server");
      return res.status(200).json({ msg: `Failed , ${to} not exist ` });
    }

    console.log(chk_fr.user); // <-- moved here after null check

    if (chk_fr.fr_await.includes(from)) {
      return console.log("user exist already in wait list");
    }

    if (chk_fr.user === to) {
      console.log("true");
      const from_wait_lst_upt = await user_cred_data.updateOne(
        { user: to },
        { $addToSet: { fr_await: from } }
      );
      res.json({ msg: `req to ${to}  send sucsefully` });
      chk_fr.fr_await.forEach((fr1) => {
        console.log(fr1);
      });
    } else {
      res.status(200).json({ msg: `Failed , ${to} not exist ` });
    }
  } catch (err) {
    console.log("Server error in /get/send:", err);
    res.status(500).json({ msg: "Internal server error" });
  }
});

app.post("/fr_await", async (req, res) => {
  let { user, i } = req.body;
  //console.log(i - i);
  //console.log("fr await user fetching from home js "+ user);
  try {
    const user_await = await user_cred_data.find(
      { user: user },
      { _id: 0, fr_await: 1, user: 1, f: 1 }
    );
    let ck_user = user_await[0].user;
    //console.log('this is whole arry'   + user_await);
    //console.log(`this is  ${ck_user}`);
    if (user == ck_user) {
      //console.log(ck_user);
      let sender_mess = await user_await[0].fr_await;
      //console.log(`${sender_mess}    this is awaiting list  `);
      return res.json({ awaiter: sender_mess });
    }
  } catch (err) {
    console.log(err + "err block");
  }
});
let g_res = [];
app.post("/fr_u", async (req, res) => {
  let data = req.body;
  let res_user = data.res_user;
  let from = data.from;
  let to = data.to;
  console.log(res_user);
  if (res_user == "ok") {
    const from_wait_lst_upt = await user_cred_data.updateOne(
      { user: from },
      { $addToSet: { f: to } }
    );
    const to_wait_lst_upt = await user_cred_data.updateOne(
      { user: to },
      { $addToSet: { f: from }, $pull: { fr_await: from } }
    );
    g_res.push({ msg: "fr req accepted!", user_from: from });
    console.log(`the ${from} who got req replied ${res_user}  to  ${to}`);
  } else if (res_user == "no") {
    const pull_fr = await user_cred_data.updateOne(
      { user: to },
      { $pull: { fr_await: from } }
    );
    console.log("req denied");
    g_res.push({ msg: "freind req denied", user_from: from });
  }
});
//console.log(g_res[0]);
app.get("/ans/res", (req, res) => {
  res.json(g_res);
  g_res = [];
});
app.post("/get_fr", async (req, res) => {
  let { user } = req.body;

  //console.log(user);
  const give_fr_lst = await user_cred_data.find(
    { user: user },
    { _id: 1, f: 1, user: 1 }
  );
  let fr_lst_user = give_fr_lst[0].f;
  res.status(200).json({ fr: fr_lst_user });
  //console.log(`${user} fr list is ${fr_lst_user}`);
});

app.delete("/dl/:username", async (req, res) => {
  const username = req.params.username;
  console.log("Attempting to delete user:", username);

  try {
    const deletionResult = await user_cred_data.deleteOne({ user: username });

    if (deletionResult.deletedCount === 0) {
      return res.status(404).json({ msg: "User not found" });
    }

    return res
      .status(200)
      .json({ msg: `Successfully deleted user '${username}'` });
  } catch (error) {
    console.error("Error during user deletion:", error);
    return res
      .status(500)
      .json({ msg: "Server error during account deletion" });
  }
});

const userSocketMap1= {};

const stat = () => {
  io.on("connection", async (socket) => {
    console.log(`✅ User connected: ${socket.id}`);
    let user_stat1 = null;

    socket.on("auth", async (data) => {
      user_stat1 = data.user;
      userSocketMap1[user_stat1] = socket.id; // Map user to socket ID
      console.log(`Authenticated user: ${user_stat1}`);
      try {
        await user_cred_data.findOneAndUpdate(
          { user: user_stat1 },
          { $set: { status: true } },
          { upsert: true, new: true }
        )
        console.log(`User ${user_stat1} status set to true on auth`);
      } catch (err) {
        console.error("Error setting initial status:", err);
        socket.emit("error", { message: "Failed to update status" });
      }
    });

    socket.on("chat message2", async (data) => {
      console.log(`📩 Message from user: ${data.user}`);
      user_stat1 = data.user;
      try {
        await user_cred_data.findOneAndUpdate(
          { user: user_stat1 },
          { $set: { status: true } },
          { upsert: true, new: true }
        );
        console.log(`User ${user_stat1} status set to true on chat message2`);
      } catch (err) {
        console.error("Error updating user status:", err);
        socket.emit("error", { message: "Failed to update status" });
      }
    });

    socket.on("disconnect", async () => {
      console.log(`❌ User disconnected: ${socket.id}`);
      if (user_stat1) {
        try {
          if (userSocketMap1[user_stat1] === socket.id) {
            await user_cred_data.findOneAndUpdate(
              { user: user_stat1 },
              { $set: { status: false } }
            );
            console.log(`User ${user_stat1} status set to false on disconnect`);
            delete userSocketMap1[user_stat1];
          }
        } catch (err) {
          console.error("Error updating user status on disconnect:", err);
        }
      }
    });
  });
};

stat();
app.get("/st", async (req, res) => {
  let user = req.query.user;
  if (!user) {
    return res.status(400).json({ error: "User query parameter is required" });
  }
  try {
    let user_state = await user_cred_data.findOne(
      { user },
      { status: 1, _id: 0 }
    );
    if (!user_state) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ st: user_state.status ? "online" : "offline" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Example using Mongoose

/*app.get('/user', (req, res) => {
  const user_p = req.query.user;
  const to_p = req.query.to;
  const mode = req.query.mode;

  console.log(`${user_p} wants to ${mode} ${to_p}`);
  res.json({msg :'connecting!'})
});*/


// Map to store username => socketId
// Existing userSocketMap and connection logic
const userSocketMap = {};

// Handle socket connection
io.on("connection", (socket) => {
  console.log("✅ A user connected:", socket.id);

  // Receive username and map it to socket ID
  socket.on("auth", ({ user }) => {
    userSocketMap[user] = socket.id;
    console.log(`Authenticated user: ${user}`);
    // Update status to online
    user_cred_data.findOneAndUpdate(
      { user },
      { $set: { status: true } },
      { upsert: true, new: true }
    ).catch(err => console.error("Error setting initial status:", err));
  });

  // Handle private messages
  socket.on("private message", ({ from, to, message }) => {
    const toSocketId = userSocketMap[to];
    if (toSocketId) {
      io.to(toSocketId).emit("private message", { from, message });
      // Optionally, send back to sender for confirmation
      io.to(socket.id).emit("private message", { from, message, isSender: true });
      console.log(`Message from ${from} to ${to}: ${message}`);
    } else {
      socket.emit("error", { message: `${to} is offline or not found` });
    }
  });

  socket.on("chat message2", async (data) => {
    console.log(`📩 Message from user: ${data.user}`);
    const user_stat1 = data.user;
    try {
      await user_cred_data.findOneAndUpdate(
        { user: user_stat1 },
        { $set: { status: true } },
        { upsert: true, new: true }
      );
      console.log(`User ${user_stat1} status set to true`);
    } catch (err) {
      console.error("Error updating user status:", err);
      socket.emit("error", { message: "Failed to update status" });
    }
  });

  socket.on("disconnect", async () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    for (const [user, id] of Object.entries(userSocketMap)) {
      if (id === socket.id) {
        try {
          await user_cred_data.findOneAndUpdate(
            { user },
            { $set: { status: false } }
          );
          console.log(`User ${user} status set to false`);
          delete userSocketMap[user];
          break;
        } catch (err) {
          console.error("Error updating user status on disconnect:", err);
        }
      }
    }
  });
});

// Update /user endpoint to validate recipient status
app.get("/user", async (req, res) => {
  const user_p = req.query.user;
  const to_p = req.query.to;
  const mode = req.query.mode;

  console.log(`${user_p} wants to ${mode} ${to_p}`);

  try {
    const toUser = await user_cred_data.findOne({ user: to_p }, { status: 1 });
    if (!toUser) {
      return res.status(404).json({ msg: `${to_p} not found` });
    }
    if (!toUser.status) {
      return res.status(400).json({ msg: `${to_p} is offline` });
    }
    const toSocketId = userSocketMap[to_p];
    if (toSocketId) {
      io.to(toSocketId).emit("incoming-request", { from: user_p, mode });
      res.json({ msg: `Connecting to ${to_p} for ${mode}` });
    } else {
      res.status(400).json({ msg: `${to_p} is offline` });
    }
  } catch (err) {
    console.error("Error in /user:", err);
    res.status(500).json({ msg: "Internal server error" });
  }
});


server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
