// ==========================================================================
// واجهة موحّدة للوردة: ثلاثية الأبعاد (three.js) إن توفر WebGL، وإلا رسم SVG احتياطي
// ==========================================================================
import { sfx } from './audio.js';
import { buildRose } from './rose.js';

const gsap = window.gsap;
const $ = (id) => document.getElementById(id);

export async function createRoseView() {
    try {
        const mod = await import('./rose3d.js');
        if (mod.webglOK()) return make3D(mod);
    } catch (err) {
        console.warn('3D rose unavailable, using SVG fallback:', err);
    }
    return make2D();
}

// ---------------------------------------------------------------------------
// ثلاثية الأبعاد
// ---------------------------------------------------------------------------
function make3D(mod) {
    const rose = new mod.Rose3D();
    const wrap = $('roseWrap');
    $('roseSvg').style.display = 'none';
    $('thanksRose').style.display = 'none';
    $('thanksRose3d').style.display = 'block';
    rose.mount(wrap);
    const S = rose.state;
    let aliveTls = [];

    const reset = () => Object.assign(S, { grow: 0, bloom: 0, sepal: 0, leaf: 0, pulse: 0, burst: 0 });
    reset();
    rose.warm();                       // تجميع الظلال مسبقاً لتفادي التقطيع عند البدء

    return {
        kind: '3d',
        prepare() { reset(); rose.setFraming('full'); rose.start(); },

        // الساق تنمو، ثم البرعم يتفتح ويزدهر
        growTl() {
            const tl = gsap.timeline();
            tl.to(S, { grow: 1, duration: 2.4, ease: 'power2.inOut' }, 0);
            tl.to(S, { leaf: 1, duration: 2.0, ease: 'power2.out' }, 1.3);
            tl.to(S, { sepal: 1, duration: 4.4, ease: 'power2.inOut' }, 3.4);
            tl.to(S, { bloom: 1, duration: 6.4, ease: 'sine.inOut' }, 3.0);
            for (let i = 0; i < 6; i++) tl.call(() => sfx.bloomNote(i), null, 3.4 + i * 1.0);
            return tl;
        },

        // نبض القلب + بتلات تتساقط برفق
        alive() {
            const hb = gsap.timeline({ repeat: -1, repeatDelay: 0.85 });
            hb.call(() => sfx.heartbeat())
              .to(S, { pulse: 1, duration: 0.16, ease: 'power2.out' })
              .to('#glow', { opacity: 1, scale: 1.07, duration: 0.16, ease: 'power2.out' }, '<')
              .to(S, { pulse: -0.1, duration: 0.18, ease: 'power1.inOut' })
              .to(S, { pulse: 0.55, duration: 0.14, ease: 'power2.out' })
              .to('#glow', { opacity: 0.8, scale: 1, duration: 0.5, ease: 'power1.out' }, '<')
              .to(S, { pulse: 0, duration: 0.5, ease: 'power2.inOut' });
            aliveTls.push(hb);

            rose.fallen.forEach((f, i) => {
                const tl = gsap.timeline({ repeat: -1, delay: 1.2 + i * 2.6, repeatDelay: 1.5 });
                const sx = (Math.random() - 0.5) * 1.2, sz = (Math.random() - 0.2) * 0.9;
                tl.set(f.mesh, { visible: true })
                  .fromTo(f.mat, { opacity: 0 }, { opacity: 0.95, duration: 0.7 }, 0)
                  .fromTo(f.mesh.position, { x: sx, y: 3.9, z: sz }, { x: sx + (Math.random() - 0.5) * 1.6, y: 0.5, z: sz + 0.4, duration: 6, ease: 'sine.inOut' }, 0)
                  .fromTo(f.mesh.rotation, { x: 0.4, y: Math.random() * 3, z: 0 }, { x: 2.6, y: '+=4', z: 1.8, duration: 6, ease: 'sine.inOut' }, 0)
                  .to(f.mat, { opacity: 0, duration: 1.6, ease: 'power1.in' }, 4.4);
                aliveTls.push(tl);
            });
        },
        stopAlive() {
            aliveTls.forEach(t => t.kill()); aliveTls = [];
            rose.fallen.forEach(f => { f.mesh.visible = false; });
            gsap.to(S, { pulse: 0, duration: 0.3 });
        },

        // لمسة الوردة: تتفتت وتتلاشى
        burstTl() {
            const tl = gsap.timeline();
            tl.to(S, { burst: 1, duration: 1.1, ease: 'power2.in' }, 0);
            tl.to('#roseWrap', { scale: 1.35, y: -10, duration: 1.1, ease: 'power2.in' }, 0);
            return tl;
        },

        // مشهد الشكر: الوردة تنتقل إلى هناك وتتفتح من جديد
        thanks() {
            this.stopAlive();
            gsap.killTweensOf(S);
            gsap.set('#roseWrap', { scale: 1, y: 0 });
            rose.mount($('thanksRose3d'));
            rose.setFraming('head');
            Object.assign(S, { grow: 1, bloom: 0, sepal: 0, leaf: 1, pulse: 0, burst: 0 });
            rose.start();
            const tl = gsap.timeline();
            tl.to(S, { bloom: 1, duration: 3.2, ease: 'sine.inOut' }, 0);
            tl.to(S, { sepal: 1, duration: 2.6, ease: 'power2.inOut' }, 0.5);
            tl.add(() => this.alive(), 3.0);
            return tl;
        },
        stopAll() { this.stopAlive(); rose.stop(); }
    };
}

