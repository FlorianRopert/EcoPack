import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Page {
    id: root
    signal loginSuccess()

    background: Rectangle { color: "#FFFFFF" }

    Connections {
        target: api
        function onLoginSuccess() {
            busy.running = false
            root.loginSuccess()
        }
        function onLoginFailed(message) {
            busy.running = false
            errorLabel.text = message
            errorLabel.visible = true
        }
    }

    ColumnLayout {
        anchors.centerIn: parent
        width: parent.width * 0.85
        spacing: 16

        Text {
            Layout.alignment: Qt.AlignHCenter
            text: "ECOPACK"
            color: "#2CDE85"
            font.pixelSize: 36
            font.bold: true
        }
        Text {
            Layout.alignment: Qt.AlignHCenter
            text: "Connexion"
            color: "#555"
            font.pixelSize: 18
        }

        TextField {
            id: loginField
            Layout.fillWidth: true
            placeholderText: "Login (ex: nom.prenom)"
        }
        TextField {
            id: passwordField
            Layout.fillWidth: true
            placeholderText: "Mot de passe"
            echoMode: TextInput.Password
        }

        Text {
            id: errorLabel
            Layout.fillWidth: true
            color: "red"
            visible: false
            wrapMode: Text.Wrap
        }

        Button {
            Layout.fillWidth: true
            text: "Se connecter"
            enabled: loginField.text.length > 0 && passwordField.text.length > 0
            background: Rectangle {
                color: parent.enabled ? "#2CDE85" : "#AAAAAA"
                radius: 8
            }
            contentItem: Text {
                text: parent.text
                color: "white"
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
        }
    }
}