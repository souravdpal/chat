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
let mongo_uri = process.env.mongo_api;
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(cors());
app.use(exp.json());
app.use(exp.text());

app.use(exp.static(path.join(__dirname, "..", "public")));
app.use(exp.static(path.join(__dirname, "..", "data")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "signup.html"));
});

mongo
  .connect(mongo_uri)
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
  status: {
    type: Boolean,
    default: false,
  },
});
const user_cred_data = mongo.models.user || mongo.model("user", user_body);

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
  console.log(user_log, key_log);

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
      res.status(200).send(auth1_log.name);
    } else {
      res.status(400).send("Incorrect password!");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error!");
  }
});

app.post("/msg", async (req, res) => {
  const { msg } = req.body;
  console.log(`user:${msg}`);

  try {
    const response = await axios.post("http://localhost:5000/chat", {
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

app.post("/f", async (req, res) => {
  let get_data = req.body;
  let sender = get_data.s;
  let name = get_data.name;
  try {
    const f_req1 = await user_cred_data.findOne(
      { user: name },
      { user: 1, name: 1, _id: 0 }
    );
    if (f_req1.user == name) {
      let data_req_there = {
        from: sender,
        to: name,
      };
      res.status(200).json(data_req_there);
    }
  } catch (err) {
    console.log("ERROR" + err);
  }
});
app.get("/f_res", (req, res) => {
  let { ans } = req.body;
  if (ans === "ok") {
    res.status(200).json({ data: "ok" });
  } else if (ans === "denied") {
    res.status(200).json({ data: "denied" });
  } else {
    res.status(200).json({ data: "err" });
  }
  console.log(ans);
});
server.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
