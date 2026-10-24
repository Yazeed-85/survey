// ==========================================================================
// وردة حمراء ثلاثية الأبعاد (three.js)
//  - 40 بتلة موزعة بالزاوية الذهبية كما في الورد الحقيقي
//  - كل بتلة سطح منحنٍ يُعاد تشكيله كل إطار: يلتف حول القلب وهي برعم، ثم ينفتح ويلتف طرفه للخارج
//  - إضاءة فيزيائية + ظلّ ذاتي بين البتلات + لمعة مخملية
// ==========================================================================
import * as THREE from './vendor/three.module.min.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

export function webglOK() {
    try {
        const c = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
}

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// --------------------------------------------------------------------------
// سطح منحنٍ: شبكة (u عرضاً، v طولاً) تُشكَّل على محور يتحرك في المستوى (نصف قطر، ارتفاع)
// --------------------------------------------------------------------------
class Surface {
    constructor(nu, nv, profile, colorFn) {
        this.nu = nu; this.nv = nv; this.profile = profile;
        const n = (nu + 1) * (nv + 1);
        this.pos = new Float32Array(n * 3);
        this.col = new Float32Array(n * 3);
        this.rows = new Float32Array(nv + 1);
        for (let j = 0; j <= nv; j++) this.rows[j] = profile(j / nv);

        const idx = [];
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
            const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
            idx.push(a, c, b, b, c, d);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
        g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
        g.setIndex(idx);
        this.geometry = g;

        // ألوان ثابتة لكل رأس
        for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
            const c = colorFn(-1 + (2 * i) / nu, j / nv);
            const o = (j * (nu + 1) + i) * 3;
            this.col[o] = c[0]; this.col[o + 1] = c[1]; this.col[o + 2] = c[2];
        }
        this.cu = new Float32Array(nu + 1);
        for (let i = 0; i <= nu; i++) this.cu[i] = -1 + (2 * i) / nu;
        this._rr = new Float32Array(nv + 1);
        this._hh = new Float32Array(nv + 1);
        this._ph = new Float32Array(nv + 1);
    }

    /**
     * p: { L, W, r0, h0, az, phi0, curl, lip, c (زاوية الالتفاف عند الحافة), wave, seed }
     */
    update(p) {
        const { nu, nv, pos, rows, cu, _rr: rr, _hh: hh, _ph: ph } = this;
        const ds = p.L / nv;
        let r = p.r0, h = p.h0;
        for (let j = 0; j <= nv; j++) {
            const v = j / nv;
            const phi = p.phi0 + p.curl * v * v + p.lip * Math.pow(v, 5);
            rr[j] = r; hh[j] = h; ph[j] = phi;
            r += Math.sin(phi) * ds; h += Math.cos(phi) * ds;
        }
        const ca = Math.cos(p.az), sa = Math.sin(p.az);
        const kappa = p.c / p.W;                   // انحناء العرض
        for (let j = 0; j <= nv; j++) {
            const v = j / nv;
            const hw = rows[j] * p.W;
            const cphi = Math.cos(ph[j]), sphi = Math.sin(ph[j]);
            // المحور العمودي على الاتجاه (نحو القلب/الأعلى)
            const nr = -cphi, nh = sphi;
            for (let i = 0; i <= nu; i++) {
                const u = cu[i];
                const x = u * hw;                  // الإزاحة الجانبية الخام
                let lat, inw;
                if (kappa > 1e-4) {
                    const a = kappa * x;
                    lat = Math.sin(a) / kappa;
                    inw = (1 - Math.cos(a)) / kappa;
                } else { lat = x; inw = 0; }
                // موجة خفيفة على الحافة
                inw += p.wave * Math.sin(u * 6 + p.seed) * u * u * v * v * p.L * 0.07;
                const rad = rr[j] + nr * inw;
                const y = hh[j] + nh * inw;
                const o = (j * (nu + 1) + i) * 3;
                pos[o] = ca * rad - sa * lat;
                pos[o + 1] = y;
                pos[o + 2] = sa * rad + ca * lat;
            }
        }
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.computeVertexNormals();
    }
}

