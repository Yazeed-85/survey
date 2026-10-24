// ==========================================================================
// أصوات مولَّدة بالكود (WebAudio) — لا ملفات صوت ولا روابط خارجية
// المتصفحات تمنع الصوت قبل أول لمسة، لذلك نبدأ السياق عند أول تفاعل.
// ==========================================================================

let ctx = null;
let master = null;
let muted = false;
let noiseBuf = null;
let pad = null;

try { muted = localStorage.getItem('muted') === '1'; } catch (e) {}

export function initAudio() {
    try {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            ctx = new AC();
            const comp = ctx.createDynamicsCompressor();
            master = ctx.createGain();
            master.gain.value = muted ? 0 : 0.7;
            master.connect(comp);
            comp.connect(ctx.destination);

            noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
            const d = noiseBuf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { console.warn('audio init failed', e); }
}

export function isMuted() { return muted; }
export function setMuted(m) {
    muted = m;
    try { localStorage.setItem('muted', m ? '1' : '0'); } catch (e) {}
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.7, ctx.currentTime, 0.05);
}

const ok = () => ctx && ctx.state === 'running' && !muted;
const now = () => ctx.currentTime;

// نغمة واحدة بغلاف صوتي (attack/decay)
function tone(freq, { type = 'sine', dur = 0.3, vol = 0.1, attack = 0.005, delay = 0, slideTo = null, lp = null } = {}) {
    if (!ok()) return;
    const t = now() + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); node = f; }
    node.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
}

// ضجيج مفلتر
function noise({ dur = 0.1, vol = 0.1, type = 'bandpass', f1 = 2000, f2 = null, q = 1, delay = 0, attack = 0.002 } = {}) {
    if (!ok()) return;
    const t = now() + delay;
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter();
    fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f1, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.05);
}

const PENT = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5];

// جرس ناعم دافئ
function bell(freq, { vol = 0.07, dur = 2.2, delay = 0 } = {}) {
    tone(freq, { type: 'sine', dur, vol, attack: 0.012, delay });
    tone(freq * 2, { type: 'sine', dur: dur * 0.6, vol: vol * 0.35, attack: 0.01, delay });
    tone(freq * 3.01, { type: 'sine', dur: dur * 0.3, vol: vol * 0.12, attack: 0.008, delay });
}

