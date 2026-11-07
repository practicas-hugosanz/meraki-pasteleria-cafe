/* Meraki — tienda online: catálogo, carrito (guardado en el navegador) y pedido para recoger en el local. */
(() => {
  /* ================== AJUSTES ==================
     Los pedidos llegan al WhatsApp de la pastelería: el cliente rellena el pedido aquí y se le abre WhatsApp
     con el mensaje ya escrito, solo tiene que darle a enviar.
     whatsapp: número con prefijo de país, sin espacios ni "+", p. ej. "34600000000".
     Si está vacío, la tienda funciona en modo demostración (se ve todo el flujo, pero no se abre WhatsApp). */
  const CONFIG = { whatsapp: "" };

  /* Horario de recogida (0 = domingo). Igual que el horario del local. */
  const HOURS = { 0: [9, 20], 1: [8, 14], 2: [8, 20], 3: [8, 20], 4: [8, 20], 5: [8, 20], 6: [9, 20] };

  const CATS = [
    { id: "todo", name: "Todo" },
    { id: "tartas", name: "Tartas enteras" },
    { id: "dulces", name: "Alfajores y cookies" },
    { id: "bolleria", name: "Bollería" },
    { id: "salado", name: "Salado" },
    { id: "regalo", name: "Para regalar" },
  ];

  /* Precios en céntimos. Los de "carta: true" son los de la carta del local.
     Los marcados con prov: true son PROVISIONALES y hay que confirmarlos con Meraki. */
  const PRODUCTS = [
    { id: "cheesecake-pistacho", cat: "tartas", name: "Cheesecake de pistacho", desc: "Cheesecake entera con crema de pistacho y pistacho troceado por encima.", price: 3800, unit: "entera · 8–10 raciones", img: "assets/img/cheesecake-pistacho.webp", lead: 2, tag: "Por encargo · 48 h", prov: true },
    { id: "cheesecake-maracuya", cat: "tartas", name: "Cheesecake de maracuyá", desc: "Cheesecake entera con cobertura de maracuyá sobre base de galleta.", price: 3600, unit: "entera · 8–10 raciones", img: "assets/img/cheesecake-maracuya.webp", lead: 2, tag: "Por encargo · 48 h", prov: true },
    { id: "crumble-manzana", cat: "tartas", name: "Crumble de manzana", desc: "Tarta de manzana entera, al estilo holandés, con cobertura de crumble.", price: 3200, unit: "entera · 8 raciones", img: "assets/img/v-crumble.webp", pos: "50% 50%", lead: 2, tag: "Por encargo · 48 h", prov: true },
    { id: "alfajor-maicena", cat: "dulces", name: "Alfajor de maicena", desc: "Alfajor argentino de maicena relleno de dulce de leche y rebozado en coco.", price: 160, unit: "la unidad", img: "assets/img/v-alfajores.webp", lead: 1, carta: true },
    { id: "cookie-pistacho", cat: "dulces", name: "Cookie de pistacho", desc: "", price: 230, unit: "la unidad", img: "assets/img/v-pistacho.webp", lead: 1, carta: true },
    { id: "cookie-nutella", cat: "dulces", name: "Cookie de Nutella", desc: "", price: 230, unit: "la unidad", img: "assets/img/v-nutella.webp", lead: 1, carta: true },
    { id: "cookie-redvelvet", cat: "dulces", name: "Cookie red velvet", desc: "Cookie red velvet con crema.", price: 230, unit: "la unidad", img: "assets/img/v-redvelvet.webp", lead: 1, carta: true },
    { id: "croissant-mini", cat: "bolleria", name: "Croissant mini relleno", desc: "Croissant mini 100% mantequilla, relleno de pistacho o Nutella.", price: 130, unit: "la unidad", img: "assets/img/v-croissants.webp", lead: 1, carta: true, variants: ["Pistacho", "Nutella"] },
    { id: "hojaldre-manzana", cat: "bolleria", name: "Hojaldre de manzana", desc: "Hojaldre con manzana laminada en forma de rosa y reducción de pera.", price: 260, unit: "la unidad", img: "assets/img/v-rosas.webp", pos: "50% 80%", lead: 1, carta: true },
    { id: "empanada", cat: "salado", name: "Empanada argentina", desc: "Empanada argentina casera. Rellenos: ternera, pollo, humita, espinacas y mozzarella o rulo de cabra.", price: 280, unit: "la unidad", img: "assets/img/v-empanadas.webp", lead: 1, prov: true, variants: ["Ternera", "Pollo", "Humita", "Espinacas y mozzarella", "Rulo de cabra, pera y cebolla"] },
    { id: "caja-alfajores", cat: "regalo", name: "Caja de 6 alfajores", desc: "Seis alfajores de maicena con dulce de leche y coco, en caja.", price: 960, unit: "caja de 6", img: "assets/img/alfajores.webp", lead: 1, tag: "Para regalar" },
    { id: "caja-cookies", cat: "regalo", name: "Caja de 4 cookies", desc: "Cookie de pistacho, de Nutella, red velvet y la cookie del día, en caja.", price: 920, unit: "caja de 4", img: "assets/img/v-nutella.webp", pos: "50% 60%", lead: 1, tag: "Para regalar" },
  ];

  const KEY = "meraki-cart-v1";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const eur = (c) => (c / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  /* ---------- Estado del carrito ---------- */
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(KEY) || "[]").filter((l) => byId[l.id] && l.qty > 0); } catch (e) { cart = []; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) { /* sin almacenamiento */ } };
  const count = () => cart.reduce((s, l) => s + l.qty, 0);
  const total = () => cart.reduce((s, l) => s + l.qty * byId[l.id].price, 0);
  const lineKey = (id, v) => id + (v ? "|" + v : "");
  const add = (id, variant, qty = 1) => {
    const k = lineKey(id, variant);
    const line = cart.find((l) => l.key === k);
    if (line) line.qty += qty; else cart.push({ key: k, id, variant: variant || "", qty });
    save(); renderCart(true);
  };
  const setQty = (k, qty) => {
    const line = cart.find((l) => l.key === k);
    if (!line) return;
    line.qty = Math.max(0, Math.min(99, qty));
    if (!line.qty) cart = cart.filter((l) => l !== line);
    save(); renderCart();
  };

  /* ---------- Catálogo ---------- */
  const grid = $("[data-grid]");
  const filters = $("[data-filters]");
  let current = "todo";
  const renderFilters = () => {
    filters.innerHTML = CATS.map((c) => {
      const n = c.id === "todo" ? PRODUCTS.length : PRODUCTS.filter((p) => p.cat === c.id).length;
      return `<button class="chip" type="button" data-cat="${c.id}" aria-pressed="${c.id === current}">${c.name}<span class="chip__n">${n}</span></button>`;
    }).join("");
  };
  const renderGrid = () => {
    const list = PRODUCTS.filter((p) => current === "todo" || p.cat === current);
    grid.innerHTML = list.map((p, i) => `
      <li class="prod" style="--i:${i}" data-id="${p.id}">
        <div class="prod__img">
          <img src="${p.img}" alt="${esc(p.name)}" loading="lazy" decoding="async" style="object-position:${p.pos || "50% 50%"}">
          ${p.tag ? `<span class="prod__tag${p.lead > 1 ? " prod__tag--encargo" : ""}">${esc(p.tag)}</span>` : ""}
        </div>
        <div class="prod__body">
          <div class="prod__top">
            <h3 class="prod__name">${esc(p.name)}</h3>
            <p class="prod__price">${eur(p.price)}<span class="prod__unit">${esc(p.unit)}</span></p>
          </div>
          ${p.desc ? `<p class="prod__desc">${esc(p.desc)}</p>` : ""}
          ${p.variants ? `<div class="prod__opt"><label for="v-${p.id}">${p.cat === "salado" ? "Relleno" : "Sabor"}</label><select id="v-${p.id}" data-variant>${p.variants.map((v) => `<option>${esc(v)}</option>`).join("")}</select></div>` : ""}
          <div class="prod__act"><button class="add" type="button" data-add="${p.id}"><svg aria-hidden="true"><use href="#bag"/></svg><span>Añadir al pedido</span></button></div>
        </div>
      </li>`).join("");
  };
  filters.addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]");
    if (!b || b.dataset.cat === current) return;
    current = b.dataset.cat;
    renderFilters(); renderGrid();
  });
  grid.addEventListener("click", (e) => {
    const b = e.target.closest("[data-add]");
    if (!b) return;
    const card = b.closest(".prod");
    const sel = $("[data-variant]", card);
    const p = byId[b.dataset.add];
    add(p.id, sel ? sel.value : "");
    toast(`Añadido: ${p.name}${sel ? " (" + sel.value + ")" : ""}`);
    const label = $("span", b);
    b.classList.add("is-added"); label.textContent = "¡Añadido!";
    clearTimeout(b._t); b._t = setTimeout(() => { b.classList.remove("is-added"); label.textContent = "Añadir al pedido"; }, 1400);
  });

  /* ---------- Aviso ---------- */
  const toastEl = $("[data-toast]");
  const toast = (msg) => {
    toastEl.textContent = msg; toastEl.classList.add("is-on");
    clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove("is-on"), 2200);
  };

  /* ---------- Carrito: pintar ---------- */
  const cartEl = $("#cart");
  const scrim = $(".scrim");
  const mbar = $(".mbar");
  const leadDays = () => cart.reduce((m, l) => Math.max(m, byId[l.id].lead || 1), 1);
  const renderCart = (bump) => {
    const n = count();
    $$("[data-cart-count]").forEach((el) => {
      el.textContent = n;
      el.toggleAttribute("data-zero", n === 0);
      if (bump) { el.classList.remove("is-bump"); void el.offsetWidth; el.classList.add("is-bump"); }
    });
    $$("[data-total]").forEach((el) => { el.textContent = eur(total()); });
    $("[data-empty]").hidden = n > 0;
    $("[data-foot]").hidden = n === 0;
    $("[data-lines]").innerHTML = cart.map((l) => {
      const p = byId[l.id];
      return `<li class="line">
        <img src="${p.img}" alt="" loading="lazy" style="object-position:${p.pos || "50% 50%"}">
        <div>
          <p class="line__name">${esc(p.name)}</p>
          ${l.variant ? `<p class="line__var">${esc(l.variant)}</p>` : ""}
          <div class="line__ctrl">
            <div class="qty"><button type="button" data-dec="${esc(l.key)}" aria-label="Quitar uno de ${esc(p.name)}">−</button><output aria-live="polite">${l.qty}</output><button type="button" data-inc="${esc(l.key)}" aria-label="Añadir uno más de ${esc(p.name)}">+</button></div>
            <button class="line__rm" type="button" data-rm="${esc(l.key)}">Quitar</button>
          </div>
        </div>
        <p class="line__price">${eur(p.price * l.qty)}</p>
      </li>`;
    }).join("");
    $("[data-lead-note]").textContent = n && leadDays() > 1
      ? "Las tartas enteras necesitan 48 horas: recogida a partir de pasado mañana."
      : n ? "Recogida a partir de mañana." : "";
    if (n > 0) { mbar.hidden = false; requestAnimationFrame(() => mbar.classList.add("is-on")); }
    else mbar.classList.remove("is-on");
    if (n === 0 && !$("[data-step=checkout]").hidden) showStep("list");
  };
  $("[data-lines]").addEventListener("click", (e) => {
    const t = e.target.closest("button"); if (!t) return;
    const line = (k) => cart.find((l) => l.key === k);
    if (t.dataset.inc) setQty(t.dataset.inc, line(t.dataset.inc).qty + 1);
    if (t.dataset.dec) setQty(t.dataset.dec, line(t.dataset.dec).qty - 1);
    if (t.dataset.rm) setQty(t.dataset.rm, 0);
  });

  /* ---------- Carrito: abrir y cerrar ---------- */
  const main = $("main");
  let lastFocus = null;
  const setCart = (open) => {
    if (open === cartEl.classList.contains("is-open")) return;
    if (open) {
      lastFocus = document.activeElement;
      scrim.hidden = false; requestAnimationFrame(() => scrim.classList.add("is-on"));
      cartEl.classList.add("is-open"); cartEl.setAttribute("aria-hidden", "false");
      root.classList.add("cart-open");
      main.inert = true; $("#nav").inert = true;
      setTimeout(() => $(".cart__x").focus({ preventScroll: true }), 200);
    } else {
      scrim.classList.remove("is-on"); setTimeout(() => { scrim.hidden = true; }, 400);
      cartEl.classList.remove("is-open"); cartEl.setAttribute("aria-hidden", "true");
      root.classList.remove("cart-open");
      main.inert = false; $("#nav").inert = false;
      if (!$("[data-step=done]").hidden) showStep("list");
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    }
    $$("[data-open-cart]").forEach((b) => b.setAttribute("aria-expanded", String(open)));
  };
  $$("[data-open-cart]").forEach((b) => b.addEventListener("click", () => setCart(true)));
  document.addEventListener("click", (e) => { if (e.target.closest("[data-close-cart]")) setCart(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && cartEl.classList.contains("is-open")) setCart(false); });

  const titles = { list: "Tu pedido", checkout: "Recogida", done: "Enviar pedido" };
  const showStep = (step) => {
    $$(".cart__step", cartEl).forEach((s) => { s.hidden = s.dataset.step !== step; });
    $("[data-cart-title]").textContent = titles[step];
    if (step === "checkout") prepareCheckout();
  };
  $("[data-to-checkout]").addEventListener("click", () => { showStep("checkout"); setTimeout(() => $("#f-name").focus(), 50); });
  $("[data-to-list]").addEventListener("click", () => showStep("list"));

  /* ---------- Recogida: día y hora ---------- */
  const dayIn = $("#f-day");
  const timeIn = $("#f-time");
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const fmtDay = (d) => `${d.toLocaleDateString("es-ES", { weekday: "long" })} ${d.getDate()} de ${d.toLocaleDateString("es-ES", { month: "long" })}`;
  const fillTimes = () => {
    const prev = timeIn.value;
    if (!dayIn.value) { timeIn.innerHTML = `<option value="">Elige antes el día</option>`; return; }
    const [o, c] = HOURS[parse(dayIn.value).getDay()];
    const opts = [];
    for (let m = o * 60 + 30; m <= c * 60 - 30; m += 30) {
      const t = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
      opts.push(`<option${t === prev ? " selected" : ""}>${t}</option>`);
    }
    timeIn.innerHTML = `<option value="">Hora</option>` + opts.join("");
    $("[data-day-hint]").textContent = parse(dayIn.value).getDay() === 1 ? "Los lunes cerramos a las 14:00." : "";
  };
  const prepareCheckout = () => {
    const min = new Date(); min.setHours(0, 0, 0, 0); min.setDate(min.getDate() + leadDays());
    const max = new Date(min); max.setDate(max.getDate() + 30);
    dayIn.min = iso(min); dayIn.max = iso(max);
    if (!dayIn.value || dayIn.value < dayIn.min) dayIn.value = iso(min);
    fillTimes();
  };
  dayIn.addEventListener("change", fillTimes);

  /* ---------- Enviar ---------- */
  const form = $(".checkout");
  const checks = {
    name: () => $("#f-name").value.trim().length > 1,
    tel: () => $("#f-tel").value.replace(/\D/g, "").length >= 9,
    day: () => !!dayIn.value && dayIn.value >= dayIn.min && dayIn.value <= dayIn.max,
    time: () => !!timeIn.value,
  };
  const validate = () => {
    let first = null;
    Object.entries(checks).forEach(([k, ok]) => {
      const field = $(`[data-err="${k}"]`).closest(".field");
      const good = ok();
      field.classList.toggle("is-bad", !good);
      form.elements[k].setAttribute("aria-invalid", String(!good));
      if (!good && !first) first = form.elements[k];
    });
    if (first) first.focus();
    return !first;
  };
  form.addEventListener("input", (e) => { const f = e.target.closest(".field"); if (f && f.classList.contains("is-bad")) validate(); });
  /* Paso 3: el mensaje de WhatsApp, ya escrito. El pedido no se da por enviado hasta que el cliente pulsa el botón. */
  const done = $("[data-step=done]");
  const waBtn = $("[data-wa]");
  const demo = !/^\d{8,15}$/.test(CONFIG.whatsapp);
  const setSent = (sent) => {
    done.classList.toggle("is-sent", sent);
    $("[data-done-title]").textContent = sent ? "¡Gracias!" : "Último paso";
    $("[data-done-text]").textContent = sent
      ? "En cuanto nos llegue tu mensaje te confirmamos el pedido por WhatsApp. Lo pagas al recogerlo."
      : "Te abrimos WhatsApp con el pedido ya escrito. Solo tienes que darle a enviar.";
    $("span", waBtn).textContent = sent ? "Volver a abrir WhatsApp" : "Enviar por WhatsApp";
    waBtn.classList.toggle("btn--dark", !sent);
    waBtn.classList.toggle("btn--line", sent);
    $("[data-done-close] span").textContent = sent ? "Cerrar" : "Seguir mirando";
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!cart.length || !validate()) return;
    const when = `${fmtDay(parse(dayIn.value))} a las ${timeIn.value}`;
    const notes = $("#f-notes").value.trim();
    const text = [
      "¡Hola, Meraki! Quiero hacer este pedido para recoger:", "",
      ...cart.map((l) => `• ${l.qty} × ${byId[l.id].name}${l.variant ? " (" + l.variant + ")" : ""}: ${eur(byId[l.id].price * l.qty)}`),
      "", `Total: ${eur(total())}`,
      `Recogida: ${when}`,
      `A nombre de: ${$("#f-name").value.trim()} (${$("#f-tel").value.trim()})`,
      ...(notes ? [`Notas: ${notes}`] : []),
    ].join("\n");
    $("[data-preview]").textContent = text;
    waBtn.href = demo ? "#" : `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
    $("[data-demo]").hidden = !demo;
    setSent(false);
    showStep("done");
    setTimeout(() => waBtn.focus({ preventScroll: true }), 50);
  });
  waBtn.addEventListener("click", (e) => {
    if (demo) e.preventDefault();
    if (done.classList.contains("is-sent")) return;
    cart = []; save();
    form.reset();
    renderCart();
    setSent(true);
  });

  /* ---------- Menú a pantalla completa (igual que en la portada) ---------- */
  const burger = $(".burger");
  const menu = $("#menu");
  menu.inert = true;
  const setMenu = (open) => {
    root.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    $(".burger__label", burger).textContent = open ? "Cerrar" : "Menú";
    menu.setAttribute("aria-hidden", String(!open));
    menu.inert = !open;
    document.body.style.overflow = open ? "hidden" : "";
    if (open) setTimeout(() => $("a", menu).focus({ preventScroll: true }), 450);
  };
  burger.addEventListener("click", () => setMenu(!root.classList.contains("menu-open")));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && root.classList.contains("menu-open")) { setMenu(false); burger.focus(); } });

  /* ---------- Arranque ---------- */
  renderFilters();
  renderGrid();
  renderCart();
  if (location.hash === "#pedido" && cart.length) setCart(true);
  if (reduce) $$(".spin").forEach((s) => s.classList.remove("spin"));
})();
