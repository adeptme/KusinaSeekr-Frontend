const BACKEND_URL = "http://127.0.0.1:5000";

const SUPABASE_URL = 'https://qhytblgdgrwmxknjpopr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoeXRibGdkZ3J3bXhrbmpwb3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5ODgwODAsImV4cCI6MjA3NTU2NDA4MH0.JKm01-hSn5mF7GVYH197j7OICSnXy-0mHExJDKhG-EU';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const TUTORIAL_BUCKET = 'comm-media'; // Confirming bucket name
let allRecipesData = [];


document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Auth Check (Only if not on login/signup pages)
    if (!document.getElementById('loginForm') && !document.getElementById('signupForm')) {
        checkAuth();
    }

    // 2. Load Data
    await loadRecipes();     
    loadSearchPageRecipes(); 
    loadRecipeDetails();
    
    loadUserProfile()

    loadTutorialCards();
    loadTutorialDetails();
    setupVideoModal();
    loadSearchPageTutorials();
    
    // 3. Initialize UI Toggles
    if (typeof initSearchToggle === "function") {
        initSearchToggle();
    }
    
    // 4. Initialize Filters
    if (typeof setupFilters === "function") {
        setupFilters();
    }

    // 🟢 5. INGREDIENT SEARCH LISTENER (New!)
    const ingForm = document.getElementById('ingredientSearchForm');
    const btnAdd = document.getElementById('btnAddIng');

    if (ingForm) {
        console.log("✅ Ingredient Form Found!"); 
        
        ingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputVal = document.getElementById('ingInput').value;
            console.log("--- STARTING INGREDIENT SEARCH ---");

            if (!inputVal.trim()) {
                alert("Please enter ingredients!");
                return;
            }
            console.log("Searching for:", inputVal);
            await searchByIngredients(inputVal);
        });
    }

    // Make the "Add" button trigger the search immediately
    if (btnAdd && ingForm) {
        btnAdd.addEventListener('click', () => {
            // Trigger the form submit manually
            ingForm.dispatchEvent(new Event('submit'));
        });
    }
});

async function searchByIngredients(ingredientString) {
    const container = document.getElementById('results-section');
    
    if (!container) {
        console.error("❌ Error: Could not find element with ID 'results-section'");
        return;
    }

    console.log("🔍 Searching for:", ingredientString);

    container.style.display = 'grid'; 
    container.style.opacity = '1'; // Just in case it was faded out

    container.innerHTML = '<p style="text-align:center; width:100%; grid-column: span 3;">Searching...</p>';

    try {
        const response = await fetch(`${BACKEND_URL}/feature/search-by-ing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ingredients: ingredientString })
        });

        const data = await response.json();
        console.log("✅ Backend Response:", data); // Check this in console!

        container.innerHTML = ''; 

        if (!response.ok || !data.recipes || data.recipes.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; width:100%; grid-column: span 3;">
                    <h3>No recipes found 😔</h3>
                    <p>Try searching for "Chicken" or "Pork"</p>
                </div>`;
            return;
        }

        data.recipes.forEach(recipe => {
            // Use the helper function to build HTML
            // Ensure you are passing the correct link prefix for where your HTML file is located
            const cardHTML = buildCardHTML(recipe, 'details page/', 's-recipe-card', 's-info', 's-meta', 's-tag', 's-btn');
            container.innerHTML += cardHTML;
        });

    } catch (error) {
        console.error("❌ Search error:", error);
        container.innerHTML = '<p style="text-align:center; width:100%;">Something went wrong. Check console.</p>';
    }
}

// --- A. Homepage Loader ---
async function loadRecipes() {
    const container = document.getElementById('recipeContainer');
    if (!container) return; 

    try {
        const response = await fetch(`${BACKEND_URL}/feature/recipes`);
        const recipes = await response.json();
        
        // 🟢 Store data globally for filtering
        allRecipesData = recipes;

        // Render the first 3 (Default view)
        renderCards(recipes.slice(0, 3), container, 'search/details page/');

    } catch (error) {
        console.error("Error loading home recipes:", error);
        container.innerHTML = '<p>Error loading recipes.</p>';
    }
}

