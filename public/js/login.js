let info  = () => {
    let user_log = document.getElementById('user').value.trim();
    let key = document.getElementById('key').value.trim();

    // Fix: use user_log instead of undefined `user`
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
    })
    .then(async (response) => {
        if (response.ok) {
            try {
                const data = await fetch('/get_user');
                const json1 = await data.json();
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
            const text = await response.text(); // Show backend message
            alert(`Login failed: ${text}`);
        }
    })
    .catch(err => {
        console.error("Fetch error:", err);
        alert("An error occurred. Try again!");
    });
}
