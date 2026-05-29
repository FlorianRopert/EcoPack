import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

// Page principale de chat avec le RAG Ecopack.
Page {
    id: root
    signal logoutRequested()
    signal adminRequested()

    background: Rectangle { color: "white" }

    // Modele des messages affiches dans la ListView
    ListModel { id: messagesModel }

    // Etat "envoi en cours" : empeche d'envoyer 2 questions en parallele
    property bool waitingResponse: false

    // Reactions aux signaux de ApiClient
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

    // Defile la liste tout en bas (pour voir le dernier message)
    function scrollToEnd() {
        if (messagesModel.count > 0)
            chatList.positionViewAtEnd()
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // Header vert avec login + boutons Admin/Deco
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 56
            color: "#2CDE85"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 8
                spacing: 8

                Text {
                    Layout.fillWidth: true
                    text: "Ecopack — " + auth.login
                    color: "white"
                    font.pixelSize: 18
                    font.bold: true
                    elide: Text.ElideRight
                }

                // Bouton Admin visible uniquement pour les admins (id_role = 7)
                Button {
                    text: "Admin"
                    visible: auth.isAdmin
                    onClicked: root.adminRequested()
                    background: Rectangle { color: "#00414A"; radius: 6 }
                    contentItem: Text {
                        text: parent.text
                        color: "white"
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
                Button {
                    text: "Déco"
                    onClicked: {
                        auth.logout()
                        root.logoutRequested()
                    }
                    background: Rectangle { color: "#00414A"; radius: 6 }
                    contentItem: Text {
                        text: parent.text
                        color: "white"
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }
        }

        // Liste des messages
        ListView {
            id: chatList
            Layout.fillWidth: true
            Layout.fillHeight: true
            model: messagesModel
            spacing: 6
            clip: true
            delegate: MessageBubble {
                width: chatList.width
                messageText: model.messageText
                isUser: model.isUser
            }
            // Auto-scroll quand le contenu grandit
            onCountChanged: positionViewAtEnd()
        }

        // Indicateur d'attente (RAG potentiellement lent)
        BusyIndicator {
            Layout.alignment: Qt.AlignHCenter
            running: root.waitingResponse
            visible: running
        }

        // Barre de saisie en bas
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 56
            color: "#F5F5F5"

            RowLayout {
                anchors.fill: parent
                anchors.margins: 8
                spacing: 8

                TextField {
                    id: input
                    Layout.fillWidth: true
                    placeholderText: "Pose ta question..."
                    enabled: !root.waitingResponse
                    onAccepted: sendBtn.clicked()
                }
                Button {
                    id: sendBtn
                    text: "Envoyer"
                    enabled: input.text.trim().length > 0 && !root.waitingResponse
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
        }
    }
}
