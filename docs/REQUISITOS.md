# Requisitos del restaurante

Estado: alcance confirmado, implementación por etapas. Restaurante campestre en Cajamarca, Perú. Moneda PEN como S/, español y hora visible `America/Lima`. Consultar [DESARROLLO.md](DESARROLLO.md) para distinguir lo implementado de lo pendiente.

## Alcance

Primera versión: inicio con historia, fotos, ubicación, horarios y contacto; carta/carrito, cuentas/historial; mesas, pedidos, cocina/barra, caja, puntos, administración, notificaciones y atención al consumidor. Incluye Libro de Reclamaciones, sugerencias y valoraciones al lanzamiento.

Registrar mesa, recojo y delivery. Inventario por insumos/recetas, entradas, consumo, merma, ajustes y alertas de mínimos forma parte del alcance confirmado. Reservas con capacidad/agenda, compras/proveedores, pagos en línea y seguimiento de repartidores son ampliaciones. Boleta/factura electrónica está contemplada como integración fiscal; no se confundirá con el ticket interno. Mesa «reservada» no equivale a sistema de reservas.

## Roles y permisos

| Actor | Facultades | Restricción |
|---|---|---|
| Visitante | Carta, información, sugerencias y libro | Sin datos internos ni pedidos ajenos |
| Cliente | Pedido propio, seguimiento, perfil, puntos y valoración | Solo sus recursos; sin modificar precios/estados internos |
| Mesero | Abrir atención, tomar/ampliar pedido, recoger y entregar | Mesas/pedidos asignados; reasignación autorizada |
| Cocina/barra | Comandas de su estación, aceptar, preparar y marcar listo | Sin caja ni datos de reclamos |
| Caja | Registrar/conciliar pagos y cierre | Sin cambiar precios ni borrar pagos; reversos autorizados |
| Encargado | Reasignar atención y resolver demoras | Permisos explícitos, sin privilegios administrativos implícitos |
| Responsable de reclamos | Leer, asignar, responder y dar seguimiento | Acceso reservado al personal autorizado |
| Administrador | Configuración, catálogo, usuarios, reportes y auditoría | Cambios auditados; conservar evidencia histórica |

Caja, encargado y responsable de reclamos son permisos nuevos. Una persona puede acumular funciones autorizadas; sin cuentas compartidas. Desactivar productos/usuarios conserva historial.

## Flujo de atención

1. Administración crea/edita mesas, zona y capacidad, activa/desactiva y genera un QR único, imprimible y revocable. Mesero abre atención asignada antes de habilitar pedidos; QR no acredita autorización por sí solo.
2. Seleccionar platos, cantidades, variantes y observaciones por ítem. Mostrar restricciones alimentarias comunicadas sin prometer ausencia de alérgenos no verificada.
3. Servidor valida precios, disponibilidad, cantidades, mesa y permisos; calcula totales exactos. Si cambió precio/disponibilidad, mostrar resumen revisado antes de confirmar.
4. Una transacción guarda pedido, ítems con precios, historial y evento en **pendiente de confirmación del mozo**. Clave idempotente evita doble clic/reintento duplicado. Notificar al mozo asignado y administración; cocina todavía no recibe la solicitud.
5. El mozo revisa, confirma o rechaza con motivo. Solo la confirmación genera comanda y aviso a cocina/barra, valida disponibilidad y descuenta insumos de recetas. La ampliación enviada por el cliente requiere una nueva confirmación. Cada estación prepara sus ítems con observaciones visibles.
6. Al marcar listo, avisar al mesero asignado y, cuando corresponda, al cliente. Mesero pulsa «Voy a recoger» y después registra entrega: acciones distintas.
7. Caja confirma pago; elegir método no demuestra cobro. Transferencias requieren conciliación autorizada.
8. Cerrar atención sin ítems/pedidos activos ni saldo. Cobro confirmado genera puntos; invitar una vez a valorar.

Pedidos adicionales generan comandas nuevas en la misma atención. No modificar silenciosamente ítems enviados a cocina: corrección/ampliación auditada y con aviso. Conflictos concurrentes se resuelven por versión y permisos, sin sobrescritura silenciosa.

## Estados y reglas

Pedido: `por_confirmar_mozo → confirmado → en_preparacion → listo → entregado`; rechazo del mozo desde `por_confirmar_mozo`, con motivo. Cancelación con autorización/motivo; si hubo cobro, resolver reverso por separado. Sin saltos arbitrarios ni retrocesos sin corrección autorizada.

Ítems/comandas: `pendiente → aceptado → en_preparacion → listo → entregado`, con cancelación cuando proceda. Pedido en preparación al empezar cualquier ítem; listo cuando todos los no cancelados están listos o entregados; entregado cuando todos están entregados. Todos cancelados implica pedido cancelado. Entrega parcial no cierra el resto.

Pago independiente: pendiente, confirmado, fallido, parcialmente reembolsado o reembolsado. Saldo = cargos válidos menos pagos netos confirmados. Cobrar antes de entrega no cambia el estado del plato. No permitir exceso de cobro sin política definida.

