// ==========================================================================
// المنطق الكامل: دخول ← طرفية ← وردة ← استبيان ← شكر/ختم ← عودة للبداية
// ==========================================================================
import { firebaseConfig, DB_PATHS, QUESTIONS as DEFAULT_QUESTIONS } from './config.js';
import { createRoseView } from './roseview.js';
import { initAudio, unlock, sfx, padSound, isMuted, setMuted, fadeOutAll } from './audio.js';

const $ = (id) => document.getElementById(id);
const gsap = window.gsap;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduceMotion) gsap.globalTimeline.timeScale(4);

// ---------- الأسئلة: من config.js، وتُستبدل بنسخة اللوحة إن وُجدت ----------
let QUESTIONS = DEFAULT_QUESTIONS;
function validQuestions(list) {
    return Array.isArray(list) && list.length > 0 && list.every(q =>
        q && typeof q.id === 'string' && typeof q.text === 'string' && Array.isArray(q.answers) && q.answers.length >= 2 &&
        (!q.isTrap || q.answers.includes(q.requiredAnswer)));
}

// ---------- Firebase: يُحمَّل بالخلفية، وفشله لا يوقف الصفحة ----------
const firebasePromise = (async () => {
    try {
        const [appMod, dbMod] = await Promise.all([
            import('https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js'),
            import('https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js')
        ]);
        const app = appMod.initializeApp(firebaseConfig);
        const fb = { db: dbMod.getDatabase(app), ...dbMod };
        // أسئلة معدّلة من اللوحة (اختياري)
        try {
            const snap = await Promise.race([
                fb.get(fb.ref(fb.db, DB_PATHS.metadata + '/questions')),
                new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000))
            ]);
            if (snap.exists()) {
                const list = snap.val();
                const arr = Array.isArray(list) ? list.filter(Boolean) : Object.values(list);
                if (validQuestions(arr) && !surveyStarted) QUESTIONS = arr;
            }
        } catch (e) { /* نستخدم الأسئلة الافتراضية */ }
        return fb;
    } catch (err) {
        console.warn('Firebase unavailable:', err);
        return null;
    }
})();
let surveyStarted = false;

const scenes = {
    terminal: $('sceneTerminal'),
    rose: $('sceneRose'),
    survey: $('sceneSurvey'),
    thanks: $('sceneThanks')
};

// ---------- الوردة ----------
const viewPromise = createRoseView().catch(err => { console.error(err); return null; });
let view = null;
viewPromise.then(v => { view = v; });

// ---------- زر الكتم ----------
const muteBtn = $('muteBtn');
const paintMute = () => { muteBtn.textContent = isMuted() ? '🔇' : '🔊'; };
paintMute();
muteBtn.addEventListener('click', (e) => { e.stopPropagation(); initAudio(); setMuted(!isMuted()); paintMute(); });

// أي لمسة لاحقة تفتح الصوت إن كان المتصفح قد أوقفه (سفاري يحتاج click/touchend لا pointerdown)
['click', 'touchend', 'keydown'].forEach(ev => document.addEventListener(ev, () => unlock(), { passive: true }));

// =========================================================================
// بوابة الدخول: النقرة تشغّل الصوت والكود في اللحظة نفسها
// =========================================================================
let started = false;
function begin() {
    if (started) return;
    started = true;
    initAudio();                                      // داخل حدث النقر مباشرة (شرط سفاري)
    $('gate').style.pointerEvents = 'none';
    gsap.to('#gate', { opacity: 0, duration: 0.7, ease: 'power2.out', onComplete: () => $('gate').remove() });
    gsap.set(scenes.terminal, { autoAlpha: 1 });
    playIntro();
}
$('gate').addEventListener('click', begin);

