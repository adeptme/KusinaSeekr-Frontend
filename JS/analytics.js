const BACKEND_URL = 'https://kusinaseekr-backend.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    loadAnalyticsData();
});

let dailyViewsChartInstance = null; 

async function loadAnalyticsData() {
    try {
        const response = await fetch(`${BACKEND_URL}/feature/analytics`); 
        if (!response.ok) throw new Error('Failed to fetch analytics');

        const data = await response.json();
        console.log("Analytics Data:", data);

        updateMetrics(data);

        renderLoginChart(data.daily_logins);

        renderTotalViewsChart(data.total_recipe_views);

        setupDailyRecipeChart(data.daily_views_per_recipe);

    } catch (error) {
        console.error("Error:", error);
        document.querySelector('.analytics-container').innerHTML = 
            `<p style="text-align:center; color:red; margin-top:50px;">Error loading data. Server error occurred.</p>`;
    }
}

function updateMetrics(data) {
    const totalLogins = data.daily_logins.data.reduce((a, b) => a + b, 0);
    document.getElementById('total-logins-count').innerText = totalLogins;

    const labels = data.total_recipe_views.labels;
    const views = data.total_recipe_views.data;
    
    if (labels.length > 0) {
        const maxIndex = views.indexOf(Math.max(...views));
        document.getElementById('top-recipe-name').innerText = labels[maxIndex];
        
        const totalViews = views.reduce((a, b) => a + b, 0);
        document.getElementById('total-views-count').innerText = totalViews;
    } else {
        document.getElementById('top-recipe-name').innerText = "N/A";
        document.getElementById('total-views-count').innerText = "0";
    }
}

function renderLoginChart(loginData) {
    const ctx = document.getElementById('dailyLoginsChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: loginData.labels, 
            datasets: [{
                label: 'Logins',
                data: loginData.data, 
                borderColor: '#E2725B',
                backgroundColor: 'rgba(226, 114, 91, 0.1)',
                borderWidth: 2,
                tension: 0.4, 
                fill: true,
                pointRadius: 3 
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, 
            plugins: {
                legend: { display: false },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderTotalViewsChart(viewsData) {
    const ctx = document.getElementById('totalViewsChart').getContext('2d');

    // Filter out recipes with 0 views if there are recipes with views >= 1
    let filteredLabels = viewsData.labels;
    let filteredData = viewsData.data;
    
    const hasNonZeroViews = viewsData.data.some(count => count > 0);
    
    if (hasNonZeroViews) {
        const filtered = viewsData.labels.reduce((acc, label, index) => {
            if (viewsData.data[index] > 0) {
                acc.labels.push(label);
                acc.data.push(viewsData.data[index]);
            }
            return acc;
        }, { labels: [], data: [] });
        
        filteredLabels = filtered.labels;
        filteredData = filtered.data;
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: filteredLabels,
            datasets: [{
                label: 'Total Views',
                data: filteredData,
                backgroundColor: '#CBB9A4',
                hoverBackgroundColor: '#E2725B',
                borderRadius: 4,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { beginAtZero: true },
                y: { grid: { display: false } }
            }
        }
    });
}

function setupDailyRecipeChart(dailyDataMap) {
    const select = document.getElementById('recipeSelect');
    const recipeNames = Object.keys(dailyDataMap);

    if (recipeNames.length === 0) {
        select.innerHTML = '<option>No data available</option>';
        return;
    }

    recipeNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.innerText = name;
        select.appendChild(option);
    });

    select.value = recipeNames[0];
    renderDailyRecipeChart(dailyDataMap[recipeNames[0]]);

    select.addEventListener('change', (e) => {
        const selectedRecipe = e.target.value;
        const newData = dailyDataMap[selectedRecipe];
        renderDailyRecipeChart(newData);
    });
}

function renderDailyRecipeChart(recipeData) {
    const ctx = document.getElementById('dailyViewsChart').getContext('2d');

    if (dailyViewsChartInstance) {
        dailyViewsChartInstance.destroy();
    }

    dailyViewsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: recipeData.labels,
            datasets: [{
                label: 'Views',
                data: recipeData.data,
                borderColor: '#4A90E2',
                backgroundColor: 'rgba(74, 144, 226, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, 
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            }
        }
    });
}