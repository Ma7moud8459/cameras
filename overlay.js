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
    }).catch(function () {});
    if (document.getElementById("arts")) loadArticles(db);
    addFloat();
  }

  // زرار واتساب ثابت في كل الصفحات (بياخد الرقم من لينكات الصفحة نفسها)
  function addFloat() {
    if (document.querySelector(".wafloat")) return;
    var a = document.querySelector('a[href*="wa.me/"]');
    if (!a) return;
    var f = document.createElement("a");
    f.className = "wafloat";
    f.href = a.href;
    f.textContent = "واتساب";
    document.body.appendChild(f);
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
      if (m.name) { p.name = m.name; changed = true; }
      if (m.img) { p.img = m.img; changed = true; }
    }
    Object.keys(map).forEach(function (id) {
      var m = map[id];
      if (m && m.added && !m.hidden && m.fn && !window.P.some(function (p) { return p.fn === m.fn; })) {
        window.P.push({ fn: m.fn, tab: m.tab || "NONCCTV", model: m.model || m.fn, name: m.name || m.fn, price: m.price, img: m.img, added: true });
        changed = true;
      }
    });
    if (changed) window.draw();
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
        g.textContent = "المنتج ده غير متوفر حاليًا - كلمنا للبدائل";
        prod.insertBefore(g, prod.firstChild.nextSibling);
      }
    }
    if (m.price != null && m.price !== "") {
      var cta = document.querySelector(".cta");
      if (cta && !document.querySelector(".pricebox")) {
        var d = document.createElement("div");
        d.className = "pricebox";
        d.innerHTML = "السعر: <b>" + esc(m.price) + "</b>";
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

    // الفوتر + قنوات التواصل
    var foot = document.querySelector("footer");
    if (foot) {
      var parts = [];
      parts.push(esc(s.footerText || "للتركيب والاستفسار - اتصال أو واتساب"));
      if (wa) parts.push('<a class="phone" href="https://wa.me/' + wa + '">' + esc(phoneShow || ("+" + wa)) + "</a>");
      else if (tel) parts.push('<a class="phone" href="tel:+' + tel + '">' + esc(phoneShow || ("+" + tel)) + "</a>");
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
