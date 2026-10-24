// ==========================================================================
// المنطق الكامل: الطرفية ← الوردة ← الاستبيان ← الشكر (كلها بـ GSAP)
// ==========================================================================
import { firebaseConfig, DB_PATHS, QUESTIONS } from './config.js';
import { buildRose } from './rose.js';

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

// ---------- أدوات المشاهد ----------
const scenes = {
    terminal: $('sceneTerminal'),
    rose: $('sceneRose'),
    survey: $('sceneSurvey'),
    thanks: $('sceneThanks')
};
gsap.set(scenes.terminal, { autoAlpha: 1 });

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

    masterTl = gsap.timeline({ delay: 0.5 });

    // دخول الطرفية
    masterTl.fromTo(terminal, { autoAlpha: 0, y: 18, scale: 0.97 },
                    { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out' }, 0);
    masterTl.to('#skipBtn', { opacity: 0.65, duration: 0.8 }, 1);

    // كتابة الأسطر بالتتابع (قصّ أفقي: يتفادى مشاكل اتجاه النص)
    let t = 0.8;
    inners.forEach((inner, i) => {
        const dur = 0.32 + (i % 3) * 0.07;
        masterTl.call(() => lineEls[i].appendChild(cursor), null, t);
        masterTl.to(inner, { clipPath: 'inset(0 0% 0 0)', duration: dur, ease: 'none' }, t);
        t += dur + 0.09;
    });

    // الانهيار
    masterTl.add(crashTl(codeArea, terminal, cursor), t + 0.5);
}

function crashTl(codeArea, terminal, cursor) {
    const tl = gsap.timeline();
    tl.call(() => cursor.remove());
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
        }, null, 0.25 + i * 0.26);
    });

    // إطفاء الشاشة على طريقة التلفاز القديم
    const off = 0.25 + fakeErrors.length * 0.26 + 0.7;
    tl.to(terminal, { scaleY: 0.012, duration: 0.28, ease: 'power3.in' }, off);
    tl.to(terminal, { scaleX: 0, duration: 0.22, ease: 'power3.in' }, off + 0.28);
    tl.to('#scan', { opacity: 0, duration: 0.2 }, off + 0.28);
    tl.add(() => toRose(), off + 0.9);
    return tl;
}

$('skipBtn').addEventListener('click', () => masterTl && masterTl.timeScale(7));
document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && masterTl && masterTl.progress() < 1 && scenes.terminal.style.visibility !== 'hidden') {
        masterTl.timeScale(7);
    }
});

// =========================================================================
// مشهد 2 — الوردة
// =========================================================================
const rose = buildRose($('roseSvg'), 'main');
let roseReady = false;
let particleTweens = [];
let fallTweens = [];

function setRoseClosed() {
    const { petals, leaves, stem, centerShade, spiral, gloss, CX, CY } = rose;
    petals.forEach(p => {
        const closed = 0.12 + p.ring * 0.0;
        gsap.set(p.el, { transformOrigin: '50% 100%', scale: closed, rotation: -26, opacity: 0 });
    });
    gsap.set([centerShade, spiral, gloss], { opacity: 0 });
    gsap.set(leaves, { transformOrigin: '0% 55%', scale: 0, rotation: -12 });
    if (stem) {
        const len = stem.getTotalLength();
        gsap.set(stem, { strokeDasharray: len, strokeDashoffset: len });
    }
    gsap.set($('roseCaption'), { opacity: 0, y: 14 });
    gsap.set($('glow'), { opacity: 0, scale: 0.7 });
}
setRoseClosed();

