#!/usr/bin/env python3
# Regenerate product pages: descriptive name + model as title, full specs table
# parsed from his catalog names (verifiable only; nothing guessed).
import json, re, html

V = "20261127i"
BRAND = {"HIK": "هيكفيجن", "EZVIZ": "إيزفيز", "NET": "هيكفيجن", "NONCCTV": "هيكفيجن"}
NO_BRAND_MODELS = {"IC S50", "S50+TK4100"}
CAT = {"HIK": "كاميرات وأجهزة هيكفيجن", "EZVIZ": "كاميرات إيزفيز",
       "NET": "أجهزة الشبكات", "NONCCTV": "شاشات وإكسسوارات"}

def norm_mega(m):
    # "2 ميجا" -> "2 ميجابكسل"; "4K (8 ميجا)" -> "4K (8 ميجابكسل)"
    return re.sub(r"ميجا(?!\s*بكسل)", "ميجابكسل", m)

# ordered labeled extractions: (label, regex, value_template)
def parse(name):
    s = name.strip()
    specs = []   # (label, value) in fixed presentation order appended later
    found = {}

    def grab(key, pattern, fmt=None, flags=0):
        m = re.search(pattern, s, flags)
        if m:
            val = fmt(m) if fmt else m.group(0)
            found[key] = val
            return m.span()
        return None

    # We collect spans to remove, then rebuild remainder.
    spans = []
    def grab2(key, pattern, fmt=None):
        m = re.search(pattern, s)
        if m:
            found[key] = fmt(m) if fmt else m.group(1) if m.groups() else m.group(0)
            spans.append(m.span())
            return True
        return False

    grab2("حجم الشاشة", r"(\d+(?:\.\d+)?)\s*بوصة", lambda m: m.group(1) + " بوصة")
    m = re.search(r"(\d+K\s*\(\d+\s*ميجا\)|\d+\+\d+\s*ميجا|\d+\s*ميجا(?:\s*\(\d+P\))?|Full HD|1080P|\d+K)", s)
    if m:
        found["الدقة"] = norm_mega(m.group(0))
        spans.append(m.span())
    grab2("مدى الرؤية الليلية", r"مدى الأشعة (\d+ متر)")
    grab2("ضغط الفيديو", r"ضغط (H\.265\+?|H\.264\+?)", )
    grab2("الكشف الذكي", r"كشف ذكي (AcuSense)")
    grab2("الأقراص الصلبة", r"(يدعم \d+ هارد)")
    grab2("عدد القنوات", r"\(?(\d+) قناة\)?", lambda m: m.group(1))
    grab2("الزوم البصري", r"زوم (\d+X)")
    grab2("السرعة", r"سرعة (جيجابت|\d+ ميجابت)")
    grab2("قدرة PoE", r"قدرة (\d+ وات)")
    grab2("السعة", r"سعة (\d+ جيجا)")
    grab2("مقاومة المياه والأتربة", r"مقاوم للمياه (IP\d+)")
    grab2("التردد", r"تردد (\d+(?:\.\d+)? جيجا)")
    grab2("عدد المنافذ", r"(\d+) بورت", lambda m: m.group(1))
    grab2("المفاتيح السريعة", r"(\d+) مفتاح سريع(?:\s*\(DSS\))?", lambda m: m.group(1))
    grab2("العدسة", r"عدسة (متغيرة موتورايز|متغيرة|مزدوجة)")
    grab2("الحركة", r"(دوران وإمالة)")
    grab2("الشريحة", r"(شريحة 4G)")
    grab2("التشغيل", r"(تعمل بالبطارية|تعمل بالطاقة الشمسية)")
    grab2("الرؤية الليلية", r"رؤية ليلية (ملونة|DarkFighter)")
    grab2("الإضاءة", r"إضاءة (هجينة ذكية)")
    grab2("الصوت", r"(ميكروفون مدمج|صوت باتجاهين|صوت HD)")
    grab2("الإنذار", r"(صافرة إنذار)")
    grab2("منافذ PoE", r"(منافذ PoE مدمجة)")
    grab2("الأنظمة المدعومة", r"يدعم 4 أنظمة (\S+)")
    grab2("الإدارة", r"(سويتش ذكي \(Smart\)|بدون إعدادات \(Plug & Play\)|إدارة عبر الويب)")
    grab2("المدى", r"(مدى طويل حتى 250 متر|مدى طويل \(Long Reach\))")
    grab2("الفئة", r"(سلسلة اقتصادية)")
    grab2("الحماية", r"(مقاوم للتخريب)")
    grab2("الاستخدام", r"للاستخدام (الداخلي|الخارجي)")
    grab2("التخزين", r"تخزين (سحابي أو كارت ذاكرة)")
    grab2("طريقة الفتح", r"فتح (بالبصمة|بالتعرف على الوجه)")
    grab2("التقنية", r"تقنية (Mifare|EM)")
    grab2("التطبيق", r"(مشاهدة عبر تطبيق EZVIZ)", lambda m: "تطبيق EZVIZ")
    grab2("الخرج", r"(\d+ فولت)\s*/?\s*(\d+(?:\.\d+)? أمبير)",
          lambda m: m.group(1) + " / " + m.group(2))
    grab2("التوافق", r"(مصمم لكاميرات EZVIZ|لأجهزة DVR|يعمل مع أجهزة هيكفيجن)",
          lambda m: m.group(1).replace("مصمم ل", "").replace("يعمل مع ", ""))

    # rebuild remainder = name minus grabbed spans
    rem = []
    last = 0
    for a, b in sorted(spans):
        rem.append(s[last:a])
        last = b
    rem.append(s[last:])
    rest = re.sub(r"\s+", " ", " ".join(rem)).strip(" ,")

    # split remainder into type (leading) + extra feature phrases
    SPLIT_KW = ["مشاهدة", "إطار", "مناسبة", "يركب", "طقم", "شاشة لمس", "نظام",
                "مع ملحقات", "تسجيل مستمر", "كاميرا أمامية", "عطر سيارة",
                "للتركيب", "واي فاي مع", "زجاج السيارة", "يعمل", "لون"]
    cut = len(rest)
    for kw in SPLIT_KW:
        i = rest.find(kw)
        if i > 0:
            cut = min(cut, i)
    ptype = rest[:cut].strip(" ,")
    feats_str = rest[cut:].strip(" ,")

    # split features into phrases at keyword starts
    feats = []
    if feats_str:
        KW2 = ["مشاهدة", "إطار", "مناسبة", "يركب", "طقم", "شاشة", "نظام", "مع",
               "تسجيل", "كاميرا", "عطر", "للتركيب", "واي", "زجاج", "يعمل", "لون"]
        pos = [0]
        words = feats_str.split(" ")
        cur = ""
        phrases = []
        for w in feats_str.split(" "):
            if w in KW2 and cur:
                phrases.append(cur.strip())
                cur = w
            else:
                cur = (cur + " " + w).strip()
        if cur:
            phrases.append(cur.strip())
        feats = [p for p in phrases if p]
    return found, ptype, feats

