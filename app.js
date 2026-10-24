// ==========================================================================
// المنطق الكامل: الطرفية ← الوردة ← الاستبيان ← الشكر (GSAP + أصوات WebAudio)
// ==========================================================================
import { firebaseConfig, DB_PATHS, QUESTIONS } from './config.js';
import { buildRose } from './rose.js';
import { initAudio, sfx, padSound, isMuted, setMuted } from './audio.js';

const $ = (id) => document.getElementById(id);
const gsap = window.gsap;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduceMotion) gsap.globalTimeline.timeScale(4);

// ---------- Firebase: يُحمَّل بالخلفية، وفشله لا يوقف الصفحة ----------
const firebasePromise = (async () => {
    try {
        const [appMod, dbMod] = await Promise.all([
            import('https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js'),
            import('https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js')
        ]);
        const app = appMod.initializeApp(firebaseConfig);
        return { db: dbMod.getDatabase(app), ...dbMod };
    } catch (err) {
        console.warn('Firebase unavailable:', err);
        return null;
    }
})();

const scenes = {
    terminal: $('sceneTerminal'),
    rose: $('sceneRose'),
    survey: $('sceneSurvey'),
    thanks: $('sceneThanks')
};

// ---------- زر الكتم ----------
const muteBtn = $('muteBtn');
const paintMute = () => { muteBtn.textContent = isMuted() ? '🔇' : '🔊'; };
paintMute();
muteBtn.addEventListener('click', (e) => { e.stopPropagation(); initAudio(); setMuted(!isMuted()); paintMute(); });

// أي لمسة لاحقة تفتح الصوت إن كان المتصفح قد منعه
['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
    document.addEventListener(ev, () => initAudio(), { passive: true }));

// =========================================================================
// البوابة: نقطة نابضة. أول لمسة تشغّل الصوت والعرض. (بدونها يبدأ العرض صامتاً بعد 5 ثوانٍ)
// =========================================================================
let started = false;
function begin() {
    if (started) return;
    started = true;
    $('gate').style.pointerEvents = 'none';
    gsap.to('#gate', { opacity: 0, duration: 0.9, ease: 'power2.out', onComplete: () => $('gate').remove() });
    gsap.set(scenes.terminal, { autoAlpha: 1 });
    playIntro();
}
$('gate').addEventListener('pointerdown', () => { initAudio(); begin(); });
document.addEventListener('keydown', (e) => { if (!started && (e.key === 'Enter' || e.key === ' ')) { initAudio(); begin(); } });
setTimeout(begin, 5000);

// =========================================================================
// مشهد 1 — الطرفية
// =========================================================================
const codeLines = [
    `<span class="cmt">&lt;!-- Loading experience --&gt;</span>`,
    `<span class="punc">&lt;</span><span class="tag">div</span> <span class="attr">class</span><span class="punc">=</span><span class="val">"rose-container"</span><span class="punc">&gt;</span>`,
    `  <span class="punc">&lt;</span><span class="tag">header</span> <span class="attr">class</span><span class="punc">=</span><span class="val">"intro"</span><span class="punc">&gt;</span>`,
    `    <span class="punc">&lt;</span><span class="tag">h1</span><span class="punc">&gt;</span><span class="txt">Something is loading</span><span class="punc">&lt;/</span><span class="tag">h1</span><span class="punc">&gt;</span>`,
    `  <span class="punc">&lt;/</span><span class="tag">header</span><span class="punc">&gt;</span>`,
    `  <span class="punc">&lt;</span><span class="tag">button</span> <span class="attr">id</span><span class="punc">=</span><span class="val">"startBtn"</span><span class="punc">&gt;</span><span class="txt">Begin</span><span class="punc">&lt;/</span><span class="tag">button</span><span class="punc">&gt;</span>`,
    `<span class="punc">&lt;/</span><span class="tag">div</span><span class="punc">&gt;</span>`,
    ``,
    `<span class="punc">&lt;</span><span class="tag">script</span><span class="punc">&gt;</span>`,
    `  <span class="cmt">// preparing the connection</span>`,
    `  <span class="txt">const</span> state <span class="punc">=</span> <span class="val">{ ready: false }</span><span class="punc">;</span>`,
    `  <span class="txt">function</span> <span class="tag">render</span><span class="punc">() {</span>`,
    `    connect<span class="punc">(</span><span class="val">'emotions.json'</span><span class="punc">);</span>`,
    `    state<span class="punc">.</span>ready <span class="punc">=</span> <span class="val">true</span><span class="punc">;</span>`,
    `  <span class="punc">}</span>`,
    `<span class="punc">&lt;/</span><span class="tag">script</span><span class="punc">&gt;</span>`
];

