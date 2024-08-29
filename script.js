document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('modal');
  const closeModal = document.getElementById('close-modal');
  const cancelButton = document.querySelector('.join-modal-button-left');
  const enterButton = document.querySelector('.join-modal-button-right');

  // Show the modal when the page loads
  window.onload = () => {
    modal.style.display = "block";
  };

  // Close the modal when the close button is clicked
  closeModal.addEventListener('click', function() {
    modal.style.display = 'none';
  });

  // Close the modal when the cancel button is clicked
  cancelButton.addEventListener('click', function() {
    window.location.href = 'main.html';
  });

  // Redirect to 'loby.html' when the enter button is clicked
  enterButton.addEventListener('click', function() {
    window.location.href = 'loby.html';
  });

  // Close the modal if the user clicks outside of it
  window.addEventListener('click', function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
});

document.addEventListener('DOMContentLoaded', function() {
  const leaveButton = document.querySelector('.loby-modal-button-leave');
  const readyButton = document.querySelector('.loby-modal-button-ready');

  leaveButton.addEventListener('click', function() {
    window.location.href = 'main.html'; // Redirect to main.html
  });

  readyButton.addEventListener('click', function() {
    window.location.href = 'character.html'; // Redirect to game.html
  });
});
