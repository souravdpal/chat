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

app.use(cors());
app.use(exp.json());
app.use(exp.text());

app.use(exp.static(path.join(__dirname, "..", "public")));
app.use(exp.static(path.join(__dirname, "..", "data")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "signup.html"));
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

app.post("/fr_await", async (req, res) => {
  let { from, to, user } = req.body;
  if (from !== "" && to == "") {
    console.log(`from ${from} to  ${to}`);
  }

  console.log(user);
  try {
    const user_await = await user_cred_data.find(
      { user: user },
      { _id: 0, fr_await: 1, user: 1 }
    );
    let ck_user = user_await[0].user;
    console.log(user_await);
    console.log(`this is  ${ck_user}`);
    if (user == ck_user) {
      console.log(ck_user);
      let sender_mess = await user_await[0].fr_await;
      console.log(sender_mess);
      return res.json({ awaiter: sender_mess });
    }
  } catch (err) {
    console.log(err + "err");
  } finally {
    try {
      const chk_fr = await user_cred_data.findOne(
        { user: to },
        { user: 1, name: 1, key1: 1, _id: 0, fr_await: 1 }
      );
      console.log(chk_fr);
      if (!chk_fr) {
        console.log("error user not found by server");
        return res.status(200).json({ msg: `Failed , ${to} not exist ` });
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
      console.log(err);
    }
  }
});
app.post("/fr_u", async (req, res) => {
  let data  = req.body;
  let res_user = data.res_user;
  let from  = data.from ;
  let to  = data.to ;
  if (res_user == "ok") {
    const from_wait_lst_upt = await user_cred_data.updateOne(
      { user: from },
      { $addToSet: { f: from } }
    );
    const to_wait_lst_upt = await user_cred_data.updateOne(
      { user: to },
      { $addToSet: { f: to }, 
       $pull : {fr_await : from}
    
    }
    );
    console.log(`the ${from} who got req replied ${res_user}  to  ${to}`)
    
  }
});
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
