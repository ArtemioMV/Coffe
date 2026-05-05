/* UKUMARI cart — localStorage */
const UKU_CART_KEY = 'ukumari_cart_v1';

const Cart = {
  read() {
    try { return JSON.parse(localStorage.getItem(UKU_CART_KEY)) || []; }
    catch { return []; }
  },
  write(items) {
    localStorage.setItem(UKU_CART_KEY, JSON.stringify(items));
    this.refreshBadge();
    document.dispatchEvent(new CustomEvent('cart:changed'));
  },
  add(p) {
    const items = this.read();
    const i = items.findIndex(x => x.id === p.id);
    if (i >= 0) items[i].qty += (p.qty || 1);
    else items.push({ id: p.id, nombre: p.nombre, precio: parseFloat(p.precio), qty: p.qty || 1, obs: '' });
    this.write(items);
  },
  setObs(id, obs) {
    // No dispara cart:changed — evita redibujar y perder el foco mientras se escribe.
    const items = this.read();
    const i = items.findIndex(x => x.id === id);
    if (i < 0) return;
    items[i].obs = (obs || '').slice(0, 200);
    localStorage.setItem(UKU_CART_KEY, JSON.stringify(items));
  },
  setQty(id, qty) {
    const items = this.read();
    const i = items.findIndex(x => x.id === id);
    if (i < 0) return;
    if (qty <= 0) items.splice(i, 1);
    else items[i].qty = qty;
    this.write(items);
  },
  remove(id) {
    this.write(this.read().filter(x => x.id !== id));
  },
  clear() { this.write([]); },
  count() { return this.read().reduce((s, x) => s + x.qty, 0); },
  totals() {
    const items = this.read();
    const subtotal = items.reduce((s, x) => s + x.precio * x.qty, 0);
    const igv = +(subtotal * 0.18 / 1.18).toFixed(2);
    const base = +(subtotal - igv).toFixed(2);
    return { items, base, igv, total: +subtotal.toFixed(2) };
  },
  refreshBadge() {
    const el = document.getElementById('cartCount');
    if (!el) return;
    const c = this.count();
    el.textContent = c;
    el.style.display = c > 0 ? 'inline-block' : 'none';
  }
};

window.Cart = Cart;
document.addEventListener('DOMContentLoaded', () => Cart.refreshBadge());
