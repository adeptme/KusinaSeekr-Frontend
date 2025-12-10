const BACKEND_URL = "http://127.0.0.1:5000";

const SUPABASE_URL = 'https://qhytblgdgrwmxknjpopr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoeXRibGdkZ3J3bXhrbmpwb3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5ODgwODAsImV4cCI6MjA3NTU2NDA4MH0.JKm01-hSn5mF7GVYH197j7OICSnXy-0mHExJDKhG-EU';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const TUTORIAL_BUCKET = 'comm-media'; // Confirming bucket name
const forum_images = 'forum-images'; // New bucket for community images/videos
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
    setupBioEdit();
    loadCommunityFeed();
    loadCommunityInputAvatar();

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
        renderCards(recipes.slice(0, 3), container, '/Page/search/details page/');

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
                        <span>⏱ ${recipe.cooking_time_display}</span>
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
            renderCards(filteredList, container, '/Page/search/details page/');
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
        
        // Update Text Info
        document.getElementById('detail-title').innerText = recipe.title;
        document.getElementById('detail-desc').innerText = recipe.description || recipe.subtitle;
        
        // 🟢 FIX: Use 'cooking_time_display' (matches your Python backend)
        const timeText = recipe.cooking_time_display || (recipe.cooking_time_minutes ? recipe.cooking_time_minutes + " mins" : "Time N/A");
        if(document.getElementById('detail-time')) {
            document.getElementById('detail-time').innerText = timeText;
        }

        if(document.getElementById('detail-servings')) {
            document.getElementById('detail-servings').innerText = recipe.servings ? `${recipe.servings} servings` : "-- servings";
        }

        // Image Handling
        let imagePath = 'https://placehold.co/1000x500?text=No+Image';
        if (recipe.main_image) {
            const { data } = supabaseClient.storage.from('recipe-images').getPublicUrl(recipe.main_image);
            imagePath = data.publicUrl;
        }
        document.getElementById('detail-image').src = imagePath;

        // Lists
        parseList(recipe.ingredients_list, 'detail-ingredients', 'ingredient');
        parseList(recipe.cooking_steps, 'detail-steps', 'step');

    } catch (error) { 
        console.error("Error loading details:", error); 
    }
    
    try {
        const userRes = await fetch(`${BACKEND_URL}/user/profile`, { credentials: 'include' });
        if (userRes.ok) {
            const user = await userRes.json();
            // Check if ID exists in user.saved.recipes (or tutorials)
            // Note: Handle cases where user.saved is null
            const savedList = user.saved && user.saved.recipes ? user.saved.recipes : [];
            
            // IF FOUND:
            if (savedList.includes(recipeId)) {
                const btn = document.getElementById('save-btn');
                if(btn) btn.innerHTML = `<i class="fas fa-bookmark"></i> Saved`;
            }
        }
    } catch (e) { console.log("Guest user"); }
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
        const response = await fetch(`${BACKEND_URL}/user/profile`, {
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
                loginBtn.innerText = "Log Out";
                loginBtn.href = "#"; 
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

async function logoutUser() {
    if (!confirm("Are you sure you want to log out?")) return;

    try {
        // 1. Ask the backend to delete the cookies
        const response = await fetch(`${BACKEND_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // 🟢 CRITICAL: Sends the current cookies so server can verify & delete them
        });

        if (response.ok) {
            alert("Logged out successfully!");
            // 2. Redirect to login page (adjust path if needed)
            window.location.href = "/Page/Logging/login.html"; 
        } else {
            alert("Logout failed. You might already be logged out.");
            window.location.reload();
        }

    } catch (error) {
        console.error("Logout error:", error);
        alert("An error occurred.");
    }
}

const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = document.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;

        submitBtn.innerText = "Verifying...";
        submitBtn.disabled = true;

        try {
            const response = await fetch(`${BACKEND_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                window.location.href = '2fa.html'; 
            } else {
                alert("Login Failed: " + data.message);
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }

        } catch (error) {
            console.error("Login Error:", error);
            alert("Connection error.");
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
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
        
        // Handle empty
        if (response.status === 404 || (response.status === 200 && (await response.clone().json()).message)) {
            container.innerHTML = '<p style="text-align:center; padding:20px;">No posts yet.</p>';
            return;
        }

        const posts = await response.json();
        container.innerHTML = '';

        posts.forEach(post => {
            // --- 🟢 FIX: ROBUST AVATAR LOGIC ---
            // 1. Default Fallback (First letter of name)
            let avatar = `https://placehold.co/50?text=${post.author_name.charAt(0).toUpperCase()}`;
            
            if (post.author_avatar) {
                 // Case A: Full URL (e.g. Google Auth)
                 if(post.author_avatar.startsWith('http')) {
                     avatar = post.author_avatar;
                 } 
                 // Case B: Supabase Path (e.g. "profiles/abc.jpg")
                 else {
                     const { data } = supabaseClient.storage
                        .from('profile-pics') // Ensure this matches your bucket name
                        .getPublicUrl(post.author_avatar);
                     avatar = data.publicUrl;
                 }
            }

            // 2. Media Logic
            let mediaHTML = '';
            if (post.media && post.media.url) {
                if (post.media.type === 'image') {
                    mediaHTML = `
                        <div class="post-image-container">
                            <img src="${post.media.url}" 
                                 style="width:100%; height:100%; object-fit:cover;"
                                 onerror="this.style.display='none'">
                        </div>`;
                } else if (post.media.type === 'video') {
                    mediaHTML = `
                        <div class="post-image-container">
                            <video controls style="width:100%; height:100%; object-fit:contain;">
                                <source src="${post.media.url}" type="video/mp4">
                            </video>
                        </div>`;
                }
            }

            // 3. Build Card
            const postHTML = `
                <div class="feed-card">
                    <div class="post-header">
                        <img src="${avatar}" class="user-avatar-sm" alt="User" 
                             onerror="this.src='https://placehold.co/50?text=${post.author_name.charAt(0).toUpperCase()}'">
                        <div class="poster-info">
                            <h4>${post.author_name}</h4>
                            <span>${post.created_at}</span>
                        </div>
                    </div>
                    
                    <div class="post-title">
                        ${post.content}
                    </div>

                    ${mediaHTML}

                    <div class="post-footer-line">
                        <button onclick="toggleLike('${post.post_id}')" class="action-icon-btn">
                            <i class="fas fa-heart"></i> 
                            <span>${post.likes} Likes</span>
                        </button>

                        <a href="commentPage.html?id=${post.post_id}" class="action-icon-btn" style="text-decoration: none; color: inherit;">
                            <i class="fas fa-comment"></i> 
                            <span>Comment</span>
                        </a>
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
        
        if (!content.trim() && !selectedFile) {
            return alert("Please write something or attach media!");
        }

        const originalText = btnCreatePost.innerHTML;
        btnCreatePost.innerHTML = "Posting...";
        btnCreatePost.disabled = true;

        try {
            let mediaData = null;

            // 1. Upload to Supabase (if file exists)
            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `community/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { data, error } = await supabaseClient
                    .storage
                    .from(forum_images) // defined at top of main.js
                    .upload(fileName, selectedFile);

                if (error) throw error;

                const { data: urlData } = supabaseClient
                    .storage
                    .from(forum_images)
                    .getPublicUrl(fileName);

                mediaData = {
                    type: selectedType, // 'image' or 'video'
                    url: urlData.publicUrl
                };
            }

            // 2. Send JSON to Backend
            const response = await fetch(`${BACKEND_URL}/feature/forums/create-post`, {
                method: 'POST',
                // 🟢 FIX 1: THIS HEADER PREVENTS THE 415 ERROR
                headers: { 'Content-Type': 'application/json' }, 
                credentials: 'include',
                // 🟢 FIX 2: SEND AS JSON STRING
                body: JSON.stringify({ 
                    post_content: content,
                    media: mediaData 
                })
            });

            if (response.status === 401) {
                alert("You must be logged in to post!");
                window.location.href = "/Page/Logging/login.html";
                return;
            }

            if (response.ok) {
                alert("Posted successfully!");
                document.getElementById('new-post-content').value = '';
                if(document.getElementById('clear-media')) document.getElementById('clear-media').click();
                loadCommunityFeed(); 
            } else {
                const err = await response.json();
                alert("Failed to post: " + (err.message || err.error));
            }

        } catch (error) {
            console.error("Post error:", error);
            alert("Error posting. See console.");
        } finally {
            btnCreatePost.innerHTML = originalText;
            btnCreatePost.disabled = false;
        }
    });
}


async function loadCommunityInputAvatar() {
    // 1. Select the specific avatar inside the create-post-card
    const avatarImg = document.getElementById('current-user-avatar');
    
    // Safety check: If this element doesn't exist, stop (we are on a different page)
    if (!avatarImg) return;

    try {
        // 2. Ask Backend "Who is logged in?"
        const response = await fetch(`${BACKEND_URL}/user/profile`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include' // 🟢 CRITICAL: Sends the cookie
        });

        if (response.ok) {
            const user = await response.json();
            
            // 3. Define the Fallback (Letter Avatar)
            const letter = user.username ? user.username.charAt(0).toUpperCase() : 'U';
            const fallbackSrc = `https://placehold.co/50?text=${letter}`;

            // 4. Update the Image Source
            if (user.avatar_url) {
                if (user.avatar_url.startsWith('http')) {
                    avatarImg.src = user.avatar_url;
                } else {
                    // Resolve Supabase path using your bucket 'profile-pics'
                    const { data } = supabaseClient.storage
                        .from('profile-pics')
                        .getPublicUrl(user.avatar_url);
                    avatarImg.src = data.publicUrl;
                }
            } else {
                avatarImg.src = fallbackSrc;
            }

            // 🟢 SAFETY NET: If the image fails to load (404), switch to the letter
            avatarImg.onerror = function() {
                this.src = fallbackSrc;
                this.onerror = null;
            };

        } else {
            // If 401 Unauthorized (Not logged in), show a generic icon
            console.log("User not logged in");
            avatarImg.src = "https://placehold.co/50?text=?";
        }
    } catch (error) {
        console.error("Error loading user avatar:", error);
    }
}

async function toggleLike(postId) {
    try {
        // 🟢 FIX: Changed URL from 'create-post' to 'post' to match Python route
        const response = await fetch(`${BACKEND_URL}/feature/forums/post/${postId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.status === 401) {
            alert("Please log in to like posts.");
            window.location.href = "/Page/Logging/login.html"; 
            return;
        }

        if (response.ok) {
            const data = await response.json();
            console.log("Success:", data.message); // "Liked successfully" or "Unliked successfully"
            
            // Reload the feed to show the new number/color
            loadCommunityFeed(); 
        } else {
            // If error, print it to console so you know why
            console.error("Like failed with status:", response.status);
            alert("Unable to like post. Check console for details.");
        }

    } catch (error) {
        console.error("Like network error:", error);
    }
}




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
    // 1. Check for elements on EITHER Profile page OR Settings page
    const profileName = document.getElementById('profile-name');
    const settingsUsernameInput = document.getElementById('current-username');

    // If neither exists, stop (we are on a different page)
    if (!profileName && !settingsUsernameInput) return;

    try {
        // 2. Get User Info from Backend
        const userResponse = await fetch(`${BACKEND_URL}/user/profile`, { // Ensure this matches your backend route
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (!userResponse.ok) return; // Not logged in

        const user = await userResponse.json();

        // 3. Update PROFILE PAGE (If active)
        if (profileName) {
            // A. Update Text Info
            profileName.innerText = user.username || "Chef";
            if(document.getElementById('profile-bio')) {
                document.getElementById('profile-bio').innerText = user.bio || "No bio yet.";
            }
            
            // B. Update Avatar
            const avatarImg = document.getElementById('profile-avatar');
            if (avatarImg && user.avatar_url) {
                 if (user.avatar_url.startsWith('http')) {
                    avatarImg.src = user.avatar_url;
                } else {
                    const { data } = supabaseClient.storage.from('profile-pics').getPublicUrl(user.avatar_url);
                    avatarImg.src = data.publicUrl;
                }
            }

            // 🟢 C. FIX: Update Cover Photo (This was missing!)
            const coverImg = document.querySelector('.profile-cover img');
            if (coverImg && user.cover_url) {
                // Check if it's a full link or Supabase path
                if (user.cover_url.startsWith('http')) {
                    coverImg.src = user.cover_url;
                } else {
                    const { data } = supabaseClient.storage.from('profile-pics').getPublicUrl(user.cover_url);
                    coverImg.src = data.publicUrl;
                }
            }

            // D. Load User's Posts
            loadUserPosts(user.user_id);
        }

        // 4. Update Settings Page (If active)
        if (settingsUsernameInput) {
            settingsUsernameInput.value = user.username; 
        }

    } catch (error) {
        console.error("Profile load error:", error);
    }
}

async function loadUserPosts(userId) {
    const container = document.getElementById('profile-posts-container');
    if (!container) return;

    // Show loading spinner while fetching
    container.innerHTML = `
        <div style="text-align:center; padding:20px; color:#666;">
            <i class="fas fa-spinner fa-spin"></i> Loading posts...
        </div>`;

    try {
        const response = await fetch(`${BACKEND_URL}/feature/forums/user/${userId}`);
        
        if (!response.ok) {
            container.innerHTML = '<p style="text-align:center; padding:20px;">No posts yet.</p>';
            return;
        }

        const data = await response.json();

        // Check if posts exist
        if (!data.posts || data.posts.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:30px; background:white; border-radius:12px;">
                    <h3>No posts yet 🍳</h3>
                    <p>Share your first recipe or kitchen moment above!</p>
                </div>`;
            return;
        }

        container.innerHTML = ''; // Clear loader

        data.posts.forEach(post => {
            // 1. Format Date
            const dateStr = new Date(post.created_at).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric'
            });

            // 2. Handle Avatar
            let avatar = 'https://placehold.co/50?text=U';
            if (post.author_avatar) {
                 if(post.author_avatar.startsWith('http')) {
                     avatar = post.author_avatar;
                 } else {
                     // If using Supabase storage
                     const { data } = supabaseClient.storage.from('recipe-images').getPublicUrl(post.author_avatar);
                     avatar = data.publicUrl;
                 }
            }

            // 3. Handle Media (Image/Video)
            let mediaHTML = '';
            if (post.media && post.media.url) {
                if (post.media.type === 'video') {
                    mediaHTML = `
                        <div class="p-card-media">
                            <video controls src="${post.media.url}"></video>
                        </div>`;
                } else {
                    mediaHTML = `
                        <div class="p-card-media">
                            <img src="${post.media.url}" alt="Post Image" onerror="this.style.display='none'">
                        </div>`;
                }
            }

            // 4. Build the HTML
            const cardHTML = `
                <div class="profile-feed-card">
                    <div class="p-card-header">
                        <img src="${avatar}" class="p-card-avatar" onerror="this.src='https://placehold.co/50?text=U'">
                        <div class="p-card-info">
                            <h4>${post.author_name || 'Chef'}</h4>
                            <span>${dateStr}</span>
                        </div>
                    </div>

                    <div class="p-card-content">
                        ${post.content}
                    </div>

                    ${mediaHTML}

                    <div class="p-card-actions">
                        <button class="p-action-btn" onclick="toggleLike('${post.post_id}')">
                            <i class="far fa-heart"></i> ${post.likes || 0} Likes
                        </button>
                        <button class="p-action-btn">
                            <i class="far fa-comment"></i> Comment
                        </button>
                    </div>
                </div>
            `;
            container.innerHTML += cardHTML;
        });

    } catch (error) {
        console.error("Error loading posts:", error);
        container.innerHTML = '<p style="text-align:center;">Error loading feed.</p>';
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

    } 
    
    catch (error) {
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

async function toggleSave(id, type) {
    // type should be 'recipes' or 'tutorials'
    const btn = document.getElementById('save-btn');
    const icon = btn.querySelector('i');
    
    // Determine current state based on icon class (far = empty, fas = solid)
    const isSaved = icon.classList.contains('fas');
    const action = isSaved ? 'unsave' : 'save';

    try {
        const response = await fetch(`${BACKEND_URL}/feature/${type}/${id}/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include' // 🟢 Needs cookie
        });

        if (response.status === 401) {
            alert("Please log in to save items.");
            window.location.href = "../Logging/login.html";
            return;
        }

        if (response.ok) {
            // Toggle Icon Visuals
            if (isSaved) {
                // Unsaved
                icon.classList.remove('fas');
                icon.classList.add('far');
                btn.innerHTML = `<i class="far fa-bookmark"></i> Save`;
            } else {
                // Saved
                icon.classList.remove('far');
                icon.classList.add('fas');
                btn.innerHTML = `<i class="fas fa-bookmark"></i> Saved`;
            }
        }
    } catch (error) {
        console.error("Save error:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Handle Username Update ---
    const usernameForm = document.getElementById('username-form');

if (usernameForm) {
    usernameForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        // Get the data
        const currentUsernameField = document.getElementById('current-username');
        const newUsernameInput = document.getElementById('new-username');
        const newUsername = newUsernameInput.value;

        // Basic validation
        if(!newUsername.trim()) {
            alert("Please enter a valid username.");
            return;
        }

        const submitBtn = usernameForm.querySelector('button');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = "Updating...";
        submitBtn.disabled = true;

        try {
            // 🟢 FIX 1: URL must match your python route (@user_bp.route("/profile"))
            // Assuming your blueprint prefix is '/user', the full path is '/user/profile'
            const response = await fetch(`${BACKEND_URL}/user/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // 🟢 FIX 2: Essential for @jwt_required() to find the user
                
                // 🟢 FIX 3: Send exactly what the backend expects ("username")
                // Your backend code says: if "username" in data: user.username = data["username"]
                body: JSON.stringify({
                    username: newUsername
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Username updated successfully!');
                currentUsernameField.value = newUsername; // Update the display with the new name
                newUsernameInput.value = ''; 
            } else {
                alert(`Error: ${data.message || 'Failed to update'}`);
            }

        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred connecting to the server.');
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
        });
    }

    // --- 2. Handle Password Update (WITH SECURITY CHECK) ---
    const passwordForm = document.getElementById('password-form');

if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Gather Data
        const currentPassInput = document.getElementById('current-pass');
        const newPassInput = document.getElementById('new-pass');
        const confirmPassInput = document.getElementById('confirm-pass');

        const currentPass = currentPassInput.value;
        const newPass = newPassInput.value;
        const confirmPass = confirmPassInput.value;

        // 2. Validation
        if (newPass !== confirmPass) {
            return alert("New passwords do not match!");
        }
        if (!currentPass) {
            return alert("Please enter your current password.");
        }

        const submitBtn = passwordForm.querySelector('button');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = "Updating...";
        submitBtn.disabled = true;

        try {
            // 🟢 FIX 1: Use '/auth/change-password' (Matches Blueprint)
            // 🟢 FIX 2: Use 'POST' (Matches Python route)
            const response = await fetch(`${BACKEND_URL}/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Important for JWT
                // 🟢 FIX 3: Use 'old_password' to match Python's data.get("old_password")
                body: JSON.stringify({
                    old_password: currentPass, 
                    new_password: newPass
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Password changed successfully!');
                // Clear inputs
                currentPassInput.value = '';
                newPassInput.value = '';
                confirmPassInput.value = '';
            } else {
                alert(`Failed: ${data.message}`);
            }

        } catch (error) {
            console.error('Settings Error:', error);
            alert('An error occurred connecting to the server.');
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
            }
        });
    }

    loadUserProfile();
    if (typeof setupBioEdit === "function") setupBioEdit();

    setupProfileImageUploads();
});

function setupBioEdit() {
    const btn = document.querySelector('.edit-bio-btn');
    const bioText = document.getElementById('profile-bio');

    if (!btn || !bioText) return;

    btn.addEventListener('click', async () => {
        // Check if we are currently editing
        const isEditing = btn.classList.contains('editing');

        if (!isEditing) {
            // --- SWITCH TO EDIT MODE ---
            const currentBio = bioText.innerText === "No bio yet." ? "" : bioText.innerText;
            
            // Replace text with a textarea
            bioText.innerHTML = `<textarea id="bio-input" class="bio-textarea" placeholder="Tell us about your kitchen...">${currentBio}</textarea>`;
            
            // Change button to "Save"
            btn.innerText = "Save Bio";
            btn.classList.add('editing');
            
        } else {
            // --- SAVE CHANGES ---
            const input = document.getElementById('bio-input');
            const newBio = input.value;
            const originalText = btn.innerText;

            btn.innerText = "Saving...";
            btn.disabled = true;

            try {
                // Send PUT request to backend
                // Note: We use /user/profile based on your user_bp
                const response = await fetch(`${BACKEND_URL}/user/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bio: newBio }) // Only sending bio!
                });

                if (response.ok) {
                    // Success! Switch back to text view
                    bioText.innerHTML = newBio || "No bio yet.";
                    btn.innerText = "Edit Bio";
                    btn.classList.remove('editing');
                } else {
                    alert("Failed to save bio.");
                    btn.innerText = originalText;
                }
            } catch (error) {
                console.error("Bio save error:", error);
                alert("Network error.");
                btn.innerText = originalText;
            } finally {
                btn.disabled = false;
            }
        }
    });
}

