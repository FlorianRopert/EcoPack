import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

// Page principale de chat - style aligne sur le client web :
// - fond #f8faf9
// - en-tete blanc avec bouton hamburger (qui ouvre le drawer-sidebar
//   verte du web), titre + sous-titre, bouton Deconnexion outline
// - bulles via MessageBubble
// - barre de saisie blanche avec bouton vert
Page {
    id: root
    signal logoutRequested()
    signal adminRequested()

    background: Rectangle { color: "#f8faf9" }

    ListModel { id: messagesModel }

    property bool waitingResponse: false

    Connections {
        target: api
        function onChatResponseReceived(reponse) {
            messagesModel.append({ "messageText": reponse, "isUser": false })
            root.waitingResponse = false
            scrollToEnd()
        }
        function onChatError(message) {
            messagesModel.append({ "messageText": "Erreur : " + message, "isUser": false })
            root.waitingResponse = false
            scrollToEnd()
        }
    }

    Component.onCompleted: {
        // Message d'accueil identique au web
        messagesModel.append({
            "messageText": "Bonjour, je suis l'assistant interne EcoPack. Comment puis-je vous aider ?",
            "isUser": false
        })
    }

    function scrollToEnd() {
        if (messagesModel.count > 0)
            chatList.positionViewAtEnd()
    }

    // Drawer lateral (sidebar verte du web)
    SideMenu {
        id: sideMenu
        currentPage: "chat"
        onAdminRequested: root.adminRequested()
        onLogoutRequested: {
            auth.logout()
            root.logoutRequested()
        }
        // onChatRequested: deja sur la page chat, le drawer se referme seul
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // En-tete blanc (style .chat-header du web)
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 78
            color: "white"
            Rectangle {
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.bottom: parent.bottom
                height: 1
                color: "#dddddd"
            }

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 12
                anchors.topMargin: 10
                anchors.bottomMargin: 10
                spacing: 8

                // Bouton hamburger (ouvre le drawer)
                Button {
                    id: menuBtn
                    text: "☰"
                    Layout.preferredWidth: 44
                    Layout.preferredHeight: 44
                    background: Rectangle {
                        radius: 12
                        color: menuBtn.pressed ? "#f3f4f6" : "transparent"
                    }
                    contentItem: Text {
                        text: menuBtn.text
                        color: "#1f2937"
                        font.pixelSize: 22
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: sideMenu.open()
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text {
                        text: "Chat interne EcoPack"
                        color: "#1f2937"
                        font.pixelSize: 18
                        font.bold: true
                        elide: Text.ElideRight
                    }
                    Text {
                        text: "Réponses basées sur les documents autorisés"
                        color: "#666666"
                        font.pixelSize: 11
                        elide: Text.ElideRight
                    }
                }

                // Bouton Deconnexion (outline blanc - style .logout du web)
                Button {
                    id: logoutBtn
                    text: "Déconnexion"
                    onClicked: {
                        auth.logout()
                        root.logoutRequested()
                    }
                    background: Rectangle {
                        radius: 12
                        color: logoutBtn.pressed ? "#f3f4f6" : "white"
                        border.color: "#cccccc"
                        border.width: 1
                    }
                    contentItem: Text {
                        text: logoutBtn.text
                        color: "#1f2937"
                        font.pixelSize: 12
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    padding: 10
                }
            }
        }

        // Liste des messages (.messages : fond clair)
        ListView {
            id: chatList
            Layout.fillWidth: true
            Layout.fillHeight: true
            model: messagesModel
            spacing: 6
            clip: true
            topMargin: 16
            bottomMargin: 16
            delegate: MessageBubble {
                width: chatList.width
                messageText: model.messageText
                isUser: model.isUser
            }
            onCountChanged: positionViewAtEnd()
        }

        // Indicateur d'attente
        BusyIndicator {
            Layout.alignment: Qt.AlignHCenter
            running: root.waitingResponse
            visible: running
        }

        // Barre de saisie (style .chat-input)
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 90
            color: "white"
            Rectangle {
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.top: parent.top
                height: 1
                color: "#dddddd"
            }

            ColumnLayout {
                anchors.fill: parent
                anchors.leftMargin: 16
                anchors.rightMargin: 16
                anchors.topMargin: 12
                anchors.bottomMargin: 8
                spacing: 4

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 10

                    TextField {
                        id: input
                        Layout.fillWidth: true
                        Layout.preferredHeight: 44
                        placeholderText: "Posez votre question sur EcoPack..."
                        enabled: !root.waitingResponse
                        font.pixelSize: 14
                        background: Rectangle {
                            radius: 14
                            color: "white"
                            border.color: input.activeFocus ? "#1f7a4d" : "#cccccc"
                            border.width: 1
                        }
                        leftPadding: 14
                        rightPadding: 14
                        onAccepted: sendBtn.clicked()
                    }
                    Button {
                        id: sendBtn
                        Layout.preferredHeight: 44
                        Layout.preferredWidth: 96
                        text: "Envoyer"
                        enabled: input.text.trim().length > 0 && !root.waitingResponse
                        background: Rectangle {
                            radius: 14
                            color: !sendBtn.enabled ? "#9ca3af"
                                   : (sendBtn.pressed ? "#17633d" : "#1f7a4d")
                        }
                        contentItem: Text {
                            text: sendBtn.text
                            color: "white"
                            font.pixelSize: 14
                            font.bold: true
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                        onClicked: {
                            const q = input.text.trim()
                            if (q.length === 0) return
                            messagesModel.append({ "messageText": q, "isUser": true })
                            input.text = ""
                            root.waitingResponse = true
                            scrollToEnd()
                            api.sendChatQuestion(q)
                        }
                    }
                }
                Text {
                    Layout.fillWidth: true
                    text: "Le chatbot répond uniquement avec les documents autorisés pour votre rôle."
                    color: "#666666"
                    font.pixelSize: 11
                }
            }
        }
    }
}