// =========================================================================
// مشهد 1 — الطرفية
// =========================================================================
const P = (t) => `<span class="punc">${t}</span>`;
const codeLines = [
    `<span class="cmt">&lt;!-- Project: Lamar's Heart --&gt;</span>`,
    `${P('&lt;')}<span class="tag">div</span> <span class="attr">class</span>${P('=')}<span class="val">"Lamar"</span>${P('&gt;')}`,
    `  ${P('&lt;')}<span class="tag">header</span> <span class="attr">class</span>${P('=')}<span class="val">"heart"</span>${P('&gt;')}`,
    `    ${P('&lt;')}<span class="tag">h1</span>${P('&gt;')}<span class="hearts">♥ ♥ ♥</span>${P('&lt;/')}<span class="tag">h1</span>${P('&gt;')}`,
    `    ${P('&lt;')}<span class="tag">p</span>${P('&gt;')}<span class="txt">loading Lamar's heart...</span>${P('&lt;/')}<span class="tag">p</span>${P('&gt;')}`,
    `  ${P('&lt;/')}<span class="tag">header</span>${P('&gt;')}`,
    `  ${P('&lt;')}<span class="tag">button</span> <span class="attr">id</span>${P('=')}<span class="val">"startBtn"</span>${P('&gt;')}<span class="txt">Begin</span>${P('&lt;/')}<span class="tag">button</span>${P('&gt;')}`,
    `${P('&lt;/')}<span class="tag">div</span>${P('&gt;')}`,
    ``,
    `${P('&lt;')}<span class="tag">script</span>${P('&gt;')}`,
    `  <span class="cmt">// preparing the connection</span>`,
    `  <span class="txt">const</span> lamar ${P('=')} <span class="val">{ love: Infinity }</span>${P(';')}`,
    `  <span class="txt">function</span> <span class="tag">render</span>${P('() {')}`,
    `    connect${P('(')}<span class="val">'lamar_heart.json'</span>${P(');')}`,
    `    lamar${P('.')}ready ${P('=')} <span class="val">true</span>${P(';')}`,
    `  ${P('}')}`,
    `${P('&lt;/')}<span class="tag">script</span>${P('&gt;')}`
];

