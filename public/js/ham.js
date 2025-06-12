document.addEventListener('DOMContentLoaded', () => {
  const hamburgerBtn = document.getElementById('hamburger-toggle');
  const navLinksContainer = document.querySelector('.nav-links-container');

  if (hamburgerBtn && navLinksContainer) {
    hamburgerBtn.addEventListener('click', () => {
      console.log('Hamburger clicked, toggling menu'); // Debug log
      hamburgerBtn.classList.toggle('active');
      navLinksContainer.classList.toggle('open');
    });

    // Close menu when clicking a nav link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburgerBtn.classList.remove('active');
        navLinksContainer.classList.remove('open');
      });
    });
  } else {
    console.error('Hamburger button or nav-links-container not found');
  }
});