// --------------------------------------------------------------------------
// الوردة
// --------------------------------------------------------------------------
const N_PETALS = 40;
const STEM_H = 3.5;

export class Rose3D {
    constructor() {
        this.state = { grow: 0, bloom: 0, sepal: 0, leaf: 0, pulse: 0, burst: 0, breath: 1, time: 0 };
        this.framing = 'full';
        this.active = false;
        this.container = null;

        this.scene = new THREE.Scene();
        this.root = new THREE.Group();
        this.scene.add(this.root);
        this.head = new THREE.Group();
        this.root.add(this.head);

        this._buildMaterials();
        this._buildPetals();
        this._buildSepals();
        this._buildStem();
        this._buildLights();
        this._buildFallen();

        this.camera = new THREE.PerspectiveCamera(30, 400 / 560, 0.1, 60);
        this._frame();
    }

    // ---------- مواد ----------
    _buildMaterials() {
        this.petalMat = new THREE.MeshPhysicalMaterial({
            vertexColors: true, side: THREE.DoubleSide,
            roughness: 0.55, metalness: 0,
            sheen: 0.6, sheenColor: new THREE.Color(0xb80f26), sheenRoughness: 0.55,
            clearcoat: 0.12, clearcoatRoughness: 0.6,
            envMapIntensity: 0.35,
            emissive: new THREE.Color(0x200006), emissiveIntensity: 0.5,
            transparent: false, opacity: 1
        });
        this.greenMat = new THREE.MeshStandardMaterial({
            vertexColors: true, side: THREE.DoubleSide, roughness: 0.6, metalness: 0, envMapIntensity: 0.3,
            emissive: new THREE.Color(0x020c06), emissiveIntensity: 0.5, transparent: false
        });
        this.stemMat = new THREE.MeshStandardMaterial({ color: 0x1f5a30, roughness: 0.6, metalness: 0, envMapIntensity: 0.3 });
    }

    // ---------- البتلات ----------
    _buildPetals() {
        this.petals = [];
        const profile = (v) => Math.pow(Math.max(Math.sin(Math.PI * Math.pow(v, 1.5)), 0), 0.45);
        for (let k = 0; k < N_PETALS; k++) {
            const t = k / (N_PETALS - 1);
            const colorFn = (u, v) => {
                const base = [0.03, 0.0, 0.008], mid = [0.34, 0.008, 0.032], tip = [0.62, 0.025, 0.06];
                let c = mix3(base, mid, sstep(0.0, 0.42, v));
                c = mix3(c, tip, sstep(0.4, 0.95, v) * (0.45 + 0.55 * t));
                // حافة أفتح (شفة)
                const edge = Math.pow(Math.abs(u), 3) * sstep(0.72, 1, v);
                c = mix3(c, [0.85, 0.12, 0.20], edge * (0.12 + 0.30 * t));
                const ao = lerp(0.35, 1, sstep(0, 0.65, v)) * lerp(0.55, 1, Math.pow(t, 0.7));
                return [c[0] * ao, c[1] * ao, c[2] * ao];
            };
            const lowQ = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
            const s = lowQ ? new Surface(16, 21, profile, colorFn) : new Surface(22, 28, profile, colorFn);
            const mesh = new THREE.Mesh(s.geometry, this.petalMat);
            mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
            this.head.add(mesh);

            const rnd = (a) => (Math.sin(k * 12.9898 + a * 78.233) * 43758.5453) % 1;
            const L0 = 0.46 + 1.0 * Math.pow(t, 0.85);
            const W0 = L0 * (0.50 + 0.26 * t);
            this.petals.push({
                s, mesh, k, t, L0, W0,
                az: k * 2.39996323 + rnd(1) * 0.15,
                jitter: rnd(2), seed: k * 1.7
            });
        }
        // الرسم من الخارج للداخل ليس ضرورياً (عمق)، لكن الترتيب يفيد الشفافية عند التلاشي
        this.petals.forEach((p, i) => { p.mesh.renderOrder = N_PETALS - i; });
    }

