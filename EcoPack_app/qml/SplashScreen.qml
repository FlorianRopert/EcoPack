import QtQuick
import QtQuick.Controls

// Ecran de demarrage : fond vert Ecopack, affichage du logo et fondu de sortie.
// Le signal finished() est emis apres 2s, puis Main.qml decide ou aller.
Page {
    id: root
    signal finished()

    background: Rectangle { color: "#2CDE85" }

    Column {
        anchors.centerIn: parent
        spacing: 10

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: "ECOPACK"
            color: "white"
            font.pixelSize: 48
            font.bold: true
        }
        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: "Assistant virtuel"
            color: "white"
            font.pixelSize: 18
            opacity: 0.9
        }
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
