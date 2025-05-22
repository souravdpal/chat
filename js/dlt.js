const user_rm = () => {
  const storedUser = localStorage.getItem("user");

  const confirmationPrompt = prompt("Do you really want to delete your account? Type 'yes' to continue.");
  if (!confirmationPrompt || confirmationPrompt.trim().toLowerCase() !== "yes") {
    alert("Account deletion cancelled.");
    return;
  }

  const usernameConfirmation = prompt(`Enter your username to confirm deletion:`);
  if (usernameConfirmation && usernameConfirmation.trim() === storedUser) {
    fetch(`/dl/${storedUser}`,{
        method : 'DELETE',
    })
      .then((res) => {
        if (res.ok) {
          alert("Account deleted!");
          localStorage.removeItem("user"); // Optional: clean up local storage
          window.location.href = "/";
        } else {
          alert("Server error occurred. Please try again.");
        }
      })
      .catch((err) => {
        console.error("Error deleting account:", err);
        alert("Something went wrong. Please try again.");
      });
  } else {
    alert("Username does not match. Deletion cancelled.");
  }
};
