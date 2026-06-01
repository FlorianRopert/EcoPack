require('dotenv').config();
const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
// Clé secrète utilisée pour créer les tokens JWT (stocker dans le fichier .env )
const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_env';

// Middleware pour lire le JSON envoyé par le front
app.use(express.json());

// Connexion à la base de données avec les infos du .env
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

connection.connect((err) => {
    if (err) { console.error('Erreur de connexion à la base de données:', err); return; }
    console.log('Connecté à la base de données MySQL');
});

// Middleware qui vérifie le token JWT envoyé par le front
function authMiddleware(req, res, next) {
    // On récupère le token dans le header Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, message: 'Token manquant' });

    try {
        // On vérifie que le token est valide avec la clé secrète
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // On met les infos de l'utilisateur dans req.user
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: 'Token invalide ou expiré' });
    }
}

// Route de connexion 
app.post('/connexion', async (req, res) => {
    const { login, password } = req.body;
    const ipAdresse = req.ip || req.connection.remoteAddress;

    // Vérification que tous les champs sont remplis
    if (!login || !password) {
        return res.status(400).json({ success: false, message: 'Identifiant et mot de passe requis.' });
    }

    // Requête SQL pour récupérer l'utilisateur + son rôle
    const query = `
        SELECT u.id_utilisateur, u.login, u.mot_de_passe, u.actif, r.id_role, r.nom_role 
        FROM utilisateur u
        LEFT JOIN AVOIR_ROLE ar ON u.id_utilisateur = ar.id_utilisateur
        LEFT JOIN role r ON ar.id_role = r.id_role
        WHERE u.login = ?
    `;

    connection.query(query, [login], async (err, results) => {
        if (err) {
            console.error('Erreur SQL lors de la connexion:', err);
            return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
        }

        // Si pas de résultat ou compte désactivé
        if (results.length === 0 || results[0].actif === 0) {
            return res.status(401).json({ success: false, message: 'Identifiants invalides.' });
        }

        const user = results[0];

        // On compare le mot de passe avec le hash en BDD avec bcrypt
        const match = await bcrypt.compare(password, user.mot_de_passe);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Identifiants invalides.' });
        }

        // On génère un token JWT valide 7 jours avec les infos de l'utilisateur
        const token = jwt.sign(
            { 
                id_utilisateur: user.id_utilisateur, 
                login: user.login,
                id_role: user.id_role,
                role: user.nom_role
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // On enregistre un log de connexion dans la BDD
        const logActionText = `Connexion réussie de l'utilisateur : ${login}`;
        const insertLogQuery = 'INSERT INTO LOG (adresse_ip, action, date_action) VALUES (?, ?, NOW())';
        
        connection.query(insertLogQuery, [ipAdresse, logActionText], (logErr, logResult) => {
            if (!logErr) {
                const newLogId = logResult.insertId;
                // Liaison du log avec l'utilisateur dans la table GENERER_LOG
                const insertGenLogQuery = 'INSERT INTO GENERER_LOG (id_utilisateur, id_log) VALUES (?, ?)';
                connection.query(insertGenLogQuery, [user.id_utilisateur, newLogId]);
            }
        });
        // On renvoie le token au front
        res.json({
            success: true,
            message: 'Connexion réussie !',
            token: token
        });
    });
});

// Route pour créer un nouvel utilisateur (réservée aux admins)
app.post('/register', authMiddleware, async (req, res) => {
    const { nom, prenom, email, id_role, password } = req.body;
    const ipAdresse = req.ip || req.connection.remoteAddress;

    // Vérification que tous les champs sont remplis
    if (!nom || !prenom || !email || !id_role || !password) {
        return res.status(400).json({ success: false, message: 'Tous les champs sont obligatoires (le mot de passe doit être généré par le front).' });
    }

    // On vérifie que l'utilisateur connecté est bien un admin (id_role 7)
    if (req.user.id_role !== 7) {
        return res.status(403).json({ success: false, message: 'Accès refusé. Seuls les administrateurs peuvent créer des utilisateurs.' });
    }

    // On nettoie le nom et prénom pour créer le login (sans accents ni espaces)
    const cleanNom = nom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
    const cleanPrenom = prenom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
    const login = `${cleanNom}.${cleanPrenom}`;

    try {
        // On hash le mot de passe avec bcrypt avant de le stocker
        const hash = await bcrypt.hash(password, 12);

        // On utilise une transaction pour insérer dans plusieurs tables d'un coup
        connection.beginTransaction(async (transactionErr) => {
            if (transactionErr) return res.status(500).json({ success: false, message: 'Erreur d\'initialisation de la transaction' });

            // 1. On insère l'utilisateur dans la table utilisateur
            const insertUserQuery = 'INSERT INTO utilisateur (nom, prenom, email, login, mot_de_passe, actif) VALUES (?, ?, ?, ?, ?, 1)';
            connection.query(insertUserQuery, [nom, prenom, email, login, hash], (err, userResult) => {
                if (err) {
                    return connection.rollback(() => {
                        // Si email ou login déjà existant
                        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Cet utilisateur existe déjà (Email ou Login en doublon).' });
                        return res.status(500).json({ success: false, message: 'Erreur lors de la création de l\'utilisateur' });
                    });
                }

                const newUserId = userResult.insertId;

                // 2. On attribue le rôle à l'utilisateur dans AVOIR_ROLE
                const insertRoleQuery = 'INSERT INTO AVOIR_ROLE (id_utilisateur, id_role) VALUES (?, ?)';
                connection.query(insertRoleQuery, [newUserId, id_role], (err) => {
                    if (err) {
                        return connection.rollback(() => {
                            return res.status(500).json({ success: false, message: 'Erreur lors de l\'attribution du rôle' });
                        });
                    }

                    // 3. On enregistre un log de création
                    const logActionText = `Création du compte utilisateur : ${login}`;
                    const insertLogQuery = 'INSERT INTO LOG (adresse_ip, action, date_action) VALUES (?, ?, NOW())';
                    connection.query(insertLogQuery, [ipAdresse, logActionText], (err, logResult) => {
                        if (err) {
                            return connection.rollback(() => {
                                return res.status(500).json({ success: false, message: 'Erreur lors de la création du LOG' });
                            });
                        }

                        const newLogId = logResult.insertId;

                        // 4. On lie le log à l'admin qui a fait l'action
                        const insertGenLogQuery = 'INSERT INTO GENERER_LOG (id_utilisateur, id_log) VALUES (?, ?)';
                        connection.query(insertGenLogQuery, [req.user.id_utilisateur, newLogId], (err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    return res.status(500).json({ success: false, message: 'Erreur de liaison du LOG' });
                                });
                            }

                            // 5. On valide la transaction si tout s'est bien passé
                            connection.commit((commitErr) => {
                                if (commitErr) {
                                    return connection.rollback(() => {
                                        return res.status(500).json({ success: false, message: 'Erreur de validation définitive' });
                                    });
                                }

                                res.json({
                                    success: true,
                                    message: 'Compte employé créé et configuré avec succès !',
                                    id_utilisateur: newUserId,
                                    login: login
                                });
                            });
                        });
                    });
                });
            });
        });

    } catch (err) {
        res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
    }
});

