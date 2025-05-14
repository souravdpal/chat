const app = require('express')();
const exp = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const round = 10;
const port = process.env.PORT || 3000;
const axios = require('axios');

app.use(cors());
app.use(exp.json());

app.use(exp.static(path.join(__dirname, '..', 'public')));
app.use(exp.static(path.join(__dirname, '..', 'data')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'signup.html'));
});

app.post('/user', async (req, res) => {
    let newData = req.body;
    let name = newData.name;
    let user = newData.user;
    let key = newData.key;

    try {
        // Hash the password (key)
        let hashKey = await bcrypt.hash(key, round);

        // Create the new data object (not an array)
        let new_user = {
            user: user,
            name: name,
            key: hashKey,
        };

        const path1 = path.join(__dirname, '..', 'data', 'user.json');
        let old = [];

        // Check if the user.json file exists
        if (fs.existsSync(path1)) {
            let readData = fs.readFileSync(path1, 'utf-8');
            try {
                old = JSON.parse(readData);
            } catch (err) {
                return res.status(400).send('Error parsing existing data.');
            }
        }

        // Ensure `old` is an array, then check if the user already exists
        if (!Array.isArray(old)) {
            old = [];  // Initialize it as an empty array if not an array
        }

        // Check if the user already exists
        if (old.some(item => item.user === user)) {
            return res.status(400).type('text').send("User already exists");
        }

        // Add the new user to the array
        old.push(new_user);

        // Write the updated data back to the file, with the new user added
        fs.writeFileSync(path1, JSON.stringify(old, null, 2));

        res.status(200).send("Complete registration data!");
    } catch (err) {
        console.error(err);
        res.status(500).send('Error hashing password or writing data.');
    }
});

app.get('/get_user', (req, res) => {
    const filepath = path.join(__dirname, '..', 'data', 'user.json')
    try {
        const data = fs.readFileSync(filepath, 'utf8');
        const parsed = JSON.parse(data);
        res.json(parsed);
    } catch (err) {
        res.status(500).send('Error getting user data');
    }

})


app.post('/cred', async (req, res) => {
    const { user, key } = req.body;
    const path1 = path.join(__dirname, '..', 'data', 'user.json');

    if (!fs.existsSync(path1)) {
        return res.status(404).send('No users found.');
    }

    const readData = fs.readFileSync(path1, 'utf-8');
    let users;
    try {
        users = JSON.parse(readData);
    } catch (err) {
        return res.status(500).send('Error reading user data.');
    }

    const foundUser = users.find(item => item.user === user);

    if (!foundUser) {
        return res.status(400).send('Incorrect ID or password!');
    }

    let credmess = await bcrypt.compare(key, foundUser.key)


    console.log(credmess)
    if (!credmess) {
        console.log('not')
        res.status(400).send('error incorrect passowrd or id ')
    } else {
        res.status(200).send('ok')

    }
});




app.post('/msg', async (req, res) => {
  const { msg } = req.body;
  console.log(`user:${msg}`)

  try {
    const response = await axios.post('http://localhost:5000/chat', {
      prompt: msg,
      model: 'deepseek-r1:1.5b'
    });

    const aiReply = response.data.reply;
    console.log(`AI : ${aiReply}`)
    res.json({ reply: `AI: ${aiReply}` });

  } catch (error) {
    console.error("Error from Python server:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to get reply from AI." });
  }
});






app.listen(port, () => {
    console.log(`Server is running on port http://localhost:${port}`);
});
