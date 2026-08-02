(function() {
    // Inject Modal HTML for Addon Payment
    const addonPaymentModalHTML = `
    <div id="addon-payment-modal" class="fixed inset-0 z-[120] hidden flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 transition-all duration-300">
        <div class="relative w-full max-w-xs bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden transform transition-all scale-100 flex flex-col max-h-[85vh]">

            <!-- Header (matching Boost style) -->
            <div class="px-4 py-3 text-white flex justify-between items-center relative overflow-hidden"
                 style="background: linear-gradient(145deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%); border-bottom: 1px solid rgba(255,255,255,0.05);">
                <div class="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <div class="flex items-center gap-3 relative z-10">
                    <div class="w-9 h-9 rounded-2xl bg-white/10 border border-white/10 text-purple-400 flex items-center justify-center shadow-lg shadow-black/20">
                        <i data-lucide="server" class="w-4 h-4"></i>
                    </div>
                    <div>
                        <h2 class="text-sm font-bold text-slate-100 tracking-wide">Private Server</h2>
                        <p id="addon-title-display" class="text-[10px] font-medium text-slate-400">Model AI premium tanpa batas!</p>
                    </div>
                </div>
                <button id="close-addon-payment-modal" class="relative z-10 p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>

            <div class="overflow-y-auto p-4 custom-scrollbar bg-slate-50/50">
                <div id="addon-payment-view">

                    <!-- Loading -->
                    <div id="addon-loading-view" class="py-10 flex flex-col items-center justify-center">
                        <div class="w-8 h-8 border-2 border-slate-200 border-t-purple-500 rounded-full animate-spin mb-3"></div>
                        <span class="text-xs text-slate-500">Memuat...</span>
                    </div>

                    <!-- Duration selection (private server) -->
                    <div id="addon-duration-view" class="hidden animate-in slide-in-from-bottom-4 duration-300">
                        <div id="ps-tiers" class="space-y-2.5">

                            <div class="ps-dur-btn group cursor-pointer relative bg-white border border-slate-200/60 rounded-2xl p-3 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 flex justify-between items-center" data-days="1" data-price="7000">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                                        <span class="text-xs font-bold">1H</span>
                                    </div>
                                    <div>
                                        <div class="text-xs font-bold text-slate-700 group-hover:text-purple-700 transition-colors">1 Hari</div>
                                        <div class="text-[10px] text-slate-400">Coba Dulu</div>
                                    </div>
                                </div>
                                <div class="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg group-hover:bg-purple-50 group-hover:text-purple-700 transition-colors flex-shrink-0">Rp 7rb</div>
                                <div class="absolute inset-0 border-2 border-transparent rounded-2xl pointer-events-none group-[.selected]:border-purple-500"></div>
                            </div>

                            <div class="ps-dur-btn group cursor-pointer relative bg-white border border-slate-200/60 rounded-2xl p-3 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 flex justify-between items-center" data-days="3" data-price="15000">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                                        <span class="text-xs font-bold">3H</span>
                                    </div>
                                    <div>
                                        <div class="text-xs font-bold text-slate-700 group-hover:text-purple-700 transition-colors">3 Hari</div>
                                        <div class="text-[10px] text-slate-400">Starter Pack</div>
                                    </div>
                                </div>
                                <div class="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg group-hover:bg-purple-50 group-hover:text-purple-700 transition-colors flex-shrink-0">Rp 15rb</div>
                                <div class="absolute inset-0 border-2 border-transparent rounded-2xl pointer-events-none group-[.selected]:border-purple-500"></div>
                            </div>

                            <div class="ps-dur-btn group cursor-pointer relative bg-white border border-slate-200/60 rounded-2xl p-3 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 flex justify-between items-center" data-days="7" data-price="25000">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                                        <span class="text-xs font-bold">7H</span>
                                    </div>
                                    <div>
                                        <div class="text-xs font-bold text-slate-700 group-hover:text-purple-700 transition-colors">7 Hari</div>
                                        <div class="text-[10px] text-slate-400">Mingguan</div>
                                    </div>
                                </div>
                                <div class="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg group-hover:bg-purple-50 group-hover:text-purple-700 transition-colors flex-shrink-0">Rp 25rb</div>
                                <div class="absolute inset-0 border-2 border-transparent rounded-2xl pointer-events-none group-[.selected]:border-purple-500"></div>
                            </div>

                            <div class="ps-dur-btn group cursor-pointer relative bg-white border border-slate-200/60 rounded-2xl p-3 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 flex justify-between items-center" data-days="14" data-price="45000">
                                <div class="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 border border-white">TERBAIK</div>
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                                        <span class="text-xs font-bold">14H</span>
                                    </div>
                                    <div>
                                        <div class="text-xs font-bold text-slate-700 group-hover:text-purple-700 transition-colors">14 Hari</div>
                                        <div class="text-[10px] text-slate-400">Best Value</div>
                                    </div>
                                </div>
                                <div class="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg group-hover:bg-purple-50 group-hover:text-purple-700 transition-colors flex-shrink-0">Rp 45rb</div>
                                <div class="absolute inset-0 border-2 border-transparent rounded-2xl pointer-events-none group-[.selected]:border-purple-500"></div>
                            </div>

                            <div class="ps-dur-btn group cursor-pointer relative bg-white border border-slate-200/60 rounded-2xl p-3 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 flex justify-between items-center" data-days="30" data-price="80000">
                                <div class="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 border border-white">HEMAT</div>
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                                        <span class="text-xs font-bold">30H</span>
                                    </div>
                                    <div>
                                        <div class="text-xs font-bold text-slate-700 group-hover:text-purple-700 transition-colors">30 Hari</div>
                                        <div class="text-[10px] text-slate-400">Pro Creator</div>
                                    </div>
                                </div>
                                <div class="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg group-hover:bg-purple-50 group-hover:text-purple-700 transition-colors flex-shrink-0">Rp 80rb</div>
                                <div class="absolute inset-0 border-2 border-transparent rounded-2xl pointer-events-none group-[.selected]:border-purple-500"></div>
                            </div>

                        </div>
                    </div>

                    <!-- Success -->
                    <div id="addon-payment-success-msg" class="hidden flex flex-col items-center justify-center py-6 animate-in fade-in zoom-in duration-300">
                        <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-3 ring-4 ring-emerald-50 shadow-xl">
                            <i data-lucide="check" class="w-8 h-8 stroke-[3]"></i>
                        </div>
                        <h3 class="text-lg font-bold text-slate-800 mb-0.5">Pembayaran Berhasil!</h3>
                        <p class="text-xs text-slate-500 mb-4">Fitur telah aktif. Silakan refresh halaman.</p>
                        <button onclick="window.location.reload()" class="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 text-xs">
                            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh Halaman
                        </button>
                    </div>

                    <!-- Payment / QRIS -->
                    <div id="addon-payment-process-view" class="hidden animate-in slide-in-from-bottom-4 duration-300">
                        <div class="bg-white rounded-xl p-3 border border-slate-200 mb-3 shadow-sm">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-[10px] font-medium text-slate-500">Total Pembayaran</span>
                                <span id="addon-payment-amount-display" class="text-xs font-bold text-slate-800">Rp -</span>
                            </div>
                            <div class="w-full aspect-square bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden border border-slate-100 relative group">
                                <div id="addon-qris-container" class="w-full h-full p-2"></div>
                                <div class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                    <a id="btn-download-addon-qris-overlay" href="#" download="qris-addon-payment.png" class="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-[10px] font-bold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all">Download</a>
                                </div>
                            </div>
                            <p class="text-[9px] text-slate-400 mt-1.5">Scan QRIS via E-Wallet</p>
                        </div>
                        <div class="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg p-2.5 mb-3">
                            <div class="flex items-center gap-1.5">
                                <i data-lucide="timer" class="w-3.5 h-3.5 text-amber-500"></i>
                                <span class="text-[10px] font-medium text-amber-700">Sisa Waktu</span>
                            </div>
                            <div id="addon-payment-timer" class="text-xs font-bold text-amber-600 font-mono">15:00</div>
                        </div>
                        <a id="btn-download-addon-qris" href="#" download="qris-addon-payment.png" class="w-full py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-xs mb-3">
                            <i data-lucide="download" class="w-3.5 h-3.5"></i> Simpan QRIS
                        </a>
                        <button id="btn-check-addon-payment" class="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 text-xs">
                            <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
                            Konfirmasi Pembayaran
                        </button>
                        <p id="addon-payment-status-label" class="text-[10px] text-center font-bold mt-2 hidden"></p>
                    </div>

                </div>
            </div>

            <!-- Footer CTA -->
            <div id="addon-footer" class="p-3 border-t border-slate-200/60 bg-white">
                <button id="btn-lanjut-bayar" disabled class="w-full py-3 bg-slate-100 text-slate-400 font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-not-allowed enabled:bg-slate-900 enabled:text-white enabled:shadow-lg enabled:shadow-slate-900/20 enabled:cursor-pointer enabled:hover:bg-slate-800 text-xs">
                    <span>Pilih Paket</span>
                    <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                </button>
            </div>

        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', addonPaymentModalHTML);

    // Addon Buy Confirm Modal (Boost style)
    const confirmModalHTML = `
    <div id="addon-confirm-modal" class="fixed inset-0 z-[125] hidden flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
        <div class="relative w-full max-w-xs bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col">
            <div class="px-4 py-3 text-white flex justify-between items-center relative overflow-hidden"
                 style="background: linear-gradient(145deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%); border-bottom: 1px solid rgba(255,255,255,0.05);">
                <div class="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <div class="flex items-center gap-3 relative z-10">
                    <div class="w-9 h-9 rounded-2xl bg-white/10 border border-white/10 text-teal-400 flex items-center justify-center shadow-lg shadow-black/20">
                        <i data-lucide="shopping-bag" class="w-4 h-4"></i>
                    </div>
                    <div>
                        <h2 class="text-sm font-bold text-slate-100 tracking-wide">Konfirmasi Pembelian</h2>
                        <p id="addon-confirm-subtitle" class="text-[10px] font-medium text-slate-400">Sekali bayar, akses selamanya</p>
                    </div>
                </div>
                <button id="close-addon-confirm-modal" class="relative z-10 p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <div class="p-4 bg-slate-50/50">
                <div class="bg-white rounded-2xl border border-slate-200/60 p-3 flex justify-between items-center shadow-sm">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                            <i data-lucide="package" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <div id="addon-confirm-name" class="text-xs font-bold text-slate-700"></div>
                            <div class="text-[10px] text-slate-400">Akses Seumur Hidup</div>
                        </div>
                    </div>
                    <div id="addon-confirm-price" class="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1.5 rounded-xl flex-shrink-0"></div>
                </div>
            </div>
            <div class="flex gap-2 p-3 border-t border-slate-200/60 bg-white">
                <button id="addon-confirm-cancel-btn" class="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs">Batal</button>
                <button id="addon-confirm-ok-btn" class="flex-1 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 text-xs flex items-center justify-center gap-1.5">
                    <i data-lucide="shopping-cart" class="w-3.5 h-3.5"></i>
                    <span>Beli Sekarang</span>
                </button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', confirmModalHTML);

    (function() {
        const modal = document.getElementById('addon-confirm-modal');
        let _pendingAddonKey = null, _pendingPrice = 0, _pendingTitle = '';

        function closeConfirmModal() { modal.classList.add('hidden'); }

        document.getElementById('close-addon-confirm-modal').addEventListener('click', closeConfirmModal);
        document.getElementById('addon-confirm-cancel-btn').addEventListener('click', closeConfirmModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeConfirmModal(); });
        document.getElementById('addon-confirm-ok-btn').addEventListener('click', () => {
            closeConfirmModal();
            if (window.buyAddon && _pendingAddonKey) window.buyAddon(_pendingAddonKey, _pendingPrice, _pendingTitle);
        });

        window.showAddonBuyConfirm = function(addonKey, price, title) {
            _pendingAddonKey = addonKey;
            _pendingPrice = price;
            _pendingTitle = title;
            document.getElementById('addon-confirm-subtitle').textContent = title;
            document.getElementById('addon-confirm-name').textContent = title;
            document.getElementById('addon-confirm-price').textContent = 'Rp ' + price.toLocaleString('id-ID');
            modal.classList.remove('hidden');
            if (window.lucide) window.lucide.createIcons();
        };
    })();

    // Variables
    let addonPaymentInterval = null;
    let addonCheckStatusInterval = null;
    let currentAddonReference = null;
    let currentAddonKey = null;
    let currentSelectedDays = 0;

    // Functions
    function showAddonPaymentModal(addonKey, price, title) {
        const modal = document.getElementById('addon-payment-modal');
        modal.classList.remove('hidden');
        
        currentAddonKey = addonKey;
        document.getElementById('addon-title-display').textContent = title;
        
        resetAddonModal();
        if (window.lucide) window.lucide.createIcons();

        // Check for pending transaction
        checkPendingAddonTransaction(addonKey);
    }

    async function checkPendingAddonTransaction(addonKey) {
        const email = localStorage.getItem('sulapfoto_verified_email');
        if (!email) return;

        try {
            const response = await fetch('/server/addons_payment.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'check_pending',
                    email: email
                })
            });
            
            const result = await response.json();
            const lv = document.getElementById('addon-loading-view');
            if (lv) lv.classList.add('hidden');
            if (result.success && result.has_pending && result.transaction.addon_key === addonKey) {
                // Restore transaction view
                showAddonPaymentView(result.transaction);
            } else if (addonKey === 'private_server') {
                showDurationSelectionView();
            } else {
                // Create new transaction if no pending
                createNewAddonTransaction(addonKey);
            }
        } catch (e) {
            console.error('Failed to check pending addon transaction', e);
            const lv2 = document.getElementById('addon-loading-view');
            if (lv2) lv2.classList.add('hidden');
            if (addonKey === 'private_server') {
                showDurationSelectionView();
            } else {
                createNewAddonTransaction(addonKey);
            }
        }    }

    async function createNewAddonTransaction(addonKey, days = 0) {
        const email = localStorage.getItem('sulapfoto_verified_email');
        
        // Show payment process view with loading spinner in QR area
        document.getElementById('addon-payment-process-view').classList.remove('hidden');
        const qrContainer = document.getElementById('addon-qris-container');
        qrContainer.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-400"><div class="w-8 h-8 border-2 border-slate-200 border-t-teal-500 rounded-full animate-spin mb-2"></div><span class="text-xs">Membuat QRIS...</span></div>`;

        try {
            const response = await fetch('/server/addons_payment.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_transaction',
                    email: email,
                    addon_key: addonKey,
                    days: days
                })
            });

            const result = await response.json();

            if (result.success) {
                showAddonPaymentView(result);
            } else {
                alert('Gagal membuat transaksi: ' + (result.message || 'Unknown error'));
                hideAddonPaymentModal();
            }
        } catch (e) {
            console.error(e);
            alert('Terjadi kesalahan koneksi.');
            hideAddonPaymentModal();
        }
    }

    function hideAddonPaymentModal() {
        const modal = document.getElementById('addon-payment-modal');
        modal.classList.add('hidden');
        stopAddonTimers();
    }

    function resetAddonModal() {
        document.getElementById('addon-payment-success-msg').classList.add('hidden');
        document.getElementById('addon-payment-process-view').classList.add('hidden');
        const dv = document.getElementById('addon-duration-view');
        if (dv) dv.classList.add('hidden');
        const lv = document.getElementById('addon-loading-view');
        if (lv) lv.classList.remove('hidden');

        // Show footer, reset CTA button
        const footer = document.getElementById('addon-footer');
        if (footer) footer.classList.remove('hidden');

        // Reset duration selection state
        currentSelectedDays = 0;
        const lanjutBtn = document.getElementById('btn-lanjut-bayar');
        if (lanjutBtn) {
            lanjutBtn.disabled = true;
            lanjutBtn.innerHTML = '<span>Pilih Paket</span><i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>';
        }
        document.querySelectorAll('.ps-dur-btn').forEach(b => b.classList.remove('selected'));

        currentAddonReference = null;
        stopAddonTimers();
    }

    function showDurationSelectionView() {
        const lv = document.getElementById('addon-loading-view');
        if (lv) lv.classList.add('hidden');
        const dv = document.getElementById('addon-duration-view');
        if (dv) dv.classList.remove('hidden');
        const footer = document.getElementById('addon-footer');
        if (footer) footer.classList.remove('hidden');

        // Auto-select 14 hari by default
        const defaultBtn = document.querySelector('.ps-dur-btn[data-days="14"]');
        if (defaultBtn) defaultBtn.click();
    }

    function stopAddonTimers() {
        if (addonPaymentInterval) clearInterval(addonPaymentInterval);
        if (addonCheckStatusInterval) clearInterval(addonCheckStatusInterval);
    }

    function showAddonPaymentView(data) {
        const lv = document.getElementById('addon-loading-view');
        if (lv) lv.classList.add('hidden');
        const dv = document.getElementById('addon-duration-view');
        if (dv) dv.classList.add('hidden');
        const footer = document.getElementById('addon-footer');
        if (footer) footer.classList.add('hidden');
        document.getElementById('addon-payment-process-view').classList.remove('hidden');

        // Update amount display
        document.getElementById('addon-payment-amount-display').textContent = `Rp ${parseInt(data.amount).toLocaleString('id-ID')}`;

        // Render QR
        const qrContainer = document.getElementById('addon-qris-container');
        qrContainer.innerHTML = ''; // Clear previous
        
        // Use QR Server API
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.qrString)}`;
        const img = document.createElement('img');
        img.src = qrUrl;
        img.alt = 'QRIS Payment';
        img.className = 'w-full h-full object-contain';
        qrContainer.appendChild(img);
        
        document.getElementById('btn-download-addon-qris').href = qrUrl;
        document.getElementById('btn-download-addon-qris-overlay').href = qrUrl;

        // Timer
        const expiry = data.remaining_seconds || (60 * 60);
        const timerEl = document.getElementById('addon-payment-timer');
        startAddonTimer(expiry);
        
        // Start polling
        currentAddonReference = data.reference;
        startAddonPolling();
    }

    function startAddonTimer(duration) {
        let timer = duration, minutes, seconds;
        const display = document.getElementById('addon-payment-timer');
        
        if (addonPaymentInterval) clearInterval(addonPaymentInterval);
        
        addonPaymentInterval = setInterval(function () {
            minutes = parseInt(timer / 60, 10);
            seconds = parseInt(timer % 60, 10);

            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            display.textContent = minutes + ":" + seconds;

            if (--timer < 0) {
                clearInterval(addonPaymentInterval);
                display.textContent = "EXPIRED";
                if (addonCheckStatusInterval) clearInterval(addonCheckStatusInterval);
                alert('Waktu pembayaran habis. Silakan ulangi.');
                hideAddonPaymentModal();
            }
        }, 1000);
    }

    function startAddonPolling() {
        if (addonCheckStatusInterval) clearInterval(addonCheckStatusInterval);
        
        addonCheckStatusInterval = setInterval(async () => {
            try {
                const response = await fetch('/server/addons_payment.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'check_status',
                        reference: currentAddonReference
                    })
                });
                
                const result = await response.json();
                if (result.success && result.status === 'success') {
                    clearInterval(addonCheckStatusInterval);
                    clearInterval(addonPaymentInterval);
                    
                    // Show success UI
                    document.getElementById('addon-payment-process-view').classList.add('hidden');
                    document.getElementById('addon-payment-success-msg').classList.remove('hidden');
                    
                    // Update UI immediately if possible
                    if (window.invalidateAddonCache) window.invalidateAddonCache();
                    if (window.checkAutoUpscaleStatus) window.checkAutoUpscaleStatus();
                    if (window.checkMyFavoriteStatus) window.checkMyFavoriteStatus();
                    if (window.checkSufoGptStatus) window.checkSufoGptStatus();
                    if (window.checkSuperBookStatus) window.checkSuperBookStatus();
                    if (window.checkThemesStatus) window.checkThemesStatus();
                    if (window.checkTtsStatus) window.checkTtsStatus();
                    if (window.checkPrivateServerStatus) window.checkPrivateServerStatus();
                    if (window.checkLightingShadowsStatus) window.checkLightingShadowsStatus();
                    
                    // Auto-reload for private_server so sidebar appears
                    if (currentAddonKey === 'private_server') {
                        setTimeout(() => window.location.reload(), 1500);
                    }
                }
            } catch (e) {
                console.error('Polling error', e);
            }
        }, 3000); // Check every 3 seconds
    }

    // Duration button event delegation
    document.getElementById('addon-payment-modal').addEventListener('click', function(e) {
        const btn = e.target.closest('.ps-dur-btn');
        if (!btn) return;
        currentSelectedDays = parseInt(btn.dataset.days);
        const price = parseInt(btn.dataset.price);

        document.querySelectorAll('.ps-dur-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        const lanjutBtn = document.getElementById('btn-lanjut-bayar');
        if (lanjutBtn) {
            lanjutBtn.disabled = false;
            lanjutBtn.innerHTML = `<span>Bayar Rp ${price.toLocaleString('id-ID')}</span><i data-lucide="arrow-right" class="w-3.5 h-3.5 transition-transform"></i>`;
            if (window.lucide) window.lucide.createIcons();
        }
    });

    // Lanjut Bayar button
    document.getElementById('addon-payment-modal').addEventListener('click', function(e) {
        if (e.target.id !== 'btn-lanjut-bayar' && !e.target.closest('#btn-lanjut-bayar')) return;
        const lanjutBtn = document.getElementById('btn-lanjut-bayar');
        if (!lanjutBtn || lanjutBtn.disabled || !currentSelectedDays) return;
        const dv = document.getElementById('addon-duration-view');
        if (dv) dv.classList.add('hidden');
        const lv = document.getElementById('addon-loading-view');
        if (lv) lv.classList.remove('hidden');
        createNewAddonTransaction(currentAddonKey, currentSelectedDays);
    });

    // Event Listeners
    document.getElementById('close-addon-payment-modal').addEventListener('click', hideAddonPaymentModal);

    // Manual Check
    document.getElementById('btn-check-addon-payment').addEventListener('click', async function() {
        if (!currentAddonReference) return;

        const btn = this;
        const originalContent = btn.innerHTML;
        const statusLabel = document.getElementById('addon-payment-status-label');
        if (statusLabel) statusLabel.classList.add('hidden');
        
        btn.disabled = true;
        btn.innerHTML = `<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Cek...`;

        try {
            const response = await fetch('/server/addons_payment.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'check_status',
                    reference: currentAddonReference
                })
            });
            
            const result = await response.json();
            if (result.success && result.status === 'success') {
                clearInterval(addonPaymentInterval);
                
                document.getElementById('addon-payment-process-view').classList.add('hidden');
                document.getElementById('addon-payment-success-msg').classList.remove('hidden');
                
                if (window.invalidateAddonCache) window.invalidateAddonCache();
                if (window.checkAutoUpscaleStatus) window.checkAutoUpscaleStatus();
                if (window.checkMyFavoriteStatus) window.checkMyFavoriteStatus();
                if (window.checkSufoGptStatus) window.checkSufoGptStatus();
                if (window.checkSuperBookStatus) window.checkSuperBookStatus();
                if (window.checkThemesStatus) window.checkThemesStatus();
                if (window.checkTtsStatus) window.checkTtsStatus();
                if (window.checkPrivateServerStatus) window.checkPrivateServerStatus();
                if (window.checkLightingShadowsStatus) window.checkLightingShadowsStatus();
                
                // Auto-reload for private_server so sidebar appears
                if (currentAddonKey === 'private_server') {
                    setTimeout(() => window.location.reload(), 1500);
                }
            } else {
                if (statusLabel) {
                    statusLabel.textContent = 'Pembayaran belum terkonfirmasi. Silakan tunggu.';
                    statusLabel.className = 'text-xs text-center font-bold mt-3 text-amber-600 animate-pulse';
                    statusLabel.classList.remove('hidden');
                }
            }
        } catch (e) {
            console.error('Manual check error', e);
            if (statusLabel) {
                statusLabel.textContent = 'Gagal mengecek status.';
                statusLabel.className = 'text-xs text-center font-bold mt-3 text-red-500';
                statusLabel.classList.remove('hidden');
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalContent;
            if (window.lucide) window.lucide.createIcons();
        }
    });

    // Expose globally
    window.buyAddon = function(addonKey, price, title) {
        showAddonPaymentModal(addonKey, price, title);
    };

})();