export const sfx = {
    // --- الطرفية ---
    typeLine(dur) {
        if (!ok()) return;
        const n = Math.max(3, Math.round(dur / 0.05));
        for (let i = 0; i < n; i++) {
            const d = (i / n) * dur + Math.random() * 0.012;
            noise({ dur: 0.022, vol: 0.09 + Math.random() * 0.05, f1: 2600 + Math.random() * 1800, q: 1.4, delay: d });
            tone(1500 + Math.random() * 500, { type: 'square', dur: 0.012, vol: 0.012, delay: d });
        }
        // "رجوع السطر"
        tone(240, { type: 'triangle', dur: 0.05, vol: 0.04, delay: dur + 0.01 });
    },
    glitch() {
        noise({ dur: 0.55, vol: 0.22, f1: 6000, f2: 400, q: 2.5 });
        tone(140, { type: 'sawtooth', dur: 0.5, vol: 0.12, slideTo: 38, lp: 900 });
        tone(1900, { type: 'square', dur: 0.08, vol: 0.05, delay: 0.05 });
        tone(950, { type: 'square', dur: 0.07, vol: 0.05, delay: 0.17 });
        noise({ dur: 0.3, vol: 0.12, f1: 3000, f2: 200, q: 3, delay: 0.5 });
    },
    error(i = 0) {
        const base = [440, 392, 349, 311, 262][i % 5];
        tone(base, { type: 'square', dur: 0.1, vol: 0.075, lp: 2400 });
        tone(base * 0.5, { type: 'square', dur: 0.14, vol: 0.06, delay: 0.1, lp: 1800 });
        noise({ dur: 0.05, vol: 0.05, f1: 3500, q: 1 });
    },
    powerDown() {
        tone(260, { type: 'sine', dur: 0.75, vol: 0.28, slideTo: 24 });
        tone(130, { type: 'triangle', dur: 0.7, vol: 0.12, slideTo: 20, lp: 500 });
        noise({ dur: 0.6, vol: 0.13, type: 'lowpass', f1: 2500, f2: 80, q: 0.7 });
        tone(7000, { type: 'sine', dur: 0.2, vol: 0.035, slideTo: 1800, delay: 0.5 });
    },

    // --- الوردة ---
    grow() {
        noise({ dur: 1.9, vol: 0.05, type: 'bandpass', f1: 180, f2: 900, q: 0.8, attack: 0.5 });
        [0, 0.35, 0.7, 1.05].forEach((d, i) => tone(196 * Math.pow(1.5, 0.5 * i) , { dur: 1.1, vol: 0.025, attack: 0.3, delay: d, lp: 700 }));
    },
    bloomNote(i) {
        bell(PENT[Math.min(i, PENT.length - 1)], { vol: 0.075, dur: 2.6 });
        bell(PENT[Math.min(i, PENT.length - 1)] / 2, { vol: 0.035, dur: 3 });
    },
    ready() {
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => bell(f, { vol: 0.05, dur: 3.2, delay: i * 0.11 }));
    },
    heartbeat() {
        tone(78, { type: 'sine', dur: 0.2, vol: 0.2, slideTo: 42 });
        tone(70, { type: 'sine', dur: 0.2, vol: 0.13, slideTo: 38, delay: 0.2 });
    },
    roseTap() {
        [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => bell(f, { vol: 0.06, dur: 1.6, delay: i * 0.07 }));
        noise({ dur: 0.9, vol: 0.07, type: 'bandpass', f1: 400, f2: 4500, q: 0.8, attack: 0.25 });
    },

    // --- الاستبيان ---
    select() { tone(660, { dur: 0.09, vol: 0.05, slideTo: 780 }); noise({ dur: 0.03, vol: 0.03, f1: 4000 }); },
    next() { noise({ dur: 0.22, vol: 0.05, type: 'bandpass', f1: 500, f2: 3000, q: 1.2 }); },
    flee() {
        tone(320, { type: 'sine', dur: 0.14, vol: 0.07, slideTo: 760 });
        noise({ dur: 0.1, vol: 0.04, f1: 2500, f2: 6000, q: 1 });
    },
    correct() {
        bell(659.25, { vol: 0.07, dur: 1.4 });
        bell(987.77, { vol: 0.065, dur: 1.8, delay: 0.12 });
    },

    // --- الشكر ---
    meter(dur) {
        if (!ok()) return;
        tone(260, { type: 'triangle', dur, vol: 0.05, slideTo: 1040, attack: 0.2, lp: 2200 });
        const n = Math.round(dur / 0.12);
        for (let i = 0; i < n; i++) tone(900 + i * 14, { dur: 0.025, vol: 0.02, delay: (i / n) * dur });
    },
    stamp() {
        tone(95, { type: 'sine', dur: 0.35, vol: 0.4, slideTo: 38 });
        noise({ dur: 0.14, vol: 0.2, type: 'lowpass', f1: 1800, f2: 150, q: 0.8 });
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, { vol: 0.06, dur: 2.4, delay: 0.18 + i * 0.09 }));
    }
};

// --- موسيقى هادئة دافئة (طبقة صوتية ممتدة) ---
export const padSound = {
    start(level = 0.07, fade = 3.5) {
        if (!ok() || pad) return;
        const out = ctx.createGain();
        out.gain.setValueAtTime(0.0001, now());
        out.gain.linearRampToValueAtTime(level, now() + fade);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.3;
        // نبض بطيء للفلتر: كأن الصوت يتنفس
        const lfo = ctx.createOscillator(); const lg = ctx.createGain();
        lfo.frequency.value = 0.12; lg.gain.value = 260;
        lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
        lp.connect(out); out.connect(master);

        const oscs = [];
        // Cmaj9 دافئ: دو، صول، مي، سي، ري
        [65.41, 98.0, 130.81, 196.0, 261.63, 329.63, 493.88].forEach((f, i) => {
            [-4, 4].forEach(det => {
                const o = ctx.createOscillator();
                o.type = i < 2 ? 'sine' : 'triangle';
                o.frequency.value = f; o.detune.value = det;
                const g = ctx.createGain(); g.gain.value = i < 2 ? 0.9 : 0.35 / (1 + i * 0.25);
                o.connect(g); g.connect(lp); o.start(); oscs.push(o);
            });
        });
        pad = { out, oscs, lfo };
    },
    level(v, t = 2) { if (pad) pad.out.gain.setTargetAtTime(v, now(), t / 3); },
    stop(t = 2.5) {
        if (!pad) return;
        const p = pad; pad = null;
        p.out.gain.setTargetAtTime(0.0001, now(), t / 3);
        setTimeout(() => { p.oscs.forEach(o => { try { o.stop(); } catch (e) {} }); try { p.lfo.stop(); } catch (e) {} }, t * 1000 + 300);
    }
};
