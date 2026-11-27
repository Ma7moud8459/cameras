// التحديثات المباشرة: بيقرأ الأسعار والتعديلات والمنتجات والمقالات وإعدادات الموقع من قاعدة البيانات ويعرضها على الموقع.
// لو Firebase لسه مش متظبط (firebase-config.js فيه PENDING) الملف بيخرج بهدوء والموقع يفضل شغال زي ما هو.
(function () {
  var cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey || cfg.apiKey === "PENDING") return;

  var V = "10.12.2";
  function load(src) {
    return new Promise(function (ok, no) {
      var s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = no;
      document.head.appendChild(s);
    });
  }
  var base = "https://www.gstatic.com/firebasejs/" + V + "/";
  Promise.all([
    load(base + "firebase-app-compat.js"),
    load(base + "firebase-firestore-compat.js")
  ]).then(init).catch(function () {});

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function encId(fn) { return encodeURIComponent(fn); }
  function digits(s) { return String(s || "").replace(/[^0-9]/g, ""); }

  function init() {
    try { firebase.initializeApp(cfg); } catch (e) {}
    var db = firebase.firestore();
    db.collection("products").get().then(function (q) {
      var map = {};
      q.forEach(function (d) { map[d.id] = d.data(); });
      applyCatalog(map);
      applyProductPage(map);
    }).catch(function () {});
    db.collection("settings").doc("site").get().then(function (d) {
      if (d.exists) applySettings(d.data());
      buildDrawer(d.exists ? d.data() : {});
    }).catch(function () { buildDrawer({}); });
    db.collection("settings").doc("slider").get().then(function (d) {
      if (d.exists) renderSlider(d.data());
    }).catch(function () {});
    if (document.getElementById("arts")) loadArticles(db);
    addFloat();
    productExtras();
    revealOnScroll();
  }

  // زرار واتساب ثابت في كل الصفحات (بياخد الرقم من لينكات الصفحة نفسها)
  function addFloat() {
    if (document.querySelector(".wafloat")) return;
    var a = document.querySelector('a[href*="wa.me/"]');
    if (!a) return;
    var f = document.createElement("a");
    f.className = "wafloat";
    f.href = a.href;
    f.setAttribute("aria-label", "واتساب");
    f.innerHTML = '<svg viewBox="0 0 32 32"><path d="M16 3C9.4 3 4 8.4 4 15c0 2.3.6 4.4 1.8 6.3L4 29l7.9-1.7c1.2.6 2.7.9 4.1.9 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 22c-1.3 0-2.6-.3-3.7-.9l-.4-.2-4.1.9.9-4-.3-.4C7.4 18.7 7 16.9 7 15c0-5 4-9 9-9s9 4 9 9-4 10-9 10zm4.9-7.4c-.3-.1-1.6-.8-1.8-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2.2-1.3-.8-.7-1.3-1.6-1.5-1.9-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5s-.6-1.4-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.6-.6 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3z"/></svg>';
    document.body.appendChild(f);
  }


  // صفحات المنتجات: شريط واتساب ثابت + منتجات مشابهة
  function productExtras() {
    var mm = location.pathname.match(/\/p\/([^/]+)\.html$/);
    if (!mm) return;
    var fn = decodeURIComponent(mm[1]);

    var wa = document.querySelector('.cta a[href*="wa.me/"]');
    var telA = document.querySelector('a[href^="tel:"]');
    if (wa && !document.querySelector(".stickywa")) {
      document.body.classList.add("hassticky");
      var bar = document.createElement("div");
      bar.className = "stickywa";
      bar.innerHTML = '<a class="w" href="' + wa.href + '">استفسر عن الموديل عبر واتساب</a>' +
        (telA ? '<a class="c" href="' + telA.href + '">اتصال</a>' : "");
      document.body.appendChild(bar);
    }

    fetch("../products.json").then(function (r) { return r.json(); }).then(function (list) {
      var me = null;
      for (var i = 0; i < list.length; i++) if (list[i].fn === fn) { me = list[i]; break; }
      if (!me) return;
      var rel = list.filter(function (p) { return p.tab === me.tab && p.fn !== fn; }).slice(0, 4);
      if (!rel.length) return;
      var foot = document.querySelector("footer");
      if (!foot) return;
      var box = document.createElement("div");
      box.className = "prod related";
      box.innerHTML = '<div class="sect"><h2>منتجات مشابهة</h2></div><div class="relgrid">' + rel.map(function (p) {
        return '<a href="../p/' + encodeURIComponent(p.fn) + '.html"><img src="../img/' + encodeURIComponent(p.fn) + '.jpg" alt="' + esc(p.model || p.fn) + '" loading="lazy" onerror="this.style.display=\'none\'"><b>' + esc(p.name || p.model || p.fn) + '</b><span>' + esc(p.model || p.fn) + "</span></a>";
      }).join("") + "</div>";
      foot.parentNode.insertBefore(box, foot);
    }).catch(function () {});
  }

  // ظهور العناصر تدريجيًا عند النزول (ما بيشتغلش لو المتصفح قديم)
  function revealOnScroll() {
    if (!("IntersectionObserver" in window)) return;
    var els = document.querySelectorAll(".trust>div,.howsteps>div,.ctile,.artlink");
    if (!els.length) return;
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    Array.prototype.forEach.call(els, function (el) { el.classList.add("reveal"); io.observe(el); });
  }

  // الصفحة الرئيسية: أسعار وتعديلات وإخفاء على المنتجات الموجودة + منتجات جديدة
  function applyCatalog(map) {
    if (!window.P || !window.draw) return;
    var changed = false;
    for (var i = window.P.length - 1; i >= 0; i--) {
      var p = window.P[i];
      var m = map[encId(p.fn)];
      if (!m) continue;
      if (m.hidden) { window.P.splice(i, 1); changed = true; continue; }
      if (m.price != null) { if (p.price !== m.price) { p.price = m.price === "" ? undefined : m.price; changed = true; } }
      if (m.priceOld != null) { if (p.priceOld !== m.priceOld) { p.priceOld = m.priceOld === "" ? undefined : m.priceOld; changed = true; } }
      if (m.badge != null) { if (p.badge !== m.badge) { p.badge = m.badge === "" ? undefined : m.badge; changed = true; } }
      if (m.name) { p.name = m.name; changed = true; }
      if (m.img) { p.img = m.img; changed = true; }
    }
    Object.keys(map).forEach(function (id) {
      var m = map[id];
      if (m && m.added && !m.hidden && m.fn && !window.P.some(function (p) { return p.fn === m.fn; })) {
        window.P.push({ fn: m.fn, tab: m.tab || "NONCCTV", model: m.model || m.fn, name: m.name || m.fn, price: m.price, priceOld: m.priceOld, badge: m.badge, img: m.img, added: true });
        changed = true;
      }
    });
    if (changed) { window.draw(); if (window.tiles) window.tiles(); }
    // عداد المنتجات في الهيدر بيتحدث مع الإضافة والإخفاء
    var st = document.querySelector(".stats b");
    if (st) st.textContent = window.P.length;
  }

  // صفحة موديل واحد: تحديث الاسم والمميزات والسعر والصورة + حالة الإخفاء
  function applyProductPage(map) {
    var mm = location.pathname.match(/\/p\/([^/]+)\.html$/);
    if (!mm) return;
    var m = map[encId(mm[1])];
    if (!m) return;
    if (m.name) { var n = document.querySelector("p.name"); if (n) n.textContent = m.name; }
    if (m.img) { var im = document.querySelector(".cardimg img"); if (im) im.src = m.img; }
    if (Array.isArray(m.feats) && m.feats.length) {
      var f = document.querySelector(".feats");
      if (f) f.innerHTML = m.feats.map(function (x) { return "<div>" + esc(x) + "</div>"; }).join("");
    }
    if (m.hidden) {
      var prod = document.querySelector(".prod");
      if (prod && !document.querySelector(".gone")) {
        var g = document.createElement("div");
        g.className = "gone";
        g.textContent = "هذا المنتج غير متوفر حاليًا - تواصل معنا للبدائل";
        prod.insertBefore(g, prod.firstChild.nextSibling);
      }
    }
    if (m.price != null && m.price !== "") {
      var cta = document.querySelector(".cta");
      if (cta && !document.querySelector(".pricebox")) {
        var d = document.createElement("div");
        d.className = "pricebox";
        d.innerHTML = "السعر: " + (m.priceOld ? '<span class="old">' + esc(m.priceOld) + "</span>" : "") + "<b>" + esc(m.price) + "</b>" + (m.badge ? '<span class="pchip">' + esc(m.badge) + "</span>" : "");
        cta.parentNode.insertBefore(d, cta);
      }
    }
  }

  // إعدادات الموقع العامة: الاسم، الشعار، التواصل، الهيدر، البانر، الأقسام، الوصف
  function applySettings(s) {
    var tel = digits(s.tel || s.phoneTel || "");
    var wa = digits(s.whatsapp || "");
    var phoneShow = s.phoneDisplay || "";

    // الاسم والشعار في الشريط العلوي
    if (s.brand || s.logo) {
      Array.prototype.forEach.call(document.querySelectorAll(".brand"), function (el) {
        var txt = s.brand || el.textContent.trim();
        if (s.logo) {
          el.innerHTML = '<img class="brandlogo" src="' + esc(s.logo) + '" alt=""> ' + esc(txt);
        } else {
          var svg = el.querySelector("svg");
          el.innerHTML = "";
          if (svg) el.appendChild(svg);
          el.appendChild(document.createTextNode(" " + txt));
        }
      });
      if (s.brand) document.title = document.title.replace(/^[^-<]+/, s.brand);
    }

    // أرقام التواصل في كل اللينكات
    if (tel) {
      Array.prototype.forEach.call(document.querySelectorAll('a[href^="tel:"]'), function (a) {
        a.href = "tel:+" + tel;
        if (phoneShow) a.textContent = phoneShow;
      });
    }
    if (wa) {
      Array.prototype.forEach.call(document.querySelectorAll('a[href*="wa.me/"]'), function (a) {
        var q = a.href.indexOf("?") > -1 ? a.href.slice(a.href.indexOf("?")) : "";
        a.href = "https://wa.me/" + wa + q;
        if (phoneShow && a.classList.contains("phone")) a.textContent = phoneShow;
      });
    }

    var fl = document.querySelector(".wafloat");
    if (fl) { var f0 = document.querySelector('a[href*="wa.me/"]'); if (f0) fl.href = f0.href; }

    // وصف جوجل
    if (s.metaDesc) {
      var md = document.querySelector('meta[name="description"]');
      if (md) md.setAttribute("content", s.metaDesc);
    }

    // الهيدر في الصفحة الرئيسية
    if (s.heroTitle) { var h = document.querySelector(".hero h1"); if (h) h.textContent = s.heroTitle; }
    if (s.heroSub) { var sb = document.querySelector(".hero p.sub"); if (sb) sb.textContent = s.heroSub; }

    // أسماء الأقسام
    if (s.cats && typeof T !== "undefined") {
      Object.keys(s.cats).forEach(function (k) { if (s.cats[k]) T[k] = s.cats[k]; });
      if (typeof tabs === "function") tabs();
    }

    // بانر العروض
    if (s.bannerOn && s.bannerText && !document.querySelector(".offerbar")) {
      var b = document.createElement("div");
      b.className = "offerbar";
      b.textContent = s.bannerText;
      var tb = document.querySelector(".topbar");
      if (tb && tb.parentNode) tb.parentNode.insertBefore(b, tb.nextSibling);
      else document.body.insertBefore(b, document.body.firstChild);
    }

    // الفوتر + قنوات التواصل (نلمس الفوتر الثابت فقط لو في إعدادات فعلية ليه)
    var hasFoot = s.footerText || wa || tel || s.mapUrl || s.tiktok || s.instagram || s.snapchat || s.x || s.haraj || s.address || s.brand;
    var foot = document.querySelector("footer");
    if (foot && hasFoot) {
      // الرقم الافتراضي من الفوتر الثابت لو الإعدادات مفيهاش رقم
      var oldA = foot.querySelector('a.phone');
      var parts = [];
      parts.push(esc(s.footerText || "للتركيب والاستفسار - اتصال أو واتساب"));
      if (wa) parts.push('<a class="phone" href="https://wa.me/' + wa + '">' + esc(phoneShow || ("+" + wa)) + "</a>");
      else if (tel) parts.push('<a class="phone" href="tel:+' + tel + '">' + esc(phoneShow || ("+" + tel)) + "</a>");
      else if (oldA) parts.push(oldA.outerHTML);
      var social = [];
      if (tel && wa) social.push('<a href="tel:+' + tel + '">اتصال</a>');
      if (s.mapUrl) social.push('<a href="' + esc(s.mapUrl) + '">الموقع على الخريطة</a>');
      if (s.tiktok) social.push('<a href="' + esc(s.tiktok) + '">تيك توك</a>');
      if (s.instagram) social.push('<a href="' + esc(s.instagram) + '">انستقرام</a>');
      if (s.snapchat) social.push('<a href="' + esc(s.snapchat) + '">سناب شات</a>');
      if (s.x) social.push('<a href="' + esc(s.x) + '">إكس</a>');
      if (s.haraj) social.push('<a href="' + esc(s.haraj) + '">حراج</a>');
      var html = parts.join(" ");
      if (social.length) html += '<div class="channels">' + social.join(" ") + "</div>";
      if (s.address) html += '<div class="addr">' + esc(s.address) + "</div>";
      if (s.brand) html += '<div class="small">' + esc(s.brand) + "</div>";
      foot.innerHTML = html;
    }
    // لينكات صفحات الموقع تحت الفوتر، لأي فوتر لسه مفيهوش
    if (foot && !foot.querySelector(".channels")) foot.insertAdjacentHTML("beforeend", navLinks());

    // صفحة تواصل معنا: تتملى من الإعدادات (لو في قنوات محفوظة)
    var cp = document.getElementById("cpage");
    if (cp && (wa || tel || s.mapUrl || s.tiktok || s.instagram || s.snapchat || s.x || s.haraj || s.address)) {
      var rows = [];
      if (wa) rows.push('<div><a class="btn" style="display:block;text-align:center" href="https://wa.me/' + wa + '">واتساب مباشر</a></div>');
      if (tel) rows.push('<div><a class="btn ghost" style="display:block;text-align:center" href="tel:+' + tel + '">اتصال: ' + esc(phoneShow || ("+" + tel)) + "</a></div>");
      if (s.mapUrl) rows.push('<div><a class="btn ghost" style="display:block;text-align:center" href="' + esc(s.mapUrl) + '">الموقع على الخريطة</a></div>');
      var soc = [];
      if (s.tiktok) soc.push('<a class="btn ghost" href="' + esc(s.tiktok) + '">تيك توك</a>');
      if (s.instagram) soc.push('<a class="btn ghost" href="' + esc(s.instagram) + '">انستقرام</a>');
      if (s.snapchat) soc.push('<a class="btn ghost" href="' + esc(s.snapchat) + '">سناب شات</a>');
      if (s.x) soc.push('<a class="btn ghost" href="' + esc(s.x) + '">إكس</a>');
      if (s.haraj) soc.push('<a class="btn ghost" href="' + esc(s.haraj) + '">حراج</a>');
      if (soc.length) rows.push('<div style="display:flex;gap:8px;flex-wrap:wrap">' + soc.join("") + "</div>");
      var h = rows.length ? '<div class="feats">' + rows.join("") + "</div>" : "";
      h += '<p class="name">' + esc(s.address ? s.address + " - " : "") + "نخدم الدمام والمنطقة الشرقية - توريد وتركيب كاميرات مراقبة وأنظمة أمن.</p>";
      cp.innerHTML = h;
    }
  }

  // القائمة الجانبية: أقسام المنتجات (قابلة للفتح) + لينكات الموقع - في كل الصفحات
  var DEFCATS = { HIK: "كاميرات وأجهزة هيكفيجن", EZVIZ: "كاميرات إيزفيز", NET: "أجهزة الشبكات", NONCCTV: "شاشات وإكسسوارات" };
  function buildDrawer(s) {
    if (document.querySelector(".burger")) return;
    var pre = /\/(p|articles)\//.test(location.pathname) ? "../" : "";
    var cats = (typeof T !== "undefined") ? T : DEFCATS;
    if (s && s.cats) { cats = {}; Object.keys(DEFCATS).forEach(function (k) { cats[k] = (s.cats && s.cats[k]) || (typeof T !== "undefined" && T[k]) || DEFCATS[k]; }); }

    var burger = document.createElement("button");
    burger.className = "burger";
    burger.setAttribute("aria-label", "القائمة الرئيسية");
    burger.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f5b301" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    var tb = document.querySelector(".topbar");
    if (tb) tb.insertBefore(burger, tb.firstChild);

    var veil = document.createElement("div");
    veil.className = "dveil";
    var dr = document.createElement("aside");
    dr.className = "drawer";
    var html = '<div class="drawer-head"><a class="dhome" href="' + pre + 'index.html">القائمة الرئيسية</a><button class="drawer-x" aria-label="قفل">×</button></div><div class="drawer-cats">';
    Object.keys(cats).forEach(function (k) {
      var items = (typeof P !== "undefined") ? P.filter(function (p) { return p.tab === k; }) : [];
      html += '<div class="dcat"><button class="dcat-head">' + esc(cats[k]) + '<span class="pl">+</span></button><div class="dcat-body">' +
        '<a class="all" href="' + pre + 'index.html#cat=' + k + '">عرض الكل' + (items.length ? " (" + items.length + ")" : "") + "</a>";
      items.slice(0, 5).forEach(function (p) {
        var href = p.added ? (pre + "p/new.html?fn=" + encodeURIComponent(p.fn)) : (pre + "p/" + p.fn + ".html");
        html += '<a href="' + href + '">' + esc(p.name) + "</a>";
      });
      html += "</div></div>";
    });
    html += "</div>" + '<div class="dlinks">' +
      '<a href="' + pre + 'index.html">كل المنتجات</a>' +
      '<a href="' + pre + 'articles/">المواضيع</a>' +
      '<a href="' + pre + 'contact.html">تواصل معنا</a>' +
      '<a href="' + pre + 'faq.html">الأسئلة الشائعة</a>' +
      '<a href="' + pre + 'privacy.html">الخصوصية</a></div>';
    dr.innerHTML = html;
    document.body.appendChild(veil);
    document.body.appendChild(dr);
    function openD() { dr.classList.add("open"); veil.classList.add("open"); }
    function closeD() { dr.classList.remove("open"); veil.classList.remove("open"); }
    burger.addEventListener("click", openD);
    veil.addEventListener("click", closeD);
    dr.querySelector(".drawer-x").addEventListener("click", closeD);
    Array.prototype.forEach.call(dr.querySelectorAll(".dcat-head"), function (b) {
      b.addEventListener("click", function () { b.parentNode.classList.toggle("open"); });
    });
    // أي لينك جوه القايمة يقفلها بعد الضغط (مهم على الموبايل وعلى لينكات الأقسام في نفس الصفحة)
    Array.prototype.forEach.call(dr.querySelectorAll("a"), function (a) {
      a.addEventListener("click", closeD);
    });
  }

  // سلايدر العروض في الرئيسية: بينزل مكان الهيدر الثابت لما يكون مفعّل من اللوحة
  function renderSlider(cfg) {
    var slides = (cfg && cfg.on && Array.isArray(cfg.slides)) ? cfg.slides.filter(function (x) { return x && x.img; }) : [];
    if (!slides.length) return;
    var hero = document.querySelector(".hero");
    if (!hero) return;
    hero.style.display = "none";
    var wrap = document.createElement("div");
    wrap.className = "slider";
    wrap.innerHTML = '<div class="slides">' + slides.map(function (s, i) {
      var inner = '<div class="sveil"></div><div class="sinner">' +
        (s.title ? "<h2>" + esc(s.title) + "</h2>" : "") +
        (s.text ? "<p>" + esc(s.text) + "</p>" : "") +
        (s.btn && s.link ? '<a class="btn" href="' + esc(s.link) + '">' + esc(s.btn) + "</a>" : "") + "</div>";
      return '<div class="slide"><img class="sbg" src="' + esc(s.img) + '" alt="">' + inner + "</div>";
    }).join("") + "</div>" +
      (slides.length > 1 ? '<div class="sdots">' + slides.map(function (s, i) { return '<button data-i="' + i + '"' + (i === 0 ? ' class="on"' : "") + '></button>'; }).join("") + "</div>" : "");
    hero.parentNode.insertBefore(wrap, hero.nextSibling);
    if (slides.length < 2) return;
    var track = wrap.querySelector(".slides"), cur = 0, timer;
    function go(i) {
      cur = (i + slides.length) % slides.length;
      track.style.transform = "translateX(" + (cur * 100) + "%)"; // RTL: الشرائح بتتحرك لليمين
      Array.prototype.forEach.call(wrap.querySelectorAll(".sdots button"), function (b, j) { b.className = j === cur ? "on" : ""; });
    }
    Array.prototype.forEach.call(wrap.querySelectorAll(".sdots button"), function (b) {
      b.addEventListener("click", function () { go(+b.getAttribute("data-i")); reset(); });
    });
    function reset() { clearInterval(timer); timer = setInterval(function () { go(cur + 1); }, 5000); }
    reset();
  }
  window.__renderSlider = renderSlider; // للتجربة من الكونسول من غير حفظ

  // لينكات صفحات الموقع تحت الفوتر (مسارات نسبية حسب مكان الصفحة)
  function navLinks() {
    var pre = /\/(p|articles)\//.test(location.pathname) ? "../" : "";
    return '<div class="channels">' +
      '<a href="' + pre + 'index.html">المنتجات</a>' +
      '<a href="' + pre + 'articles/">المواضيع</a>' +
      '<a href="' + pre + 'contact.html">تواصل معنا</a>' +
      '<a href="' + pre + 'faq.html">الأسئلة الشائعة</a>' +
      '<a href="' + pre + 'privacy.html">الخصوصية</a></div>';
  }

  // صفحة المواضيع: عرض المقالات المنشورة من لوحة التحكم
  function loadArticles(db) {
    db.collection("articles").orderBy("ts", "desc").get().then(function (q) {
      var box = document.getElementById("arts");
      if (!box || q.empty) return; // يفضل النص الافتراضي ظاهر
      box.innerHTML = "";
      q.forEach(function (d) {
        var a = d.data();
        var el = document.createElement("details");
        el.className = "art";
        el.innerHTML = "<summary>" + esc(a.title) + "</summary><div class=\"artbody\">" +
          esc(a.body).replace(/\n/g, "<br>") + "</div>";
        box.appendChild(el);
      });
    }).catch(function () {});
  }
})();