function setupProfileImageUploads() {
    // 1. Select Elements
    const btnEditCover = document.querySelector('.edit-cover-btn');
    const btnEditAvatar = document.querySelector('.edit-avatar-btn');
    
    const inputCover = document.getElementById('cover-upload-input');
    const inputAvatar = document.getElementById('avatar-upload-input');
    
    const imgCover = document.querySelector('.profile-cover img');
    const imgAvatar = document.getElementById('profile-avatar');

    // Safety check to ensure elements exist
    if (!btnEditCover || !btnEditAvatar) return;

    // --- A. COVER PHOTO LOGIC ---
    // Clicking "Edit Cover" opens the hidden file input
    btnEditCover.addEventListener('click', () => inputCover.click());

    // When a file is chosen...
    inputCover.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        // Upload to 'cover' folder
        await handleImageUpload(file, 'cover', btnEditCover, imgCover);
    });

    // --- B. AVATAR PHOTO LOGIC ---
    // Clicking "Camera Icon" opens the hidden file input
    btnEditAvatar.addEventListener('click', () => inputAvatar.click());

    // When a file is chosen...
    inputAvatar.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        // Upload to 'profiles' folder (since you named it profiles)
        await handleImageUpload(file, 'avatar', btnEditAvatar, imgAvatar);
    });
}

