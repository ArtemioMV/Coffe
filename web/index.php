<?php
$page = 'home';
$title = 'UKUMARI · Café de especialidad';
require __DIR__ . '/includes/header.php';
?>

<!-- HERO -->
<section class="hero">
  <div class="container">
    <div class="row">
      <div class="col-lg-7">
        <span class="eyebrow reveal">Bienvenidos a UKUMARI</span>
        <h1 class="reveal delay-1">El arte de un buen café <em>te espera</em>.</h1>
        <p class="lead reveal delay-2">Granos seleccionados, recetas con alma y un espacio cálido para reencontrarte con los pequeños placeres del día.</p>
        <div class="d-flex flex-wrap gap-2 mt-3 reveal delay-3">
          <a href="/carta.php" class="btn btn-gold"><i class="bi bi-journal-text"></i> Ver carta</a>
          <?php if (!current_user()): ?>
            <a href="/login.php" class="btn btn-outline-light"><i class="bi bi-person"></i> Iniciar sesión</a>
          <?php endif; ?>
        </div>
        <div class="hero-meta reveal delay-4">
          <div><small>Origen</small><strong>Café peruano de altura</strong></div>
          <div><small>Repostería</small><strong>Hecha en casa cada día</strong></div>
          <div><small>Atmósfera</small><strong>Acogedora y sin prisa</strong></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- STATS -->
<section class="section-tight bg-cream-2">
  <div class="container">
    <div class="row g-3">
      <div class="col-6 col-lg-3"><div class="stat-card reveal">
        <div class="num"><span data-count="74">0</span>+</div>
        <div class="lbl">Productos en carta</div>
      </div></div>
      <div class="col-6 col-lg-3"><div class="stat-card reveal delay-1">
        <div class="num"><span data-count="12">0</span></div>
        <div class="lbl">Categorías</div>
      </div></div>
      <div class="col-6 col-lg-3"><div class="stat-card reveal delay-2">
        <div class="num"><span data-count="100" data-suffix="%">0%</span></div>
        <div class="lbl">Café peruano</div>
      </div></div>
      <div class="col-6 col-lg-3"><div class="stat-card reveal delay-3">
        <div class="num"><span data-count="4.9">0</span><span class="text-gold" style="font-size:1.6rem">/5</span></div>
        <div class="lbl">Satisfacción</div>
      </div></div>
    </div>
  </div>
</section>

<!-- NOSOTROS -->
<section class="section bg-cream" id="nosotros">
  <div class="container">
    <div class="row align-items-center g-5">
      <div class="col-lg-6 reveal">
        <span class="script">Sobre UKUMARI</span>
        <h2 class="mt-2">Un café con identidad propia.</h2>
        <p class="text-muted mt-3">UKUMARI nace del amor por el café peruano y la repostería artesanal. Cada bebida se prepara con granos seleccionados, leche fresca y la atención al detalle que hace de una visita, una pequeña celebración.</p>
        <p class="text-muted">Aquí encontrarás clásicos perfectamente ejecutados y propuestas únicas como el Uku Baileys o nuestros Mojitos de café. Pasa, quédate, descubre.</p>
        <div class="row g-3 mt-2">
          <div class="col-sm-4">
            <div class="feature-card">
              <div class="icon"><i class="bi bi-cup-hot-fill"></i></div>
              <h5>Café fresco</h5>
              <p>Tostado en lotes pequeños, semana a semana.</p>
            </div>
          </div>
          <div class="col-sm-4">
            <div class="feature-card">
              <div class="icon"><i class="bi bi-flower1"></i></div>
              <h5>Recetas con alma</h5>
              <p>Bebidas y postres pensados con cariño.</p>
            </div>
          </div>
          <div class="col-sm-4">
            <div class="feature-card">
              <div class="icon"><i class="bi bi-stars"></i></div>
              <h5>Espacio cálido</h5>
              <p>Para trabajar, reunirte o solo desconectar.</p>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-6 reveal delay-2">
        <div class="about-image" style="border-radius:22px;overflow:hidden;box-shadow:var(--uku-shadow);min-height:460px;background:url('https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80') center/cover no-repeat;"></div>
      </div>
    </div>
  </div>
