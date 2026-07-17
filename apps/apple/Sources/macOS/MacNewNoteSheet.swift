import SwiftUI

struct MacNewNoteSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var model: GrimoireWorkspaceModel
    @State private var title = ""
    @State private var collection: WorkspaceCollection = .notes
    @State private var localOnly = false
    @State private var isCreating = false

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Label("New Notebook Page", systemImage: collection.systemImage)
                .font(.title2.weight(.semibold))

            Form {
                TextField("Title", text: $title, prompt: Text("Untitled"))
                Picker("Collection", selection: $collection) {
                    ForEach(WorkspaceCollection.allCases.filter { $0 != .today }) { item in
                        Text(item.title).tag(item)
                    }
                }
                Toggle("Keep local only", isOn: $localOnly)
            }
            .formStyle(.grouped)

            HStack {
                Text(notePath)
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                Spacer()
                Button("Cancel", role: .cancel) { dismiss() }
                Button("Create") { create() }
                    .buttonStyle(.borderedProminent)
                    .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isCreating)
            }
        }
        .padding(24)
        .frame(width: 480)
        .onChange(of: collection) { _, value in
            if value == .journal || value == .dreams {
                localOnly = true
            }
        }
    }

    private var notePath: String {
        let folder = switch collection {
        case .journal: "Journal"
        case .dreams: "Dreams"
        case .projects: "Projects"
        case .today, .notes: "Notes"
        }
        let forbidden = CharacterSet(charactersIn: "/:*?<>|")
            .union(CharacterSet(charactersIn: "\\\\"))
            .union(CharacterSet(charactersIn: "\\\""))
        let stem = title
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .components(separatedBy: forbidden)
            .joined(separator: "-")
        return "\(folder)/\(stem.isEmpty ? "Untitled" : stem).md"
    }

    private var markdown: String {
        let type = switch collection {
        case .journal: "Journal"
        case .dreams: "Dream"
        case .projects: "Project"
        case .today, .notes: "Note"
        }
        let privacy = localOnly ? "\nlocality: local-only" : ""
        return """
        ---
        title: \(title.trimmingCharacters(in: .whitespacesAndNewlines))
        type: \(type)\(privacy)
        ---
        # \(title.trimmingCharacters(in: .whitespacesAndNewlines))

        """
    }

    private func create() {
        isCreating = true
        Task {
            if await model.createNote(path: notePath, content: markdown) {
                dismiss()
            }
            isCreating = false
        }
    }
}
