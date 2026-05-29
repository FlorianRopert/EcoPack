import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

// Page d'administration : 2 onglets (Utilisateurs, Logs).
// Accessible uniquement aux admins (id_role = 7).
Page {
    id: root
    signal backRequested()

    background: Rectangle { color: "white" }

    // Modeles remplis par les signaux de ApiClient
    ListModel { id: usersModel }
    ListModel { id: logsModel }

    // Au montage on charge les donnees des deux onglets
    Component.onCompleted: {
        api.fetchUsers()
        api.fetchLogs()
    }

    // Reactions aux signaux du backend
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

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // Header
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 56
            color: "#2CDE85"

            RowLayout {
                anchors.fill: parent
                anchors.margins: 8
                spacing: 8

                Button {
                    text: "<"
                    onClicked: root.backRequested()
                    background: Rectangle { color: "#00414A"; radius: 6 }
                    contentItem: Text {
                        text: parent.text
                        color: "white"
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
                Text {
                    Layout.fillWidth: true
                    text: "Administration"
                    color: "white"
                    font.pixelSize: 18
                    font.bold: true
                }
            }
        }

        // TabBar : 2 onglets
        TabBar {
            id: bar
            Layout.fillWidth: true
            TabButton { text: "Utilisateurs" }
            TabButton { text: "Logs" }
        }

        // StackLayout aligne sur l'onglet selectionne
        StackLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            currentIndex: bar.currentIndex

            // --- Onglet Utilisateurs ---
            ListView {
                id: usersList
                model: usersModel
                clip: true
                spacing: 4
                delegate: Rectangle {
                    width: usersList.width
                    height: 90
                    color: index % 2 ? "#F9F9F9" : "white"
                    border.color: "#DDDDDD"

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 8
                        spacing: 8

                        ColumnLayout {
                            Layout.fillWidth: true
                            Text {
                                text: (model.nom + " " + model.prenom).trim() + "  (" + model.login + ")"
                                font.bold: true
                                color: "#222"
                                elide: Text.ElideRight
                            }
                            Text {
                                text: model.email
                                color: "#555"
                                font.pixelSize: 12
                                elide: Text.ElideRight
                            }
                            Text {
                                text: "Role : " + model.nom_role
                                color: "#777"
                                font.pixelSize: 12
                            }
                        }

                        // Switch actif/inactif
                        ColumnLayout {
                            spacing: 2
                            Text {
                                text: model.actif ? "Actif" : "Inactif"
                                color: model.actif ? "#2CDE85" : "#888"
                                font.pixelSize: 11
                            }
                            Switch {
                                checked: model.actif
                                onToggled: api.setUserActive(model.id_utilisateur, checked)
                            }
                        }

                        Button {
                            text: "X"
                            background: Rectangle { color: "red"; radius: 6 }
                            contentItem: Text {
                                text: parent.text
                                color: "white"
                                horizontalAlignment: Text.AlignHCenter
                                verticalAlignment: Text.AlignVCenter
                            }
                            onClicked: confirmDialog.open(model.id_utilisateur, model.login)
                        }
                    }
                }
            }

            // --- Onglet Logs ---
            ListView {
                id: logsList
                model: logsModel
                clip: true
                spacing: 2
                delegate: Rectangle {
                    width: logsList.width
                    height: 60
                    color: index % 2 ? "#F9F9F9" : "white"
                    border.color: "#EEEEEE"

                    Column {
                        anchors.fill: parent
                        anchors.margins: 6
                        spacing: 2
                        Text {
                            text: model.date_log + "  —  " + model.login
                            font.bold: true
                            color: "#222"
                            font.pixelSize: 12
                        }
                        Text {
                            text: model.action
                            color: "#555"
                            font.pixelSize: 12
                            elide: Text.ElideRight
                            width: parent.width
                        }
                        Text {
                            text: "IP : " + model.ip
                            color: "#888"
                            font.pixelSize: 11
                        }
                    }
                }
            }
        }
    }

    // Dialog de confirmation pour la suppression
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

        Text {
            text: "Supprimer l'utilisateur " + confirmDialog.pendingLogin + " ?\nCette action est irreversible."
            wrapMode: Text.Wrap
        }

        onAccepted: {
            if (pendingId > 0)
                api.deleteUser(pendingId)
        }
    }
}