// Route pour récupérer le rôle de l'utilisateur connecté
app.get('/getrole', authMiddleware, (req, res) => {
    const userId = req.user.id_utilisateur;

    // Requête qui récupère le rôle via la table AVOIR_ROLE
    const query = `
        SELECT r.id_role, r.nom_role, r.description 
        FROM role r
        INNER JOIN AVOIR_ROLE ar ON r.id_role = ar.id_role
        WHERE ar.id_utilisateur = ?
    `;

    connection.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Erreur SQL :', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Rôle non trouvé' });
        }

        res.json({
            success: true,
            role: results[0]
        });
    });
});

// Route pour récupérer les 200 derniers logs (réservée aux admins)
app.get('/logs', authMiddleware, (req, res) => {
    // On vérifie que l'utilisateur est admin
    if (req.user.id_role !== 7) {
        return res.status(403).json({ 
            success: false, 
            message: 'Accès refusé. Seuls les administrateurs peuvent consulter les logs.' 
        });
    }

    // Requête qui récupère les logs avec le nom de l'utilisateur qui a fait l'action
    const query = `
        SELECT 
            l.id_log,
            l.adresse_ip,
            l.action,
            DATE_FORMAT(l.date_action, '%d/%m/%Y %H:%i') AS date_action,
            u.login
        FROM LOG l
        LEFT JOIN GENERER_LOG gl ON l.id_log = gl.id_log
        LEFT JOIN utilisateur u ON gl.id_utilisateur = u.id_utilisateur
        ORDER BY l.date_action DESC
        LIMIT 200
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Erreur SQL lors de la récupération des logs :', err);
            return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
        }

        res.json({
            success: true,
            logs: results
        });
    });
});

// Route qui gère les questions du chatbot
app.post('/chat', authMiddleware, (req, res) => {
    const { question } = req.body;
    const ipAdresse = req.ip || req.connection.remoteAddress;
    const userId = req.user.id_utilisateur;
    const userLogin = req.user.login;
    const userRole = req.user.id_role; // ← On récupère le rôle depuis le token

    if (!question) {
        return res.status(400).json({ success: false, message: 'Question vide' });
    }
    
    // On ouvre une connexion WebSocket vers le serveur Python (RAG)
    const ws = new WebSocket('ws://localhost:8765');

    ws.on('open', () => {
        // Quand la connexion est ouverte, on envoie la question
        ws.send(JSON.stringify({ question, id_role: userRole }));
    });
    
    // Quand on reçoit la réponse de l'IA
    ws.on('message', (message) => {
        const data = JSON.parse(message.toString());
        ws.close();

        // Log de la question + de la réponse de l'IA
        const questionCourte = question.length > 100 ? question.substring(0, 100) + '...' : question;
        const reponseIa = (data && data.reponse) ? String(data.reponse) : '';
        const reponseCourte = reponseIa.length > 100 ? reponseIa.substring(0, 100) + '...' : reponseIa;
        const logActionText = `Question posée par ${userLogin} : "${questionCourte}" | Réponse IA : "${reponseCourte}"`;
        const insertLogQuery = 'INSERT INTO LOG (adresse_ip, action, date_action) VALUES (?, ?, NOW())';

        // On enregistre un log de la question et de la réponse (chacune raccourcie à 100 caractères)
        connection.query(insertLogQuery, [ipAdresse, logActionText], (logErr, logResult) => {
            if (!logErr) {
                const newLogId = logResult.insertId;
                const insertGenLogQuery = 'INSERT INTO GENERER_LOG (id_utilisateur, id_log) VALUES (?, ?)';
                connection.query(insertGenLogQuery, [userId, newLogId]);
            } else {
                console.error('Erreur log chat :', logErr);
            }
        });

        // On sauvegarde aussi la question complète dans la table question + POSER pour historique
        const insertQuestionQuery = 'INSERT INTO question (contenu, date_question) VALUES (?, NOW())';
        connection.query(insertQuestionQuery, [question], (qErr, qResult) => {
            if (!qErr) {
                const newQuestionId = qResult.insertId;
                // Liaison du log avec l'utilisateur qui a posé la question
                const insertPoserQuery = 'INSERT INTO POSER (id_utilisateur, id_question) VALUES (?, ?)';
                connection.query(insertPoserQuery, [userId, newQuestionId]);

                // On enregistre la réponse complète de l'IA, liée à la question (table reponse)
                const insertReponseQuery = 'INSERT INTO reponse (id_question, contenu, date_reponse) VALUES (?, ?, NOW())';
                connection.query(insertReponseQuery, [newQuestionId, reponseIa], (rErr) => {
                    if (rErr) console.error('Erreur enregistrement réponse IA :', rErr);
                });
            } else {
                console.error('Erreur enregistrement question :', qErr);
            }
        });

        res.json({ success: true, reponse: data.reponse });
    });

    // Gestion d'erreur si le serveur Python ne répond pas
    ws.on('error', (err) => {
        console.error('Erreur WebSocket :', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Erreur RAG' });
        }
    });
});



// Route pour lister tous les utilisateurs avec leur rôle (admin only)
app.get('/admin/utilisateurs', authMiddleware, (req, res) => {
    if (req.user.id_role !== 7) {
        return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }

    const query = `
        SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.login, u.actif,
               r.id_role, r.nom_role
        FROM utilisateur u
        LEFT JOIN AVOIR_ROLE ar ON u.id_utilisateur = ar.id_utilisateur
        LEFT JOIN role r ON ar.id_role = r.id_role
        ORDER BY u.nom, u.prenom
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Erreur SQL liste utilisateurs :', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
        res.json({ success: true, utilisateurs: results });
    });
});

