const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rp = (n) => 'Rp' + Number(n).toLocaleString('id-ID');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = { cats: [], prods: [], cat: 0, q: '', cart: new Map(), state: 'loading', poll: null };
const ART = {
  plate: '<svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true"><ellipse cx="32" cy="42" rx="28" ry="10" opacity=".35"/><ellipse cx="32" cy="38" rx="28" ry="10"/><path d="M14 36c2-14 34-14 36 0-8 5-28 5-36 0z" fill="#fff"/></svg>',
  bowl: '<svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true"><path d="M6 28h52a26 22 0 0 1-52 0z"/><path d="M22 22c0-4 4-4 4-8m10 8c0-4 4-4 4-8" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/></svg>',
  cup: '<svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true"><path d="M16 14h32l-4 40a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4z"/><path d="M14 14h36" stroke="#fff" stroke-width="3" opacity=".6"/><path d="M36 4l-6 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  snack: '<svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true"><circle cx="24" cy="36" r="14"/><circle cx="42" cy="32" r="12" opacity=".7"/><circle cx="20" cy="32" r="3" fill="#fff" opacity=".6"/></svg>'
};
const iconOf = (p) => S.cats.find((c) => c.id === p.category_id)?.icon || 'plate';
const artOf = (p) => `<div class="art">${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy" width="400" height="300">` : ART[iconOf(p)]}</div>`;
const stockOf = (p) => (p.stock <= 0 ? ['out', 'Habis'] : p.stock <= 5 ? ['low', `Sisa ${p.stock}`] : ['ok', 'Tersedia']);

async function api(url, opt = {}) {
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opt });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Terjadi kesalahan');
  return d;
}
let tt;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2600); }

/* ---------- menu ---------- */
async function loadMenu() {
  S.state = 'loading'; renderGrid();
  try { const d = await api('/api/menu'); S.cats = d.categories; S.prods = d.products; S.state = 'ok'; }
  catch { S.state = 'error'; }
  for (const [id, it] of [...S.cart]) { const p = S.prods.find((x) => x.id === id); if (!p || p.stock <= 0) S.cart.delete(id); else it.qty = Math.min(it.qty, p.stock); }
  renderCats(); renderGrid(); renderCart();
}
function renderCats() {
  const btn = (id, name) => `<button class="chip" aria-pressed="${S.cat === id}" data-cat="${id}">${esc(name)}</button>`;
  $('#menuCats').innerHTML = btn(0, 'Semua') + S.cats.map((c) => btn(c.id, c.name)).join('');
  $('#homeCats').innerHTML = S.cats.map((c) => `<a class="chip" href="#/menu" data-cat="${c.id}">${esc(c.name)}</a>`).join('') || '<p class="lead">Kategori belum tersedia.</p>';
}
function renderGrid() {
  const g = $('#grid');
  if (S.state === 'loading') { g.innerHTML = '<div class="skel"></div>'.repeat(6); return; }
  if (S.state === 'error') { g.innerHTML = '<div class="empty"><p>Menu gagal dimuat.</p><button class="btn ghost" id="retry">Coba lagi</button></div>'; return; }
  const q = S.q.trim().toLowerCase();
  const list = S.prods.filter((p) => (!S.cat || p.category_id === S.cat) && (!q || (p.name + ' ' + p.description).toLowerCase().includes(q)));
  if (!list.length) { g.innerHTML = `<div class="empty">${S.prods.length ? 'Tidak ada menu yang cocok.' : 'Menu belum tersedia.'}</div>`; return; }
  g.innerHTML = list.map((p, i) => {
    const [k, label] = stockOf(p);
    return `<article class="card reveal" style="--i:${i % 6}"><button class="opener" data-open="${p.id}" aria-label="Lihat detail ${esc(p.name)}">${artOf(p)}</button>
    <div class="meta"><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><div class="row"><strong class="price">${rp(p.price)}</strong><span class="stock ${k}">${label}</span></div>
    <button class="btn primary add" data-add="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>${p.stock <= 0 ? 'Habis' : 'Tambah'}</button></div></article>`;
  }).join('');
  observe();
}

