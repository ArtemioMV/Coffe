---
name: diseno-campestre
description: Identidad visual campestre cajamarquina del restaurante y reglas de interfaz (paleta, tipografía, texturas textiles, componentes Tailwind/shadcn, accesibilidad WCAG 2.2 AA, pantallas de carta, checkout, mesero, cocina, caja y libro). Úsala al crear o revisar cualquier pantalla, componente de packages/ui, estilos, tokens de color o textos de interfaz.
---

# Diseño campestre cajamarquino

Fuente: `docs/DISENO.md`. Componentes compartidos en `packages/ui` (hoy solo `button.tsx` con `cva` + `tailwind-merge`); app en `apps/web` con Tailwind CSS 4.

## Concepto

Hospitalidad viva y festiva de casa de campo en Cajamarca («¡Aquishito es pue!»): gastronomía regional auténtica, alegría de compartir, tradición viva, leña y carbón, texturas textiles andinas coloridas y calidez humana. **Fondo limpio y luminoso; superficies blancas bien elevadas; detalles vibrantes en carmín festivo, oro andino y verde valle.**

## Tokens de color (definidos en `apps/web/src/app/theme.css`)

| Token | Hex | Uso |
|---|---|---|
| `--cream` | `#FAF7F2` | Fondo público cálido, limpio y luminoso (patrón sutil) |
| `--paper` | `#FFFFFF` | Tarjetas, formularios y paneles elevados |
| `--carmine` | `#9E1C24` | Color principal de marca (carmín festivo cajamarquino) |
| `--gold` | `#F59E0B` | Acento solar y destacados («Aquishito es pue») |
| `--green` | `#15803D` | Verde valle andino para barra, frescura y confirmaciones |
| `--ink` | `#1C1917` | Texto principal de alto contraste y legibilidad |
| `--muted` | `#78716C` | Textos secundarios y descripciones |
| `--line` | `#E7DFD5` | Bordes suaves de separación |
| `--red` | `#B91C1C` | Errores y alertas críticas |

Paleta propuesta: verificar contraste real de cada combinación (objetivo WCAG 2.2 AA: 4.5:1 texto normal, 3:1 texto grande y componentes). Los estados siempre llevan texto o icono además del color.

## Tipografía

**Estilo decidido por el usuario (2026-11-19): sobrio y compacto.** Base 15 px; `h1` ≤ 2.4rem, `h2` 1.3rem, `h3` 1.05rem; títulos en serif sin negrita. Sin degradados, fondos de puntos, halos, píldoras decorativas, etiquetas flotantes ni animaciones; sin estilos inline visuales; sin `<br />` en texto corrido; no inventar horarios, platos ni técnicas. Reglas completas en «Reglas de interfaz» de `AGENTS.md`. Acordeones: `<details className="surface">` con `summary` a todo el ancho y chevron a la derecha (ya definido en `globals.css`).

**Dónde va cada estilo:** base, formularios, panel e impresión en `globals.css`; cabecera y pie en `app/styles/sitio.css`; portada y carrusel en `inicio.css`; carta en `carta.css`; mesas en `mesas.css`. Componentes pequeños por responsabilidad (ver `modules/catalogo/`: hook `use-cart`, `product-row`, `order-panel`…); un archivo de vista no debe pasar de unas 300 líneas. Mesas: tablero con sillas y acciones con `className="capsule"`. Sonido del panel: un solo botón campana / campana tachada.

Serif editorial en títulos públicos + sans serif legible en cuerpo y paneles; máximo dos familias, con caracteres españoles (ñ, tildes, ¿¡) y licencia verificada; servir localmente (`next/font/local` o `next/font/google` autoalojada). Sin manuscritas en precios, formularios ni comandas. Cifras con `tabular-nums` en importes y tablas.

## Texturas y fotografía

- Franja textil discreta en cabecera, pie y divisores; patrones ligeros en CSS/SVG. Trama de lino/lana de baja intensidad solo decorativa.
- Formularios, importes, tablas y comandas sobre superficie sólida. Nada de texto largo sobre fotos.
- Usar referencias reales de tejidos locales con procedencia/licencia; no atribuir motivos genéricos a una comunidad. No presentar imágenes generadas como fotos reales del local.
- Imágenes con `width/height` o espacio reservado, `loading="lazy"` en secundarias. Paneles de cocina sin dependencia de CDN externos.

## Componentes

Tokens compartidos de color, espacio, tipo, radios y foco sobre Tailwind/shadcn/ui. Personalizar: botones, tarjetas de plato, categorías, etiquetas, formularios, tablas, diálogos, hojas móviles (sheet) y avisos. Iconos Lucide. **No mezclar Bootstrap** (heredado del PHP) con el sistema nuevo en una pantalla migrada.

## Pantallas y prioridades

| Área | Debe mostrar |
|---|---|
| Inicio | Foto real, nombre, gastronomía, carta y ubicación |
| Carta (móvil primero) | Categorías, búsqueda, foto, descripción, disponibilidad, precio, «Agregar» |
| Carrito / confirmación | Resumen, modalidad, datos necesarios, observaciones, total y **una** confirmación |
| Seguimiento | Estados, fecha, detalle y ayuda |
| Mesero | Zonas/mesas, pedidos y bandeja fija de listos con acción |
| Cocina/barra | Tarjetas grandes por estación: mesa, edad del pedido, observaciones; sin textura detrás |
| Caja/admin | Filtros, montos alineados a la derecha, acciones claras y auditoría |
| Libro | Acceso visible, formulario comprensible, constancia y seguimiento privado |

Público: más textura y fotografía. Paneles: misma paleta, menos ornamento. Prototipar primero carta móvil, cocina y alerta de plato listo.

## Accesibilidad y estados (obligatorio)

- Controles táctiles ≥ 44 × 44 px; foco visible (`focus-visible:ring`); todo usable con teclado; etiquetas reales; errores junto al campo y resumen al enviar.
- Avisos en regiones `aria-live` sin interrumpir continuamente; respetar `prefers-reduced-motion`. Sonido/vibración/color siempre con texto.
- Diseñar estados: carga, vacío, error, agotado, sesión vencida, permiso denegado, desconexión y datos desactualizados.
- Checkout no muestra éxito antes de la confirmación del servidor. Cocina muestra última sincronización y pendientes aunque desaparezca el toast.

## Lenguaje

Español de Perú, cercano y claro, en minúscula de oración («Agregar al pedido»). Moneda `S/ 12.50` con `money()`. Fechas en `America/Lima`. Términos del local: mesa, mozo/mesero, comanda, carta.

Para revisar una pantalla ya escrita, combinar con `web-design-guidelines`; para dirección estética general, `frontend-design`; para componentes, `shadcn`.
