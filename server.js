require('dotenv').config();
const express = require('express');
const { WebSocketServer } = require('ws');
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_env';

app.use(express.json());

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

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, message: 'Token manquant' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: 'Token invalide ou expiré' });
    }
}
app.post('/connexion', async (req, res) => {
    const { login, password } = req.body;
    const ipAdresse = req.ip || req.connection.remoteAddress;

    if (!login || !password) {
        return res.status(400).json({ success: false, message: 'Identifiant et mot de passe requis.' });
    }

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

        if (results.length === 0 || results[0].actif === 0) {
            return res.status(401).json({ success: false, message: 'Identifiants invalides.' });
        }

        const user = results[0];

        const match = await bcrypt.compare(password, user.mot_de_passe);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Identifiants invalides.' });
        }

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

        // Journalisation du LOG en arrière-plan
        const logActionText = `Connexion réussie de l'utilisateur : ${login}`;
        const insertLogQuery = 'INSERT INTO LOG (adresse_ip, action, date_action) VALUES (?, ?, NOW())';
        
        connection.query(insertLogQuery, [ipAdresse, logActionText], (logErr, logResult) => {
            if (!logErr) {
                const newLogId = logResult.insertId;
                const insertGenLogQuery = 'INSERT INTO GENERER_LOG (id_utilisateur, id_log) VALUES (?, ?)';
                connection.query(insertGenLogQuery, [user.id_utilisateur, newLogId]);
            }
        });
        res.json({
            success: true,
            message: 'Connexion réussie !',
            token: token
        });
    });
});
app.post('/register', authMiddleware, async (req, res) => {
    const { nom, prenom, email, id_role, password } = req.body;
    const ipAdresse = req.ip || req.connection.remoteAddress;

    if (!nom || !prenom || !email || !id_role || !password) {
        return res.status(400).json({ success: false, message: 'Tous les champs sont obligatoires (le mot de passe doit être généré par le front).' });
    }

    if (req.user.id_role !== 7) {
        return res.status(403).json({ success: false, message: 'Accès refusé. Seuls les administrateurs peuvent créer des utilisateurs.' });
    }

    const cleanNom = nom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
    const cleanPrenom = prenom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
    const login = `${cleanNom}.${cleanPrenom}`;

    try {
        const hash = await bcrypt.hash(password, 12);

        connection.beginTransaction(async (transactionErr) => {
            if (transactionErr) return res.status(500).json({ success: false, message: 'Erreur d\'initialisation de la transaction' });

            const insertUserQuery = 'INSERT INTO utilisateur (nom, prenom, email, login, mot_de_passe, actif) VALUES (?, ?, ?, ?, ?, 1)';
            connection.query(insertUserQuery, [nom, prenom, email, login, hash], (err, userResult) => {
                if (err) {
                    return connection.rollback(() => {
                        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Cet utilisateur existe déjà (Email ou Login en doublon).' });
                        return res.status(500).json({ success: false, message: 'Erreur lors de la création de l\'utilisateur' });
                    });
                }

                const newUserId = userResult.insertId;

                const insertRoleQuery = 'INSERT INTO AVOIR_ROLE (id_utilisateur, id_role) VALUES (?, ?)';
                connection.query(insertRoleQuery, [newUserId, id_role], (err) => {
                    if (err) {
                        return connection.rollback(() => {
                            return res.status(500).json({ success: false, message: 'Erreur lors de l\'attribution du rôle' });
                        });
                    }

                    const logActionText = `Création du compte utilisateur : ${login}`;
                    const insertLogQuery = 'INSERT INTO LOG (adresse_ip, action, date_action) VALUES (?, ?, NOW())';
                    connection.query(insertLogQuery, [ipAdresse, logActionText], (err, logResult) => {
                        if (err) {
                            return connection.rollback(() => {
                                return res.status(500).json({ success: false, message: 'Erreur lors de la création du LOG' });
                            });
                        }

                        const newLogId = logResult.insertId;

                        const insertGenLogQuery = 'INSERT INTO GENERER_LOG (id_utilisateur, id_log) VALUES (?, ?)';
                        connection.query(insertGenLogQuery, [newUserId, newLogId], (err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    return res.status(500).json({ success: false, message: 'Erreur de liaison du LOG' });
                                });
                            }

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

app.get('/getrole', authMiddleware, (req, res) => {
    const userId = req.user.id_utilisateur;

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







app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chatbot.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(3000, '172.29.18.171', () => {
    console.log(`Disponible sur http://172.29.18.171:${3000}`);
});