    _petalParams(p, e, breath) {
        const t = p.t;
        // حالة البرعم المغلق
        const cC = 2.7 - 0.7 * t;
        const rC = p.W0 / cC + 0.015;
        const phi0C = 0.015 + 0.06 * t;
        const curlC = -0.95 + 0.30 * (1 - t);
        // حالة الانفتاح الكامل
        const cO = 1.0 - 0.62 * t;
        const rO = 0.035 + 0.10 * t;
        const phi0O = 0.08 + 0.80 * Math.pow(t, 0.9);
        const curlO = -0.30 + 0.62 * Math.pow(t, 1.25);
        const eb = clamp(e + (breath - 1) * 0.5);
        return {
            L: p.L0 * (0.82 + 0.18 * eb) * (1 + 0.04 * p.jitter),
            W: p.W0,
            r0: lerp(rC, rO, eb),
            h0: -0.20 * t,
            az: p.az,
            phi0: lerp(phi0C, phi0O, eb),
            curl: lerp(curlC, curlO, eb),
            lip: 0.55 * t * eb,
            c: lerp(cC, cO, eb),
            wave: 0.35 * t * eb,
            seed: p.seed
        };
    }

    // ---------- الكأس الخضراء ----------
    _buildSepals() {
        this.sepals = [];
        const profile = (v) => Math.pow(Math.max(Math.sin(Math.PI * Math.pow(v, 0.62)), 0), 0.9) * (1 - 0.25 * v);
        const colorFn = (u, v) => {
            const a = [0.01, 0.06, 0.025], b = [0.07, 0.30, 0.12];
            const c = mix3(a, b, sstep(0, 1, v));
            const rib = (1 - sstep(0, 0.12, Math.abs(u))) * 0.5;
            return mix3(c, [0.3, 0.7, 0.35], rib * 0.4);
        };
        for (let i = 0; i < 5; i++) {
            const s = new Surface(6, 14, profile, colorFn);
            const mesh = new THREE.Mesh(s.geometry, this.greenMat);
            mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
            this.head.add(mesh);
            this.sepals.push({ s, mesh, az: (i / 5) * Math.PI * 2 + 0.3, L: 0.85 + (i % 2) * 0.16 });
        }
    }
    _sepalParams(sp, e) {
        return {
            L: sp.L, W: 0.21,
            r0: lerp(0.60, 0.08, e), h0: -0.30,
            az: sp.az,
            phi0: lerp(0.0, 2.05, e),
            curl: lerp(-0.55, 0.45, e),
            lip: 0, c: lerp(1.3, 0.5, e), wave: 0, seed: 0
        };
    }