// --- B. Search Page Loader ---
async function loadSearchPageRecipes() {
    const container = document.getElementById('results-section');
    if (!container) return; 

    try {
        const response = await fetch(`${BACKEND_URL}/feature/recipes`);
        const recipes = await response.json();
        
        // 🟢 Store data globally
        allRecipesData = recipes;

        // Render ALL recipes
        renderCards(recipes, container, 'details page/', 's-recipe-card', 's-info', 's-meta', 's-tag', 's-btn');

    } catch (error) {
        console.error("Error loading search recipes:", error);
    }
}

// --- 🟢 NEW: Reusable Render Function ---
function renderCards(recipesList, container, linkPrefix, cardClass='recipe-card', infoClass='recipe-info', metaClass='recipe-meta', tagClass='tag', btnClass='view-btn') {
    container.innerHTML = ''; 

    if (recipesList.length === 0) {
        container.innerHTML = '<p style="text-align:center; width:100%;">No recipes found for this category.</p>';
        return;
    }

    recipesList.forEach(recipe => {
        let imagePath = 'https://placehold.co/400x300?text=No+Image';
        if (recipe.main_image) {
            const { data } = supabaseClient.storage.from('recipe-images').getPublicUrl(recipe.main_image); 
            imagePath = data.publicUrl;
        }

        const cardHTML = `
            <div class="${cardClass}">
                <img src="${imagePath}" alt="${recipe.title}" style="width:100%; height:200px; object-fit:cover;" onerror="this.src='https://placehold.co/400x300?text=Image+Error'">
                <div class="${infoClass}">
                    <h3>${recipe.title}</h3>
                    <p>${recipe.subtitle || recipe.description || ''}</p>
                    <div class="${metaClass}">
                        <span class="${tagClass}">${recipe.category}</span>
                        <span>⏱ ${recipe.cook_time}</span>
                    </div>
                    <a href="${linkPrefix}recipePage.html?id=${recipe.recipe_id}" class="${btnClass}">View Recipe</a>
                </div>
            </div>
        `;
        container.innerHTML += cardHTML;
    });
}

function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter');
    const container = document.getElementById('recipeContainer');

    if (!filterButtons.length || !container) return;

    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();

            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const categoryToFilter = btn.innerText.trim(); // Get button text (e.g., "Main Dishes")
            
            let filteredList = [];

            if (categoryToFilter === 'All') {
                filteredList = allRecipesData.slice(0, 3);
            } else {
                filteredList = allRecipesData.filter(recipe => {
                    const dbCat = recipe.category.toLowerCase(); // "main dish"
                    const btnCat = categoryToFilter.toLowerCase(); // "main dishes"
                    
                    return dbCat.includes(btnCat) || btnCat.includes(dbCat);
                });
            }
            renderCards(filteredList, container, 'search/details page/');
        });
    });
}


async function loadRecipeDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('id');
    if (!recipeId || !document.getElementById('detail-title')) return;
    try {
        const response = await fetch(`${BACKEND_URL}/feature/recipes/${recipeId}`);
        if (!response.ok) throw new Error("Recipe not found");
        const recipe = await response.json();
        document.getElementById('detail-title').innerText = recipe.title;
        document.getElementById('detail-desc').innerText = recipe.description || recipe.subtitle;
        if(document.getElementById('detail-time')) document.getElementById('detail-time').innerText = recipe.cook_time;
        if(document.getElementById('detail-servings')) document.getElementById('detail-servings').innerText = (recipe.servings || '--') + " servings";
        let imagePath = 'https://placehold.co/1000x500?text=No+Image';
        if (recipe.main_image) {
            const { data } = supabaseClient.storage.from('recipe-images').getPublicUrl(recipe.main_image);
            imagePath = data.publicUrl;
        }
        document.getElementById('detail-image').src = imagePath;
        parseList(recipe.ingredients_list, 'detail-ingredients', 'ingredient');
        parseList(recipe.cooking_steps, 'detail-steps', 'step');
    } catch (error) { console.error("Error loading details:", error); }
}

