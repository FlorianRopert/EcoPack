// Variables globales pour gérer la pagination des logs
let tousLesLogs = []; 
let logCurrentPage = 1;
const LOGS_PAR_PAGE = 20;

// Fonction qui génère un mot de passe aléatoire de 14 caractères
function generatePassword() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";

    // On tire 14 caractères au hasard dans la liste
    for (let i = 0; i < 14; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // On vérifie qu'il y a au moins 1 minuscule, 1 majuscule et 1 chiffre
    // Sinon on relance la fonction pour avoir un mot de passe valide
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
        return generatePassword();
    }

    // On insère le mot de passe dans l'input
    document.getElementById('tempPassword').value = password;
}

// Fonction qui génère automatiquement le login à partir du nom et prénom
function updateLoginField() {
    const nom = document.getElementById('nom').value.trim();
    const prenom = document.getElementById('prenom').value.trim();
    const loginField = document.getElementById('generatedLogin');

    if (nom && prenom) {
        // On enlève les accents et les espaces pour avoir un login propre
        const cleanNom = nom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
        const cleanPrenom = prenom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
        // Format final : nom.prenom en minuscules
        const newLogin = `${cleanNom}.${cleanPrenom}`.toLowerCase();
        loginField.value = newLogin;
    } else {
        loginField.value = '';
    }
}

// Fonction qui décode un token JWT pour récupérer les infos qu'il contient
function decoderJWT(token) {
    try {
        // Un JWT est composé de 3 parties séparées par des points, on récupère la 2ème (le payload)
        const base64Url = token.split('.')[1];
        // On remplace les caractères spécifiques au JWT pour avoir du base64 classique
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        // On décode le base64 et on gère les caractères spéciaux
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (error) {
        // Si le token est invalide on renvoie null
        return null;
    }
}

// Fonction pour se déconnecter : on supprime le token et on recharge la page
function logout() {
    localStorage.removeItem('token');
    location.reload();
}

// Charge et affiche la liste des utilisateurs depuis le serveur
async function chargerUtilisateurs() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/admin/utilisateurs', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!response.ok || !data.success) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">Erreur lors du chargement.</td></tr>';
            return;
        }

        if (data.utilisateurs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">Aucun utilisateur.</td></tr>';
            return;
        }

        data.utilisateurs.forEach(u => {
            const tr = document.createElement('tr');
            const statutClass = u.actif ? 'active' : 'inactive';
            const statutLabel = u.actif ? 'Actif' : 'Inactif';
            const toggleLabel = u.actif ? 'Désactiver' : 'Activer';
            const toggleStyle = u.actif
                ? 'background:#f59e0b;color:white;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:12px;'
                : 'background:#1f7a4d;color:white;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:12px;';

            tr.innerHTML = `
                <td>${u.nom} ${u.prenom}</td>
                <td>${u.login}</td>
                <td>${u.nom_role || '—'}</td>
                <td><span class="badge ${statutClass}">${statutLabel}</span></td>
                <td style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button style="${toggleStyle}" onclick="toggleStatut(${u.id_utilisateur}, ${u.actif ? 0 : 1}, '${u.login}')">${toggleLabel}</button>
                    <button style="background:#dc2626;color:white;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:12px;" onclick="supprimerUtilisateur(${u.id_utilisateur}, '${u.login}')">Supprimer</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Erreur chargement utilisateurs :', error);
    }
}

// Active ou désactive un compte utilisateur
async function toggleStatut(id, nouvelActif, login) {
    const action = nouvelActif ? 'activer' : 'désactiver';
    if (!confirm(`Voulez-vous vraiment ${action} le compte de "${login}" ?`)) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/admin/utilisateurs/${id}/statut`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ actif: nouvelActif })
        });
        const data = await response.json();

        if (response.ok && data.success) {
            chargerUtilisateurs();
            chargerDerniersLogs();
        } else {
            alert(`Erreur : ${data.message}`);
        }
    } catch (error) {
        alert('Impossible de joindre le serveur.');
    }
}

// Supprime définitivement un compte utilisateur
async function supprimerUtilisateur(id, login) {
    if (!confirm(`ATTENTION : voulez-vous vraiment supprimer définitivement le compte de "${login}" ?\nCette action est irréversible.`)) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/admin/utilisateurs/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok && data.success) {
            chargerUtilisateurs();
            chargerDerniersLogs();
        } else {
            alert(`Erreur : ${data.message}`);
        }
    } catch (error) {
        alert('Impossible de joindre le serveur.');
    }
}