ORDER = ["الدقة", "حجم الشاشة", "عدد القنوات", "عدد المنافذ", "السرعة", "قدرة PoE",
         "منافذ PoE", "السعة", "مدى الرؤية الليلية", "الرؤية الليلية", "الإضاءة",
         "العدسة", "الزوم البصري", "الحركة", "الصوت", "الإنذار", "الكشف الذكي",
         "ضغط الفيديو", "الأقراص الصلبة", "الأنظمة المدعومة", "التردد", "التشغيل",
         "الشريحة", "التخزين", "طريقة الفتح", "التقنية", "المفاتيح السريعة",
         "الخرج", "مقاومة المياه والأتربة", "الحماية", "الاستخدام", "الإدارة",
         "المدى", "الفئة", "التوافق", "التطبيق"]


from translations import SEC_AR, LBL_AR, translate_value

def load_official():
    import os
    try:
        specs = json.load(open("specs_cache.json"))
        match = json.load(open("specs_match.json"))
    except Exception:
        return {}, {}
    return specs, match

OFFICIAL, MATCHED = load_official()

def esc(x):
    return html.escape(x, quote=True)

TPL = """<!DOCTYPE html>
<html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="icon" type="image/svg+xml" href="../favicon.svg"><meta name="theme-color" content="#ffffff"><meta property="og:title" content="{title}"><meta property="og:description" content="{desc}"><meta property="og:image" content="https://ma7moud8459.github.io/cameras/img/{fn}.jpg"><meta property="og:type" content="product"><meta name="twitter:card" content="summary_large_image"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../style.css?v={v}"><link rel="canonical" href="https://ma7moud8459.github.io/cameras/p/{fn}.html"><script type="application/ld+json">{{"@context": "https://schema.org", "@type": "Product", "model": "{model}", "name": "{schema_name}", "image": "https://ma7moud8459.github.io/cameras/img/{fn}.jpg", "category": "{cat}", "url": "https://ma7moud8459.github.io/cameras/p/{fn}.html", "brand": {{"@type": "Brand", "name": "{brand_en}"}}}}</script>
</head><body><div class="topbar"><span class="brand"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f5b301" stroke-width="2"><path d="M2 7l11-3 2 4-11 3z"/><path d="M13 8l8 3v7l-8-2z"/><circle cx="17" cy="13.5" r="2"/></svg> كاميرات مراقبة وأنظمة أمن</span><a class="phone" href="tel:+966569278151">0569278151</a></div><div class="prod">
<p class="crumb"><a href="../index.html">كل المنتجات</a> ← {cat}</p>
<h1>{h1}</h1>
<p class="pmodel">الموديل: <bdi dir="ltr">{model}</bdi></p>
<div class="cardimg"><img src="../img/{fn}.jpg" alt="{alt}" loading="lazy"></div>
<div class="feats">{chips}</div>
<div class="specs"><h2>المواصفات</h2>
<table>{rows}
</table>{extras}
</div>
<div class="cta"><a class="btn" href="https://wa.me/966569278151?text={wa}">واتساب 0569278151</a><a class="btn ghost" href="tel:+966569278151">اتصال</a></div>
</div><footer>للتركيب والاستفسار - اتصال أو واتساب <a class="phone" href="https://wa.me/966569278151">0569278151</a><div class="channels"><a href="../index.html">المنتجات</a><a href="../articles/">المواضيع</a><a href="../contact.html">تواصل معنا</a><a href="../faq.html">الأسئلة الشائعة</a><a href="../privacy.html">الخصوصية</a></div></footer><script src="../firebase-config.js?v={v}"></script><script src="../overlay.js?v={v}"></script>
</body></html>
"""

