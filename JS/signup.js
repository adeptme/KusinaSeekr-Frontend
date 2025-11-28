const AUTH_URL = 'http://127.0.0.1:5000'; 

const signupForm = document.getElementById('signupForm');

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        
        // ... (your getting values code) ...
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const currentFrontendUrl = window.location.origin;


        try {
            const response = await fetch(`${AUTH_URL}/auth/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password,
                    frontend_url: currentFrontendUrl
                })
            });

            const data = await response.json();

            if (response.ok) {
                // ✅ SUCCESS: Redirect to your 2FA / Check Email page
                console.log("Signup success, redirecting to 2FA page...");
                window.location.href = '2fa.html'; 
            } else {
                alert("Error: " + data.message);
            }

        } catch (error) {
            console.error("Signup Error:", error);
            alert("Could not connect to the backend.");
        } finally {
            submitBtn.innerText = originalBtnText;
            submitBtn.disabled = false;
        }
    });
}