const fakeErrors = [
    'Uncaught ReferenceError: heart is not defined',
    'SyntaxError: unexpected token at line 247',
    'Fatal: emotions.json failed to parse',
    'TypeError: Cannot read property "feelings" of null',
    'Process terminated unexpectedly.'
];

let masterTl;

function playIntro() {
    const codeArea = $('codeArea');
    const terminal = $('terminal');
    const cursor = document.createElement('span');
    cursor.className = 'cursor';

    const lineEls = codeLines.map(html => {
        const d = document.createElement('div');
        d.className = 'code-line';
        d.innerHTML = `<span class="inner" style="display:inline-block">${html}</span>`;
        codeArea.appendChild(d);
        return d;
    });
    const inners = lineEls.map(d => d.firstChild);
    gsap.set(inners, { clipPath: 'inset(0 100% 0 0)' });

    masterTl = gsap.timeline({ delay: 0.4 });
    masterTl.fromTo(terminal, { autoAlpha: 0, y: 18, scale: 0.97 },
                    { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out' }, 0);

    let t = 0.8;
    inners.forEach((inner, i) => {
        const dur = 0.32 + (i % 3) * 0.07;
        masterTl.call(() => { lineEls[i].appendChild(cursor); if (codeLines[i]) sfx.typeLine(dur); }, null, t);
        masterTl.to(inner, { clipPath: 'inset(0 0% 0 0)', duration: dur, ease: 'none' }, t);
        t += dur + 0.09;
    });

    masterTl.add(crashTl(codeArea, terminal, cursor), t + 0.5);

    // لمسة على المشهد = تسريع (دون أي نص يشرح ذلك)
    scenes.terminal.addEventListener('pointerdown', () => masterTl.timeScale(7));
}

function crashTl(codeArea, terminal, cursor) {
    const tl = gsap.timeline();
    tl.call(() => { cursor.remove(); sfx.glitch(); });
    tl.to('#flash', { opacity: 0.9, duration: 0.06 })
      .to('#flash', { opacity: 0, duration: 0.2 });
    tl.to('#scan', { opacity: 1, duration: 0.1 }, '<');
    tl.to(terminal, {
        keyframes: { x: [-5, 5, -4, 4, -3, 3, 0], y: [2, -2, 2, -3, 1, 0, 0] },
        duration: 0.5, ease: 'none', repeat: 3
    }, '<');
    tl.to('#scan', { opacity: 0.35, duration: 0.12, repeat: 18, yoyo: true, ease: 'steps(1)' }, '<');

    fakeErrors.forEach((msg, i) => {
        tl.call(() => {
            const e = document.createElement('div');
            e.className = 'error-line';
            e.textContent = '✗ ' + msg;
            codeArea.appendChild(e);
            gsap.from(e, { x: -8, opacity: 0, duration: 0.25 });
            sfx.error(i);
        }, null, 0.3 + i * 0.3);
    });

    const off = 0.3 + fakeErrors.length * 0.3 + 0.6;
    tl.call(() => sfx.powerDown(), null, off);
    tl.to(terminal, { scaleY: 0.012, duration: 0.28, ease: 'power3.in' }, off);
    tl.to(terminal, { scaleX: 0, duration: 0.22, ease: 'power3.in' }, off + 0.28);
    tl.to('#scan', { opacity: 0, duration: 0.2 }, off + 0.28);
    tl.add(() => toRose(), off + 0.95);
    return tl;
}

// =========================================================================
// مشهد 2 — الوردة (برعم يتفتح ويزدهر وينبض)
// =========================================================================
const rose = buildRose($('roseSvg'), 'main');
let roseReady = false;
let particleTweens = [];
let fallTweens = [];
let heartbeatTl = null;

function setRoseClosed(r, svgId) {
    const { petals, sepals, leaves, stem, gloss, drops, head, CX, CY } = r;
    petals.forEach(p => gsap.set(p.el, { transformOrigin: '50% 100%', scale: 0.24, rotation: -38, opacity: 0 }));
    sepals.forEach(s => gsap.set(s.el, { transformOrigin: '50% 100%', rotation: -s.angle + gsap.utils.random(-14, 14), scale: 0.5, opacity: 0 }));
    gsap.set(gloss, { opacity: 0 });
    gsap.set(r.drops, { opacity: 0 });
    gsap.set(head, { svgOrigin: `${CX} ${CY}`, scale: 0.8 });
    if (leaves.length) gsap.set(leaves, { transformOrigin: '0% 55%', scale: 0, rotation: -12 });
    if (stem) {
        const len = stem.getTotalLength();
        gsap.set(stem, { strokeDasharray: len, strokeDashoffset: len });
    }
}
setRoseClosed(rose);
gsap.set($('roseCaption'), { opacity: 0, y: 14 });
gsap.set('#glow', { opacity: 0, scale: 0.7 });

// تفتّح الوردة: يُستخدم للوردة الكبيرة والصغيرة (speed < 1 = أسرع)
function bloomTl(r, at = 0, speed = 1, withSound = false) {
    const tl = gsap.timeline();
    const { petals, sepals, gloss, drops, head } = r;
    const s = speed;

    // البرعم يظهر
    tl.to(petals.map(p => p.el), { opacity: 1, duration: 0.9 * s, ease: 'power1.out', stagger: { each: 0.012 * s, from: 'start' } }, 0);
    tl.to(sepals.map(x => x.el), { opacity: 1, duration: 0.8 * s, stagger: 0.07 }, 0);
    tl.to(head, { scale: 0.92, duration: 1.1 * s, ease: 'sine.inOut' }, 0);

    // الكأس الخضراء تنطوي للأسفل
    tl.to(sepals.map(x => x.el), { rotation: 0, scale: 1, duration: 3.4 * s, ease: 'power2.inOut', stagger: { each: 0.12 * s, from: 'center' } }, 1.7 * s);

    // البتلات تنفتح من القلب إلى الخارج بتتابع دقيق
    const open = 2.0 * s;
    petals.forEach(p => {
        tl.to(p.el, {
            scale: 1, rotation: 0,
            duration: (2.3 + p.t * 0.7) * s,
            ease: 'power3.out'
        }, open + p.t * 1.9 * s);
    });
    tl.to(head, { scale: 1, duration: 4.2 * s, ease: 'power2.out' }, open);
    tl.fromTo(head, { rotation: -7 }, { rotation: 0, duration: 4.6 * s, ease: 'power2.out' }, open);

    if (withSound) {
        // ست نغمات دافئة تتصاعد مع تفتح كل طبقة
        for (let i = 0; i < 6; i++) tl.call(() => sfx.bloomNote(i), null, open + 0.25 * s + i * 0.55 * s);
    }

    tl.to(gloss, { opacity: 1, duration: 2.2 * s, ease: 'power1.inOut' }, open + 2.2 * s);
    tl.to(drops, { opacity: 1, duration: 1.2 * s, stagger: 0.5, ease: 'power1.out' }, open + 3.6 * s);
    return tl;
}

function makeParticles() {
    const box = $('particles');
    for (let i = 0; i < 18; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const sz = 2 + Math.random() * 3;
        p.style.cssText += `left:${Math.random() * 100}%;width:${sz}px;height:${sz}px;`;
        box.appendChild(p);
        const tl = gsap.timeline({ repeat: -1, delay: Math.random() * 6 });
        tl.fromTo(p, { y: 0, x: 0, opacity: 0 },
            { y: -(window.innerHeight + 40), x: (Math.random() - 0.5) * 80, duration: 8 + Math.random() * 6, ease: 'none' }, 0)
          .to(p, { opacity: 0.8, duration: 1.5, ease: 'power1.out' }, 0)
          .to(p, { opacity: 0, duration: 2, ease: 'power1.in' }, '>-2.5');
        particleTweens.push(tl);
    }
}

function makeFallingPetals() {
    const wrap = $('roseWrap');
    for (let i = 0; i < 4; i++) {
        const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        s.setAttribute('viewBox', '-10 -22 20 24');
        s.classList.add('falling-petal');
        s.innerHTML = `<path d="M0 0 C -8 -3 -10 -14 -4 -19 C -2 -21 2 -21 4 -19 C 10 -14 8 -3 0 0Z" fill="#b8132f"/>`;
        wrap.appendChild(s);
        gsap.set(s, { left: (28 + Math.random() * 44) + '%', top: '30%' });
        const tl = gsap.timeline({ repeat: -1, delay: 1 + i * 2.1, repeatDelay: 1.2 });
        tl.fromTo(s, { opacity: 0, y: 0, x: 0, rotation: Math.random() * 90 }, { opacity: 0.9, duration: 0.6, ease: 'power1.out' })
          .to(s, {
              y: () => wrap.clientHeight * 0.5,
              x: () => (Math.random() - 0.5) * wrap.clientWidth * 0.6,
              rotation: '+=240', duration: 5.2, ease: 'sine.inOut'
          }, 0)
          .to(s, { opacity: 0, duration: 1.4, ease: 'power1.in' }, 3.8);
        fallTweens.push(tl);
    }
}

// نبض القلب: الوردة تنبض مع إضاءة الخلفية
function startHeartbeat() {
    const { head, CX, CY } = rose;
    heartbeatTl = gsap.timeline({ repeat: -1, repeatDelay: 0.85 });
    heartbeatTl
        .call(() => sfx.heartbeat())
        .to(head, { scale: 1.04, svgOrigin: `${CX} ${CY}`, duration: 0.16, ease: 'power2.out' })
        .to('#glow', { opacity: 1, scale: 1.07, duration: 0.16, ease: 'power2.out' }, '<')
        .to(head, { scale: 0.995, duration: 0.18, ease: 'power1.inOut' })
        .to(head, { scale: 1.022, duration: 0.14, ease: 'power2.out' })
        .to('#glow', { opacity: 0.8, scale: 1.0, duration: 0.5, ease: 'power1.out' }, '<')
        .to(head, { scale: 1, duration: 0.5, ease: 'power2.inOut' });
}

function toRose() {
    gsap.set(scenes.terminal, { autoAlpha: 0 });
    gsap.set(scenes.rose, { autoAlpha: 1 });
    document.title = '🌹';
    makeParticles();
    padSound.start(0.075, 4);
    sfx.grow();

    const { stem, leaves } = rose;
    const tl = gsap.timeline({ delay: 0.3 });

    tl.fromTo(scenes.rose, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out' }, 0);
    tl.to('#glow', { opacity: 0.8, scale: 1, duration: 4, ease: 'power2.out' }, 0.2);
    tl.to(stem, { strokeDashoffset: 0, duration: 1.7, ease: 'power2.inOut' }, 0.5);
    tl.to(leaves, { scale: 1, rotation: 0, duration: 1.2, ease: 'back.out(1.4)', stagger: 0.3 }, 1.4);

    const bloom = bloomTl(rose, 0, 1, true);
    tl.add(bloom, 1.5);
    const end = 1.5 + bloom.duration();

    tl.to('#roseCaption', { opacity: 1, y: 0, duration: 1.4, ease: 'power2.out' }, end - 2.2);
    tl.add(() => {
        roseReady = true;
        sfx.ready();
        gsap.to('#roseSvg', { rotation: 1.2, transformOrigin: '50% 95%', duration: 3.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
        gsap.fromTo('#roseCaption .l1', { opacity: 0.55 }, { opacity: 1, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
        startHeartbeat();
        makeFallingPetals();
    }, end - 0.4);
}

scenes.rose.addEventListener('click', () => {
    if (!roseReady) return;
    roseReady = false;
    particleTweens.forEach(t => t.kill());
    fallTweens.forEach(t => t.kill());
    if (heartbeatTl) heartbeatTl.kill();
    sfx.roseTap();
    padSound.level(0.035, 2);

    const { petals, head, sepals } = rose;
    const tl = gsap.timeline();
    tl.to('#roseCaption', { opacity: 0, y: 10, duration: 0.35, overwrite: true }, 0);
    tl.to(petals.map(p => p.el), {
        scale: 1.4, rotation: () => gsap.utils.random(-30, 30), opacity: 0,
        duration: 1.0, ease: 'power2.in', stagger: { each: 0.018, from: 'start' }, overwrite: true
    }, 0);
    tl.to(sepals.map(s => s.el), { opacity: 0, duration: 0.6 }, 0);
    tl.to(head, { scale: 1.5, duration: 1.1, ease: 'power2.in', overwrite: true }, 0);
    tl.to('#roseWrap', { scale: 1.5, y: -20, duration: 1.1, ease: 'power2.in' }, 0);
    tl.to('#flashRed', { opacity: 0.85, duration: 0.45, ease: 'power2.in' }, 0.7);
    tl.add(() => {
        gsap.killTweensOf('#roseSvg');
        gsap.set(scenes.rose, { autoAlpha: 0 });
        toSurvey();
    }, 1.2);
    tl.to('#flashRed', { opacity: 0, duration: 0.7, ease: 'power2.out' }, 1.2);
});

// =========================================================================
// مشهد 3 — الاستبيان
// =========================================================================
const qBody = $('qBody');
const questionText = $('questionText');
const answersList = $('answersList');
const nextBtn = $('nextBtn');
const backBtn = $('backBtn');
const progressFill = $('progressFill');

let currentIndex = 0;
const userAnswers = {};
let changing = false;

function toSurvey() {
    document.title = 'استبيان';
    gsap.set(scenes.survey, { autoAlpha: 1 });
    gsap.fromTo('#card', { y: 50, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 1.0, ease: 'power3.out' });
    renderQuestion(0);
}

function renderQuestion(dir = 0) {
    const q = QUESTIONS[currentIndex];
    resetTrap();

    questionText.textContent = q.text;
    gsap.to(progressFill, { width: `${(currentIndex / QUESTIONS.length) * 100}%`, duration: 0.7, ease: 'power3.out' });

    answersList.innerHTML = '';
    q.answers.forEach(answer => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'answer-btn';
        btn.textContent = answer;
        if (userAnswers[q.id] === answer) btn.classList.add('selected');
        btn.addEventListener('click', () => selectAnswer(q, answer, btn));
        answersList.appendChild(btn);
    });

    backBtn.style.visibility = currentIndex === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = currentIndex === QUESTIONS.length - 1 ? 'إرسال' : 'التالي';
    nextBtn.disabled = !userAnswers[q.id];

    const fromX = dir === 0 ? 0 : (dir > 0 ? 46 : -46);
    gsap.fromTo(questionText, { x: fromX, y: dir === 0 ? 16 : 0, opacity: 0 },
        { x: 0, y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: dir === 0 ? 0.35 : 0 });
    gsap.fromTo(answersList.children, { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.07, delay: dir === 0 ? 0.5 : 0.1 });

    if (q.isTrap && userAnswers[q.id]) evaluateTrap(q, userAnswers[q.id], true);
}

function changeQuestion(dir) {
    if (changing) return;
    changing = true;
    sfx.next();
    gsap.to(qBody, {
        x: dir > 0 ? -50 : 50, opacity: 0, duration: 0.32, ease: 'power2.in',
        onComplete() {
            currentIndex += dir;
            gsap.set(qBody, { x: 0, opacity: 1 });
            renderQuestion(dir);
            changing = false;
        }
    });
}

function selectAnswer(question, answer, btnEl) {
    userAnswers[question.id] = answer;
    [...answersList.children].forEach(b => b.classList.remove('selected'));
    btnEl.classList.add('selected');
    gsap.fromTo(btnEl, { scale: 0.96 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1.1, 0.5)' });
    nextBtn.disabled = false;
    if (question.isTrap) evaluateTrap(question, answer, false);
    else sfx.select();
}

backBtn.addEventListener('click', () => {
    if (currentIndex === 0 || changing) return;
    changeQuestion(-1);
});
nextBtn.addEventListener('click', () => {
    if (nextBtn.disabled || trapActive || changing) return;
    if (currentIndex < QUESTIONS.length - 1) changeQuestion(1);
    else submitSurvey();
});

// ---------- الزر الهارب ----------
// يهرب بلا توقف طالما الجواب غير المطلوب مختار، ولا يمكن الضغط عليه.
// يستقر فقط عند اختيار الجواب المطلوب. لا نصوص ولا تلميحات.
let trapActive = false;
let lastFlee = 0;
let lastPointer = null;

function rectsOverlap(a, b, pad = 0) {
    return !(a.right + pad < b.left || a.left - pad > b.right || a.bottom + pad < b.top || a.top - pad > b.bottom);
}
function naturalRect() {
    const r = nextBtn.getBoundingClientRect();
    return {
        left: r.left - gsap.getProperty(nextBtn, 'x'),
        top: r.top - gsap.getProperty(nextBtn, 'y'),
        w: r.width, h: r.height
    };
}

// يختار مكاناً بعيداً عن المؤشر ولا يغطي الأجوبة ولا زر "السابق"
function flee(from) {
    const t = performance.now();
    if (t - lastFlee < 160) return;
    lastFlee = t;

    const n = naturalRect();
    const m = 14;
    const blocked = [answersList.getBoundingClientRect(), backBtn.getBoundingClientRect()];
    let best = null, bestScore = -1;
    for (let i = 0; i < 24; i++) {
        const L = m + Math.random() * Math.max(window.innerWidth - n.w - m * 2, 1);
        const T = m + Math.random() * Math.max(window.innerHeight - n.h - m * 2, 1);
        const rect = { left: L, top: T, right: L + n.w, bottom: T + n.h };
        const hit = blocked.some(b => rectsOverlap(rect, b, 8));
        const d = from ? Math.hypot(L + n.w / 2 - from.x, T + n.h / 2 - from.y) : 200;
        const score = d - (hit ? 100000 : 0);
        if (score > bestScore) { bestScore = score; best = { L, T }; }
    }
    sfx.flee();
    gsap.to(nextBtn, { x: best.L - n.left, y: best.T - n.top, rotation: gsap.utils.random(-6, 6),
        duration: 0.42, ease: 'back.out(2.4)', overwrite: true });
}

function nearButton(x, y, radius) {
    const r = nextBtn.getBoundingClientRect();
    const dx = Math.max(r.left - x, 0, x - r.right);
    const dy = Math.max(r.top - y, 0, y - r.bottom);
    return Math.hypot(dx, dy) < radius;
}
function onPointerMove(e) {
    if (!trapActive) return;
    lastPointer = { x: e.clientX, y: e.clientY };
    if (nearButton(e.clientX, e.clientY, 120)) flee(lastPointer);
}
function onPointerDown(e) {
    if (!trapActive) return;
    lastPointer = { x: e.clientX, y: e.clientY };
    if (nearButton(e.clientX, e.clientY, 90)) { flee(lastPointer); }
}

function engageTrap() {
    if (trapActive) return;
    trapActive = true;
    nextBtn.classList.add('escaping');
    nextBtn.tabIndex = -1;
    nextBtn.setAttribute('aria-disabled', 'true');
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerdown', onPointerDown, true);
    nextBtn.addEventListener('click', swallowClick, true);
    flee(lastPointer);
}
function swallowClick(e) { if (trapActive) { e.stopImmediatePropagation(); e.preventDefault(); } }

function releaseTrap(animate) {
    const wasActive = trapActive;
    trapActive = false;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerdown', onPointerDown, true);
    nextBtn.removeEventListener('click', swallowClick, true);
    nextBtn.tabIndex = 0;
    nextBtn.removeAttribute('aria-disabled');
    if (animate && wasActive) {
        gsap.to(nextBtn, { x: 0, y: 0, rotation: 0, duration: 1.0, ease: 'elastic.out(1, 0.6)', overwrite: true,
            onComplete: () => nextBtn.classList.remove('escaping') });
        gsap.fromTo(nextBtn, { scale: 1.1 }, { scale: 1, duration: 0.6, ease: 'power2.out', delay: 0.8 });
    } else {
        gsap.killTweensOf(nextBtn);
        gsap.set(nextBtn, { x: 0, y: 0, rotation: 0, scale: 1 });
        nextBtn.classList.remove('escaping');
    }
}
function resetTrap() { releaseTrap(false); }

function evaluateTrap(q, answer, silent) {
    if (answer === q.requiredAnswer) {
        if (trapActive) { releaseTrap(true); }
        sfx.correct();
    } else {
        engageTrap();
    }
}

// ---------- الإرسال ----------
async function submitSurvey() {
    nextBtn.disabled = true;
    $('loading').style.display = 'flex';

    const now = new Date();
    const payload = {
        timestamp: now.getTime(),
        date: now.toLocaleDateString('ar-EG'),
        time: now.toLocaleTimeString('ar-EG'),
        answers: userAnswers
    };

    const save = (async () => {
        const fb = await firebasePromise;
        if (!fb) throw new Error('no firebase');
        const entry = fb.push(fb.ref(fb.db, DB_PATHS.results));
        await fb.set(entry, payload);
    })();
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000));
    try { await Promise.race([save, timeout]); }
    catch (err) { console.error('فشل حفظ البيانات:', err); }

    $('loading').style.display = 'none';
    toThanks();
}

// =========================================================================
// مشهد 4 — الشكر + شريط 100% + ختم "كفو"
// =========================================================================
function toThanks() {
    const small = buildRose($('thanksRose'), 'sm', { stem: false });
    setRoseClosed(small);
    gsap.set(small.head, { svgOrigin: `${small.CX} ${small.CY}`, scale: 0.8 });

    const tl = gsap.timeline();
    tl.to('#flashRed', { opacity: 0.6, duration: 0.35, ease: 'power2.in' });
    tl.add(() => {
        gsap.set(scenes.survey, { autoAlpha: 0 });
        gsap.set(scenes.thanks, { autoAlpha: 1 });
        document.title = 'شكراً';
        sfx.roseTap();
    });
    tl.to('#flashRed', { opacity: 0, duration: 0.8 });

    // وردة صغيرة تتفتح بسرعة
    tl.add(bloomTl(small, 0, 0.5, false), 0.6);
    tl.from('#thanksTitle', { y: 20, opacity: 0, duration: 0.9, ease: 'power3.out' }, 1.8);

    // الشريط: يمتلئ حتى 100%
    const counter = { n: 0 };
    tl.set('#analysis', { visibility: 'visible' }, 3.0);
    tl.from('#analysis', { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out' }, 3.0);
    tl.call(() => sfx.meter(2.6), null, 3.8);
    tl.to('#meterFill', { width: '100%', duration: 2.6, ease: 'power2.inOut' }, 3.8);
    tl.to(counter, {
        n: 100, duration: 2.6, ease: 'power2.inOut',
        onUpdate: () => { $('meterPct').textContent = Math.round(counter.n) + '%'; }
    }, 3.8);

    // ختم "كفو": ينزل بقوة
    tl.set('#stamp', { visibility: 'visible', opacity: 0, scale: 3.2, rotation: -26 }, 6.7);
    tl.to('#stamp', { opacity: 1, scale: 1, rotation: -11, duration: 0.28, ease: 'power4.in' }, 6.7);
    tl.call(() => {
        sfx.stamp();
        padSound.level(0.09, 1.5);
    }, null, 6.98);
    tl.to('.inner', { y: 5, duration: 0.05, yoyo: true, repeat: 3, ease: 'none' }, 6.98);
    tl.to('#stamp', { scale: 1.07, duration: 0.12, ease: 'power2.out' }, 6.98)
      .to('#stamp', { scale: 1, rotation: -9, duration: 0.7, ease: 'elastic.out(1, 0.45)' });
    tl.to('#stamp', { filter: 'drop-shadow(0 0 30px rgba(255,59,92,.8))', duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
}