function makeParticles() {
    const box = $('particles');
    for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const s = 2 + Math.random() * 3;
        p.style.cssText += `left:${Math.random() * 100}%;width:${s}px;height:${s}px;`;
        box.appendChild(p);
        particleTweens.push(gsap.fromTo(p,
            { y: 0, x: 0, opacity: 0 },
            {
                y: () => -(window.innerHeight + 40), x: (Math.random() - 0.5) * 80,
                keyframes: undefined,
                opacity: 0.8, duration: 7 + Math.random() * 6, delay: Math.random() * 6,
                ease: 'none', repeat: -1,
                onRepeat() { gsap.set(p, { opacity: 0 }); }
            }));
        // يظهر ثم يخفت
        gsap.to(p, { opacity: 0.85, duration: 1, delay: 1 + Math.random() * 3 });
    }
}

function makeFallingPetals() {
    const wrap = $('roseWrap');
    for (let i = 0; i < 4; i++) {
        const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        s.setAttribute('viewBox', '-10 -22 20 24');
        s.classList.add('falling-petal');
        s.innerHTML = `<path d="M0 0 C -8 -3 -10 -14 -4 -19 C -2 -21 2 -21 4 -19 C 10 -14 8 -3 0 0Z" fill="#e0405f" opacity=".95"/>`;
        wrap.appendChild(s);
        const startX = 28 + Math.random() * 44;
        gsap.set(s, { left: startX + '%', top: '28%' });
        const tl = gsap.timeline({ repeat: -1, delay: 0.8 + i * 1.9, repeatDelay: 1.2 });
        tl.fromTo(s, { opacity: 0, y: 0, x: 0, rotation: Math.random() * 90 },
            {
                opacity: 0.9, duration: 0.6, ease: 'power1.out'
            })
          .to(s, {
              y: () => wrap.clientHeight * 0.55,
              x: () => (Math.random() - 0.5) * wrap.clientWidth * 0.6,
              rotation: '+=240', duration: 5.2, ease: 'sine.inOut'
          }, 0)
          .to(s, { opacity: 0, duration: 1.4, ease: 'power1.in' }, 3.8);
        fallTweens.push(tl);
    }
}

