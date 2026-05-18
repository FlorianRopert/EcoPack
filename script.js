// =======================
// UTILISATEURS DE TEST
// =======================
let users = JSON.parse(localStorage.getItem("users")) || [
  {
    nom: "Admin EcoPack",
    login: "admin",
    password: "admin123",
    role: "Administrateur",
    actif: true
  },
  {
    nom: "Jean Dupont",
    login: "jdupont",
    password: "password123",
    role: "Ouvrier",
    actif: true
  }
];

function saveUsers() {
  localStorage.setItem("users", JSON.stringify(users));
}

// =======================
// LOGIN
// =======================
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const login = document.getElementById("login").value.trim();
    const password = document.getElementById("password").value;
    const errorMessage = document.getElementById("errorMessage");

    const user = users.find(
      u => u.login === login && u.password === password && u.actif === true
    );

    if (!user) {
      errorMessage.style.display = "block";
      return;
    }

    localStorage.setItem("connectedUser", JSON.stringify(user));

    if (user.role === "Administrateur") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "chatbot.html";
    }
  });
}

// =======================
// DÉCONNEXION
// =======================
function logout() {
  localStorage.removeItem("connectedUser");
  window.location.href = "login.html";
}

// =======================
// CHATBOT
// =======================
const chatInput = document.querySelector(".input-row input");
const chatButton = document.querySelector(".input-row button");
const messages = document.querySelector(".messages");

if (chatInput && chatButton && messages) {
  chatButton.addEventListener("click", sendMessage);

  chatInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      sendMessage();
    }
  });
}

function sendMessage() {
  const question = chatInput.value.trim();

  if (question === "") return;

  addMessage("user", "Vous", question);

  chatInput.value = "";

  setTimeout(() => {
    let response = generateFakeResponse(question);
    addMessage("bot", "Assistant EcoPack", response);
  }, 500);
}

function addMessage(type, author, text) {
  const message = document.createElement("div");
  message.className = `message ${type}`;

  message.innerHTML = `
    <div class="bubble">
      <strong>${author}</strong>
      ${text}
    </div>
  `;

  messages.appendChild(message);
  messages.scrollTop = messages.scrollHeight;
}

function generateFakeResponse(question) {
  const q = question.toLowerCase();

  if (q.includes("salaire") || q.includes("contrat")) {
    return "Vous n’êtes pas autorisé à accéder à cette information.";
  }

  if (q.includes("sécurité") || q.includes("machine")) {
    return "D’après les documents autorisés, vous devez porter les EPI obligatoires et vérifier l’arrêt d’urgence avant utilisation.";
  }

  if (q.includes("horaire")) {
    return "Les horaires dépendent de votre équipe. Consultez votre planning ou contactez votre chef d’équipe.";
  }

  return "Je ne dispose pas de cette information dans les documents autorisés.";
}

// =======================
// ADMIN : AJOUT UTILISATEUR
// =======================
const adminForm = document.querySelector(".admin-form");
const userTable = document.querySelector(".admin-table tbody");

if (adminForm && userTable) {
  afficherUtilisateurs();

  const createButton = document.querySelector(".admin-button");

  createButton.addEventListener("click", function () {
    const inputs = adminForm.querySelectorAll("input");
    const role = adminForm.querySelector("select").value;

    const nom = inputs[0].value.trim();
    const prenom = inputs[1].value.trim();
    const email = inputs[2].value.trim();
    const login = inputs[3].value.trim();
    const password = inputs[4].value.trim();

    if (!nom || !prenom || !email || !login || !password) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    users.push({
      nom: `${prenom} ${nom}`,
      login: login,
      password: password,
      role: role,
      actif: true
    });

    saveUsers();
    afficherUtilisateurs();
    adminForm.reset();

    alert("Utilisateur créé avec succès.");
  });
}

function afficherUtilisateurs() {
  userTable.innerHTML = "";

  users.forEach((user, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${user.nom}</td>
      <td>${user.login}</td>
      <td>${user.role}</td>
      <td>
        <span class="badge ${user.actif ? "active" : "inactive"}">
          ${user.actif ? "Actif" : "Inactif"}
        </span>
      </td>
      <td>
        <button class="small-btn" onclick="toggleUser(${index})">
          ${user.actif ? "Désactiver" : "Activer"}
        </button>
      </td>
    `;

    userTable.appendChild(row);
  });
}

function toggleUser(index) {
  users[index].actif = !users[index].actif;
  saveUsers();
  afficherUtilisateurs();
}
function generatePassword() {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const specials = "@#$!%&*";

  let passwordChars = [];

  // 5 majuscules
  for (let i = 0; i < 5; i++) {
    passwordChars.push(
      uppercase.charAt(Math.floor(Math.random() * uppercase.length))
    );
  }

  // 3 minuscules
  for (let i = 0; i < 3; i++) {
    passwordChars.push(
      lowercase.charAt(Math.floor(Math.random() * lowercase.length))
    );
  }

  // 2 chiffres
  for (let i = 0; i < 2; i++) {
    passwordChars.push(
      numbers.charAt(Math.floor(Math.random() * numbers.length))
    );
  }

  // 2 caractères spéciaux
  for (let i = 0; i < 2; i++) {
    passwordChars.push(
      specials.charAt(Math.floor(Math.random() * specials.length))
    );
  }

  // Mélanger le tableau
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  // Convertir en chaîne
  const password = passwordChars.join("");

  // Insérer dans le champ
  const input = document.getElementById("tempPassword");
  if (input) {
    input.value = password;
  }
}