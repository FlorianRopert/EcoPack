function generatePassword() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";

    for (let i = 0; i < 14; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
        return generatePassword();
    }

    document.getElementById('tempPassword').value = password;
}

function decoderJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (error) {
        return null;
    }
}

function logout() {
    localStorage.removeItem('token');
    location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');
    const accessDenied = document.getElementById('accessDenied');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('errorMessage');
    
    const connectedUserName = document.getElementById('connectedUserName');
    const connectedUserRole = document.getElementById('connectedUserRole');

    const token = localStorage.getItem('token');

    if (token) {
        const donneesUtilisateur = decoderJWT(token);
        
        if (donneesUtilisateur) {
            if (donneesUtilisateur.id_role === 7 || donneesUtilisateur.role === 'Administrateur') {
                loginScreen.style.display = 'none';
                appContainer.style.display = 'flex';
                accessDenied.style.display = 'none';
                connectedUserName.textContent = donneesUtilisateur.login;
                connectedUserRole.textContent = donneesUtilisateur.role || 'Admin';
            } else {
                loginScreen.style.display = 'none';
                appContainer.style.display = 'none';
                accessDenied.style.display = 'flex';
            }
        } else {
            localStorage.removeItem('token');
            loginScreen.style.display = 'flex';
            appContainer.style.display = 'none';
            accessDenied.style.display = 'none';
        }
    } else {
        loginScreen.style.display = 'flex';
        appContainer.style.display = 'none';
        accessDenied.style.display = 'none';
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMessage.style.display = 'none';

            const loginValue = document.getElementById('login').value.trim();
            const passwordValue = document.getElementById('password').value.trim();

            try {
                const response = await fetch('/connexion', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ login: loginValue, password: passwordValue })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    const infos = decoderJWT(data.token);

                    if (infos && (infos.id_role === 7 || infos.role === 'Administrateur')) {
                        localStorage.setItem('token', data.token);
                        connectedUserName.textContent = infos.login;
                        connectedUserRole.textContent = infos.role || 'Admin';
                        loginScreen.style.display = 'none';
                        appContainer.style.display = 'flex';
                        accessDenied.style.display = 'none';
                        loginForm.reset();
                    } else {
                        loginScreen.style.display = 'none';
                        appContainer.style.display = 'none';
                        accessDenied.style.display = 'flex';
                        localStorage.setItem('token', data.token);
                    }
                } else {
                    errorMessage.textContent = data.message || 'Identifiants incorrects.';
                    errorMessage.style.display = 'block';
                }

            } catch (error) {
                errorMessage.textContent = 'Impossible de joindre le serveur.';
                errorMessage.style.display = 'block';
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nom = document.getElementById('nom').value.trim();
            const prenom = document.getElementById('prenom').value.trim();
            const email = document.getElementById('email').value.trim();
            const id_role = document.getElementById('role').value;
            const password = document.getElementById('tempPassword').value;

            if (!password) {
                alert("Veuillez d'abord générer un mot de passe temporaire.");
                return;
            }

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nom, prenom, email, id_role, password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    alert(`Compte créé avec succès !\n\nIdentifiant unique : ${data.login}\nMot de passe : ${password}`);
                    registerForm.reset();
                } else {
                    alert(`Erreur : ${data.message}`);
                }

            } catch (error) {
                alert('Impossible de joindre le serveur.');
            }
        });
    }
});