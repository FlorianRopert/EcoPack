import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

// Page de connexion calee sur le style du client web :
// fond degrade vert pale + carte blanche arrondie avec logo en haut.
Page {
    id: root
    signal loginSuccess()

    // Degrade #eaf8ef -> #d8f0e0 (identique au CSS .login-overlay)
    background: Rectangle {
        gradient: Gradient {
            orientation: Gradient.Vertical
            GradientStop { position: 0.0; color: "#eaf8ef" }
            GradientStop { position: 1.0; color: "#d8f0e0" }
        }
    }

    Connections {
        target: api
        function onLoginSuccess() {
            busy.running = false
            root.loginSuccess()
        }
        function onLoginFailed(message) {
            busy.running = false
            errorLabel.text = "Identifiants incorrects."
            errorLabel.visible = true
        }
    }

    // ScrollView pour eviter que le clavier mange tout l'ecran sur petit mobile
    Flickable {
        anchors.fill: parent
        contentWidth: width
        contentHeight: Math.max(height, card.implicitHeight + 64)
        boundsBehavior: Flickable.StopAtBounds

        // Carte centrale blanche (equivalent .login-container)
        Rectangle {
            id: card
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.verticalCenter: parent.verticalCenter
            width: Math.min(root.width - 32, 420)
            radius: 24
            color: "#ffffff"
            border.color: "#e5e7eb"
            border.width: 1

            implicitHeight: contentCol.implicitHeight + 64

            ColumnLayout {
                id: contentCol
                anchors.fill: parent
                anchors.margins: 32
                spacing: 18

                // Logo EcoPack
                Image {
                    Layout.alignment: Qt.AlignHCenter
                    source: "img/logo.png"
                    fillMode: Image.PreserveAspectFit
                    Layout.preferredHeight: 100
                    Layout.preferredWidth: Math.min(card.width - 64, 280)
                    sourceSize.width: 560
                }

                // En-tete : titre + sous-titre
                ColumnLayout {
                    Layout.fillWidth: true
                    Layout.topMargin: 4
                    spacing: 8

                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: "EcoPack IA"
                        color: "#1f2937"
                        font.pixelSize: 26
                        font.bold: true
                    }
                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        Layout.fillWidth: true
                        text: "Connectez-vous pour accéder au chatbot interne\net aux documents autorisés."
                        color: "#6b7280"
                        font.pixelSize: 13
                        horizontalAlignment: Text.AlignHCenter
                        wrapMode: Text.WordWrap
                    }
                }

                // Champ Login
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    Text {
                        text: "Login"
                        color: "#374151"
                        font.pixelSize: 13
                        font.bold: true
                    }
                    TextField {
                        id: loginField
                        Layout.fillWidth: true
                        placeholderText: "Votre identifiant"
                        font.pixelSize: 14
                        background: Rectangle {
                            radius: 12
                            color: "white"
                            border.color: loginField.activeFocus ? "#1f7a4d" : "#d1d5db"
                            border.width: 1
                        }
                        leftPadding: 14
                        rightPadding: 14
                        topPadding: 12
                        bottomPadding: 12
                    }
                }

                // Champ mot de passe
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6
                    Text {
                        text: "Mot de passe"
                        color: "#374151"
                        font.pixelSize: 13
                        font.bold: true
                    }
                    TextField {
                        id: passwordField
                        Layout.fillWidth: true
                        placeholderText: "Votre mot de passe"
                        echoMode: TextInput.Password
                        font.pixelSize: 14
                        background: Rectangle {
                            radius: 12
                            color: "white"
                            border.color: passwordField.activeFocus ? "#1f7a4d" : "#d1d5db"
                            border.width: 1
                        }
                        leftPadding: 14
                        rightPadding: 14
                        topPadding: 12
                        bottomPadding: 12
                    }
                }

                // Bouton de connexion (vert #1f7a4d)
                Button {
                    id: loginBtn
                    Layout.fillWidth: true
                    Layout.preferredHeight: 48
                    text: "Se connecter"
                    enabled: loginField.text.length > 0 && passwordField.text.length > 0
                    background: Rectangle {
                        radius: 12
                        color: !loginBtn.enabled ? "#9ca3af"
                               : (loginBtn.pressed ? "#17633d" : "#1f7a4d")
                    }
                    contentItem: Text {
                        text: loginBtn.text
                        color: "white"
                        font.pixelSize: 15
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: {
                        errorLabel.visible = false
                        busy.running = true
                        api.login(loginField.text, passwordField.text)
                    }
                }

                BusyIndicator {
                    id: busy
                    Layout.alignment: Qt.AlignHCenter
                    running: false
                    visible: running
                }

                // Bandeau d'erreur (style .error-message du web)
                Rectangle {
                    id: errorBox
                    Layout.fillWidth: true
                    radius: 10
                    color: "#fef2f2"
                    border.color: "#fecaca"
                    border.width: 1
                    visible: errorLabel.visible
                    implicitHeight: errorLabel.implicitHeight + 20
                    Text {
                        id: errorLabel
                        anchors.fill: parent
                        anchors.margins: 10
                        color: "#b91c1c"
                        font.pixelSize: 13
                        wrapMode: Text.Wrap
                        visible: false
                        text: "Identifiants incorrects."
                    }
                }

                Text {
                    Layout.alignment: Qt.AlignHCenter
                    Layout.topMargin: 4
                    text: "© 2026 EcoPack - Assistant interne sécurisé"
                    color: "#6b7280"
                    font.pixelSize: 11
                }
            }
        }
    }
}
