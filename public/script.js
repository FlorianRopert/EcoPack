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

function ajouterMessage(texte, type) {
    const messages = document.getElementById('messagesContainer');
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = `
        <div class="bubble">
            <strong>${type === 'user' ? 'Vous' : 'Assistant EcoPack'}</strong>
            ${texte}
        </div>
    `;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

async function envoyerQuestion() {
    const input = document.getElementById('chatInput');
    const question = input.value.trim();

    if (!question) return;

    ajouterMessage(question, 'user');
    input.value = '';

    ajouterMessage('⏳ Recherche en cours...', 'bot');
    const messages = document.getElementById('messagesContainer');
    const loadingMsg = messages.lastChild;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ question })
        });

        const data = await response.json();
        loadingMsg.remove();

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
            connectedUserName.textContent = donneesUtilisateur.login;
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
            errorMessage.textContent = 'Impossible de joindre le serveur.';
            errorMessage.style.display = 'block';
        }
    });

    // Gestion du chat
    const sendBtn = document.getElementById('sendBtn');
    const chatInput = document.getElementById('chatInput');

    if (sendBtn) {
        sendBtn.addEventListener('click', envoyerQuestion);
    }

    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                envoyerQuestion();
            }
        });
    }
});

function logout() {
    localStorage.removeItem('token');
    location.reload();
}