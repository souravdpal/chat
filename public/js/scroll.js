document.addEventListener('DOMContentLoaded', () => {
  const chatMessages = document.querySelector('.chat-messages');
  let isUserScrolling = false;

  const scrollToBottom = () => {
    chatMessages.scrollTo({
      top: chatMessages.scrollHeight,
      behavior: 'smooth'
    });
  };

  chatMessages.addEventListener('scroll', () => {
    const isNearBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 100;
    isUserScrolling = !isNearBottom;
  });

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        if (!isUserScrolling) {
          scrollToBottom();
        }
      }
    });
  });

  observer.observe(chatMessages, { childList: true, subtree: true });

  scrollToBottom();
});