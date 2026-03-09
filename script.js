/* ============================================================
   Universo Infinito — Magical Particle Heart
   ============================================================ */

/**
 * BIENVENIDO AL CÓDIGO
 * Puedes cambiar los valores debajo para "interactuar" con el universo.
 */
const CONFIG = {
    PARTICLE_COUNT: 25000,
    BLOOM_STRENGTH: 2.2,
    HEART_SIZE: 1.0,
    AUTO_SPIN: 0.002,
    BREATHING_SPEED: 0.8,
};

// ── 1. RENDERER & SCENE SETUP ──────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x020008);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

// Dynamic Camera Adjustment for Mobile
function updateCameraScale() {
    const aspect = window.innerWidth / window.innerHeight;
    if (aspect < 1) {
        // Portrait (Mobile)
        camera.position.z = 80; // Move back to fit heart
    } else {
        // Landscape (Desktop)
        camera.position.z = 55;
    }
}
updateCameraScale();

// ── 2. POST-PROCESSING (BLOOM EFFECT) ─────────────────────────
const composer = new THREE.EffectComposer(renderer);
composer.addPass(new THREE.RenderPass(scene, camera));
const bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    CONFIG.BLOOM_STRENGTH, 0.8, 0.08
);
composer.addPass(bloomPass);

// ── 3. HEART PARTICLE SYSTEM ───────────────────────────────────
// Built using parametric heart equations: 
// x = 16 sin³(t), y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)

const generateHeartGeometry = () => {
    const N = CONFIG.PARTICLE_COUNT;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const sz = new Float32Array(N);
    const phase = new Float32Array(N);

    const cPink = new THREE.Color('#ff5fa0');
    const cLilac = new THREE.Color('#cc44ff');
    const cWhite = new THREE.Color('#fff0f6');

    for (let i = 0; i < N; i++) {
        const t = Math.random() * Math.PI * 2;

        // 2D Surface point
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);

        // Volumetric volumetric distribution
        const fill = Math.pow(Math.random(), 0.7);
        const px = hx * (1 - fill);
        const py = hy * (1 - fill) + 3 * fill;
        const pz = (Math.random() - 0.5) * 12 * (1 - fill * 0.4);

        pos[i * 3] = px; pos[i * 3 + 1] = py; pos[i * 3 + 2] = pz;

        // Color based on depth/position
        const c = fill < 0.25 ? cPink.clone().lerp(cLilac, Math.random()) : cPink.clone().lerp(cWhite, Math.random());
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;

        sz[i] = Math.random() * 2.5 + 0.6;
        phase[i] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('sz', new THREE.BufferAttribute(sz, 1));
    geo.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
    return geo;
};

const heartMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSize: { value: CONFIG.HEART_SIZE } },
    vertexShader: `
        uniform float uTime;
        uniform float uSize;
        attribute float sz;
        attribute float phase;
        varying vec3 vColor;
        varying float vPhase;
        void main() {
            vColor = color;
            vPhase = phase;
            vec3 p = position;
            
            // MAGIC AURA: Organic expansion and contraction
            float wave = sin(phase + uTime * 0.8) * 0.45;
            p += normalize(p + vec3(0.001)) * wave * 0.18;
            
            // TWIRL EFFECT: Subtle twist over time
            float angle = uTime * 0.1;
            float cosA = cos(angle);
            float sinA = sin(angle);

            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            
            // HEARTBEAT PULSE
            float pulse = 0.88 + 0.15 * sin(phase + uTime * 2.2);
            gl_PointSize = sz * uSize * (125.0 / -mv.z) * pulse;
            gl_Position = projectionMatrix * mv;
        }
    `,
    fragmentShader: `
        varying vec3 vColor;
        varying float vPhase;
        uniform float uTime;
        void main() {
            vec2 uv = gl_PointCoord - 0.5;
            float r = length(uv);
            if (r > 0.5) discard;

            // COSMIC GLINTS: Shimmering points
            float glint = pow(0.5 + 0.5 * sin(uTime * 10.0 + vPhase * 25.0), 20.0);
            vec3 finalColor = vColor + (vec3(1.0) * glint * 1.5);

            // Soft glow point
            float force = pow(1.0 - r * 2.0, 2.2);
            gl_FragColor = vec4(finalColor, force * (0.8 + glint * 0.4));
        }
    `,
    transparent: true, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false
});

