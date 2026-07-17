import SwiftUI

@main
struct GrimoireMacApp: App {
    var body: some Scene {
        Window("Grimoire", id: "main") {
            MacWorkspaceView()
        }
        .defaultSize(width: 1_420, height: 860)
        .windowToolbarStyle(.unified)
        .commands {
            SidebarCommands()
        }
    }
}
