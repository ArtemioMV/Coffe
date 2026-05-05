-- ============================================================
-- UKUMARI - Esquema de base de datos
-- ============================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS ukumari_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ukumari_db;

-- ============================================================
-- Tablas
-- ============================================================
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS puntos_movimientos;
DROP TABLE IF EXISTS pagos;
DROP TABLE IF EXISTS detalle_pedido;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS estados_pedido;
DROP TABLE IF EXISTS mesas;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS roles;

CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(40) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rol_id INT NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(30) DEFAULT NULL,
    password VARCHAR(255) NOT NULL,
    puntos INT NOT NULL DEFAULT 0,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE puntos_movimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    pedido_id INT DEFAULT NULL,
    tipo ENUM('ganados','canjeados') NOT NULL,
    puntos INT NOT NULL,
    descripcion VARCHAR(160) DEFAULT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pm_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token VARCHAR(64) NOT NULL,
    expira DATETIME NOT NULL,
    usado TINYINT(1) NOT NULL DEFAULT 0,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (token),
    CONSTRAINT fk_pr_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    orden INT NOT NULL DEFAULT 0,
    activo TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    categoria_id INT NOT NULL,
    nombre VARCHAR(160) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE mesas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero VARCHAR(20) NOT NULL UNIQUE,
    estado ENUM('libre','ocupada','reservada') NOT NULL DEFAULT 'libre'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE estados_pedido (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(40) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT DEFAULT NULL,
    mesero_id INT DEFAULT NULL,
    mesa_id INT DEFAULT NULL,
    estado_id INT NOT NULL,
    tipo_pedido ENUM('mesa','recojo','delivery') NOT NULL DEFAULT 'recojo',
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    igv DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    observaciones TEXT,
    metodo_pago VARCHAR(40) DEFAULT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pedidos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT fk_pedidos_mesero FOREIGN KEY (mesero_id) REFERENCES usuarios(id),
    CONSTRAINT fk_pedidos_mesa FOREIGN KEY (mesa_id) REFERENCES mesas(id),
    CONSTRAINT fk_pedidos_estado FOREIGN KEY (estado_id) REFERENCES estados_pedido(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE detalle_pedido (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    observacion VARCHAR(255) DEFAULT NULL,
    CONSTRAINT fk_detalle_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_producto FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    metodo VARCHAR(40) NOT NULL,
    monto DECIMAL(10,2) NOT NULL DEFAULT 0,
    estado VARCHAR(40) NOT NULL DEFAULT 'pendiente',
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pagos_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Datos iniciales
-- ============================================================
INSERT INTO roles (id, nombre) VALUES
    (1, 'cliente'),
    (2, 'mesero'),
    (3, 'cocina'),
    (4, 'administrador');

INSERT INTO estados_pedido (id, nombre) VALUES
    (1, 'pendiente'),
    (2, 'en preparación'),
    (3, 'listo'),
    (4, 'entregado'),
    (5, 'cancelado');

INSERT INTO mesas (numero, estado) VALUES
    ('1','libre'),('2','libre'),('3','libre'),('4','libre'),
    ('5','libre'),('6','libre'),('7','libre'),('8','libre');

-- Categorías (orden tipo carta)
INSERT INTO categorias (id, nombre, orden, activo) VALUES
    (1,'Café de especialidad',1,1),
    (2,'Café con licor',2,1),
    (3,'Chocolates',3,1),
    (4,'Infusiones',4,1),
    (5,'Piteados',5,1),
    (6,'Mojitos',6,1),
    (7,'Jugos',7,1),
    (8,'Bebidas frías',8,1),
    (9,'Frappes',9,1),
    (10,'Bebidas frías batidas',10,1),
    (11,'Postres',11,1),
    (12,'Salados',12,1);

-- Productos
-- Bebidas frías
INSERT INTO productos (categoria_id, nombre, descripcion, precio) VALUES
 (8,'Strewberry Iced Latte','Sirope de Fresa con Mermelada, Leche y Hielo',10.00),
 (8,'Strewberry Iced Latte + Chantilly','Sirope de Fresa con Mermelada, Leche y Hielo',12.00),
 (8,'Caramel Iced Latte','Sirope de Caramelo, Leche, Café, Hielo, Espuma de Leche',12.00),
 (8,'Matcha Honey','Miel, Zumo de Limón, Hielo, Agua y Matcha',12.00),
 (8,'Honey Americano','Espresso Doble, Miel, Hielo, Agua',12.00),
 (8,'Orange Coffee','Espresso y Zumo de Naranja',12.00),
 (8,'Caramel Iced Latte + Chantilly','Sirope de Caramelo, Leche, Café, Hielo, Espuma de Leche',13.50),
 (8,'Oreo Iced Latte','Galleta Oreo, Leche, Espresso Doble, una Bola de Helado',13.00);

-- Frappes
INSERT INTO productos (categoria_id, nombre, descripcion, precio) VALUES
 (9,'Frappé de Fresa',NULL,10.00),
 (9,'Frappé de Mango',NULL,10.00),
 (9,'Frappé de Chocolecuma',NULL,10.00),
 (9,'Frappé de Oreo',NULL,10.00),
 (9,'Frappé de Espresso',NULL,10.00),
 (9,'Frappé de Cappuccino',NULL,10.00),
 (9,'Frappé de Chocolate',NULL,10.00),
 (9,'Frappé de Mooca',NULL,11.00);

-- Bebidas frías batidas
INSERT INTO productos (categoria_id, nombre, descripcion, precio) VALUES
 (10,'Cappuccino Iced',NULL,10.00),
 (10,'Moca Iced',NULL,12.00);

-- Postres
INSERT INTO productos (categoria_id, nombre, descripcion, precio) VALUES
 (11,'Enrollado de Canela',NULL,3.00),
 (11,'Torta de Casa',NULL,5.00),
 (11,'Queque de Chocolate',NULL,5.00),
 (11,'Naked Cake (Torta Desnuda)',NULL,8.00),
 (11,'Tostada Frutal','Panes tostados, con Chantilly, Miel, Sirope de Fresa y 3 frutas a escoger: fresa, arándanos, plátano, kiwi, durazno y mango',9.00),
 (11,'Torta de Tres Leches',NULL,10.00),
 (11,'Ensalada de Frutas',NULL,13.00);

-- Salados
INSERT INTO productos (categoria_id, nombre, descripcion, precio) VALUES
 (12,'Sándwich de Jamón y Queso',NULL,3.50),
 (12,'Sándwich de Pollo Normal',NULL,5.00),
 (12,'Sándwich Clásico de la Casa','Pan, Lechuga, Tomate, Pollo y Queso',10.00),
 (12,'Triple 1','Pan, Palta, Tomate y Pollo',11.00),
 (12,'Triple 2','Pan, Pollo, Jamón y Queso',11.00),
 (12,'Croissant Apaltado','Palta y Pollo',11.00),
 (12,'Croissant Beso de Durazno','Pollo y Durazno',11.00);

-- Café de especialidad
INSERT INTO productos (categoria_id, nombre, descripcion, precio) VALUES
 (1,'Café Espresso',NULL,6.00),
 (1,'Café Americano',NULL,6.50),
 (1,'Cortado','Espresso y Leche Texturizada',7.00),
 (1,'Macchiato','Espresso y Crema de Leche',7.00),
 (1,'Café con Leche',NULL,8.00),
 (1,'Latte',NULL,8.50),
 (1,'Matcha Latte','Matcha y Leche Texturizada',9.00),
 (1,'Cappuccino','Espresso y Leche Texturizada',9.00),
 (1,'Café Bom Bon','Leche Condensada, Café y Crema de Leche',10.00),
 (1,'Mocaccino','Chocolate, Espresso y Leche Texturizada',11.00),
 (1,'Caramel Macchiato','Jarabe de Caramelo, Leche Texturizada, Espresso',11.00),
 (1,'Flat White','Espresso Doble y Leche Texturizada',11.00);

-- Café con licor
INSERT INTO productos (categoria_id, nombre, descripcion, precio) VALUES
 (2,'Coffe Sour','Zumo de Limón, Pisco y Espresso Doble',11.00),
 (2,'Uku Baileys','Baileys, Café y Leche Texturizada',15.00),
 (2,'Uku Irlandes','Café, Whisky y Crema de Leche',15.00);

-- Chocolates
INSERT INTO productos (categoria_id, nombre, descripcion, precio) VALUES
 (3,'Chocolate Caliente',NULL,6.00),
 (3,'Chocolate con Marshmello',NULL,7.00),
 (3,'Chocolate con Chantilly, Chispas de Chocolate y Fudge',NULL,9.00),
 (3,'Sub Marino','Chocolate especial, leche caliente y espuma de leche',10.00);

-- Infusiones
INSERT INTO productos (categoria_id, nombre, descripcion, precio) VALUES
 (4,'Manzanilla',NULL,4.00),
 (4,'Arándano',NULL,4.00),
 (4,'Coca',NULL,4.00),
 (4,'Té Puro',NULL,4.00),
 (4,'Té Verde',NULL,4.00),
 (4,'Frutos del bosque',NULL,4.00);

-- Piteados
INSERT INTO productos (categoria_id, nombre, descripcion, precio) VALUES
 (5,'Piteado de Pisco',NULL,7.00),
 (5,'Piteado de Anis',NULL,8.00);

-- Mojitos
INSERT INTO productos (categoria_id, nombre, descripcion, precio) VALUES
 (6,'Mojito Clásico',NULL,13.00),
 (6,'Mojito de Mango',NULL,15.00),
 (6,'Mojito de Fresa',NULL,15.00),
 (6,'Mojito de Arándano',NULL,15.00),
 (6,'Mojito de Naranja',NULL,15.00),
 (6,'Mojito de Café',NULL,16.00);

-- Jugos
INSERT INTO productos (categoria_id, nombre, descripcion, precio) VALUES
 (7,'Papaya',NULL,6.00),
 (7,'Papaya con Leche',NULL,7.00),
 (7,'Plátano',NULL,6.00),
 (7,'Plátano con Leche',NULL,7.00),
 (7,'Fresa',NULL,7.00),
 (7,'Fresa con Leche',NULL,8.00),
 (7,'Mango',NULL,7.00),
 (7,'Mango con Leche',NULL,8.00),
 (7,'Jugo Combinado (Papaya y Plátano)',NULL,8.00);

-- ============================================================
-- Usuarios semilla (las contraseñas se hashean en PHP la primera
-- vez que arranca la app. Aquí dejamos un placeholder reconocible
-- para que includes/db.php detecte y reemplace por password_hash.)
-- ============================================================
INSERT INTO usuarios (rol_id, nombre, correo, telefono, password, activo) VALUES
    (4,'Administrador UKUMARI','admin@ukumari.com','999000001','SEED::Admin123',1),
    (2,'Mesero UKUMARI','mesero@ukumari.com','999000002','SEED::Mesero123',1),
    (3,'Cocina UKUMARI','cocina@ukumari.com','999000003','SEED::Cocina123',1),
    (1,'Cliente Demo','cliente@ukumari.com','999000004','SEED::Cliente123',1);
