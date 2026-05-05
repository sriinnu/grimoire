// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "MarkdownEditor",
    platforms: [
        .macOS(.v13),
        .iOS(.v16)
    ],
    products: [
        .library(
            name: "MarkdownEditor",
            targets: ["MarkdownEditor"]
        ),
        .library(
            name: "MarkdownEditorUI",
            targets: ["MarkdownEditorUI"]
        ),
        .executable(
            name: "markdown-editor-tool",
            targets: ["MarkdownEditorTool"]
        )
    ],
    targets: [
        .target(name: "MarkdownEditor"),
        .target(
            name: "MarkdownEditorUI",
            dependencies: ["MarkdownEditor"]
        ),
        .executableTarget(
            name: "MarkdownEditorTool",
            dependencies: ["MarkdownEditor"]
        ),
        .testTarget(
            name: "MarkdownEditorTests",
            dependencies: ["MarkdownEditor", "MarkdownEditorUI"]
        )
    ]
)
