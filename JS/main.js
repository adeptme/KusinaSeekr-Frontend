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

// SAFETY CHECK: Only run this if the videoThumbnail exists on this page
if (videoThumbnail && videoModal && closeModal) {
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
}

//for saving recipe  
document.querySelectorAll(".save-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    alert("Recipe saved!");
  });
});

// --- SEARCH PAGE TOGGLE LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    // IDs matching your HTML
    const btnRecipe = document.getElementById('recipeToggle');
    const btnIngredient = document.getElementById('ingredientToggle');
    
    // IDs matching the new HTML containers
    const recipeView = document.getElementById('recipe-view');
    const ingredientView = document.getElementById('ingredient-view');
    
    // The results section to show/hide
    const resultsSection = document.querySelector('.search-results');

    // Only run if the buttons exist
    if (btnRecipe && btnIngredient) {
        
        btnRecipe.addEventListener('click', () => {
            // 1. Visual Toggle
            btnRecipe.classList.add('active');
            btnIngredient.classList.remove('active');

            // 2. View Toggle
            if (recipeView && ingredientView) {
                recipeView.style.display = 'block';
                ingredientView.style.display = 'none';
            }
            
            // Show results for recipe search
            if (resultsSection) resultsSection.style.display = 'block';
        });

        btnIngredient.addEventListener('click', () => {
            // 1. Visual Toggle
            btnIngredient.classList.add('active');
            btnRecipe.classList.remove('active');

            // 2. View Toggle
            if (recipeView && ingredientView) {
                recipeView.style.display = 'none';
                ingredientView.style.display = 'block';
            }
            
            // Hide results initially for ingredient search
            if (resultsSection) resultsSection.style.display = 'none';
        });
    }
});