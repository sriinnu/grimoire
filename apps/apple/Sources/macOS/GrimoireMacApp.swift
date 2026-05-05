import SwiftUI

@main
struct GrimoireMacApp: App {
    var body: some Scene {
        WindowGroup {
            GrimoireRootView()
                .frame(minWidth: 900, minHeight: 620)
        }
    }
}
