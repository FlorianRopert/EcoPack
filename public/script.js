// Fonction pour décoder la partie "Payload" d'un token JWT sans bibliothèque externe
function decoderJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error("Impossible de décoder le token JWT :", error);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('loginScreen');
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    
    const connectedUserName = document.getElementById('connectedUserName');
    const connectedUserRole = document.getElementById('connectedUserRole');

    const token = localStorage.getItem('token');

    if (token) {
        const donneesUtilisateur = decoderJWT(token);
        if (donneesUtilisateur) {
            loginScreen.style.display = 'none';
            connectedUserName.textContent = donneesUtilisateur.login; // ou son ID selon tes besoins
            connectedUserRole.textContent = donneesUtilisateur.role || 'Non défini';
        } else {
            localStorage.removeItem('token');
            loginScreen.style.display = 'flex';
        }
    } else {
        loginScreen.style.display = 'flex';
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.style.display = 'none';

        const loginValue = document.getElementById('login').value.trim();
        const passwordValue = document.getElementById('password').value;

        try {
            const response = await fetch('/connexion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: loginValue, password: passwordValue })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                localStorage.setItem('token', data.token);

                const infos = decoderJWT(data.token);

                if (infos) {
                    connectedUserName.textContent = infos.login;
                    connectedUserRole.textContent = infos.role || 'Non défini';
                }

                loginScreen.style.display = 'none';
                loginForm.reset();
            } else {
                errorMessage.textContent = data.message || 'Identifiants incorrects.';
                errorMessage.style.display = 'block';
            }

        } catch (error) {
            console.error('Erreur réseau :', error);
            errorMessage.textContent = 'Impossible de joindre le serveur.';
            errorMessage.style.display = 'block';
        }
    });
});

function logout() {
    localStorage.removeItem('token');
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
        loginScreen.style.display = 'flex';
    } else {
        window.location.href = '/';
    }
}