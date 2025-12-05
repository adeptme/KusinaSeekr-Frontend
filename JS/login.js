const BACKEND_URL = getEnvVariable('BACKEND_URL');
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = document.querySelector('button[type="submit"]');

        const originalBtnText = submitBtn.innerText;
        submitBtn.innerText = "Verifying...";
        submitBtn.disabled = true;

        try {
            const response = await fetch(`${BACKEND_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                console.log("Login credentials valid. Sending to 2FA page...");
                window.location.href = '2fa.html'; 
            } else {
                alert("Login Failed: " + data.message);
            }

        } catch (error) {
            console.error("Login Error:", error);
            alert("Could not connect to the backend.");
        } finally {
            submitBtn.innerText = originalBtnText;
            submitBtn.disabled = false;
        }
    });
}