const AUTH_URL = 'https://kusinaseekr-backend.onrender.com';
"const AUTH_URL = 'http://localhost:5000';"

const signupForm = document.getElementById('signupForm');

if (signupForm) {

    const submitBtn = document.querySelector('#signupForm .auth-btn'); 
    let originalBtnText = submitBtn ? submitBtn.innerText : "Sign Up";

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const currentFrontendUrl = window.location.origin;

        if (submitBtn) {
            submitBtn.innerText = "Processing...";
            submitBtn.disabled = true;
        }

        try {
            const response = await fetch(`${AUTH_URL}/auth/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    frontend_url: currentFrontendUrl
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert("Success! Check your inbox for the verification link.");
                window.location.href = '2fa.html'; 
            } else {
                alert("Sign Up Failed: " + (data.message || data.error));
            }

        } catch (error) {
            alert("Could not connect to the backend.");
        } finally {
            if (submitBtn) {
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
            }
        }
    });
}