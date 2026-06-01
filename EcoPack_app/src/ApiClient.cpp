#include "ApiClient.h"
#include "AuthManager.h"

#include <QNetworkRequest>
#include <QNetworkReply>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QUrl>
#include <QUrlQuery>

// Constructeur : on garde une reference vers AuthManager pour recuperer le token
// et on configure un timeout global de 300s sur le QNetworkAccessManager (le RAG peut etre tres lent).
ApiClient::ApiClient(AuthManager *auth, QObject *parent)
    : QObject(parent)
    , m_baseUrl("http://172.29.18.171:3000")
    , m_auth(auth)
{
    m_manager.setTransferTimeout(300000);
}

void ApiClient::setBaseUrl(const QString &url)
{
    if (url == m_baseUrl)
        return;
    m_baseUrl = url;
    emit baseUrlChanged();
}

// Construit une QNetworkRequest avec l'URL complete et le header Bearer (optionnel)
QNetworkRequest ApiClient::buildRequest(const QString &endpoint, bool withAuth)
{
    QNetworkRequest req(QUrl(m_baseUrl + endpoint));
    req.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
    if (withAuth && m_auth && !m_auth->token().isEmpty()) {
        const QByteArray bearer = "Bearer " + m_auth->token().toUtf8();
        req.setRawHeader("Authorization", bearer);
    }
    return req;
}

// Verifie la reponse : 1) erreur reseau ? 2) code 401 ? 3) JSON valide ?
// Retourne true si tout va bien, et place l'objet decode dans outObj.
bool ApiClient::checkReply(QNetworkReply *reply, QJsonObject &outObj, QString &outError)
{
    const int status = reply->attribute(QNetworkRequest::HttpStatusCodeAttribute).toInt();
    const QByteArray raw = reply->readAll();

    if (status == 401) {
        outError = "Session expiree, veuillez vous reconnecter.";
        emit unauthorized();
        return false;
    }

    if (reply->error() != QNetworkReply::NoError && status == 0) {
        outError = reply->errorString();
        return false;
    }

    const QJsonDocument doc = QJsonDocument::fromJson(raw);
    if (!doc.isObject()) {
        outError = "Reponse du serveur invalide.";
        return false;
    }
    outObj = doc.object();

    if (status >= 400) {
        outError = outObj.value("message").toString("Erreur HTTP " + QString::number(status));
        return false;
    }
    return true;
}

// ---------- Authentification ----------
void ApiClient::login(const QString &login, const QString &password)
{
    QJsonObject body;
    body["login"] = login;
    body["password"] = password;

    QNetworkRequest req = buildRequest("/connexion", false);
    QNetworkReply *reply = m_manager.post(req, QJsonDocument(body).toJson());

    connect(reply, &QNetworkReply::finished, this, [this, reply]() {
        QJsonObject obj;
        QString err;
        if (!checkReply(reply, obj, err)) {
            emit loginFailed(err.isEmpty() ? "Echec de la connexion" : err);
            reply->deleteLater();
            return;
        }
        const QString token = obj.value("token").toString();
        if (token.isEmpty()) {
            emit loginFailed(obj.value("message").toString("Token manquant"));
        } else {
            if (m_auth)
                m_auth->setToken(token);
            emit loginSuccess();
        }
        reply->deleteLater();
    });
}

// ---------- Chat ----------
void ApiClient::sendChatQuestion(const QString &question)
{
    QJsonObject body;
    body["question"] = question;

    QNetworkRequest req = buildRequest("/chat", true);
    QNetworkReply *reply = m_manager.post(req, QJsonDocument(body).toJson());

    connect(reply, &QNetworkReply::finished, this, [this, reply]() {
        QJsonObject obj;
        QString err;
        if (!checkReply(reply, obj, err)) {
            emit chatError(err);
            reply->deleteLater();
            return;
        }
        emit chatResponseReceived(obj.value("reponse").toString());
        reply->deleteLater();
    });
}

// ---------- Administration : liste des utilisateurs ----------
void ApiClient::fetchUsers()
{
    QNetworkRequest req = buildRequest("/admin/utilisateurs", true);
    QNetworkReply *reply = m_manager.get(req);

    connect(reply, &QNetworkReply::finished, this, [this, reply]() {
        QJsonObject obj;
        QString err;
        if (!checkReply(reply, obj, err)) {
            emit networkError(err);
            reply->deleteLater();
            return;
        }
        emit usersReceived(obj.value("utilisateurs").toArray());
        reply->deleteLater();
    });
}

// Active / desactive un utilisateur (PATCH)
void ApiClient::setUserActive(int idUtilisateur, bool actif)
{
    QJsonObject body;
    body["actif"] = actif;

    QNetworkRequest req = buildRequest(
        QString("/admin/utilisateurs/%1/statut").arg(idUtilisateur), true);

    QNetworkReply *reply = m_manager.sendCustomRequest(
        req, "PATCH", QJsonDocument(body).toJson());

    connect(reply, &QNetworkReply::finished, this, [this, reply]() {
        QJsonObject obj;
        QString err;
        if (!checkReply(reply, obj, err)) {
            emit networkError(err);
        } else {
            emit userUpdated();
        }
        reply->deleteLater();
    });
}

// Supprime un utilisateur (DELETE)
void ApiClient::deleteUser(int idUtilisateur)
{
    QNetworkRequest req = buildRequest(
        QString("/admin/utilisateurs/%1").arg(idUtilisateur), true);
    QNetworkReply *reply = m_manager.deleteResource(req);

    connect(reply, &QNetworkReply::finished, this, [this, reply]() {
        QJsonObject obj;
        QString err;
        if (!checkReply(reply, obj, err)) {
            emit networkError(err);
        } else {
            emit userDeleted();
        }
        reply->deleteLater();
    });
}

// Liste des logs
void ApiClient::fetchLogs()
{
    QNetworkRequest req = buildRequest("/logs", true);
    QNetworkReply *reply = m_manager.get(req);

    connect(reply, &QNetworkReply::finished, this, [this, reply]() {
        QJsonObject obj;
        QString err;
        if (!checkReply(reply, obj, err)) {
            emit networkError(err);
            reply->deleteLater();
            return;
        }
        emit logsReceived(obj.value("logs").toArray());
        reply->deleteLater();
    });
}
