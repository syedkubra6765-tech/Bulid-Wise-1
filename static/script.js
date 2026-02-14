/* ===== CINEMATIC 3D UI - SCRIPT ===== */

// ========================
// 1. THREE.JS PARTICLE GRID
// ========================
(function initParticleBackground() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Particle Field
    const particleCount = 1500;
    const positions = new Float32Array(particleCount * 3);
    const spread = 60;

    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * spread;
        positions[i + 1] = (Math.random() - 0.5) * spread;
        positions[i + 2] = (Math.random() - 0.5) * spread;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0x00d4ff,
        size: 0.08,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Wireframe Grid
    const gridGeo = new THREE.PlaneGeometry(80, 80, 30, 30);
    const gridMat = new THREE.MeshBasicMaterial({
        color: 0x4d8bff,
        wireframe: true,
        transparent: true,
        opacity: 0.04,
    });
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2.5;
    grid.position.y = -15;
    scene.add(grid);

    camera.position.z = 25;
    camera.position.y = 5;

    // Mouse interaction
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        particles.rotation.y += 0.0003;
        particles.rotation.x += 0.0001;

        // Smooth camera follow
        camera.position.x += (mouseX * 3 - camera.position.x) * 0.02;
        camera.position.y += (-mouseY * 2 + 5 - camera.position.y) * 0.02;
        camera.lookAt(0, 0, 0);

        grid.rotation.z += 0.0002;

        renderer.render(scene, camera);
    }
    animate();

    // Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
})();

// ========================
// 2. GSAP ENTRANCE ANIMATIONS
// ========================
(function initEntranceAnimations() {
    if (typeof gsap === 'undefined') return;

    // Hero text lines
    gsap.to('.hero-title .line', {
        opacity: 1,
        y: 0,
        duration: 1,
        stagger: 0.2,
        ease: 'power3.out',
        delay: 0.3,
    });

    // Hero subtitle
    gsap.to('.hero-subtitle', {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: 1.0,
    });

    // Nav
    gsap.from('.top-nav', {
        y: -60,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.1,
    });

    // Input Panel - Animation removed to ensure visibility
    /* 
    gsap.from('.input-panel', {
         y: 60,
         opacity: 0,
         duration: 0.8,
         ease: 'power3.out',
         delay: 0.4,
     });
    */
    gsap.set('.input-panel', { opacity: 1, y: 0 });
})();

// ========================
// 3. 3D TILT EFFECT ON CARDS
// ========================
(function initTiltEffect() {
    document.querySelectorAll('[data-tilt]').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / centerY * -5;
            const rotateY = (x - centerX) / centerX * 5;
            card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1)';
        });
    });
})();

