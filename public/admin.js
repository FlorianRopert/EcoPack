let tousLesLogs = []; 
let logCurrentPage = 1;
const LOGS_PAR_PAGE = 20;

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

function updateLoginField() {
    const nom = document.getElementById('nom').value.trim();
    const prenom = document.getElementById('prenom').value.trim();
    const loginField = document.getElementById('generatedLogin');

    if (nom && prenom) {
        const cleanNom = nom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
        const cleanPrenom = prenom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
        const newLogin = `${cleanNom}.${cleanPrenom}`.toLowerCase();
        loginField.value = newLogin;
    } else {
        loginField.value = '';
    }
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

async function chargerDerniersLogs() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/logs', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            tousLesLogs = data.logs || [];
            afficherPageLogs(logCurrentPage);
        } else {
            console.error(data.message);
        }
    } catch (error) {
        console.error(error);
    }
}

function afficherPageLogs(page) {
    logCurrentPage = page;
    const tbody = document.getElementById('logsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (tousLesLogs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888;">Aucun log disponible.</td></tr>';
        renderPaginationControls(1);
        return;
    }

    const indexDebut = (page - 1) * LOGS_PAR_PAGE;
    const indexFin = indexDebut + LOGS_PAR_PAGE;
    const logsDeLaPage = tousLesLogs.slice(indexDebut, indexFin);

    logsDeLaPage.forEach(log => {
        const tr = document.createElement('tr');
        const utilisateurStr = log.login || '<i>Système</i>';
        tr.innerHTML = `
            <td>${log.date_action}</td>
            <td>${utilisateurStr}</td>
            <td>${log.action}</td>
            <td>${log.adresse_ip}</td>
        `;
        tbody.appendChild(tr);
    });

    const totalPages = Math.ceil(tousLesLogs.length / LOGS_PAR_PAGE);
    renderPaginationControls(totalPages);
}

function renderPaginationControls(total) {
    const btnPrev = document.getElementById('prevLogPage');
    const btnNext = document.getElementById('nextLogPage');
    const containerNumbers = document.getElementById('logPagesNumbers');

    if (!btnPrev || !btnNext || !containerNumbers) return;

    containerNumbers.innerHTML = '';

    btnPrev.disabled = (logCurrentPage === 1);
    btnNext.disabled = (logCurrentPage === total || total === 0);

    btnPrev.onclick = () => { if (logCurrentPage > 1) afficherPageLogs(logCurrentPage - 1); };
    btnNext.onclick = () => { if (logCurrentPage < total) afficherPageLogs(logCurrentPage + 1); };

    for (let i = 1; i <= total; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.innerText = i;
        pageBtn.style.padding = '6px 12px';
        pageBtn.style.border = '1px solid #ccc';
        pageBtn.style.borderRadius = '4px';
        pageBtn.style.cursor = 'pointer';
        
        if (i === logCurrentPage) {
            pageBtn.style.background = '#1f7a4d';
            pageBtn.style.color = 'white';
            pageBtn.style.fontWeight = 'bold';
        } else {
            pageBtn.style.background = '#fff';
            pageBtn.style.color = '#333';
        }

        pageBtn.onclick = () => {
            afficherPageLogs(i);
        };

        containerNumbers.appendChild(pageBtn);
    }
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
                chargerDerniersLogs();
                // Rafraîchir les logs toutes les 10 secondes
                setInterval(chargerDerniersLogs, 10000);
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

            const loginValue = document.querySelector('#loginForm input[name="login"]').value.trim();
            const passwordValue = document.querySelector('#loginForm input[name="password"]').value.trim();

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
                        chargerDerniersLogs();
                        // Rafraîchir les logs toutes les 10 secondes
                        setInterval(chargerDerniersLogs, 10000);
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
                const token = localStorage.getItem('token');
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ nom, prenom, email, id_role, password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    alert(`Compte créé avec succès !\n\nIdentifiant unique : ${data.login}\nMot de passe : ${password}`);
                    registerForm.reset();
                    document.getElementById('generatedLogin').value = '';
                    chargerDerniersLogs();
                } else {
                    alert(`Erreur : ${data.message}`);
                }

            } catch (error) {
                alert('Impossible de joindre le serveur.');
            }
        });
    }
});