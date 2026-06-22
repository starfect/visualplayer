import SwiftUI

struct PlayerSurface: UIViewRepresentable {
    let renderView: UIView?

    func makeUIView(context: Context) -> UIView {
        let container = UIView()
        container.backgroundColor = .black
        return container
    }

    func updateUIView(_ container: UIView, context: Context) {
        guard container.subviews.first !== renderView else { return }
        container.subviews.forEach { $0.removeFromSuperview() }
        guard let renderView else { return }
        renderView.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(renderView)
        NSLayoutConstraint.activate([
            renderView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            renderView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            renderView.topAnchor.constraint(equalTo: container.topAnchor),
            renderView.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])
    }
}
