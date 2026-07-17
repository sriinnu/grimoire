import GrimoireProductContracts
import SwiftUI

struct MacContextInspector: View {
    @ObservedObject var model: GrimoireWorkspaceModel
    @State private var page: InspectorPage = .overview

    var body: some View {
        VStack(spacing: 0) {
            Picker("Inspector", selection: $page) {
                ForEach(InspectorPage.allCases) { page in
                    Label(page.title, systemImage: page.systemImage)
                        .tag(page)
                }
            }
            .pickerStyle(.segmented)
            .labelsHidden()
            .padding(12)

            Divider()

            switch page {
            case .overview:
                overview
            case .sources:
                sources
            case .privacy:
                privacy
            }
        }
        .navigationTitle("Second Brain")
    }

    private var overview: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 10) {
                    ZStack {
                        Circle()
                            .fill(MacNotebookTheme.brandGradient)
                        Image(systemName: "brain.head.profile.fill")
                            .foregroundStyle(.white)
                    }
                    .frame(width: 38, height: 38)

                    VStack(alignment: .leading, spacing: 1) {
                        Text("Second Brain")
                            .font(.headline)
                        Label("Local context", systemImage: "lock.shield")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer(minLength: 0)
                    Button("Ask") {}
                        .buttonStyle(.bordered)
                        .disabled(true)
                        .help("Chitragupta connection arrives after the native workspace is solid")
                }

                inspectorCard("Signal", systemImage: "waveform.path.ecg") {
                    Text(model.activeDocument?.notePreview ?? "Choose a page to build a grounded local signal.")
                        .font(.callout)
                        .foregroundStyle(.secondary)
                        .lineLimit(5)
                }

                inspectorCard("Context", systemImage: "point.3.connected.trianglepath.dotted") {
                    LabeledContent("Active page", value: model.activeDocument?.title ?? "None")
                    LabeledContent("Available nodes", value: "\(model.documents.count) local pages")
                    LabeledContent("Manifest", value: "r\(model.manifestRevision)")
                    Gauge(
                        value: Double(model.manifest.budget.usedTokens),
                        in: 0 ... Double(model.manifest.budget.maximumTokens)
                    ) {
                        Text("Context budget")
                    } currentValueLabel: {
                        Text("\(model.manifest.budget.usedTokens) tokens")
                    }
                    .gaugeStyle(.linearCapacity)
                }

                inspectorCard("Activity", systemImage: "clock.arrow.circlepath") {
                    Label(model.vaultActivity, systemImage: "pencil.and.scribble")
                    if let document = model.activeDocument {
                        Text("You are working in \(document.path).")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                inspectorCard("Outline", systemImage: "list.bullet.indent") {
                    if outlineHeadings.isEmpty {
                        Text("Headings appear here as the page takes shape.")
                            .font(.callout)
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(Array(outlineHeadings.enumerated()), id: \.offset) { _, heading in
                            Label(heading.title, systemImage: "h\(min(heading.level, 3)).square")
                                .font(heading.level == 1 ? .callout.weight(.semibold) : .caption)
                                .padding(.leading, CGFloat(max(0, heading.level - 1)) * 10)
                        }
                    }
                }

                Button {
                    model.rebuildManifest()
                } label: {
                    Label(
                        model.manifestNeedsRebuild ? "Refresh local context" : "Local context is current",
                        systemImage: model.manifestNeedsRebuild
                            ? "arrow.triangle.2.circlepath"
                            : "checkmark.circle.fill"
                    )
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
            .padding(12)
        }
    }

    private func inspectorCard<Content: View>(
        _ title: String,
        systemImage: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Label(title, systemImage: systemImage)
                .font(.headline)
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .grimoireGlassCard()
    }

    private var outlineHeadings: [(level: Int, title: String)] {
        guard let markdown = model.activeDocument?.markdown else { return [] }
        return markdown.split(separator: "\n").compactMap { line in
            let level = line.prefix { $0 == "#" }.count
            guard level > 0, level <= 6 else { return nil }
            return (level, line.dropFirst(level).trimmingCharacters(in: .whitespaces))
        }
    }

    private var sources: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 10) {
                ForEach(model.documents) { document in
                    MacContextSourceRow(model: model, document: document)
                }
            }
            .padding(12)
        }
        .overlay {
            if model.documents.isEmpty {
                ContentUnavailableView(
                    "No Context Sources",
                    systemImage: "tray",
                    description: Text("Open a note to assemble context.")
                )
            }
        }
    }

    private var privacy: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    Label("Locality Firewall active", systemImage: "lock.shield.fill")
                        .font(.headline)
                        .foregroundStyle(.green)
                    Text("Local-only sources remain visible to you but are excluded from remote context.")
                        .font(.callout)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .grimoireGlassCard()

                GroupBox("Policy decisions") {
                    VStack(alignment: .leading, spacing: 10) {
                        ForEach(model.manifest.warnings.policyBlocks, id: \.self) { warning in
                            Label(warning, systemImage: "hand.raised.fill")
                                .foregroundStyle(.orange)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                GroupBox("Provider boundary") {
                    LabeledContent("Current mode", value: "Local preview")
                    LabeledContent("External route", value: "Not connected")
                    LabeledContent("Protected bodies", value: "Withheld")
                }
            }
            .padding(12)
        }
    }

}

