let info = () => {
    const user_log = document.getElementById('user').value.trim();
    const key = document.getElementById('key').value.trim();

    if (user_log === "" || key === "") {
        return alert("You can't leave fields empty! Please fill in the details.");
    }

    const cred = {
        user: user_log,
        key: key
    };

    fetch('/cred', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(cred)
    }).then(async response => {
        const data = await response.text();
    

        if (data === 'ok') {
            try {
                const userData = await fetch('/get_user');  // ✅ Await here
                const json1 = await userData.json();        // ✅ Await .json()
                const checker = json1.find(item => item.user === user_log);
                const name = checker?.name || user_log;

                localStorage.setItem('name', name);
                alert(`${name}, welcome!`);
                window.location.href = "home.html";
            } catch (err) {
                alert("Error fetching user data.");
                console.error(err);
            }
        } else {
            alert(`Login failed: ${data.message || "Unknown error"}`);
        }
    })
}