/* ---------- cart ---------- */
const cartTotal = () => [...S.cart].reduce((s, [id, it]) => s + (S.prods.find((p) => p.id === id)?.price || 0) * it.qty, 0);
function setQty(id, d) {
  const p = S.prods.find((x) => x.id === id); if (!p) return;
  const it = S.cart.get(id) || { qty: 0, note: '' }; const n = it.qty + d;
  if (n > p.stock) return toast(`Stok ${p.name} hanya ${p.stock}`);
  if (n <= 0) S.cart.delete(id); else S.cart.set(id, { ...it, qty: Math.min(n, 20) });
  renderCart();
}
function renderCart() {
  const n = [...S.cart.values()].reduce((s, i) => s + i.qty, 0); $('#cartCount').textContent = n;
  const d = $('#drawer');
  const items = [...S.cart].map(([id, it]) => { const p = S.prods.find((x) => x.id === id); return `<div class="li"><div><h3>${esc(p.name)}</h3><span class="price">${rp(p.price * it.qty)}</span></div><div class="qty"><button data-dec="${id}" aria-label="Kurangi ${esc(p.name)}">−</button><span>${it.qty}</span><button data-inc="${id}" aria-label="Tambah ${esc(p.name)}">+</button></div></div>`; }).join('');
  d.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">Keranjang</h2><button class="x" data-close aria-label="Tutup keranjang">✕</button></div>
  <div class="list">${items || '<p class="empty">Keranjang masih kosong.</p>'}</div>
  <div class="total"><span>Total</span><span>${rp(cartTotal())}</span></div><button class="btn primary" data-checkout ${S.cart.size ? '' : 'disabled'}>Lanjut Checkout</button>`;
}
function drawer(open) {
  const d = $('#drawer'), s = $('#scrim'); d.classList.toggle('open', open); d.inert = !open; d.setAttribute('aria-hidden', !open); s.hidden = !open;
  if (open) $('[data-close]', d).focus(); else $('#cartBtn').focus();
}
function fly(from) {
  if (RM || !from) return; const a = from.getBoundingClientRect(), b = $('#cartBtn').getBoundingClientRect();
  const el = Object.assign(document.createElement('i'), { className: 'dot' }); document.body.append(el);
  el.animate([{ transform: `translate(${a.left + a.width / 2}px,${a.top}px) scale(1)`, left: 0, top: 0 }, { transform: `translate(${b.left + 14}px,${b.top + 14}px) scale(.3)`, left: 0, top: 0 }], { duration: 650, easing: 'cubic-bezier(.5,0,.2,1)' }).finished.finally(() => { el.remove(); const c = $('#cartBtn'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); });
}

/* ---------- dialogs ---------- */
const dlg = $('#dlg');
function open(html) { dlg.innerHTML = html; if (!dlg.open) dlg.showModal(); }
function detail(id) {
  const p = S.prods.find((x) => x.id === id); if (!p) return; const [k, label] = stockOf(p);
  open(`<form method="dialog" style="text-align:right"><button class="x" aria-label="Tutup">✕</button></form>${artOf(p)}<h2 style="margin-top:16px">${esc(p.name)}</h2><p class="lead" style="margin:6px 0 12px">${esc(p.description)}</p>
  <div class="row"><strong class="price">${rp(p.price)}</strong><span class="stock ${k}">${label}</span></div><br><button class="btn primary" style="width:100%" data-add="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>Tambah ke Keranjang</button>`);
}
function checkout() {
  drawer(false);
  open(`<form id="co"><h2>Checkout</h2>
  <div class="field"><label for="nm">Nama pemesan</label><input id="nm" name="name" maxlength="60" required autocomplete="name"></div>
  <div class="field"><span style="font-weight:600;font-size:14px">Pengambilan</span><div class="seg"><label><input type="radio" name="pickup" value="ambil" checked><span>Ambil di kantin</span></label><label><input type="radio" name="pickup" value="antar"><span>Antar ke meja</span></label></div></div>
  <div class="field" id="tbl" hidden><label for="tb">Nomor meja</label><input id="tb" name="table" maxlength="10"></div>
  <div class="field"><label for="nt">Catatan (opsional)</label><textarea id="nt" name="note" maxlength="200" rows="2"></textarea></div>
  <p class="lead" style="margin:0 0 12px">Pembayaran: bayar di kasir.</p>
  <div class="total"><span>Total</span><span>${rp(cartTotal())}</span></div><p class="err" role="alert" id="err"></p>
  <button class="btn primary" style="width:100%" id="send">Kirim Pesanan</button><button class="btn ghost" style="width:100%;margin-top:8px" type="button" data-dclose>Kembali</button></form>`);
}
async function submitOrder(f) {
  const b = $('#send'), e = $('#err'); e.textContent = ''; b.disabled = true; b.textContent = 'Mengirim…';
  const fd = new FormData(f);
  try {
    const r = await api('/api/orders', { method: 'POST', body: JSON.stringify({ name: fd.get('name'), pickup: fd.get('pickup'), table: fd.get('table'), note: fd.get('note'), items: [...S.cart].map(([id, it]) => ({ id, qty: it.qty })) }) });
    S.cart.clear(); renderCart(); dlg.close(); location.hash = '#/status/' + r.code; loadMenu();
  } catch (x) { e.textContent = x.message; b.disabled = false; b.textContent = 'Kirim Pesanan'; }
}