function parseList(jsonString, elementId, type) {
    const container = document.getElementById(elementId);
    if(!container) return;
    container.innerHTML = '';
    try {
        const items = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
        if (Array.isArray(items) && items.length > 0) {
            items.forEach(item => {
                const li = document.createElement('li');
                if (type === 'ingredient') {
                    li.innerHTML = `<strong>${item.amount || ''}</strong> ${item.name} ${item.notes ? `(${item.notes})` : ''}`;
                } else { li.innerHTML = `<p>${item.instruction}</p>`; }
                container.appendChild(li);
            });
        } else { container.innerHTML = '<li>No items listed.</li>'; }
    } catch (e) { container.innerHTML = `<li>${jsonString || 'Data error'}</li>`; }
}

async function checkAuth() {
    console.log("Checking login status...");
    try {
        const response = await fetch(`${BACKEND_URL}/auth/profile`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include' // 🟢 Sends the cookie
        });

        if (response.ok) {
            const userData = await response.json();
            console.log("User logged in:", userData.username);

            // 🟢 UI UPDATE: Find the "Log In" button
            const loginBtn = document.querySelector('.lg-button');
            
            if (loginBtn) {
                // 1. Change the text
                loginBtn.innerText = "Log Out";
                
                // 2. Change the style (Optional - make it distinct)
                // loginBtn.style.backgroundColor = "#555"; 

                // 3. Stop it from going to login.html
                loginBtn.href = "#"; 
                
                // 4. Add Logout Functionality
                loginBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    logoutUser();
                });
            }
        }
    } catch (error) {
        console.log("Guest user (staying as guest)");
    }
}

function logoutUser() {
    if (!confirm("Are you sure you want to log out?")) return;

    document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    alert("Logged out successfully!");
    window.location.reload(); 
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = document.querySelector('button[type="submit"]');
        if(submitBtn) { submitBtn.innerText = "Verifying..."; submitBtn.disabled = true; }
        try {
            const response = await fetch(`${BACKEND_URL}/auth/login`, {
                method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (response.ok) { window.location.href = '2fa.html'; } else { alert(data.message || "Login failed"); }
        } catch (error) { alert("Could not connect to the backend."); } finally { if(submitBtn) { submitBtn.innerText = "Log In"; submitBtn.disabled = false; } }
    });
}

function initSearchToggle() {
    const btnRecipe = document.getElementById('btn-recipe');
    const btnIngredient = document.getElementById('btn-ingredient');
    
    const recipeView = document.getElementById('recipe-view');
    const ingredientView = document.getElementById('ingredient-view');
    const resultsSection = document.getElementById('results-section');

    // Safety check: Only run if elements exist (i.e. we are on the Search Page)
    if (btnRecipe && btnIngredient && recipeView && ingredientView) {
        
        // 1. CLICK RECIPE SEARCH
        btnRecipe.addEventListener('click', (e) => {
            e.preventDefault(); // Stop page reload
            console.log("Switched to Recipe Search");

            // Visuals
            btnRecipe.classList.add('active');
            btnIngredient.classList.remove('active');

            // Visibility
            recipeView.style.display = 'block';
            ingredientView.style.display = 'none';
            
            // Show results again if they were hidden
            if(resultsSection) resultsSection.style.display = 'grid';
        });

        // 2. CLICK INGREDIENT SEARCH
        btnIngredient.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Switched to Ingredient Search");

            // Visuals
            btnIngredient.classList.add('active');
            btnRecipe.classList.remove('active');

            // Visibility
            recipeView.style.display = 'none';
            ingredientView.style.display = 'block';
            
            // Hide results initially (clean slate)
            if(resultsSection) resultsSection.style.display = 'none';
        });
    }
}

const recipeSearchForm = document.getElementById('recipeSearchForm');

if (recipeSearchForm) {
    recipeSearchForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Stop page reload
        
        const query = document.getElementById('recipeSearchInput').value;
        await searchByTitle(query);
    });
}

