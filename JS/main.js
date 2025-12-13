//const BACKEND_URL = 'https://kusinaseekr-backend.onrender.com';
const BACKEND_URL = 'http://127.0.0.1:5000';

const SUPABASE_URL = 'https://qhytblgdgrwmxknjpopr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoeXRibGdkZ3J3bXhrbmpwb3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5ODgwODAsImV4cCI6MjA3NTU2NDA4MH0.JKm01-hSn5mF7GVYH197j7OICSnXy-0mHExJDKhG-EU';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const TUTORIAL_BUCKET = 'comm-media'; // Confirming bucket name
const forum_images = 'forum-images'; // New bucket for community images/videos
let allRecipesData = [];


document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Auth Check
    if (!document.getElementById('loginForm') && !document.getElementById('signupForm')) {
        checkAuth();
    }

    // 2. Initialize UI & Filters FIRST (Crucial for the auto-search to work)
    if (typeof initSearchToggle === "function") {
        initSearchToggle();
    }
    
    if (typeof setupFilters === "function") {
        setupFilters();
    }

    // 3. Load Data
    await loadRecipes();     
    loadSearchPageRecipes(); 
    loadRecipeDetails();
    
    loadUserProfile();
    setupBioEdit();
    loadCommunityFeed();
    loadCommunityInputAvatar();

    loadTutorialCards();
    loadTutorialDetails();
    setupVideoModal();
    loadSearchPageTutorials();
    
    // 4. Setup Tutorial Search
    if (document.getElementById('tutorialResultsContainer')) {
        setupTutorialSearch();
        loadSearchPageTutorials();
    }

    if (document.getElementById('tutorialContainer')) {
        loadFeaturedTutorials();
    }
    
    if (document.getElementById('tutorial-title')) {
        loadTutorialDetails();
        setupVideoModal();
    }

    // 5. Setup Home Page Ingredient Form
    const homeIngForm = document.querySelector('.recipe-box form');
    
    if (homeIngForm) {
        homeIngForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputVal = document.getElementById('ingredient-input').value;
            
            if (inputVal.trim()) {
                window.location.href = `Page/search/ingredient&recipeSearch.html?ingredients=${encodeURIComponent(inputVal)}`;
            }
        });
    }

    // 6. Setup Ingredient Search Form (Search Page)
    const ingForm = document.getElementById('ingredientSearchForm');
    const btnAdd = document.getElementById('btnAddIng');

    if (ingForm) {
        console.log("✅ Ingredient Form Found!"); 
        
        ingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputVal = document.getElementById('ingInput').value;
            console.log(" STARTING INGREDIENT SEARCH ");

            if (!inputVal.trim()) {
                alert("Please enter ingredients!");
                return;
            }
            console.log("Searching for:", inputVal);
            await searchByIngredients(inputVal);
        });
    }

    if (btnAdd && ingForm) {
        btnAdd.addEventListener('click', () => {
            ingForm.dispatchEvent(new Event('submit'));
        });
    }

    // ✅ 7. AUTO-RUN SEARCH (Moved to the end)
    // This runs last to ensure the UI (initSearchToggle) is ready to switch tabs
    const urlParams = new URLSearchParams(window.location.search);
    const ingredientsParam = urlParams.get('ingredients');
    
    if (ingredientsParam && document.getElementById('ingInput')) {
        const btnIngredient = document.getElementById('btn-ingredient');
        
        // Because initSearchToggle() ran above, this click will correctly switch the view
        if (btnIngredient) {
            btnIngredient.click(); 
        }

        const ingInput = document.getElementById('ingInput');
        if (ingInput) {
            ingInput.value = decodeURIComponent(ingredientsParam);
            
            // Slight delay to ensure tab animation/display is done before searching
            setTimeout(() => {
                searchByIngredients(ingredientsParam);
            }, 100);
        }
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
    container.style.opacity = '1';

    container.innerHTML = '<p style="text-align:center; width:100%; grid-column: span 3;">Searching...</p>';

    try {
        const response = await fetch(`${BACKEND_URL}/feature/search-by-ing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ingredients: ingredientString })
        });

        const data = await response.json();
        // console.log("✅ Backend Response:", data);

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
            const cardHTML = buildCardHTML(recipe, 'details page/', 's-recipe-card', 's-info', 's-meta', 's-tag', 's-btn');
            container.innerHTML += cardHTML;
        });

    } catch (error) {
        console.error("❌ Search error:", error);
        container.innerHTML = '<p style="text-align:center; width:100%;">Something went wrong. Check console.</p>';
    }
}

async function loadFeaturedTutorials() {
    const container = document.getElementById('tutorialContainer');
    if (!container) return;

    try {
        const response = await fetch(`${BACKEND_URL}/feature/tutorials`);
        const tutorials = await response.json();
        renderTutorialCards(tutorials.slice(0, 3), container, 'Page/search/details page/');
    } catch (error) {
        console.error("Error loading featured:", error);
    }
}

//  A. Homepage Loader 
async function loadRecipes() {
    const container = document.getElementById('recipeContainer');
    if (!container) return; 

    try {
        const response = await fetch(`${BACKEND_URL}/feature/recipes`);
        const recipes = await response.json();
        
        //  Store data globally for filtering
        allRecipesData = recipes;
        renderCards(recipes.slice(0, 3), container, '/Page/search/details page/');

    } catch (error) {
        console.error("Error loading home recipes:", error);
        container.innerHTML = '<p>Error loading recipes.</p>';
    }
}

//  B. Search Page Loader 
async function loadSearchPageRecipes() {
    const container = document.getElementById('results-section');
    if (!container) return; 

    try {
        const recipes = await response.json();
        
        allRecipesData = recipes;
        renderCards(recipes, container, 'details page/', 's-recipe-card', 's-info', 's-meta', 's-tag', 's-btn');

    } catch (error) {
        console.error("Error loading search recipes:", error);
    }
}

//  Reusable Render Function 
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

        // ✅ NEW: Handle views (default to 0 if undefined)
        const viewCount = recipe.views || 0;

        const cardHTML = `
            <div class="${cardClass}">
                <img src="${imagePath}" alt="${recipe.title}" style="width:100%; height:200px; object-fit:cover;" onerror="this.src='https://placehold.co/400x300?text=Image+Error'">
                <div class="${infoClass}">
                    <h3>${recipe.title}</h3>
                    <p>${recipe.subtitle || recipe.description || ''}</p>
                    <div class="${metaClass}">
                        <span class="${tagClass}">${recipe.category}</span>
                        <span>⏱ ${recipe.cooking_time_display}</span>
                        <span style="margin-left: 10px; color: #666; font-size: 0.9em;">
                            <i class="fas fa-eye"></i> ${viewCount}
                        </span>
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
        
        document.getElementById('detail-title').innerText = recipe.title;
        document.getElementById('detail-desc').innerText = recipe.description || recipe.subtitle;
        
        const timeText = recipe.cooking_time_display || (recipe.cooking_time_minutes ? recipe.cooking_time_minutes + " mins" : "Time N/A");
        if(document.getElementById('detail-time')) {
            document.getElementById('detail-time').innerText = timeText;
        }

        if(document.getElementById('detail-servings')) {
            document.getElementById('detail-servings').innerText = recipe.servings ? `${recipe.servings} servings` : "-- servings";
        }

        // ✅ NEW: Update Views on Details Page
        if(document.getElementById('detail-views')) {
            const views = recipe.views || 0;
            // Using innerHTML to include the icon
            document.getElementById('detail-views').innerHTML = `<i class="fas fa-eye"></i> ${views} views`;
        }

        let imagePath = 'https://placehold.co/1000x500?text=No+Image';
        if (recipe.main_image) {
            const { data } = supabaseClient.storage.from('recipe-images').getPublicUrl(recipe.main_image);
            imagePath = data.publicUrl;
        }
        document.getElementById('detail-image').src = imagePath;
        parseList(recipe.ingredients_list, 'detail-ingredients', 'ingredient');
        parseList(recipe.cooking_steps, 'detail-steps', 'step');

    } catch (error) { 
        console.error("Error loading details:", error); 
    }
    
    try {
        const userRes = await fetch(`${BACKEND_URL}/user/profile`, { credentials: 'include' });
        if (userRes.ok) {
            const user = await userRes.json();
            const savedList = user.saved && user.saved.recipes ? user.saved.recipes : [];
            
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
                    li.innerHTML = `<strong>${item.amount || ''}</strong> ${'&nbsp;'} ${item.name} ${item.notes ? `(${item.notes})` : ''}`;
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
            credentials: 'include' //  Sends the cookie
        });

        if (response.ok) {
            const userData = await response.json();
            console.log("User logged in:", userData.username);

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
        const response = await fetch(`${BACKEND_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' 
        });

        if (response.ok) {
            alert("Logged out successfully!");
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

    if (btnRecipe && btnIngredient && recipeView && ingredientView) {
        
        btnRecipe.addEventListener('click', (e) => {
            e.preventDefault(); // Stop page reload
            console.log("Switched to Recipe Search");

            btnRecipe.classList.add('active');
            btnIngredient.classList.remove('active');

            recipeView.style.display = 'block';
            ingredientView.style.display = 'none';
            
            if(resultsSection) resultsSection.style.display = 'grid';
        });

        btnIngredient.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Switched to Ingredient Search");

            btnIngredient.classList.add('active');
            btnRecipe.classList.remove('active');
            recipeView.style.display = 'none';
            ingredientView.style.display = 'block';
            
            if(resultsSection) resultsSection.style.display = 'none';
        });
    }
}

const recipeSearchForm = document.getElementById('recipeSearchForm');

if (recipeSearchForm) {
    recipeSearchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
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
        container.innerHTML = ''; 

        if (!response.ok || !data.recipes || data.recipes.length === 0) {
            container.innerHTML = '<p style="text-align:center; width:100%;">No recipes found.</p>';
            return;
        }

        data.recipes.forEach(recipe => {
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
    
    if (recipe.main_image) {
        const { data } = supabaseClient
            .storage
            .from('recipe-images') 
            .getPublicUrl(recipe.main_image); 
        imagePath = data.publicUrl;
    }

    // ✅ NEW: Handle views
    const viewCount = recipe.views || 0;

    return `
        <div class="${cardClass}">
            <img src="${imagePath}" alt="${recipe.title}" style="width:100%; height:200px; object-fit:cover;" onerror="this.src='https://placehold.co/400x300?text=Image+Error'">
            
            <div class="${infoClass}">
                <h3>${recipe.title}</h3>
                <p>${recipe.subtitle || recipe.description || ''}</p>
                
                <div class="${metaClass}">
                    <span class="${tagClass}">${recipe.category}</span>
                    <span>⏱ ${recipe.cooking_time_display || recipe.cook_time}</span>
                    <span style="margin-left: 10px; color: #666; font-size: 0.9em;">
                        <i class="fas fa-eye"></i> ${viewCount}
                    </span>
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
            container.innerHTML = '<p style="text-align:center; padding:20px;">No posts yet.</p>';
            return;
        }

        const posts = await response.json();
        container.innerHTML = '';

        const formatTime = (dateStr) => {
            if (!dateStr) return '';
            
            let date = new Date(dateStr);

            if (isNaN(date.getTime())) {
                date = new Date(dateStr + 'Z');
            }

            if (isNaN(date.getTime())) {
                return dateStr; 
            }

            return date.toLocaleString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        };

        posts.forEach(post => {
            const dateStr = formatTime(post.created_at);

            let avatar = `https://placehold.co/50?text=${post.author_name.charAt(0).toUpperCase()}`;
            if (post.author_avatar) {
                 if(post.author_avatar.startsWith('http')) {
                     avatar = post.author_avatar;
                 } else {
                     const { data } = supabaseClient.storage
                        .from('profile-pics') 
                        .getPublicUrl(post.author_avatar);
                     avatar = data.publicUrl;
                 }
            }
            let mediaHTML = '';
            if (post.media && post.media.url) {
                if (post.media.type === 'image') {
                    mediaHTML = `
                        <div class="post-image-container">
                            <img src="${post.media.url}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'">
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

            const postHTML = `
                <div class="feed-card">
                    <div class="post-header">
                        <img src="${avatar}" class="user-avatar-sm" alt="User" 
                             onerror="this.src='https://placehold.co/50?text=${post.author_name.charAt(0).toUpperCase()}'">
                        <div class="poster-info">
                            <h4>${post.author_name}</h4>
                            <span>${dateStr}</span> 
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

            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `community/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { data, error } = await supabaseClient
                    .storage
                    .from(forum_images)
                    .upload(fileName, selectedFile);

                if (error) throw error;

                const { data: urlData } = supabaseClient
                    .storage
                    .from(forum_images)
                    .getPublicUrl(fileName);

                mediaData = {
                    type: selectedType,
                    url: urlData.publicUrl
                };
            }

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

                document.getElementById('new-post-content').value = '';
                if(document.getElementById('clear-media')) document.getElementById('clear-media').click();

                selectedFile = null;
                selectedType = null;

                 await loadCommunityFeed(); 

                const feedContainer = document.getElementById('community-feed-container');
                const newPost = feedContainer.firstElementChild;
                if (newPost) {
                    newPost.style.transition = "background-color 0.5s ease";
                    newPost.style.backgroundColor = "#fff3cd";
                    setTimeout(() => {
                        newPost.style.backgroundColor = "#CBB9A4";
                    }, 1000);
                }


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
    const avatarImg = document.getElementById('current-user-avatar');
    
    if (!avatarImg) return;

    try {
        const response = await fetch(`${BACKEND_URL}/user/profile`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (response.ok) {
            const user = await response.json();

            const letter = user.username ? user.username.charAt(0).toUpperCase() : 'U';
            const fallbackSrc = `https://placehold.co/50?text=${letter}`;

            if (user.avatar_url) {
                if (user.avatar_url.startsWith('http')) {
                    avatarImg.src = user.avatar_url;
                } else {
                    const { data } = supabaseClient.storage
                        .from('profile-pics')
                        .getPublicUrl(user.avatar_url);
                    avatarImg.src = data.publicUrl;
                }
            } else {
                avatarImg.src = fallbackSrc;
            }

            avatarImg.onerror = function() {
                this.src = fallbackSrc;
                this.onerror = null;
            };

        } else {
            console.log("User not logged in");
            avatarImg.src = "https://placehold.co/50?text=?";
        }
    } catch (error) {
        console.error("Error loading user avatar:", error);
    }
}

async function toggleLike(postId) {
    try {
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
            console.log("Success:", data.message);
            
            loadCommunityFeed(); 
        } else {
            console.error("Like failed with status:", response.status);
            alert("Unable to like post. Check console for details.");
        }

    } catch (error) {
        console.error("Like network error:", error);
    }
}




let selectedFile = null;
let selectedType = null;

const btnPhoto = document.getElementById('btn-photo');
const fileInputPhoto = document.getElementById('file-input-photo');
const mediaPreview = document.getElementById('media-preview');
const fileNameDisplay = document.getElementById('file-name');
const btnClearMedia = document.getElementById('clear-media');

if (btnPhoto && fileInputPhoto) {
    btnPhoto.addEventListener('click', () => {
        fileInputPhoto.click(); 
    });
}

if (fileInputPhoto) {
    fileInputPhoto.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file.');
                return;
            }

            selectedFile = file;
            selectedType = 'image';

            if (fileNameDisplay) fileNameDisplay.textContent = file.name;
            if (mediaPreview) mediaPreview.style.display = 'block';
        }
    });
}

