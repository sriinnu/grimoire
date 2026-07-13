// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "GrimoireProductContracts",
    platforms: [
        .macOS(.v13),
        .iOS(.v16),
    ],
    products: [
        .library(
            name: "GrimoireProductContracts",
            targets: ["GrimoireProductContracts"]
        ),
    ],
    targets: [
        .target(name: "GrimoireProductContracts"),
        .testTarget(
            name: "GrimoireProductContractsTests",
            dependencies: ["GrimoireProductContracts"]
        ),
    ]
)
