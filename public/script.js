// Fonction qui décode un token JWT pour récupérer les infos qu'il contient (login, rôle, etc.)
function decoderJWT(token) {
    try {
        // Un JWT est composé de 3 parties séparées par des points, on récupère la 2ème (le payload)
        const base64Url = token.split('.')[1];
        // On remplace les caractères spécifiques au JWT pour avoir du base64 classique
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        // On décode le base64 et on gère les caractères spéciaux (accents, etc.)
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (error) {
        // Si le token est invalide ou corrompu on renvoie null
        return null;
    }
}

// Fonction qui affiche un nouveau message dans le chat (côté utilisateur ou côté bot)
function ajouterMessage(texte, type) {
    const messages = document.getElementById('messagesContainer');
    const div = document.createElement('div');
    div.className = `message ${type}`;
    // On crée la bulle avec le nom de l'expéditeur + le texte
    div.innerHTML = `
        <div class="bubble">
            <strong>${type === 'user' ? 'Vous' : 'Assistant EcoPack'}</strong>
            ${texte}
        </div>
    `;
    messages.appendChild(div);
    // On scrolle automatiquement en bas pour voir le dernier message
    messages.scrollTop = messages.scrollHeight;
}

// Fonction qui envoie la question au serveur et affiche la réponse de l'IA
async function envoyerQuestion() {
    const input = document.getElementById('chatInput');
    const question = input.value.trim();

    // On ignore si la question est vide
    if (!question) return;

    // On affiche la question de l'utilisateur dans le chat
    ajouterMessage(question, 'user');
    input.value = '';

    // On affiche un message d'attente pendant que l'IA réfléchit
    ajouterMessage('⏳ Recherche en cours...', 'bot');
    const messages = document.getElementById('messagesContainer');
    const loadingMsg = messages.lastChild;

    try {
        // On récupère le token de connexion stocké dans le localStorage
        const token = localStorage.getItem('token');
        // On envoie la question au serveur Node.js qui va contacter le RAG
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ question })
        });

        const data = await response.json();
        // On supprime le message "Recherche en cours"
        loadingMsg.remove();

        // Si tout s'est bien passé on affiche la réponse de l'IA
        if (response.ok && data.success) {
            ajouterMessage(data.reponse, 'bot');
        } else {
            ajouterMessage(`Erreur : ${data.message}`, 'bot');
        }
    } catch (error) {
        loadingMsg.remove();
        ajouterMessage('Impossible de joindre le serveur.', 'bot');
    }
}

// Code qui s'exécute quand la page est complètement chargée
document.addEventListener('DOMContentLoaded', () => {
    // On récupère tous les éléments HTML dont on a besoin
    const loginScreen = document.getElementById('loginScreen');
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const connectedUserName = document.getElementById('connectedUserName');
    const connectedUserRole = document.getElementById('connectedUserRole');

    // On vérifie si un token est déjà stocké (utilisateur déjà connecté)
    const token = localStorage.getItem('token');

    if (token) {
        // Si le token est valide, on cache l'écran de connexion et on affiche les infos de l'utilisateur
        const donneesUtilisateur = decoderJWT(token);
        if (donneesUtilisateur) {
            loginScreen.style.display = 'none';
            connectedUserName.textContent = donneesUtilisateur.login;
            connectedUserRole.textContent = donneesUtilisateur.role || 'Non défini';
        } else {
            // Token corrompu, on le supprime et on affiche le login
            localStorage.removeItem('token');
            loginScreen.style.display = 'flex';
        }
    } else {
        // Pas de token, on affiche l'écran de connexion
        loginScreen.style.display = 'flex';
    }

    // Gestion du formulaire de connexion
    loginForm.addEventListener('submit', async (e) => {
        // On empêche le rechargement automatique de la page
        e.preventDefault();
        errorMessage.style.display = 'none';

        const loginValue = document.getElementById('login').value.trim();
        const passwordValue = document.getElementById('password').value;

        try {
            // On envoie les identifiants au serveur pour vérification
            const response = await fetch('/connexion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: loginValue, password: passwordValue })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Connexion réussie, on stocke le token dans le localStorage
                localStorage.setItem('token', data.token);
                const infos = decoderJWT(data.token);

                // On affiche le nom et le rôle de l'utilisateur connecté
                if (infos) {
                    connectedUserName.textContent = infos.login;
                    connectedUserRole.textContent = infos.role || 'Non défini';
                }

                // On cache l'écran de connexion et on vide le formulaire
                loginScreen.style.display = 'none';
                loginForm.reset();
            } else {
                // Erreur de connexion, on affiche le message
                errorMessage.textContent = data.message || 'Identifiants incorrects.';
                errorMessage.style.display = 'block';
            }

        } catch (error) {
            errorMessage.textContent = 'Impossible de joindre le serveur.';
            errorMessage.style.display = 'block';
        }
    });

    // Gestion du bouton "Envoyer" et de la touche Entrée pour le chat
    const sendBtn = document.getElementById('sendBtn');
    const chatInput = document.getElementById('chatInput');

    // Quand on clique sur "Envoyer" on envoie la question
    if (sendBtn) {
        sendBtn.addEventListener('click', envoyerQuestion);
    }

    // Quand on appuie sur Entrée dans le champ texte on envoie aussi la question
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                envoyerQuestion();
            }
        });
    }
});

// Fonction pour se déconnecter : on supprime le token et on recharge la page
function logout() {
    localStorage.removeItem('token');
    location.reload();
}