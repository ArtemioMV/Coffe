<?php
$page = 'carta';
$title = 'Carta · UKUMARI';
require __DIR__ . '/includes/header.php';

$grouped = get_productos_por_categoria(true);
$categorias = get_categorias(true);
?>

<section class="menu-wrap py-5">
  <div class="container">
    <div class="section-title">
      <span class="script">Nuestra carta</span>
      <h2>Carta UKUMARI</h2>
      <p>Café de especialidad, postres artesanales y bebidas pensadas con cariño.</p>
    </div>

    <!-- Buscador -->
    <div class="row justify-content-center mb-3">
      <div class="col-lg-6">
        <div class="input-group menu-search">
          <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-uku"></i></span>
          <input type="search" id="menuSearch" class="form-control border-start-0"
                 placeholder="Buscar en la carta… (ej. latte, mojito, croissant)">
          <button class="btn btn-outline-uku" type="button" id="menuSearchClear" title="Limpiar">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="text-center small text-muted mt-2" id="searchEmpty" style="display:none">
          No encontramos productos que coincidan.
        </div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="cat-filter">
      <a href="#" class="cat-pill active" data-cat="all">Todo</a>
      <?php foreach ($categorias as $c): ?>
        <a href="#" class="cat-pill" data-cat="<?= e($c['nombre']) ?>"><?= e($c['nombre']) ?></a>
      <?php endforeach; ?>
    </div>

    <div class="menu-paper">
      <?php if (!$grouped): ?>
        <p class="text-center text-muted">Aún no hay productos disponibles.</p>
      <?php endif; ?>

      <?php foreach ($grouped as $cat => $items): ?>
        <div class="menu-cat" data-cat="<?= e($cat) ?>" id="cat-<?= e(preg_replace('/\s+/','-',strtolower($cat))) ?>">
          <h3 class="menu-cat-title"><?= e($cat) ?></h3>
          <div class="row gx-4">
            <?php foreach ($items as $p): ?>
              <div class="col-md-6 menu-item-wrap"
                   data-name="<?= e(mb_strtolower($p['nombre'])) ?>"
                   data-desc="<?= e(mb_strtolower($p['descripcion'] ?? '')) ?>">
                <div class="menu-item">
                  <div class="it-info">
                    <div class="it-name"><?= e($p['nombre']) ?></div>
                    <?php if (!empty($p['descripcion'])): ?>
                      <div class="it-desc"><?= e($p['descripcion']) ?></div>
                    <?php endif; ?>
                  </div>
                  <div class="dotline"></div>
                  <div class="it-price"><?= money($p['precio']) ?></div>
                  <div class="it-add">
                    <button class="btn-add"
                            data-add-to-cart
                            data-id="<?= (int)$p['id'] ?>"
                            data-nombre="<?= e($p['nombre']) ?>"
                            data-precio="<?= e($p['precio']) ?>"
                            title="Agregar al carrito">
                      <i class="bi bi-plus-lg"></i>
                    </button>
                  </div>
                </div>
              </div>
            <?php endforeach; ?>
          </div>
        </div>
      <?php endforeach; ?>
    </div>

    <div class="text-center mt-4 d-flex flex-wrap gap-2 justify-content-center">
      <a href="/carrito.php" class="btn btn-uku"><i class="bi bi-bag-check"></i> Ir al carrito</a>
      <button type="button" class="btn-wa" id="btnShareMenu">
        <i class="bi bi-whatsapp"></i> Compartir carta
      </button>
    </div>
  </div>
</section>

<script>
document.getElementById('btnShareMenu')?.addEventListener('click', async () => {
  const url = location.origin + '/carta.php';
  const text = '☕ Mira la carta de UKUMARI:';
  const data = { title: 'Carta UKUMARI', text, url };
  // Web Share API (móviles): elige WhatsApp, Telegram, etc.
  if (navigator.share) {
    try { await navigator.share(data); return; } catch(_) { /* el usuario canceló */ }
  }
  // Fallback: abrir WhatsApp web/app con mensaje pre-armado.
  const msg = encodeURIComponent(`${text}\n${url}`);
  window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener');
});
</script>

<?php require __DIR__ . '/includes/footer.php'; ?>
