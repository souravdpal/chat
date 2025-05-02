/// <reference lib="dom" />
let i = 0;
let user, name, key;

let send = async () => {
    user = document.getElementById('user').value;
    name = document.getElementById('name').value;
    key = document.getElementById('key').value;

    if (user == '' || name == '' || key == '') {
        alert('Please fill details');
        return;
    }

    const mess = {
        user: user,
        name: name,
        key: key
    };

    let data = await fetch('/json/user_data.json');
    let jsonconv = await data.json();

    if (jsonconv.some(u => u.user === user)) {
        alert("User already exists!");
    } else {
        alert("Fetching and sending data...");

        fetch("http://127.0.0.1:3000/users", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(mess)
        });
    }
};
