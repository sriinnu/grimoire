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
            VStack(spacing: 22) {
                hero
                stats

                LazyVGrid(
                    columns: [GridItem(.flexible(minimum: 280)), GridItem(.flexible(minimum: 280))],
                    spacing: 18
                ) {
                    MacNotebookCalendar(documents: model.documents)
                    vaultHealth
                    recentPages
                    todayCard
                }
            }
            .padding(28)
            .frame(maxWidth: 1_520)
        }
        .background(MacNotebookTheme.notebookCanvas)
        .navigationTitle("Notebook")
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 24) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 12) {
                    Label("Grimoire", systemImage: "book.pages")
                        .font(.headline)
                        .foregroundStyle(MacNotebookTheme.tealAccent)
                    Text(notebookTitle)
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .foregroundStyle(MacNotebookTheme.ink)
                    Text("One living notebook. Capture, connect, and remember — private by default.")
                        .font(.title3)
                        .foregroundStyle(MacNotebookTheme.mutedInk)
                        .frame(maxWidth: 640, alignment: .leading)
                }

                Spacer(minLength: 24)

                VStack(alignment: .trailing, spacing: 12) {
                    Label("Local & Private", systemImage: "checkmark.seal.fill")
                        .font(.headline)
                        .foregroundStyle(MacNotebookTheme.tealAccent)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 9)
                        .background(MacNotebookTheme.tealAccent.opacity(0.10), in: Capsule())
                        .overlay(Capsule().stroke(MacNotebookTheme.tealAccent.opacity(0.28)))
                    Button(action: onOpenVault) {
                        Label("Open vault", systemImage: "folder.badge.plus")
                    }
                    .buttonStyle(.bordered)
                }
            }

            captureCard
        }
        .padding(32)
        .background {
            RoundedRectangle(cornerRadius: 20)
                .fill(MacNotebookTheme.heroGradient)
                .overlay(alignment: .topTrailing) {
                    Circle()
                        .fill(.white.opacity(0.42))
                        .frame(width: 420, height: 420)
                        .offset(x: 190, y: -230)
                }
        }
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay {
            RoundedRectangle(cornerRadius: 20)
                .stroke(.white.opacity(0.70), lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.07), radius: 20, y: 8)
    }

    private var captureCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 5) {
                    Text("CAPTURE A THOUGHT")
                        .font(.caption.weight(.bold))
                        .tracking(1.2)
                        .foregroundStyle(MacNotebookTheme.mutedInk)
                    Text("Catch it while it is here.")
                        .font(.title2.weight(.bold))
                        .foregroundStyle(MacNotebookTheme.ink)
                }
                Spacer()
                Image(systemName: "pencil.line")
                    .font(.title3)
                    .foregroundStyle(MacNotebookTheme.ink)
            }

            ZStack(alignment: .topLeading) {
                TextEditor(text: $draft)
                    .font(.body)
                    .foregroundStyle(MacNotebookTheme.ink)
                    .scrollContentBackground(.hidden)
                    .padding(10)
                    .frame(minHeight: 170)
                    .background(MacNotebookTheme.capturePaper, in: RoundedRectangle(cornerRadius: 12))
                if draft.isEmpty {
                    Text(kind.prompt)
                        .font(.title3)
                        .foregroundStyle(MacNotebookTheme.mutedInk.opacity(0.75))
                        .padding(.horizontal, 22)
                        .padding(.vertical, 22)
                        .allowsHitTesting(false)
                }
            }

            if let feedback {
                Label(feedback, systemImage: feedback.hasPrefix("Captured") ? "checkmark.circle.fill" : "info.circle")
                    .font(.callout)
                    .foregroundStyle(feedback.hasPrefix("Captured") ? MacNotebookTheme.tealAccent : MacNotebookTheme.mutedInk)
            }

            HStack(spacing: 10) {
                ForEach(NotebookCaptureKind.allCases) { captureKind in
                    Button(captureKind.label) {
                        kind = captureKind
                        feedback = nil
                    }
                    .buttonStyle(.bordered)
                    .tint(kind == captureKind ? MacNotebookTheme.tealAccent : .secondary)
                    .controlSize(.large)
                }

                Spacer(minLength: 8)

                Button(action: submitCapture) {
                    Label(isCapturing ? "Capturing…" : "Capture", systemImage: "arrow.down.doc.fill")
                }
                .buttonStyle(.borderedProminent)
                .tint(MacNotebookTheme.tealAccent)
                .controlSize(.large)
                .disabled(isCapturing || model.activeVaultPath == nil)
            }
        }
        .padding(24)
        .background(.white.opacity(0.88), in: RoundedRectangle(cornerRadius: 14))
        .overlay {
            RoundedRectangle(cornerRadius: 14)
                .stroke(MacNotebookTheme.tealAccent.opacity(0.22), lineWidth: 1)
        }
    }

    private var stats: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 16), count: 4), spacing: 16) {
            ForEach(model.notebookStats, id: \.label) { stat in
                VStack(alignment: .leading, spacing: 7) {
                    Text("\(stat.value)")
                        .font(.system(size: 42, weight: .bold, design: .rounded))
                        .foregroundStyle(MacNotebookTheme.ink)
                    Text(stat.label)
                        .font(.headline)
                        .foregroundStyle(MacNotebookTheme.ink)
                    Text(stat.detail)
                        .font(.callout)
                        .foregroundStyle(MacNotebookTheme.mutedInk)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(22)
                .background(.white, in: RoundedRectangle(cornerRadius: 14))
                .shadow(color: .black.opacity(0.05), radius: 10, y: 3)
            }
        }
    }

    private var vaultHealth: some View {
        notebookPanel("Vault health", systemImage: "checkmark.shield.fill") {
            Label("Everything stays on this device", systemImage: "lock.fill")
                .font(.headline)
                .foregroundStyle(MacNotebookTheme.tealAccent)
            Text("\(model.documents.count) pages are visible here; protected pages remain behind the Locality Firewall.")
                .foregroundStyle(MacNotebookTheme.mutedInk)
        }
    }

    private var recentPages: some View {
        notebookPanel("Recent pages", systemImage: "clock.arrow.circlepath") {
            if model.recentNotebookDocuments.isEmpty {
                Text("Capture the first thought and it will wait here.")
                    .foregroundStyle(MacNotebookTheme.mutedInk)
            } else {
                ForEach(model.recentNotebookDocuments.prefix(4)) { document in
                    Button {
                        model.selectDestination(.pages)
                        model.selectedDocumentID = document.id
                    } label: {
                        HStack {
                            Image(systemName: document.systemImage)
                                .foregroundStyle(MacNotebookTheme.collectionColor(document.collection))
                            VStack(alignment: .leading, spacing: 2) {
                                Text(document.title).lineLimit(1)
                                Text(document.dashboardTypeName).font(.caption).foregroundStyle(MacNotebookTheme.mutedInk)
                            }
                            Spacer()
                            if document.isLocalOnly { Image(systemName: "lock.fill").font(.caption).foregroundStyle(MacNotebookTheme.warmAccent) }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var todayCard: some View {
        notebookPanel("Today", systemImage: "calendar") {
            Text(Date.now.formatted(.dateTime.weekday(.wide).month(.wide).day()))
                .font(.title3.weight(.bold))
                .foregroundStyle(MacNotebookTheme.ink)
            Text(todayPrompt)
                .foregroundStyle(MacNotebookTheme.mutedInk)
            HStack {
                Button("Journal") { kind = .journal }
                Button("Dream") { kind = .dream }
            }
            .buttonStyle(.bordered)
        }
    }

    private var notebookTitle: String {
        model.vaultName
            .replacingOccurrences(of: "-", with: " ")
            .capitalized
    }

    private var todayPrompt: String {
        if model.notebookStats[1].value == 0 { return "A private check-in can begin with one honest line." }
        if model.notebookStats[2].value == 0 { return "The dream lane is empty. Keep it private from the first line." }
        return "One page at a time. Capture what matters next."
    }

    private func notebookPanel<Content: View>(
        _ title: String,
        systemImage: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Label(title.uppercased(), systemImage: systemImage)
                .font(.caption.weight(.bold))
                .tracking(1)
                .foregroundStyle(MacNotebookTheme.tealAccent)
            content()
        }
        .frame(maxWidth: .infinity, minHeight: 150, alignment: .topLeading)
        .padding(22)
        .background(.white, in: RoundedRectangle(cornerRadius: 14))
        .shadow(color: .black.opacity(0.05), radius: 10, y: 3)
    }

    private func submitCapture() {
        guard kind != .ask else {
            feedback = "Ask joins the dashboard when Chitragupta is connected."
            return
        }
        guard model.activeVaultPath != nil else {
            feedback = "Open a vault before capturing."
            return
        }
        isCapturing = true
        Task {
            let captured = await model.captureNotebookThought(draft, as: kind)
            feedback = captured ? "Captured locally as a \(kind.label)." : "Write something first, or choose Journal or Dream for a blank template."
            if captured { draft = "" }
            isCapturing = false
        }
    }
}

private struct MacNotebookCalendar: View {
    let documents: [WorkspaceDocument]
    private let calendar = Calendar.current

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Label("CALENDAR", systemImage: "calendar")
                .font(.caption.weight(.bold))
                .tracking(1)
                .foregroundStyle(MacNotebookTheme.tealAccent)
            Text(Date.now.formatted(.dateTime.month(.wide).year()))
                .font(.title3.weight(.bold))
                .foregroundStyle(MacNotebookTheme.ink)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 7) {
                ForEach(calendar.shortWeekdaySymbols, id: \.self) { day in
                    Text(String(day.prefix(1))).font(.caption2.weight(.bold)).foregroundStyle(MacNotebookTheme.mutedInk)
                }
                ForEach(days, id: \.self) { day in
                    Text("\(calendar.component(.day, from: day))")
                        .font(.caption.weight(calendar.isDateInToday(day) ? .bold : .regular))
                        .frame(maxWidth: .infinity, minHeight: 26)
                        .background(calendar.isDateInToday(day) ? MacNotebookTheme.tealAccent : .clear, in: Circle())
                        .foregroundStyle(calendar.isDateInToday(day) ? .white : MacNotebookTheme.ink)
                }
            }
            Text("\(documents.filter(\.isLocalOnly).count) private pages held locally")
                .font(.caption)
                .foregroundStyle(MacNotebookTheme.mutedInk)
        }
        .frame(maxWidth: .infinity, minHeight: 150, alignment: .topLeading)
        .padding(22)
        .background(.white, in: RoundedRectangle(cornerRadius: 14))
        .shadow(color: .black.opacity(0.05), radius: 10, y: 3)
    }

    private var days: [Date] {
        guard let interval = calendar.dateInterval(of: .month, for: .now) else { return [] }
        let firstWeekdayOffset = (calendar.component(.weekday, from: interval.start) - calendar.firstWeekday + 7) % 7
        return (0 ..< firstWeekdayOffset).compactMap { calendar.date(byAdding: .day, value: -firstWeekdayOffset + $0, to: interval.start) }
            + (0 ..< calendar.range(of: .day, in: .month, for: .now)!.count).compactMap { calendar.date(byAdding: .day, value: $0, to: interval.start) }
    }
}
