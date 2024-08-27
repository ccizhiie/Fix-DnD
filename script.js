// script.js

// Get the modal
const modal = document.getElementById("modal");

// Get the close button
const closeModal = document.getElementById("close-modal");

// Show the modal (for demonstration, you can replace this with your own trigger)
window.onload = () => {
  modal.style.display = "block";
}

// When the user clicks on the close button, close the modal
closeModal.onclick = () => {
  modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = (event) => {
  if (event.target === modal) {
    modal.style.display = "none";
  }
}