// ---------------------------------------------------------------------------
// SVG احتياطي (عند غياب WebGL)
// ---------------------------------------------------------------------------
function make2D() {
    const rose = buildRose($('roseSvg'), 'main');
    let aliveTls = [];

    function setClosed(r) {
        const { petals, sepals, leaves, stem, gloss, drops, head, CX, CY } = r;
        petals.forEach(p => gsap.set(p.el, { transformOrigin: '50% 100%', scale: 0.24, rotation: -38, opacity: 0 }));
        sepals.forEach(s => gsap.set(s.el, { transformOrigin: '50% 100%', rotation: -s.angle + gsap.utils.random(-14, 14), scale: 0.5, opacity: 0 }));
        gsap.set(gloss, { opacity: 0 });
        gsap.set(drops, { opacity: 0 });
        gsap.set(head, { svgOrigin: `${CX} ${CY}`, scale: 0.8 });
        if (leaves.length) gsap.set(leaves, { transformOrigin: '0% 55%', scale: 0, rotation: -12 });
        if (stem) {
            const len = stem.getTotalLength();
            gsap.set(stem, { strokeDasharray: len, strokeDashoffset: len });
        }
    }
    function bloomTl(r, speed = 1, withSound = false) {
        const tl = gsap.timeline();
        const { petals, sepals, gloss, drops, head } = r;
        const s = speed;
        tl.to(petals.map(p => p.el), { opacity: 1, duration: 0.9 * s, stagger: { each: 0.012 * s } }, 0);
        tl.to(sepals.map(x => x.el), { opacity: 1, duration: 0.8 * s, stagger: 0.07 }, 0);
        tl.to(head, { scale: 0.92, duration: 1.1 * s, ease: 'sine.inOut' }, 0);
        tl.to(sepals.map(x => x.el), { rotation: 0, scale: 1, duration: 3.4 * s, ease: 'power2.inOut', stagger: { each: 0.12 * s, from: 'center' } }, 1.7 * s);
        const open = 2.0 * s;
        petals.forEach(p => tl.to(p.el, { scale: 1, rotation: 0, duration: (2.3 + p.t * 0.7) * s, ease: 'power3.out' }, open + p.t * 1.9 * s));
        tl.to(head, { scale: 1, duration: 4.2 * s, ease: 'power2.out' }, open);
        tl.fromTo(head, { rotation: -7 }, { rotation: 0, duration: 4.6 * s, ease: 'power2.out' }, open);
        if (withSound) for (let i = 0; i < 6; i++) tl.call(() => sfx.bloomNote(i), null, open + 0.25 * s + i * 0.55 * s);
        tl.to(gloss, { opacity: 1, duration: 2.2 * s }, open + 2.2 * s);
        tl.to(drops, { opacity: 1, duration: 1.2 * s, stagger: 0.5 }, open + 3.6 * s);
        return tl;
    }
    setClosed(rose);
    let small = null;

    return {
        kind: '2d',
        prepare() { /* الحالة المغلقة مضبوطة مسبقاً */ },
        growTl() {
            const tl = gsap.timeline();
            tl.to(rose.stem, { strokeDashoffset: 0, duration: 1.7, ease: 'power2.inOut' }, 0);
            tl.to(rose.leaves, { scale: 1, rotation: 0, duration: 1.2, ease: 'back.out(1.4)', stagger: 0.3 }, 0.9);
            tl.add(bloomTl(rose, 1, true), 1.0);
            return tl;
        },
        alive() {
            const { head, CX, CY } = rose;
            const hb = gsap.timeline({ repeat: -1, repeatDelay: 0.85 });
            hb.call(() => sfx.heartbeat())
              .to(head, { scale: 1.04, svgOrigin: `${CX} ${CY}`, duration: 0.16, ease: 'power2.out' })
              .to('#glow', { opacity: 1, scale: 1.07, duration: 0.16 }, '<')
              .to(head, { scale: 0.995, duration: 0.18 })
              .to(head, { scale: 1.022, duration: 0.14, ease: 'power2.out' })
              .to('#glow', { opacity: 0.8, scale: 1, duration: 0.5 }, '<')
              .to(head, { scale: 1, duration: 0.5, ease: 'power2.inOut' });
            aliveTls.push(hb);
            aliveTls.push(gsap.to('#roseSvg', { rotation: 1.2, transformOrigin: '50% 95%', duration: 3.6, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
        },
        stopAlive() { aliveTls.forEach(t => t.kill()); aliveTls = []; },
        burstTl() {
            const tl = gsap.timeline();
            tl.to(rose.petals.map(p => p.el), {
                scale: 1.4, rotation: () => gsap.utils.random(-30, 30), opacity: 0,
                duration: 1.0, ease: 'power2.in', stagger: { each: 0.018 }, overwrite: true
            }, 0);
            tl.to(rose.sepals.map(s => s.el), { opacity: 0, duration: 0.6 }, 0);
            tl.to(rose.head, { scale: 1.5, duration: 1.1, ease: 'power2.in', overwrite: true }, 0);
            tl.to('#roseWrap', { scale: 1.5, y: -20, duration: 1.1, ease: 'power2.in' }, 0);
            return tl;
        },
        thanks() {
            this.stopAlive();
            gsap.set('#roseWrap', { scale: 1, y: 0 });
            small = buildRose($('thanksRose'), 'sm', { stem: false });
            setClosed(small);
            return bloomTl(small, 0.5, false);
        },
        stopAll() { this.stopAlive(); }
    };
}
