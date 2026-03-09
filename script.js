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
    GRAVITY_STRENGTH: 2.5, // How much the mouse pulls particles
    TARGET_CAMERA_Z: 55,
};

// ── 1. RENDERER & SCENE SETUP ──────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000); // Pure deep space
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 0, 500); // Start far for fly-in

// Dynamic Camera Adjustment for Mobile
function updateCameraScale() {
    const aspect = window.innerWidth / window.innerHeight;
    CONFIG.TARGET_CAMERA_Z = aspect < 1 ? 85 : 55;
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

// ── 3. VOLUMETRIC NEBULA SYSTEM ────────────────────────────────
const nebulaGeo = new THREE.BufferGeometry();
const nebulaCount = 600;
const nPos = new Float32Array(nebulaCount * 3);
const nPhase = new Float32Array(nebulaCount);
const nSize = new Float32Array(nebulaCount);
for (let i = 0; i < nebulaCount; i++) {
    nPos[i * 3] = (Math.random() - 0.5) * 600;
    nPos[i * 3 + 1] = (Math.random() - 0.5) * 400;
    nPos[i * 3 + 2] = (Math.random() - 0.5) * 500 - 200;
    nPhase[i] = Math.random() * Math.PI * 2;
    nSize[i] = Math.random() * 20 + 10;
}
nebulaGeo.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
nebulaGeo.setAttribute('phase', new THREE.BufferAttribute(nPhase, 1));
nebulaGeo.setAttribute('sz', new THREE.BufferAttribute(nSize, 1));

const nebulaMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: `
        uniform float uTime;
        attribute float phase;
        attribute float sz;
        varying float vPhase;
        void main() {
            vPhase = phase;
            vec3 p = position;
            p.y += sin(uTime * 0.2 + phase) * 5.0;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = sz * (300.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
        }
    `,
    fragmentShader: `
        varying float vPhase;
        uniform float uTime;
        void main() {
            vec2 uv = gl_PointCoord - 0.5;
            float r = length(uv);
            if (r > 0.5) discard;
            float glow = pow(1.0 - r * 2.0, 3.5);
            vec3 color = vec3(0.4, 0.1, 0.5); // Purple nebula base
            color.r += 0.2 * sin(uTime * 0.5 + vPhase);
            color.b += 0.2 * cos(uTime * 0.3 + vPhase);
            gl_FragColor = vec4(color, glow * 0.35);
        }
    `
});
scene.add(new THREE.Points(nebulaGeo, nebulaMat));

// ── 4. HEART PARTICLE SYSTEM ───────────────────────────────────
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
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        const fill = Math.pow(Math.random(), 0.7);
        const px = hx * (1 - fill);
        const py = hy * (1 - fill) + 3 * fill;
        const pz = (Math.random() - 0.5) * 12 * (1 - fill * 0.4);

        pos[i * 3] = px; pos[i * 3 + 1] = py; pos[i * 3 + 2] = pz;
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
    uniforms: {
        uTime: { value: 0 },
        uSize: { value: CONFIG.HEART_SIZE },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uGravity: { value: CONFIG.GRAVITY_STRENGTH }
    },
    vertexShader: `
        uniform float uTime;
        uniform float uSize;
        uniform vec2 uMouse;
        uniform float uGravity;
        attribute float sz;
        attribute float phase;
        varying vec3 vColor;
        varying float vPhase;
        void main() {
            vColor = color;
            vPhase = phase;
            vec3 p = position;
            
            // GRAVITY EFFECT: Displace towards mouse
            vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
            vec4 mousePos = vec4(uMouse.x * 20.0, uMouse.y * 20.0, 0.0, 1.0);
            float dist = distance(p.xy, mousePos.xy);
            float pull = uGravity * (1.0 / (1.0 + dist * 0.1));
            p.xy += normalize(mousePos.xy - p.xy) * pull * (0.5 + 0.5 * sin(uTime + phase));

            // MAGIC AURA
            float wave = sin(phase + uTime * 0.8) * 0.45;
            p += normalize(p + vec3(0.001)) * wave * 0.18;
            
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            float pulse = 0.88 + 0.15 * sin(phase + uTime * 2.2);
            gl_PointSize = sz * uSize * (135.0 / -mv.z) * pulse;
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
            float glint = pow(0.5 + 0.5 * sin(uTime * 10.0 + vPhase * 25.0), 20.0);
            vec3 finalColor = vColor + (vec3(1.0) * glint * 1.5);
            float force = pow(1.0 - r * 2.0, 2.2);
            gl_FragColor = vec4(finalColor, force * (0.8 + glint * 0.4));
        }
    `,
    transparent: true, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false
});

const heart = new THREE.Points(generateHeartGeometry(), heartMat);
heart.position.y = -5;
scene.add(heart);

// ── 5. BACKGROUND STARS & COMETS ──────────────────────────────
const starCount = 5000;
const starPos = new Float32Array(starCount * 3);
const starDat = new Float32Array(starCount);
for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 450;
    starPos[i * 3 + 1] = (Math.random() - 0.5) * 400;
    starPos[i * 3 + 2] = (Math.random() - 0.5) * 300;
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
const comets = Array.from({ length: 6 }, () => new Comet());
const cometGeo = new THREE.BufferGeometry();
const cometPoints = new THREE.Points(cometGeo, new THREE.PointsMaterial({ size: 1.5, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending }));
scene.add(cometPoints);

// ── 6. INTERACTION & ANIMATION ───────────────────────────────
const mouse = { x: 0, y: 0 };
document.addEventListener('mousemove', e => {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2; // Inverted for 3D space
});
document.addEventListener('touchstart', e => {
    if (e.touches.length > 0) {
        mouse.x = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
        mouse.y = -(e.touches[0].clientY / window.innerHeight - 0.5) * 2;
    }
});

const clock = new THREE.Clock();
let introFinished = false;

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dt = clock.getDelta();

    // CINEMATIC INTRO: Fly-in effect
    if (camera.position.z > CONFIG.TARGET_CAMERA_Z + 0.1) {
        camera.position.z += (CONFIG.TARGET_CAMERA_Z - camera.position.z) * 0.02;
    } else if (!introFinished) {
        introFinished = true;
        const loader = document.getElementById('loader');
        if (loader) loader.style.opacity = '0';
        setTimeout(() => { if (loader) loader.style.display = 'none'; }, 1500);
    }

    heartMat.uniforms.uTime.value = t * CONFIG.BREATHING_SPEED;
    heartMat.uniforms.uMouse.value.set(mouse.x, mouse.y);
    starMat.uniforms.uTime.value = t;
    nebulaMat.uniforms.uTime.value = t;

    heart.rotation.y += (mouse.x * 0.4 - heart.rotation.y) * 0.05 + CONFIG.AUTO_SPIN;
    heart.rotation.x += ((-mouse.y * 0.2) - heart.rotation.x) * 0.05;

    camera.position.x += (mouse.x * 4.0 - camera.position.x) * 0.03;
    camera.position.y += (mouse.y * 2.5 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);

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
