import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

// Drawer lateral reproduisant la .sidebar verte du client web :
// - fond #1f7a4d
// - logo en haut
// - menu (Chatbot, Documents, Administration)
// - user-box en bas
Drawer {
    id: root
    edge: Qt.LeftEdge
    width: Math.min(parent ? parent.width * 0.78 : 280, 320)
    height: parent ? parent.height : 600

    // Page actuelle pour griser l'item "actif" : "chat" | "admin"
    property string currentPage: "chat"

    signal chatRequested()
    signal adminRequested()
    signal logoutRequested()

    background: Rectangle { color: "#1f7a4d" }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 22
        spacing: 18

        // Logo (style .logo / .logo-icon-only du web)
        Item {
            Layout.fillWidth: true
            Layout.preferredHeight: 110

            Image {
                anchors.centerIn: parent
                source: "img/logo.png"
                fillMode: Image.PreserveAspectFit
                width: Math.min(parent.width, 220)
                height: 100
                sourceSize.width: 440
            }
        }

        // Menu (style .menu a du web)
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 8

            // Chatbot
            Rectangle {
                Layout.fillWidth: true
                radius: 12
                color: root.currentPage === "chat" ? Qt.rgba(1, 1, 1, 0.18) : "transparent"
                implicitHeight: 46
                Text {
                    anchors.fill: parent
                    anchors.leftMargin: 14
                    verticalAlignment: Text.AlignVCenter
                    text: "💬   Chatbot"
                    color: "white"
                    font.pixelSize: 15
                }
                MouseArea {
                    anchors.fill: parent
                    onClicked: {
                        root.chatRequested()
                        root.close()
                    }
                }
            }

            // Documents (visuel only - pas encore implemente)
            Rectangle {
                Layout.fillWidth: true
                radius: 12
                color: "transparent"
                implicitHeight: 46
                Text {
                    anchors.fill: parent
                    anchors.leftMargin: 14
                    verticalAlignment: Text.AlignVCenter
                    text: "📄   Documents"
                    color: "white"
                    opacity: 0.6
                    font.pixelSize: 15
                }
            }

            // Administration (visible uniquement pour admins)
            Rectangle {
                Layout.fillWidth: true
                radius: 12
                color: root.currentPage === "admin" ? Qt.rgba(1, 1, 1, 0.18) : "transparent"
                implicitHeight: 46
                visible: auth.isAdmin
                Text {
                    anchors.fill: parent
                    anchors.leftMargin: 14
                    verticalAlignment: Text.AlignVCenter
                    text: "⚙️   Administration"
                    color: "white"
                    font.pixelSize: 15
                }
                MouseArea {
                    anchors.fill: parent
                    onClicked: {
                        root.adminRequested()
                        root.close()
                    }
                }
            }
        }

        // Espace flexible pour pousser la user-box en bas
        Item { Layout.fillHeight: true }

        // User box (style .user-box du web : fond blanc transparent radius 15)
        Rectangle {
            Layout.fillWidth: true
            radius: 15
            color: Qt.rgba(1, 1, 1, 0.18)
            implicitHeight: userCol.implicitHeight + 24

            ColumnLayout {
                id: userCol
                anchors.fill: parent
                anchors.margins: 12
                spacing: 3

                Text {
                    text: "Utilisateur connecté"
                    color: "white"
                    font.pixelSize: 13
                    font.bold: true
                }
                Text {
                    text: auth.login
                    color: "white"
                    font.pixelSize: 13
                    Layout.fillWidth: true
                    elide: Text.ElideRight
                }
                Text {
                    text: "Rôle : " + (auth.isAdmin ? "Administrateur" : "Utilisateur")
                    color: "white"
                    opacity: 0.85
                    font.pixelSize: 12
                }
            }
        }

        // Bouton deconnexion en bas du drawer
        Button {
            id: logoutBtn
            Layout.fillWidth: true
            Layout.preferredHeight: 42
            text: "Déconnexion"
            background: Rectangle {
                radius: 12
                color: logoutBtn.pressed ? Qt.rgba(1, 1, 1, 0.25) : Qt.rgba(1, 1, 1, 0.12)
                border.color: Qt.rgba(1, 1, 1, 0.35)
                border.width: 1
            }
            contentItem: Text {
                text: logoutBtn.text
                color: "white"
                font.pixelSize: 14
                font.bold: true
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: {
                root.close()
                root.logoutRequested()
            }
        }
    }
}