async function searchByTitle(titleQuery) {
    const container = document.getElementById('results-section');
    if (!container) return;

    container.innerHTML = '<p style="text-align:center; width:100%;">Searching...</p>';

    try {
        // Send POST to backend
        const response = await fetch(`${BACKEND_URL}/feature/search-by-title`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: titleQuery })
        });

        const data = await response.json();
        container.innerHTML = ''; // Clear loading message

        // Handle "No Results"
        if (!response.ok || !data.recipes || data.recipes.length === 0) {
            container.innerHTML = '<p style="text-align:center; width:100%;">No recipes found.</p>';
            return;
        }

        // Render the results
        data.recipes.forEach(recipe => {
            // Use our helper to build the card
            // Note: 'details page/' path assumes we are on the search page
            const cardHTML = buildCardHTML(recipe, 'details page/', 's-recipe-card', 's-info', 's-meta', 's-tag', 's-btn');
            container.innerHTML += cardHTML;
        });

    } catch (error) {
        console.error("Search error:", error);
        container.innerHTML = '<p>Error performing search.</p>';
    }
}

function buildCardHTML(recipe, linkPrefix, cardClass='recipe-card', infoClass='recipe-info', metaClass='recipe-meta', tagClass='tag', btnClass='view-btn') {
    let imagePath = 'https://placehold.co/400x300?text=No+Image';
    
    // Check if recipe has an image and fetch from Supabase
    if (recipe.main_image) {
        // Ensure supabaseClient is defined at the top of your file!
        const { data } = supabaseClient
            .storage
            .from('recipe-images') 
            .getPublicUrl(recipe.main_image); 
        imagePath = data.publicUrl;
    }

    // Return the HTML string
    return `
        <div class="${cardClass}">
            <img src="${imagePath}" alt="${recipe.title}" style="width:100%; height:200px; object-fit:cover;" onerror="this.src='https://placehold.co/400x300?text=Image+Error'">
            
            <div class="${infoClass}">
                <h3>${recipe.title}</h3>
                <p>${recipe.subtitle || recipe.description || ''}</p>
                
                <div class="${metaClass}">
                    <span class="${tagClass}">${recipe.category}</span>
                    <span>⏱ ${recipe.cook_time}</span>
                </div>
                
                <a href="${linkPrefix}recipePage.html?id=${recipe.recipe_id}" class="${btnClass}">View Recipe</a>
            </div>
        </div>
    `;
}

async function loadCommunityFeed() {
    const container = document.getElementById('community-feed-container');
    if (!container) return; 

    try {
        const response = await fetch(`${BACKEND_URL}/feature/forums/home`);
        
        if (response.status === 404 || (response.status === 200 && (await response.clone().json()).message)) {
            container.innerHTML = '<p style="text-align:center; padding:20px;">No posts yet. Be the first to share!</p>';
            return;
        }

        const posts = await response.json();
        container.innerHTML = '';

        posts.forEach(post => {
            const avatar = post.author_avatar || '../Page/images/chef-avatar.jpg'; 
            
            // 🟢 CLEAN HTML (No style="..." tags anymore!)
            const postHTML = `
                <div class="feed-card">
                    <div class="post-header">
                        <img src="${avatar}" class="user-avatar-sm" alt="User" onerror="this.src='https://placehold.co/50?text=User'">
                        <div class="poster-info">
                            <h4>${post.author_name}</h4>
                            <span>${post.created_at}</span>
                        </div>
                    </div>
                    
                    <div class="post-title">
                        ${post.content}
                    </div>

                    <div class="post-footer-line">
                        <button onclick="toggleLike('${post.post_id}')" class="action-icon-btn">
                            <i class="fas fa-heart"></i> 
                            <span>${post.likes} Likes</span>
                        </button>
                    </div>
                </div>
            `;
            container.innerHTML += postHTML;
        });

    } catch (error) {
        console.error("Feed error:", error);
    }
}

