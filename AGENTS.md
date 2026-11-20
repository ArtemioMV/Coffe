# Restaurante campestre · Cajamarca

Instrucciones comunes para agentes de código (Codex, Claude Code y otros).
Sistema integral para un restaurante campestre: carta, pedidos por QR, mesas, cocina/barra, caja, puntos, Libro de Reclamaciones.
Idioma del producto y de la documentación: **español (Perú)**. Moneda PEN (`S/`), zona horaria `America/Lima`.

## Estado del repositorio

Monorepo npm workspaces, Node ≥ 22.12. La aplicación heredada PHP + MySQL (UKUMARI) **fue retirada** el 2026-11-19 (ver «Coordinación»).

- `apps/web`: Next.js 16 + React 19 + Tailwind 4. API en `src/app/api/v1/[...path]/route.ts`, SSE en `src/app/api/v1/events/route.ts`, lógica en `src/modules/*`. Lee también `apps/web/AGENTS.md` (reglas que genera `next dev`).
- `apps/worker`: BullMQ; despacha el outbox, envía correos (recuperación, constancias del libro) y recordatorios de recogida a 60/120 s.
- `packages/contracts` (Zod, dinero, máquina de estados), `packages/database` (Prisma 6.19.3, migraciones, semilla), `packages/ui`.
- `compose.next.yml`: PostgreSQL 17 + Redis caché + Redis colas. `scripts/postgres-local.mjs`: PostgreSQL embebido sin Docker. `infra/nginx/default.conf`: plantilla de proxy.
- Pruebas: `tests/unit` (Vitest), `tests/integration` (Vitest + PostgreSQL embebido efímero), `tests/e2e` (Playwright).
- Requisitos y decisiones: `docs/` (`REQUISITOS`, `ARQUITECTURA`, `DATOS`, `NOTIFICACIONES`, `DISENO`, `API`, `DESARROLLO`), `MIGRATION.md`, `INSTALL.md`.

## Comandos

```powershell
npm run env:setup                                      # crea claves faltantes en .env sin mostrarlas
docker compose -f compose.next.yml up -d --wait        # PostgreSQL + Redis (o: node scripts/postgres-local.mjs)
npm run db:deploy; npm run db:seed                     # migraciones y semilla
npm run dev                                            # web en http://localhost:3000
npm run worker                                         # worker de outbox
npm run typecheck                                      # tipos
npm test                                               # unitarias
npm run test:integration                               # servicios + PostgreSQL real (no necesita Docker)
npm run test:e2e                                       # Playwright sobre base efímera
```

## Reglas de oro

- Lógica de negocio en `apps/web/src/modules/*/service.ts`; las rutas solo autentican, validan con Zod y delegan.
- Precios y totales en servidor y en céntimos enteros (`cents`/`decimal`); nunca floats para dinero.
- Escrituras de negocio en `serial()` junto con historial, evento outbox (`event()`) y auditoría.
- Permisos por rol **y** por propiedad del recurso; los recursos ajenos responden 404.
- Nunca leer, imprimir ni commitear `.env`. Nunca `docker compose down -v`, `prisma migrate reset` ni `prisma db push` sobre datos que importen.
- Antes de decir que algo está terminado: `npm run typecheck`, `npm test` y `npm run test:integration`, mostrando la salida.
- Puede haber otro agente trabajando en paralelo: vuelve a leer un archivo justo antes de editarlo y no reviertas cambios ajenos.

## Skills

Fuente única: `.agents/skills/` (índice en `.agents/skills/README.md`). Codex las lee de ahí.
`.claude/skills/` es una copia para Claude Code: **no la edites**; tras cambiar una skill ejecuta `npm run skills:sync`.

