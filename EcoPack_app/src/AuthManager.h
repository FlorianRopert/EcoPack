#ifndef AUTHMANAGER_H
#define AUTHMANAGER_H

#include <QObject>
#include <QString>

// AuthManager : conserve le jeton JWT et expose les infos de l'utilisateur connecte a QML.
// Le token est sauvegarde dans QSettings pour rester connecte entre 2 lancements.
class AuthManager : public QObject
{
    Q_OBJECT
    // Proprietes exposees a QML
    Q_PROPERTY(QString token READ token NOTIFY tokenChanged)
    Q_PROPERTY(QString login READ login NOTIFY tokenChanged)
    Q_PROPERTY(int idRole READ idRole NOTIFY tokenChanged)
    Q_PROPERTY(bool isLoggedIn READ isLoggedIn NOTIFY tokenChanged)
    Q_PROPERTY(bool isAdmin READ isAdmin NOTIFY tokenChanged)

public:
    explicit AuthManager(QObject *parent = nullptr);

    QString token() const { return m_token; }
    QString login() const { return m_login; }
    int idRole() const { return m_idRole; }
    bool isLoggedIn() const { return !m_token.isEmpty(); }
    bool isAdmin() const { return m_idRole == 7; }

    // Methodes appelables depuis QML
    Q_INVOKABLE void setToken(const QString &token);
    Q_INVOKABLE void logout();

signals:
    void tokenChanged();

private:
    // Decode le payload base64url du JWT pour en extraire login, id_role...
    void parseJwt(const QString &token);
    // Charge le token sauvegarde dans QSettings au demarrage
    void loadFromSettings();
    // Persiste / efface le token dans QSettings
    void saveToSettings();
    void clearSettings();

    QString m_token;
    QString m_login;
    int m_idRole = 0;
};

#endif // AUTHMANAGER_H