const btnCreatePost = document.getElementById('btn-create-post');
if (btnCreatePost) {
    btnCreatePost.addEventListener('click', async () => {
        const content = document.getElementById('new-post-content').value;
        if (!content.trim()) return alert("Please write something!");

        try {
            const response = await fetch(`${BACKEND_URL}/feature/forums/create-post`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // 🟢 Sends the Cookie
                body: JSON.stringify({ post_content: content })
            });

            // 🟢 SECURITY CHECK: 401 means "Not Logged In"
            if (response.status === 401) {
                alert("You must be logged in to post!");
                window.location.href = "../Page/login.html"; // Adjust path if needed
                return;
            }

            if (response.ok) {
                alert("Posted successfully!");
                document.getElementById('new-post-content').value = ''; // Clear input
                loadCommunityFeed(); // Refresh feed
            } else {
                alert("Failed to post.");
            }

        } catch (error) {
            console.error("Post error:", error);
        }
    });
}

async function toggleLike(postId) {
    try {
        const response = await fetch(`${BACKEND_URL}/feature/forums/create-post/${postId}/like`, {
            method: 'POST',
            credentials: 'include' // 🟢 Sends the Cookie
        });

        if (response.status === 401) {
            alert("Please log in to like posts.");
            window.location.href = "../Page/login.html";
            return;
        }

        if (response.ok) {
            // Reload feed to show new like count
            // (In a pro app, we would update just the number to be faster)
            loadCommunityFeed();
        } else {
            alert("You already liked this (or error occurred).");
        }

    } catch (error) {
        console.error("Like error:", error);
    }
}

// 🟢 ADD TO MAIN EVENT LISTENER
document.addEventListener('DOMContentLoaded', async () => {
    // ... existing loaders ...
    loadCommunityFeed(); // Load the community page
});

let selectedFile = null; // Stores the file user picked
let selectedType = null; // 'image' or 'video'

// 1. Setup File Inputs
const btnPhoto = document.getElementById('btn-photo');
const btnVideo = document.getElementById('btn-video');
const inputPhoto = document.getElementById('file-input-photo');
const inputVideo = document.getElementById('file-input-video');
const previewArea = document.getElementById('media-preview');
const fileNameDisplay = document.getElementById('file-name');
const clearMediaBtn = document.getElementById('clear-media');

if (btnPhoto && btnVideo) {
    // Trigger Hidden Inputs
    btnPhoto.addEventListener('click', () => inputPhoto.click());
    btnVideo.addEventListener('click', () => inputVideo.click());

    // Handle Image Selection
    inputPhoto.addEventListener('change', (e) => handleFileSelect(e, 'image'));
    inputVideo.addEventListener('change', (e) => handleFileSelect(e, 'video'));

    // Clear Selection
    clearMediaBtn.addEventListener('click', () => {
        selectedFile = null;
        selectedType = null;
        previewArea.style.display = 'none';
        inputPhoto.value = ''; // Reset inputs
        inputVideo.value = '';
    });
}

function handleFileSelect(e, type) {
    if (e.target.files.length > 0) {
        selectedFile = e.target.files[0];
        selectedType = type;
        
        // Show Preview Text
        previewArea.style.display = 'block';
        fileNameDisplay.innerText = `${type.toUpperCase()}: ${selectedFile.name}`;
    }
}

/* reuse existing btnCreatePost variable declared earlier */
if (btnCreatePost) {
    btnCreatePost.addEventListener('click', async () => {
        const content = document.getElementById('new-post-content').value;
        if (!content.trim() && !selectedFile) return alert("Please write something or attach media!");

        // Disable button while uploading
        const originalText = btnCreatePost.innerHTML;
        btnCreatePost.innerHTML = "Posting...";
        btnCreatePost.disabled = true;

        try {
            let mediaData = null;

            // A. Upload to Supabase if file exists
            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `community/${Date.now()}.${fileExt}`; // Unique name

                const { data, error } = await supabaseClient
                    .storage
                    .from('recipe-images') // Storing in same bucket for now
                    .upload(fileName, selectedFile);

                if (error) throw error;

                // Get Public URL
                const { data: urlData } = supabaseClient
                    .storage
                    .from('recipe-images')
                    .getPublicUrl(fileName);

                // Create the JSON object for the database
                mediaData = {
                    type: selectedType, // 'image' or 'video'
                    url: urlData.publicUrl
                };
            }

            // B. Send to Backend
            const response = await fetch(`${BACKEND_URL}/feature/forums/post`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                    post_content: content,
                    media: mediaData // Sending the JSON object
                })
            });

            if (response.status === 401) {
                alert("You must be logged in to post!");
                window.location.href = "login.html";
                return;
            }

            if (response.ok) {
                alert("Posted successfully!");
                document.getElementById('new-post-content').value = '';
                document.getElementById('clear-media').click(); // Reset file
                loadCommunityFeed(); // Refresh feed
            } else {
                alert("Failed to post.");
            }

        } catch (error) {
            console.error("Post error:", error);
            alert("Error posting (Check console)");
        } finally {
            btnCreatePost.innerHTML = originalText;
            btnCreatePost.disabled = false;
        }
    });
}