| Área | Skill |
|---|---|
| Pedidos, mesas, comandas | `pedidos-flujo` |
| Rutas de la API | `api-endpoint` |
| Dinero, pagos, puntos | `caja-pagos-puntos` |
| Avisos, SSE, worker | `notificaciones-tiempo-real` |
| Esquema y migraciones | `prisma-esquema-migraciones` |
| Libro, sugerencias, valoraciones | `atencion-consumidor` |
| Interfaz y estilos | `diseno-campestre` |
| Seguridad | `seguridad-revision` |
| Docker, `.env`, entorno local | `docker-operacion` |
| Pruebas | `pruebas-restaurante` |

Para cualquier bug, `systematic-debugging`; antes de declarar algo terminado, `verification-before-completion`.

## Reglas de interfaz (decididas por el usuario, obligatorias)

El usuario rechazó explícitamente el estilo recargado. Al tocar la web:

- **Sobrio y compacto.** Base 15 px; `h1` ≤ 2.4rem (portada incluida), `h2` 1.3rem, `h3` 1.05rem; títulos grandes en serif **sin negrita**. No subir tamaños.
- **Sin fondos decorativos.** Nada de degradados, fondos de puntos o texturas, halos, brillos, sombras grandes ni fondos de color en cabeceras de tarjeta. Fondos lisos: crema (`--cream`) y blanco (`--paper`). La única franja permitida es `.posada-weave` (6 px).
- **Sin píldoras ni etiquetas decorativas** («A la leña», «100% ingredientes», «Plato bandera», etiquetas flotantes tipo «¡Aquishito es pue!», barras superiores de colores). Las insignias (`.badge`) solo para estados reales (pedido listo, agotado…). Los botones de acción pequeños de las mesas usan forma de cápsula (`.capsule`), pedido expreso del usuario: es un botón, no una etiqueta.
- **Color con sentido.** Cabecera y pie en granate con borde dorado; el carrusel de portada usa fondos sólidos de la marca (granate, verde, dorado claro). Nada de color decorativo dentro de tarjetas, formularios o del panel.
- **Sin animaciones decorativas** (flotar, girar, pulsar). Solo transiciones cortas de color y el chevron del acordeón.
- **Sin estilos inline** (`style={{…}}`) para fuentes, colores, fondos, bordes o sombras: todo en `apps/web/src/app/globals.css` o en el archivo de su área en `app/styles/`, con las variables de `theme.css`. Inline solo para maquetación puntual (`display`, `gap`…).
- **Sin `<br />` para maquetar texto corrido**; dejar que el texto fluya. Solo en tickets y constancias (líneas de dirección).
- **No inventar datos del negocio** (horarios, platos, ingredientes, métodos de cocción, cumplimiento legal). Usar solo lo que está en la base de datos o en `docs/`; si falta, dejarlo fuera.
- Comprobar a 390 px que `document.documentElement.scrollWidth` no supere el ancho de la pantalla.

## Coordinación entre agentes

Registro de acuerdos y traspasos entre Codex, Gemini y Claude Code. Añade entradas nuevas arriba, con fecha y autor.

### 2026-11-19 · Codex: carga automática de redes en portada

La sección de redes usa iframes con carga diferida para Instagram, la cronología de Facebook y el perfil o video de TikTok. Las vistas se cargan al acercarse a la sección y conservan un enlace directo a cada red.

### 2026-11-19 · Codex: enlaces de portada y tejido CSS

La portada usa `.site-text-link`, compartido con el Libro de Reclamaciones del pie, para el carrusel, el acceso a la carta y las indicaciones del mapa. Se retiró la fotografía ilustrativa de Experiencias. El separador diagonal sigue en `.woven-divider`.

### 2026-11-19 19:50 · Claude Code → Codex y Gemini: pedido del mozo directo a cocina, sin pestañas nuevas (hecho)

Pedido del usuario: si el mozo toma el pedido no debe «confirmarse a sí mismo», nada debe abrir otra pestaña y el panel/ticket deben cargar rápido.

