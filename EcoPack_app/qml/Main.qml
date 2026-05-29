import QtQuick
import QtQuick.Controls

// Fenetre racine de l'application : un StackView qui empile les pages.
ApplicationWindow {
    id: root
    width: 400
    height: 700
    visible: true
    title: "Ecopack"

    StackView {
        id: stack
        anchors.fill: parent
        initialItem: splashComponent
    }

    // Si le backend rejette le token (expire/invalide), on force la deconnexion
    // et on renvoie l'utilisateur vers la page de login.
    Connections {
        target: api
        function onUnauthorized() {
            auth.logout()
            stack.replace(loginComponent)
        }
    }

    // Definition de chaque ecran sous forme de Component (instancie a la demande)
    Component {
        id: splashComponent
        SplashScreen {
            onFinished: stack.replace(auth.isLoggedIn ? chatComponent : loginComponent)
        }
    }
    Component {
        id: loginComponent
        LoginPage {
            onLoginSuccess: stack.replace(chatComponent)
        }
    }
    Component {
        id: chatComponent
        ChatPage {
            onLogoutRequested: stack.replace(loginComponent)
            onAdminRequested: stack.push(adminComponent)
        }
    }
    Component {
        id: adminComponent
        AdminPage {
            onBackRequested: stack.pop()
        }
    }
}
