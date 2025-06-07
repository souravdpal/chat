window.addEventListener('DOMContentLoaded', () => {
  const loadingBar = document.querySelector('.loading-bar');
  const loadingMessage = document.querySelector('.loading-message');

  if (loadingBar && loadingMessage) {
    // Start animation
    loadingBar.classList.add('animate');

    // After animation (3 seconds), show the redirect message
    setTimeout(() => {
      loadingMessage.classList.add('redirecting');
      if(localStorage.getItem('user')===null||undefined){
        window.location.href = '/login';
      }else{
        window.location.href='/home'
      }
    }, 3000);
  }
});