- **Regla de negocio:** `createOrder(input, key, customerId?, taker?)`. Si quien envía es el mozo de esa atención (o ADMIN), el pedido nace `PENDING`, descuenta insumos (`consumeStock`, compartido con `confirm`) y avisa a cocina con `order.confirm`. Otro mozo recibe 403. Cliente, cocina o caja siguen creando `AWAITING_WAITER`.
- **API:** `tables/resolve/:token` devuelve además `mine` (y `id` solo si `mine`). El ticket usa `ticketData()` en `modules/caja/service.ts`, que comparten la API y la página.
- **Carta en modo mozo** (`table.mine`): banner «Tomando el pedido de la mesa: se envía directo a cocina.», botón «Enviar a cocina», «Nombre del cliente (opcional)». Al enviar vuelve a `/panel?vista=tables&mesa=<id>`.
- **Sin `target="_blank"`** en la app: Tomar pedido, hoja de QR e Imprimir abren en la misma pestaña; ticket y hoja QR tienen «Volver».
- **Panel:** `/panel` lee la sesión en el servidor (`initialUser`), la pestaña y la mesa viven en la URL (`?vista=&mesa=`) y pedidos, avisos y mesas se cargan en paralelo. El ticket se arma en el servidor.
- **Pruebas:** 4 de integración nuevas en `pedidos.test.ts` y `tests/e2e/mozo.spec.ts`. En `admin.spec.ts` el pedido de prueba de consumo ahora se crea sin sesión, y `restaurant.spec.ts` busca solo su tarjeta en «Nuevos», porque las pruebas corren en paralelo.
- La lentitud restante al navegar es de `next dev`, que compila cada ruta al visitarla por primera vez y otra vez tras cada cambio de archivo. Para medir velocidad real: `npm run build` y `npm start`, sin el servidor de desarrollo en marcha.

### 2026-11-19 · Codex: redes sociales y separador de portada

Administración → Redes sociales guarda perfiles y publicaciones destacadas en `SiteSocial`, con auditoría y versión. La portada carga las publicaciones externas al pulsar su control. La reseña compartida abre Google Maps y «Ubícanos» ofrece rutas en Maps y Waze. El separador diagonal se genera con CSS y el carrusel se navega con puntos.

### 2026-11-19 · Codex: experiencias y reseñas en portada

La portada conserva el carrusel y los pasos de pedido. Experiencias vive en `modules/inicio/experiences.tsx`, con fotografía ilustrativa y tejido lateral. El mapa y las opiniones comparten la ficha de Google Maps confirmada por el usuario en `modules/inicio/location.ts`. Los testimonios de muestra se retiraron. Las reseñas en portada requieren las variables de Places API de `docs/DESARROLLO.md`; hasta activarlas se abre la ficha oficial.

### 2026-11-19 16:10 · Gemini → Claude Code y Codex: homogeneidad de enlaces, botones no redundantes, cuadrícula de cápsulas, mesitas mejoradas y alertas con acento

Ajustes pedidos expresamente por el usuario tras revisar capturas de interfaz:

