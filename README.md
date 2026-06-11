# ApagonesMID — Mérida 🔌💧

App cívica para reportar **apagones** (cortes de luz) y **fugas de agua** en Mérida, Yucatán.
Los reportes se ven en tiempo real en un mapa y alimentan estadísticas, alertas y chat por zona.

- **Dominio:** https://apagonesmid.mx (GitHub Pages)
- **Tipo:** PWA (web app instalable) — base para empaquetar como app nativa iOS con Capacitor
- **Backend:** Supabase (proyecto `fybotuqwmzxsajedisus`)

---

## Estructura del proyecto

```
ApagonesMID/
├── www/                  ← La PWA (fuente de verdad). Se publica en apagonesmid.mx
│   ├── index.html        ← App principal (mapa, reportes, chat, alertas)
│   ├── dashboard.html    ← Panel de estadísticas
│   ├── apx-ops.html      ← Panel de operaciones/admin
│   ├── anuncios.html     ← Anuncios
│   ├── noticias.html     ← Noticias
│   ├── medios.html       ← Kit de medios / prensa
│   ├── carta.html        ← Carta / about
│   ├── widget.html       ← Widget embebible
│   ├── manifest.json     ← Manifest PWA
│   ├── sw.js             ← Service worker (offline + caché)
│   ├── CNAME             ← apagonesmid.mx
│   └── icon-*.png        ← Iconos (16…1024 + maskable)
├── README.md
└── .gitignore
```

> La carpeta `www/` es la convención de Capacitor para el `webDir`, así que cuando
> agreguemos el wrapper nativo iOS no hay que mover nada.

---

## Backend Supabase

Proyecto: `fybotuqwmzxsajedisus.supabase.co`

### Tablas que usa la app
| Tabla | Para qué |
|---|---|
| `reports` | Reportes activos de apagón/fuga (tipo, sección, severidad, votos, confirmaciones) |
| `reports_historico` | Reportes ya resueltos (archivo histórico) |
| `report_contacts` | Contactos de quien reporta (nombre, teléfono) — protegido por login |
| `zone_messages` | Chat por zona/sección |
| `scheduled_outages` | Apagones programados |
| `alert_subscriptions` | Suscripciones a alertas |

### Tiempo real
La app ya implementa `initRealtime()` suscribiéndose a cambios de la tabla `reports`
vía `db.channel('rpts').on('postgres_changes', …)`. El chat por zona usa otro canal
(`chat-<seccion>`). Para que funcione, esas tablas deben tener **Realtime/replication
habilitado** en Supabase (pendiente de verificar).

---

## Pendientes / Roadmap

- [x] Consolidar 30+ versiones en un solo proyecto limpio (base: `v82-COMPLETO`)
- [x] Regenerar iconos faltantes (16/32/48/72/96/128/144/152/167/256/384) que rompían el SW
- [ ] Subir a GitHub + publicar en GitHub Pages (apagonesmid.mx)
- [ ] Verificar/activar Realtime en Supabase para `reports` y `zone_messages`
- [ ] Empaquetar con Capacitor → proyecto Xcode → App Store (requiere cuenta Apple Developer)
- [ ] Revisar seguridad: RLS en Supabase, manejo de la anon key

---

## Versiones antiguas

Existen 30+ versiones históricas en `~/Downloads` (V1…V17, ApagonesV2…V9, FIX, TOPBAR, etc.).
**No se usan.** Esta carpeta (`/Users/edy/Xcode/ApagonesMID`) es la única fuente de verdad.
