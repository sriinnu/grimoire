import SwiftUI

extension View {
    @ViewBuilder
    func grimoireGlassCard(cornerRadius: CGFloat = 14) -> some View {
        if #available(macOS 26.0, *) {
            padding(12)
                .glassEffect(.regular, in: .rect(cornerRadius: cornerRadius))
        } else {
            padding(12)
                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: cornerRadius))
                .overlay {
                    RoundedRectangle(cornerRadius: cornerRadius)
                        .stroke(.separator.opacity(0.45), lineWidth: 0.5)
                }
        }
    }
}