</section>

<!-- POR QUE UKUMARI -->
<section class="section">
  <div class="container">
    <div class="section-title reveal">
      <span class="script">Por qué elegirnos</span>
      <h2>Lo que hace especial a UKUMARI</h2>
      <p>Cuatro razones para volver una y otra vez.</p>
    </div>
    <div class="row g-3">
      <div class="col-md-6 col-lg-3 reveal"><div class="feature-card">
        <div class="icon"><i class="bi bi-award"></i></div>
        <h5>Café de origen</h5>
        <p>Granos peruanos de altura seleccionados con baristas expertos.</p>
      </div></div>
      <div class="col-md-6 col-lg-3 reveal delay-1"><div class="feature-card">
        <div class="icon"><i class="bi bi-cake2"></i></div>
        <h5>Repostería propia</h5>
        <p>Tortas, croissants y postres horneados frescos cada mañana.</p>
      </div></div>
      <div class="col-md-6 col-lg-3 reveal delay-2"><div class="feature-card">
        <div class="icon"><i class="bi bi-bag-heart"></i></div>
        <h5>Pedidos al toque</h5>
        <p>Arma tu carrito en línea y recógelo listo en pocos minutos.</p>
      </div></div>
      <div class="col-md-6 col-lg-3 reveal delay-3"><div class="feature-card">
        <div class="icon"><i class="bi bi-gift"></i></div>
        <h5>Programa de puntos</h5>
        <p>Cada sol que gastas suma. Canjéalos por descuentos en tu próxima visita.</p>
      </div></div>
    </div>
  </div>
</section>

<!-- DESTACADOS / PROMOS (Swiper) -->
<section class="section bg-cream">
  <div class="container">
    <div class="section-title reveal">
      <span class="script">Lo que más nos piden</span>
      <h2>Promociones y destacados</h2>
      <p>Elige tu favorito o descubre algo nuevo. Todo está en nuestra carta.</p>
    </div>

    <div class="swiper uku-swiper reveal">
      <div class="swiper-wrapper">
        <div class="swiper-slide slide-1">
          <div>
            <span class="script" style="color:#f5d39e">Lo nuevo</span>
            <h3>Caramel Iced Latte</h3>
            <p>Sirope de caramelo, leche fría y espresso doble.</p>
          </div>
        </div>
        <div class="swiper-slide slide-2">
          <div>
            <span class="script" style="color:#f5d39e">Favorito</span>
            <h3>Mocaccino</h3>
            <p>Chocolate, espresso y leche texturizada.</p>
          </div>
        </div>
        <div class="swiper-slide slide-3">
          <div>
            <span class="script" style="color:#f5d39e">Para compartir</span>
            <h3>Tostada Frutal</h3>
            <p>Pan tostado, chantilly, miel y frutas frescas.</p>
          </div>
        </div>
        <div class="swiper-slide slide-4">
          <div>
            <span class="script" style="color:#f5d39e">De la casa</span>
            <h3>Uku Baileys</h3>
            <p>Café, Baileys y leche texturizada.</p>
          </div>
        </div>
      </div>
      <div class="swiper-pagination"></div>
    </div>

    <div class="text-center mt-3">
      <a href="/carta.php" class="btn btn-uku"><i class="bi bi-journal-text"></i> Explora la carta completa</a>
    </div>
  </div>
</section>

