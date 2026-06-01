cmake_minimum_required(VERSION 3.16)

project(EcoPack_app VERSION 0.1 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Qt6 : modules Quick (QML/UI) et Network (HTTP REST)
find_package(Qt6 REQUIRED COMPONENTS Quick Network)

qt_standard_project_setup(REQUIRES 6.5)

# Sources C++ (AuthManager + ApiClient)
qt_add_executable(appEcoPack_app
    main.cpp
    src/AuthManager.h
    src/AuthManager.cpp
    src/ApiClient.h
    src/ApiClient.cpp
)

# Module QML (toutes les pages sont dans qml/ + image logo)
qt_add_qml_module(appEcoPack_app
    URI EcoPack_app
    VERSION 1.0
    QML_FILES
        qml/Main.qml
        qml/SplashScreen.qml
        qml/LoginPage.qml
        qml/ChatPage.qml
        qml/MessageBubble.qml
        qml/AdminPage.qml
        qml/SideMenu.qml
    RESOURCES
        qml/img/logo.png
)

# Include path pour les .h (pour pouvoir faire #include "AuthManager.h")
target_include_directories(appEcoPack_app PRIVATE src)

# Sur Android, indiquer ou se trouve le AndroidManifest.xml
if(ANDROID)
    set_property(TARGET appEcoPack_app PROPERTY
        QT_ANDROID_PACKAGE_SOURCE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/android")
endif()

# Qt for iOS sets MACOSX_BUNDLE_GUI_IDENTIFIER automatically since Qt 6.1.
set_target_properties(appEcoPack_app PROPERTIES
    MACOSX_BUNDLE_BUNDLE_VERSION ${PROJECT_VERSION}
    MACOSX_BUNDLE_SHORT_VERSION_STRING ${PROJECT_VERSION_MAJOR}.${PROJECT_VERSION_MINOR}
    MACOSX_BUNDLE TRUE
    WIN32_EXECUTABLE TRUE
)

target_link_libraries(appEcoPack_app
    PRIVATE
        Qt6::Quick
        Qt6::Network
)

install(TARGETS appEcoPack_app
    BUNDLE DESTINATION .
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)
