/**
 * Daily Spin Wheel — SulapFotoAIO
 * 9 segments, canvas-based, server-determined prize
 */
(function () {
    'use strict';

    // ── Segment definitions (order must match server PHP $PRIZES segments) ──
    // 10 segments = 36° each. Slots 0,2,4,6,8 = "Coba Lagi" (5 retry, 1 warna)
    const SEGMENTS = [
        { id: 'retry_0',    label: 'Coba Lagi', sub: 'Besok',  color: '#94a3b8', textColor: '#fff', icon: '<i data-lucide="rotate-ccw" class="w-10 h-10"></i>', legendKey: 'retry', desc: 'Tidak menang, coba lagi besok' },
        { id: 'boost_10',   label: '+10 Boost',  sub: 'Quota',  color: '#fbbf24', textColor: '#78350f', icon: '<i data-lucide="zap" class="w-10 h-10"></i>', legendKey: 'boost_10',   desc: 'Tambah 10 kuota boost' },
        { id: 'retry_1',    label: 'Coba Lagi', sub: 'Besok',  color: '#94a3b8', textColor: '#fff', icon: '<i data-lucide="rotate-ccw" class="w-10 h-10"></i>', legendKey: 'retry', desc: 'Tidak menang, coba lagi besok' },
        { id: 'boost_50',   label: '+50 Boost',  sub: 'Quota',  color: '#f97316', textColor: '#fff', icon: '<i data-lucide="zap" class="w-10 h-10"></i>', legendKey: 'boost_50',   desc: 'Tambah 50 kuota boost' },
        { id: 'retry_2',    label: 'Coba Lagi', sub: 'Besok',  color: '#94a3b8', textColor: '#fff', icon: '<i data-lucide="rotate-ccw" class="w-10 h-10"></i>', legendKey: 'retry', desc: 'Tidak menang, coba lagi besok' },
        { id: 'boost_100',  label: '+100 Boost', sub: 'Quota',  color: '#eab308', textColor: '#78350f', icon: '<i data-lucide="zap" class="w-10 h-10"></i>', legendKey: 'boost_100',  desc: 'Tambah 100 kuota boost' },
        { id: 'retry_3',    label: 'Coba Lagi', sub: 'Besok',  color: '#94a3b8', textColor: '#fff', icon: '<i data-lucide="rotate-ccw" class="w-10 h-10"></i>', legendKey: 'retry', desc: 'Tidak menang, coba lagi besok' },
        { id: 'akses_1hari',label: 'Akses',      sub: '1 Hari', color: '#06b6d4', textColor: '#fff', icon: '<i data-lucide="sparkles" class="w-10 h-10"></i>', legendKey: 'akses_1hari', desc: 'Addons pack atau Private Server selama 1 hari' },
        { id: 'retry_4',    label: 'Coba Lagi', sub: 'Besok',  color: '#94a3b8', textColor: '#fff', icon: '<i data-lucide="rotate-ccw" class="w-10 h-10"></i>', legendKey: 'retry', desc: 'Tidak menang, coba lagi besok' },
        { id: 'jackpot',    label: 'Hadiah Utama', sub: '', color: '#ef4444', textColor: '#fff', icon: '<i data-lucide="trophy" class="w-10 h-10"></i>', legendKey: 'jackpot', desc: '+3000 Boost Quota atau Private Server 30 Hari' },
    ];

    const NUM_SEG     = SEGMENTS.length;
    const SEG_ANGLE   = (2 * Math.PI) / NUM_SEG;
    const SPIN_ROUNDS = 5; // full rotations before landing

    // ── State ────────────────────────────────────────────────────────────────
    let spinStatus   = null; // { can_spin, free_spin, extra_spins, next_spin_at, ... }
    let isSpinning   = false;
    let currentAngle = 0;    // radians, current wheel rotation
    let countdownTimer = null;

    // ── DOM helpers ──────────────────────────────────────────────────────────
    const $ = id => document.getElementById(id);

    // ── Draw wheel on canvas ─────────────────────────────────────────────────
    function drawWheel(canvas, angle) {
        const ctx  = canvas.getContext('2d');
        const cx   = canvas.width  / 2;
        const cy   = canvas.height / 2;
        const r    = cx - 4;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < NUM_SEG; i++) {
            const start = angle + i * SEG_ANGLE - Math.PI / 2;
            const end   = start + SEG_ANGLE;
            const seg   = SEGMENTS[i];

            // Segment fill
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, start, end);
            ctx.closePath();
            ctx.fillStyle = seg.color;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Text
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(start + SEG_ANGLE / 2);
            ctx.textAlign    = 'right';
            ctx.fillStyle    = seg.textColor;
            ctx.font         = `bold ${Math.round(r * 0.095)}px sans-serif`;
            ctx.fillText(seg.label, r - 8, -4);
            ctx.font         = `${Math.round(r * 0.08)}px sans-serif`;
            ctx.fillStyle    = seg.textColor + 'cc';
            ctx.fillText(seg.sub, r - 8, 10);
            ctx.restore();
        }

        // Center circle
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.12, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth   = 2;
        ctx.stroke();

        // Center star/dot
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.05, 0, 2 * Math.PI);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
    }

    // ── Ease out cubic ───────────────────────────────────────────────────────
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    // ── Animate spin to target segment ──────────────────────────────────────
    function animateSpin(canvas, targetSegment, onDone) {
        // Pointer is at the top (angle = 0). Segment i occupies
        // angles [i*SEG_ANGLE, (i+1)*SEG_ANGLE] when wheel is at rotation 0.
        // To land pointer on center of segment i:
        //   wheelAngle (rad) = 2π*ROUNDS - (i * SEG_ANGLE + SEG_ANGLE/2)
        // But we must add to current angle (continuous).

        const jitter    = (Math.random() * 0.7 - 0.35) * SEG_ANGLE; // ±35% acak dalam segmen
        const targetRad = targetSegment * SEG_ANGLE + SEG_ANGLE / 2 + jitter;
        const totalRot  = SPIN_ROUNDS * 2 * Math.PI + (2 * Math.PI - (currentAngle % (2 * Math.PI)) + (2 * Math.PI - targetRad)) % (2 * Math.PI);
        const finalAngle = currentAngle + totalRot;
        const duration   = 10000; // ms
        let startTime    = null;
        const startAngle = currentAngle;

        function frame(ts) {
            if (!startTime) startTime = ts;
            const elapsed = ts - startTime;
            const t       = Math.min(elapsed / duration, 1);
            currentAngle  = startAngle + totalRot * easeOutCubic(t);
            drawWheel(canvas, currentAngle);
            if (t < 1) {
                requestAnimationFrame(frame);
            } else {
                currentAngle = finalAngle;
                drawWheel(canvas, currentAngle);
                onDone();
            }
        }
        requestAnimationFrame(frame);
    }

    // ── Countdown timer ──────────────────────────────────────────────────────
    function startCountdown(nextAt) {
        if (countdownTimer) clearInterval(countdownTimer);
        const el = $('spin-countdown');
        if (!el) return;
        function tick() {
            const remaining = Math.max(0, nextAt - Math.floor(Date.now() / 1000));
            if (remaining <= 0) {
                clearInterval(countdownTimer);
                el.textContent = '';
                refreshSpinStatus();
                return;
            }
            const h = Math.floor(remaining / 3600);
            const m = Math.floor((remaining % 3600) / 60);
            const s = remaining % 60;
            el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        }
        tick();
        countdownTimer = setInterval(tick, 1000);
    }

    // ── Show / hide spin notification banner ─────────────────────────────────
    function showSpinNotification() {
        const notif = $('spin-available-notification');
        if (!notif || notif._dismissed) return;
        notif.classList.remove('hidden');
        // Auto-hide after 8 seconds
        setTimeout(() => notif.classList.add('hidden'), 8000);
    }

    // ── Relative time helper ─────────────────────────────────────────────────
    function timeAgo(ts) {
        const diff = Math.floor(Date.now() / 1000) - ts;
        if (diff < 60)    return 'baru saja';
        if (diff < 3600)  return Math.floor(diff / 60) + ' mnt lalu';
        if (diff < 86400) return Math.floor(diff / 3600) + ' jam lalu';
        return Math.floor(diff / 86400) + ' hari lalu';
    }

    // ── Render winners from data object ────────────────────────────────────
    function renderWinnersData(data) {
        if (!data || !data.success) return;
                const typeIcon = {
                    boost: '<i data-lucide="zap" class="w-3 h-3 inline-block align-middle"></i>',
                    addons: '<i data-lucide="gift" class="w-3 h-3 inline-block align-middle"></i>',
                    vip: '<i data-lucide="crown" class="w-3 h-3 inline-block align-middle"></i>',
                    private_server: '<i data-lucide="monitor" class="w-3 h-3 inline-block align-middle"></i>'
                };
                const defaultIcon = '<i data-lucide="gift" class="w-3 h-3 inline-block align-middle"></i>';

                // Pemenang Terbaru
                const el = $('spin-winners-list');
                if (el) {
                    if (!data.winners || data.winners.length === 0) {
                        el.innerHTML = '<span class="text-[9px] text-emerald-600/40">Belum ada pemenang</span>';
                    } else {
                        el.innerHTML = data.winners.map(w => `
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-[9px] font-semibold text-emerald-800 truncate">${typeIcon[w.prize_type] || defaultIcon} <span class="text-emerald-700">${w.email}</span></span>
                                <span class="text-[9px] text-emerald-600/60 whitespace-nowrap flex-shrink-0">${w.prize_label} · ${timeAgo(w.won_at)}</span>
                            </div>`).join('');
                        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: Array.from(el.querySelectorAll('[data-lucide]')) });
                    }
                }

                // Pemenang Utama (jackpot only)
                const mainEl = $('spin-main-winners-list');
                if (mainEl) {
                    if (!data.main_winners || data.main_winners.length === 0) {
                        mainEl.innerHTML = '<span class="text-[9px] text-amber-600/40">Belum ada pemenang utama</span>';
                    } else {
                        mainEl.innerHTML = data.main_winners.map(w => `
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-[9px] font-semibold text-amber-800 truncate"><i data-lucide="trophy" class="w-3 h-3 inline-block align-middle"></i> <span class="text-amber-700">${w.email}</span></span>
                                <span class="text-[9px] text-amber-600/60 whitespace-nowrap flex-shrink-0">${w.prize_label} · ${timeAgo(w.won_at)}</span>
                            </div>`).join('');
                        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: Array.from(mainEl.querySelectorAll('[data-lucide]')) });
                    }
                }
    }

    // ── Fetch & render recent winners (fallback HTTP) ─────────────────────
    function refreshWinners() {
        if (window.SPIN_WINNERS) {
            renderWinnersData({ success: true, winners: window.SPIN_WINNERS, main_winners: window.SPIN_MAIN_WINNERS || [] });
            return;
        }
        fetch('server/daily_spin.php?action=get_winners')
            .then(r => r.json())
            .then(data => renderWinnersData(data))
            .catch(() => {});
    }

    // ── Fetch spin status (fallback HTTP) ────────────────────────────────────
    function refreshSpinStatus() {
        if (window.SPIN_STATUS) {
            const data = window.SPIN_STATUS;
            if (data.success) { spinStatus = data; updateWidgetUI(); if (data.can_spin) showSpinNotification(); }
            return;
        }
        const email = localStorage.getItem('sulapfoto_verified_email');
        if (!email) return;
        fetch(`server/daily_spin.php?action=get_status&email=${encodeURIComponent(email)}`)
            .then(r => r.json())
            .then(data => {
                if (!data.success) return;
                spinStatus = data;
                updateWidgetUI();
                if (data.can_spin) showSpinNotification();
            })
            .catch(() => {});
    }

    // ── Update widget (mini card) UI ─────────────────────────────────────────
    function updateWidgetUI() {
        if (!spinStatus) return;
        const btn  = $('open-spin-modal-btn');
        const txt  = $('spin-widget-status');
        const badge = $('spin-available-badge');
        if (!btn || !txt) return;

        if (spinStatus.can_spin) {
            btn.disabled = false;
            btn.className = 'px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold transition-all shadow-md animate-pulse';
            txt.textContent = spinStatus.extra_spins > 0
                ? `${spinStatus.extra_spins} spin tersedia!`
                : 'Spin gratis tersedia!';
            if (badge) badge.classList.remove('hidden');
        } else {
            btn.disabled = false;
            btn.className = 'px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs font-bold transition-all';
            txt.textContent = 'Berikutnya dalam:';
            if (badge) badge.classList.add('hidden');
            startCountdown(spinStatus.next_spin_at);
        }
    }

    // ── Update modal spin button ─────────────────────────────────────────────
    function updateModalSpinBtn() {
        const btn = $('modal-spin-btn');
        if (!btn || !spinStatus) return;
        if (isSpinning) {
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="timer" class="w-4 h-4 inline align-middle mr-1"></i> Tunggu sebentar...';
            if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [btn] });
            return;
        }
        if (spinStatus.can_spin) {
            btn.disabled = false;
            const label = spinStatus.free_spin ? 'PUTAR!' :
                          `PUTAR! (${spinStatus.extra_spins} spin)`;
            btn.innerHTML = `<img src="/assets/spin.png" class="w-4 h-4 inline align-middle mr-1.5 object-contain" alt="spin"> ${label}`;
            if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [btn] });
        } else {
            btn.disabled = true;
            btn.innerHTML = `<i data-lucide="clock" class="w-4 h-4 inline align-middle mr-1.5"></i> Belum bisa spin`;
            if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [btn] });
        }
    }

    // ── Spawn confetti particles ──────────────────────────────────────
    function spawnConfetti() {
        const box = $('prize-confetti-box');
        if (!box) return;
        box.innerHTML = '';
        const colors = ['#fbbf24','#f97316','#ef4444','#a855f7','#06b6d4','#10b981','#fff','#fcd34d','#fb7185'];
        for (let i = 0; i < 28; i++) {
            const d = document.createElement('span');
            d.className = 'conf-dot';
            const size = 5 + Math.random() * 7;
            d.style.cssText = `left:${Math.random()*100}%;top:${-8-Math.random()*16}px;width:${size}px;height:${size}px;background:${colors[i%colors.length]};border-radius:${Math.random()>.5?'50%':'3px'};animation-duration:${.7+Math.random()*1.3}s;animation-delay:${Math.random()*.5}s;`;
            box.appendChild(d);
        }
        // Floating star emojis
        const starBox = $('prize-star-box');
        if (starBox) {
            starBox.innerHTML = '';
            const starIcons = ['★','✦','◆','✧','◇','★','✦','◆'];
            for (let i = 0; i < 10; i++) {
                const s = document.createElement('span');
                s.className = 'star-dot';
                s.textContent = starIcons[i % starIcons.length];
                s.style.cssText = `left:${5+Math.random()*88}%;bottom:${10+Math.random()*30}%;font-size:${14+Math.random()*14}px;animation-duration:${1.4+Math.random()*1.6}s;animation-delay:${Math.random()*.8}s;`;
                starBox.appendChild(s);
            }
        }
    }

    // ── Show prize modal ─────────────────────────────────────────────────────
    function showPrizeModal(prizeId, prizeResult) {
        const segId = (['retry_0','retry_1','retry_2','retry_3','retry_4'].includes(prizeId)) ? 'retry_0'
                    : (prizeId === 'boost_3000' || prizeId === 'ps_30day') ? 'jackpot'
                    : prizeId;
        const seg     = SEGMENTS.find(s => s.id === segId) || SEGMENTS[0];
        const modal   = $('spin-prize-modal');
        if (!modal) return;

        const isJackpot = !!prizeResult.jackpot;
        const isRetry   = prizeResult.type === 'retry';
        const isWin     = !isRetry;

        const winSection   = $('prize-win-section');
        const retrySection = $('prize-retry-section');
        const card         = $('prize-card');

        if (isWin) {
            winSection.classList.remove('hidden');
            retrySection.classList.add('hidden');

            const prizeGrads = {
                boost:          'linear-gradient(135deg,#fbbf24 0%,#f97316 45%,#ef4444 100%)',
                addons:         'linear-gradient(135deg,#8b5cf6 0%,#3b82f6 50%,#06b6d4 100%)',
                vip:            'linear-gradient(135deg,#f59e0b 0%,#dc2626 45%,#7c3aed 100%)',
                private_server: 'linear-gradient(135deg,#0ea5e9 0%,#6366f1 50%,#8b5cf6 100%)',
            };
            const grad = isJackpot
                ? 'linear-gradient(135deg,#ff6b35 0%,#dc2626 40%,#7f1d1d 100%)'
                : (prizeGrads[prizeResult.type] || `linear-gradient(135deg,${seg.color} 0%,${seg.color}99 100%)`);
            winSection.style.background = grad;

            $('prize-icon').innerHTML = seg.icon;
            if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [$('prize-icon')] });
            $('prize-win-title').innerHTML = isJackpot
                ? '<i data-lucide="trophy" class="w-5 h-5 inline align-middle mr-1"></i> HADIAH UTAMA! <i data-lucide="trophy" class="w-5 h-5 inline align-middle ml-1"></i>'
                : '<i data-lucide="star" class="w-5 h-5 inline align-middle mr-1"></i> Selamat!';
            $('prize-win-desc').textContent  = prizeResult.label || seg.label;
            $('prize-win-sub').textContent   = isJackpot
                ? 'Hadiah Utama berhasil dikirim ke akun Anda!'
                : 'Hadiah telah ditambahkan ke akun Anda.';

            const isBoost  = prizeResult.type === 'boost';
            const closeWin = $('prize-close-btn');
            if (closeWin) {
                closeWin.style.background = '';
                if (isBoost) {
                    closeWin.dataset.action = 'close';
                    closeWin.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5 inline align-middle mr-1"></i> Tutup';
                    closeWin.style.color = prizeGrads.boost ? '#ea580c' : (seg.color || '#059669');
                } else {
                    closeWin.dataset.action = 'refresh';
                    closeWin.innerHTML = '<i data-lucide="refresh-cw" class="w-3.5 h-3.5 inline align-middle mr-1"></i> Refresh Halaman';
                    closeWin.style.color = seg.color || '#059669';
                }
                if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [closeWin] });
            }

            // Trigger pop animation
            card.classList.remove('win-anim');
            void card.offsetWidth;
            card.classList.add('win-anim');

            spawnConfetti();
        } else {
            winSection.classList.add('hidden');
            retrySection.classList.remove('hidden');
            card.classList.remove('win-anim');

            $('prize-retry-icon').innerHTML = seg.icon;
            if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [$('prize-retry-icon')] });
            $('prize-retry-title').textContent = 'Kekalahan hari ini bukan akhir!';
            $('prize-retry-sub').textContent   = 'Kamu selangkah lebih dekat menuju kemenangan ^_^';
        }

        modal.classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // ── Open spin modal ──────────────────────────────────────────────────────
    function openSpinModal() {
        const modal  = $('spin-wheel-modal');
        const canvas = $('spin-canvas');
        if (!modal || !canvas) return;
        $('spin-result-info')?.classList.add('hidden');
        modal.classList.remove('hidden');
        drawWheel(canvas, currentAngle);
        updateModalSpinBtn();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // ── Do spin ──────────────────────────────────────────────────────────────
    function doSpin() {
        if (isSpinning || !spinStatus || !spinStatus.can_spin) return;
        const email = localStorage.getItem('sulapfoto_verified_email');
        if (!email) return;

        isSpinning = true;
        updateModalSpinBtn();

        fetch('server/daily_spin.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'spin', email }),
        })
        .then(r => r.json())
        .then(data => {
            if (!data.success) {
                isSpinning = false;
                updateModalSpinBtn();
                alert(data.error || 'Gagal spin, coba lagi');
                return;
            }

            const canvas = $('spin-canvas');
            const spinBtn = $('modal-spin-btn');
            if (spinBtn) spinBtn.textContent = '🎰 Sedang Spin...';
            animateSpin(canvas, data.segment, () => {
                isSpinning = false;
                spinStatus.can_spin    = data.remaining.free_spin || data.remaining.extra_spins > 0;
                spinStatus.free_spin   = data.remaining.free_spin;
                spinStatus.extra_spins = data.remaining.extra_spins;
                updateModalSpinBtn();
                updateWidgetUI();
                // Brief pause then show prize
                setTimeout(() => {
                    if (data.prize_result.type === 'retry') {
                        // Tampilkan info di dalam wheel modal, tidak perlu popup
                        const infoEl = $('spin-result-info');
                        if (infoEl) {
                            infoEl.textContent = '😔 Belum beruntung kali ini. Coba lagi besok!';
                            infoEl.classList.remove('hidden');
                        }
                    } else {
                        $('spin-wheel-modal')?.classList.add('hidden');
                        showPrizeModal(data.prize_id, data.prize_result);
                        if (data.prize_result.type === 'addons' || data.prize_result.type === 'private_server') {
                            if (typeof checkAllAddons === 'function') checkAllAddons();
                        }
                        if (data.prize_result.type === 'boost') {
                            if (typeof refreshBoostQuota === 'function') refreshBoostQuota();
                        }
                        refreshWinners();
                    }
                }, 600);
            });
        })
        .catch(() => {
            isSpinning = false;
            updateModalSpinBtn();
            alert('Koneksi gagal, coba lagi.');
        });
    }

    // ── Inject HTML ──────────────────────────────────────────────────────────
    function injectHTML() {
        // ── Widget card (injected after boost mode card by script) ────────
        const widget = document.createElement('div');
        widget.id = 'daily-spin-widget';
        widget.className = 'rounded-xl p-4 shadow-sm border border-emerald-100/80 relative overflow-hidden';
        widget.style.cssText = 'background: linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%); margin-bottom: 1.5rem;';
        widget.innerHTML = `
            <div class="absolute top-0 right-0 w-24 h-24 bg-emerald-200/30 rounded-full blur-2xl pointer-events-none"></div>
            <div class="flex flex-row items-center justify-between gap-3 relative z-10">
                <div class="flex flex-row items-center text-left gap-2 md:gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white flex-shrink-0 shadow-md relative">
                        <img src="/assets/spin.png" class="w-6 h-6 pointer-events-none object-contain" alt="spin">
                        <span id="spin-available-badge" class="hidden absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                    </div>
                    <div>
                        <h3 class="font-bold text-emerald-500 text-sm leading-none mb-0.5 flex items-center gap-1">Daily Spin <span class="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-bold">FREE</span></h3>
                        <p id="spin-widget-status" class="text-[10px] text-emerald-700/80 font-medium leading-none">Memuat...</p>
                        <span id="spin-countdown" class="text-[10px] font-bold text-emerald-800 tabular-nums"></span>
                    </div>
                </div>
                <div class="flex gap-2 flex-shrink-0">
                    <button id="open-spin-modal-btn" class="px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold transition-all shadow-md">
                        Spin!
                    </button>
                </div>
            </div>
            <!-- Main winners strip (hidden) -->
            <div id="spin-main-winners-section" class="hidden">
                <div id="spin-main-winners-list" class="space-y-1"></div>
            </div>
            <!-- Recent winners strip -->
            <div class="mt-2 pt-2 border-t border-emerald-200/40 relative z-10">
                <p class="text-[9px] font-bold text-emerald-700/60 uppercase tracking-wide mb-1.5"><i data-lucide="target" class="w-3 h-3 inline-block mr-1 align-middle"></i> Pemenang Terbaru</p>
                <div id="spin-winners-list" class="space-y-1">
                    <span class="text-[9px] text-emerald-600/40">Memuat...</span>
                </div>
            </div>`;

        // Insert after music-boost-grid (full width below 2-col row), fallback to after boost-section-wrap
        const musicBoostGrid = document.getElementById('music-boost-grid');
        const boostWrap = document.getElementById('boost-section-wrap');
        const anchor = musicBoostGrid || boostWrap;
        if (anchor) {
            anchor.insertAdjacentElement('afterend', widget);
        }

        // ── Spin Wheel Modal ──────────────────────────────────────────────
        const wheelModal = document.createElement('div');
        wheelModal.id = 'spin-wheel-modal';
        wheelModal.className = 'fixed inset-0 z-[300] hidden';
        wheelModal.innerHTML = `
            <div id="spin-wheel-backdrop" class="fixed inset-0 bg-slate-900/80 backdrop-blur-sm"></div>
            <div class="relative min-h-screen flex items-center justify-center p-4">
                <div class="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
                    <div class="flex items-center justify-between px-5 pt-5 pb-3">
                        <h2 class="font-bold text-slate-800 text-base flex items-center gap-2"><img src="/assets/spin.png" class="w-4 h-4 object-contain" alt="spin"> Daily Spin</h2>
                        <button id="spin-modal-close" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                            <i data-lucide="x" class="w-4 h-4 text-slate-600"></i>
                        </button>
                    </div>
                    <div id="spin-result-info" class="hidden mx-5 mb-2 text-center py-2 px-3 rounded-xl bg-slate-100 text-slate-600 text-xs font-medium"></div>
                    <!-- Pointer -->
                    <div class="flex justify-center relative" style="margin-bottom:-2px; z-index:2">
                        <svg width="24" height="28" viewBox="0 0 24 28" fill="none">
                            <polygon points="12,28 2,0 22,0" fill="#ef4444" stroke="#fff" stroke-width="1.5"/>
                        </svg>
                    </div>
                    <!-- Canvas -->
                    <div class="flex justify-center px-4 pb-4">
                        <canvas id="spin-canvas" width="280" height="280" class="rounded-full shadow-lg"></canvas>
                    </div>
                    <!-- Prizes legend (deduplicated) -->
                    <div class="px-4 pb-3 space-y-1">
                        ${(function(){
                            const seen = new Set();
                            return SEGMENTS.filter(s => {
                                const k = s.legendKey || s.id;
                                if (seen.has(k)) return false;
                                seen.add(k); return true;
                            }).map(s => `
                            <div class="flex items-start gap-2 text-[9px] text-slate-600">
                                <span class="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style="background:${s.color}"></span>
                                <span><span class="font-bold text-slate-700">${s.label}${s.sub ? ' ' + s.sub : ''}</span> — ${s.desc}</span>
                            </div>`).join('');
                        })()}
                    </div>
                    <!-- Spin button -->
                    <div class="px-4 pb-5 flex flex-col gap-2">
                        <button id="modal-spin-btn" class="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            <i data-lucide="rotate-cw" class="w-4 h-4"></i> PUTAR!
                        </button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(wheelModal);

        // ── Prize Result Modal ────────────────────────────────────────────
        const prizeModal = document.createElement('div');
        prizeModal.id = 'spin-prize-modal';
        prizeModal.className = 'fixed inset-0 z-[310] hidden';
        prizeModal.innerHTML = `
            <style>
                @keyframes winSlideUp{0%{transform:translateY(50px) scale(.92);opacity:0}70%{transform:translateY(-6px) scale(1.02)}100%{transform:translateY(0) scale(1);opacity:1}}
                @keyframes iconBounce{0%,100%{transform:scale(1) rotate(0)}30%{transform:scale(1.35) rotate(-12deg)}60%{transform:scale(1.15) rotate(8deg)}}
                @keyframes confDrop{0%{opacity:1;transform:translateY(0) rotate(0)}100%{opacity:0;transform:translateY(260px) rotate(900deg)}}
                @keyframes starFloat{0%{opacity:.9;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-130px) scale(.4)}}
                @keyframes ringGlow{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.35),0 0 16px rgba(255,255,255,.2)}50%{box-shadow:0 0 0 10px rgba(255,255,255,0),0 0 36px rgba(255,255,255,.45)}}
                @keyframes bgShimmer{0%,100%{opacity:1}50%{opacity:.85}}
                #prize-card.win-anim{animation:winSlideUp .5s cubic-bezier(.34,1.56,.64,1) both}
                .prize-icon-anim{animation:iconBounce .75s ease .35s both;display:inline-block}
                .conf-dot{position:absolute;border-radius:3px;animation:confDrop linear forwards}
                .star-dot{position:absolute;animation:starFloat ease-out forwards;pointer-events:none}
                #prize-win-icon-ring{animation:ringGlow 1.8s ease-in-out .5s infinite}
            </style>
            <div class="fixed inset-0 bg-black/80 backdrop-blur-md"></div>
            <div class="relative min-h-screen flex items-center justify-center p-3">
                <div id="prize-card" class="prize-card w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden text-center">

                    <!-- WIN section -->
                    <div id="prize-win-section" class="relative overflow-hidden hidden">
                        <div id="prize-confetti-box" class="absolute inset-0 pointer-events-none overflow-hidden z-0"></div>
                        <div id="prize-star-box" class="absolute inset-0 pointer-events-none overflow-hidden z-0"></div>
                        <!-- Gradient hero area -->
                        <div class="relative z-10 pt-10 pb-7 px-6">
                            <div id="prize-win-icon-ring" class="w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center" style="background:rgba(255,255,255,.18);border:2.5px solid rgba(255,255,255,.5)">
                                <div id="prize-icon" class="text-5xl prize-icon-anim"></div>
                            </div>
                            <h2 id="prize-win-title" class="font-extrabold text-white text-2xl leading-tight mb-2 drop-shadow-lg"></h2>
                            <div class="flex justify-center gap-1.5 mb-3"><i data-lucide="sparkles" class="w-5 h-5 text-white/90"></i><i data-lucide="star" class="w-5 h-5 text-white/90"></i><i data-lucide="sparkles" class="w-5 h-5 text-white/90"></i></div>
                            <p id="prize-win-desc" class="font-black text-3xl text-white drop-shadow-lg leading-tight"></p>
                        </div>
                        <!-- Themed bottom panel -->
                        <div class="bg-black/20 px-6 pt-5 pb-6">
                            <p id="prize-win-sub" class="text-sm text-white/85 mb-4"></p>
                            <div class="bg-white/15 border border-white/25 rounded-2xl px-4 py-3 mb-4 text-left">
                                <p class="text-xs text-white font-semibold flex items-center gap-1.5"><i data-lucide="lightbulb" class="w-3.5 h-3.5 flex-shrink-0"></i> Klik Refresh agar hadiah muncul di halaman</p>
                            </div>
                            <button id="prize-spin-again-btn" class="w-full py-2.5 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-bold transition-all hidden mb-2">Spin Lagi!</button>
                            <button id="prize-close-btn" class="w-full py-3 rounded-2xl bg-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg" data-action="refresh"><i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh Halaman</button>
                        </div>
                    </div>

                    <!-- RETRY section -->
                    <div id="prize-retry-section" class="bg-white py-10 px-6 hidden">
                        <div id="prize-retry-icon" class="text-5xl mb-4 opacity-40"></div>
                        <h2 id="prize-retry-title" class="font-bold text-slate-500 text-base mb-2"></h2>
                        <p id="prize-retry-sub" class="text-xs text-slate-400 mb-6"></p>
                        <button id="prize-spin-again-btn-r" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold transition-all hidden mb-2">Spin Lagi!</button>
                        <button id="prize-retry-close-btn" class="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-all">Tutup</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(prizeModal);

    }

    // ── Event listeners ──────────────────────────────────────────────────────
    function bindEvents() {
        document.addEventListener('click', function (e) {
            // Spin notification open
            if (e.target.closest('#spin-notif-open-btn')) {
                $('spin-available-notification')?.classList.add('hidden');
                openSpinModal();
                return;
            }
            // Spin notification close
            if (e.target.closest('#spin-notif-close-btn')) {
                const notif = $('spin-available-notification');
                if (notif) { notif.classList.add('hidden'); notif._dismissed = true; }
                return;
            }

            // Open wheel modal
            if (e.target.closest('#open-spin-modal-btn')) { openSpinModal(); return; }

            // Close wheel modal
            if (e.target.closest('#spin-modal-close') || e.target.id === 'spin-wheel-backdrop') {
                if (!isSpinning) $('spin-wheel-modal')?.classList.add('hidden');
                return;
            }

            // Do spin
            if (e.target.closest('#modal-spin-btn')) { doSpin(); return; }

            // Close/refresh prize modal (WIN = refresh or close depending on prize, RETRY = close)
            if (e.target.closest('#prize-close-btn')) {
                const btn = e.target.closest('#prize-close-btn');
                if (btn.dataset.action === 'close') {
                    $('spin-prize-modal')?.classList.add('hidden');
                    $('prize-card')?.classList.remove('win-anim');
                } else {
                    location.reload();
                }
                return;
            }
            if (e.target.closest('#prize-retry-close-btn')) {
                $('spin-prize-modal')?.classList.add('hidden');
                $('prize-card')?.classList.remove('win-anim');
                return;
            }

            // Spin again
            if (e.target.closest('#prize-spin-again-btn') || e.target.closest('#prize-spin-again-btn-r')) {
                $('spin-prize-modal')?.classList.add('hidden');
                $('prize-card')?.classList.remove('win-anim');
                openSpinModal();
                return;
            }

        });
    }

    // ── Add jackpot CSS ──────────────────────────────────────────────────────
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .jackpot-glow { box-shadow: 0 0 40px rgba(239,68,68,0.5), 0 0 80px rgba(239,68,68,0.3); animation: jackpot-pulse 0.8s ease-in-out infinite alternate; }
            @keyframes jackpot-pulse { from { box-shadow: 0 0 20px rgba(239,68,68,0.4); } to { box-shadow: 0 0 60px rgba(239,68,68,0.7), 0 0 100px rgba(239,68,68,0.4); } }
            #open-spin-modal-btn.animate-pulse { animation: spin-btn-pulse 1.5s ease-in-out infinite; }
            @keyframes spin-btn-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); } 50% { box-shadow: 0 0 0 8px rgba(16,185,129,0); } }
        `;
        document.head.appendChild(style);
    }

    // ── Init ─────────────────────────────────────────────────────────────────
    function init() {
        injectStyles();
        injectHTML();
        bindEvents();
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Listen for config polling updates (config arrives in <1s after page load)
        let _spinStatusReady = false, _winnersReady = false;
        document.addEventListener('sulap:spin-status',  (e) => {
            if (e.detail && e.detail.success) {
                _spinStatusReady = true;
                window.SPIN_STATUS = e.detail; spinStatus = e.detail;
                updateWidgetUI(); if (e.detail.can_spin) showSpinNotification();
            }
        });
        document.addEventListener('sulap:spin-winners', (e) => {
            if (e.detail) {
                _winnersReady = true;
                window.SPIN_WINNERS = e.detail.winners; window.SPIN_MAIN_WINNERS = e.detail.main_winners;
                renderWinnersData({ success: true, ...e.detail });
            }
        });
        // Fallback HTTP: only if config hasn't provided data within 6s
        // (first config can be slow ~3-5s due to systeminfo fetch on first call)
        setTimeout(() => { if (!_spinStatusReady) refreshSpinStatus(); }, 6000);
        setTimeout(() => { if (!_winnersReady)    refreshWinners();    }, 6000);

        // Periodic fallback refresh
        setInterval(refreshSpinStatus, 300000);
        setInterval(refreshWinners, 120000);
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for external refresh calls (e.g. after page navigation)
    window.refreshDailySpin = refreshSpinStatus;
})();
