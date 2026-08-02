(function() {
    // Inject Modal HTML
    const modalHTML = `
    <div id="video-payment-modal" class="fixed inset-0 z-[110] hidden flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 transition-all duration-300">
        <div class="relative w-full max-w-xs bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden transform transition-all scale-100 flex flex-col max-h-[85vh]">
            
            <!-- Header -->
            <div class="px-4 py-3 text-white flex justify-between items-center relative overflow-hidden" 
                 style="background: linear-gradient(145deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%); border-bottom: 1px solid rgba(255,255,255,0.05);">
                 
                 <!-- Decorative glow -->
                 <div class="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                <div class="flex items-center gap-3 relative z-10">
                    <div class="w-9 h-9 rounded-2xl bg-white/10 border border-white/10 text-purple-400 flex items-center justify-center shadow-lg shadow-black/20">
                        <i data-lucide="video" class="w-4 h-4"></i>
                    </div>
                    <div>
                        <h2 class="text-sm font-bold text-slate-100 tracking-wide">Pembayaran Video</h2>
                        <p class="text-[10px] font-medium text-slate-400">Top-up kuota video</p>
                    </div>
                </div>
                <button id="close-video-payment-modal" class="relative z-10 p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>

            <div class="overflow-y-auto p-4 custom-scrollbar bg-slate-50/50">
                
                <!-- Payment View -->
                <div id="video-payment-view" class="text-center">
                    
                    <div id="video-payment-success-msg" class="hidden flex flex-col items-center justify-center py-6 animate-in fade-in zoom-in duration-300">
                        <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-3 ring-4 ring-emerald-50 shadow-xl">
                            <i data-lucide="check" class="w-8 h-8 stroke-[3]"></i>
                        </div>
                        <h3 class="text-base font-bold text-slate-800 mb-1">Pembayaran Berhasil!</h3>
                        <p class="text-xs text-slate-500 mb-4">Kuota video Anda telah ditambahkan</p>
                        <button id="close-video-payment-success" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl">
                            Tutup
                        </button>
                    </div>

                    <div id="video-payment-process-view" class="animate-in slide-in-from-bottom-4 duration-300">
                        <div class="bg-white rounded-xl p-3 border border-slate-200 mb-3 shadow-sm">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-[10px] font-medium text-slate-500">Total Pembayaran</span>
                                <span id="video-payment-amount-display" class="text-sm font-bold text-purple-700">Rp 0</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-[10px] font-medium text-slate-500">Kredit Video</span>
                                <span id="video-payment-credits-display" class="text-sm font-bold text-purple-700">0 Video</span>
                            </div>
                        </div>

                        <div class="bg-white rounded-xl p-4 mb-3 border border-slate-200 shadow-sm">
                            <div id="video-qr-container" class="flex justify-center mb-3"></div>
                            <p class="text-[10px] text-slate-500 text-center mb-2">Scan QR Code dengan aplikasi pembayaran Anda</p>
                            <div class="flex items-center justify-center gap-2 text-[9px] text-slate-400">
                                <span>Berlaku hingga</span>
                                <span id="video-payment-timer" class="font-mono font-semibold text-orange-600">--:--</span>
                            </div>
                        </div>

                        <div class="text-[10px] text-slate-500 text-center mb-3">
                            <p>Status: <span id="video-payment-status" class="font-semibold text-amber-600">Menunggu pembayaran...</span></p>
                        </div>

                        <button id="cancel-video-payment" class="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors">
                            Batalkan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // State
    let videoPaymentInterval = null;
    let videoCheckStatusInterval = null;
    window.currentVideoPaymentReference = null;
    
    // Show payment modal with QR
    window.showVideoPaymentModal = function(data) {
        const modal = document.getElementById('video-payment-modal');
        modal.classList.remove('hidden');
        
        // Ensure success msg is hidden and process view is shown
        document.getElementById('video-payment-success-msg').classList.add('hidden');
        document.getElementById('video-payment-process-view').classList.remove('hidden');

        // Update amount display
        document.getElementById('video-payment-amount-display').textContent = `Rp ${parseInt(data.amount).toLocaleString('id-ID')}`;
        document.getElementById('video-payment-credits-display').textContent = `${data.credits} Video`;
        
        // Generate QR Code using QR Server API
        const qrContainer = document.getElementById('video-qr-container');
        qrContainer.innerHTML = '';
        
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.qrString)}`;
        const img = document.createElement('img');
        img.src = qrUrl;
        img.alt = 'QRIS Payment';
        img.className = 'w-full h-auto object-contain rounded-lg';
        qrContainer.appendChild(img);
        
        window.currentVideoPaymentReference = data.reference;
        
        // Start countdown timer
        startVideoPaymentTimer(data.expiry_time || (Date.now() / 1000 + 3600));
        
        // Start checking payment status
        checkVideoPaymentStatus();
        
        if (window.lucide) window.lucide.createIcons();
    };

    function startVideoPaymentTimer(expiryTimestamp) {
        const timerEl = document.getElementById('video-payment-timer');
        if (!timerEl) return;
        
        if (videoPaymentInterval) clearInterval(videoPaymentInterval);
        
        videoPaymentInterval = setInterval(() => {
            const now = Math.floor(Date.now() / 1000);
            const remaining = expiryTimestamp - now;
            
            if (remaining <= 0) {
                timerEl.textContent = '00:00';
                clearInterval(videoPaymentInterval);
                document.getElementById('video-payment-status').textContent = 'Waktu habis';
                document.getElementById('video-payment-status').classList.remove('text-amber-600');
                document.getElementById('video-payment-status').classList.add('text-red-600');
                return;
            }
            
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
    }

    function checkVideoPaymentStatus() {
        if (videoCheckStatusInterval) clearInterval(videoCheckStatusInterval);
        
        videoCheckStatusInterval = setInterval(async () => {
            if (!window.currentVideoPaymentReference) return;
            
            try {
                const response = await fetch('/server/video_payment.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'check_status',
                        reference: window.currentVideoPaymentReference
                    })
                });
                
                const result = await response.json();
                
                if (result.success && result.status === 'success') {
                    clearInterval(videoPaymentInterval);
                    clearInterval(videoCheckStatusInterval);
                    
                    // Show success UI
                    document.getElementById('video-payment-process-view').classList.add('hidden');
                    document.getElementById('video-payment-success-msg').classList.remove('hidden');
                    
                    // Refresh video quota
                    if (window.videoGeneratorFetchQuota) {
                        window.videoGeneratorFetchQuota();
                    }
                    
                    if (window.lucide) window.lucide.createIcons();
                }
            } catch (e) {
                console.error('Error checking video payment status:', e);
            }
        }, 3000); // Check every 3 seconds
    }

    function stopVideoPaymentTimers() {
        if (videoPaymentInterval) clearInterval(videoPaymentInterval);
        if (videoCheckStatusInterval) clearInterval(videoCheckStatusInterval);
    }

    function hideVideoPaymentModal() {
        const modal = document.getElementById('video-payment-modal');
        modal.classList.add('hidden');
        stopVideoPaymentTimers();
        window.currentVideoPaymentReference = null;
    }

    // Event Listeners
    document.getElementById('close-video-payment-modal')?.addEventListener('click', hideVideoPaymentModal);
    document.getElementById('cancel-video-payment')?.addEventListener('click', hideVideoPaymentModal);
    document.getElementById('close-video-payment-success')?.addEventListener('click', hideVideoPaymentModal);

    // Click outside to close
    document.getElementById('video-payment-modal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            hideVideoPaymentModal();
        }
    });
})();