def gen(p):
    fn, tab, model, name = p["fn"], p["tab"], p["model"], p["name"]
    brand = BRAND[tab] if model not in NO_BRAND_MODELS else None
    brand_en = "EZVIZ" if tab == "EZVIZ" else "Hikvision"
    found, ptype, feats = parse(name)

    full_name = (brand + " " if brand else "") + name
    h1 = esc(full_name)
    title = esc(full_name + " - " + model)
    schema_name = esc(full_name + " - " + model)

    # spec rows
    rows = []
    if brand:
        rows.append(("الماركة", brand))
    rows.append(("الموديل", '<bdi dir="ltr">' + esc(model) + "</bdi>"))
    if ptype:
        rows.append(("نوع المنتج", esc(ptype)))
    off_path = MATCHED.get(model, {}).get("path") if model in MATCHED else None
    off_secs = OFFICIAL.get(off_path) if off_path else None
    if off_secs:
        body = ["\n".join('<tr><th>{}</th><td>{}</td></tr>'.format(l, v) for l, v in rows)]
        for sec in off_secs:
            sec_ar = SEC_AR.get(sec["section"], sec["section"])
            body.append('<tr class="sec"><th colspan="2">' + esc(sec_ar) + "</th></tr>")
            for l, v in sec["rows"]:
                body.append('<tr><th>{}</th><td><bdi dir="auto">{}</bdi></td></tr>'.format(
                    esc(LBL_AR.get(l, l)), esc(translate_value(v))))
        rows_html = "\n".join(body)
    else:
        for k in ORDER:
            if k in found:
                rows.append((k, esc(str(found[k]))))
        rows_html = "\n".join(
            '<tr><th>{}</th><td>{}</td></tr>'.format(l, v) for l, v in rows)

    extras = ""
    if feats:
        lis = "".join("<li>" + esc(f) + "</li>" for f in feats)
        extras = '<div class="spec-feats"><h3>مميزات إضافية</h3><ul>' + lis + "</ul></div>"

    # chips: resolution + up to 3 short highlights
    chips = []
    if "الدقة" in found:
        chips.append("دقة " + found["الدقة"])
    for k in ORDER:
        if len(chips) >= 4:
            break
        if k == "الدقة":
            continue
        v = str(found.get(k, ""))
        if v and len(v) <= 32:
            chips.append((k + ": " + v) if len(v) <= 20 else v)
    for f in feats:
        if len(chips) >= 4:
            break
        if len(f) <= 32:
            chips.append(f)
    chips_html = "".join("<div>" + esc(c) + "</div>" for c in chips[:4])

    # meta description
    desc_parts = [name]
    if "الدقة" in found:
        desc_parts.append("دقة " + found["الدقة"])
    for k in ["الاستخدام", "مدى الرؤية الليلية", "الكشف الذكي"]:
        if k in found:
            desc_parts.append(str(found[k]) if k != "مدى الرؤية الليلية" else "مدى رؤية ليلية " + found[k])
    desc = esc("، ".join(desc_parts) + ". للتركيب والاستفسار اتصال أو واتساب 0569278151.")

    wa = esc("السلام عليكم، أستفسر عن الموديل " + model)
    import urllib.parse
    wa = urllib.parse.quote("السلام عليكم، أستفسر عن الموديل " + model)

    return TPL.format(
        v=V, fn=esc(fn), title=title, desc=desc, cat=CAT[tab], h1=h1,
        model=esc(model), alt=title, chips=chips_html, rows=rows_html,
        extras=extras, wa=wa, schema_name=schema_name, brand_en=brand_en)

def main():
    d = json.load(open("products.json"))
    for p in d:
        out = gen(p)
        open("p/" + p["fn"] + ".html", "w").write(out)
    print("generated", len(d))

if __name__ == "__main__":
    main()
