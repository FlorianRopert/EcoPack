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

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');

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
            console.error('Erreur réseau :', error);
            alert('Impossible de joindre le serveur.');
        }
    });
});