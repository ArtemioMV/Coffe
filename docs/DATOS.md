# Datos, Prisma y migraciones

El esquema inicial de PostgreSQL está en `packages/database/prisma/schema.prisma` y sus migraciones SQL están versionadas. El inventario describe el modelo objetivo. Consulta el alcance implementado en [DESARROLLO.md](DESARROLLO.md).

## Entidades previstas

| Dominio | Entidades | Controles |
|---|---|---|
| Negocio | establecimientos, configuraciones | Datos fiscales, zona horaria y reglas versionadas |
| Identidad | usuarios, roles, permisos, asignaciones, sesiones, recuperaciones | Correo normalizado único; sesiones revocables; tokens hasheados con vencimiento |
| Catálogo | categorias, productos, variantes, estaciones | Precio decimal, disponibilidad, estación y desactivación |
| Salón | zonas, mesas, sesiones_atencion, asignaciones_mesero | Una atención abierta por mesa salvo política explícita; historial |
| Pedidos | pedidos, items_pedido, comandas, items_comanda, historial_estados | Atención opcional; precio/nombre/observaciones históricos |
| Caja | pagos, reembolsos, sesiones_caja, movimientos_caja | Referencia, importe, moneda, actor, conciliación; reversos trazables |
| Puntos | cuentas_puntos, movimientos_puntos, canjes | Libro de movimientos; unicidad de abono/reverso y vínculo a compra |
| Eventos | outbox_events, notificaciones, destinatarios, entregas_canal, intentos | Cursor, destinatario, acuse y fallos persistentes |
| Libro | hojas_reclamacion, historial_reclamacion, respuestas, adjuntos | Tipo, correlativo, proveedor/consumidor, vencimiento y evidencia |
| Sugerencias | sugerencias, seguimiento_sugerencia | Contacto opcional, responsable y estado |
| Valoraciones | valoraciones, historial_moderacion | Una por consumo verificado, notas 1–5 y motivos |
| Auditoría | eventos_auditoria | Actor, recurso, acción, fecha y cambios sin secretos |

Nombres orientativos: fase 1 debe cerrar diagrama relacional, campos, nulabilidad, índices, restricciones y borrado antes de generar migración.

## Integridad

- Dinero `numeric`/Decimal, moneda explícita y redondeo definido; sin flotantes binarios para totales. Referencia incluye IGV en precio; confirmar política fiscal antes de fijar tasas productivas.
- Instantes `timestamptz` normalizados UTC; vista/días operativos en `America/Lima`. Calendario hábil separado para libro.
- Claves foráneas e índices: estación/estado/antigüedad, atención abierta, destinatario/pendiente y vencimientos.
- Cantidades positivas, precios no negativos y notas 1–5 mediante restricciones. Unicidad de correo, correlativo, valoración por pedido e idempotencia dentro de su ámbito.
- Estados con versión/actualización condicional; conflicto informa para recargar. Transacción para estado, historial y outbox.
- Pedido con snapshot y cálculo servidor; cliente manda IDs/cantidades. Misma clave idempotente/contenido devuelve resultado previo; distinto contenido devuelve conflicto.
- Pagos/puntos/canjes atómicos e idempotentes. Webhooks futuros con firma, importe validado y referencia única.
- Cerrar mesa tras verificar pedidos/saldo dentro de transacción. Cobrar y entregar independientes.
- Desactivar usuario no borra pedidos, pagos, hojas ni respuestas. Anonimización/conservación según política aplicable.

## Control del esquema

Prisma será único propietario del esquema inicial. Versionar definición, planes/migraciones, SQL especial, semillas y transformaciones. Revisar bloqueos, pérdida de datos e índices. No editar producción manualmente desde Studio/SQL sin intervención registrada y reconciliada.

**Versión fijada: Prisma 6.19.3**, CLI y cliente, con flujo clásico `migrate dev`/`migrate deploy`. Se eligió una versión concreta con esquema/cliente compatibles y se verificó su generación. Operar con los scripts `db:migrate`, `db:deploy`, `db:generate` y `db:studio` del repositorio; no mezclar comandos de otra generación. Referencia: [despliegue de migraciones versionadas](https://docs.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate).

Elegir versión estable compatible con Node/PostgreSQL/autenticación, registrar flujo y fijar CLI/cliente compatibles en lockfile. Probar migración en base vacía y staging. Encapsular comandos fijados en scripts del repositorio, sin depender de instalación global.

1. Cambiar definición y generar migración/plan en desarrollo aislado.
2. Revisar/versionar, incluyendo transformaciones explícitas.
3. CI reconstruye base vacía, prueba integridad y aplica sobre copia representativa sin datos personales innecesarios.
4. Staging mide bloqueos/duración y compatibilidad de aplicación anterior/nueva.
5. Producción: respaldo restaurable, tarea única y verificación posterior. Sin reset, sincronización destructiva ni borrado de volúmenes al desplegar.
6. Cambio incompatible: ampliar, desplegar compatible, rellenar/verificar y retirar en otra entrega. Corrección hacia delante o restauración ensayada; sin rollback automático supuesto.

Prisma Studio para inspección local de desarrollo/staging con datos permitidos. Producción con acceso restringido. Semillas productivas solo de configuración necesaria, sin cuentas demo ni carta de cafetería como menú final.

El procedimiento de cambios de esquema y despliegue está en [MIGRATION.md](../MIGRATION.md).