if (btnClearMedia) {
    btnClearMedia.addEventListener('click', () => {
        selectedFile = null;
        selectedType = null;
        
        if (fileInputPhoto) fileInputPhoto.value = '';
        
        if (mediaPreview) mediaPreview.style.display = 'none';
    });
}

function handleFileSelect(e, type) {
    if (e.target.files.length > 0) {
        selectedFile = e.target.files[0];
        selectedType = type;
        
        previewArea.style.display = 'block';
        fileNameDisplay.innerText = `${type.toUpperCase()}: ${selectedFile.name}`;
    }
}

const ingredientSearchForm = document.getElementById('ingredientSearchForm');

if (ingredientSearchForm) {
    ingForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        
        const inputVal = document.getElementById('ingredientSearchInput').value;
        
        if (!inputVal || inputVal.trim() === '') {
            alert("Please enter an ingredient (e.g. Chicken)!");
            return;
        }

        console.log("Searching for:", inputVal);
        await searchByIngredients(inputVal);
    });
}

window.runIngredientSearch = async function() {
    console.log(" Manual Search Triggered");
    
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
    
    await searchByIngredients(value);
}

window.handleEnterKey = function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        window.runIngredientSearch();
    }
}

async function loadUserProfile() {
    const profileName = document.getElementById('profile-name');
    const settingsUsernameInput = document.getElementById('current-username');

    if (!profileName && !settingsUsernameInput) return;

    try {
        const userResponse = await fetch(`${BACKEND_URL}/user/profile`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (!userResponse.ok) return;

        const user = await userResponse.json();

        if (profileName) {
            profileName.innerText = user.username || "Chef";
            if(document.getElementById('profile-bio')) {
                document.getElementById('profile-bio').innerText = user.bio || "No bio yet.";
            }
            
            const avatarImg = document.getElementById('profile-avatar');
            if (avatarImg && user.avatar_url) {
                 if (user.avatar_url.startsWith('http')) {
                    avatarImg.src = user.avatar_url;
                } else {
                    const { data } = supabaseClient.storage.from('profile-pics').getPublicUrl(user.avatar_url);
                    avatarImg.src = data.publicUrl;
                }
            }

            const coverImg = document.querySelector('.profile-cover img');
            if (coverImg && user.cover_url) {
                if (user.cover_url.startsWith('http')) {
                    coverImg.src = user.cover_url;
                } else {
                    const { data } = supabaseClient.storage.from('profile-pics').getPublicUrl(user.cover_url);
                    coverImg.src = data.publicUrl;
                }
            }

            loadUserPosts(user.user_id, user.username, user.avatar_url);
        }

        if (settingsUsernameInput) {
            settingsUsernameInput.value = user.username; 
        }

    } catch (error) {
        console.error("Profile load error:", error);
    }
}

async function loadUserPosts(userId, profileUsername, profileAvatar) {
    const container = document.getElementById('profile-posts-container');
    if (!container) return;

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

        if (!data.posts || data.posts.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:30px; background:white; border-radius:12px;">
                    <h3>No posts yet 🍳</h3>
                    <p>Share your first recipe or kitchen moment above!</p>
                </div>`;
            return;
        }

        const formatTime = (dateStr) => {
            if (!dateStr) return '';
            
            let date = new Date(dateStr);
            
            if (isNaN(date.getTime())) {
                date = new Date(dateStr + 'Z');
            }

            if (isNaN(date.getTime())) {
                return dateStr;
            }

            return date.toLocaleString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        };

        data.posts.sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB - dateA;
        });

        container.innerHTML = '';

        data.posts.forEach(post => {
            const dateStr = formatTime(post.created_at);

            const displayAuthor = post.author_name || profileUsername || 'Chef';
            
            let avatar = 'https://placehold.co/50?text=U';
            const avatarSource = post.author_avatar || profileAvatar;
            
            if (avatarSource) {
                 if(avatarSource.startsWith('http')) {
                     avatar = avatarSource;
                 } else {
                     const { data } = supabaseClient.storage.from('profile-pics').getPublicUrl(avatarSource);
                     avatar = data.publicUrl;
                 }
            }

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

            const cardHTML = `
                <div class="profile-feed-card" onclick="window.location.href='commentPage.html?id=${post.post_id}'">
                    <div class="p-card-header">
                        <img src="${avatar}" class="p-card-avatar" onerror="this.src='https://placehold.co/50?text=U'">
                        <div class="p-card-info">
                            <h4>${displayAuthor}</h4>
                            <span>${dateStr}</span>
                        </div>
                    </div>

                    <div class="p-card-content">
                        ${post.content}
                    </div>

                    ${mediaHTML}

                    <div class="p-card-actions">
                        <button class="p-action-btn" onclick="event.stopPropagation(); toggleLike('${post.post_id}')">
                            <i class="far fa-heart"></i> ${post.likes || 0} Likes
                        </button>
                        <button class="p-action-btn" onclick="event.stopPropagation(); window.location.href='commentPage.html?id=${post.post_id}'">
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

const CORRECT_BUCKET_NAME = 'recipe-images';
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
                    .from('comm-media')
                    .getPublicUrl(tutorial.thumbnail); 
                
                thumbnailPath = data.publicUrl;
                
                // console.log(`Tutorial: ${tutorial.title}`);
                // console.log(`DB Filename: ${tutorial.thumbnail}`);
                // console.log(`Generated URL: ${thumbnailPath}`);
            }

            const cardHTML = `
                <div class="home-tutorial-card" onclick="window.location.href='Page/search/details page/tutorialPage.html?id=${tutorial.tutorial_id}'">
              
                <div class="tutorial-img-wrap" style="height: 200px; width: 100%; position: relative; overflow: hidden;">
                    <img src="${imageSrc}" alt="${tutorial.title}" 
                         style="width: 100%; height: 100%; object-fit: cover; display: block;" 
                         onerror="this.src='https://placehold.co/400x250?text=Error'">
                  
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 2rem; color: white; text-shadow: 0 2px 5px rgba(0,0,0,0.5);">▶</div>
                </div>

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

        let thumbnailPath = 'https://placehold.co/1000x500?text=No+Image';
        
        if (tutorial.thumbnail) { 
            const { data } = supabaseClient
                .storage
                .from(TUTORIAL_BUCKET)
                .getPublicUrl(tutorial.thumbnail); 
            thumbnailPath = data.publicUrl;
        }
        
        const imgElement = document.getElementById('tutorial-thumbnail');
        if (imgElement) {
            imgElement.src = thumbnailPath;
            imgElement.onerror = null;
        }

        document.getElementById('tutorial-title').innerText = tutorial.title;
        document.getElementById('tutorial-subtitle').innerText = tutorial.subtitle || '';
        document.getElementById('tutorial-time').innerText = tutorial.duration || "-- min";
        
        const videoFrame = document.getElementById('tutorial-video-frame');
        if (videoFrame && tutorial.video_url) {
            videoFrame.src = tutorial.video_url; 
        }

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

    btn.onclick = function() {
        modal.style.display = "flex";
        const videoSrc = iframe.getAttribute('data-src') || iframe.src;
        if (videoSrc) {
            iframe.src = videoSrc;
        }
    }

    const closeModal = () => {
        modal.style.display = "none";
        iframe.src = "about:blank"; 
    }

    if (closeBtn) closeBtn.onclick = closeModal;

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
        renderTutorialCards(tutorials, container, 'details page/');
    } catch (error) {
        console.error("Error loading tutorials:", error);
    }
}


function renderTutorialCards(list, container, linkPrefix = '') {
    if (!container) return;
    container.innerHTML = '';
    
    if (!list || !Array.isArray(list)) {
        container.innerHTML = '<p>No content available.</p>';
        return;
    }

    list.forEach(tutorial => {
        let imageSrc = 'https://placehold.co/400x250?text=KusinaSeekr';
        
        if (tutorial.thumbnail) {
            if (tutorial.thumbnail.startsWith('http')) {
                imageSrc = tutorial.thumbnail;
            } else {
                const bucket = (typeof TUTORIAL_BUCKET !== 'undefined') ? TUTORIAL_BUCKET : 'comm-media'; 
                const { data } = supabaseClient.storage.from(bucket).getPublicUrl(tutorial.thumbnail); 
                imageSrc = data.publicUrl;
            }
        }

        const cardHTML = `
            <div class="home-tutorial-card" onclick="window.location.href='${linkPrefix}tutorialPage.html?id=${tutorial.tutorial_id}'">
                <!-- Wrapper ensures fixed height for image area -->
                <div class="tutorial-img-wrap" style="height: 200px; width: 100%; position: relative; overflow: hidden;">
                    <img src="${imageSrc}" alt="${tutorial.title}" 
                         style="width: 100%; height: 100%; object-fit: cover; display: block;" 
                         onerror="this.src='https://placehold.co/400x250?text=Error'">
                    <!-- Play icon centered overlay -->
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 2rem; color: white; text-shadow: 0 2px 5px rgba(0,0,0,0.5);">▶</div>
                </div>
                
                <div class="tut-content">
                    <h3>${tutorial.title}</h3>
                    <p>${tutorial.subtitle || tutorial.short_description || ''}</p>
                </div>
            </div>
        `;
        container.innerHTML += cardHTML;
    });
}

const tutorialSearchForm = document.getElementById('tutorialSearchForm');
if (tutorialSearchForm) {
    tutorialSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('tutorialSearchInput').value;
        if (query.trim()) {
            searchTutorials(query);
        } else {
            loadSearchPageTutorials();
        }
    });
}

async function toggleSave(id, type) {
    const btn = document.getElementById('save-btn');
    const icon = btn.querySelector('i');
    
    const isSaved = icon.classList.contains('fas');
    const action = isSaved ? 'unsave' : 'save';

    try {
        const response = await fetch(`${BACKEND_URL}/feature/${type}/${id}/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (response.status === 401) {
            alert("Please log in to save items.");
            window.location.href = "../Logging/login.html";
            return;
        }

        if (response.ok) {
            if (isSaved) {
                icon.classList.remove('fas');
                icon.classList.add('far');
                btn.innerHTML = `<i class="far fa-bookmark"></i> Save`;
            } else {
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
    
    const usernameForm = document.getElementById('username-form');

if (usernameForm) {
    usernameForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const currentUsernameField = document.getElementById('current-username');
        const newUsernameInput = document.getElementById('new-username');
        const newUsername = newUsernameInput.value;

        if(!newUsername.trim()) {
            alert("Please enter a valid username.");
            return;
        }

        const submitBtn = usernameForm.querySelector('button');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = "Updating...";
        submitBtn.disabled = true;

        try {
            const response = await fetch(`${BACKEND_URL}/user/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                
                body: JSON.stringify({
                    username: newUsername
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Username updated successfully!');
                currentUsernameField.value = newUsername;
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

    const passwordForm = document.getElementById('password-form');

if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassInput = document.getElementById('current-pass');
        const newPassInput = document.getElementById('new-pass');
        const confirmPassInput = document.getElementById('confirm-pass');

        const currentPass = currentPassInput.value;
        const newPass = newPassInput.value;
        const confirmPass = confirmPassInput.value;

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
            const response = await fetch(`${BACKEND_URL}/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    old_password: currentPass, 
                    new_password: newPass
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Password changed successfully!');
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

    if (btn.dataset.hasListener === "true") {
        return;
    }

    btn.dataset.hasListener = "true";

    btn.addEventListener('click', async (e) => {
        e.preventDefault();

        const isEditing = btn.classList.contains('editing');

        if (!isEditing) {
            let currentBio = bioText.innerText.trim();
            if (currentBio === "No bio yet.") currentBio = "";

            bioText.innerHTML = `<textarea id="bio-input" class="bio-textarea" placeholder="Tell us about your kitchen...">${currentBio}</textarea>`;
            
            btn.innerText = "Save Bio";
            btn.classList.add('editing');
            
        } else {
            const input = document.getElementById('bio-input');
            
            if (!input) {
                btn.classList.remove('editing');
                btn.innerText = "Edit Bio";
                return; 
            }

            const newBio = input.value;
            const originalText = btn.innerText;

            btn.innerText = "Saving...";
            btn.disabled = true;

            try {
                const response = await fetch(`${BACKEND_URL}/user/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bio: newBio })
                });

                if (response.ok) {
                    bioText.innerHTML = newBio || "No bio yet.";
                    btn.innerText = "Edit Bio";
                    btn.classList.remove('editing');
                } else {
                    alert("Failed to save bio.");
                    btn.innerText = "Save Bio";
                }
            } catch (error) {
                console.error("Bio save error:", error);
                alert("Network error.");
                btn.innerText = "Save Bio";
            } finally {
                btn.disabled = false;
            }
        }
    });
}

function setupProfileImageUploads() {
    const btnEditCover = document.querySelector('.edit-cover-btn');
    const btnEditAvatar = document.querySelector('.edit-avatar-btn');
    
    const inputCover = document.getElementById('cover-upload-input');
    const inputAvatar = document.getElementById('avatar-upload-input');
    
    const imgCover = document.querySelector('.profile-cover img');
    const imgAvatar = document.getElementById('profile-avatar');

    if (!btnEditCover || !btnEditAvatar) return;

    btnEditCover.addEventListener('click', () => inputCover.click());

    inputCover.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        await handleImageUpload(file, 'cover', btnEditCover, imgCover);
    });

    btnEditAvatar.addEventListener('click', () => inputAvatar.click());

    inputAvatar.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        await handleImageUpload(file, 'avatar', btnEditAvatar, imgAvatar);
    });
}

async function handleImageUpload(file, type, btnElement, imgElement) {
    const originalText = btnElement.innerHTML;
    btnElement.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`; 
    btnElement.disabled = true;

    try {
        const fileExt = file.name.split('.').pop();
        
        const folderName = type === 'cover' ? 'cover' : 'profiles';
        
        const fileName = `${folderName}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data, error } = await supabaseClient
            .storage
            .from('profile-pics') 
            .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabaseClient
            .storage
            .from('profile-pics')
            .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;

        const endpoint = type === 'cover' 
            ? '/user/profile-cover/update' 
            : '/user/profile-avatar/update';
        
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
            const timestamp = new Date().getTime();
            imgElement.src = `${publicUrl}?t=${timestamp}`; 
            alert(`${type === 'cover' ? 'Cover' : 'Avatar'} updated successfully!`);
        } else {
            const err = await response.json();
            alert(`Failed to update: ${err.message}`);
        }

    } catch (error) {
        console.error("Upload error:", error);
        alert("Upload failed. Check console details.");
    } finally {
        btnElement.innerHTML = originalText;
        btnElement.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {


    // HAMBURGER MENU LOGIC
    const burgerMenu = document.getElementById('burger-menu');
    const navMenu = document.getElementById('nav-menu');

    if (burgerMenu && navMenu) {
        burgerMenu.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    // 1. Auth Check (Only if not on login/signup pages)
    let isUserLoggedIn = false;
    if (!document.getElementById('loginForm') && !document.getElementById('signupForm')) {
        await checkAuth();

        const loginBtn = document.querySelector('.lg-button');
        isUserLoggedIn = loginBtn && loginBtn.innerText === "Log Out";
    }

    const isRestrictedPage = window.location.href.includes('profile.html');
    
    if (isRestrictedPage && !isUserLoggedIn) {
        alert("You need an account to access this page.");
        window.location.href = "/Page/Logging/login.html"; 
        return; // Stop execution of further loading scripts
    }

    document.body.addEventListener('click', (e) => {
        const target = e.target.closest('a');
        if (target) {
            const href = target.getAttribute('href');
            if (href && href.includes('profile.html')) {
                const loginBtn = document.querySelector('.lg-button');
                const loggedIn = loginBtn && loginBtn.innerText === "Log Out";
                
                if (!loggedIn) {
                    e.preventDefault();
                    alert("You need an account to access this page.");
                }
            }
        }
    });

    await loadRecipes();     
    loadSearchPageRecipes(); 

    if (document.querySelector('.discussion-container')) {
        
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('id');

        if (postId) {
            await loadDiscussionPage(postId);
            setupCommentForm(postId);

            loadCommenterIdentity();
        } else {
            document.querySelector('.discussion-container').innerHTML = '<p>Post not found.</p>';
        }
    }
});

async function loadDiscussionPage(postId) {
    const content = document.getElementById('discussion-container');
    const loader = document.getElementById('loading-msg');

    try {
        console.log("Fetching post:", postId); 

        const response = await fetch(`${BACKEND_URL}/feature/forums/post/${postId}`);
        
        if (!response.ok) {
            throw new Error("Failed to load post");
        }

        const data = await response.json();
        const post = data.forum_content;
        const comments = data.comments;

        const formatTime = (dateStr) => {
            if (!dateStr) return '';
            let date = new Date(dateStr);
            if (isNaN(date.getTime())) date = new Date(dateStr + 'Z');
            if (isNaN(date.getTime())) return dateStr;
            
            return date.toLocaleString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        };


        const titleEl = document.querySelector('.post-title-large');
        const bodyEl = document.querySelector('.post-body-text');
        const voteEl = document.querySelector('.vote-count');
        
        if (titleEl) titleEl.innerText = post.content.substring(0, 50) + "..."; 
        if (bodyEl) bodyEl.innerText = post.content;
        if (voteEl) voteEl.innerText = post.likes;

        const posterName = document.querySelector('.expanded-post .poster-info h4');
        const posterTime = document.querySelector('.expanded-post .poster-info span');
        const posterAvatar = document.querySelector('.expanded-post .user-avatar-sm');

        if (posterName) posterName.innerText = post.author_name || "Unknown";
        if (posterTime) posterTime.innerText = formatTime(post.created_at);

        if (posterAvatar) {
            const fallbackSrc = `https://placehold.co/50?text=${(post.author_name || 'U').charAt(0)}`;
            let avatarSrc = fallbackSrc;

            if (post.author_avatar) {
                if (post.author_avatar.startsWith('http')) {
                    avatarSrc = post.author_avatar;
                } else {
                    const { data } = supabaseClient.storage.from('profile-pics').getPublicUrl(post.author_avatar);
                    avatarSrc = data.publicUrl;
                }
            }
            posterAvatar.src = avatarSrc;
            posterAvatar.onerror = () => { posterAvatar.src = fallbackSrc; };
        }

        const imgContainer = document.querySelector('.post-image-container');
        if (imgContainer) {
            if (post.media && post.media.url) {
                imgContainer.style.display = 'flex';
                imgContainer.innerHTML = post.media.type === 'video' 
                    ? `<video controls src="${post.media.url}" style="width:100%"></video>`
                    : `<img src="${post.media.url}" alt="Post Image" style="width:100%">`;
            } else {
                imgContainer.style.display = 'none';
            }
        }

        const commentThread = document.querySelector('.comments-thread');
        if (commentThread) {
            const filterDiv = document.querySelector('.comments-filter');
            commentThread.innerHTML = filterDiv ? filterDiv.outerHTML : ''; 

            if (comments.length === 0) {
                commentThread.innerHTML += '<p style="text-align:center; margin-top:20px;">No comments yet.</p>';
            } else {
                comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

                comments.forEach(comment => {
                    const dateStr = formatTime(comment.created_at);
                    const letter = (comment.username || 'U').charAt(0).toUpperCase();
                    
                    let commenterSrc = `https://placehold.co/40?text=${letter}`;
                    if (comment.commenter_avatar) {
                        if (comment.commenter_avatar.startsWith('http')) {
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
                                    <strong>${comment.username || 'Unknown'}</strong> • <span>${dateStr}</span>
                                </div>
                                <p>${comment.comment_text}</p>
                            </div>
                        </div>
                    `;
                    commentThread.innerHTML += commentHTML;
                });
            }
        }

        if (loader) loader.style.display = 'none';
        if (content) content.style.display = 'block';

    } catch (error) {
        console.error("Error loading discussion:", error);
        if (loader) loader.innerText = "Error loading post. Please try again.";
    }
}

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
                body: JSON.stringify({ comment_content: text }) 
            });

            if (response.ok) {
                await loadDiscussionPage(postId); 
                textarea.value = '';
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
    const nameEl = document.getElementById('commenter-name');
    const avatarEl = document.getElementById('commenter-avatar');

    if (!nameEl) return;

    try {
        const response = await fetch(`${BACKEND_URL}/user/profile`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include' 
        });

        if (response.ok) {
            const user = await response.json();
            
            nameEl.innerText = user.username; 
            
            if (avatarEl && user.avatar_url) {
                 if (user.avatar_url.startsWith('http')) {
                     avatarEl.src = user.avatar_url;
                 } else {
                     const { data } = supabaseClient.storage.from('profile-pics').getPublicUrl(user.avatar_url);
                     avatarEl.src = data.publicUrl;
                 }
            }
        } else {
            nameEl.innerText = "Guest (Please Log In)";
            nameEl.style.color = "gray";
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
function setupTutorialSearch() {
    const searchForm = document.getElementById('tutorialSearchForm');
    const searchInput = document.getElementById('tutorialSearchInput');

    if (searchForm && searchInput) {
        const newForm = searchForm.cloneNode(true);
        searchForm.parentNode.replaceChild(newForm, searchForm);

        newForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const query = document.getElementById('tutorialSearchInput').value.trim();
            if (query) {
                searchTutorials(query);
            } else {
                loadSearchPageTutorials();
            }
        });
    }
}

async function searchTutorials(query) {
    const container = document.getElementById('tutorialResultsContainer');
    if (!container) return;

    container.innerHTML = '<p style="text-align:center; margin-top: 20px;">Searching...</p>';

    if (typeof BACKEND_URL === 'undefined') return console.error("BACKEND_URL missing");

    try {
        const safeQuery = encodeURIComponent(query);
        const url = `${BACKEND_URL}/feature/tutorials/search?q=${safeQuery}`;
        
        console.log("🚀 Fetching:", url); 

        const response = await fetch(url);
        
        if (!response.ok) throw new Error(`Server status: ${response.status}`);

        const tutorials = await response.json();


        if (tutorials.message || (Array.isArray(tutorials) && tutorials.length === 0)) {
            container.innerHTML = '<p style="text-align:center; margin-top: 20px;">No tutorials found.</p>';
            return;
        }

        renderTutorialCards(tutorials, container, 'details page/');

    } catch (error) {
        console.error("❌ Search failed:", error);
        container.innerHTML = `<p style="text-align:center; color: #E2725B;">Error: ${error.message}</p>`;
    }
}