// --- Reusable Upload & Update Function ---
async function handleImageUpload(file, type, btnElement, imgElement) {
    const originalText = btnElement.innerHTML;
    // Show a loading spinner on the button
    btnElement.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`; 
    btnElement.disabled = true;

    try {
        const fileExt = file.name.split('.').pop();
        
        // 🟢 FOLDER MAPPING:
        // If type is 'cover' -> use 'cover' folder
        // If type is 'avatar' -> use 'profiles' folder
        const folderName = type === 'cover' ? 'cover' : 'profiles';
        
        const fileName = `${folderName}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // 🟢 Upload to 'profile-pics' bucket
        const { data, error } = await supabaseClient
            .storage
            .from('profile-pics') 
            .upload(fileName, file);

        if (error) throw error;

        // 🟢 Get Public URL
        const { data: urlData } = supabaseClient
            .storage
            .from('profile-pics')
            .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;

        // 4. Send URL to Backend
        // Choose the correct Python route
        const endpoint = type === 'cover' 
            ? '/user/profile-cover/update' 
            : '/user/profile-avatar/update';
        
        // Create the correct JSON payload
        const payload = type === 'cover' 
            ? { cover_url: publicUrl } 
            : { avatar_url: publicUrl };

        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            // Update the image on screen immediately
            imgElement.src = publicUrl; 
            alert(`${type === 'cover' ? 'Cover' : 'Avatar'} updated successfully!`);
        } else {
            const err = await response.json();
            alert(`Failed to update: ${err.message}`);
        }

    } catch (error) {
        console.error("Upload error:", error);
        alert("Upload failed. Check console details.");
    } finally {
        // Reset the button text
        btnElement.innerHTML = originalText;
        btnElement.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check if we are on the comment page by looking for the specific container
    if (document.querySelector('.discussion-container')) {
        
        // 2. Get Post ID from URL (e.g., comment.html?id=123)
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('id');

        if (postId) {
            await loadDiscussionPage(postId);
            setupCommentForm(postId); // Setup the submit listener

            loadCommenterIdentity(); // Load the commenter's name and avatar
        } else {
            document.querySelector('.discussion-container').innerHTML = '<p>Post not found.</p>';
        }
    }
});

