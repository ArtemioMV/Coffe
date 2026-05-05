# UKUMARI · Café de especialidad

Sitio web responsivo para la cafetería **UKUMARI**: carta digital pública,
carrito con confirmación de pedido, sistema de puntos para clientes y
paneles internos para administrador, mesero y cocina/barra.

> No es una SPA: es un sitio PHP + MySQL clásico, dockerizado, simple y funcional, con una estética cálida tipo coffee shop premium.

---

## Stack

**Frontend**
- HTML5, CSS3, JavaScript
- Bootstrap 5
- Bootstrap Icons
- Google Fonts (Playfair Display, Inter, Caveat)
- SweetAlert2
- Swiper.js

**Backend**
- PHP 8.2 + Apache
- MySQL 8
- PDO con consultas preparadas
- `password_hash` / `password_verify`
- Sesiones nativas + tokens CSRF

**Infraestructura**
- Docker / Docker Compose
- phpMyAdmin

---

## Cómo levantar el proyecto

```bash
docker compose up -d
```

| Servicio   | URL                      | Notas                                  |
|------------|--------------------------|----------------------------------------|
| Web        | http://localhost:8080    | Sitio público y paneles                |
| phpMyAdmin | http://localhost:8081    | usuario root / `root_pass`             |
| MySQL      | localhost:3307           | externo · ver credenciales abajo       |

**Base de datos**
- DB: `ukumari_db`
- Usuario: `ukumari_user` / `ukumari_pass`
- Root: `root_pass`

La base se inicializa automáticamente con `database/init.sql` (esquema + carta UKUMARI completa).
Las contraseñas de los usuarios semilla se encriptan con `password_hash()` la primera vez que arranca PHP (no quedan en texto plano).

Para detener:
```bash
docker compose down            # mantiene los datos
docker compose down -v         # borra el volumen MySQL (reinicia datos)
```

---

## Credenciales iniciales (demo)

| Rol           | Correo                | Contraseña  |
|---------------|-----------------------|-------------|
| Administrador | admin@ukumari.com     | Admin123    |
| Mesero        | mesero@ukumari.com    | Mesero123   |
| Cocina/Barra  | cocina@ukumari.com    | Cocina123   |
| Cliente       | cliente@ukumari.com   | Cliente123  |

---

## Estructura

```
ukumari-web/
├── docker-compose.yml
├── README.md
├── database/
│   └── init.sql
└── web/
    ├── index.php          ← Home con hero, nosotros, swiper, CTA
    ├── carta.php          ← Carta digital filtrable
    ├── carrito.php        ← Carrito (localStorage)
    ├── checkout.php       ← Confirmación de pedido
    ├── login.php          ← Inicio de sesión
    ├── registro.php       ← Registro de cliente
    ├── recuperar.php      ← Recuperación de contraseña (token)
    ├── logout.php
    ├── perfil.php         ← Mi cuenta · puntos · historial · canje
    ├── api/
    │   ├── pedido_crear.php   ← Recibe carrito y guarda pedido
    │   └── pedido_estado.php  ← Cambia estado (cocina/mesero/admin)
    ├── includes/
    │   ├── config.php
    │   ├── db.php             ← Conexión PDO + autoseed seguro
    │   ├── auth.php           ← Sesiones, login, require_role
    │   ├── helpers.php        ← Pedidos, puntos, utilidades
    │   ├── header.php / footer.php
    │   └── panel_layout.php / panel_footer.php
    ├── admin/                 ← Panel administrador
    ├── mesero/                ← Panel mesero
    ├── cocina/                ← Panel cocina/barra
    └── assets/
        ├── css/styles.css
        ├── css/local-images.css   ← override para tus fotos
        ├── js/cart.js · js/app.js
        └── img/                   ← logo, hero, slides…
```

---

## Roles y permisos