// ========================
// 4. FORM SUBMISSION & API CALLS
// ========================
document.getElementById('planningForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const btn = document.getElementById('generateBtn');
    const loader = btn.querySelector('.loader');
    const btnText = btn.querySelector('.btn-text');
    const btnIcon = btn.querySelector('.btn-icon');
    const resultsPanel = document.getElementById('resultsPanel');

    // Loading State
    btn.disabled = true;
    loader.classList.remove('hidden');
    btnIcon.classList.add('hidden');
    btnText.textContent = 'Calculating...';

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        // --- STEP 1: INSTANT CALCULATIONS ---
        const responseCalc = await fetch('/api/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const resultCalc = await responseCalc.json();
        if (resultCalc.error) throw new Error(resultCalc.error);

        // Show Results Panel and scroll to it
        resultsPanel.classList.remove('hidden');
        setTimeout(() => {
            resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);

        // Animate Stats
        document.getElementById('resTimeline').textContent = `${resultCalc.timeline_days} Days`;
        document.getElementById('resMaterial').textContent = `${resultCalc.calculations.built_up_area_sqft} sq.ft`;
        document.getElementById('resWorkforce').textContent = 'Analyzing...';

        // Material List
        const matList = document.getElementById('materialList');
        matList.innerHTML = `
            <li><span>Cement Bags</span> <strong>${resultCalc.calculations.cement_bags}</strong></li>
            <li><span>Steel (Kg)</span> <strong>${resultCalc.calculations.steel_kg}</strong></li>
            <li><span>Sand (cft)</span> <strong>${resultCalc.calculations.sand_cft}</strong></li>
            <li><span>Aggregate (cft)</span> <strong>${resultCalc.calculations.aggregate_cft}</strong></li>
            <li><span>Bricks</span> <strong>${resultCalc.calculations.bricks}</strong></li>
        `;

        // GSAP stagger animation for results - Removed to ensure visibility
        /*
        if (typeof gsap !== 'undefined') {
            gsap.from('.stat-card', {
                y: 30, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out'
            });
            gsap.from('.material-panel', {
                y: 30, opacity: 0, duration: 0.5, delay: 0.3, ease: 'power3.out'
            });
            gsap.from('.ai-panel', {
                y: 30, opacity: 0, duration: 0.5, delay: 0.5, ease: 'power3.out'
            });
        }
        */
        // Force visibility just in case
        gsap.set('.stat-card', { opacity: 1, y: 0 });
        gsap.set('.material-panel', { opacity: 1, y: 0 });
        gsap.set('.ai-panel', { opacity: 1, y: 0 });

        // Reset button
        btn.disabled = false;
        loader.classList.add('hidden');
        btnIcon.classList.remove('hidden');
        btnText.textContent = 'Generate Plan';

        // Init tilt on new cards
        initDynamicTilt();

        // --- STEP 2: AI LOADING STATE ---
        data.timeline_days = resultCalc.timeline_days;
        setAiLoadingState(true);

        // --- STEP 3: BACKGROUND AI CALL ---
        const responseAi = await fetch('/api/ai-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const resultAi = await responseAi.json();

        if (resultAi.error) {
            setAiErrorState(resultAi.error);
            return;
        }

        renderAiResults(resultAi.ai_analysis);

    } catch (err) {
        console.error(err);
        alert('Error: ' + err.message);
        btn.disabled = false;
        loader.classList.add('hidden');
        btnIcon.classList.remove('hidden');
        btnText.textContent = 'Generate Plan';
    }
});

// ========================
// 5. AI STATE HELPERS
// ========================
function setAiLoadingState(isLoading) {
    const loadingHtml = `
        <div class="ai-loader">
            <div class="loader"></div>
            <p>AI is analyzing project details...</p>
        </div>`;

    if (isLoading) {
        document.getElementById('scheduleTimeline').innerHTML = loadingHtml;
        document.getElementById('laborChart').innerHTML = loadingHtml;
        document.getElementById('costBreakdown').innerHTML = loadingHtml;
        document.getElementById('blueprintContent').innerHTML = loadingHtml;
        document.getElementById('resWorkforce').textContent = 'Analyzing...';
    }
}

function setAiErrorState(msg) {
    const errorHtml = `<div class="error-msg"><i class="fa-solid fa-triangle-exclamation"></i> AI Analysis Failed: ${msg}</div>`;
    document.getElementById('scheduleTimeline').innerHTML = errorHtml;
    document.getElementById('laborChart').innerHTML = errorHtml;
    document.getElementById('costBreakdown').innerHTML = errorHtml;
    document.getElementById('blueprintContent').innerHTML = errorHtml;
    document.getElementById('resWorkforce').textContent = 'Error';
}

function renderAiResults(aiData) {
    // Workforce
    document.getElementById('resWorkforce').textContent = aiData.worker_requirements
        ? Object.values(aiData.worker_requirements).reduce((a, b) => parseInt(a) + parseInt(b), 0) + ' Daily'
        : '--';

    // Schedule
    const scheduleContainer = document.getElementById('scheduleTimeline');
    if (aiData.construction_schedule_phases) {
        scheduleContainer.innerHTML = aiData.construction_schedule_phases.map(phase => `
            <div class="timeline-item">
                <h4>${phase.phase} <small>(${phase.duration_weeks} weeks)</small></h4>
                <p>${phase.description}</p>
            </div>
        `).join('');
    } else {
        scheduleContainer.innerHTML = '<p style="color: var(--text-muted)">Schedule data not available.</p>';
    }

    // Labor
    const laborContainer = document.getElementById('laborChart');
    if (aiData.worker_requirements) {
        laborContainer.innerHTML = `<ul class="data-list">` +
            Object.entries(aiData.worker_requirements).map(([role, count]) =>
                `<li><span>${role.replace(/_/g, ' ').toUpperCase()}</span> <strong>${count}</strong></li>`
            ).join('') + `</ul>`;
    } else {
        laborContainer.innerHTML = '<p style="color: var(--text-muted)">Labor data not available.</p>';
    }

    // Costs
    const costContainer = document.getElementById('costBreakdown');
    if (aiData.cost_breakdown_percentage) {
        costContainer.innerHTML = `<ul class="data-list">` +
            Object.entries(aiData.cost_breakdown_percentage).map(([type, pct]) =>
                `<li><span>${type.toUpperCase()}</span> <strong>${pct}</strong></li>`
            ).join('') + `</ul>`;
    } else {
        costContainer.innerHTML = '<p style="color: var(--text-muted)">Cost data not available.</p>';
    }

    // Blueprint
    const blueprintContainer = document.getElementById('blueprintContent');
    if (aiData.blueprint_suggestions) {
        blueprintContainer.innerHTML = `
            <h3><i class="fa-solid fa-ruler-combined"></i> Architectural Suggestions</h3>
            <p><strong>Layout:</strong> ${aiData.blueprint_suggestions.room_configuration}</p>
            <p>${aiData.blueprint_suggestions.description}</p>
        `;
    } else {
        blueprintContainer.innerHTML = '<p style="color: var(--text-muted)">Blueprint data not available.</p>';
    }

    // Animate AI content in - Removed to ensure visibility
    /*
    if (typeof gsap !== 'undefined') {
        gsap.from('.timeline-item, .data-list li', {
            y: 15, opacity: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out'
        });
    }
    */
    gsap.set('.timeline-item, .data-list li', { opacity: 1, y: 0 });
}

// ========================
// 6. TAB SWITCHING
// ========================
function openTab(evt, tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    evt.currentTarget.classList.add('active');
}

// ========================
// 7. DYNAMIC TILT INIT
// ========================
function initDynamicTilt() {
    document.querySelectorAll('[data-tilt]').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / centerY * -4;
            const rotateY = (x - centerX) / centerX * 4;
            card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1)';
        });
    });
}
