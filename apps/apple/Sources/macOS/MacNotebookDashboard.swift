import AppKit
import SwiftUI

struct MacNotebookDashboard: View {
    @ObservedObject var model: GrimoireWorkspaceModel
    let onOpenVault: () -> Void
    @State private var draft = ""
    @State private var kind: NotebookCaptureKind = .note
    @State private var isCapturing = false
    @State private var feedback: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                welcome
                capture
                supportingContent
            }
            .frame(maxWidth: 860, alignment: .leading)
            .padding(.horizontal, 32)
            .padding(.vertical, 36)
        }
        .background(.clear)
        .navigationTitle("Notebook")
    }

    private var welcome: some View {
        HStack(alignment: .center, spacing: 14) {
            Image(nsImage: NSApp.applicationIconImage)
                .resizable()
                .aspectRatio(contentMode: .fit)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .frame(width: 48, height: 48)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 3) {
                Text(greeting)
                    .font(.title.weight(.semibold))
                Text(model.activeVaultPath == nil
                    ? "Open a vault to begin your private notebook."
                    : "Everything here stays in \(model.vaultName).")
                    .font(.callout)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 12)

            if model.activeVaultPath == nil {
                Button("Open Vault", action: onOpenVault)
                    .buttonStyle(.bordered)
            }
        }
    }

    private var capture: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text("What do you want to remember?")
                    .font(.title3.weight(.semibold))
                Text(kind.prompt)
                    .font(.callout)
                    .foregroundStyle(.secondary)
            }

            TextEditor(text: $draft)
                .font(.body)
                .scrollContentBackground(.hidden)
                .frame(minHeight: 132)
                .padding(10)
                .background(.background.opacity(0.55), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(alignment: .topLeading) {
                    if draft.isEmpty {
                        Text("Start with one line…")
                            .foregroundStyle(.tertiary)
                            .padding(.horizontal, 18)
                            .padding(.vertical, 18)
                            .allowsHitTesting(false)
                    }
                }

            HStack(spacing: 10) {
                Picker("Capture type", selection: $kind) {
                    ForEach(NotebookCaptureKind.allCases) { captureKind in
                        Text(captureKind.label).tag(captureKind)
                    }
                }
                .labelsHidden()
                .pickerStyle(.segmented)
                .frame(maxWidth: 280)

                Spacer(minLength: 12)

                Button(action: submitCapture) {
                    Label(isCapturing ? "Saving…" : "Save", systemImage: "arrow.down.doc")
                }
                .buttonStyle(.borderedProminent)
                .disabled(isCapturing || model.activeVaultPath == nil)
            }

            if let feedback {
                Label(feedback, systemImage: feedback.hasPrefix("Saved") ? "checkmark.circle.fill" : "info.circle")
                    .font(.caption)
                    .foregroundStyle(feedback.hasPrefix("Saved") ? Color.secondary : Color.orange)
            }
        }
        .grimoireGlassCard(cornerRadius: 20)
    }

    @ViewBuilder
    private var supportingContent: some View {
        ViewThatFits(in: .horizontal) {
            HStack(alignment: .top, spacing: 18) {
                recentPages
                today
            }
            VStack(alignment: .leading, spacing: 18) {
                recentPages
                today
            }
        }
    }

    private var recentPages: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Pick up where you left off")
                .font(.headline)

            if model.recentNotebookDocuments.isEmpty {
                Text("The first page you save will wait here.")
                    .font(.callout)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(model.recentNotebookDocuments.prefix(4)) { document in
                    Button {
                        model.selectDestination(.pages)
                        model.selectedDocumentID = document.id
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: document.systemImage)
                                .foregroundStyle(MacNotebookTheme.collectionColor(document.collection))
                                .frame(width: 16)
                            Text(document.title)
                                .lineLimit(1)
                            Spacer(minLength: 0)
                            if document.isLocalOnly {
                                Image(systemName: "lock.fill")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .grimoireGlassCard(cornerRadius: 16)
    }

    private var today: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(Date.now.formatted(.dateTime.weekday(.wide).month(.wide).day()))
                .font(.headline)
            Text("\(model.documents.count) pages are held locally in this notebook.")
                .font(.callout)
                .foregroundStyle(.secondary)
            Label("Nothing leaves without your action.", systemImage: "lock.fill")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .grimoireGlassCard(cornerRadius: 16)
    }

    private var greeting: String {
        switch Calendar.current.component(.hour, from: .now) {
        case 5..<12: "Good morning"
        case 12..<18: "Good afternoon"
        default: "Good evening"
        }
    }

    private func submitCapture() {
        guard kind != .ask else {
            feedback = "Ask becomes available when the local agent connection is ready."
            return
        }
        guard model.activeVaultPath != nil else {
            feedback = "Open a vault before saving a page."
            return
        }
        isCapturing = true
        Task {
            let captured = await model.captureNotebookThought(draft, as: kind)
            feedback = captured
                ? "Saved privately as a \(kind.label.lowercased())."
                : "Write something first, or choose Journal or Dream for a blank page."
            if captured { draft = "" }
            isCapturing = false
        }
    }
}