/* ---------- tracking ---------- */
const STEPS = [['baru', 'Diterima'], ['diproses', 'Diproses'], ['siap', 'Siap'], ['selesai', 'Selesai']];
async function track(code, quiet) {
  const box = $('#track'); clearTimeout(S.poll);
  try {
    const o = await api('/api/orders?code=' + encodeURIComponent(code)); const idx = STEPS.findIndex((s) => s[0] === o.status), bad = o.status === 'dibatalkan';
    box.innerHTML = `<div class="tk"><p>Kode pesanan</p><h3 style="font-size:28px">${esc(o.code)}</h3><p>Simpan kode ini untuk memantau pesanan.</p>
    ${bad ? '<p class="badge bad">✕ Dibatalkan</p>' : `<ol class="tl">${STEPS.map((s, i) => `<li class="${i <= idx ? 'on' : ''} ${i === idx && idx < 3 ? 'cur' : ''}">${i < idx || idx === 3 ? '✓ ' : ''}${s[1]}</li>`).join('')}</ol>`}
    <p><b>${esc(o.customer_name)}</b> · ${o.pickup === 'antar' ? 'Antar ke meja ' + esc(o.table_no) : 'Ambil di kantin'}</p>
    <ul style="padding-left:18px;margin:10px 0">${o.items.map((i) => `<li>${i.qty}× ${esc(i.name)} <span style="color:var(--muted)">${rp(i.price * i.qty)}</span></li>`).join('')}</ul>
    <div class="total"><span>Total</span><span>${rp(o.total)}</span></div><p>Pembayaran di kasir. Tunjukkan kode saat mengambil.</p></div>`;
    if (!bad && idx < 3) S.poll = setTimeout(function t() { if (!document.hidden && location.hash.startsWith('#/status')) track(code, true); else S.poll = setTimeout(t, 10000); }, 10000);
  } catch (x) { if (!quiet) box.innerHTML = `<p class="err" role="alert">${esc(x.message)}</p>`; }
}