function toRose() {
    gsap.set(scenes.terminal, { autoAlpha: 0 });
    gsap.set(scenes.rose, { autoAlpha: 1 });
    document.title = '🌹';
    makeParticles();

    const { petals, leaves, stem, centerShade, spiral, gloss, head } = rose;
    const tl = gsap.timeline({ delay: 0.3 });

    tl.fromTo(scenes.rose, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out' }, 0);
    tl.to('#glow', { opacity: 1, scale: 1, duration: 3.5, ease: 'power2.out' }, 0.2);

    // الساق ترتفع ثم الأوراق
    tl.to(stem, { strokeDashoffset: 0, duration: 1.7, ease: 'power2.inOut' }, 0.5);
    tl.to(leaves, { scale: 1, rotation: 0, duration: 1.1, ease: 'back.out(1.5)', stagger: 0.28 }, 1.3);

    // البرعم: يظهر من الداخل
    const bloomStart = 1.9;
    petals.forEach(p => {
        const innerFirst = (5 - p.ring);                 // الداخلية أولاً
        tl.to(p.el, { opacity: 1, duration: 0.5, ease: 'power1.out' }, bloomStart + innerFirst * 0.07);
    });

    // التفتّح: كل حلقة تكبر وتدور برقة، من الداخل إلى الخارج
    [5, 4, 3, 2, 1, 0].forEach((ring, k) => {
        const els = petals.filter(p => p.ring === ring).map(p => p.el);
        const at = bloomStart + 0.25 + k * 0.42;
        tl.to(els, {
            scale: 1, rotation: 0,
            duration: 2.1 + k * 0.12,
            ease: 'power3.out',
            stagger: { each: 0.06, from: 'random' }
        }, at);
        // ارتداد خفيف في الحجم: كأن البتلة تتنفس عند انفتاحها
        tl.fromTo(els, { y: 0 }, { y: -1, duration: 0.9, yoyo: true, repeat: 1, ease: 'sine.inOut' }, at + 1.2);
    });

    tl.to([centerShade, spiral], { opacity: 1, duration: 1.6 }, bloomStart + 1.2);
    tl.to(gloss, { opacity: 1, duration: 2, ease: 'power1.inOut' }, bloomStart + 2.2);

    // رأس الوردة: ميلان رقيق وهي تتفتح
    tl.fromTo(head, { transformOrigin: '50% 40%', rotation: -6 },
              { rotation: 0, duration: 4.4, ease: 'power2.out' }, bloomStart);

    tl.to($('roseCaption'), { opacity: 1, y: 0, duration: 1.4, ease: 'power2.out' }, bloomStart + 3.6);
    tl.add(() => {
        roseReady = true;
        // تنفّس هادئ للوردة
        gsap.to('#roseSvg', { rotation: 1.4, transformOrigin: '50% 95%', duration: 3.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
        gsap.to(petals.map(p => p.el), {
            scale: 1.018, duration: 2.6, yoyo: true, repeat: -1, ease: 'sine.inOut',
            stagger: { each: 0.1, from: 'random' }
        });
        gsap.fromTo('#roseCaption .l2', { opacity: 0.45 }, { opacity: 1, duration: 1.3, yoyo: true, repeat: -1, ease: 'sine.inOut' });
        makeFallingPetals();
    }, bloomStart + 4.4);
}

scenes.rose.addEventListener('click', () => {
    if (!roseReady) return;
    roseReady = false;
    particleTweens.forEach(t => t.kill());
    fallTweens.forEach(t => t.kill());

    const { petals } = rose;
    const tl = gsap.timeline();
    tl.to('#roseCaption', { opacity: 0, y: 10, duration: 0.35 }, 0);
    tl.to(petals.map(p => p.el), {
        scale: 1.35, rotation: () => gsap.utils.random(-25, 25), opacity: 0,
        duration: 1.0, ease: 'power2.in', stagger: { each: 0.025, from: 'start' },
        overwrite: true
    }, 0);
    tl.to('#roseWrap', { scale: 1.6, y: -20, duration: 1.1, ease: 'power2.in' }, 0);
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
const stepLabel = $('stepLabel');
const progressFill = $('progressFill');
const escapeNote = $('escapeNote');

let currentIndex = 0;
const userAnswers = {};
let started = false;

function toSurvey() {
    document.title = 'استبيان';
    gsap.set(scenes.survey, { autoAlpha: 1 });
    gsap.fromTo('#card', { y: 50, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 1.0, ease: 'power3.out' });
    renderQuestion(0);
    started = true;
}

function renderQuestion(dir = 0) {
    const q = QUESTIONS[currentIndex];
    resetTrap();

    questionText.textContent = q.text;
    stepLabel.textContent = `سؤال ${currentIndex + 1} من ${QUESTIONS.length}`;
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

    // دخول السؤال: الشريحة تنزلق، والإجابات تتتابع
    const fromX = dir === 0 ? 0 : (dir > 0 ? 46 : -46);
    gsap.fromTo([stepLabel, questionText], { x: fromX, y: dir === 0 ? 16 : 0, opacity: 0 },
        { x: 0, y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.08, delay: dir === 0 ? 0.35 : 0 });
    gsap.fromTo(answersList.children, { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.07, delay: dir === 0 ? 0.55 : 0.15 });

    if (q.isTrap && userAnswers[q.id]) evaluateTrap(q, userAnswers[q.id]);
}

function changeQuestion(dir) {
    if (changing) return;
    changing = true;
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
let changing = false;

function selectAnswer(question, answer, btnEl) {
    userAnswers[question.id] = answer;
    [...answersList.children].forEach(b => b.classList.remove('selected'));
    btnEl.classList.add('selected');
    gsap.fromTo(btnEl, { scale: 0.96 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1.1, 0.5)' });
    nextBtn.disabled = false;
    if (question.isTrap) evaluateTrap(question, answer);
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

// ---------- الزر الهارب (للأسئلة المفخخة) ----------
// الزر لا يترك مكانه في التخطيط: نحركه فقط بـ x/y (GSAP) فلا يقفز شيء آخر.
const noteLines = ['!حاولي مرة أخرى 😏', 'أسرع منكِ! 🏃', 'الزر يخجل منكِ 🙈', 'كدتِ تمسكينه! 🤏', 'هيا، لا تستسلمي 😂'];
let trapActive = false;
let trapDone = {};            // سؤال انتهى فخه فلا يعاد
let trapTimers = [];
let noteIdx = 0;

function naturalRect() {
    const r = nextBtn.getBoundingClientRect();
    return {
        left: r.left - gsap.getProperty(nextBtn, 'x'),
        top: r.top - gsap.getProperty(nextBtn, 'y'),
        w: r.width, h: r.height
    };
}
function moveBtnTo(left, top, dur = 0.38, ease = 'back.out(2.2)') {
    const n = naturalRect();
    const m = 12;
    const L = Math.min(Math.max(left, m), window.innerWidth - n.w - m);
    const T = Math.min(Math.max(top, m), window.innerHeight - n.h - m);
    gsap.to(nextBtn, { x: L - n.left, y: T - n.top, duration: dur, ease, overwrite: true });
}
function showNote() {
    escapeNote.textContent = noteLines[noteIdx++ % noteLines.length];
    gsap.fromTo(escapeNote, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, overwrite: true });
}

function resetTrap() {
    trapTimers.forEach(clearTimeout);
    trapTimers = [];
    trapActive = false;
    document.removeEventListener('pointermove', onPointerMove);
    nextBtn.classList.remove('escaping');
    gsap.killTweensOf(nextBtn);
    gsap.set(nextBtn, { x: 0, y: 0, rotation: 0 });
    gsap.killTweensOf(escapeNote);
    gsap.set(escapeNote, { opacity: 0 });
}

function evaluateTrap(q, answer) {
    if (answer === q.requiredAnswer) {
        // الجواب الرومانسي: الزر يستقر فوراً مع نبضة فرح
        if (trapActive) settleTrap(true);
        return;
    }
    if (trapActive || trapDone[q.id]) return;
    startTrap(q);
}

function startTrap(q) {
    trapActive = true;
    trapDone[q.id] = true;
    nextBtn.classList.add('escaping');
    showNote();

    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) {
        // الجوال: قفزات عشوائية ثم يستقر
        let jumps = 0;
        const jump = () => {
            if (!trapActive) return;
            jumps++;
            const n = naturalRect();
            moveBtnTo(30 + Math.random() * (window.innerWidth - n.w - 60),
                      80 + Math.random() * (window.innerHeight - n.h - 160), 0.34);
            if (jumps % 2 === 1) showNote();
            if (jumps < 5) trapTimers.push(setTimeout(jump, 520 + Math.random() * 220));
            else trapTimers.push(setTimeout(() => settleTrap(false), 700));
        };
        jump();
    } else {
        // الحاسوب: يهرب من المؤشر لمدة قصيرة
        document.addEventListener('pointermove', onPointerMove);
        trapTimers.push(setTimeout(() => settleTrap(false), 3000));
    }
}

function onPointerMove(e) {
    if (!trapActive) return;
    const r = nextBtn.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = cx - e.clientX, dy = cy - e.clientY;
    const dist = Math.hypot(dx, dy);
    if (dist > 150) return;
    const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.9;
    const push = 130 + Math.random() * 50;
    moveBtnTo(r.left + Math.cos(angle) * push, r.top + Math.sin(angle) * push, 0.32);
    if (Math.random() < 0.3) showNote();
}

function settleTrap(happy) {
    trapTimers.forEach(clearTimeout);
    trapTimers = [];
    document.removeEventListener('pointermove', onPointerMove);
    trapActive = false;
    gsap.to(nextBtn, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.55)', overwrite: true,
        onComplete: () => nextBtn.classList.remove('escaping') });
    gsap.fromTo(nextBtn, { scale: 1.08 }, { scale: 1, duration: 0.6, ease: 'power2.out', delay: 0.9 });
    escapeNote.textContent = happy ? 'هذا هو الجواب الصحيح 😌' : 'حسناً… سأرحمكِ هذه المرة 😅';
    gsap.fromTo(escapeNote, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4 });
    gsap.to(escapeNote, { opacity: 0, duration: 0.6, delay: 2.2 });
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

    // حفظ مع مهلة 5 ثوانٍ: مهما حدث، لن تعلق الصفحة
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
// مشهد 4 — الشكر + الرسالة الكوميدية
// =========================================================================
function romanticScore() {
    return QUESTIONS.filter(q => q.isTrap && userAnswers[q.id] === q.requiredAnswer).length;
}

const verdicts = [
    { pct: 37,  html: 'لاحظتُ أنكِ لم تختاري <b>أي</b> جواب رومانسي 🧐<br>سجّلتُ ذلك في ملفكِ، وسأذكّركِ به في أول مناسبة 😏' },
    { pct: 78,  html: 'جواب رومانسي واحد فقط من اثنين…<br>نصف حب ونصف مكابرة 😌 سأعتبرها بداية جيدة وأمنحكِ فرصة ثانية.' },
    { pct: 100, html: 'مستوى الحب: <b>100%</b> 😍<br>اخترتِ «أنت عمري» رغم الزر الهارب… تأكدتُ الآن أنكِ لا تستطيعين الهرب مني.' }
];

function toThanks() {
    // وردة صغيرة مفتوحة بلا ساق
    const small = buildRose($('thanksRose'), 'sm', { stem: false });

    const tl = gsap.timeline();
    tl.to('#flashRed', { opacity: 0.6, duration: 0.35, ease: 'power2.in' });
    tl.add(() => {
        gsap.set(scenes.survey, { autoAlpha: 0 });
        gsap.set(scenes.thanks, { autoAlpha: 1 });
        document.title = 'شكراً';
    });
    tl.to('#flashRed', { opacity: 0, duration: 0.8 });

    // الوردة الصغيرة تتفتح بسرعة
    gsap.set(small.petals.map(p => p.el), { transformOrigin: '50% 100%', scale: 0.1, rotation: -20, opacity: 0 });
    [5, 4, 3, 2, 1, 0].forEach((ring, k) => {
        const els = small.petals.filter(p => p.ring === ring).map(p => p.el);
        tl.to(els, { scale: 1, rotation: 0, opacity: 1, duration: 1.3, ease: 'power3.out', stagger: 0.04 }, 0.7 + k * 0.17);
    });
    tl.from('#thanksTitle', { y: 20, opacity: 0, duration: 0.9, ease: 'power3.out' }, 1.6);
    tl.from('#thanksSub', { y: 16, opacity: 0, duration: 0.9, ease: 'power3.out' }, 1.9);

    // لحظة "التحليل" الكوميدية
    const v = verdicts[Math.min(romanticScore(), verdicts.length - 1)];
    const counter = { n: 0 };
    tl.set('#analysis', { visibility: 'visible' }, 3.6);
    tl.from('#analysis', { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out' }, 3.6);
    tl.to('#meterFill', { width: v.pct + '%', duration: 2.6, ease: 'power2.inOut' }, 4.4);
    tl.to(counter, {
        n: v.pct, duration: 2.6, ease: 'power2.inOut',
        onUpdate: () => { $('meterPct').textContent = Math.round(counter.n) + '%'; }
    }, 4.4);
    tl.add(() => {
        $('verdict').innerHTML = v.html;
        gsap.from('#verdict', { y: 10, opacity: 0, duration: 0.9, ease: 'power2.out' });
        gsap.fromTo('#analysis .a-title', { opacity: 1 }, { opacity: 0.5, duration: 0.4 });
        $('analysis').querySelector('.a-title').textContent = 'اكتمل التحليل ✓';
    }, 7.2);
}

// ---------- ابدأ ----------
playIntro();
