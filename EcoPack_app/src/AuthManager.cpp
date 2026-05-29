#include "AuthManager.h"

#include <QSettings>
#include <QByteArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QStringList>

// Constructeur : on tente de recharger un token deja sauvegarde
AuthManager::AuthManager(QObject *parent) : QObject(parent)
{
    loadFromSettings();
}

// Definit le token, parse le payload, sauvegarde et previent QML
void AuthManager::setToken(const QString &token)
{
    if (token == m_token)
        return;

    m_token = token;
    parseJwt(token);
    saveToSettings();
    emit tokenChanged();
}

// Deconnexion : on vide le token et on l'efface du disque
void AuthManager::logout()
{
    if (m_token.isEmpty())
        return;

    m_token.clear();
    m_login.clear();
    m_idRole = 0;
    clearSettings();
    emit tokenChanged();
}

// Decodage du payload d'un JWT. Format : header.payload.signature en base64url.
// On ne verifie PAS la signature cote client (le backend le fait).
void AuthManager::parseJwt(const QString &token)
{
    m_login.clear();
    m_idRole = 0;

    const QStringList parts = token.split('.');
    if (parts.size() < 2)
        return;

    // base64url -> base64 standard (+ padding eventuel)
    QByteArray payload = parts[1].toUtf8();
    payload.replace('-', '+').replace('_', '/');
    while (payload.size() % 4 != 0)
        payload.append('=');

    const QByteArray decoded = QByteArray::fromBase64(payload);
    const QJsonDocument doc = QJsonDocument::fromJson(decoded);
    if (!doc.isObject())
        return;

    const QJsonObject obj = doc.object();
    m_login = obj.value("login").toString();
    m_idRole = obj.value("id_role").toInt();
}

// Charge le token depuis QSettings (cle "auth/token")
void AuthManager::loadFromSettings()
{
    QSettings settings;
    const QString saved = settings.value("auth/token").toString();
    if (!saved.isEmpty()) {
        m_token = saved;
        parseJwt(saved);
        emit tokenChanged();
    }
}

void AuthManager::saveToSettings()
{
    QSettings settings;
    settings.setValue("auth/token", m_token);
}

void AuthManager::clearSettings()
{
    QSettings settings;
    settings.remove("auth/token");
}