// --- SETTINGS PAGE LOGIC ---
// Select forms inside settings page
const settingsForms = document.querySelectorAll('.settings-form');

settingsForms.forEach(form => {
    form.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent actual submission
        alert("Changes saved successfully!");
        // Optional: Clear password fields after save
        const passInputs = form.querySelectorAll('input[type="password"]');
        passInputs.forEach(input => input.value = "");
    });
});



const ingredientSearchForm = document.getElementById('ingredientSearchForm');

if (ingredientSearchForm) {
    ingForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Stop page reload
        
        // 1. Get the text directly from the input box
        const inputVal = document.getElementById('ingredientSearchInput').value;
        
        // 2. Validate
        if (!inputVal || inputVal.trim() === '') {
            alert("Please enter an ingredient (e.g. Chicken)!");
            return;
        }

        // 3. Run the search
        // The backend expects comma-separated text like "chicken, garlic"
        console.log("Searching for:", inputVal);
        await searchByIngredients(inputVal);
    });
}

window.runIngredientSearch = async function() {
    console.log("🟢 Manual Search Triggered");
    
    const input = document.getElementById('ingInput');
    if (!input) {
        alert("Error: Input box not found!");
        return;
    }
    
    const value = input.value.trim();
    if (!value) {
        alert("Please enter ingredients (e.g. Chicken, Garlic)!");
        return;
    }
    
    // Call the existing logic
    await searchByIngredients(value);
}

// Ensure the Enter key also works
window.handleEnterKey = function(event) {
    if (event.key === "Enter") {
        event.preventDefault(); // Stop form submit
        window.runIngredientSearch(); // Run search
    }
}

