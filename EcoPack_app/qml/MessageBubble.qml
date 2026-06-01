import QtQuick

// Bulle de message reproduisant le style du client web :
// - bulle bot : fond blanc, bordure #e5e7eb, texte fonce
// - bulle utilisateur : fond vert #1f7a4d, texte blanc
Item {
    id: bubble

    property string messageText: ""
    property bool isUser: false

    width: parent ? parent.width : 0
    implicitHeight: contentRect.height + 16

    Rectangle {
        id: contentRect
        // Largeur max ~75% comme sur le web (.bubble max-width:65% mais plus
        // confortable sur mobile)
        width: Math.min(parent.width * 0.78, textCol.implicitWidth + 32)
        height: textCol.implicitHeight + 22
        radius: 18

        anchors.right: bubble.isUser ? parent.right : undefined
        anchors.left: bubble.isUser ? undefined : parent.left
        anchors.rightMargin: 12
        anchors.leftMargin: 12
        anchors.verticalCenter: parent.verticalCenter

        color: bubble.isUser ? "#1f7a4d" : "#ffffff"
        border.color: bubble.isUser ? "transparent" : "#e5e7eb"
        border.width: bubble.isUser ? 0 : 1

        Column {
            id: textCol
            anchors.fill: parent
            anchors.margins: 12
            spacing: 4

            // Petite etiquette d'auteur comme sur le web (.bubble strong)
            Text {
                text: bubble.isUser ? "Vous" : "Assistant EcoPack"
                color: bubble.isUser ? "#ffffff" : "#1f2937"
                opacity: 0.8
                font.pixelSize: 11
                font.bold: true
            }
            Text {
                width: contentRect.width - 24
                text: bubble.messageText
                color: bubble.isUser ? "white" : "#222222"
                wrapMode: Text.Wrap
                font.pixelSize: 14
                lineHeight: 1.4
            }
        }
    }
}
