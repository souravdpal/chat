document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM is fully loaded and parsed');

    let login = async () => {
        console.log("clicked submit button");

        let dash = await fetch('/json/user_data.json');
        let json = await dash.json();
        let user1 = document.getElementById('user').value;
        let key1 = document.getElementById('key').value;

        // Check if user is valid
        if (json.some(u => u.user === user1 && u.key === key1)) {
            console.log("User authenticated");
            window.location.href = "home.html";
        } else if (user1 === "" || key1 === "") {
            alert("Please fill out the details, you can't enter without filling them");
            console.log("Empty user details");
        } else {
            console.log("No user found in database");
            alert("Incorrect user ID or password");
        }
    }

    // Add event listener to the submit button
    document.getElementById('but').addEventListener('click', login);
});
