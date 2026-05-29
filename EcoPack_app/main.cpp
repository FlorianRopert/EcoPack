#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QQmlContext>

#include "AuthManager.h"
#include "ApiClient.h"

int main(int argc, char *argv[])
{
    QGuiApplication app(argc, argv);

    // Nom de l'organisation et de l'application : indispensables pour QSettings
    // (sinon QSettings ne sait pas dans quel fichier ecrire le token).
    QGuiApplication::setOrganizationName("Ecopack");
    QGuiApplication::setApplicationName("ChatbotApp");

    // Creation des objets C++ exposes a QML.
    // L'ApiClient prend un pointeur vers AuthManager pour lire le token.
    AuthManager auth;
    ApiClient api(&auth);

    QQmlApplicationEngine engine;

    // Exposition au contexte QML : on pourra ecrire `auth.isAdmin` et `api.login(...)` en QML.
    engine.rootContext()->setContextProperty("auth", &auth);
    engine.rootContext()->setContextProperty("api", &api);

    QObject::connect(
        &engine,
        &QQmlApplicationEngine::objectCreationFailed,
        &app,
        []() { QCoreApplication::exit(-1); },
        Qt::QueuedConnection);

    engine.loadFromModule("EcoPack_app", "Main");

    return QGuiApplication::exec();
}
