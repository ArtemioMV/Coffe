<footer class="uku-footer" id="contacto">
  <div class="container">
    <div class="row gy-4">
      <div class="col-lg-4">
        <div class="uku-brand uku-brand-light mb-3">
          <?php
            $logo_footer = null;
            foreach (['logo.png','logo.svg','logo.jpg','logo.jpeg','logo.webp'] as $f) {
              if (file_exists(__DIR__ . '/../assets/img/' . $f)) { $logo_footer = '/assets/img/' . $f; break; }
            }
          ?>
          <?php if ($logo_footer): ?>
            <img src="<?= e($logo_footer) ?>" alt="UKUMARI" class="brand-logo">
          <?php else: ?>
            <span class="brand-mark">U</span>
          <?php endif; ?>
          <span class="brand-text">
            UKUMARI
            <small>Café de especialidad</small>
          </span>
        </div>
        <p class="text-light-50 mb-0">Café de origen, repostería artesanal y bebidas pensadas con cariño. Un espacio cálido para encontrarte con lo que más disfrutas.</p>
      </div>

      <div class="col-6 col-lg-2">
        <h6 class="footer-title">Sitio</h6>
        <ul class="list-unstyled footer-links">
          <li><a href="/">Inicio</a></li>
          <li><a href="/carta.php">Carta</a></li>
          <li><a href="/carrito.php">Carrito</a></li>
          <li><a href="/login.php">Mi cuenta</a></li>
        </ul>
      </div>

      <div class="col-6 col-lg-3">
        <h6 class="footer-title">Horario</h6>
        <ul class="list-unstyled footer-links">
          <li>Lun – Vie: 7:00 a.m. – 10:00 p.m.</li>
          <li>Sáb – Dom: 8:00 a.m. – 11:00 p.m.</li>
        </ul>
      </div>

      <div class="col-12 col-lg-3">
        <h6 class="footer-title">Contacto</h6>
        <ul class="list-unstyled footer-links">
          <li><i class="bi bi-geo-alt"></i> Av. Café 123, Lima</li>
          <li><i class="bi bi-telephone"></i> +51 999 000 000</li>
          <li><i class="bi bi-envelope"></i> hola@ukumari.com</li>
        </ul>
        <div class="footer-social mt-2">
          <a href="#" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
          <a href="#" aria-label="Facebook"><i class="bi bi-facebook"></i></a>
          <a href="#" aria-label="TikTok"><i class="bi bi-tiktok"></i></a>
        </div>
      </div>
    </div>
    <hr class="footer-sep">
    <div class="d-flex flex-wrap justify-content-between gap-2 small">
      <span>© <?= date('Y') ?> UKUMARI · Todos los derechos reservados.</span>
      <span>Hecho con <i class="bi bi-cup-hot-fill"></i> en Lima.</span>
    </div>
  </div>
</footer>

<a class="wa-fab" target="_blank" rel="noopener"
   href="https://wa.me/<?= e(WHATSAPP_NUMBER) ?>?text=<?= e(rawurlencode('Hola UKUMARI 👋, quisiera consultarles sobre…')) ?>"
   aria-label="Escríbenos por WhatsApp">
  <i class="bi bi-whatsapp"></i>
  <span class="wa-fab-label">¿Te ayudamos?</span>
</a>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script src="/assets/js/cart.js"></script>
<script src="/assets/js/app.js"></script>
</body>
</html>