private struct MacContextSourceRow: View {
    @ObservedObject var model: GrimoireWorkspaceModel
    let document: WorkspaceDocument

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: document.systemImage)
                    .font(.title3)
                    .foregroundStyle(document.isLocalOnly ? Color.orange : Color.accentColor)

                VStack(alignment: .leading, spacing: 2) {
                    Text(document.title)
                        .font(.headline)
                    Text(document.path)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                Spacer(minLength: 0)

                Text(sourceState)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(sourceColor)
            }

            HStack {
                Label("~\(estimatedTokens) tokens", systemImage: "text.word.spacing")
                    .foregroundStyle(.secondary)

                Spacer(minLength: 0)

                Button {
                    model.togglePin(document.id)
                } label: {
                    Image(systemName: model.pinnedSourceIDs.contains(document.id) ? "pin.fill" : "pin")
                }
                .buttonStyle(.borderless)
                .disabled(document.isLocalOnly)
                .help(model.pinnedSourceIDs.contains(document.id) ? "Unpin source" : "Pin source")

                Button {
                    model.toggleExclusion(document.id)
                } label: {
                    Image(
                        systemName: model.excludedSourceIDs.contains(document.id)
                            ? "plus.circle"
                            : "minus.circle"
                    )
                }
                .buttonStyle(.borderless)
                .disabled(document.isLocalOnly)
                .help(model.excludedSourceIDs.contains(document.id) ? "Include source" : "Exclude source")
            }
            .font(.caption)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .grimoireGlassCard()
    }

    private var estimatedTokens: Int {
        max(1, document.markdown.utf8.count / 4)
    }

    private var sourceState: String {
        if document.isLocalOnly { return "Local only" }
        if model.excludedSourceIDs.contains(document.id) { return "Excluded" }
        if model.pinnedSourceIDs.contains(document.id) { return "Pinned" }
        return document.id == model.selectedDocumentID ? "Active" : "Included"
    }

    private var sourceColor: Color {
        if document.isLocalOnly || model.excludedSourceIDs.contains(document.id) { return .orange }
        if model.pinnedSourceIDs.contains(document.id) { return .accentColor }
        return .secondary
    }
}

private enum InspectorPage: String, CaseIterable, Identifiable {
    case overview, sources, privacy

    var id: String { rawValue }
    var title: String {
        switch self {
        case .overview: "Brain"
        case .sources: "Sources"
        case .privacy: "Privacy"
        }
    }

    var systemImage: String {
        switch self {
        case .overview: "gauge.with.dots.needle.50percent"
        case .sources: "square.stack.3d.up"
        case .privacy: "lock.shield"
        }
    }
}

private extension ContextIntentV1 {
    static let inspectorCases: [ContextIntentV1] = [
        .explain, .edit, .plan, .debug, .research, .review, .refactor,
    ]
}
