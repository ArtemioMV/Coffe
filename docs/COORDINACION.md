# Estado compartido de implementación

El registro de acuerdos y traspasos entre agentes se mantiene en [AGENTS.md](../AGENTS.md#coordinación-entre-agentes).

El entorno de desarrollo usa PostgreSQL y dos instancias Redis en Docker. Las pruebas unitarias cubren contratos, dinero y transiciones. Las de integración usan PostgreSQL efímero. Playwright comprueba el flujo de mesa por QR, confirmación del mozo, cocina, pago, cierre y gestión de inventario.

El alcance implementado y los pendientes de producción están en [DESARROLLO.md](DESARROLLO.md).
