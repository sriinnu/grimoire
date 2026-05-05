import SwiftUI
import WebKit

public enum WebMarkdownEditorSource: Equatable {
    case inline
    case html(String)
    case remote(URL)

    public static func baselineDevelopmentServer(port: Int = 5210) -> WebMarkdownEditorSource {
        WebMarkdownEditorSource.remote(URL(string: "http://127.0.0.1:\(port)/")!)
    }
}

public struct WebMarkdownEditorView: View {
    @Binding private var markdown: String
    private let source: WebMarkdownEditorSource

    public init(
        markdown: Binding<String>,
        source: WebMarkdownEditorSource = .inline
    ) {
        self._markdown = markdown
        self.source = source
    }

    public var body: some View {
        WebMarkdownEditorRepresentable(markdown: $markdown, source: source)
    }
}

#if os(macOS)
private struct WebMarkdownEditorRepresentable: NSViewRepresentable {
    @Binding var markdown: String
    let source: WebMarkdownEditorSource

    func makeCoordinator() -> MarkdownWebCoordinator {
        MarkdownWebCoordinator(markdown: $markdown)
    }

    @MainActor
    func makeNSView(context: Context) -> WKWebView {
        makeWebView(coordinator: context.coordinator)
    }

    @MainActor
    func updateNSView(_ webView: WKWebView, context: Context) {
        updateWebView(webView, coordinator: context.coordinator, markdown: $markdown, source: source)
    }
}
#elseif os(iOS)
private struct WebMarkdownEditorRepresentable: UIViewRepresentable {
    @Binding var markdown: String
    let source: WebMarkdownEditorSource

    func makeCoordinator() -> MarkdownWebCoordinator {
        MarkdownWebCoordinator(markdown: $markdown)
    }

    @MainActor
    func makeUIView(context: Context) -> WKWebView {
        makeWebView(coordinator: context.coordinator)
    }

    @MainActor
    func updateUIView(_ webView: WKWebView, context: Context) {
        updateWebView(webView, coordinator: context.coordinator, markdown: $markdown, source: source)
    }
}
#endif

@MainActor
private final class MarkdownWebCoordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
    var markdown: Binding<String>
    var loadedSource: WebMarkdownEditorSource?

    init(markdown: Binding<String>) {
        self.markdown = markdown
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "markdownEditor", let nextMarkdown = message.body as? String else { return }
        markdown.wrappedValue = nextMarkdown
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        sync(markdown.wrappedValue, into: webView)
    }

    func sync(_ markdown: String, into webView: WKWebView) {
        let encoded = jsonStringLiteral(markdown)
        webView.evaluateJavaScript("window.__setMarkdown && window.__setMarkdown(\(encoded));")
    }
}

@MainActor
private func makeWebView(coordinator: MarkdownWebCoordinator) -> WKWebView {
    let configuration = WKWebViewConfiguration()
    configuration.userContentController.add(coordinator, name: "markdownEditor")
    let webView = WKWebView(frame: .zero, configuration: configuration)
    webView.navigationDelegate = coordinator
    return webView
}

@MainActor
private func updateWebView(
    _ webView: WKWebView,
    coordinator: MarkdownWebCoordinator,
    markdown: Binding<String>,
    source: WebMarkdownEditorSource
) {
    coordinator.markdown = markdown
    guard coordinator.loadedSource != source else {
        coordinator.sync(markdown.wrappedValue, into: webView)
        return
    }

    coordinator.loadedSource = source
    switch source {
    case .inline:
        webView.loadHTMLString(defaultEditorHTML(markdown: markdown.wrappedValue), baseURL: nil)
    case .html(let html):
        webView.loadHTMLString(html, baseURL: nil)
    case .remote(let url):
        webView.load(URLRequest(url: url))
    }
}

private func defaultEditorHTML(markdown: String) -> String {
    """
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { margin: 0; background: #fffdfa; color: #1d1d1b; }
          textarea {
            box-sizing: border-box;
            width: 100vw;
            height: 100vh;
            border: 0;
            resize: none;
            padding: 24px;
            font: 17px/1.55 ui-serif, Georgia, serif;
            background: transparent;
            color: inherit;
            outline: none;
          }
        </style>
      </head>
      <body>
        <textarea id="editor" spellcheck="false"></textarea>
        <script>
          const editor = document.getElementById('editor');
          window.__setMarkdown = value => {
            if (editor.value !== value) editor.value = value;
          };
          editor.addEventListener('input', () => {
            window.webkit.messageHandlers.markdownEditor.postMessage(editor.value);
          });
          window.__setMarkdown(\(jsonStringLiteral(markdown)));
        </script>
      </body>
    </html>
    """
}

private func jsonStringLiteral(_ value: String) -> String {
    guard
        let data = try? JSONEncoder().encode(value),
        let encoded = String(data: data, encoding: .utf8)
    else {
        return "\"\""
    }
    return encoded
}