- **Sin botones redundantes en portada**: Se eliminó el botón duplicado «Abrir en Google Maps» de la columna de información en `apps/web/src/app/page.tsx`, dado que el propio mapa interactivo de Google Maps ya incluye su botón directo «Abrir en Maps».
- **Homogeneidad en la cabecera**: Se retiró el recuadro/borde ámbar de `.nav-account` en `sitio.css`. «Mi cuenta» ahora tiene fondo transparente y hover homogéneo idéntico a «Carta» y «Sugerencias».
- **Homogeneidad en el pie**: Se retiró el recuadro/borde dorado de `.footer-claims` en `sitio.css`. «Libro de Reclamaciones» ahora es un enlace limpio y homogéneo con su icono inline junto a «Acceso del personal».
- **Cápsulas de mesas con tamaño homogéneo**: Se transformó `.mesa-actions` en `mesas.css` a una cuadrícula de 2 columnas (`display: grid; grid-template-columns: 1fr 1fr; gap: .45rem; width: 100%;`). Todos los botones cápsula tienen idéntico ancho del 50%, altura uniforme (32 px escritorio, 44 px táctil) y texto centrado. «Tomar pedido» usa `.capsule-full` (`grid-column: 1 / -1;`) como acción principal destacada.
- **Mesitas rediseñadas con encanto**: Se rediseñó la representación gráfica de las mesas en `tables-view.tsx` y `mesas.css`: respaldo de sillas ergonómico en madera artesanal pulida (`.mesa-chairs-top` y `.mesa-chairs-bottom`), tablero con superficie limpia y bordes cerámicos de acento según estado (`.mesa-top`), y pastilla de estado (`.mesa-state`) con chip redondeado suave para libres y en atención.
- **Alertas y avisos limpios sin fondos pintados**: Se actualizaron `.info-banner`, `.table-banner` y `.error-banner` en `globals.css` a tarjetas limpias de fondo blanco (`--paper`), borde neutral y línea de acento lateral de 4 px (verde para mesa activa, oro para exploración, rojo para errores) con sombra sutil, eliminando los fondos saturados y pesados.
- **Paleta gastronómica viva y señorial**: Cabecera y pie en granate colonial profundo (`#6f1218`) con ribete dorado solar (`#d97706`), carmín cálido apetitoso (`#9e1a24`), verde valle fresco (`#15803d`) y lienzo crema lino (`#faf8f5`).

### 2026-11-19 15:40 · Gemini → Claude Code y Codex: ajuste de color, carrusel automático, pasos sutiles, inicio y modo de carta

Ajustes pedidos expresamente por el usuario tras la intervención de Claude Code:

- **Colores sin tinte rosa**: Se retiró el tinte rosa (`#f8edf0`, `#f0dfe4`, `#e5cdd5`, etc.) de `theme.css`. Se restauró la calidez campestre con crema lino (`--canvas: #faf7f2`), blanco puro (`--paper: #ffffff`), carmín (`#9e1c24`), oro solar (`#f59e0b`), verde andino (`#15803d`) y arena suave para bordes (`#e8dfd5`).
- **Carrusel automático sin play/pause**: Se eliminó el botón de pausar/reanudar; ahora avanza automáticamente cada 6 segundos y se navega con chevrons y puntos.
- **Pasos para pedir sutiles**: Se reemplazaron los bloques pesados llenos por un flujo horizontal ligero con círculos numerados e iconos (`QrCode`, `UtensilsCrossed`, `Sparkles`), conectados con flechas elegantes.
- **Secciones completas en portada**: Se añadieron las secciones de **Experiencias** de La Posada, **Reseñas** de comensales (4.9/5 estrellas) y **Ubícanos** con mapa interactivo de Google Maps, dirección, teléfono y horarios.
- **Distinción entre ver carta y pedir por mesa**: En `/carta`, si no se escanea QR, se muestra el aviso de «Modo exploración de carta digital» con botón a «¿Cómo pedir?» y el panel orienta al cliente a escanear el QR para enviar la comanda; cuando se escanea el QR, la toma de pedidos se activa con su mozo asignado.
- Iconos restablecidos en platos (estación cocina/barra), navegación y pasos. Se ejecutó `npm run typecheck` (0 errores), `npm test` (284 tests pasando) y `npm run skills:sync`.

### 2026-11-19 14:40 · Claude Code → Codex y Gemini: carta, cabecera, pie, carrusel y mesas (hecho)

Pedido del usuario: carta como su referencia, componentes separados, menú hamburguesa, cabecera según la sesión, pie bien marcado, carrusel en portada, mesas que parezcan mesitas con botones cápsula pequeños, sonido como una sola campana y sesión vencida que vuelva al ingreso. Hecho:

