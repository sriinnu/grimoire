import SwiftUI

extension View {
    @ViewBuilder
    func grimoireGlassCard(cornerRadius: CGFloat = 14) -> some View {
#if compiler(>=6.2)
        if #available(macOS 26.0, *) {
            padding(12)
                .glassEffect(.regular, in: .rect(cornerRadius: cornerRadius))
        } else {
            grimoireMaterialFallback(cornerRadius: cornerRadius)
        }
#else
        grimoireMaterialFallback(cornerRadius: cornerRadius)
#endif
    }

    private func grimoireMaterialFallback(cornerRadius: CGFloat) -> some View {
        padding(12)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: cornerRadius))
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(.separator.opacity(0.45), lineWidth: 0.5)
            }
    }
}