    // ---------- الساق والأوراق ----------
    _buildStem() {
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(-0.10, 1.1, 0.05),
            new THREE.Vector3(0.07, 2.35, -0.04),
            new THREE.Vector3(0, STEM_H, 0)
        ]);
        this.stemCurve = curve;
        this.stemGroup = new THREE.Group();
        this.root.add(this.stemGroup);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.062, 10, false), this.stemMat);
        tube.castShadow = true; tube.receiveShadow = true;
        this.stemGroup.add(tube);

        // أشواك
        const thornMat = new THREE.MeshStandardMaterial({ color: 0x5a1f1a, roughness: 0.5 });
        [[0.28, 0.4], [0.5, -2.6], [0.68, 0.9]].forEach(([at, dir]) => {
            const pt = curve.getPoint(at);
            const th = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 6), thornMat);
            th.position.copy(pt);
            th.rotation.z = -Math.PI / 2 * Math.sign(Math.cos(dir)) * 0.9;
            th.rotation.y = dir;
            th.translateY(0.08);
            this.stemGroup.add(th);
        });

        // أوراق
        this.leaves = [];
        const profile = (v) => Math.pow(Math.max(Math.sin(Math.PI * Math.pow(v, 0.78)), 0), 0.85) * (1 + 0.05 * Math.sin(v * 46));
        const colorFn = (u, v) => {
            const dark = [0.01, 0.06, 0.025], light = [0.07, 0.30, 0.12];
            let c = mix3(dark, light, sstep(0, 0.8, v) * 0.8 + 0.2 * (1 - Math.abs(u)));
            const rib = 1 - sstep(0, 0.08, Math.abs(u));
            c = mix3(c, [0.2, 0.5, 0.22], rib * 0.5);
            return c;
        };
        [{ at: 0.34, az: 0.2, s: 1.0, side: 1 }, { at: 0.56, az: Math.PI + 0.1, s: 0.86, side: -1 }].forEach(d => {
            const s = new Surface(10, 20, profile, colorFn);
            s.update({ L: 1.25, W: 0.46, r0: 0, h0: 0, az: 0, phi0: 1.12, curl: 0.95, lip: 0, c: 0.55, wave: 0.2, seed: 2 });
            const mesh = new THREE.Mesh(s.geometry, this.greenMat);
            mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
            const g = new THREE.Group();
            const pt = curve.getPoint(d.at);
            g.position.copy(pt);
            g.rotation.y = d.az;
            g.add(mesh);
            this.root.add(g);
            this.leaves.push({ g, s: d.s });
        });
    }

    // ---------- إضاءة ----------
    _buildLights() {
        const key = new THREE.DirectionalLight(0xfff1e6, 2.5);
        key.position.set(-3.2, 9, 5);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.left = -2.4; key.shadow.camera.right = 2.4;
        key.shadow.camera.top = 2.4; key.shadow.camera.bottom = -2.4;
        key.shadow.camera.near = 1; key.shadow.camera.far = 22;
        key.shadow.bias = -0.001; key.shadow.normalBias = 0.045; key.shadow.radius = 4;
        this.key = key;
        this.scene.add(key); this.scene.add(key.target);

        const rim = new THREE.DirectionalLight(0xff2a45, 1.8);
        rim.position.set(4, 3, -5);
        this.scene.add(rim);

        const fill = new THREE.HemisphereLight(0xffc9d0, 0x1a0308, 0.32);
        this.scene.add(fill);
    }

    // ---------- بتلات متساقطة ----------
    _buildFallen() {
        this.fallen = [];
        const profile = (v) => Math.pow(Math.max(Math.sin(Math.PI * Math.pow(v, 1.5)), 0), 0.45);
        for (let i = 0; i < 3; i++) {
            const colorFn = () => [0.62, 0.03, 0.07];
            const s = new Surface(8, 10, profile, colorFn);
            s.update({ L: 0.55, W: 0.3, r0: 0, h0: 0, az: 0, phi0: 0.2, curl: 0.5, lip: 0, c: 0.9, wave: 0, seed: i });
            const mat = this.petalMat.clone(); mat.transparent = true; mat.opacity = 0;
            const mesh = new THREE.Mesh(s.geometry, mat);
            mesh.frustumCulled = false; mesh.visible = false;
            this.root.add(mesh);
            this.fallen.push({ mesh, mat });
        }
    }

    // ---------- العرض ----------
    mount(container) {
        this.container = container;
        if (!this.renderer) {
            const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
            r.setClearColor(0x000000, 0);
            r.outputColorSpace = THREE.SRGBColorSpace;
            r.toneMapping = THREE.ACESFilmicToneMapping;
            r.toneMappingExposure = 0.95;
            r.shadowMap.enabled = true;
            r.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer = r;
            const pm = new THREE.PMREMGenerator(r);
            this.scene.environment = pm.fromScene(new RoomEnvironment(r), 0.04).texture;
            r.domElement.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;';
            this.ro = new ResizeObserver(() => this.resize());
        }
        if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
        container.appendChild(this.renderer.domElement);
        this.ro.disconnect();
        this.ro.observe(container);
        this.resize();
    }

    resize() {
        if (!this.container || !this.renderer) return;
        const w = Math.max(this.container.clientWidth, 2), h = Math.max(this.container.clientHeight, 2);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
    }

    setFraming(mode) {
        this.framing = mode;
        this.stemGroup.visible = mode === 'full';
        this.leaves.forEach(l => { l.g.visible = mode === 'full'; });
        this._frame();
        this.resize();
    }

    _frame() {
        if (this.framing === 'head') {
            this.camera.fov = 30;
            this.camera.position.set(0, STEM_H + 3.3, 7.2);
            this.camera.lookAt(0, STEM_H + 0.1, 0);
        } else {
            this.camera.fov = 30;
            this.camera.position.set(0, STEM_H + 2.9, 9.6);
            this.camera.lookAt(0, STEM_H - 1.35, 0);
        }
        this.camera.updateProjectionMatrix();
    }

    // إطار تحضيري واحد (يجمّع الظلال والمواد قبل العرض)
    warm() { this._t0 = performance.now(); this.frame(); }

    start() {
        if (this.active || !this.renderer) return;
        this.active = true;
        this._t0 = performance.now();
        this.renderer.setAnimationLoop(() => this.frame());
    }
    stop() {
        this.active = false;
        if (this.renderer) this.renderer.setAnimationLoop(null);
    }

    // إطار واحد: يحدّث الأشكال ثم يرسم
    frame() {
        const S = this.state;
        S.time = (performance.now() - this._t0) / 1000;
        const time = S.time;

        // الساق ترتفع والرأس فوقها
        const g = clamp(S.grow);
        this.stemGroup.scale.y = Math.max(g, 0.001);
        this.head.position.y = STEM_H * g;
        const hs = lerp(0.55, 1, easeOut(g));
        const pulse = 1 + 0.05 * S.pulse;
        this.head.scale.setScalar(hs * pulse * (1 + 0.7 * S.burst));
        this.head.rotation.y = S.burst * 1.2 + Math.sin(time * 0.4) * 0.05 * S.bloom;
        this.head.rotation.z = Math.sin(time * 0.6) * 0.03 * S.bloom;
        this.root.rotation.z = Math.sin(time * 0.5) * 0.012 * S.bloom;

        // مواد الشفافية عند التفتت
        const op = 1 - clamp(S.burst * 1.05);
        const tr = S.burst > 0.001;
        if (this.petalMat.transparent !== tr) { this.petalMat.transparent = tr; this.greenMat.transparent = tr; this.petalMat.needsUpdate = true; this.greenMat.needsUpdate = true; }
        this.petalMat.opacity = op; this.greenMat.opacity = op;
        this.head.visible = g > 0.02 && op > 0.002;

        // البتلات
        const b = S.bloom;
        const breathe = 1 + 0.035 * Math.sin(time * 1.1) * clamp(b * 2 - 1);
        this._n = (this._n || 0) + 1;
        const idle = b >= 0.999 && S.burst < 0.001 && (this._n % 2 === 1);   // في حالة الهدوء نحدّث كل إطارين
        if (!idle) for (const p of this.petals) {
            const local = clamp((b - p.t * 0.42) / 0.58);
            const e = easeInOut(local);
            p.s.update(this._petalParams(p, e, breathe + 0.015 * Math.sin(time * 1.3 + p.k)));
        }
        // الكأس
        const se = easeInOut(clamp(S.sepal));
        for (const sp of this.sepals) sp.s.update(this._sepalParams(sp, se));

        // الأوراق
        const ls = easeOut(clamp(S.leaf));
        this.leaves.forEach((l, i) => {
            const d = easeOut(clamp(S.leaf * 1.3 - i * 0.3));
            l.g.scale.setScalar(Math.max(d * l.s, 0.001));
            l.g.visible = this.framing === 'full' && d > 0.01;
        });

        if (this.framing === 'full') {
            const el = easeInOut(clamp(S.bloom));
            this.camera.position.set(0, STEM_H + lerp(2.2, 4.0, el), 9.6 - 0.6 * el);
            this.camera.lookAt(0, STEM_H - lerp(1.15, 1.5, el), 0);
        }
        this.key.target.position.set(0, this.head.position.y, 0);
        this.renderer.render(this.scene, this.camera);
    }

    // بتلة متساقطة (تُحرَّك من الخارج بـ GSAP)
    fallenPetal(i) { return this.fallen[i % this.fallen.length]; }
    headWorldY() { return STEM_H; }
}