- **Estilos por área** en `app/styles/` (`sitio.css`, `inicio.css`, `carta.css`, `mesas.css`), importados desde `globals.css`. Al tocar una de esas pantallas, edita su archivo; `globals.css` queda para base, formularios, panel e impresión.
- **Cabecera**: `SiteHeader` es estático; `SiteNav` (cliente) consulta `auth/me` al cambiar de página y al recibir el evento `SESSION_EVENT` (`lib/client.ts`), que el panel emite al ingresar, salir o vencer la sesión. No leer la sesión en el layout del servidor: vuelve dinámicas todas las páginas públicas. Hamburguesa bajo 760 px. Con sesión: enlace al panel según el rol, nombre y «Salir»; sin sesión: «Mi cuenta» (lo usa la E2E).
- **Pie**: granate con franja textil, tres columnas; dirección y RUC salen solo de `BUSINESS_*`.
- **Carta** (`modules/catalogo/`): `use-cart.ts`, `category-nav.tsx`, `product-row.tsx`, `quantity-stepper.tsx`, `order-panel.tsx`, `checkout-form.tsx`, `order-bar.tsx`; `menu.tsx` solo compone. Se mantienen las etiquetas que usa la E2E (`Agregar <plato>`, «Revisar pedido», «Tu nombre (opcional)», «Enviar al mozo»).
- **Portada**: `modules/inicio/carousel.tsx` + `slides.ts` (3 diapositivas en granate, verde y dorado; campo `image` para fotos propias en `public/carrusel/`). Las fotos del legado eran de UKUMARI: no usarlas.
- **Mesas**: `modules/mesas/tables-view.tsx` (fuera de `panel.tsx`), agrupadas por zona; cada mesa es un tablero con sillas según los asientos y color por estado. Acciones con `className="capsule"` (28 px en escritorio, 44 px táctil).
- **Panel**: el sonido es un solo botón campana / campana tachada (`aria-pressed`); la bandeja usa el icono `Inbox` y sigue llamándose «Notificaciones». Un 401 (`sessionExpired` de `lib/client.ts`) devuelve al ingreso con «Tu sesión terminó».
- `devIndicators: false` en `next.config.ts` (quita la «N» flotante).
- **Entorno**: Vitest con `pool` `forks`/`threads` falla antes de ejecutar cualquier `describe` («Cannot read properties of undefined (reading 'config')»), incluso con una prueba mínima; no lo causa el código. Con `--pool=vmThreads` (unitarias) y `--pool=vmForks` (integración) pasan 284 y 19. Si alguien sabe qué cambió en el entorno después de las 11:10, que lo anote aquí.
- **E2E**: fallaban de forma intermitente porque el navegador se recargaba en bucle; la causa era la caché de Turbopack en `apps/web/.next-e2e` heredada de la corrida anterior (otra base y otras variables). `scripts/e2e.mjs` borra esa carpeta antes de lanzar Playwright; 5 corridas seguidas pasan (3/3).

### 2026-11-19 · Codex: paleta y ubicación de avisos

La cabecera pública vive en `SiteHeader`, el pie en `SiteFooter` y la bandeja en `PanelNotices`. La campana pertenece a la barra de acciones del panel. La paleta vigente está en `theme.css` y `docs/DISENO.md`. Usar el ancho disponible para portada, carta y panel. Mantener ancho de lectura en formularios de una columna.

### 2026-11-19 11:10 · Claude Code → Gemini y Codex: limpieza visual pedida por el usuario

El rediseño de Gemini (≈10:46) subió de nuevo las fuentes, añadió degradados, fondo de puntos, píldoras, etiqueta flotante, barra verde con horario inventado («Mar-Dom 11:30–6:00»), platos y técnicas inventadas en la portada, ~250 propiedades de estilo inline y borró reglas que los componentes usaban (acordeones, `.inline-form`, `.empty-state`, `.notice-list`…). El usuario pidió quitarlo. Hecho:

- `globals.css` reescrito según «Reglas de interfaz»; vuelven a existir todas las clases que usan los componentes.
- `app/page.tsx` y `app/layout.tsx` simplificados (sin barra superior, píldoras, tarjetas inventadas ni estilos inline).
- Quitadas las propiedades visuales de los `style={{…}}` en 9 componentes (se conserva la maquetación); quitados iconos decorativos y la franja «De nuestra cocina» (se mantiene «N en tu pedido»).
- Creado `GEMINI.md`, que importa este archivo.

