import SwiftUI

@main
struct GrimoireMacApp: App {
    var body: some Scene {
        WindowGroup {
            GrimoireRootView()
                .frame(minWidth: 900, minHeight: 620)
        }
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("New Note") {
                }
                .keyboardShortcut("n", modifiers: [.command])
            }
        }
    }
}