async function loadDiscussionPage(postId) {
    try {
        const response = await fetch(`${BACKEND_URL}/feature/forums/post/${postId}`);
        
        if (!response.ok) throw new Error("Failed to load post");

        const data = await response.json();
        const post = data.forum_content;
        const comments = data.comments;

        // --- A. Fill in the Main Post Content ---
        document.querySelector('.post-title-large').innerText = post.content.substring(0, 50) + "..."; 
        document.querySelector('.post-body-text').innerText = post.content;
        document.querySelector('.vote-count').innerText = post.likes;

        // --- 🟢 FIX: ROBUST IDENTITY HANDLING ---
        const posterAvatar = document.querySelector('.expanded-post .user-avatar-sm');
        const posterName = document.querySelector('.expanded-post .poster-info h4');
        const posterTime = document.querySelector('.expanded-post .poster-info span');

        // 1. Set Name & Time
        const safeName = post.author_name || "Unknown";
        if(posterName) posterName.innerText = safeName;
        if(posterTime) posterTime.innerText = new Date(post.created_at).toLocaleString();

        // 2. Set Avatar with Debugging & Safety Net
        if (posterAvatar) {
            console.log("Avatar Data from DB:", post.author_avatar); // 🟢 CHECK THIS IN CONSOLE

            // Default Placeholder
            const fallbackSrc = `https://placehold.co/50?text=${safeName.charAt(0).toUpperCase()}`;

            if (post.author_avatar) {
                // Case A: Full URL (e.g. Google Auth)
                if (post.author_avatar.startsWith('http')) {
                    posterAvatar.src = post.author_avatar;
                } 
                // Case B: Supabase Path (e.g. "profiles/abc.jpg")
                else {
                    // 🟢 ENSURE 'profile-pics' MATCHES YOUR BUCKET NAME EXACTLY
                    const { data } = supabaseClient.storage
                        .from('profile-pics') 
                        .getPublicUrl(post.author_avatar);
                    
                    console.log("Generated Supabase URL:", data.publicUrl); // 🟢 CHECK THIS
                    posterAvatar.src = data.publicUrl;
                }
            } else {
                // Case C: No data in DB
                posterAvatar.src = fallbackSrc;
            }

            // 🟢 CRITICAL FIX: If the image fails to load (404), switch to letter
            posterAvatar.onerror = function() {
                console.warn("Avatar failed to load, switching to fallback.");
                this.src = fallbackSrc;
                this.onerror = null; // Prevent infinite loop
            };
        }

        // --- C. Media Handling ---
        const imgContainer = document.querySelector('.post-image-container');
        if (post.media && post.media.url) {
            imgContainer.style.display = 'flex';
            if (post.media.type === 'video') {
                 imgContainer.innerHTML = `<video controls src="${post.media.url}"></video>`;
            } else {
                 imgContainer.innerHTML = `<img src="${post.media.url}" alt="Post Image">`;
            }
        } else {
            imgContainer.style.display = 'none';
        }

        // --- D. Render Comments ---
        const commentThread = document.querySelector('.comments-thread');
        const filterHTML = document.querySelector('.comments-filter').outerHTML; 
        commentThread.innerHTML = filterHTML; 

        if (comments.length === 0) {
            commentThread.innerHTML += '<p style="text-align:center; margin-top:20px;">No comments yet.</p>';
        } else {
            comments.forEach(comment => {
                const dateStr = new Date(comment.created_at).toLocaleDateString();
                const letter = comment.username ? comment.username.charAt(0).toUpperCase() : 'U';
                
                // Logic for Commenter Avatar
                let commenterSrc = `https://placehold.co/40?text=${letter}`;
                if (comment.commenter_avatar) {
                     if(comment.commenter_avatar.startsWith('http')) {
                         commenterSrc = comment.commenter_avatar;
                     } else {
                         const { data } = supabaseClient.storage.from('profile-pics').getPublicUrl(comment.commenter_avatar);
                         commenterSrc = data.publicUrl;
                     }
                }

                const commentHTML = `
                    <div class="comment-node">
                        <div class="comment-avatar">
                            <img src="${commenterSrc}" onerror="this.src='https://placehold.co/40?text=${letter}'">
                        </div>
                        <div class="comment-content">
                            <div class="comment-meta">
                                <strong>${comment.username}</strong> • <span>${dateStr}</span>
                            </div>
                            <p>${comment.comment_text}</p>
                        </div>
                    </div>
                `;
                commentThread.innerHTML += commentHTML;
            });
        }

    } catch (error) {
        console.error("Error loading discussion:", error);
    }
}
// --- C. Handle New Comment Submission ---
function setupCommentForm(postId) {
    const form = document.getElementById('commentForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const textarea = form.querySelector('textarea');
        const text = textarea.value;

        if (!text.trim()) return alert("Please write a comment!");

        const btn = form.querySelector('.post-comment-btn');
        const originalText = btn.innerText;
        btn.innerText = "Posting...";
        btn.disabled = true;

        try {
            const response = await fetch(`${BACKEND_URL}/feature/forums/post/${postId}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                // 🟢 FIX: Changed key to 'comment_content' to match your Python code
                body: JSON.stringify({ comment_content: text }) 
            });

            if (response.ok) {
                // Reload the page content to show the new comment
                await loadDiscussionPage(postId); 
                textarea.value = ''; // Clear the box
            } else {
                const err = await response.json();
                alert("Failed to post: " + (err.message || "Error"));
            }
        } catch (error) {
            console.error("Comment error:", error);
            alert("Network error.");
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });
}

async function loadCommenterIdentity() {
    // 1. Find the HTML element
    const nameEl = document.getElementById('commenter-name');
    const avatarEl = document.getElementById('commenter-avatar'); // Optional: if you have an avatar img nearby

    // Safety check: Stop if we aren't on the comment page
    if (!nameEl) return;

    try {
        // 2. Ask Backend for Profile
        const response = await fetch(`${BACKEND_URL}/user/profile`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include' // 🟢 CRITICAL: Sends your login cookie
        });

        if (response.ok) {
            const user = await response.json();
            
            // 3. Update the Text
            nameEl.innerText = user.username; 
            
            // Optional: Update avatar if you have one
            if (avatarEl && user.avatar_url) {
                 // Check if it's a full link or a Supabase path
                 if (user.avatar_url.startsWith('http')) {
                     avatarEl.src = user.avatar_url;
                 } else {
                     const { data } = supabaseClient.storage.from('profile-pics').getPublicUrl(user.avatar_url);
                     avatarEl.src = data.publicUrl;
                 }
            }
        } else {
            // 4. Handle Not Logged In
            nameEl.innerText = "Guest (Please Log In)";
            nameEl.style.color = "gray";
            
            // Disable the post button if they aren't logged in
            const btn = document.querySelector('.post-comment-btn');
            if (btn) {
                btn.disabled = true;
                btn.innerText = "Login to Comment";
                btn.style.backgroundColor = "#ccc";
            }
        }
    } catch (error) {
        console.error("Identity load error:", error);
        nameEl.innerText = "Error loading user";
    }
}