// Route pour activer ou désactiver un compte utilisateur (admin only)
app.patch('/admin/utilisateurs/:id/statut', authMiddleware, (req, res) => {
    if (req.user.id_role !== 7) {
        return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }

    const userId = parseInt(req.params.id);
    const ipAdresse = req.ip || req.connection.remoteAddress;

    if (userId === req.user.id_utilisateur) {
        return res.status(400).json({ success: false, message: 'Vous ne pouvez pas modifier votre propre compte.' });
    }

    const { actif } = req.body;
    if (actif === undefined) {
        return res.status(400).json({ success: false, message: 'Statut manquant.' });
    }

    connection.query('UPDATE utilisateur SET actif = ? WHERE id_utilisateur = ?', [actif ? 1 : 0, userId], (err, result) => {
        if (err) {
            console.error('Erreur SQL statut utilisateur :', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
        }

        const logText = `${actif ? 'Activation' : 'Désactivation'} du compte ID:${userId} par ${req.user.login}`;
        connection.query('INSERT INTO LOG (adresse_ip, action, date_action) VALUES (?, ?, NOW())', [ipAdresse, logText], (logErr, logResult) => {
            if (!logErr) {
                connection.query('INSERT INTO GENERER_LOG (id_utilisateur, id_log) VALUES (?, ?)', [req.user.id_utilisateur, logResult.insertId]);
            }
        });

        res.json({ success: true, message: `Compte ${actif ? 'activé' : 'désactivé'} avec succès.` });
    });
});

// Route pour supprimer définitivement un compte utilisateur (admin only)
app.delete('/admin/utilisateurs/:id', authMiddleware, (req, res) => {
    if (req.user.id_role !== 7) {
        return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }

    const userId = parseInt(req.params.id);
    const ipAdresse = req.ip || req.connection.remoteAddress;

    if (userId === req.user.id_utilisateur) {
        return res.status(400).json({ success: false, message: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }

    connection.query('SELECT login FROM utilisateur WHERE id_utilisateur = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Erreur serveur' });
        if (results.length === 0) return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });

        const userLogin = results[0].login;

        connection.query('DELETE FROM utilisateur WHERE id_utilisateur = ?', [userId], (delErr) => {
            if (delErr) {
                console.error('Erreur SQL suppression utilisateur :', delErr);
                return res.status(500).json({ success: false, message: 'Erreur lors de la suppression.' });
            }

            const logText = `Suppression du compte utilisateur : ${userLogin} par ${req.user.login}`;
            connection.query('INSERT INTO LOG (adresse_ip, action, date_action) VALUES (?, ?, NOW())', [ipAdresse, logText], (logErr, logResult) => {
                if (!logErr) {
                    connection.query('INSERT INTO GENERER_LOG (id_utilisateur, id_log) VALUES (?, ?)', [req.user.id_utilisateur, logResult.insertId]);
                }
            });

            res.json({ success: true, message: 'Utilisateur supprimé avec succès.' });
        });
    });
});

// On sert les fichiers statiques (HTML, CSS, JS, images) depuis le dossier public
app.use(express.static(path.join(__dirname, 'public')));

// Page chatbot
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chatbot.html'));
});

// Page admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Lancement du serveur sur le port 3000
app.listen(3000, '172.29.18.171', () => {
    console.log(`Disponible sur http://172.29.18.171:${3000}`);
});