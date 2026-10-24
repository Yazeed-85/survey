// ==========================================================================
// وردة حمراء مخملية مبنية بالكود
//  - بتلات موزعة بالزاوية الذهبية (137.5°) كما في الورد الحقيقي: قلب حلزوني طبيعي
//  - كل بتلة: لون متدرج + ظل عند القاعدة + عروق خفيفة + لمعة على الحافة الملتفّة
//  - كأس خضراء (سبالات) تحتضن البرعم ثم تنطوي للأسفل عند التفتح
// ==========================================================================

const NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}, parent) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
};

// أرقام عشوائية ثابتة: تظهر الوردة بالشكل نفسه في كل مرة
function rng(seed) {
    return () => {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const f = (n) => n.toFixed(1);

// الحافة العليا للبتلة (الشفة الملتفّة) — منها يُبنى الشكل الكامل واللمعة
function topEdge(L, w, lift) {
    return `M ${f(-.95*w)} ${f(-.70*L)} ` +
           `C ${f(-.92*w)} ${f(-.90*L)}, ${f(-.70*w)} ${f(-.99*L)}, ${f(-.48*w)} ${f(-(1.0+lift)*L)} ` +
           `C ${f(-.30*w)} ${f(-(1.07+lift)*L)}, ${f(-.12*w)} ${f(-1.0*L)}, 0 ${f(-.955*L)} ` +
           `C ${f(.12*w)} ${f(-1.0*L)}, ${f(.30*w)} ${f(-(1.07+lift)*L)}, ${f(.48*w)} ${f(-(1.0+lift)*L)} ` +
           `C ${f(.70*w)} ${f(-.99*L)}, ${f(.92*w)} ${f(-.90*L)}, ${f(.95*w)} ${f(-.70*L)}`;
}
function petalPath(L, w, lift) {
    return topEdge(L, w, lift) +
           ` C ${f(1.06*w)} ${f(-.40*L)}, ${f(.50*w)} ${f(-.10*L)}, 0 0 ` +
           `C ${f(-.50*w)} ${f(-.10*L)}, ${f(-1.06*w)} ${f(-.40*L)}, ${f(-.95*w)} ${f(-.70*L)} Z`;
}

// ألوان كل طبقة (من الأعمق في القلب إلى الأفتح في الخارج): قاعدة ← وسط ← حافة
const BANDS = [
    ['#1a0206', '#5a0615', '#96102a'],
    ['#210307', '#680816', '#a4132c'],
    ['#29040a', '#770a1b', '#b3152e'],
    ['#310509', '#860d1f', '#c21a33'],
    ['#39060c', '#951022', '#d02038'],
    ['#42070d', '#a51227', '#de2c42']
];

/**
 * @param svg   عنصر <svg> (viewBox 0 0 400 560 للوردة الكاملة)
 * @param id    بادئة معرّفات التدرجات
 * @param opts  { stem: true }
 */
export function buildRose(svg, id = 'r', opts = {}) {
    const withStem = opts.stem !== false;
    const CX = 200, CY = 185;
    const N = 42;                       // عدد البتلات
    const rand = rng(11);

    svg.innerHTML = '';
    const defs = el('defs', {}, svg);

    // ---------- تدرجات ----------
    BANDS.forEach((c, i) => {
        const g = el('linearGradient', { id: `${id}-pg${i}`, x1: 0.2, y1: 1, x2: 0.5, y2: 0 }, defs);
        el('stop', { offset: '0',    'stop-color': c[0] }, g);
        el('stop', { offset: '0.5',  'stop-color': c[1] }, g);
        el('stop', { offset: '1',    'stop-color': c[2] }, g);
    });
    const base = el('radialGradient', { id: `${id}-base`, cx: .5, cy: 1, r: .85 }, defs);
    el('stop', { offset: '0',   'stop-color': '#0c0003', 'stop-opacity': .75 }, base);
    el('stop', { offset: '0.55','stop-color': '#0c0003', 'stop-opacity': .12 }, base);
    el('stop', { offset: '1',   'stop-color': '#0c0003', 'stop-opacity': 0 }, base);

    const lip = el('linearGradient', { id: `${id}-lip`, x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    el('stop', { offset: '0',    'stop-color': '#ff8fa3', 'stop-opacity': 0 }, lip);
    el('stop', { offset: '0.28', 'stop-color': '#ffb3c1', 'stop-opacity': .85 }, lip);
    el('stop', { offset: '0.62', 'stop-color': '#ff7d94', 'stop-opacity': .25 }, lip);
    el('stop', { offset: '1',    'stop-color': '#ff8fa3', 'stop-opacity': 0 }, lip);

    const shadow = el('filter', { id: `${id}-sh`, x: '-25%', y: '-25%', width: '150%', height: '150%' }, defs);
    el('feDropShadow', { dx: 0, dy: 1.5, stdDeviation: 3, 'flood-color': '#12000400', 'flood-opacity': .7 }, shadow)
        .setAttribute('flood-color', '#120004');

    const stemG = el('linearGradient', { id: `${id}-stem`, x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    el('stop', { offset: '0', 'stop-color': '#1b4d2a' }, stemG);
    el('stop', { offset: '0.45', 'stop-color': '#4aa261' }, stemG);
    el('stop', { offset: '1', 'stop-color': '#143a21' }, stemG);
    const leafG = el('linearGradient', { id: `${id}-leaf`, x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    el('stop', { offset: '0', 'stop-color': '#174a28' }, leafG);
    el('stop', { offset: '1', 'stop-color': '#4fae68' }, leafG);
    const sepalG = el('linearGradient', { id: `${id}-sepal`, x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
    el('stop', { offset: '0', 'stop-color': '#143a21' }, sepalG);
    el('stop', { offset: '1', 'stop-color': '#4aa261' }, sepalG);

    const sheen = el('radialGradient', { id: `${id}-sheen`, cx: '34%', cy: '28%', r: '75%' }, defs);
    el('stop', { offset: '0',    'stop-color': '#ffd9e0', 'stop-opacity': .20 }, sheen);
    el('stop', { offset: '0.5',  'stop-color': '#ffd9e0', 'stop-opacity': .05 }, sheen);
    el('stop', { offset: '1',    'stop-color': '#ffd9e0', 'stop-opacity': 0 }, sheen);
    const drop = el('radialGradient', { id: `${id}-drop`, cx: '35%', cy: '30%', r: '70%' }, defs);
    el('stop', { offset: '0',   'stop-color': '#fff', 'stop-opacity': .95 }, drop);
    el('stop', { offset: '0.45','stop-color': '#ffd6de', 'stop-opacity': .35 }, drop);
    el('stop', { offset: '1',   'stop-color': '#ff8fa3', 'stop-opacity': .0 }, drop);

    // ---------- الساق والأوراق ----------
    let stem = null; const leaves = [];
    if (withStem) {
        stem = el('path', {
            d: `M${CX} 190 C 191 290, 212 425, 198 556`,
            stroke: `url(#${id}-stem)`, 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round'
        }, svg);
        // أشواك صغيرة
        [[203, 372, 1], [194, 470, -1]].forEach(([x, y, s]) => {
            el('path', { d: `M${x} ${y} l ${9*s} -7 l -2 9 z`, fill: '#2d6a3e' }, svg);
        });
        [
            { x: 197, y: 452, flip: 1,  rot: -22, s: 1.18 },
            { x: 205, y: 392, flip: -1, rot: -28, s: 1.02 }
        ].forEach(d => {
            const outer = el('g', { transform: `translate(${d.x} ${d.y}) scale(${d.flip * d.s} ${d.s}) rotate(${d.rot})` }, svg);
            const inner = el('g', { class: 'leaf' }, outer);
            el('path', { d: 'M0 0 C 14 -20, 58 -26, 96 -6 C 70 20, 28 22, 0 0 Z', fill: `url(#${id}-leaf)` }, inner);
            el('path', { d: 'M3 0 C 32 -5, 62 -7, 92 -6', stroke: '#0f3118', 'stroke-width': 1.2, fill: 'none', opacity: .55 }, inner);
            el('path', { d: 'M30 -4 l 14 -12 M48 -5 l 14 -11 M30 -3 l 12 11 M48 -4 l 12 10', stroke: '#0f3118', 'stroke-width': .8, fill: 'none', opacity: .35 }, inner);
            leaves.push(inner);
        });
    }

    // ---------- رأس الوردة (الكأس الخضراء تُرسم أولاً داخله لتبقى تحت البتلات) ----------
    const head = el('g', { id: `${id}-head` }, svg);
    const sepals = [];
    const sepalAngles = [128, 158, 182, 206, 236];
    sepalAngles.forEach((a, i) => {
        const outer = el('g', { transform: `translate(${CX} ${CY + 6}) rotate(${a})` }, head);
        const inner = el('g', { class: 'sepal' }, outer);
        const L = 150 + (i % 2) * 12, w = 20;
        el('path', {
            d: `M0 0 C ${-w} ${-L*.25}, ${-w*.9} ${-L*.7}, ${-2} ${-L} C ${-1} ${-L*1.06}, ${3} ${-L*1.04}, ${3} ${-L*.97} C ${w*.9} ${-L*.7}, ${w} ${-L*.25}, 0 0 Z`,
            fill: `url(#${id}-sepal)`, stroke: '#0f3118', 'stroke-width': .8
        }, inner);
        el('path', { d: `M0 0 C 1 ${-L*.4}, 0 ${-L*.75}, 0 ${-L*.95}`, stroke: '#0f3118', 'stroke-width': 1, fill: 'none', opacity: .4 }, inner);
        sepals.push({ el: inner, angle: a });
    });

    // مجموعات (طبقات) تُظلَّل معاً: تقلّل عدد الفلاتر
    const bandCount = BANDS.length;
    const bandGroups = BANDS.map(() => el('g', { filter: `url(#${id}-sh)` }));
    // الرسم من الخارج إلى الداخل: الطبقة الخارجية أولاً
    for (let b = bandCount - 1; b >= 0; b--) head.appendChild(bandGroups[b]);

    const petals = [];
    // k = 0 هي أصغر بتلة في القلب، k = N-1 أكبرها في الخارج
    for (let k = N - 1; k >= 0; k--) {
        const t = k / (N - 1);                           // 0 → 1
        const band = Math.min(bandCount - 1, Math.floor(t * bandCount));
        const L = 13 + Math.pow(t, 0.85) * 120;          // الطول
        const ratio = 0.40 + 0.22 * t;                   // الخارجية أعرض (كأس)، الداخلية أنحف
        const w = L * ratio * (0.94 + rand() * 0.12);
        const lift = 0.02 + rand() * 0.05 + (1 - t) * 0.02;
        const angle = (k * 137.508) % 360 + (rand() - 0.5) * 6;
        const skew = (rand() - 0.5) * 14;
        const Lr = L * (0.95 + rand() * 0.1);

        const outer = el('g', {
            transform: `translate(${CX} ${CY}) rotate(${f(angle)}) skewX(${f(skew)})`
        }, bandGroups[band]);
        const p = el('g', { class: 'petal' }, outer);

        const d = petalPath(Lr, w, lift);
        el('path', { d, fill: `url(#${id}-pg${band})`, stroke: '#16000a', 'stroke-opacity': .45, 'stroke-width': .8 }, p);
        el('path', { d, fill: `url(#${id}-base)` }, p);
        // عروق
        el('path', {
            d: `M0 ${f(-.04*Lr)} C ${f(-.1*w)} ${f(-.35*Lr)}, ${f(-.18*w)} ${f(-.6*Lr)}, ${f(-.22*w)} ${f(-.9*Lr)} ` +
               `M0 ${f(-.04*Lr)} C ${f(.1*w)} ${f(-.35*Lr)}, ${f(.16*w)} ${f(-.6*Lr)}, ${f(.2*w)} ${f(-.9*Lr)} ` +
               `M0 ${f(-.04*Lr)} L 0 ${f(-.85*Lr)}`,
            fill: 'none', stroke: '#2a0009', 'stroke-opacity': .22, 'stroke-width': .8, 'stroke-linecap': 'round'
        }, p);
        // لمعة الشفة (عريضة خافتة + رفيعة ساطعة)
        const edge = topEdge(Lr, w, lift);
        el('path', { d: edge, fill: 'none', stroke: `url(#${id}-lip)`, 'stroke-width': 4.5, 'stroke-opacity': .35, 'stroke-linecap': 'round' }, p);
        el('path', { d: edge, fill: 'none', stroke: `url(#${id}-lip)`, 'stroke-width': 1.4, 'stroke-opacity': .7, 'stroke-linecap': 'round' }, p);

        petals.push({ el: p, k, t, band, angle });
    }
    // الترتيب في المصفوفة: من الخارج للداخل. نريده من الداخل للخارج للتحريك
    petals.sort((a, b) => a.k - b.k);

    // ظل القلب وحلزونته
    const centerShade = el('circle', { cx: CX, cy: CY, r: 22, fill: '#14000a', opacity: .0 }, head);
    const spiral = centerShade;

    // لمعة ضوء ناعمة على الرأس
    const gloss = el('circle', { cx: CX, cy: CY, r: 118, fill: `url(#${id}-sheen)`, 'pointer-events': 'none' }, head);

    // قطرات ندى
    const drops = [[158, 150, 5], [236, 168, 4], [186, 226, 3.2]].map(([x, y, r]) => {
        const g = el('g', { class: 'drop', opacity: 0 }, head);
        el('circle', { cx: x, cy: y, r, fill: `url(#${id}-drop)` }, g);
        el('circle', { cx: x - r * .3, cy: y - r * .35, r: r * .28, fill: '#fff', opacity: .95 }, g);
        return g;
    });

    return { svg, head, petals, sepals, stem, leaves, centerShade, spiral, gloss, drops, CX, CY };
}
