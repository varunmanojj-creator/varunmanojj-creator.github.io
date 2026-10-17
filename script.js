(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  $("#year").textContent = new Date().getFullYear();

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const motion = hasGsap && !reduce;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  // The Vm intro only plays when animation is available
  const loader = $(".loader");
  if (!motion) loader.remove();

  // ---------- Smooth scroll ----------
  let lenis = null;
  if (motion && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // ---------- Mobile menu ----------
  const menuBtn = $(".nav-menu");
  const menu = $("#menu");
  const setMenu = open => {
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", open);
    menuBtn.textContent = open ? "Close" : "Menu";
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open && motion) gsap.from($$("a", menu), { yPercent: 50, opacity: 0, duration: 0.9, stagger: 0.05, ease: "expo.out" });
  };
  menuBtn.addEventListener("click", () => setMenu(menu.hidden));
  addEventListener("keydown", e => { if (e.key === "Escape" && !menu.hidden) setMenu(false); });

  // ---------- Anchor links ----------
  $$("[data-link]").forEach(a => a.addEventListener("click", e => {
    const id = a.getAttribute("href");
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    if (!menu.hidden) setMenu(false);
    if (lenis) lenis.scrollTo(id === "#top" ? 0 : target, { duration: 1.6 });
    else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  }));

  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const pad = n => String(n).padStart(2, "0");

  // ---------- Image viewer: opens any set of images that share a data-group ----------
  const works = $$(".work");
  const viewer = $(".viewer");
  const vImg = $(".viewer-img");
  const vCount = $(".viewer-count");
  let list = [];
  let current = 0;
  const showItem = i => {
    current = (i + list.length) % list.length;
    const img = list[current];
    vImg.src = img.currentSrc || img.src;
    vImg.alt = img.alt;
    vCount.textContent = `${pad(current + 1)} / ${pad(list.length)}`;
    if (motion) gsap.fromTo(vImg, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.8, ease: "expo.out" });
  };
  const openGroup = (group, i = 0) => {
    list = $$(`img[data-group="${group}"]`);
    if (!list.length) return;
    viewer.showModal();
    showItem(i);
    if (lenis) lenis.stop();
  };
  const openImg = img => openGroup(img.dataset.group, $$(`img[data-group="${img.dataset.group}"]`).indexOf(img));
  $(".viewer-prev").addEventListener("click", () => showItem(current - 1));
  $(".viewer-next").addEventListener("click", () => showItem(current + 1));
  $(".viewer-close").addEventListener("click", () => viewer.close());
  vImg.addEventListener("click", () => showItem(current + 1));
  viewer.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") showItem(current - 1);
    if (e.key === "ArrowRight") showItem(current + 1);
  });
  viewer.addEventListener("close", () => { if (lenis) lenis.start(); });

  // Single images that open the viewer
  $$(".work, .shot, .card, .scan, .about-photo").forEach(el => {
    el.addEventListener("click", () => openImg($("img", el)));
  });
  // Make clickable figures reachable by keyboard
  $$("figure[data-cursor], .orbit, .neon, .scan").forEach(el => {
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.click(); } });
  });

  // Run a callback on a timer only while an element is on screen
  const whileVisible = (el, ms, fn) => {
    let timer = null;
    new IntersectionObserver(([entry]) => {
      clearInterval(timer);
      if (entry.isIntersecting) timer = setInterval(fn, ms);
    }, { threshold: 0.4 }).observe(el);
  };

  // ---------- 3D · 01 Orbit: move across the image to turn the camera ----------
  const orbit = $(".orbit");
  const orbitImgs = $$("img", orbit);
  const orbitTicks = $$(".orbit-ticks button");
  let orbitIndex = 0;
  let orbitHeld = false; // stops autoplay once someone takes control
  const setOrbit = i => {
    i = (i + orbitImgs.length) % orbitImgs.length;
    if (i === orbitIndex) return;
    orbitIndex = i;
    orbitImgs.forEach((im, j) => im.classList.toggle("is-on", j === i));
    orbitTicks.forEach((t, j) => { t.classList.toggle("is-on", j === i); t.setAttribute("aria-pressed", j === i); });
  };
  orbitTicks.forEach((t, i) => t.addEventListener("click", () => { orbitHeld = true; setOrbit(i); }));
  let swipeX = null;
  let swiped = false;
  orbit.addEventListener("pointerdown", e => { swipeX = e.clientX; swiped = false; });
  orbit.addEventListener("pointermove", e => {
    const r = orbit.getBoundingClientRect();
    if (e.pointerType === "mouse") {
      orbitHeld = true;
      setOrbit(Math.min(orbitImgs.length - 1, Math.floor((e.clientX - r.left) / r.width * orbitImgs.length)));
    } else if (swipeX !== null && Math.abs(e.clientX - swipeX) > 36) {
      orbitHeld = true;
      swiped = true;
      setOrbit(orbitIndex + (e.clientX < swipeX ? 1 : -1));
      swipeX = e.clientX;
    }
  });
  ["pointerup", "pointercancel"].forEach(t => orbit.addEventListener(t, () => { swipeX = null; }));
  orbit.addEventListener("click", () => { if (!swiped) openGroup("tower", orbitIndex); });
  if (!reduce) whileVisible(orbit, 2200, () => { if (!orbitHeld) setOrbit(orbitIndex + 1); });

  // ---------- 3D · 03 Spotlight: the cursor lights the room ----------
  const neon = $(".neon");
  const neonBase = $(".neon-base");
  const neonLit = $(".neon-lit");
  const neonNext = $(".neon-next");
  const neonScan = $(".neon-scan");
  const neonThumbs = $$(".neon-thumbs button");
  let neonIndex = 0;
  let neonBusy = false;
  let neonHeld = false;
  const setNeon = i => {
    i = (i + neonThumbs.length) % neonThumbs.length;
    if (i === neonIndex || neonBusy) return;
    const img = $("img", neonThumbs[i]);
    const src = img.getAttribute("src");
    neonIndex = i;
    neonThumbs.forEach((b, j) => b.classList.toggle("is-on", j === i));
    const settle = () => { neonBase.src = src; neonLit.src = src; neonLit.alt = img.alt; };
    if (!motion) { settle(); return; }
    neonBusy = true;
    neonNext.src = src;
    const ready = neonNext.decode ? neonNext.decode().catch(() => {}) : Promise.resolve();
    ready.then(() => {
      gsap.timeline({
        onComplete: () => {
          settle();
          // The incoming frame is fully lit; fade it back into the spotlight
          gsap.to(neonNext, { opacity: 0, duration: 0.8, ease: "power2.out", onComplete: () => {
            gsap.set(neonNext, { clipPath: "inset(0% 100% 0% 0%)", opacity: 1 });
            neonBusy = false;
          } });
        }
      })
        .set(neonScan, { left: "0%", opacity: 1 })
        .fromTo(neonNext, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "power3.inOut" }, 0)
        .fromTo(neonScan, { left: "0%" }, { left: "100%", duration: 1.1, ease: "power3.inOut" }, 0)
        .to(neonScan, { opacity: 0, duration: 0.2 });
    });
  };
  neonThumbs.forEach((b, i) => b.addEventListener("click", () => { neonHeld = true; setNeon(i); }));
  neon.addEventListener("click", () => openGroup("blahbla", neonIndex));
  if (fine && motion) {
    const spot = { x: 0, y: 0 };
    const paint = () => { neon.style.setProperty("--mx", spot.x + "px"); neon.style.setProperty("--my", spot.y + "px"); };
    const sx = gsap.quickTo(spot, "x", { duration: 0.5, ease: "power3", onUpdate: paint });
    const sy = gsap.quickTo(spot, "y", { duration: 0.5, ease: "power3", onUpdate: paint });
    neon.addEventListener("pointerenter", e => {
      const r = neon.getBoundingClientRect();
      spot.x = r.width / 2; spot.y = r.height / 2; paint();
      neonHeld = true;
      gsap.to(neon, { "--r": "16vw", duration: 0.6, ease: "expo.out" });
    });
    neon.addEventListener("pointermove", e => {
      const r = neon.getBoundingClientRect();
      sx(e.clientX - r.left);
      sy(e.clientY - r.top);
    });
    neon.addEventListener("pointerleave", () => {
      sx(neon.offsetWidth / 2);
      sy(neon.offsetHeight / 2);
      gsap.to(neon, { "--r": "26vw", duration: 0.8, ease: "expo.out" });
      neonHeld = false;
    });
  }
  if (!reduce) whileVisible(neon, 4200, () => { if (!neonHeld) setNeon(neonIndex + 1); });

  // ---------- 3D · 05 Scan: a loupe to look closer ----------
  const scan = $(".scan");
  const loupe = $(".loupe");
  const scanImg = $("img", scan);
  if (fine) {
    const zoom = 2.4;
    scan.addEventListener("pointerenter", () => {
      loupe.style.backgroundImage = `url("${scanImg.currentSrc || scanImg.src}")`;
      scan.classList.add("is-zoom");
    });
    scan.addEventListener("pointerleave", () => scan.classList.remove("is-zoom"));
    scan.addEventListener("pointermove", e => {
      const r = scan.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const half = loupe.offsetWidth / 2;
      loupe.style.left = x + "px";
      loupe.style.top = y + "px";
      loupe.style.backgroundSize = `${r.width * zoom}px ${r.height * zoom}px`;
      loupe.style.backgroundPosition = `${half - x * zoom}px ${half - y * zoom}px`;
    });
  }

  // ---------- Showreel: load the player only when asked ----------
  $(".reel-poster").addEventListener("click", () => {
    const frame = $(".reel-frame");
    frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${frame.dataset.id}?autoplay=1&rel=0&modestbranding=1"
      title="Solitude, short film" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  });

  if (!hasGsap) return;

  // Page turns dark for the films (computed last, after the pinned scenes above it)
  ScrollTrigger.create({
    trigger: "#films", start: "top 55%", end: "bottom 45%", refreshPriority: -1,
    toggleClass: { targets: document.body, className: "dark" }
  });

  if (!motion) return;

  // ---------- Film preview that follows the cursor ----------
  const films = $$(".film");
  const preview = $(".film-preview");
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    films.forEach(f => {
      const img = $(".film-thumb img", f).cloneNode();
      img.removeAttribute("loading");
      preview.appendChild(img);
    });
    const previewImgs = $$("img", preview);
    gsap.set(preview, { xPercent: -50, yPercent: -50, scale: 0.85 });
    const xTo = gsap.quickTo(preview, "x", { duration: 0.7, ease: "power3" });
    const yTo = gsap.quickTo(preview, "y", { duration: 0.7, ease: "power3" });
    // Track which film is under the cursor. Re-checked on scroll too, because rows
    // move under a still mouse and the browser fires no mouseleave for that.
    let mouse = null;
    let active = -1;
    const setActive = i => {
      if (i === active) return;
      active = i;
      if (i < 0) {
        gsap.to(preview, { opacity: 0, scale: 0.85, duration: 0.4, ease: "power2.out", overwrite: "auto" });
        return;
      }
      previewImgs.forEach((im, j) => im.classList.toggle("on", i === j));
      gsap.to(preview, { opacity: 1, scale: 1, duration: 0.6, ease: "expo.out", overwrite: "auto" });
    };
    const check = () => {
      if (!mouse) return;
      const hit = document.elementFromPoint(mouse.x, mouse.y);
      const film = hit && hit.closest(".film");
      setActive(film ? films.indexOf(film) : -1);
    };
    addEventListener("mousemove", e => {
      mouse = { x: e.clientX, y: e.clientY };
      xTo(e.clientX);
      yTo(e.clientY);
      check();
    }, { passive: true });
    addEventListener("scroll", check, { passive: true });
    document.documentElement.addEventListener("mouseleave", () => setActive(-1));

    // Cursor label: a small disc that names what a click will do
    const cursor = $(".cursor");
    const cursorText = $("span", cursor);
    const cx = gsap.quickTo(cursor, "x", { duration: 0.45, ease: "power3" });
    const cy = gsap.quickTo(cursor, "y", { duration: 0.45, ease: "power3" });
    let label = "";
    const updateCursor = () => {
      if (!mouse) return;
      const hit = document.elementFromPoint(mouse.x, mouse.y);
      const target = hit && hit.closest("[data-cursor]");
      const next = target && !viewer.open ? target.dataset.cursor : "";
      if (next === label) return;
      label = next;
      if (next) cursorText.textContent = next;
      gsap.to(cursor, { scale: next ? 1 : 0, duration: 0.45, ease: "expo.out", overwrite: "auto" });
    };
    addEventListener("mousemove", e => { cx(e.clientX); cy(e.clientY); updateCursor(); }, { passive: true });
    addEventListener("scroll", updateCursor, { passive: true });
    viewer.addEventListener("close", updateCursor);
    document.documentElement.addEventListener("mouseleave", () => { label = ""; gsap.to(cursor, { scale: 0, duration: 0.3 }); });

    // Tilt: artworks and stand renders lean towards the cursor
    const tilt = (el, inner, max) => {
      gsap.set(inner, { transformPerspective: 900 });
      const rx = gsap.quickTo(inner, "rotationX", { duration: 0.6, ease: "power3" });
      const ry = gsap.quickTo(inner, "rotationY", { duration: 0.6, ease: "power3" });
      el.addEventListener("pointermove", e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        ry((px - 0.5) * max);
        rx(-(py - 0.5) * max);
        inner.style.setProperty("--gx", px * 100 + "%");
        inner.style.setProperty("--gy", py * 100 + "%");
      });
      el.addEventListener("pointerleave", () => { rx(0); ry(0); });
    };
    works.forEach(w => tilt(w, $(".work-media", w), 14));
    $$(".card").forEach(c => tilt(c, $(".card-in", c), 16));
    $$(".shot").forEach(s => tilt(s, s, 8));
    const photo = $(".about-photo");
    tilt(photo, photo, 8);
  }

  // ---------- Text splitting ----------
  const splitWords = el => {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const outer = document.createElement("span");
            const inner = document.createElement("span");
            outer.className = "w";
            inner.textContent = part;
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== "BR") {
          walk(n);
        }
      });
    };
    walk(el);
    return $$(".w > span", el);
  };
  const splitChars = el => {
    const chars = [...el.textContent].map(ch => {
      const s = document.createElement("span");
      s.textContent = ch;
      s.style.display = "inline-block";
      return s;
    });
    el.textContent = "";
    chars.forEach(c => el.appendChild(c));
    el.style.overflow = "hidden";
    el.style.padding = ".08em .02em .16em";
    el.style.margin = "-.08em -.02em -.16em";
    return chars;
  };

  const heroChars = $$(".hn").flatMap(splitChars);
  const scrubWords = splitWords($("[data-scrub]"));
  const splitHeads = $$("[data-split]").map(el => {
    el.setAttribute("aria-label", el.textContent.trim());
    const words = splitWords(el);
    $$(".w", el).forEach(w => w.setAttribute("aria-hidden", "true"));
    return { el, words };
  });

  // ---------- Intro: the Vm signature writes in, the curtain lifts, the photo and name arrive ----------
  if (lenis) lenis.stop();
  const logo = $(".loader-logo");
  gsap.timeline({
    defaults: { ease: "expo.out" },
    onComplete: () => { loader.remove(); if (lenis) lenis.start(); }
  })
    .fromTo(logo, { clipPath: "inset(-10% 100% -10% 0%)", y: 6 }, { clipPath: "inset(-10% 0% -10% 0%)", y: 0, duration: 1.5, ease: "power2.inOut" })
    .to(logo, { scale: 0.92, opacity: 0, duration: 0.5, ease: "power2.in" }, "+=0.35")
    .to(loader, { yPercent: -100, duration: 1.1, ease: "expo.inOut" }, "-=0.2")
    .from(".hero-frame-in", { scale: 1.35, opacity: 0, duration: 2 }, "-=0.55")
    .from(heroChars, { yPercent: 115, duration: 1.5, stagger: 0.045 }, "<0.1")
    .from([".nav", ".hero-foot"], { opacity: 0, y: 10, duration: 1.2, stagger: 0.1 }, "<0.5");

  // ---------- Scroll scenes ----------
  const mm = gsap.matchMedia();
  mm.add({ mobile: "(max-width: 760px)", desktop: "(min-width: 761px)" }, ctx => {
    const { mobile } = ctx.conditions;

    // Hero: a window framed on Varun opens to the full photo while the name parts.
    // The window is placed on his head and upper body, wherever "cover" puts them.
    const frame = $(".hero-frame");
    const heroImg = $(".hero-frame img");
    const startClip = () => {
      const W = frame.offsetWidth;
      const H = frame.offsetHeight;
      const ratio = (heroImg.naturalWidth / heroImg.naturalHeight) || 1454 / 671;
      const zoom = 1.15; // matches the starting scale in CSS
      let iw = W, ih = W / ratio;
      if (ih < H) { ih = H; iw = H * ratio; }
      const ox = (W - iw) * 0.48;   // object-position x
      const oy = (H - ih) * 0.35;   // object-position y
      const toX = f => W / 2 + (ox + f * iw - W / 2) * zoom;
      const toY = f => H / 2 + (oy + f * ih - H / 2) * zoom;
      // Head to waist sits at about 3%–62% of the photo's height, centred at 49% across
      let h = (toY(0.62) - toY(0.03));
      let w = h * 0.78;
      const maxW = W * (mobile ? 0.62 : 0.34);
      if (w > maxW) { w = maxW; h = w / 0.78; }
      const cx = toX(0.49);
      const top = Math.max(0, toY(0.05)); // start just above his head
      const left = Math.max(0, cx - w / 2);
      return `inset(${top}px ${Math.max(0, W - left - w)}px ${Math.max(0, H - top - h)}px ${left}px)`;
    };
    gsap.timeline({
      scrollTrigger: { trigger: ".hero", start: "top top", end: () => "+=" + innerHeight * 1.2, pin: true, scrub: 1, invalidateOnRefresh: true }
    })
      .fromTo(frame, { clipPath: startClip }, { clipPath: "inset(0px 0px 0px 0px)", ease: "none" }, 0)
      .to(".hero-frame img", { scale: 1, ease: "none" }, 0)
      .to(".hn-l", { xPercent: -70, opacity: 0, ease: "none" }, 0)
      .to(".hn-r", { xPercent: 70, opacity: 0, ease: "none" }, 0)
      .to(".hero-foot", { opacity: 0, ease: "none", duration: 0.25 }, 0);

    // Statement: words light up as you read
    gsap.fromTo(scrubWords, { opacity: 0.12 }, {
      opacity: 1, stagger: 0.1, ease: "none",
      scrollTrigger: { trigger: ".statement-text", start: "top 80%", end: "bottom 40%", scrub: true }
    });

    // Headings rise word by word
    splitHeads.forEach(({ el, words }) => gsap.from(words, {
      yPercent: 115, duration: 1.3, stagger: 0.06, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 88%" }
    }));

    // Paragraphs fade up
    $$("[data-fade]").forEach(el => gsap.from(el, {
      opacity: 0, y: 28, duration: 1.2, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 90%" }
    }));
    $$(".label").forEach(el => gsap.from(el, {
      opacity: 0, duration: 1, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 92%" }
    }));

    // Image reveal: a curtain lifts while the picture settles
    const reveal = (box, img, trigger = box) => {
      const st = { trigger, start: "top 88%" };
      gsap.fromTo(box, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "expo.inOut", scrollTrigger: st });
      gsap.fromTo(img, { scale: 1.3 }, { scale: 1, duration: 2, ease: "expo.out", scrollTrigger: st });
    };

    // Deal: items start as one stacked pile at the centre of their container and fan out into place
    const deal = (box, items, rotations, start, end) => {
      const offset = (el, axis) => {
        const d = box.getBoundingClientRect();
        const c = el.getBoundingClientRect();
        return axis === "x"
          ? (d.left + d.width / 2) - (c.left + c.width / 2) - gsap.getProperty(el, "x")
          : (d.top + d.height / 2) - (c.top + c.height / 2) - gsap.getProperty(el, "y");
      };
      gsap.from(items, {
        x: (i, el) => offset(el, "x"),
        y: (i, el) => offset(el, "y") + 40,
        rotation: i => rotations[i % rotations.length],
        scale: 0.84, ease: "power3.out", stagger: 0.04,
        scrollTrigger: { trigger: box, start, end, scrub: 1, invalidateOnRefresh: true }
      });
    };

    // Art: the paintings deal out like the MTM cards
    deal($(".gallery"), works, [-10, -4, 5, 9, -7, 12], "top 85%", mobile ? "top 5%" : "top 20%");
    works.forEach(w => gsap.from($(".work-cap", w), {
      opacity: 0, y: 10, duration: 1, ease: "expo.out",
      scrollTrigger: { trigger: w, start: "top 75%" }
    }));

    // Studio: sideways scroll on desktop, swipe on phones
    if (!mobile) {
      const track = $(".studio-track");
      const shots = $$(".shot");
      const now = $(".studio-now");
      const distance = () => Math.max(0, track.scrollWidth - innerWidth);
      gsap.to(track, {
        x: () => -distance(), ease: "none",
        scrollTrigger: {
          trigger: ".studio", start: "top top", end: () => "+=" + distance(), pin: true, scrub: 1, invalidateOnRefresh: true,
          onUpdate: self => { now.textContent = pad(Math.min(shots.length, Math.floor(self.progress * shots.length) + 1)); }
        }
      });
      shots.forEach(s => gsap.fromTo($("img", s), { scale: 1.2 }, {
        scale: 1, ease: "none",
        scrollTrigger: { trigger: ".studio", start: "top top", end: () => "+=" + distance(), scrub: true }
      }));
    } else {
      $$(".shot").forEach(s => reveal(s, $("img", s)));
    }

    // Production design: wipe from untextured model to final render
    const pairs = $$(".pair");
    const line = $(".compare-line");
    const compareNow = $(".compare-now");
    gsap.set($$(".pair-b"), { clipPath: "inset(0% 100% 0% 0%)" });
    gsap.set(pairs.slice(1), { clipPath: "inset(100% 0% 0% 0%)" });
    const ctl = gsap.timeline({
      scrollTrigger: {
        trigger: ".compare", start: "center center", end: () => "+=" + innerHeight * pairs.length * 0.9,
        pin: true, scrub: 1, invalidateOnRefresh: true,
        onUpdate: self => { compareNow.textContent = pad(Math.min(pairs.length, Math.floor(self.progress * pairs.length) + 1)); }
      }
    });
    pairs.forEach((p, i) => {
      if (i) ctl.to(p, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "power2.inOut" });
      ctl.set(line, { left: "0%", opacity: 1 })
        .to($(".pair-b", p), { clipPath: "inset(0% 0% 0% 0%)", duration: 1, ease: "none" })
        .to(line, { left: "100%", duration: 1, ease: "none" }, "<")
        .set(line, { opacity: 0 })
        .to({}, { duration: 0.35 });
    });

    // ---------- 3D modelling ----------
    $$(".proj-meta").forEach(m => gsap.from(m.children, {
      opacity: 0, y: 16, duration: 1, stagger: 0.06, ease: "expo.out",
      scrollTrigger: { trigger: m, start: "top 90%" }
    }));

    // 01 Orbit: a shutter opens from the centre as you scroll in
    gsap.fromTo(".orbit", { clipPath: "inset(0% 50% 0% 50%)" }, {
      clipPath: "inset(0% 0% 0% 0%)", ease: "power2.out",
      scrollTrigger: { trigger: ".orbit", start: "top 92%", end: "top 35%", scrub: 1 }
    });
    gsap.from(".orbit-ticks button", {
      opacity: 0, y: 12, duration: 0.9, stagger: 0.08, ease: "expo.out",
      scrollTrigger: { trigger: ".orbit-ticks", start: "top 95%" }
    });

    // 02 Deck: the renders start as a stacked pile and deal out into place
    deal($(".deck"), $$(".card"), [-9, -3, 4, 10], "top 88%", "top 30%");

    // 03 Spotlight: the room powers on with a flicker
    gsap.timeline({ scrollTrigger: { trigger: ".neon", start: "top 80%" } })
      .fromTo(".neon", { clipPath: "inset(50% 0% 50% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: "expo.inOut" })
      .set(".neon-lit", { opacity: 0 }, 0)
      .to(".neon-lit", { keyframes: { opacity: [0, 1, 0.15, 1, 0.5, 1], easeEach: "none" }, duration: 0.7 }, 0.9)
      .from(".neon-thumbs", { y: 20, opacity: 0, duration: 0.9, ease: "expo.out" }, 0.8);

    // 04 Scan: the drawing prints top to bottom as you scroll
    gsap.timeline({ scrollTrigger: { trigger: ".scan", start: "top 80%", end: "bottom 75%", scrub: 1 } })
      .set(".scan-line", { opacity: 1 })
      .fromTo(".scan img", { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "none" }, 0)
      .fromTo(".scan-line", { top: "0%" }, { top: "100%", ease: "none" }, 0)
      .set(".scan-line", { opacity: 0 });

    // Films list
    gsap.from(films, {
      opacity: 0, y: 40, duration: 1.2, stagger: 0.1, ease: "expo.out",
      scrollTrigger: { trigger: ".film-list", start: "top 85%" }
    });

    // Showreel grows into place
    gsap.fromTo(".reel-frame", { scale: mobile ? 0.94 : 0.82 }, {
      scale: 1, ease: "none",
      scrollTrigger: { trigger: ".reel", start: "top bottom", end: "center center", scrub: true }
    });

    // About
    const photo = $(".about-photo");
    reveal(photo, $("img", photo));
    $$("[data-count]").forEach(el => {
      const counter = { v: 0 };
      gsap.to(counter, {
        v: +el.dataset.count, duration: 1.8, ease: "power2.out",
        onUpdate: () => { el.textContent = Math.round(counter.v); },
        scrollTrigger: { trigger: el, start: "top 92%" }
      });
    });

    // Contact
    gsap.from([".contact-mail", ".contact-links li"], {
      opacity: 0, y: 30, duration: 1.2, stagger: 0.08, ease: "expo.out",
      scrollTrigger: { trigger: ".contact-mail", start: "top 92%" }
    });
  });

  // Recalculate positions once fonts and images settle
  let refreshTimer;
  const refresh = () => { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 150); };
  $$("img").forEach(img => { if (!img.complete) img.addEventListener("load", refresh, { once: true }); });
  if (document.fonts) document.fonts.ready.then(refresh);
  addEventListener("load", refresh);
  // The hero window is sized from the photo, so recompute once it has loaded
  const heroPhoto = $(".hero-frame img");
  if (!heroPhoto.complete) heroPhoto.addEventListener("load", refresh, { once: true });
})();
