#ifndef APICLIENT_H
#define APICLIENT_H

#include <QObject>
#include <QString>
#include <QUrl>
#include <QNetworkAccessManager>
#include <QJsonObject>
#include <QJsonArray>

class AuthManager;
class QNetworkRequest;
class QNetworkReply;

// ApiClient : centralise tous les appels HTTP REST vers le backend Node.js.
// Toutes les methodes sont Q_INVOKABLE pour etre appelees depuis QML.
class ApiClient : public QObject
{
    Q_OBJECT
    Q_PROPERTY(QString baseUrl READ baseUrl WRITE setBaseUrl NOTIFY baseUrlChanged)

public:
    explicit ApiClient(AuthManager *auth, QObject *parent = nullptr);

    QString baseUrl() const { return m_baseUrl; }
    void setBaseUrl(const QString &url);

    // Authentification
    Q_INVOKABLE void login(const QString &login, const QString &password);

    // Chat (RAG)
    Q_INVOKABLE void sendChatQuestion(const QString &question);

    // Administration (necessite un token admin)
    Q_INVOKABLE void fetchUsers();
    Q_INVOKABLE void setUserActive(int idUtilisateur, bool actif);
    Q_INVOKABLE void deleteUser(int idUtilisateur);
    Q_INVOKABLE void fetchLogs();

signals:
    void baseUrlChanged();

    // Authentification
    void loginSuccess();
    void loginFailed(const QString &message);

    // Chat
    void chatResponseReceived(const QString &reponse);
    void chatError(const QString &message);

    // Admin
    void usersReceived(const QJsonArray &users);
    void userUpdated();
    void userDeleted();
    void logsReceived(const QJsonArray &logs);

    // Erreurs reseau generiques
    void networkError(const QString &message);
    // Token invalide / expire : QML doit forcer la deconnexion
    void unauthorized();

private:
    // Construit une requete vers endpoint + ajoute Bearer token si demande
    QNetworkRequest buildRequest(const QString &endpoint, bool withAuth);

    // Verifie le code HTTP et le contenu JSON ; renvoie true si OK
    // En cas d'erreur 401, emet unauthorized() automatiquement.
    bool checkReply(QNetworkReply *reply, QJsonObject &outObj, QString &outError);

    QString m_baseUrl;
    QNetworkAccessManager m_manager;
    AuthManager *m_auth;
};

#endif // APICLIENT_H
