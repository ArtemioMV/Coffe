# Identidad visual campestre cajamarquina

El emblema de La Posada Cajamarquina, aportado por el usuario, identifica la portada y la cabecera. La fotografía del local y de los platos queda pendiente.

## Concepto y materiales

Hospitalidad de casa de campo en Cajamarca: gastronomía regional, paisaje, madera, barro, fibras y tejidos. Interfaz cálida, cuidada y actual. Texturas en bordes/superficies secundarias; información operativa sobre fondos limpios.

Usar referencias reales de tejidos locales con procedencia/licencia. No atribuir motivos genéricos a una comunidad ni presentar imágenes generadas como fotos reales del local. Priorizar fotos propias de platos, espacios y entorno; revisar derechos y consentimiento.

| Token conceptual | Color | Uso |
|---|---|---|
| Blanco | `#FFFFFF` | Fondo general, cabecera, portada, tarjetas y paneles |
| Tinta | `#1C1917` | Texto principal |
| Granate | `#681321` | Marca y encabezados |
| Carmín | `#7A1F2D` | Acciones principales y mesa seleccionada |
| Dorado | `#D6A02F` | Acentos y franja textil |
| Rojo alerta | `#B91C1C` | Error y urgencia |

La paleta vive en `apps/web/src/app/theme.css`. La portada, la carta y el panel usan el ancho disponible con márgenes adaptables. Los formularios de una columna conservan un ancho de lectura cómodo.

Los estados operativos usan texto e icono además de color. Los controles conservan un foco de teclado visible.

- Franja textil discreta en cabecera/pie/divisores; patrones repetibles ligeros en CSS/SVG cuando baste.
- Trama de lino/lana de baja intensidad en decoración. Formularios, importes, tablas y comandas con superficie sólida.
- Madera/barro como acentos fotográficos o cromáticos; evitar texto largo sobre fotografías.
- Texturas responsive optimizadas, espacio reservado para fotos y carga diferida de secundarias. Cocina sin dependencia de CDN externos.

## Tipografía y componentes

Propuesta: serif editorial en títulos públicos y sans serif legible en cuerpo/paneles, máximo dos familias y caracteres españoles/licencias verificados. Sin manuscrita en precios, formularios o comandas; fuentes locales cuando licencia permita.

Tokens compartidos de color, espacio, tipo, radios y foco sobre Tailwind/shadcn/ui. Personalizar botones, tarjetas de plato, categorías, etiquetas, formularios, tablas, diálogos, hojas móviles y avisos. No mezclar Bootstrap y sistema nuevo en una pantalla migrada.

## Pantallas

| Área | Prioridad |
|---|---|
| Inicio | Emblema, nombre, gastronomía, carta y ubicación |
| Carta | Categorías, búsqueda, foto, descripción, disponibilidad, precio y agregar |
| Carrito/confirmación | Resumen, modalidad, datos necesarios, observaciones, total y confirmación única |
| Seguimiento | Estados, fecha, detalle y ayuda |
| Mesero | Cuadrícula por zona y detalle de la mesa seleccionada con pedidos, saldo y acciones |
| Cocina/barra | Resumen de comandas activas y mesas, búsqueda por pedido o mesa y cuatro columnas: nuevos, en preparación, listos y entregados. Las entregas de mesas abiertas siguen visibles hasta el cierre de la atención. |
| Caja/admin | Filtros, montos alineados, acciones claras y auditoría |
| Libro | Acceso visible, formulario comprensible, constancia y seguimiento privado |
| Sugerencias/valoración | Flujos separados, lenguaje cercano y confirmación |

Público con mayor textura/fotografía; paneles con misma paleta y menor ornamento. Prototipar primero carta móvil, cocina y alerta de plato listo.

## Accesibilidad y estados

Los botones y selectores compactos tienen 32 px de alto en escritorio. Las superficies táctiles conservan un objetivo de 44 × 44 px. Mantener foco visible, navegación por teclado, etiquetas y errores junto a los campos. La campana y la bandeja de notificaciones están en el panel.

Diseñar carga, vacío, error, agotado, sesión vencida, permiso denegado, desconexión y datos desactualizados. Checkout sin éxito antes de confirmación servidor; cocina con última sincronización y pendientes visibles aunque desaparezca toast.

