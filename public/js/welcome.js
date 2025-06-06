window.addEventListener('DOMContentLoaded', () => {
  const loadingBar = document.querySelector('.loading-bar');
  const loadingMessage = document.querySelector('.loading-message');

  if (loadingBar && loadingMessage) {
    // Start animation
    loadingBar.classList.add('animate');

    // After animation (3 seconds), show the redirect message
    setTimeout(() => {
      loadingMessage.classList.add('redirecting');
      window.location.href = '/login';
    }, 3000);
  }
});