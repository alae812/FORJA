# FORJA — Tu historia de entrenamiento

App privada de fitness gamificado con estética anime de acción: registra tus
entrenamientos, gana XP calculada en el servidor, sube de nivel y vive una
novela visual original que reacciona a tu progreso.

> **Inspiración y originalidad.** FORJA se inspira únicamente en la *categoría*
> de apps de "anime workout story" (fitness gamificado con narrativa). Todo lo
> demás es original: personajes, historia, diálogos, fórmulas de XP, código y
> recursos visuales (generados por código/SVG, sin assets de terceros). No se ha
> copiado ni se afirma conocer código, fórmulas o arquitectura interna de
> ninguna app existente.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript estricto
- Tailwind CSS 4 + Framer Motion
- Zod (validación) · Vitest (unit) · Playwright (e2e)
- Supabase/PostgreSQL opcional; por defecto persistencia local en JSON

## Puesta en marcha

```bash
npm install
npm run dev      # http://localhost:3000
```

Crea tu héroe en `/auth` (modo demo, sin contraseña). Tus datos se guardan en
`data/forja-db.json` (configurable con `FORJA_DATA_DIR`).

### Variables de entorno

Copia `.env.example` a `.env.local`. Sin credenciales la app funciona en
**modo demo explícito**: la UI lo indica y nunca finge haber ejecutado IA o
servicios reales.

| Variable | Uso |
|---|---|
| `FORJA_DATA_DIR` / `FORJA_MEDIA_DIR` | Dónde se guardan datos y fotos (defecto: `data/`) |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Activa el adaptador Supabase (ver migraciones en `supabase/migrations/`) |
| `AI_PROVIDER` = `anthropic`/`openai` + `*_API_KEY`/`*_MODEL` | Generación de escenas narrativa real |
| `AI_VISION_PROVIDER` + `AI_VISION_API_KEY` | Análisis visual real de fotos |

## Comandos

```bash
npm run dev        # desarrollo
npm run build      # build de producción (37 rutas verificadas)
npm start          # servir el build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest (67 tests)
npm run test:e2e   # playwright (6 tests; requiere `npm run dev` en :3100)
```

> Los e2e usan el Chromium del sistema (`/opt/meta-chromium/chrome`). Ese
> Chromium bloquea `page.goto()` a localhost por sus Local Network Access
> checks; los tests navegan vía helper `gotoApp` (`e2e/fixtures.ts`).

## Reglas de juego (fórmulas originales)

- Serie válida de fuerza: **8 XP** (+2 si cumple objetivo)
- Cardio moderado: **5 XP / 5 min** (prorrateado) · Movilidad/técnica: **3 XP / 5 min** (tope diario)
- Sesión completada: **15 XP** · Objetivo diario cumplido: **5 XP**
- Nivel: `XP_requerida(L) = 100 × L²` (L ≥ 1)
- Topes diarios anti-spam: 30 series, 30 bonus, 120 min cardio, 60 min movilidad, 3 bonus de sesión
- Report Card: `R = 0,45T + 0,25H + 0,20C + 0,10W` → rangos S/A/B/C/D. Sin datos esenciales: **"Evaluación incompleta"** (nunca un cero inventado)

## Garantías técnicas

- **XP solo en servidor**, idempotente (clave UUID), con reversión auditable al editar/borrar sesiones.
- **Fotos**: consentimiento explícito, máx. 8 MB, original no guardado por defecto, borrado disponible. **Prohibidas** inferencias de grasa corporal, masa muscular, fuerza, hormonas, salud o atractivo. Sin proveedor de visión: modo demo etiquetado.
- **Historia**: proveedor IA configurable (Anthropic/OpenAI) o escenas de reserva originales; la UI distingue `ai` de `fallback`. Elecciones persistentes con flags y XP narrativa.
- **Privacidad**: exportación JSON completa y borrado total desde `/privacidad`. Sin telemetría invasiva.
- Accesible: respeta `prefers-reduced-motion`, navegación por teclado, mobile-first.

## Estado verificado (2026-10-10)

- `npm run build` ✅ · `tsc` ✅ · `eslint` ✅
- Vitest: **67/67** ✅ · Playwright: **6/6** ✅ (onboarding, sesión+XP, idempotencia, informe honesto, navegación móvil, exportar datos)
- Flujo real probado en navegador: auth, onboarding, sesión, subida de nivel, reversión al borrar, historia, sueño/nutrición/bienestar, informe B (79,25), análisis demo, consentimiento obligatorio.

### Limitaciones conocidas

- Sin `SUPABASE_*`: modo local demo (JSON). No equivale a seguridad de producción.
- Sin `AI_*`: historia y análisis visual usan modos demo/reserva, siempre etiquetados.
- La autenticación es una sesión demo por cookie httpOnly (sin login real).
- Corregido el 2026-10-10: el adaptador local invalidaba mal su caché en memoria entre ámbitos de módulo (páginas vs API en dev); ahora invalida por mtime del fichero.

## Despliegue

```bash
npm run build && npm start
```

Para Supabase: crea el proyecto, ejecuta `supabase/migrations/*.sql` y define
`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. Para producción, sustituye la
sesión demo por autenticación real (el adaptador está preparado para ello).