const fakeErrors = [
    'Uncaught ReferenceError: heart is not defined',
    'RangeError: Lamar.love exceeds Infinity ♥',
    'Fatal: lamar_heart.json failed to parse',
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

    masterTl = gsap.timeline({ delay: 0.25 });
    masterTl.fromTo(terminal, { autoAlpha: 0, y: 18, scale: 0.97 },
                    { autoAlpha: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' }, 0);

    let t = 0.6;
    inners.forEach((inner, i) => {
        const dur = 0.30 + (i % 3) * 0.07;
        masterTl.call(() => { lineEls[i].appendChild(cursor); if (codeLines[i]) sfx.typeLine(dur); }, null, t);
        masterTl.to(inner, { clipPath: 'inset(0 0% 0 0)', duration: dur, ease: 'none' }, t);
        t += dur + 0.08;
    });

    masterTl.add(crashTl(codeArea, terminal, cursor), t + 0.5);

    // لمسة على المشهد = تسريع (بلا أي نص يشرح ذلك)
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
let roseReady = false;
let particleTweens = [];

gsap.set($('roseCaption'), { opacity: 0, y: 14 });
gsap.set('#glow', { opacity: 0, scale: 0.7 });

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

async function toRose() {
    if (!view) view = await viewPromise;
    gsap.set(scenes.terminal, { autoAlpha: 0 });
    gsap.set(scenes.rose, { autoAlpha: 1 });
    document.title = '             ';
    makeParticles();
    padSound.start(0.075, 4);
    sfx.grow();

    if (!view) {                      // لا وردة إطلاقاً: نكمل بالنص فقط
        gsap.to('#roseCaption', { opacity: 1, y: 0, duration: 1 });
        roseReady = true;
        return;
    }
    view.prepare();

    const tl = gsap.timeline({ delay: 0.3 });
    tl.fromTo(scenes.rose, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out' }, 0);
    tl.to('#glow', { opacity: 0.8, scale: 1, duration: 4, ease: 'power2.out' }, 0.2);
    const grow = view.growTl();
    tl.add(grow, 0.6);
    const end = 0.6 + grow.duration();

    tl.to('#roseCaption', { opacity: 1, y: 0, duration: 1.4, ease: 'power2.out' }, end - 1.8);
    tl.add(() => {
        roseReady = true;
        sfx.ready();
        gsap.fromTo('#roseCaption .l1', { opacity: 0.55 }, { opacity: 1, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
        view.alive();
    }, end - 0.2);
}

scenes.rose.addEventListener('click', () => {
    if (!roseReady) return;
    roseReady = false;
    particleTweens.forEach(t => t.kill());
    sfx.roseTap();
    padSound.level(0.035, 2);

    const tl = gsap.timeline();
    tl.to('#roseCaption', { opacity: 0, y: 10, duration: 0.35, overwrite: true }, 0);
    if (view) { view.stopAlive(); tl.add(view.burstTl(), 0); }
    tl.to('#flashRed', { opacity: 0.85, duration: 0.45, ease: 'power2.in' }, 0.7);
    tl.add(() => {
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
    surveyStarted = true;
    if (view) view.stopAll && view.stopAll();
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

    if (q.isTrap && userAnswers[q.id]) evaluateTrap(q, userAnswers[q.id]);
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
    if (question.isTrap) evaluateTrap(question, answer);
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
// أثناء الهروب يُنقل الزر إلى <body> بوضع fixed ويُترك مكانه فارغاً داخل البطاقة،
// فلا يدفع البطاقة ولا يغيّر التخطيط ولا يولّد تمريراً.
let trapActive = false;
let lastFlee = 0;
let lastPointer = null;
let placeholder = null;
let base = null;                       // موضع الزر الثابت (fixed) قبل التحريك

function rectsOverlap(a, b, pad = 0) {
    return !(a.right + pad < b.left || a.left - pad > b.right || a.bottom + pad < b.top || a.top - pad > b.bottom);
}

function flee(from) {
    if (!trapActive || !base) return;
    const t = performance.now();
    if (t - lastFlee < 160) return;
    lastFlee = t;

    const m = 14;
    const blocked = [answersList.getBoundingClientRect(), backBtn.getBoundingClientRect()];
    let best = null, bestScore = -Infinity;
    for (let i = 0; i < 28; i++) {
        const L = m + Math.random() * Math.max(window.innerWidth - base.w - m * 2, 1);
        const T = m + Math.random() * Math.max(window.innerHeight - base.h - m * 2, 1);
        const rect = { left: L, top: T, right: L + base.w, bottom: T + base.h };
        const hit = blocked.some(b => rectsOverlap(rect, b, 8));
        const d = from ? Math.hypot(L + base.w / 2 - from.x, T + base.h / 2 - from.y) : 200;
        const score = d - (hit ? 100000 : 0);
        if (score > bestScore) { bestScore = score; best = { L, T }; }
    }
    sfx.flee();
    gsap.to(nextBtn, { x: best.L - base.left, y: best.T - base.top, rotation: gsap.utils.random(-6, 6),
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
    if (nearButton(e.clientX, e.clientY, 90)) flee(lastPointer);
}
function swallowClick(e) { if (trapActive) { e.stopImmediatePropagation(); e.preventDefault(); } }

const navRow = nextBtn.parentNode;      // مكان الزر الأصلي
let returnTimer = null;
let trapState = 'home';                  // home | fleeing | returning

function engageTrap() {
    if (trapActive) return;
    if (trapState === 'returning') finalizeReturn();   // لو كان عائداً نثبّته أولاً ثم نبدأ من جديد
    trapActive = true;
    trapState = 'fleeing';
    const r = nextBtn.getBoundingClientRect();
    base = { left: r.left, top: r.top, w: r.width, h: r.height };

    placeholder = document.createElement('div');
    placeholder.style.cssText = `flex:1;height:${r.height}px;`;
    nextBtn.parentNode.insertBefore(placeholder, nextBtn);

    gsap.set(nextBtn, { x: 0, y: 0 });
    nextBtn.classList.add('escaping');
    Object.assign(nextBtn.style, {
        position: 'fixed', left: r.left + 'px', top: r.top + 'px',
        width: r.width + 'px', height: r.height + 'px', margin: '0', flex: 'none', zIndex: '95'
    });
    document.body.appendChild(nextBtn);

    nextBtn.tabIndex = -1;
    nextBtn.setAttribute('aria-disabled', 'true');
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerdown', onPointerDown, true);
    nextBtn.addEventListener('click', swallowClick, true);
    flee(lastPointer);
}

// إعادة الزر إلى مكانه الأصلي فوراً وبشكل مضمون (مهما كانت حالته)
function restoreButton() {
    clearTimeout(returnTimer);
    gsap.killTweensOf(nextBtn);
    if (placeholder) {
        if (placeholder.parentNode) placeholder.parentNode.insertBefore(nextBtn, placeholder);
        placeholder.remove();
        placeholder = null;
    }
    if (nextBtn.parentNode !== navRow) navRow.appendChild(nextBtn);   // شبكة أمان
    nextBtn.removeAttribute('style');
    nextBtn.classList.remove('escaping');
    gsap.set(nextBtn, { clearProps: 'all' });
    base = null;
    trapState = 'home';
}
function finalizeReturn() { restoreButton(); }

function releaseTrap(animate) {
    const was = trapState;
    trapActive = false;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerdown', onPointerDown, true);
    nextBtn.removeEventListener('click', swallowClick, true);
    nextBtn.tabIndex = 0;
    nextBtn.removeAttribute('aria-disabled');

    if (animate && was === 'fleeing' && placeholder && base) {
        trapState = 'returning';
        const tr = placeholder.getBoundingClientRect();
        gsap.to(nextBtn, { x: tr.left - base.left, y: tr.top - base.top, rotation: 0, duration: 0.45,
            ease: 'power3.out', overwrite: true, onComplete: finalizeReturn });
        returnTimer = setTimeout(finalizeReturn, 650);   // احتياط: يعود حتى لو تعطلت الحركة
    } else {
        restoreButton();
    }
}
function resetTrap() { releaseTrap(false); }

// حارس: إن لم يكن الفخ فعّالاً فلا يجوز أن يبقى الزر خارج مكانه أبداً
setInterval(() => {
    if (!trapActive && trapState !== 'returning' && (nextBtn.parentNode !== navRow || placeholder)) restoreButton();
}, 400);

function evaluateTrap(q, answer) {
    if (answer === q.requiredAnswer) {
        if (trapActive) releaseTrap(true);
        else if (trapState !== 'home' && trapState !== 'returning') restoreButton();
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
// مشهد 4 — الشكر + شريط 100% + ختم "كفو" + العودة للبداية
// =========================================================================
function toThanks() {
    const tl = gsap.timeline();
    tl.to('#flashRed', { opacity: 0.6, duration: 0.35, ease: 'power2.in' });
    tl.add(() => {
        gsap.set(scenes.survey, { autoAlpha: 0 });
        gsap.set(scenes.thanks, { autoAlpha: 1 });
        document.title = 'شكراً';
        sfx.roseTap();
    });
    tl.to('#flashRed', { opacity: 0, duration: 0.8 });

    if (view) tl.add(view.thanks(), 0.6);
    tl.from('#thanksTitle', { y: 20, opacity: 0, duration: 0.9, ease: 'power3.out' }, 1.8);

    // الشريط حتى 100%
    const counter = { n: 0 };
    tl.set('#analysis', { visibility: 'visible' }, 3.0);
    tl.from('#analysis', { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out' }, 3.0);
    tl.call(() => sfx.meter(2.6), null, 3.8);
    tl.to('#meterFill', { width: '100%', duration: 2.6, ease: 'power2.inOut' }, 3.8);
    tl.to(counter, {
        n: 100, duration: 2.6, ease: 'power2.inOut',
        onUpdate: () => { $('meterPct').textContent = Math.round(counter.n) + '%'; }
    }, 3.8);

    // ختم "كفو"
    tl.set('#stamp', { visibility: 'visible', opacity: 0, scale: 3.2, rotation: -26 }, 6.7);
    tl.to('#stamp', { opacity: 1, scale: 1, rotation: -11, duration: 0.28, ease: 'power4.in' }, 6.7);
    tl.call(() => { sfx.stamp(); padSound.level(0.09, 1.5); }, null, 6.98);
    tl.to('.thanks-rose3d, .thanks-rose, #thanksTitle', { y: 4, duration: 0.05, yoyo: true, repeat: 3, ease: 'none' }, 6.98);
    tl.to('#stamp', { scale: 1.07, duration: 0.12, ease: 'power2.out' }, 6.98)
      .to('#stamp', { scale: 1, rotation: -9, duration: 0.7, ease: 'elastic.out(1, 0.45)' });

    // بعد لحظة تأمل: يخفت الصوت وتظلم الشاشة ثم نعود لبوابة "دخول" كأن الرابط فُتح للتو
    tl.add(endSequence, 11.6);
}

function endSequence() {
    padSound.stop(2.2);
    fadeOutAll(2.2);
    if (view && view.stopAll) setTimeout(() => view.stopAll(), 2400);
    gsap.to('#blackout', { opacity: 1, duration: 2.0, ease: 'power2.inOut', onComplete: () => {
        setTimeout(() => { window.location.reload(); }, 450);
    }});
}
