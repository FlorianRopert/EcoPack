import QtQuick
import QtQuick.Controls

// Ecran de demarrage repris du style du client web :
// degrade vert pale identique au login web, logo EcoPack centre
// + slogan, puis fondu de sortie apres 2s.
Page {
    id: root
    signal finished()

    background: Rectangle {
        gradient: Gradient {
            orientation: Gradient.Vertical
            GradientStop { position: 0.0; color: "#eaf8ef" }
            GradientStop { position: 1.0; color: "#d8f0e0" }
        }
    }

    Column {
        anchors.centerIn: parent
        spacing: 18

        // Logo EcoPack (ressource du module QML)
        Image {
            anchors.horizontalCenter: parent.horizontalCenter
            source: "img/logo.png"
            fillMode: Image.PreserveAspectFit
            width: Math.min(root.width * 0.6, 280)
            // Pour eviter un rendu flou sur grands ecrans
            sourceSize.width: 560
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: "EcoPack IA"
            color: "#1f2937"
            font.pixelSize: 26
            font.bold: true
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: "Assistant interne sécurisé"
            color: "#6b7280"
            font.pixelSize: 14
        }
    }

    Text {
        anchors.bottom: parent.bottom
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottomMargin: 24
        text: "© 2026 EcoPack"
        color: "#6b7280"
        opacity: 0.8
        font.pixelSize: 12
    }

    // Au demarrage on attend 2s puis on lance le fondu
    Timer {
        id: holdTimer
        interval: 2000
        running: true
        repeat: false
        onTriggered: fadeOut.start()
    }

    // Animation de disparition de l'ecran de splash
    NumberAnimation {
        id: fadeOut
        target: root
        property: "opacity"
        from: 1.0
        to: 0.0
        duration: 400
        onStopped: root.finished()
    }
}