/* ---------- router ---------- */
function route() {
  if (location.hash && !location.hash.startsWith('#/')) return;
  const h = location.hash.replace(/^#\/?/, '').split('/'), name = ['menu', 'status'].includes(h[0]) ? h[0] : 'home';
  const swap = () => { $$('[data-view]').forEach((v) => (v.hidden = v.id !== name)); $$('[data-route]').forEach((a) => (a.dataset.route === name ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'))); scrollTo(0, 0); observe(); };
  if (document.startViewTransition && !RM) document.startViewTransition(swap); else swap();
  if (name === 'status' && h[1]) { $('#code').value = h[1]; track(h[1]); } else if (name !== 'status') clearTimeout(S.poll);
  document.title = { home: 'Pesan Makanan Kantin', menu: 'Menu · Kantin', status: 'Status Pesanan · Kantin' }[name];
}

/* ---------- effects ---------- */
const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 }) : null;
function observe() { $$('.reveal:not(.in)').forEach((el) => (io ? io.observe(el) : el.classList.add('in'))); }
function words() { const h = $('.reveal-words'); h.setAttribute('aria-label', h.textContent); h.innerHTML = h.textContent.split(' ').map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${esc(w)}</span></span>`).join(' '); }
function pointerFx() {
  if (RM || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  const sc = $('#scene'); let raf;
  sc.addEventListener('pointermove', (e) => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const r = sc.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; sc.firstElementChild.style.setProperty('--ry', x * 22 + 'deg'); sc.firstElementChild.style.setProperty('--rx', -y * 16 + 'deg'); }); });
  sc.addEventListener('pointerleave', () => { sc.firstElementChild.style.removeProperty('--ry'); sc.firstElementChild.style.removeProperty('--rx'); });
  $('#grid').addEventListener('pointermove', (e) => { const c = e.target.closest('.card'); if (!c) return; const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; c.style.cssText += `--mx:${x * 100}%;--my:${y * 100}%;--ry:${(x - .5) * 8}deg;--rx:${(.5 - y) * 8}deg`; });
  $('#grid').addEventListener('pointerout', (e) => { const c = e.target.closest('.card'); if (c && !c.contains(e.relatedTarget)) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); } });
  $$('[data-magnetic]').forEach((m) => { m.addEventListener('pointermove', (e) => { const r = m.getBoundingClientRect(); m.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .2}px,${(e.clientY - r.top - r.height / 2) * .3}px)`; }); m.addEventListener('pointerleave', () => (m.style.transform = '')); });
}

/* ---------- events ---------- */
document.addEventListener('click', (e) => {
  const t = (s) => e.target.closest(s); let el;
  if ((el = t('[data-add]'))) { const id = +el.dataset.add, before = S.cart.get(id)?.qty || 0; setQty(id, 1); if ((S.cart.get(id)?.qty || 0) > before) { fly(el); toast('Ditambahkan ke keranjang'); } if (dlg.open) dlg.close(); }
  else if ((el = t('[data-open]'))) detail(+el.dataset.open);
  else if ((el = t('[data-inc]'))) setQty(+el.dataset.inc, 1);
  else if ((el = t('[data-dec]'))) setQty(+el.dataset.dec, -1);
  else if (t('#cartBtn')) drawer(true);
  else if (t('[data-close]') || t('#scrim')) drawer(false);
  else if (t('[data-checkout]')) checkout();
  else if (t('[data-dclose]')) dlg.close();
  else if (t('#retry')) loadMenu();
  else if ((el = t('[data-cat]'))) { S.cat = +el.dataset.cat; renderCats(); renderGrid(); }
  else if (e.target === dlg) dlg.close();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#drawer').classList.contains('open')) drawer(false); });
document.addEventListener('submit', (e) => { if (e.target.id === 'co') { e.preventDefault(); submitOrder(e.target); } });
document.addEventListener('change', (e) => { if (e.target.name === 'pickup') { $('#tbl').hidden = e.target.value !== 'antar'; $('#tb').required = e.target.value === 'antar'; } });
$('#q').addEventListener('input', (e) => { S.q = e.target.value; renderGrid(); });
$('#lookup').addEventListener('submit', (e) => { e.preventDefault(); const c = $('#code').value.trim().toUpperCase(); if (c) location.hash = '#/status/' + c; });
addEventListener('hashchange', route);

words(); renderCart(); route(); observe(); pointerFx(); loadMenu();
setTimeout(() => $('#curtain').classList.add('done'), RM ? 0 : 1700);
