let info = async () => {
    const userInput = document.getElementById('user').value.trim();
    const password = document.getElementById('key').value.trim();

    if (!userInput || !password) {
        alert("You can't leave fields empty! Please fill in the details.");
        return;
    }

    const credentials = {
        user_log: userInput,
        key_log: password
    };

    try {
        const response = await fetch('/cred', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });

        const data = await response.json();

        if (!response.ok) {
            return alert(`Login failed: ${data.message || "Invalid credentials."}`);
        }

        const { name, user } = data;

        // Save to localStorage
        localStorage.setItem('name', name);
        localStorage.setItem('user', user);

        alert(`${name}, welcome!`);
        window.location.href = "home.html";

    } catch (error) {
        console.error('Login error:', error);
        alert("Network error. Please try again.");
    }
};
