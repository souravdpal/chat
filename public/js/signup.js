document.getElementById("btn").addEventListener("click", () => {
    let user = document.getElementById("user").value.trim();
    let name = document.getElementById('name').value.trim();
    let key = document.getElementById('key').value.trim();
    let rekey = document.getElementById('rekey').value.trim();

    if (user == "" || name == "" || key == "" || rekey == "" || key.length < 6 || key != rekey) {
        alert("Please fill out all details and password must be 6 characters!");
    }

    if (key == rekey) {
        let data = {
            user: user,
            name: name,
            key: key
        };

        fetch('/user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (response.ok) {
                alert("User registered successfully");
                window.location.href = "login.html"
            } else if(!response.ok){
                alert("Error: user maybe already exist !");
            }
        })
        .catch(error => {
            alert("Error in registering user! Please try again!");
        });
    }
});