Puntos propuestos: conservar inicialmente 1 punto por S/ 1 pagado y canje de 100 por S/ 5, configurable. Abonar una vez al saldar pedido y registrar ajustes por reembolso. Canje ligado a compra concreta y transacción con control de saldo; un clic en perfil no consume puntos sin descuento registrado.

## Impresión y comprobantes

Tres documentos internos distintos: comanda de cocina (solo después de confirmar, ítems/observaciones/mesa), precuenta (detalle y saldo, sin afirmar cobro) y ticket de pago (pagos registrados y saldo). Impresión por navegador en térmica de 80 mm inicialmente; contemplar 58 mm, copias/reimpresiones y agente local de impresión si el negocio requiere impresión automática sin diálogo.

Boleta/factura electrónica requiere datos fiscales del emisor/receptor, proveedor de emisión, series/correlativos y respuesta verificable. Diseñar estados pendiente de emisión, emitido, rechazado y anulado, además de representación imprimible y manejo de contingencias. El sistema no debe presentar el ticket como comprobante electrónico ni afirmar emisión exitosa sin confirmación del proveedor. La integración queda deshabilitada hasta configurarla y probarla.

## Libro de Reclamaciones integrado

Ruta pública `/libro-de-reclamaciones`, enlace visible en pie de página y acceso por QR en el local. Sin cuenta, compra validada ni valoración obligatorias. Separar **reclamo** y **queja**; sugerencias/reseñas no sustituyen este canal.

Formulario previsto: proveedor (razón social, RUC y establecimiento), número/fecha de hoja, identificación/contacto del consumidor, representante cuando corresponda, bien/servicio y monto cuando aplique, tipo, detalle y pedido del consumidor. Alinear campos, avisos y formato con modelo reglamentario vigente antes de publicar; no inventar datos fiscales.

Guardar correlativo único por establecimiento/serie y año, generar constancia imprimible/descargable y tramitar envío al correo indicado. Correo fallido no invalida registro: constancia accesible, reintento y aviso al responsable. Seguimiento con sesión autorizada o enlace secreto no enumerable; nunca exponer hojas por correlativo predecible.

Bandeja privada con responsable, historial, adjuntos controlados, respuesta y evidencia de envío. Estados: recibido, asignado, en atención, respondido y cerrado. Cerrar no borra hoja ni sustituye respuesta; rectificaciones trazables. Auditar accesos/exportaciones y definir conservación según obligaciones y protección de datos.

Indecopi informa un plazo máximo de **15 días hábiles improrrogables** para responder reclamos y quejas. Calcular vencimiento con calendario peruano mantenido, feriados aplicables y reglas de cómputo validadas; cambiar estado no reinicia plazo. Fuentes: [Indecopi, modificación del reglamento](https://www.gob.pe/institucion/indecopi/noticias/641594-modifican-) y [preguntas y respuestas de noviembre de 2025](https://consumidor.gob.pe/wp-content/uploads/2020/07/Preguntas_Respuestas_LR_12.11.2025.pdf). Verificar texto/modelo vigentes antes del lanzamiento; diseñar el formulario no acredita por sí solo cumplimiento normativo.

## Sugerencias y valoraciones

Sugerencias: formulario público con categoría/mensaje, contacto opcional y anonimato permitido. Bandeja recibido, en revisión, aplicado o descartado, con responsable/motivo. Acuse/respuesta si dejó contacto. Sin publicación automática de datos personales.

Valoraciones: 1 a 5 para experiencia y opcionalmente comida/atención/ambiente, comentario opcional. Una por pedido entregado, con usuario o token de consumo verificado; edición auditada. Moderar spam/datos personales con motivo, sin ocultar críticas por ser negativas. Promedio y cantidad solo de publicadas; estado vacío si no hay ninguna. Invitación única y preferencias de contacto respetadas.

## Administración y aceptación

Configurar carta, estaciones, disponibilidad, zonas/mesas, usuarios/permisos, puntos, tiempos y datos del negocio. Reportes separan pedidos creados, ventas cobradas, cancelaciones/reembolsos, tiempos de preparación/recogida, puntos, valoraciones y reclamos por vencer.

- Dos dispositivos ven pedido sin recarga manual. Objetivo inicial p95 de aviso menor a 3 segundos desde commit con 20 dispositivos y 10 creaciones/minuto, por medir en staging; no garantía implementada.
- Pedido nuevo avisa a su estación; listo avisa al mesero correcto con mesa/acción. Sin asignado, derivar al encargado.
- Reinicio, reconexión y Redis caído no pierden pedidos/avisos pendientes. Distinguir visibilidad, lectura, acuse y entrega.
- Concurrencia no duplica pagos/puntos ni permite transiciones incompatibles. Verificar permisos por recurso.
- Libro sin login, constancia aunque falle correo y vencimientos probados con fines de semana/feriados.
- Móvil, tablet y teclado; color/sonido nunca son la única señal.