// Fonction qui récupère les logs depuis le serveur
async function chargerDerniersLogs() {
    try {
        const token = localStorage.getItem('token');
        // On envoie une requête GET avec le token dans le header
        const response = await fetch('/logs', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // On stocke tous les logs dans la variable globale
            tousLesLogs = data.logs || [];
            // On affiche la page actuelle des logs
            afficherPageLogs(logCurrentPage);
        } else {
            console.error(data.message);
        }
    } catch (error) {
        console.error(error);
    }
}

// Echappe les caractères HTML pour éviter toute injection dans le tableau
function echapperHtml(texte) {
    return String(texte ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Formate le texte d'un log : si une réponse IA est présente, on sépare
// la question et la réponse sur deux lignes pour une meilleure lisibilité
function formaterAction(action) {
    const texte = String(action ?? '');
    const separateur = ' | Réponse IA : ';
    const index = texte.indexOf(separateur);
    if (index === -1) {
        return echapperHtml(texte);
    }
    const question = texte.substring(0, index);
    const reponse = texte.substring(index + separateur.length);
    return `${echapperHtml(question)}<br><span style="color:#1f7a4d;">Réponse IA : ${echapperHtml(reponse)}</span>`;
}

// Fonction qui affiche une page de logs dans le tableau
function afficherPageLogs(page) {
    logCurrentPage = page;
    const tbody = document.getElementById('logsTableBody');
    if (!tbody) return;

    // On vide le tableau avant de le remplir
    tbody.innerHTML = '';

    // Si pas de logs, on affiche un message
    if (tousLesLogs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888;">Aucun log disponible.</td></tr>';
        renderPaginationControls(1);
        return;
    }

    // On calcule les index pour récupérer seulement les logs de la page demandée
    const indexDebut = (page - 1) * LOGS_PAR_PAGE;
    const indexFin = indexDebut + LOGS_PAR_PAGE;
    const logsDeLaPage = tousLesLogs.slice(indexDebut, indexFin);

    // On crée une ligne dans le tableau pour chaque log
    logsDeLaPage.forEach(log => {
        const tr = document.createElement('tr');
        // Si pas d'utilisateur lié au log on met "Système"
        const utilisateurStr = log.login || '<i>Système</i>';
        tr.innerHTML = `
            <td>${log.date_action}</td>
            <td>${utilisateurStr}</td>
            <td>${formaterAction(log.action)}</td>
            <td>${log.adresse_ip}</td>
        `;
        tbody.appendChild(tr);
    });

    // On affiche les boutons de pagination
    const totalPages = Math.ceil(tousLesLogs.length / LOGS_PAR_PAGE);
    renderPaginationControls(totalPages);
}

// Fonction qui crée les boutons de pagination (précédent, numéros de page, suivant)
function renderPaginationControls(total) {
    const btnPrev = document.getElementById('prevLogPage');
    const btnNext = document.getElementById('nextLogPage');
    const containerNumbers = document.getElementById('logPagesNumbers');

    if (!btnPrev || !btnNext || !containerNumbers) return;

    // On vide les anciens boutons de pages
    containerNumbers.innerHTML = '';

    // On désactive le bouton "Précédent" si on est sur la 1ère page
    btnPrev.disabled = (logCurrentPage === 1);
    // On désactive le bouton "Suivant" si on est sur la dernière page
    btnNext.disabled = (logCurrentPage === total || total === 0);

    // Action des boutons précédent / suivant
    btnPrev.onclick = () => { if (logCurrentPage > 1) afficherPageLogs(logCurrentPage - 1); };
    btnNext.onclick = () => { if (logCurrentPage < total) afficherPageLogs(logCurrentPage + 1); };

    // On crée un bouton pour chaque numéro de page
    for (let i = 1; i <= total; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.innerText = i;
        pageBtn.style.padding = '6px 12px';
        pageBtn.style.border = '1px solid #ccc';
        pageBtn.style.borderRadius = '4px';
        pageBtn.style.cursor = 'pointer';
        
        // On met en vert le bouton de la page actuelle
        if (i === logCurrentPage) {
            pageBtn.style.background = '#1f7a4d';
            pageBtn.style.color = 'white';
            pageBtn.style.fontWeight = 'bold';
        } else {
            pageBtn.style.background = '#fff';
            pageBtn.style.color = '#333';
        }

        // Au clic on affiche la page correspondante
        pageBtn.onclick = () => {
            afficherPageLogs(i);
        };

        containerNumbers.appendChild(pageBtn);
    }
}

// Code qui s'exécute quand la page est complètement chargée
document.addEventListener('DOMContentLoaded', () => {
    // On récupère tous les éléments HTML dont on a besoin
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');
    const accessDenied = document.getElementById('accessDenied');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('errorMessage');
    
    const connectedUserName = document.getElementById('connectedUserName');
    const connectedUserRole = document.getElementById('connectedUserRole');

    // On vérifie si un token est stocké dans le localStorage
    const token = localStorage.getItem('token');

    if (token) {
        const donneesUtilisateur = decoderJWT(token);
        
        if (donneesUtilisateur) {
            // On vérifie que l'utilisateur est bien admin (id_role 7)
            if (donneesUtilisateur.id_role === 7 || donneesUtilisateur.role === 'Administrateur') {
                // Admin : on affiche la page admin
                loginScreen.style.display = 'none';
                appContainer.style.display = 'flex';
                accessDenied.style.display = 'none';
                connectedUserName.textContent = donneesUtilisateur.login;
                connectedUserRole.textContent = donneesUtilisateur.role || 'Admin';
                // On charge les données au démarrage
                chargerUtilisateurs();
                chargerDerniersLogs();
                setInterval(chargerDerniersLogs, 10000);
            } else {
                // Pas admin : on affiche le message "Accès refusé"
                loginScreen.style.display = 'none';
                appContainer.style.display = 'none';
                accessDenied.style.display = 'flex';
            }
        } else {
            // Token corrompu, on le supprime et on affiche le login
            localStorage.removeItem('token');
            loginScreen.style.display = 'flex';
            appContainer.style.display = 'none';
            accessDenied.style.display = 'none';
        }
    } else {
        // Pas de token, on affiche l'écran de connexion
        loginScreen.style.display = 'flex';
        appContainer.style.display = 'none';
        accessDenied.style.display = 'none';
    }

    // Gestion du formulaire de connexion
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            // On empêche le rechargement automatique de la page
            e.preventDefault();
            errorMessage.style.display = 'none';

            const loginValue = document.querySelector('#loginForm input[name="login"]').value.trim();
            const passwordValue = document.querySelector('#loginForm input[name="password"]').value.trim();

            try {
                // On envoie les identifiants au serveur
                const response = await fetch('/connexion', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ login: loginValue, password: passwordValue })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    const infos = decoderJWT(data.token);

                    // On vérifie si la personne qui se connecte est admin
                    if (infos && (infos.id_role === 7 || infos.role === 'Administrateur')) {
                        // Admin : on stocke le token et on affiche la page admin
                        localStorage.setItem('token', data.token);
                        connectedUserName.textContent = infos.login;
                        connectedUserRole.textContent = infos.role || 'Admin';
                        loginScreen.style.display = 'none';
                        appContainer.style.display = 'flex';
                        accessDenied.style.display = 'none';
                        loginForm.reset();
                        chargerUtilisateurs();
                        chargerDerniersLogs();
                        setInterval(chargerDerniersLogs, 10000);
                    } else {
                        // Pas admin : on affiche le message "Accès refusé"
                        loginScreen.style.display = 'none';
                        appContainer.style.display = 'none';
                        accessDenied.style.display = 'flex';
                        localStorage.setItem('token', data.token);
                    }
                } else {
                    // Erreur de connexion
                    errorMessage.textContent = data.message || 'Identifiants incorrects.';
                    errorMessage.style.display = 'block';
                }

            } catch (error) {
                errorMessage.textContent = 'Impossible de joindre le serveur.';
                errorMessage.style.display = 'block';
            }
        });
    }

    // Gestion du formulaire de création d'utilisateur
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // On récupère toutes les valeurs des champs du formulaire
            const nom = document.getElementById('nom').value.trim();
            const prenom = document.getElementById('prenom').value.trim();
            const email = document.getElementById('email').value.trim();
            const id_role = document.getElementById('role').value;
            const password = document.getElementById('tempPassword').value;

            // On vérifie qu'un mot de passe a bien été généré
            if (!password) {
                alert("Veuillez d'abord générer un mot de passe temporaire.");
                return;
            }

            try {
                const token = localStorage.getItem('token');
                // On envoie les infos au serveur avec le token d'authentification
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
                    // Compte créé avec succès, on affiche les identifiants
                    alert(`Compte créé avec succès !\n\nIdentifiant unique : ${data.login}\nMot de passe : ${password}`);
                    registerForm.reset();
                    document.getElementById('generatedLogin').value = '';
                    // On rafraîchit la liste des utilisateurs et les logs
                    chargerUtilisateurs();
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