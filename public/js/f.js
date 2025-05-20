// Get user name from localStorage or default
let user_name = localStorage.getItem("user");

// DOM Elements
const frInput = document.getElementById("add"); // input for friend name
const addBtn = document.getElementById("add-btn"); // add friend button
const searchInput = document.getElementById("search"); // search box
const listContainer = document.getElementById("list"); // friends list container
const chatContainer = document.getElementById("chat"); // friend request/chat area
// Friends array (start empty, load from server)
let friends = [];

// Unique ID counter (will update dynamically)
let idCounter = 1;
addBtn.addEventListener('click' , ()=>{
  let fr_name = frInput.value.trim();
if(fr_name ===user_name){
  return alert(`you can't add yourself as freind`)
}else if (fr_name ==''){
  return alert(`opps! look you forgot fill freind name!`)
}


let fr_re = async () => {
  if(fr_name===''){
    return alert('empty string!')
  }
  fetch("/fr_send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: user_name,
      to: fr_name,
    })
  })
  .then(res=>res.json())
  .then((data)=>{
    alert(data.msg)
  })
  .catch(err=>{
    console.log(err)
    alert('aleart sending freind req!')

  })
};
fr_re()
})
function getInitials(name) {
  const words = name.trim().split(" ");
  return words
    .map((w) => w.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

// Render the friend list with filter
function renderList(filter = "") {
  listContainer.innerHTML = "";

  const filtered = friends.filter((f) =>
    f.name.toLowerCase().includes(filter.toLowerCase())
  );

  if (filtered.length === 0) {
    const msg = document.createElement("p");
    msg.className = "empty-message";
    msg.textContent =
      friends.length === 0 ? "No friends yet. Add some!" : "No friends found.";
    listContainer.appendChild(msg);
    return;
  }

  filtered.forEach((friend) => {
    const div = document.createElement("div");
    div.className = "friend-item";
    div.textContent = `${getInitials(friend.name)} ${friend.name}`;
    listContainer.appendChild(div);
  });
}
