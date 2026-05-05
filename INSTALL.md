# Guía de instalación · UKUMARI

Esta guía te lleva desde un equipo limpio hasta tener el sitio corriendo en
`http://localhost:8080`.

---

## 1. Requisitos

| Software        | Versión mínima | Verificar con          |
|-----------------|----------------|------------------------|
| Docker Desktop  | 4.30+          | `docker --version`     |
| Docker Compose  | v2.20+         | `docker compose version` |
| Git             | 2.40+          | `git --version`        |

> **Windows / macOS:** instala [Docker Desktop](https://www.docker.com/products/docker-desktop). Trae Compose incluido.
> **Linux:** instala `docker-ce` y `docker-compose-plugin` desde los repos oficiales.

Asegúrate que **Docker Desktop esté abierto y corriendo** antes de continuar (en Windows/macOS).

---

## 2. Clonar el repositorio

```bash
git clone https://github.com/ArtemioMV/Coffe.git
cd Coffe
```

---

## 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Abre el archivo `.env` recién creado y revisa los valores. Para desarrollo local
no necesitas cambiar nada — los defaults funcionan. Para **producción** o un
ambiente compartido, cambia al menos:

| Variable          | Cambia a…                                            |
|-------------------|------------------------------------------------------|
| `DB_PASS`         | una contraseña fuerte                                |
| `DB_ROOT_PASS`    | una contraseña fuerte                                |
| `WHATSAPP_NUMBER` | número real del local en formato internacional       |
| `WHATSAPP_DISPLAY`| el mismo número en formato visible                   |

> El archivo `.env` está en `.gitignore`: no se sube al repositorio.

---

## 4. Levantar los servicios

```bash
docker compose up -d
```

La primera vez tarda 1–3 minutos porque descarga las imágenes:
- `php:8.2-apache` (~150 MB)
- `mysql:8.0` (~200 MB)
- `phpmyadmin/phpmyadmin` (~110 MB)

Si tu red es inestable y se interrumpe la descarga, repite el comando. Docker
retoma desde donde se quedó.

### Verifica que los tres contenedores estén arriba

```bash
docker compose ps
```

Salida esperada:
```
NAME                 STATUS         PORTS
ukumari_web          Up X seconds   0.0.0.0:8080->80/tcp
ukumari_mysql        Up X seconds   0.0.0.0:3307->3306/tcp
ukumari_phpmyadmin   Up X seconds   0.0.0.0:8081->80/tcp
```

---

## 5. Abrir el sitio

| Servicio    | URL                       | Notas                                |
|-------------|---------------------------|--------------------------------------|
| Sitio web   | http://localhost:8080     | Carta, carrito, login, paneles       |
| phpMyAdmin  | http://localhost:8081     | Usuario: `root` · contraseña del `.env` |
| MySQL puro  | `localhost:3307`          | Para conectar Workbench / DBeaver    |

> Si los puertos 8080 / 8081 / 3307 están ocupados en tu equipo, cámbialos en
> `.env` (`WEB_PORT`, `PMA_PORT`, `DB_PORT`) y ejecuta `docker compose up -d` de nuevo.

---

## 6. Iniciar sesión por primera vez

La base de datos se inicializa automáticamente con `database/init.sql`:
74 productos, 12 categorías, 4 usuarios semilla.

Las contraseñas semilla se hashean con `password_hash()` la primera vez
que arranca PHP — nunca quedan en texto plano en la BD.

Credenciales de prueba:

| Rol           | Correo                | Contraseña  |
|---------------|-----------------------|-------------|
| Administrador | admin@ukumari.com     | `Admin123`  |
| Mesero        | mesero@ukumari.com    | `Mesero123` |
| Cocina/Barra  | cocina@ukumari.com    | `Cocina123` |
| Cliente demo  | cliente@ukumari.com   | `Cliente123`|

> En producción, **cambia estas contraseñas** desde el panel de administrador
> antes de exponer el sistema.

---

## 7. Personalizar imágenes

Sustituye los archivos en `web/assets/img/` por los tuyos:

| Archivo            | Tamaño sugerido | Uso                              |
|--------------------|-----------------|----------------------------------|
| `logo.jpg`/`.png`  | 256×256+        | Navbar, footer y favicon         |
| `hero.jpg`         | 2000×1200       | Banner principal del Home        |
| `slide-1..4.jpg`   | 1600×900        | Carrusel del Home                |
| `nosotros.jpg`     | 1200×900        | Sección "Sobre UKUMARI"          |
| `auth.jpg`         | 1400×1800       | Lateral en login / registro      |

El logo se detecta solo (`logo.png`, `.svg` o `.jpg`).
Para hero/slides/nosotros, edita `web/assets/css/local-images.css` y descomenta
los bloques de las imágenes que reemplazaste. Los cambios se ven al recargar
(Ctrl+F5 para forzar caché).

> El favicon redondo se genera con un SVG que embebe el logo. Si reemplazas
> `logo.jpg`, regenera `favicon.svg` corriendo este snippet desde la raíz:
> ```bash
> B64=$(base64 -w 0 web/assets/img/logo.jpg)
> cat > web/assets/img/favicon.svg << EOF
> <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64">
>   <defs><clipPath id="c"><circle cx="32" cy="32" r="30"/></clipPath></defs>
>   <circle cx="32" cy="32" r="32" fill="#3a2317"/>
>   <image clip-path="url(#c)" x="2" y="2" width="60" height="60" preserveAspectRatio="xMidYMid slice"
>          xlink:href="data:image/jpeg;base64,${B64}"/>
>   <circle cx="32" cy="32" r="30" fill="none" stroke="#c9a06a" stroke-width="2"/>
> </svg>
> EOF
> ```

---

## 8. Comandos útiles del día a día

```bash
# Ver logs en vivo (web)
docker compose logs -f web

# Reiniciar solo el web (después de cambios PHP que requieran)
docker compose restart web

# Detener todo (mantiene datos)
docker compose down

# Detener y borrar la BD (cuidado: pierdes todos los pedidos)
docker compose down -v

# Entrar al contenedor web
docker compose exec web bash

# Conectarse a MySQL desde la línea de comandos
docker compose exec mysql mysql -uukumari_user -p ukumari_db
```

---

## 9. Solución de problemas frecuentes

**"unable to get image": el daemon de Docker no responde**
→ Abre Docker Desktop manualmente y espera a que el ícono se ponga en verde.

**"port already allocated"**
→ Otro programa usa el puerto. Cambia `WEB_PORT` / `PMA_PORT` / `DB_PORT` en `.env` y reinicia.

**El sitio carga pero el login falla con "correo o contraseña inválidos"**
→ Espera 10–15 segundos después de levantar la primera vez (`db.php` reintenta y rehashea las contraseñas semilla).

**Cambié `.env` y no veo los cambios**
→ Las env vars solo se aplican al recrear el contenedor:
```bash
docker compose up -d
```
(Compose detecta el cambio automáticamente y recrea solo los afectados.)

**Tildes salen como `Ã¡`, `Ã©`, `Ã±`**
→ Verifica que el archivo PHP está guardado como **UTF-8 sin BOM** en tu editor.

---

## 10. Estructura del proyecto

```
Coffe/
├── docker-compose.yml      ← Orquesta web + mysql + phpmyadmin
├── .env                    ← Tus credenciales locales (ignorado por git)
├── .env.example            ← Plantilla de variables
├── README.md               ← Descripción general del proyecto
├── INSTALL.md              ← Esta guía
├── database/
│   └── init.sql            ← Esquema + datos iniciales
└── web/                    ← DocumentRoot Apache
    ├── index.php           ← Home
    ├── carta.php           ← Carta digital
    ├── carrito.php         ← Carrito (localStorage)
    ├── checkout.php        ← Confirmación de pedido
    ├── login.php · registro.php · recuperar.php · logout.php
    ├── perfil.php          ← Mi cuenta · puntos · historial
    ├── api/                ← Endpoints JSON (pedido_crear, estado, listos)
    ├── includes/           ← config · db · auth · helpers · header · footer
    ├── admin/              ← Panel administrador
    ├── mesero/             ← Panel mesero
    ├── cocina/             ← Panel cocina/barra
    └── assets/
        ├── css/styles.css
        ├── js/cart.js · js/app.js
        └── img/            ← logo, hero, slides…
```

---

¡Listo! Si algo falla, abre un issue o revisa `docker compose logs -f web`.
