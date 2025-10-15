function gotologinpage(){
    window.location.href = "login.html"
}

function gotosignup(){
    window.location.href = "signup.html"
}

// Video modal function
const videoThumbnail = document.getElementById('videoThumbnail');
const videoModal = document.getElementById('videoModal');
const closeModal = document.querySelector('.close-modal');

videoThumbnail.addEventListener('click', () => {
  videoModal.style.display = 'flex';
});

closeModal.addEventListener('click', () => {
  videoModal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  if (e.target === videoModal) {
    videoModal.style.display = 'none';
  }
});

//for saving recipe  

document.querySelectorAll(".save-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    alert("Recipe saved!");
  });
});


//for search ingeredients