async function loadUserProfile() {
    // Stop if we are not on the profile page
    if (!document.getElementById('profile-name')) return;

    try {
        // A. GET USER INFO
        const userResponse = await fetch(`${BACKEND_URL}/auth/profile`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (!userResponse.ok) {
            // Not logged in? Send to login page
            window.location.href = "login.html"; 
            return;
        }

        const user = await userResponse.json();

        // B. UPDATE HTML
        document.getElementById('profile-name').innerText = user.username || "Chef";
        document.getElementById('profile-bio').innerText = user.bio || "No bio yet. Start cooking!";
        
        // Handle Avatar (Supabase or Local)
        const avatarImg = document.getElementById('profile-avatar');
        if (user.avatar_url) {
            if (user.avatar_url.startsWith('http') || user.avatar_url.startsWith('../')) {
                avatarImg.src = user.avatar_url;
            } else {
                // Fetch from Supabase Bucket
                const { data } = supabaseClient.storage.from('recipe-images').getPublicUrl(user.avatar_url);
                avatarImg.src = data.publicUrl;
            }
        }

        // C. GET USER POSTS
        loadUserPosts(user.user_id);

    } catch (error) {
        console.error("Profile load error:", error);
    }
}

async function loadUserPosts(userId) {
    const container = document.getElementById('profile-posts-container');
    if (!container) return;

    try {
        const response = await fetch(`${BACKEND_URL}/feature/forums/user/${userId}`);
        const data = await response.json();

        container.innerHTML = '';

        if (!response.ok || !data.posts || data.posts.length === 0) {
            container.innerHTML = '<p style="width:100%; text-align:center;">No posts yet.</p>';
            return;
        }

        data.posts.forEach(post => {
            // Reusing your Search Card Style for simplicity
            const dateStr = new Date(post.created_at).toLocaleDateString();
            
            const cardHTML = `
                <div class="s-recipe-card">
                    <img src="https://placehold.co/400x300?text=My+Post" style="object-fit:cover;">
                    
                    <div class="s-info">
                        <h3>Community Post</h3>
                        <p>${post.content.substring(0, 50)}...</p>
                        
                        <div class="s-meta">
                            <span class="s-tag">Discussion</span>
                            <span>${dateStr}</span>
                        </div>
                        
                        <a href="community.html" class="s-btn">View in Community</a>
                    </div>
                </div>
            `;
            container.innerHTML += cardHTML;
        });

    } catch (error) {
        console.error("Error loading posts:", error);
    }
}

const CORRECT_BUCKET_NAME = 'recipe-images'; // Adjust as needed
async function loadTutorialCards() {
    const container = document.getElementById('tutorialContainer');
    if (!container) return; 

    try {
        const response = await fetch(`${BACKEND_URL}/feature/tutorials`);
        const tutorials = await response.json();

        container.innerHTML = ''; 

        if (tutorials.length === 0) {
            container.innerHTML = '<p>No tutorials available right now.</p>';
            return;
        }

        tutorials.slice(0,3).forEach(tutorial => {
            let thumbnailPath = 'https://placehold.co/400x250?text=Tutorial';

            if (tutorial.thumbnail) {
                const { data } = supabaseClient
                    .storage
                    .from('comm-media') // ✅ Correct bucket
                    .getPublicUrl(tutorial.thumbnail); 
                
                thumbnailPath = data.publicUrl;
                
                // 🟢 DEBUG: Print the link to the console
                console.log(`Tutorial: ${tutorial.title}`);
                console.log(`DB Filename: ${tutorial.thumbnail}`);
                console.log(`Generated URL: ${thumbnailPath}`);
            }

            const cardHTML = `
                <div class="home-tutorial-card" 
                    onclick="window.location.href='search/details page/tutorialPage.html?id=${tutorial.tutorial_id}'">
                    
                    <img src="${thumbnailPath}" alt="${tutorial.title}" onerror="this.src='https://placehold.co/400x250?text=Error'">
                    
                    <div class="tut-content">
                        <h3>${tutorial.title}</h3>
                        <p>${tutorial.subtitle || ''}</p>
                        <div class="tut-time"><span>▶ ${tutorial.duration} tutorial</span></div>
                    </div>
                </div>
            `;
            container.innerHTML += cardHTML;
        });

    } catch (error) {
        console.error("Tutorial load error:", error);
        container.innerHTML = '<p>Error loading tutorials.</p>';
    }
}

async function loadTutorialDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const tutorialId = urlParams.get('id');

    if (!tutorialId || !document.getElementById('tutorial-title')) return;

    try {
        const response = await fetch(`${BACKEND_URL}/feature/tutorials/${tutorialId}`);
        
        if (!response.ok) throw new Error("Tutorial not found");

        const tutorial = await response.json();

        // 🟢 FIX: Use 'thumbnail' to match the backend
        let thumbnailPath = 'https://placehold.co/1000x500?text=No+Image';
        
        if (tutorial.thumbnail) { 
            const { data } = supabaseClient
                .storage
                .from(TUTORIAL_BUCKET)
                .getPublicUrl(tutorial.thumbnail); 
            thumbnailPath = data.publicUrl;
        }
        
        // Update HTML Elements
        const imgElement = document.getElementById('tutorial-thumbnail');
        if (imgElement) {
            imgElement.src = thumbnailPath;
            imgElement.onerror = null; // Stop loop if error
        }

        document.getElementById('tutorial-title').innerText = tutorial.title;
        document.getElementById('tutorial-subtitle').innerText = tutorial.subtitle || '';
        document.getElementById('tutorial-time').innerText = tutorial.duration || "-- min";
        
        // Update Video
        const videoFrame = document.getElementById('tutorial-video-frame');
        if (videoFrame && tutorial.video_url) {
            videoFrame.src = tutorial.video_url; 
        }

        // Update Content
        const contentArea = document.getElementById('tutorial-content-area');
        if (contentArea) {
             contentArea.innerHTML = `<p>${tutorial.content_steps}</p>`;
        }
        
        const contentTitle = document.getElementById('tutorial-content-title');
        if (contentTitle) contentTitle.innerText = `Mastering ${tutorial.title}`;

    } catch (error) {
        console.error("Tutorial load error:", error);
        const title = document.getElementById('tutorial-title');
        if(title) title.innerText = "Tutorial Not Found";
    }
}

