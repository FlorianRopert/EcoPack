import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

// Page d'administration calee sur le style du client web :
// - fond #f8faf9, en-tete blanc avec drawer (sidebar verte)
// - onglets Utilisateurs / Logs
// - cartes blanches arrondies (style .admin-card)
// - badges actif/inactif aux couleurs du web
Page {
    id: root
    signal backRequested()

    background: Rectangle { color: "#f8faf9" }

    ListModel { id: usersModel }
    ListModel { id: logsModel }

    Component.onCompleted: {
        api.fetchUsers()
        api.fetchLogs()
    }

    Connections {
        target: api
        function onUsersReceived(users) {
            usersModel.clear()
            for (let i = 0; i < users.length; ++i) {
                const u = users[i]
                usersModel.append({
                    "id_utilisateur": u.id_utilisateur,
                    "login": u.login || "",
                    "nom": u.nom || "",
                    "prenom": u.prenom || "",
                    "email": u.email || "",
                    "nom_role": u.nom_role || "",
                    "actif": (u.actif === true || u.actif === 1)
                })
            }
        }
        function onUserUpdated() { api.fetchUsers() }
        function onUserDeleted() { api.fetchUsers() }
        function onLogsReceived(logs) {
            logsModel.clear()
            for (let i = 0; i < logs.length; ++i) {
                const l = logs[i]
                logsModel.append({
                    "date_log": l.date_log || "",
                    "login": l.login || "",
                    "action": l.action || "",
                    "ip": l.ip || ""
                })
            }
        }
    }

    // Drawer lateral (sidebar verte du web)
    SideMenu {
        id: sideMenu
        currentPage: "admin"
        onChatRequested: root.backRequested()
        onLogoutRequested: {
            auth.logout()
            // Le drawer ferme et on remonte au login via le signal back
            root.backRequested()
        }
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // En-tete blanc (style .chat-header)
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
                spacing: 6

                // Bouton hamburger
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
                        text: "Administration"
                        color: "#1f2937"
                        font.pixelSize: 18
                        font.bold: true
                    }
                    Text {
                        text: "Gérer les utilisateurs et consulter les logs"
                        color: "#666666"
                        font.pixelSize: 11
                        elide: Text.ElideRight
                    }
                }

                // Retour vers chat
                Button {
                    id: backBtn
                    text: "Retour"
                    onClicked: root.backRequested()
                    background: Rectangle {
                        radius: 12
                        color: backBtn.pressed ? "#f3f4f6" : "white"
                        border.color: "#cccccc"
                        border.width: 1
                    }
                    contentItem: Text {
                        text: backBtn.text
                        color: "#1f2937"
                        font.pixelSize: 12
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    padding: 10
                }
            }
        }

        // TabBar style vert plein sous l'onglet actif
        TabBar {
            id: bar
            Layout.fillWidth: true
            background: Rectangle { color: "white" }

            TabButton {
                text: "Utilisateurs"
                background: Rectangle {
                    color: "white"
                    Rectangle {
                        anchors.left: parent.left
                        anchors.right: parent.right
                        anchors.bottom: parent.bottom
                        height: bar.currentIndex === 0 ? 3 : 1
                        color: bar.currentIndex === 0 ? "#1f7a4d" : "#dddddd"
                    }
                }
                contentItem: Text {
                    text: parent.text
                    color: bar.currentIndex === 0 ? "#1f7a4d" : "#666666"
                    font.pixelSize: 14
                    font.bold: bar.currentIndex === 0
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }
            TabButton {
                text: "Logs"
                background: Rectangle {
                    color: "white"
                    Rectangle {
                        anchors.left: parent.left
                        anchors.right: parent.right
                        anchors.bottom: parent.bottom
                        height: bar.currentIndex === 1 ? 3 : 1
                        color: bar.currentIndex === 1 ? "#1f7a4d" : "#dddddd"
                    }
                }
                contentItem: Text {
                    text: parent.text
                    color: bar.currentIndex === 1 ? "#1f7a4d" : "#666666"
                    font.pixelSize: 14
                    font.bold: bar.currentIndex === 1
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }
        }

        // StackLayout aligne sur l'onglet
        StackLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            currentIndex: bar.currentIndex

            // --- Onglet Utilisateurs : carte blanche contenant la liste ---
            // (style .admin-card du web : fond blanc, radius 18, border #e5e7eb)
            Item {
                ListView {
                    id: usersList
                    anchors.fill: parent
                    anchors.margins: 14
                    model: usersModel
                    clip: true
                    spacing: 10

                    // En-tete de section (h3 du web : "Liste des utilisateurs")
                    header: Item {
                        width: usersList.width
                        height: 40
                        Text {
                            anchors.left: parent.left
                            anchors.verticalCenter: parent.verticalCenter
                            text: "Liste des utilisateurs"
                            color: "#1f2937"
                            font.pixelSize: 16
                            font.bold: true
                        }
                    }

                    delegate: Rectangle {
                        width: usersList.width
                        height: 130
                        radius: 18
                        color: "white"
                        border.color: "#e5e7eb"
                        border.width: 1

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 10

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 3
                                Text {
                                    text: (model.nom + " " + model.prenom).trim()
                                    font.bold: true
                                    font.pixelSize: 14
                                    color: "#1f2937"
                                    elide: Text.ElideRight
                                    Layout.fillWidth: true
                                }
                                Text {
                                    text: "@" + model.login
                                    color: "#1f7a4d"
                                    font.pixelSize: 12
                                    font.bold: true
                                }
                                Text {
                                    text: model.email
                                    color: "#6b7280"
                                    font.pixelSize: 11
                                    elide: Text.ElideRight
                                    Layout.fillWidth: true
                                }
                                Text {
                                    text: "Rôle : " + model.nom_role
                                    color: "#6b7280"
                                    font.pixelSize: 11
                                }

                                // Badge actif / inactif (style .badge du web)
                                Rectangle {
                                    Layout.topMargin: 4
                                    radius: 20
                                    color: model.actif ? "#dcfce7" : "#fee2e2"
                                    implicitWidth: badgeLabel.implicitWidth + 18
                                    implicitHeight: badgeLabel.implicitHeight + 8
                                    Text {
                                        id: badgeLabel
                                        anchors.centerIn: parent
                                        text: model.actif ? "Actif" : "Inactif"
                                        color: model.actif ? "#166534" : "#991b1b"
                                        font.pixelSize: 11
                                        font.bold: true
                                    }
                                }
                            }

                            ColumnLayout {
                                spacing: 6
                                Layout.alignment: Qt.AlignVCenter
                                Switch {
                                    checked: model.actif
                                    onToggled: api.setUserActive(model.id_utilisateur, checked)
                                }
                                Button {
                                    id: delBtn
                                    text: "Supprimer"
                                    background: Rectangle {
                                        radius: 10
                                        color: delBtn.pressed ? "#991b1b" : "#dc2626"
                                    }
                                    contentItem: Text {
                                        text: delBtn.text
                                        color: "white"
                                        font.pixelSize: 12
                                        font.bold: true
                                        horizontalAlignment: Text.AlignHCenter
                                        verticalAlignment: Text.AlignVCenter
                                    }
                                    padding: 8
                                    onClicked: confirmDialog.open(model.id_utilisateur, model.login)
                                }
                            }
                        }
                    }
                }
            }

            // --- Onglet Logs : lignes alternees dans des cartes legeres ---
            Item {
                ListView {
                    id: logsList
                    anchors.fill: parent
                    anchors.margins: 14
                    model: logsModel
                    clip: true
                    spacing: 6

                    header: Item {
                        width: logsList.width
                        height: 40
                        Text {
                            anchors.left: parent.left
                            anchors.verticalCenter: parent.verticalCenter
                            text: "Derniers logs"
                            color: "#1f2937"
                            font.pixelSize: 16
                            font.bold: true
                        }
                    }

                    delegate: Rectangle {
                        width: logsList.width
                        height: 78
                        radius: 14
                        color: "white"
                        border.color: "#e5e7eb"
                        border.width: 1

                        Column {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 4
                            Text {
                                text: model.date_log + "  —  " + model.login
                                font.bold: true
                                color: "#1f2937"
                                font.pixelSize: 12
                            }
                            Text {
                                text: model.action
                                color: "#555555"
                                font.pixelSize: 12
                                elide: Text.ElideRight
                                width: parent.width
                            }
                            Text {
                                text: "IP : " + model.ip
                                color: "#888888"
                                font.pixelSize: 11
                            }
                        }
                    }
                }
            }
        }
    }

    // Dialog de confirmation : style aligne (titre fonce, bouton rouge)
    Dialog {
        id: confirmDialog
        modal: true
        anchors.centerIn: parent
        title: "Confirmation"
        standardButtons: Dialog.Yes | Dialog.No

        property int pendingId: -1
        property string pendingLogin: ""

        function open(id, login) {
            pendingId = id
            pendingLogin = login
            visible = true
        }

        contentItem: Text {
            text: "Supprimer l'utilisateur " + confirmDialog.pendingLogin + " ?\nCette action est irréversible."
            color: "#1f2937"
            font.pixelSize: 14
            wrapMode: Text.Wrap
        }

        onAccepted: {
            if (pendingId > 0)
                api.deleteUser(pendingId)
        }
    }
}
