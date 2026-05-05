<?php
require __DIR__ . '/../includes/config.php';
require __DIR__ . '/../includes/auth.php';
require __DIR__ . '/../includes/helpers.php';
require_role(['mesero','administrador']);

if ($_SERVER['REQUEST_METHOD']==='POST' && csrf_check($_POST['_csrf'] ?? null)) {
    db()->prepare("UPDATE mesas SET estado=? WHERE id=?")
        ->execute([$_POST['estado'], (int)$_POST['id']]);
    header('Location: /mesero/mesas.php'); exit;
}
$mesas = db()->query("SELECT * FROM mesas ORDER BY CAST(numero AS UNSIGNED)")->fetchAll();

$panel_role='mesero'; $panel_active='mesas';
$page_title='Mesas'; $title='Mesas · UKUMARI';
require __DIR__ . '/../includes/panel_layout.php';
?>

<div class="row g-3">
<?php foreach ($mesas as $m):
  $color = ['libre'=>'success','ocupada'=>'danger','reservada'=>'warning'][$m['estado']] ?? 'secondary';
?>
  <div class="col-6 col-md-3">
    <div class="panel-card text-center">
      <div class="display-5" style="color:var(--uku-coffee-700);font-family:'Playfair Display'">
        <i class="bi bi-grid-3x3-gap"></i> <?= e($m['numero']) ?>
      </div>
      <span class="badge bg-<?= $color ?> text-uppercase"><?= e($m['estado']) ?></span>
      <form method="post" class="mt-2">
        <?= csrf_field() ?>
        <input type="hidden" name="id" value="<?= $m['id'] ?>">
        <select class="form-select form-select-sm" name="estado" onchange="this.form.submit()">
          <?php foreach (['libre','ocupada','reservada'] as $s): ?>
            <option value="<?= $s ?>" <?= $m['estado']===$s?'selected':'' ?>><?= ucfirst($s) ?></option>
          <?php endforeach; ?>
        </select>
      </form>
    </div>
  </div>
<?php endforeach; ?>
</div>

<?php require __DIR__ . '/../includes/panel_footer.php'; ?>
