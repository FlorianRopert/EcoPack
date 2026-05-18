require('dotenv').config();
const express = require('express');
const { WebSocketServer } = require('ws');
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_env';

// ✅ Middleware JSON ajouté ici, AVANT toutes les routes
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

app.post('/register', async (req, res) => {
    const { nom, prenom, email, id_role, password } = req.body;
    const ipAdresse = req.ip || req.connection.remoteAddress;

    if (!nom || !prenom || !email || !id_role || !password) {
        return res.status(400).json({ success: false, message: 'Tous les champs sont obligatoires (le mot de passe doit être généré par le front).' });
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

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chatbot.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(3000, '172.20.10.7', () => {
    console.log(`Disponible sur http://172.20.10.7:${3000}`);
});