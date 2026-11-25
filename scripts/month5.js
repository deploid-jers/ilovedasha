import { createHeartsShower } from "./timer.js";

export function initMouth5() {
    const sky = document.getElementById('m5Sky');
    const canvas = document.getElementById('m5Canvas');
    if (!sky || !canvas) return;

    const ctx = canvas.getContext('2d');
    const starBtns = [...sky.querySelectorAll('.m5-star')];
    const hint = document.getElementById('m5Hint');
    const note = document.getElementById('m5Note');
    const noteEmoji = document.getElementById('m5NoteEmoji');
    const noteText = document.getElementById('m5NoteText');
    const resetBtn = document.getElementById('m5Reset');
    const dots = [...document.querySelectorAll('#m5Progress .m5-dot')];
    const counter = document.getElementById('m5Counter');

    const TOTAL = 5;
    const SEG_POINTS = 28;

    // Записки к звёздам — можно менять текст как угодно
    const NOTES = [
        { emoji: '🌅', text: 'Месяц первый: ты появилась — и всё вокруг стало ярче.' },
        { emoji: '💌', text: 'Второй: мы научились скучать и ждать встречи.' },
        { emoji: '🏠', text: 'Третий: стали ближе, чем когда-либо.' },
        { emoji: '☕', text: 'Четвёртый: тепло и уют даже в самую холодную погоду.' },
        { emoji: '💖', text: 'Пятый: и я точно знаю — это только начало нашей истории.' }
    ];
    const FINAL = { emoji: '💖', text: 'Пять месяцев — пять звёзд, а вместе они сложились в сердце. Ты — моё любимое созвездие, Даша!' };

    let W = 0, H = 0, dpr = 1;
    let lit = 0;
    let caught = 0;
    let time = 0;
    let fillAlpha = 0;
    let finalTimer = null;
    let shootTimer = 2500;
    let running = false, inView = false, raf = 0, last = 0;

    let bgStars = [];
    let starPos = [];
    let outline = [];
    let shooters = [];
    let sparks = [];
    const seg = new Array(TOTAL).fill(0);   // прогресс отрисовки каждого отрезка сердца
    const segTarget = new Array(TOTAL).fill(0);

    /* ---------- Сердце ---------- */
    const heartXY = (t) => ({
        x: 16 * Math.pow(Math.sin(t), 3),
        y: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
    });

    function toPx(t, scale) {
        const p = heartXY(t);
        return { x: W / 2 + p.x * scale, y: H * 0.4 - (p.y + 2.5) * scale };
    }

    function layout() {
        const r = sky.getBoundingClientRect();
        if (!r.width || !r.height) return;
        W = r.width; H = r.height;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const scale = Math.min(W * 0.76 / 32, H * 0.5 / 29);

        starPos = [];
        for (let k = 0; k < TOTAL; k++) {
            const t = (k * 2 * Math.PI) / TOTAL;
            starPos.push({ t, ...toPx(t, scale) });
        }
        starBtns.forEach((btn, i) => {
            btn.style.left = starPos[i].x + 'px';
            btn.style.top = starPos[i].y + 'px';
        });

        outline = [];
        for (let i = 0; i <= 120; i++) outline.push(toPx((i / 120) * 2 * Math.PI, scale));

        // отрезки сердца между звёздами (по кривой)
        segPaths = [];
        for (let i = 0; i < TOTAL; i++) {
            const t0 = (i * 2 * Math.PI) / TOTAL;
            const t1 = ((i + 1) * 2 * Math.PI) / TOTAL;
            const pts = [];
            for (let j = 0; j <= SEG_POINTS; j++) pts.push(toPx(t0 + (t1 - t0) * (j / SEG_POINTS), scale));
            segPaths.push(pts);
        }

        const count = Math.round((W * H) / 3800);
        bgStars = Array.from({ length: count }, () => ({
            x: Math.random() * W,
            y: Math.random() * H,
            r: Math.random() * 1.3 + 0.3,
            ph: Math.random() * Math.PI * 2,
            sp: 0.8 + Math.random() * 1.8
        }));
    }
    let segPaths = [];

    /* ---------- Частицы ---------- */
    function burst(x, y, n, opts = {}) {
        const colors = opts.colors || ['#ffeaa7', '#fff', '#fd79a8', '#a29bfe'];
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const v = (opts.speed || 90) * (0.4 + Math.random());
            sparks.push({
                x, y,
                vx: Math.cos(a) * v,
                vy: Math.sin(a) * v - 20,
                g: 60,
                life: 0,
                max: 0.7 + Math.random() * 0.7,
                size: Math.random() * 2.2 + 1,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
    }

    function heartsRain() {
        const icons = ['💖', '💕', '✨', '⭐', '💗'];
        for (let i = 0; i < 36; i++) {
            sparks.push({
                x: Math.random() * W,
                y: -20 - Math.random() * H * 0.5,
                vx: (Math.random() - 0.5) * 30,
                vy: 70 + Math.random() * 90,
                g: 0,
                life: 0,
                max: 4,
                size: 14 + Math.random() * 12,
                text: icons[Math.floor(Math.random() * icons.length)]
            });
        }
    }

    function spawnShooter() {
        shooters.push({
            x: W * (0.45 + Math.random() * 0.6),
            y: -10 + Math.random() * H * 0.25,
            vx: -(200 + Math.random() * 120),
            vy: 100 + Math.random() * 70
        });
    }

    /* ---------- Обновление и отрисовка ---------- */
    function update(dt) {
        const s = dt / 1000;
        time += s;

        // отрезки сердца
        for (let i = 0; i < TOTAL; i++) {
            segTarget[i] = i < 4 ? segTarget[i] : (lit === TOTAL && seg[3] >= 0.999 ? 1 : 0);
            const dir = segTarget[i] > seg[i] ? 1 : -1;
            seg[i] = Math.min(1, Math.max(0, seg[i] + dir * s / 0.7));
            if (dir > 0 && seg[i] > segTarget[i]) seg[i] = segTarget[i];
        }
        if (lit === TOTAL && seg[4] >= 0.999) fillAlpha = Math.min(0.34, fillAlpha + s * 0.22);

        // падающие звёзды
        shootTimer -= dt;
        if (shootTimer <= 0) {
            spawnShooter();
            shootTimer = 4000 + Math.random() * 5000;
        }
        shooters.forEach(sh => { sh.x += sh.vx * s; sh.y += sh.vy * s; });
        shooters = shooters.filter(sh => sh.x > -80 && sh.y < H + 80);

        // искры
        sparks.forEach(p => {
            p.life += s;
            p.x += p.vx * s;
            p.y += p.vy * s;
            p.vy += p.g * s;
        });
        sparks = sparks.filter(p => p.life < p.max);
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        // фоновые звёзды
        bgStars.forEach(st => {
            const a = 0.25 + 0.75 * (Math.sin(time * st.sp + st.ph) + 1) / 2;
            ctx.globalAlpha = a;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // заливка сердца, когда созвездие собрано
        if (fillAlpha > 0 && outline.length) {
            const pulse = 0.85 + 0.15 * Math.sin(time * 4);
            const g = ctx.createRadialGradient(W / 2, H * 0.38, 10, W / 2, H * 0.38, H * 0.34);
            g.addColorStop(0, 'rgba(255, 143, 177, 0.95)');
            g.addColorStop(1, 'rgba(162, 155, 254, 0.35)');
            ctx.globalAlpha = fillAlpha * pulse;
            ctx.fillStyle = g;
            ctx.beginPath();
            outline.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
            ctx.closePath();
            ctx.fill();

            // маленькие звёздочки по контуру
            ctx.fillStyle = '#fff';
            for (let i = 0; i < outline.length - 1; i += 4) {
                const tw = (Math.sin(time * 3 + i) + 1) / 2;
                ctx.globalAlpha = (fillAlpha / 0.34) * (0.35 + 0.65 * tw);
                ctx.beginPath();
                ctx.arc(outline[i].x, outline[i].y, 1.6, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        // линии созвездия
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 200, 220, 0.95)';
        ctx.shadowColor = 'rgba(255, 150, 190, 0.9)';
        ctx.shadowBlur = 10;
        segPaths.forEach((pts, i) => {
            if (seg[i] <= 0.001) return;
            const n = Math.max(1, Math.round(seg[i] * SEG_POINTS));
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let j = 1; j <= n; j++) ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
        });
        ctx.shadowBlur = 0;

        // падающие звёзды
        shooters.forEach(sh => {
            const len = 0.2;
            const tx = sh.x - sh.vx * len, ty = sh.y - sh.vy * len;
            const g = ctx.createLinearGradient(sh.x, sh.y, tx, ty);
            g.addColorStop(0, 'rgba(255,255,255,1)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.strokeStyle = g;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(sh.x, sh.y);
            ctx.lineTo(tx, ty);
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(sh.x, sh.y, 2.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // искры, звёздная пыль, сердечки
        sparks.forEach(p => {
            const k = 1 - p.life / p.max;
            ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.4));
            if (p.text) {
                ctx.font = `${p.size}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(p.text, p.x, p.y);
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * (0.5 + k * 0.5), 0, Math.PI * 2);
                ctx.fill();
            }
        });
        ctx.globalAlpha = 1;
    }

    function frame(ts) {
        if (!running) return;
        const dt = Math.min(ts - last, 50);
        last = ts;
        update(dt);
        draw();
        raf = requestAnimationFrame(frame);
    }
    function start() {
        if (running || !W) return;
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
    }
    function stop() {
        running = false;
        cancelAnimationFrame(raf);
    }

    /* ---------- Логика звёзд ---------- */
    function setHint(text) { hint.textContent = text; }

    function showNote(n, finished) {
        const d = finished ? FINAL : NOTES[n - 1];
        noteEmoji.textContent = d.emoji;
        noteText.textContent = d.text;
        note.classList.toggle('finished', !!finished);
        note.classList.remove('show');
        void note.offsetWidth;
        note.classList.add('show');
    }

    function refreshUI() {
        dots.forEach((d, i) => d.classList.toggle('on', i < lit));
        counter.textContent = `${lit} / ${TOTAL}`;
        starBtns.forEach((b, i) => {
            b.classList.toggle('lit', i < lit);
            b.classList.toggle('next', i === lit);
        });
    }

    function lightStar(n, ev) {
        lit = n;
        const p = starPos[n - 1];
        burst(p.x, p.y, 22);
        createHeartsShower(ev, ['⭐', '✨', '💖', '💫']);
        if (navigator.vibrate) navigator.vibrate(25);
        if (n >= 2 && n <= 4) segTarget[n - 2] = 1;
        if (n === TOTAL) segTarget[3] = 1;
        refreshUI();
        showNote(n, false);

        if (n < TOTAL) {
            setHint(`Отлично! Теперь звёздочка №${n + 1}`);
        } else {
            setHint('Получилось сердце 💖');
            finalTimer = setTimeout(() => {
                showNote(0, true);
                heartsRain();
                if (navigator.vibrate) navigator.vibrate([40, 60, 40, 60, 90]);
            }, 2300);
        }
    }

    starBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const n = +btn.dataset.n;
            if (n === lit + 1) {
                lightStar(n, e);
            } else if (n <= lit) {
                showNote(n, false);
                burst(starPos[n - 1].x, starPos[n - 1].y, 8);
            } else {
                btn.classList.remove('shake');
                void btn.offsetWidth;
                btn.classList.add('shake');
                setHint(`Сначала звёздочка №${lit + 1} 🙈`);
            }
        });
    });

    function reset() {
        clearTimeout(finalTimer);
        lit = 0;
        fillAlpha = 0;
        seg.fill(0);
        segTarget.fill(0);
        note.classList.remove('show', 'finished');
        setHint('Зажги первую звёздочку ✨');
        refreshUI();
    }
    resetBtn.addEventListener('click', reset);

    /* ---------- Касания по небу ---------- */
    function local(e) {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    canvas.addEventListener('pointerdown', (e) => {
        const { x, y } = local(e);
        const hit = shooters.findIndex(sh => Math.hypot(sh.x - x, sh.y - y) < 50);
        if (hit !== -1) {
            const sh = shooters.splice(hit, 1)[0];
            caught++;
            burst(sh.x, sh.y, 30, { speed: 140 });
            setHint(`Звезда поймана! Загадай желание 🌠 (${caught})`);
            if (navigator.vibrate) navigator.vibrate(30);
            createHeartsShower(e, ['🌠', '💖', '✨', '💫']);
        } else {
            burst(x, y, 6, { speed: 50 });
        }
    });

    canvas.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'mouse' && e.buttons === 0) return;
        const { x, y } = local(e);
        burst(x, y, 2, { speed: 25 });
    });

    /* ---------- Старт ---------- */
    layout();
    refreshUI();

    new ResizeObserver(() => {
        layout();
        if (!running) draw();
    }).observe(sky);

    new IntersectionObserver((entries) => {
        inView = entries[0].isIntersecting;
        if (inView) { layout(); start(); } else stop();
    }, { threshold: 0.05 }).observe(sky);

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop();
        else if (inView) start();
    });
}