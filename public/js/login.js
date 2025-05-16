let info = () => {
    const user_log = document.getElementById('user').value.trim();
    const key = document.getElementById('key').value.trim();

    if (user_log === "" || key === "") {
        return alert("You can't leave fields empty! Please fill in the details.");
    }

    const cred = {
        user_log: user_log,
        key_log: key
    };

    fetch('/cred', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(cred)
    }).then(async response => {
        const data = await response.text();
    
        if (response.ok) {
            try {
                let name = data;
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
    }).catch(error => {
        console.error('Fetch error:', error);
        alert("Network error occurred. Please try again.");
    });
}