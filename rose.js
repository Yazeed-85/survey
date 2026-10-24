// ==========================================================================
// وردة SVG مبنية بالكود: طبقات من البتلات تتفتح بحركة GSAP
// ==========================================================================

const NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}, parent) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
};

// مولد أرقام عشوائية ثابت: تظهر الوردة بنفس الشكل في كل مرة
function rng(seed) {
    return () => {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// شكل البتلة: القاعدة عند (0,0) والرأس إلى الأعلى، مع انخفاض خفيف في الحافة العليا
function petalPath(L, w) {
    const f = (n) => n.toFixed(1);
    return `M0 0 C ${f(-.5*w)} ${f(-.10*L)} ${f(-1.02*w)} ${f(-.50*L)} ${f(-.80*w)} ${f(-.82*L)} ` +
           `C ${f(-.58*w)} ${f(-1.03*L)} ${f(-.22*w)} ${f(-1.03*L)} 0 ${f(-.965*L)} ` +
           `C ${f(.22*w)} ${f(-1.03*L)} ${f(.58*w)} ${f(-1.03*L)} ${f(.80*w)} ${f(-.82*L)} ` +
           `C ${f(1.02*w)} ${f(-.50*L)} ${f(.5*w)} ${f(-.10*L)} 0 0 Z`;
}
// حافة البتلة العليا (تلمع كأنها مطوية)
function rimPath(L, w) {
    const f = (n) => n.toFixed(1);
    return `M ${f(-.80*w)} ${f(-.82*L)} C ${f(-.58*w)} ${f(-1.03*L)} ${f(-.22*w)} ${f(-1.03*L)} 0 ${f(-.965*L)} ` +
           `C ${f(.22*w)} ${f(-1.03*L)} ${f(.58*w)} ${f(-1.03*L)} ${f(.80*w)} ${f(-.82*L)}`;
}

// حلقات البتلات من الخارج إلى الداخل
const RINGS = [
    { n: 7, L: 128, w: 66, off: 0,  c: ['#3d0614', '#8f0f28', '#c42342'] },
    { n: 6, L: 108, w: 58, off: 26, c: ['#4a0818', '#a3132f', '#d1304f'] },
    { n: 6, L: 90,  w: 50, off: 8,  c: ['#580a1c', '#b51836', '#dc4160'] },
    { n: 5, L: 72,  w: 42, off: 40, c: ['#670c20', '#c41f3e', '#e8566f'] },
    { n: 4, L: 54,  w: 34, off: 14, c: ['#780f26', '#d02848', '#f0728a'] },
    { n: 3, L: 36,  w: 25, off: 64, c: ['#8a1230', '#dc3a58', '#f78fa2'] }
];

/**
 * يبني الوردة داخل عنصر svg ويعيد المراجع اللازمة للتحريك.
 * @param svg     عنصر <svg>
 * @param id      بادئة لمعرّفات التدرجات (لتفادي التضارب عند وجود وردتين)
 * @param opts    { stem: true } لإضافة الساق والأوراق
 */
export function buildRose(svg, id = 'r', opts = {}) {
    const withStem = opts.stem !== false;
    const CX = 200, CY = 185;
    const rand = rng(7);

    svg.innerHTML = '';
    const defs = el('defs', {}, svg);

    // تدرجات البتلات + الظل
    RINGS.forEach((r, i) => {
        const g = el('linearGradient', { id: `${id}-pg${i}`, x1: 0, y1: 1, x2: 0.15, y2: 0 }, defs);
        el('stop', { offset: '0',   'stop-color': r.c[0] }, g);
        el('stop', { offset: '0.55','stop-color': r.c[1] }, g);
        el('stop', { offset: '1',   'stop-color': r.c[2] }, g);
    });
    const shadow = el('filter', { id: `${id}-sh`, x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs);
    el('feDropShadow', { dx: 0, dy: 0, stdDeviation: 3.2, 'flood-color': '#25000a', 'flood-opacity': 0.55 }, shadow);

    const rim = el('linearGradient', { id: `${id}-rim`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0', 'stop-color': '#ffd1dc', 'stop-opacity': 0.75 }, rim);
    el('stop', { offset: '1', 'stop-color': '#ffd1dc', 'stop-opacity': 0.05 }, rim);

    const stemG = el('linearGradient', { id: `${id}-stem`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0', 'stop-color': '#3f8a4f' }, stemG);
    el('stop', { offset: '1', 'stop-color': '#173d22' }, stemG);
    const leafG = el('linearGradient', { id: `${id}-leaf`, x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    el('stop', { offset: '0', 'stop-color': '#1f5a31' }, leafG);
    el('stop', { offset: '1', 'stop-color': '#4aa461' }, leafG);

    const sheen = el('radialGradient', { id: `${id}-sheen`, cx: '38%', cy: '30%', r: '70%' }, defs);
    el('stop', { offset: '0', 'stop-color': '#ffd9e0', 'stop-opacity': 0.16 }, sheen);
    el('stop', { offset: '0.55', 'stop-color': '#ffd9e0', 'stop-opacity': 0.04 }, sheen);
    el('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': 0 }, sheen);

    const core = el('radialGradient', { id: `${id}-core`, cx: '50%', cy: '50%', r: '50%' }, defs);
    el('stop', { offset: '0', 'stop-color': '#3d0010', 'stop-opacity': 0.55 }, core);
    el('stop', { offset: '1', 'stop-color': '#3d0010', 'stop-opacity': 0 }, core);

    // ---------- الساق والأوراق ----------
    let stem = null, leaves = [];
    if (withStem) {
        stem = el('path', {
            d: `M${CX} 250 C 188 330, 214 425, 198 556`,
            stroke: `url(#${id}-stem)`, 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round'
        }, svg);

        const leafDef = [
            { x: 197, y: 450, flip: 1,  rot: -24, s: 1.15 },
            { x: 205, y: 388, flip: -1, rot: -30, s: 1.0 }
        ];
        leafDef.forEach(d => {
            const outer = el('g', { transform: `translate(${d.x} ${d.y}) scale(${d.flip * d.s} ${d.s}) rotate(${d.rot})` }, svg);
            const inner = el('g', { class: 'leaf' }, outer);
            el('path', { d: 'M0 0 C 16 -16, 56 -22, 92 -6 C 66 18, 26 20, 0 0 Z', fill: `url(#${id}-leaf)` }, inner);
            el('path', { d: 'M3 0 C 30 -4, 60 -6, 88 -6', stroke: '#173d22', 'stroke-width': 1.2, fill: 'none', opacity: 0.55 }, inner);
            leaves.push(inner);
        });
    }

    // ---------- رأس الوردة ----------
    const head = el('g', { id: `${id}-head` }, svg);
    const petals = [];   // { el, ring, angle }
    const rings = [];

    RINGS.forEach((r, ri) => {
        const ringG = el('g', { filter: `url(#${id}-sh)` }, head);
        rings.push(ringG);
        for (let i = 0; i < r.n; i++) {
            const jitter = (rand() - 0.5) * 14;
            const angle = r.off + (360 / r.n) * i + jitter;
            const L = r.L * (0.95 + rand() * 0.1);
            const w = r.w * (0.94 + rand() * 0.12);

            const outer = el('g', { transform: `translate(${CX} ${CY}) rotate(${angle.toFixed(1)})` }, ringG);
            const p = el('g', { class: 'petal' }, outer);
            el('path', { d: petalPath(L, w), fill: `url(#${id}-pg${ri})` }, p);
            el('path', { d: rimPath(L, w), fill: 'none', stroke: `url(#${id}-rim)`, 'stroke-width': 1.6, 'stroke-linecap': 'round' }, p);
            petals.push({ el: p, ring: ri, angle });
        }
    });

    // قلب الوردة: ظل ناعم ولفة صغيرة
    const centerShade = el('circle', { cx: CX, cy: CY, r: 30, fill: `url(#${id}-core)` }, head);
    const spiral = el('path', {
        d: `M${CX - 3} ${CY - 2} C ${CX - 8} ${CY - 10}, ${CX + 6} ${CY - 14}, ${CX + 10} ${CY - 4} ` +
           `C ${CX + 13} ${CY + 8}, ${CX - 4} ${CY + 14}, ${CX - 12} ${CY + 4} ` +
           `C ${CX - 19} ${CY - 8}, ${CX - 4} ${CY - 22}, ${CX + 14} ${CY - 16}`,
        fill: 'none', stroke: '#6b0b22', 'stroke-width': 1.5, 'stroke-linecap': 'round', opacity: 0.6
    }, head);

    // لمعة ضوء عامة فوق الرأس
    const gloss = el('circle', { cx: CX, cy: CY, r: 120, fill: `url(#${id}-sheen)`, 'pointer-events': 'none' }, head);

    return { svg, head, petals, rings, stem, leaves, centerShade, spiral, gloss, CX, CY };
}
