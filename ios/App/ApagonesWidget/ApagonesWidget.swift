import WidgetKit
import SwiftUI

// MARK: - Marca
private enum Brand {
    static let bg      = Color(red: 0.047, green: 0.024, blue: 0.031) // #0C0608
    static let surface = Color(red: 0.082, green: 0.055, blue: 0.071) // #150E12
    static let guinda  = Color(red: 0.396, green: 0.031, blue: 0.121) // #65081F
    static let guindaLt = Color(red: 0.62, green: 0.07, blue: 0.18)
    static let elec    = Color(red: 0.96, green: 0.72, blue: 0.19)     // #F5B731 (apagón)
    static let agua    = Color(red: 0.13, green: 0.82, blue: 0.94)     // #22D0F0 (fuga)
    static let ivory   = Color(red: 0.957, green: 0.933, blue: 0.949)  // #F4EEF2
    static let dim     = Color(red: 0.60, green: 0.53, blue: 0.60)
}

// MARK: - Datos
struct ApagonEntry: TimelineEntry {
    let date: Date
    let apagones: Int
    let fugas: Int
    let ok: Bool
}

private let SB_URL = "https://fybotuqwmzxsajedisus.supabase.co"
private let SB_KEY = "sb_publishable_xDfRes-w-U_ZqaxhSDv96g_828lnxS9"

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> ApagonEntry {
        ApagonEntry(date: Date(), apagones: 21, fugas: 1, ok: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (ApagonEntry) -> Void) {
        if context.isPreview {
            completion(ApagonEntry(date: Date(), apagones: 21, fugas: 1, ok: true)); return
        }
        fetchCounts { completion($0) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ApagonEntry>) -> Void) {
        fetchCounts { entry in
            // Refrescar cada 20 minutos
            let next = Calendar.current.date(byAdding: .minute, value: 20, to: Date()) ?? Date().addingTimeInterval(1200)
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }

    private func fetchCounts(_ done: @escaping (ApagonEntry) -> Void) {
        guard let url = URL(string: "\(SB_URL)/rest/v1/reports?resolved=eq.false&select=type") else {
            done(ApagonEntry(date: Date(), apagones: 0, fugas: 0, ok: false)); return
        }
        var req = URLRequest(url: url)
        req.setValue(SB_KEY, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(SB_KEY)", forHTTPHeaderField: "Authorization")
        req.timeoutInterval = 12
        URLSession.shared.dataTask(with: req) { data, _, _ in
            guard let data = data,
                  let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
                done(ApagonEntry(date: Date(), apagones: 0, fugas: 0, ok: false)); return
            }
            var apagones = 0, fugas = 0
            for r in arr {
                let t = (r["type"] as? String ?? "").lowercased()
                if t == "apagon" || t == "alumbrado" { apagones += 1 } else { fugas += 1 }
            }
            done(ApagonEntry(date: Date(), apagones: apagones, fugas: fugas, ok: true))
        }.resume()
    }
}

// MARK: - Vista de estado (apagones/fugas)
struct StatusView: View {
    @Environment(\.widgetFamily) var family
    let entry: ApagonEntry

    var body: some View {
        switch family {
        case .systemSmall: small
        default: medium
        }
    }

    private var small: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 5) {
                BoltMark(color: Brand.guindaLt, size: 16)
                Text("ApagonesMID").font(.system(size: 11, weight: .heavy)).foregroundColor(Brand.ivory)
            }
            Spacer(minLength: 0)
            stat(symbol: "bolt.fill", color: Brand.elec, value: entry.apagones, label: "apagones")
            stat(symbol: "drop.fill", color: Brand.agua, value: entry.fugas, label: "fugas")
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetURL(URL(string: "apagonesmid://open"))
    }

    private var medium: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                BoltMark(color: Brand.guindaLt, size: 18)
                Text("ApagonesMID").font(.system(size: 13, weight: .heavy)).foregroundColor(Brand.ivory)
                Spacer()
                Text("Mérida").font(.system(size: 11, weight: .semibold)).foregroundColor(Brand.dim)
            }
            HStack(spacing: 12) {
                bigStat(symbol: "bolt.fill", color: Brand.elec, value: entry.apagones, label: "Apagones")
                bigStat(symbol: "drop.fill", color: Brand.agua, value: entry.fugas, label: "Fugas / cortes")
            }
            Spacer(minLength: 0)
            Text(entry.ok ? "Activos ahora · toca para ver el mapa" : "Sin conexión · toca para abrir")
                .font(.system(size: 10, weight: .medium)).foregroundColor(Brand.dim)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetURL(URL(string: "apagonesmid://open"))
    }

    private func stat(symbol: String, color: Color, value: Int, label: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: symbol).font(.system(size: 13, weight: .bold)).foregroundColor(color)
            Text("\(value)").font(.system(size: 20, weight: .black)).foregroundColor(Brand.ivory)
            Text(label).font(.system(size: 11, weight: .semibold)).foregroundColor(Brand.dim)
        }
    }

    private func bigStat(symbol: String, color: Color, value: Int, label: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 5) {
                Image(systemName: symbol).font(.system(size: 14, weight: .bold)).foregroundColor(color)
                Text("\(value)").font(.system(size: 30, weight: .black)).foregroundColor(Brand.ivory)
            }
            Text(label).font(.system(size: 10, weight: .semibold)).foregroundColor(Brand.dim)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Brand.surface)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

// MARK: - Vista "Reportar ahora"
struct ReportView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            BoltMark(color: .white, size: 22)
            Spacer(minLength: 0)
            Text("Reportar ahora").font(.system(size: 16, weight: .heavy)).foregroundColor(.white)
            Text("Toca para reportar con tu ubicación")
                .font(.system(size: 11, weight: .medium)).foregroundColor(Color.white.opacity(0.85))
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetURL(URL(string: "apagonesmid://report?type=apagon&gps=1"))
    }
}

// MARK: - Marca gráfica (rayo)
struct BoltMark: View {
    let color: Color
    let size: CGFloat
    var body: some View {
        Image(systemName: "bolt.fill")
            .font(.system(size: size, weight: .black))
            .foregroundColor(color)
    }
}

// MARK: - Fondos (compatibilidad iOS 17 containerBackground)
private func bg(_ gradientTop: Color, _ gradientBottom: Color) -> LinearGradient {
    LinearGradient(colors: [gradientTop, gradientBottom], startPoint: .top, endPoint: .bottom)
}

struct StatusWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ApagonesStatusWidget", provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                StatusView(entry: entry).padding(14)
                    .containerBackground(for: .widget) { bg(Brand.surface, Brand.bg) }
            } else {
                StatusView(entry: entry).padding(14).background(bg(Brand.surface, Brand.bg))
            }
        }
        .configurationDisplayName("Apagones y fugas")
        .description("Cuántos apagones y fugas hay activos en Mérida.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct ReportWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ApagonesReportWidget", provider: Provider()) { _ in
            if #available(iOS 17.0, *) {
                ReportView().padding(14)
                    .containerBackground(for: .widget) { bg(Brand.guindaLt, Brand.guinda) }
            } else {
                ReportView().padding(14).background(bg(Brand.guindaLt, Brand.guinda))
            }
        }
        .configurationDisplayName("Reportar ahora")
        .description("Botón directo para reportar un apagón o fuga con tu ubicación.")
        .supportedFamilies([.systemSmall])
    }
}

@main
struct ApagonesWidgetBundle: WidgetBundle {
    var body: some Widget {
        StatusWidget()
        ReportWidget()
    }
}