| Capacidad                              | Cliente | Mesero | Cocina | Admin |
|----------------------------------------|:------:|:------:|:------:|:-----:|
| Ver carta                              |   ✔    |   ✔    |   ✔    |   ✔   |
| Hacer pedido (carrito → checkout)      |   ✔    |   —    |   —    |   ✔   |
| Crear pedido para una mesa             |   —    |   ✔    |   —    |   ✔   |
| Ver pedidos pendientes                 |   —    |   ✔    |   ✔    |   ✔   |
| Cambiar estado a "en preparación/listo"|   —    |   —    |   ✔    |   ✔   |
| Marcar pedido como entregado           |   —    |   ✔    |   —    |   ✔   |
| Gestionar productos / categorías       |   —    |   —    |   —    |   ✔   |
| Activar / desactivar productos         |   —    |   —    |   —    |   ✔   |
| Gestionar usuarios y roles             |   —    |   —    |   —    |   ✔   |
| Ver reportes                           |   —    |   —    |   —    |   ✔   |
| Acumular y canjear puntos              |   ✔    |   —    |   —    |   —   |

> Los productos no se eliminan físicamente: se desactivan (campo `activo`).

---

## Flujo principal

**Cliente**
1. Entra al Home → "Ver carta".
2. Filtra por categoría, agrega productos al carrito (localStorage).
3. Va al carrito, ajusta cantidades, presiona "Continuar pedido".
4. Si no tiene cuenta, se le pide login/registro.
5. En `checkout` elige tipo de pedido (recojo / mesa / delivery), método de pago y observaciones.
6. Confirma → el pedido se guarda en MySQL en estado **pendiente** y aparece en el panel de cocina.
7. Gana **1 punto por cada S/ 1** gastado. Puede canjearlos en `perfil.php` (100 pts = S/ 5).

**Mesero**
1. Inicia sesión → `mesero/dashboard.php`.
2. "Nuevo pedido" → elige una mesa, busca productos, los agrega y envía a cocina.
3. Cuando cocina marca el pedido como "listo", el mesero lo entrega y lo marca como **entregado**.

**Cocina / Barra**
1. Entra a `cocina/pedidos-pendientes.php` (auto-refresh cada 30 s).
2. Ve cada pedido como una tarjeta con productos, observaciones y origen (cliente o mesero).
3. Cambia estados: **pendiente → en preparación → listo**.

**Administrador**
1. Dashboard con KPIs (ventas hoy, pendientes, productos activos, pedidos totales).
2. Productos / Categorías / Usuarios / Pedidos / Reportes.

---

## Sistema de puntos

- Se otorga **1 punto por cada S/ 1.00** del total del pedido (solo para clientes registrados).
- Se registra cada movimiento en `puntos_movimientos` (tipo: `ganados` o `canjeados`).
- En `perfil.php`, el cliente puede canjear bloques de **100 puntos = S/ 5.00** de descuento.
- Las constantes están en `web/includes/helpers.php`:
  ```php
  const PUNTOS_POR_SOL = 1;
  const PUNTOS_CANJE_BLOQUE = 100;
  const SOLES_POR_BLOQUE_CANJE = 5;
  ```

---

## Personalización con tus imágenes

Sigue las instrucciones de `web/assets/img/README-imagenes.txt`:

1. Copia tus archivos a `web/assets/img/` con estos nombres exactos:
   `logo.png` (o `.svg`), `hero.jpg`, `nosotros.jpg`,
   `slide-1.jpg` … `slide-4.jpg`, `auth.jpg`.
2. El logo se detecta automáticamente.
3. Para hero, slides, "nosotros" y auth, abre `web/assets/css/local-images.css`
   y descomenta los bloques de las imágenes que reemplazaste.

---

## Seguridad

- Contraseñas con `password_hash` (BCRYPT).
- PDO con consultas preparadas en todas las queries.
- Tokens CSRF en formularios y APIs sensibles.
- Sesiones validadas por rol en cada panel (`require_role()`).
- Productos no se eliminan: se desactivan.

---

## Tecnologías cargadas por CDN

- Bootstrap 5.3.3
- Bootstrap Icons 1.11
- Swiper 11
- SweetAlert2 11
- Google Fonts

No requieren instalación local; basta con conexión a internet en el contenedor.

---

¡Listo para servir café! ☕