function setupVideoModal() {
    const modal = document.getElementById("videoModal");
    const btn = document.getElementById("videoThumbnail"); // The container with the play button
    const closeBtn = document.getElementsByClassName("close")[0];
    const iframe = document.getElementById("tutorial-video-frame");

    if (!modal || !btn) return;

    // Open Modal
    btn.onclick = function() {
        modal.style.display = "flex";
        // specific logic to ensure video plays or loads
        const videoSrc = iframe.getAttribute('data-src') || iframe.src;
        if (videoSrc) {
            iframe.src = videoSrc;
        }
    }

    // Close Modal
    const closeModal = () => {
        modal.style.display = "none";
        // Stop video by resetting src
        iframe.src = "about:blank"; 
    }

    if (closeBtn) closeBtn.onclick = closeModal;

    // Close if clicking outside the video box
    window.onclick = function(event) {
        if (event.target == modal) {
            closeModal();
        }
    }
}


async function loadSearchPageTutorials() {
    const container = document.getElementById('tutorialResultsContainer');
    if (!container) return;

    try {
        const response = await fetch(`${BACKEND_URL}/feature/tutorials`);
        const tutorials = await response.json();

        renderTutorialCards(tutorials, container);

    } catch (error) {
        console.error("Error loading tutorials:", error);
        container.innerHTML = '<p>Error loading content.</p>';
    }
}

async function searchTutorials(query) {
    const container = document.getElementById('tutorialResultsContainer');
    if (!container) return;

    container.innerHTML = '<p style="text-align:center;">Searching...</p>';

    try {
        // Use the search route you defined in Python
        const response = await fetch(`${BACKEND_URL}/feature/tutorials/search/${query}`);
        const tutorials = await response.json();

        if (tutorials.message || tutorials.length === 0) {
            container.innerHTML = '<p style="text-align:center;">No tutorials found.</p>';
            return;
        }

        renderTutorialCards(tutorials, container);

    } catch (error) {
        console.error("Search error:", error);
    }
}

// Helper to draw the cards (Reused by both functions above)
function renderTutorialCards(list, container) {
    container.innerHTML = '';
    
    if (list.length === 0) {
        container.innerHTML = '<p>No tutorials found.</p>';
        return;
    }

    list.forEach(tutorial => {
        let thumbnailPath = 'https://placehold.co/400x250?text=Tutorial';
        
        // Check 'thumbnail' to match your DB column name
        if (tutorial.thumbnail) {
            const { data } = supabaseClient
                .storage
                .from(TUTORIAL_BUCKET)
                .getPublicUrl(tutorial.thumbnail); 
            thumbnailPath = data.publicUrl;
        }

        const cardHTML = `
            <div class="tutorial-card" onclick="window.location.href='details page/tutorialPage.html?id=${tutorial.tutorial_id}'">
                <div class="tutorial-img-wrap">
                    <img src="${thumbnailPath}" alt="${tutorial.title}" onerror="this.src='https://placehold.co/400x250?text=Error'">
                    <div class="play-icon">▶</div>
                </div>
                <div class="tutorial-details">
                    <h3>${tutorial.title}</h3>
                    <p>${tutorial.subtitle || ''}</p>
                </div>
            </div>
        `;
        container.innerHTML += cardHTML;
    });
}

// 🟢 CONNECT THE SEARCH BAR
const tutorialSearchForm = document.getElementById('tutorialSearchForm');
if (tutorialSearchForm) {
    tutorialSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('tutorialSearchInput').value;
        if (query.trim()) {
            searchTutorials(query);
        } else {
            loadSearchPageTutorials(); // Reload all if empty
        }
    });
}