<!-- TESTIMONIOS -->
<section class="section">
  <div class="container">
    <div class="section-title reveal">
      <span class="script">Lo que dicen</span>
      <h2>Voces de quienes nos visitan</h2>
    </div>
    <div class="row g-4">
      <div class="col-md-4 reveal"><div class="testimonio">
        <div class="quote-icon"><i class="bi bi-quote"></i></div>
        <div class="stars">
          <i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i>
        </div>
        <p class="body">El mejor flat white que he probado en Lima. El espacio es acogedor y la atención impecable. Vuelvo cada semana.</p>
        <div class="author">
          <div class="avatar">M</div>
          <div>
            <div class="name">María Fernández</div>
            <div class="role">Cliente frecuente</div>
          </div>
        </div>
      </div></div>
      <div class="col-md-4 reveal delay-1"><div class="testimonio">
        <div class="quote-icon"><i class="bi bi-quote"></i></div>
        <div class="stars">
          <i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i>
        </div>
        <p class="body">El Uku Baileys es una belleza. La torta de tres leches también. Vine por un café y me llevé toda una experiencia.</p>
        <div class="author">
          <div class="avatar">D</div>
          <div>
            <div class="name">Diego Salazar</div>
            <div class="role">Visitante de fin de semana</div>
          </div>
        </div>
      </div></div>
      <div class="col-md-4 reveal delay-2"><div class="testimonio">
        <div class="quote-icon"><i class="bi bi-quote"></i></div>
        <div class="stars">
          <i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-half"></i>
        </div>
        <p class="body">Trabajo desde aquí casi todos los miércoles. Buen wifi, buena luz, café espectacular. Mi rincón favorito.</p>
        <div class="author">
          <div class="avatar">L</div>
          <div>
            <div class="name">Lucía Ortega</div>
            <div class="role">Diseñadora freelance</div>
          </div>
        </div>
      </div></div>
    </div>
  </div>
</section>

<!-- VISITANOS -->
<section class="section bg-cream-2">
  <div class="container">
    <div class="section-title reveal">
      <span class="script">Encuéntranos</span>
      <h2>Visítanos</h2>
      <p>Estamos esperando para servirte la mejor taza del día.</p>
    </div>
    <div class="row g-3">
      <div class="col-lg-4 reveal"><div class="info-card">
        <div class="ico"><i class="bi bi-geo-alt-fill"></i></div>
        <h6>Dirección</h6>
        <p class="text-muted small mb-2">Av. Café 123, San Isidro, Lima.</p>
        <a class="text-uku small fw-semibold" href="https://maps.google.com/?q=Lima" target="_blank" rel="noopener">
          Cómo llegar <i class="bi bi-arrow-up-right"></i>
        </a>
      </div></div>
      <div class="col-lg-4 reveal delay-1"><div class="info-card">
        <div class="ico"><i class="bi bi-clock-fill"></i></div>
        <h6>Horario</h6>
        <div class="info-line"><span>Lun – Vie</span><span>7:00 – 22:00</span></div>
        <div class="info-line"><span>Sáb – Dom</span><span>8:00 – 23:00</span></div>
        <div class="info-line"><span>Feriados</span><span>9:00 – 21:00</span></div>
      </div></div>
      <div class="col-lg-4 reveal delay-2"><div class="info-card">
        <div class="ico"><i class="bi bi-telephone-fill"></i></div>
        <h6>Contáctanos</h6>
        <div class="info-line"><span><i class="bi bi-whatsapp"></i> WhatsApp</span><span><?= e(WHATSAPP_DISPLAY) ?></span></div>
        <div class="info-line"><span><i class="bi bi-envelope"></i> Email</span><span>hola@ukumari.com</span></div>
        <div class="info-line"><span><i class="bi bi-instagram"></i> Instagram</span><span>@ukumari.cafe</span></div>
      </div></div>
    </div>
  </div>
</section>

<!-- CTA FINAL -->
<section class="section bg-coffee text-center">
  <div class="container">
    <span class="script reveal" style="color:#c9a06a;font-size:1.6rem">Te invitamos un café</span>
    <h2 class="reveal delay-1" style="color:#fff">Pide en línea, recoge en tienda.</h2>
    <p class="text-light-50 mx-auto reveal delay-2" style="max-width:560px">Arma tu pedido desde la web, confirma y nosotros lo preparamos al momento. Así de fácil.</p>
    <div class="d-flex flex-wrap gap-2 justify-content-center mt-3 reveal delay-3">
      <a href="/carta.php" class="btn btn-gold"><i class="bi bi-bag-plus"></i> Hacer mi pedido</a>
      <a href="https://wa.me/<?= e(WHATSAPP_NUMBER) ?>" target="_blank" rel="noopener" class="btn-wa">
        <i class="bi bi-whatsapp"></i> Escríbenos
      </a>
    </div>
  </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
