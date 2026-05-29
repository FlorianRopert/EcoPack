import QtQuick

// Bulle de message : positionnee a droite (vert) pour l'utilisateur,
// a gauche (gris) pour le bot. Le delegate ListView passe les proprietes.
Item {
    id: bubble

    property string messageText: ""
    property bool isUser: false

    // Hauteur du contenu + un peu de marge
    width: parent ? parent.width : 0
    implicitHeight: contentRect.height + 12

    Rectangle {
        id: contentRect
        // Largeur max 75% de la liste
        width: Math.min(parent.width * 0.75, textItem.implicitWidth + 24)
        // Hauteur ajustee au texte
        height: textItem.implicitHeight + 16
        radius: 12

        // Alignement gauche/droite selon l'auteur
        anchors.right: bubble.isUser ? parent.right : undefined
        anchors.left: bubble.isUser ? undefined : parent.left
        anchors.rightMargin: 8
        anchors.leftMargin: 8
        anchors.verticalCenter: parent.verticalCenter

        color: bubble.isUser ? "#2CDE85" : "#E8E8E8"

        Text {
            id: textItem
            anchors.centerIn: parent
            width: contentRect.width - 24
            text: bubble.messageText
            color: bubble.isUser ? "white" : "#222"
            wrapMode: Text.Wrap
            font.pixelSize: 15
        }
    }
}
