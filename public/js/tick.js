// Add verified users here — only YOU can update this list
const verifiedUsers = ['sourav']; // example list

function showMessage({ username, message, timestamp }) {
  const formattedTime = formatTime(new Date(timestamp));

  const isVerified = verifiedUsers.includes(username.toLowerCase());

  const nameHTML = isVerified
    ? `<span class="verified-user">${username}<i class="fas fa-badge-check"></i></span>`
    : `<span>${username}</span>`;

  const msgHTML = `
    <div class="message">
      <div><strong>${nameHTML}</strong> <small>${formattedTime}</small></div>
      <div>${message}</div>
    </div>
  `;

  ins.innerHTML += msgHTML;
}
