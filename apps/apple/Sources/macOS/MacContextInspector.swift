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
        .navigationTitle("Context Inspector")
    }

    private var overview: some View {
        Form {
            Section("Request") {
                Picker("Intent", selection: $model.intent) {
                    ForEach(ContextIntentV1.inspectorCases, id: \.rawValue) { intent in
                        Text(intent.rawValue.capitalized).tag(intent)
                    }
                }

                LabeledContent("Manifest", value: model.manifest.id)
                LabeledContent("Revision", value: "r\(model.manifestRevision)")
                LabeledContent("State") {
                    Label(
                        model.manifestNeedsRebuild ? "Rebuild needed" : "Current",
                        systemImage: model.manifestNeedsRebuild
                            ? "exclamationmark.arrow.triangle.2.circlepath"
                            : "checkmark.circle.fill"
                    )
                    .foregroundStyle(model.manifestNeedsRebuild ? .orange : .green)
                }
            }

            Section("Token Budget") {
                Gauge(
                    value: Double(model.manifest.budget.usedTokens),
                    in: 0 ... Double(model.manifest.budget.maximumTokens)
                ) {
                    Text("Context tokens")
                } currentValueLabel: {
                    Text("\(model.manifest.budget.usedTokens)")
                } minimumValueLabel: {
                    Text("0")
                } maximumValueLabel: {
                    Text("\(model.manifest.budget.maximumTokens)")
                }
                .gaugeStyle(.linearCapacity)

                Stepper(
                    value: tokenBudget,
                    in: 2_048 ... 32_768,
                    step: 1_024
                ) {
                    LabeledContent("Maximum", value: "\(model.maximumTokens) tokens")
                }

                LabeledContent("Remaining", value: "\(model.manifest.budget.remainingTokens)")
                LabeledContent("Compacted", value: "\(model.manifest.budget.compactedTokens)")
            }

            Section {
                Button {
                    model.rebuildManifest()
                } label: {
                    Label("Rebuild Context Manifest", systemImage: "arrow.triangle.2.circlepath")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .formStyle(.grouped)
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

    private var tokenBudget: Binding<Int> {
        Binding(
            get: { Int(model.maximumTokens) },
            set: { model.maximumTokens = UInt32($0) }
        )
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
    var title: String { rawValue.capitalized }

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
