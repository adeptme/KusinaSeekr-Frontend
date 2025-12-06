"const BACKEND_URL = 'https://kusinaseekr-backend.onrender.com';"
const BACKEND_URL = 'http://localhost:5000';

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
    
    try {
        const userRes = await fetch(`${BACKEND_URL}/auth/profile`, { credentials: 'include' });
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
            const cardHTML = buildCardHTML(recipe, 'details page/', 's-recipe-card', 's-info', 's-meta', 's-tag', 's-btn', 's-duration');
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
                    <span>⏱ ${recipe.cooking_time_display}</span>
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
            // 1. Avatar
            let avatar = '../Page/images/chef-avatar.jpg';
            // Handle if avatar is a full URL or just a filename
            if (post.author_avatar) {
                 if(post.author_avatar.startsWith('http')) {
                     avatar = post.author_avatar;
                 } else {
                     // Fallback for older data
                     avatar = `https://placehold.co/50?text=${post.author_name.charAt(0)}`;
                 }
            }

            // 2. Media (Image/Video)
            let mediaHTML = '';
            
            if (post.media && post.media.url) {
                // 🟢 DEBUG: Print the URL to console so you can check it
                console.log(`Post ${post.post_id} Image URL:`, post.media.url);

                if (post.media.type === 'image') {
                    mediaHTML = `
                        <div class="post-image-container">
                            <img src="${post.media.url}" 
                                 alt="Post Image" 
                                 style="width:100%; border-radius:12px; margin-top:10px; object-fit:cover;"
                                 onerror="this.onerror=null; this.src='https://placehold.co/600x400?text=Image+Not+Found'; console.error('Failed to load image:', '${post.media.url}')">
                        </div>
                    `;
                } else if (post.media.type === 'video') {
                    mediaHTML = `
                        <div class="post-image-container">
                            <video controls style="width:100%; border-radius:12px; margin-top:10px;">
                                <source src="${post.media.url}" type="video/mp4">
                                Your browser does not support video.
                            </video>
                        </div>
                    `;
                }
            }

            // 3. Build Card
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

                    ${mediaHTML}

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

async function toggleLike(postId) {
    try {
        const response = await fetch(`${BACKEND_URL}/feature/forums/create-post/${postId}/like`, {
            method: 'POST',
            credentials: 'include'
        });

        if (response.status === 401) {
            alert("Please log in to like posts.");
            window.location.href = "/Page/Logging/login.html"; // Adjust path if needed
            return;
        }

        if (response.ok) {
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
                    .from('forum-images') // Storing in same bucket for now
                    .upload(fileName, selectedFile);

                if (error) throw error;

                // Get Public URL
                const { data: urlData } = supabaseClient
                    .storage
                    .from('forum-images')
                    .getPublicUrl(fileName);

                // Create the JSON object for the database
                mediaData = {
                    type: selectedType, // 'image' or 'video'
                    url: urlData.publicUrl
                };
            }

            // B. Send to Backend
            const response = await fetch(`${BACKEND_URL}/feature/forums/create-post`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
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
                document.getElementById('clear-media').click(); // Reset file
                loadCommunityFeed(); // Refresh feed
            } else {
                alert("Failed to post.");
            }

        } catch (error) {
        } finally {
            btnCreatePost.innerHTML = originalText;
            btnCreatePost.disabled = false;
        }
    });
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
        // 2. Get User Info
        const userResponse = await fetch(`${BACKEND_URL}/auth/profile`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (!userResponse.ok) {
            // Not logged in
            return;
        }

        const user = await userResponse.json();

        // 3. Update PROFILE PAGE (If active)
        if (profileName) {
            profileName.innerText = user.username || "Chef";
            if(document.getElementById('profile-bio')) {
                document.getElementById('profile-bio').innerText = user.bio || "No bio yet.";
            }
            
            const avatarImg = document.getElementById('profile-avatar');
            if (avatarImg && user.avatar_url) {
                // Logic to load avatar from Supabase...
                 if (user.avatar_url.startsWith('http') || user.avatar_url.startsWith('../')) {
                    avatarImg.src = user.avatar_url;
                } else {
                    const { data } = supabaseClient.storage.from('recipe-images').getPublicUrl(user.avatar_url);
                    avatarImg.src = data.publicUrl;
                }
            }
            // Load posts only on profile page
            loadUserPosts(user.user_id);
        }

        // 🟢 4. UPDATE SETTINGS PAGE (This fixes the Password Change!)
        if (settingsUsernameInput) {
            // This ensures the form sends the REAL username, not "ChefK_2025"
            settingsUsernameInput.value = user.username; 
        }

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
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                            <h3 style="margin: 0; flex: 1;">${tutorial.title}</h3>
                            <button class="save-icon-btn" onclick="event.stopPropagation(); toggleSave('${tutorial.tutorial_id}', 'tutorial')" style="background: none; border: none; cursor: pointer; padding: 0; margin-left: 10px;">
                                <i class="far fa-bookmark" style="font-size: 1.2rem; color: #ff6b6b;"></i>
                            </button>
                        </div>
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
             contentArea.innerHTML = `<p>${tutorial.steps}</p>`;
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
            const currentUsername = currentUsernameField.value;
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
                // 🟢 FIX: Added ${BACKEND_URL} so it hits port 5000
                const response = await fetch(`${BACKEND_URL}/user/user/update`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        current_username: currentUsername,
                        new_username: newUsername
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Username updated successfully!');
                    currentUsernameField.value = data.new_username; // Update the display
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
});