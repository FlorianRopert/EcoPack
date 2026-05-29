# Projet EcoPack — Application mobile chatbot d'entreprise

## 🎯 Contexte général

Tu vas développer **EcoPack_app**, une application mobile (Android + iOS) pour l'entreprise Ecopack. C'est un **client mobile** qui se connecte à un backend Node.js existant pour interagir avec un chatbot d'entreprise basé sur un système RAG (Retrieval-Augmented Generation).

L'utilisateur (un employé d'Ecopack) :
1. Se connecte avec son login/mot de passe
2. Pose des questions au chatbot via une interface de tchat
3. Si admin (id_role = 7), peut gérer les utilisateurs et consulter les logs

## 🛠 Stack technique

- **Framework** : Qt 6.11 / QML / C++17
- **Build system** : CMake
- **Plateformes cibles** : Desktop (dev), Android (prod), iOS (futur)
- **Communication** : HTTP REST avec JWT (pas de WebSocket côté mobile)
- **Modules Qt requis** : `Quick`, `Network`

## 🌐 Backend Node.js — Routes API disponibles

Le serveur tourne sur `http://172.29.18.171:3000` (à rendre configurable).

| Méthode | Route | Auth | Body | Réponse |
|---|---|---|---|---|
| POST | `/connexion` | ❌ | `{login, password}` | `{success, token, message}` |
| POST | `/register` | JWT admin | `{nom, prenom, email, id_role, password}` | `{success, id_utilisateur, login}` |
| GET | `/getrole` | JWT | — | `{success, role: {id_role, nom_role, description}}` |
| POST | `/chat` | JWT | `{question}` | `{success, reponse}` |
| GET | `/logs` | JWT admin | — | `{success, logs: [...]}` |
| GET | `/admin/utilisateurs` | JWT admin | — | `{success, utilisateurs: [...]}` |
| PATCH | `/admin/utilisateurs/:id/statut` | JWT admin | `{actif: bool}` | `{success, message}` |
| DELETE | `/admin/utilisateurs/:id` | JWT admin | — | `{success, message}` |

### Format JWT
Le payload du JWT contient :
```json
{
  "id_utilisateur": 1,
  "login": "nom.prenom",
  "id_role": 7,
  "role": "admin",
  "exp": 1234567890
}
```
**Rôle admin = id_role 7**. Token valable 7 jours.

### Header d'authentification
```
Authorization: Bearer <token>
```

## 📁 Structure de fichiers

```
EcoPack_app/
├── CMakeLists.txt
├── main.cpp
├── CONTEXT.md
├── qml/
│   ├── Main.qml
│   ├── SplashScreen.qml
│   ├── LoginPage.qml
│   ├── ChatPage.qml
│   ├── MessageBubble.qml
│   └── AdminPage.qml
├── src/
│   ├── ApiClient.h
│   ├── ApiClient.cpp
│   ├── AuthManager.h
│   └── AuthManager.cpp
└── android/
    └── AndroidManifest.xml
```

## 🎨 Charte graphique Ecopack

- **Vert principal** : `#2CDE85`
- **Vert foncé** : `#00414A`
- **Gris clair** : `#F5F5F5`
- **Gris bulle bot** : `#E8E8E8`
- **Texte sombre** : `#222`
- **Erreur** : `red`