const heart = new THREE.Points(generateHeartGeometry(), heartMat);
heart.position.y = -5; // Centered below top text
scene.add(heart);

// ── 4. BACKGROUND ELEMENTS (STARS & COMETS) ───────────────────
// Twinkling stars
const starCount = 4500;
const starPos = new Float32Array(starCount * 3);
const starDat = new Float32Array(starCount);
for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 350; starPos[i * 3 + 1] = (Math.random() - 0.5) * 250; starPos[i * 3 + 2] = (Math.random() - 0.5) * 200;
    starDat[i] = Math.random() * Math.PI * 2;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute('phase', new THREE.BufferAttribute(starDat, 1));
const starMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
        uniform float uTime;
        attribute float phase;
        void main() {
            float twinkle = 0.5 + 0.5 * sin(uTime * 1.5 + phase);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (1.2 + twinkle * 2.5) * (50.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
        }
    `,
    fragmentShader: `void main() { gl_FragColor = vec4(0.9, 0.95, 1.0, 0.85); }`,
    transparent: true, blending: THREE.AdditiveBlending
});
scene.add(new THREE.Points(starGeo, starMat));

// Shooting Stars (Comets)
class Comet {
    constructor() { this.reset(); }
    reset() {
        this.active = false; this.delay = Math.random() * 600;
        this.pos = new THREE.Vector3((Math.random() - 0.5) * 250, 90, (Math.random() - 0.5) * 100);
        this.vel = new THREE.Vector3(-2 - Math.random() * 3, -1.5 - Math.random() * 2, 0);
        this.life = 1.0;
    }
    update(dt) {
        if (!this.active) { if ((this.delay -= dt * 60) <= 0) this.active = true; return; }
        this.pos.add(this.vel.clone().multiplyScalar(dt * 35));
        if ((this.life -= dt * 0.6) <= 0 || this.pos.y < -90) this.reset();
    }
}
const comets = Array.from({ length: 5 }, () => new Comet());
const cometGeo = new THREE.BufferGeometry();
const cometPoints = new THREE.Points(cometGeo, new THREE.PointsMaterial({ size: 1.5, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending }));
scene.add(cometPoints);

// ── 5. MOUSE INTERACTION ───────────────────────────────────────
const mouse = { x: 0, y: 0 };
document.addEventListener('mousemove', e => {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
});

// ── 6. ANIMATION LOOP ──────────────────────────────────────────
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dt = clock.getDelta();

    heartMat.uniforms.uTime.value = t * CONFIG.BREATHING_SPEED;
    starMat.uniforms.uTime.value = t;

    // Heart movement: Follow mouse + Auto-tilt
    heart.rotation.y += (mouse.x * 0.7 - heart.rotation.y) * 0.05;
    heart.rotation.x += (mouse.y * 0.25 - heart.rotation.x) * 0.05;
    heart.rotation.y += CONFIG.AUTO_SPIN;

    // Camera parallax
    camera.position.x += (mouse.x * 3.5 - camera.position.x) * 0.04;
    camera.position.y += (-mouse.y * 2.0 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    // Update Comets
    const cPos = [];
    comets.forEach(c => {
        c.update(dt);
        if (c.active) {
            cPos.push(c.pos.x, c.pos.y, c.pos.z);
            for (let j = 1; j < 10; j++) cPos.push(c.pos.x - c.vel.x * j * 0.45, c.pos.y - c.vel.y * j * 0.45, c.pos.z);
        }
    });
    cometGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cPos), 3));

    composer.render();
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    updateCameraScale();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});
