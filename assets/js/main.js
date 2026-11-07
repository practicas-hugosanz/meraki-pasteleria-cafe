(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = () => window.matchMedia("(max-width: 899px)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Contador del carrito de la tienda ---------- */
  try {
    const cart = JSON.parse(localStorage.getItem("meraki-cart-v1") || "[]");
    const n = cart.reduce((s, l) => s + (l.qty || 0), 0);
    const badge = $("[data-cart-count]");
    if (badge && n > 0) { badge.textContent = n; badge.hidden = false; }
  } catch (err) { /* sin almacenamiento: sin contador */ }

  /* ---------- Vídeos del hero ---------- */
  const vids = $$(".hero__panel video");
  const loadVideos = () => {
    vids.forEach((v) => {
      const panel = v.parentElement;
      if (getComputedStyle(panel).display === "none") return;
      const src = isMobile() && v.dataset.mobile ? v.dataset.mobile : v.dataset.src;
      if (!src || v.dataset.loaded === src) return;
      v.dataset.loaded = src;
      v.src = src;
      if (!reduce) v.play().catch(() => {});
    });
  };
  loadVideos();
  window.addEventListener("resize", () => { clearTimeout(loadVideos.t); loadVideos.t = setTimeout(loadVideos, 300); });
  if ("IntersectionObserver" in window && !reduce) {
    new IntersectionObserver(([en]) => vids.forEach((v) => { if (!v.src) return; en.isIntersecting ? v.play().catch(() => {}) : v.pause(); }))
      .observe($(".hero"));
  }

  /* ---------- Día de hoy en el horario (hora de Alicante) ---------- */
  const madrid = () => {
    const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
    const g = (t) => p.find((x) => x.type === t).value;
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday"));
    return { day, h: +g("hour") + +g("minute") / 60 };
  };
  try {
    const { day } = madrid();
    $$(".hours [data-days]").forEach((r) => { if (r.dataset.days.split(",").includes(String(day))) r.classList.add("is-today"); });
  } catch (err) { /* se queda el texto por defecto */ }

  /* ---------- Menú a pantalla completa ---------- */
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

  /* ---------- Carta ---------- */
  const carta = $(".carta");
  const tabs = $$(".tab");
  const panels = $$(".panel");
  const keys = tabs.map((t) => t.dataset.tab);
  const select = (key, focus) => {
    tabs.forEach((t) => {
      const on = t.dataset.tab === key;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
      if (on) { const bar = t.parentElement; bar.scrollTo({ left: t.offsetLeft - bar.clientWidth / 2 + t.clientWidth / 2, behavior: reduce ? "auto" : "smooth" }); }
    });
    let shown;
    panels.forEach((p) => { const on = p.id === "panel-" + key; p.hidden = !on; if (on) shown = p; });
    carta.className = carta.className.replace(/\bt-\w+/g, "").trim() + " t-" + key;
    if (hasGsap && !reduce && shown) {
      gsap.fromTo($$(".disc", shown), { scale: 0.6, opacity: 0, rotate: -12 }, { scale: 1, opacity: 1, rotate: 0, duration: 0.9, stagger: 0.08, ease: "back.out(1.4)" });
      gsap.fromTo([$(".panel__title", shown), ...$$(".group__title, .item", shown)], { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.022, ease: "power3.out" });
    }
    if (hasGsap) ScrollTrigger.refresh();
  };
  tabs.forEach((t) => {
    t.addEventListener("click", () => select(t.dataset.tab));
    t.addEventListener("keydown", (e) => {
      const i = keys.indexOf(t.dataset.tab);
      const map = { ArrowRight: (i + 1) % keys.length, ArrowLeft: (i - 1 + keys.length) % keys.length, Home: 0, End: keys.length - 1 };
      if (e.key in map) { e.preventDefault(); select(keys[map[e.key]], true); }
    });
  });
  const fromHash = () => { const m = location.hash.match(/^#carta-(\w+)$/); if (m && keys.includes(m[1])) { select(m[1]); $("#carta").scrollIntoView(); } };
  window.addEventListener("hashchange", fromHash);
  fromHash();

  /* ---------- Carrusel 3D ---------- */
  const c3d = $(".c3d");
  const ring = $(".c3d__ring");
  const cards = $$(".c3d__card");
  const nowName = $("[data-now]");
  const N = cards.length;
  const STEP = 360 / N;
  let rot = 0, vel = 0, dragging = false, lastX = 0, R = 500, front = -1, visible = false, snapping = null;
  const layout = () => {
    const w = cards[0].getBoundingClientRect().width || 240;
    R = Math.round((w / 2) / Math.tan(Math.PI / N) * 1.12);
    cards.forEach((c, i) => { c.style.transform = `rotateY(${i * STEP}deg) translateZ(${R}px)`; });
  };
  const render = () => {
    ring.style.transform = `translateZ(${-R}px) rotateY(${rot}deg)`;
    const f = ((Math.round(-rot / STEP) % N) + N) % N;
    cards.forEach((c, i) => {
      let a = ((i * STEP + rot) % 360 + 540) % 360 - 180;
      const k = Math.cos(a * Math.PI / 180);
      c.style.opacity = String(Math.max(0.08, 0.35 + 0.65 * k));
    });
    if (f !== front) {
      front = f;
      cards.forEach((c, i) => c.classList.toggle("is-front", i === f));
      nowName.textContent = cards[f].dataset.name;
    }
  };
  const snapTo = (target) => {
    if (!hasGsap) { rot = target; render(); return; }
    if (snapping) snapping.kill();
    const o = { r: rot };
    snapping = gsap.to(o, { r: target, duration: 0.9, ease: "power3.out", onUpdate: () => { rot = o.r; render(); }, onComplete: () => { snapping = null; } });
  };
  const nearest = () => Math.round(rot / STEP) * STEP;
  layout(); render();
  window.addEventListener("resize", () => { layout(); render(); });
  c3d.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; vel = 0; if (snapping) snapping.kill(); c3d.classList.add("is-drag"); c3d.setPointerCapture(e.pointerId); });
  c3d.addEventListener("pointermove", (e) => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; rot += dx * 0.22; vel = dx * 0.22; render(); });
  const end = () => { if (!dragging) return; dragging = false; c3d.classList.remove("is-drag"); snapTo(Math.round((rot + vel * 8) / STEP) * STEP); };
  c3d.addEventListener("pointerup", end);
  c3d.addEventListener("pointercancel", end);
  $$(".cbtn").forEach((b) => b.addEventListener("click", () => snapTo(nearest() - +b.dataset.dir * STEP)));
  c3d.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") { e.preventDefault(); snapTo(nearest() - STEP); } if (e.key === "ArrowLeft") { e.preventDefault(); snapTo(nearest() + STEP); } });
  if ("IntersectionObserver" in window) new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(c3d);
  if (!reduce) {
    let idle = 0;
    const tick = (t, dt) => {
      if (!visible || dragging || snapping) { idle = 0; return; }
      idle += dt;
      if (idle > 2600) { snapTo(nearest() - STEP); idle = 0; }
    };
    if (hasGsap) gsap.ticker.add(tick);
  }

  /* ---------- Sin GSAP: todo visible y listo ---------- */
  root.classList.add("is-ready");
  if (!hasGsap) return;

  /* ---------- Entrada del hero ---------- */
  const script = $(".hero__script");
  if (!reduce) {
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    tl.from(".hero__panel", { yPercent: 18, opacity: 0, duration: 1.6, stagger: 0.12, ease: "expo.out" }, 0)
      .from(".hero__kicker", { y: 20, opacity: 0, duration: 1 }, 0.35)
      .fromTo(script, { clipPath: "inset(-30% 100% -30% -10%)" }, { clipPath: "inset(-30% -10% -30% -10%)", duration: 2.2, ease: "power2.inOut" }, 0.45)
      .from(".hero__lead", { y: 24, opacity: 0, duration: 1 }, 1.5)
      .from(".hero__actions > *", { y: 24, opacity: 0, duration: 0.9, stagger: 0.1 }, 1.65)
      .from(".nav__bar > *", { y: -20, opacity: 0, duration: 0.9, stagger: 0.1 }, 1.2);

    // Al bajar, los tres paneles se separan y el texto se va
    gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 } })
      .to(".hp-a", { yPercent: -14, ease: "none" }, 0)
      .to(".hp-c", { yPercent: -22, ease: "none" }, 0)
      .to(".hp-b", { yPercent: 8, ease: "none" }, 0)
      .to(".hero__content", { yPercent: 28, opacity: 0, ease: "none" }, 0)
      .to(".hero__shade", { opacity: 1.4, ease: "none" }, 0);
  }

  /* ---------- Nav sólida fuera del hero ---------- */
  ScrollTrigger.create({ trigger: ".hero", start: "bottom top+=90", onEnter: () => $("#nav").classList.add("is-solid"), onLeaveBack: () => $("#nav").classList.remove("is-solid") });

  if (reduce) return;

  /* ---------- Apariciones ---------- */
  gsap.set(".rv", { y: 40, opacity: 0 });
  ScrollTrigger.batch(".rv", { start: "top 88%", once: true, onEnter: (b) => gsap.to(b, { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: "power3.out" }) });
  $$(".h2, .vitrina__title, .carta__title").forEach((h) => gsap.from(h, { y: 60, opacity: 0, duration: 1.2, ease: "power4.out", scrollTrigger: { trigger: h, start: "top 88%", once: true } }));

  /* Frases que se "encienden" palabra a palabra */
  $$("[data-words]").forEach((el) => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(" ");
    gsap.fromTo($$(".w", el), { opacity: 0.14 }, { opacity: 1, stagger: 0.12, ease: "none", scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 50%", scrub: true } });
  });

  /* Contadores */
  $$("[data-count]").forEach((el) => {
    const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.8, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 90%", once: true },
      onUpdate: () => { el.textContent = o.v.toLocaleString("es-ES", { minimumFractionDigits: dec, maximumFractionDigits: dec }); } });
  });

  /* El local: las fotos se destapan de abajo arriba */
  $$(".local img").forEach((img) => gsap.from(img, { clipPath: "inset(100% 0 0 0 round 28px)", duration: 1.5, ease: "expo.out", scrollTrigger: { trigger: img, start: "top 85%", once: true } }));

  /* ---------- Vitrina: scroll horizontal ---------- */
  const mm = gsap.matchMedia();
  mm.add("(min-width: 900px)", () => {
    const track = $(".vitrina__track");
    const dist = () => track.scrollWidth - window.innerWidth;
    const tween = gsap.to(track, {
      x: () => -dist(), ease: "none",
      scrollTrigger: { trigger: ".vitrina", pin: ".vitrina__pin", start: "top top", end: () => "+=" + dist(), scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: (s) => gsap.set(".vitrina__bar i", { scaleX: s.progress }) },
    });
    $$(".vcard").forEach((card) => {
      gsap.fromTo($(".vcard__img img", card), { xPercent: -5 }, { xPercent: 5, ease: "none", scrollTrigger: { trigger: card, containerAnimation: tween, start: "left right", end: "right left", scrub: true } });
      gsap.from(card, { y: 80, rotate: 3, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: card, containerAnimation: tween, start: "left 92%", once: true } });
    });
  });
  mm.add("(max-width: 899px)", () => {
    gsap.from(".vcard", { y: 50, opacity: 0, duration: 1, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: ".vitrina__list", start: "top 85%", once: true } });
  });

  /* ---------- Carrusel: entrada ---------- */
  // La entrada va en un envoltorio aparte: el aro lo mueve render() y no debe llevar opacity (aplana el 3D)
  gsap.timeline({ scrollTrigger: { trigger: c3d, start: "top 80%", once: true } })
    .from(".c3d__tilt", { rotateX: -18, scale: 0.8, duration: 1.6, ease: "expo.out" }, 0)
    .from(c3d, { opacity: 0, duration: 0.8, ease: "power1.out" }, 0);

  /* ---------- Carta: los círculos entran uno a uno ---------- */
  gsap.from(".tab", { y: 40, opacity: 0, duration: 0.9, stagger: 0.07, ease: "back.out(1.6)", scrollTrigger: { trigger: ".tabs", start: "top 88%", once: true } });

  /* ---------- Opiniones ---------- */
  ScrollTrigger.batch(".rec", { start: "top 88%", once: true, onEnter: (els) => {
    gsap.from(els, { y: 90, opacity: 0, duration: 1.2, stagger: 0.14, ease: "expo.out" });
    gsap.from(els.map((el) => el.querySelector(".rec__pic")), { scale: 0.5, rotate: -40, duration: 1.4, stagger: 0.14, ease: "back.out(1.6)" });
  } });
  gsap.from(".stars > *", { scale: 0, rotate: -90, duration: 0.7, stagger: 0.08, ease: "back.out(2)", scrollTrigger: { trigger: ".stars", start: "top 90%", once: true } });

  /* ---------- Visítanos ---------- */
  gsap.from(".visita__map", { scale: 0.8, opacity: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".visita__map", start: "top 80%", once: true } });

  /* ---------- Footer: el nombre sube desde abajo ---------- */
  gsap.from(".foot__word", { yPercent: 25, ease: "none", scrollTrigger: { trigger: ".foot", start: "top bottom", end: "bottom bottom", scrub: true } });

  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