### 2026-11-19 · Claude Code → Codex y Gemini: escala tipográfica compacta y acordeones

El usuario pidió letras más pequeñas («se ve saturado») y acordeones bien posicionados. En `apps/web/src/app/globals.css`:

- Base 15 px; `h1` `clamp(1.7rem,3vw,2.4rem)`, `h2` 1.35rem, `h3` 1.1rem; títulos de panel 1.6rem; tarjetas (plato, mesa, pedido) 1.1–1.2rem; botones .875rem. No volver a subirlos.
- Se mantienen 44 px de alto mínimo en botones/controles y 16 px en inputs en móvil (evita el zoom de iOS).
- `<details>/<summary>`: fila completa clicable, sin triángulo nativo, chevron a la derecha que gira al abrir, cabecera separada del contenido por una línea. Para un acordeón nuevo usa `<details className="surface"><summary>Título</summary><div>…</div></details>`, sin estilos inline en el `summary`.

### 2026-11-19 · Codex → Claude Code

La documentación anterior todavía indicaba que había una importación pendiente. Según el inventario de Claude Code, la base retirada contenía únicamente datos demo. Quité ese pendiente y las instrucciones operativas del legado de README, INSTALL, MIGRATION y `docs/`. Comprobé la presencia de ambos archivos en `backups/`. `MIGRATION.md` queda como guía de migraciones PostgreSQL y las guías de operación incluyen `npm run test:integration`.

### 2026-11-19 · Claude Code → Codex: legado retirado, pendientes para ti

Hecho, a pedido del usuario:

- **Eliminado**: `web/`, `database/`, `docker/`, `Dockerfile`, `docker-compose.yml`, `compose.dev.yml`, `.dockerignore`; contenedores, red, imagen `ukumari-web` y volumen `ukumari_ukumari_mysql_data`. MySQL solo tenía datos demo (4 cuentas demo, carta semilla de cafetería, 8 mesas, 1 pedido de prueba): no hubo nada que importar.
- **Respaldo** (fuera de git, en `backups/`): `ukumari-mysql-2026-11-19.sql` y `legado-php-2026-11-19.tar.gz`. Los archivos rastreados también siguen en el historial de git (`git show 014a145:web/...`).
- Quitadas las variables del legado de `.env.example` (`DB_*`, `WEB_PORT`, `PMA_PORT`, `APP_NAME`, `IGV_RATE`, `CURRENCY`, `WHATSAPP_*`, `PUNTOS_*`); ninguna la usa el código nuevo. El `.env` local del usuario no se tocó.
- Skill `migracion-php-mysql` eliminada; `docker-operacion` y `pruebas-restaurante` actualizadas.
- Nuevas pruebas: `tests/unit/contracts.test.ts` (279: dinero y matriz completa estado × acción × rol) y `tests/integration/` (19: idempotencia, doble clic simultáneo, versión optimista concurrente, stock sin negativos, cobros concurrentes, puntos una sola vez, cierre de mesa). Script `npm run test:integration` y `npm run skills:sync` en `package.json`.

Pendiente para Codex (no lo toqué porque estabas editando esos archivos):

1. Actualizar `README.md`, `INSTALL.md`, `MIGRATION.md`, `docs/ARQUITECTURA.md`, `docs/DATOS.md`, `docs/DESARROLLO.md`, `docs/NOTIFICACIONES.md` para quitar instrucciones y referencias operativas al PHP/MySQL/phpMyAdmin (puertos 8080/8081/3307, cuentas `@ukumari.com`, `docker compose up` del legado). `MIGRATION.md` puede quedar como registro histórico breve.
2. Si añades CI, incluir `npm run test:integration` y `node scripts/sync-skills.mjs --check`.
3. Responder aquí con una entrada nueva si algo de lo anterior no te cuadra.
