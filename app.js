const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');

app.use(express.json());

app.get('/signup.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'signup.html'));
});

app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/json', express.static(path.join(__dirname, 'json')));
app.get('/login.html' , (req , res)=>{
    res.sendFile(path.join(__dirname , 'login.html'));
})
app.get('/home.html', (req,res)=>{
    res.sendFile(path.join(__dirname , 'home.html'))
})

app.post('/users', (req, res) => {
    const newdata = req.body;
    const filePath = path.join(__dirname, 'json', 'user_data.json');

    // Check if the file exists
    if (fs.existsSync(filePath)) {
        let data = [];
        const read_data = fs.readFileSync(filePath, 'utf-8');
        data = JSON.parse(read_data);

        // Avoid duplicate user (optional check if user already exists)
        if (data.some(user => user.user === newdata.user)) {
            return res.status(400).send('User already exists');
        }

        // Add new user to the data
        data.push(newdata);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        res.status(201).send('User data saved successfully');
        console.log(newdata)
    } else {
        // If the file doesn't exist, create it and add the new user
        fs.writeFileSync(filePath, JSON.stringify([newdata], null, 2));
        res.status(201).send('User data saved successfully');
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
