// التحديثات المباشرة: بيقرأ الأسعار والتعديلات والمنتجات والمقالات الجديدة من قاعدة البيانات ويعرضها على الموقع.
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

  function init() {
    try { firebase.initializeApp(cfg); } catch (e) {}
    var db = firebase.firestore();
    db.collection("products").get().then(function (q) {
      var map = {};
      q.forEach(function (d) { map[d.id] = d.data(); });
      applyCatalog(map);
      applyProductPage(map);
    }).catch(function () {});
    if (document.getElementById("arts")) loadArticles(db);
  }

  // الصفحة الرئيسية: أسعار وتعديلات على المنتجات الموجودة + منتجات جديدة
  function applyCatalog(map) {
    if (!window.P || !window.draw) return;
    var changed = false;
    window.P.forEach(function (p) {
      var m = map[encId(p.fn)];
      if (!m) return;
      if (m.price != null && m.price !== "") { p.price = m.price; changed = true; }
      if (m.name) { p.name = m.name; changed = true; }
      if (m.img) { p.img = m.img; changed = true; }
    });
    Object.keys(map).forEach(function (id) {
      var m = map[id];
      if (m && m.added && m.fn && !window.P.some(function (p) { return p.fn === m.fn; })) {
        window.P.push({ fn: m.fn, tab: m.tab || "NONCCTV", model: m.model || m.fn, name: m.name || m.fn, price: m.price, img: m.img, added: true });
        changed = true;
      }
    });
    if (changed) window.draw();
  }

  // صفحة موديل واحد: تحديث الاسم والمميزات والسعر والصورة
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
