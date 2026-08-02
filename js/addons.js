// ── Addon preview lightbox ───────────────────────────────────────────────────
window._showAddonPreview = function(imgSrc) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;cursor:zoom-out;padding:16px;';
    const img = document.createElement('img');
    img.src = imgSrc;
    img.style.cssText = 'max-width:100%;max-height:90vh;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,0.6);object-fit:contain;';
    const close = document.createElement('button');
    close.innerHTML = '&times;';
    close.style.cssText = 'position:absolute;top:16px;right:20px;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:28px;line-height:1;width:40px;height:40px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;';
    overlay.appendChild(img);
    overlay.appendChild(close);
    const destroy = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) destroy(); });
    close.addEventListener('click', destroy);
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { destroy(); document.removeEventListener('keydown', esc); } });
    document.body.appendChild(overlay);
};

// ── Addon status cache ────────────────────────────────────────────────────────
// Satu fetch untuk semua addon, di-cache selama sesi.
// check*Status() functions di bawah semua baca dari cache ini → 13 fetch → 1 fetch.
(function() {
    let _cache  = null;   // { addon_key: { is_active, expires_at, remaining_days, purchased_at } }
    let _promise = null;  // ongoing fetch promise

    window.invalidateAddonCache = function() { _cache = null; };
    window.setAddonCache    = function(data) { if (data && typeof data === 'object') _cache = data; };

    window.getAddonStatus = async function(email, addonKey) {
        if (!email) return null;
        // If proxy config pre-loaded addon data on login, use it to skip a separate fetch
        if (!_cache && window._addonPreload) {
            _cache = window._addonPreload;
            window._addonPreload = null;
        }
        if (!_cache) {
            if (!_promise) {
                _promise = fetch('/server/addons_payment.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'check_all_addons', email })
                })
                .then(r => r.json())
                .then(data => {
                    if (data && data.success) _cache = data.addons || {};
                    _promise = null;
                    return _cache;
                })
                .catch(() => { _promise = null; return null; });
            }
            await _promise;
        }
        const fallback = { success: true, is_active: false, expires_at: 0, remaining_days: 0, purchased_at: 0 };
        return (_cache && _cache[addonKey]) ? { success: true, ..._cache[addonKey] } : fallback;
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    const addonsBoostBtn = document.getElementById('addons-boost-btn');
    const addonsBoostStatus = document.getElementById('addons-boost-status');
    const addonsCardInfoButtons = document.querySelectorAll('.addons-card-info-btn[data-addon]');
    const boostToggles = document.querySelectorAll('.boost-toggle-group');
    const upscaleModalState = {
        beforeSrc: '',
        afterUrl: '',
        isOpen: false,
        isProcessing: false
    };

    // Cache for storing upscaled results by image URL
    const upscaleCache = new Map();

    // Handle Addons Boost Button Click
    if (addonsBoostBtn) {
        addonsBoostBtn.addEventListener('click', () => {
            if (boostToggles.length > 0) {
                // Trigger click on the main toggle to reuse existing logic
                boostToggles[0].click();
            }
        });
    }

    if (addonsCardInfoButtons && addonsCardInfoButtons.length) {
        addonsCardInfoButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                if (typeof window.showModernPopup !== 'function') return;
                const addonKey = btn.dataset.addon || '';
                if (addonKey === 'boost') {
                    window.showModernPopup({
                        title: 'Boost Mode',
                        message: `
                            <div class="space-y-4 text-sm text-slate-700">
                                <div class="text-slate-600">
                                    Boost Mode mempercepat proses generate dengan optimasi performa dan mode pararel (jika tersedia).
                                </div>
                                <div class="space-y-2">
                                    <div class="font-bold text-slate-800">Cara pakai</div>
                                    <ul class="list-disc pl-5 space-y-1 text-slate-600">
                                        <li>Klik tombol Aktifkan untuk menyalakan Boost Mode.</li>
                                        <li>Saat aktif, beberapa fitur akan memproses lebih cepat.</li>
                                        <li>Jika ingin kembali normal, klik Non-aktifkan.</li>
                                    </ul>
                                </div>
                            </div>
                        `,
                        actionText: 'Mengerti'
                    });
                    return;
                }
                if (addonKey === 'auto_upscale') {
                    window.showModernPopup({
                        title: 'Auto Upscale (4K)',
                        message: `
                            <div class="space-y-4 text-sm text-slate-700">
                                <div class="text-slate-600">
                                    Auto Upscale menambahkan tombol Upscale di card hasil untuk meningkatkan resolusi gambar hingga 4K.
                                </div>
                                <div class="space-y-2">
                                    <div class="font-bold text-slate-800">Cara kerja</div>
                                    <ul class="list-disc pl-5 space-y-1 text-slate-600">
                                        <li>Setelah dibeli, aktifkan melalui tombol Aktifkan/Non-aktifkan di card Addons.</li>
                                        <li>Saat aktif, tombol Upscale akan muncul pada card hasil.</li>
                                        <li>Klik tombol Upscale untuk membuka preview Before/After dan unduh hasil 4K.</li>
                                    </ul>
                                    <div class="mt-2 text-center">
                                        <img src="/assets/upscale-preview.png" class="w-2/3 mx-auto rounded-lg border border-slate-200 shadow-sm" alt="Preview Tombol Upscale">
                                    </div>
                                    <div class="text-[11px] text-slate-500 mt-2">
                                        Icon yang tengah adalah tombol upscale.
                                    </div>
                                </div>
                                <div class="space-y-2">
                                    <div class="font-bold text-slate-800">Tips</div>
                                    <ul class="list-disc pl-5 space-y-1 text-slate-600">
                                        <li>Upscale setelah gambar final selesai dibuat agar hasil paling bagus.</li>
                                        <li>Jika tombol Upscale belum muncul, coba generate ulang setelah Auto Upscale aktif.</li>
                                    </ul>
                                </div>
                            </div>
                        `,
                        actionText: 'Mengerti'
                    });
                }
                if (addonKey === 'my_favorite') {
                    window.showModernPopup({
                        title: 'My Favorite',
                        message: `
                            <div class="space-y-4 text-sm text-slate-700">
                                <div class="text-slate-600">
                                    My Favorite menambahkan menu khusus untuk menyimpan dan membuka cepat fitur-fitur favorit kamu.
                                </div>
                                <div class="space-y-2">
                                    <div class="font-bold text-slate-800">Cara pakai</div>
                                    <ul class="list-disc pl-5 space-y-1 text-slate-600">
                                        <li>Setelah dibeli, menu My Favorite akan muncul di sidebar.</li>
                                        <li>Di halaman My Favorite, cari nama fitur lalu tambahkan ke daftar favorit.</li>
                                        <li>Klik item favorit untuk langsung membuka halaman fitur tersebut.</li>
                                    </ul>
                                </div>
                                <div class="text-[11px] text-slate-500">
                                    Daftar favorit tersimpan di browser (per perangkat).
                                </div>
                            </div>
                        `,
                        actionText: 'Mengerti'
                    });
                }
                if (addonKey === 'sufo_gpt') {
                    window.showModernPopup({
                        title: 'SuFo GPT',
                        message: `
                            <div class="space-y-4 text-sm text-slate-700">
                                <div class="text-slate-600">
                                    SuFo GPT adalah chat AI di dalam Sulap Foto yang bisa bantu tanya-jawab, membuat gambar, dan mengarahkan proses edit foto lewat percakapan.
                                </div>
                                <div class="space-y-2">
                                    <div class="font-bold text-slate-800">Fitur utama</div>
                                    <ul class="list-disc pl-5 space-y-1 text-slate-600">
                                        <li>Mode Chat: tanya apa saja melalui endpoint chat.</li>
                                        <li>Mode Buat Gambar: prompt akan di-enhance dulu, lalu dibuat gambarnya.</li>
                                        <li>Mode Edit Foto: lampirkan foto + jelaskan edit yang diinginkan, lalu diproses.</li>
                                    </ul>
                                </div>
                                <div class="rounded-2xl overflow-hidden border border-slate-200 bg-white">
                                    <img src="/assets/sufogpt.png" alt="SuFo GPT" class="w-full h-auto block">
                                </div>
                                <div class="text-[11px] text-slate-500">
                                    Informasi: setelah addon aktif, menu SuFo GPT akan muncul di sidebar.
                                </div>
                            </div>
                        `,
                        actionText: 'Mengerti'
                    });
                }
                if (addonKey === 'super_book') {
                    window.showModernPopup({
                        title: 'Super Book',
                        message: `
                            <div class="space-y-4 text-sm text-slate-700">
                                <div class="text-slate-600">
                                    Super Book adalah AI penulis pribadi yang bisa membuat berbagai jenis konten lengkap dengan ilustrasi gambar.
                                </div>
                                <div class="space-y-2">
                                    <div class="font-bold text-slate-800">Jenis konten yang bisa dibuat</div>
                                    <ul class="list-disc pl-5 space-y-1 text-slate-600">
                                        <li><span class="font-semibold">Ebook</span> — Buku digital lengkap dengan bab-bab dan ilustrasi per bab.</li>
                                        <li><span class="font-semibold">Artikel</span> — Artikel blog/SEO profesional dengan gambar pendukung.</li>
                                        <li><span class="font-semibold">Novel</span> — Cerita fiksi dengan narasi, dialog, dan ilustrasi scene.</li>
                                        <li><span class="font-semibold">Komik</span> — Cerita bergambar panel demi panel.</li>
                                    </ul>
                                </div>
                                <div class="space-y-2">
                                    <div class="font-bold text-slate-800">Cara pakai</div>
                                    <ul class="list-disc pl-5 space-y-1 text-slate-600">
                                        <li>Setelah dibeli, menu Super Book muncul di sidebar.</li>
                                        <li>Pilih jenis konten (Ebook/Artikel/Novel/Komik).</li>
                                        <li>Deskripsikan topik, lalu AI akan menulis teks dan generate gambar otomatis.</li>
                                        <li>Pilih gaya gambar: Realistis, Anime, Kartun, Cat Air, Komik, atau 3D.</li>
                                    </ul>
                                </div>
                                <div class="text-[11px] text-slate-500">
                                    Setelah addon aktif, menu Super Book akan muncul di sidebar.
                                </div>
                            </div>
                        `,
                        actionText: 'Mengerti'
                    });
                }
                if (addonKey === 'premium_themes') {
                    window.showModernPopup({
                        title: 'Premium Themes',
                        message: `
                            <div class="space-y-6 text-sm text-slate-700">
                                <!-- Dark Mode -->
                                <div class="space-y-3">
                                    <div class="flex items-start gap-3">
                                        <div class="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>
                                        </div>
                                        <div class="flex-1">
                                            <h4 class="font-bold text-slate-800 mb-1">Dark Mode</h4>
                                            <p class="text-xs text-slate-600">Tema gelap elegan dan nyaman untuk mata, cocok digunakan di malam hari atau ruangan dengan pencahayaan rendah.</p>
                                        </div>
                                    </div>
                                    <div class="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                        <img src="assets/dark.png" alt="Dark Theme" class="w-full h-auto">
                                    </div>
                                    <div class="grid grid-cols-2 gap-2 text-xs">
                                        <div class="flex items-center gap-1.5 text-slate-600">
                                            <svg class="w-3.5 h-3.5 text-teal-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                            <span>Nyaman untuk mata</span>
                                        </div>
                                        <div class="flex items-center gap-1.5 text-slate-600">
                                            <svg class="w-3.5 h-3.5 text-teal-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                            <span>Hemat baterai OLED</span>
                                        </div>
                                        <div class="flex items-center gap-1.5 text-slate-600">
                                            <svg class="w-3.5 h-3.5 text-teal-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                            <span>Tampilan profesional</span>
                                        </div>
                                        <div class="flex items-center gap-1.5 text-slate-600">
                                            <svg class="w-3.5 h-3.5 text-teal-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                            <span>Fokus konten</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Glass Theme -->
                                <div class="space-y-3 pt-4 border-t border-slate-200">
                                    <div class="flex items-start gap-3">
                                        <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center flex-shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>
                                        </div>
                                        <div class="flex-1">
                                            <h4 class="font-bold text-slate-800 mb-1">Glass (Frosted Glass)</h4>
                                            <p class="text-xs text-slate-600">Tema modern dengan efek kaca buram yang memukau, memberikan kesan futuristik dan premium dengan transparansi dan blur yang indah.</p>
                                        </div>
                                    </div>
                                    <div class="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                        <img src="assets/glass.png" alt="Glass Theme" class="w-full h-auto">
                                    </div>
                                    <div class="grid grid-cols-2 gap-2 text-xs">
                                        <div class="flex items-center gap-1.5 text-slate-600">
                                            <svg class="w-3.5 h-3.5 text-violet-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                            <span>Efek frosted glass</span>
                                        </div>
                                        <div class="flex items-center gap-1.5 text-slate-600">
                                            <svg class="w-3.5 h-3.5 text-violet-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                            <span>Tampilan premium</span>
                                        </div>
                                        <div class="flex items-center gap-1.5 text-slate-600">
                                            <svg class="w-3.5 h-3.5 text-violet-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                            <span>Gradient background</span>
                                        </div>
                                        <div class="flex items-center gap-1.5 text-slate-600">
                                            <svg class="w-3.5 h-3.5 text-violet-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                            <span>Modern & futuristik</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Custom Theme -->
                                <div class="space-y-3 pt-4 border-t border-slate-200">
                                    <div class="flex items-start gap-3">
                                        <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center flex-shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"></circle><circle cx="17.5" cy="10.5" r=".5"></circle><circle cx="8.5" cy="7.5" r=".5"></circle><circle cx="6.5" cy="12.5" r=".5"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path></svg>
                                        </div>
                                        <div class="flex-1">
                                            <h4 class="font-bold text-slate-800 mb-1">Kustom Background</h4>
                                            <p class="text-xs text-slate-600">Personalisasi tampilan dengan background gambar pilihan sendiri. Upload foto favorit dan jadikan sebagai latar belakang aplikasi.</p>
                                        </div>
                                    </div>
                                    <div class="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                        <img src="assets/kustom.png" alt="Custom Theme" class="w-full h-auto">
                                    </div>
                                    <div class="grid grid-cols-2 gap-2 text-xs">
                                        <div class="flex items-center gap-1.5 text-slate-600">
                                            <svg class="w-3.5 h-3.5 text-orange-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                            <span>Upload gambar sendiri</span>
                                        </div>
                                        <div class="flex items-center gap-1.5 text-slate-600">
                                            <svg class="w-3.5 h-3.5 text-orange-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                            <span>Personalisasi penuh</span>
                                        </div>
                                        <div class="flex items-center gap-1.5 text-slate-600">
                                            <svg class="w-3.5 h-3.5 text-orange-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                            <span>Tampilan unik</span>
                                        </div>
                                        <div class="flex items-center gap-1.5 text-slate-600">
                                            <svg class="w-3.5 h-3.5 text-orange-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                            <span>Ekspresikan gaya</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                                    Klik "Ganti Tema" untuk membuka halaman pengaturan tema.
                                </div>
                            </div>
                        `,
                        actionText: 'Ganti Tema',
                        onAction: () => {
                            document.getElementById('tab-themes')?.click();
                        }
                    });
                }
                if (addonKey === 'vector_svg') {
                    window.showModernPopup({
                        title: 'Vector & SVG',
                        message: `
                            <div class="space-y-4 text-sm text-slate-700">
                                <div class="text-slate-600">
                                    Vector & SVG memungkinkan kamu mengkonversi gambar ke vector atau membuat SVG transparan dari deskripsi dengan 10 pilihan style profesional.
                                </div>
                                
                                <div class="space-y-3">
                                    <div class="font-bold text-slate-800">Mode Vector</div>
                                    <div class="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                        <img src="/assets/vector.png" alt="Vector Mode" class="w-full h-auto">
                                    </div>
                                    <ul class="list-disc pl-5 space-y-1 text-slate-600 text-xs">
                                        <li>Upload gambar untuk dikonversi ke vector</li>
                                        <li>Pilih rasio output (1:1, 3:4, 4:3, 9:16, 16:9)</li>
                                        <li>10 style profesional: Colorful, Minimalist, Gradient, Line Art, dll</li>
                                        <li>Hasil siap download dan digunakan</li>
                                    </ul>
                                </div>

                                <div class="space-y-3">
                                    <div class="font-bold text-slate-800">Mode SVG</div>
                                    <div class="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                        <img src="/assets/svg.png" alt="SVG Mode" class="w-full h-auto">
                                    </div>
                                    <ul class="list-disc pl-5 space-y-1 text-slate-600 text-xs">
                                        <li>Buat SVG dari deskripsi teks</li>
                                        <li>Background otomatis transparan</li>
                                        <li>10 style artistik yang bisa dipilih</li>
                                        <li>Perfect untuk logo, icon, dan desain grafis</li>
                                    </ul>
                                </div>

                                <div class="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                                    Setelah dibeli, menu Vector & SVG akan muncul di sidebar.
                                </div>
                            </div>
                        `,
                        actionText: 'Mengerti'
                    });
                }
                if (addonKey === 'convert_images') {
                    window.showModernPopup({
                        title: 'Convert Images',
                        message: `
                            <div class="space-y-4 text-sm text-slate-700">
                                <div class="text-slate-600">
                                    Convert Images adalah addon untuk mengkonversi gambar ke berbagai format dengan kualitas terjaga dan batch processing support.
                                </div>
                                
                                <div class="space-y-3">
                                    <div class="font-bold text-slate-800">Fitur Utama</div>
                                    <ul class="list-disc pl-5 space-y-1 text-slate-600 text-xs">
                                        <li><strong>Single Convert:</strong> Konversi 1 gambar dengan kualitas otomatis tinggi</li>
                                        <li><strong>Batch Convert:</strong> Konversi hingga 50 gambar sekaligus, download sebagai ZIP</li>
                                        <li><strong>Format Support:</strong> PNG, JPG/JPEG, WEBP, BMP, GIF, TIFF, ICO, HEIC</li>
                                        <li><strong>No Corruption:</strong> Hasil konversi dijamin bisa dibuka dan tidak corrupt</li>
                                    </ul>
                                </div>

                                <div class="space-y-3">
                                    <div class="font-bold text-slate-800">Format yang Didukung</div>
                                    <div class="grid grid-cols-2 gap-2 text-xs">
                                        <div class="bg-slate-50 rounded p-2">
                                            <div class="font-semibold text-slate-700">PNG</div>
                                            <div class="text-slate-500">Lossless, Transparansi</div>
                                        </div>
                                        <div class="bg-slate-50 rounded p-2">
                                            <div class="font-semibold text-slate-700">JPG/JPEG</div>
                                            <div class="text-slate-500">Ukuran Kecil</div>
                                        </div>
                                        <div class="bg-slate-50 rounded p-2">
                                            <div class="font-semibold text-slate-700">WEBP</div>
                                            <div class="text-slate-500">Modern, Efisien</div>
                                        </div>
                                        <div class="bg-slate-50 rounded p-2">
                                            <div class="font-semibold text-slate-700">BMP</div>
                                            <div class="text-slate-500">Bitmap</div>
                                        </div>
                                        <div class="bg-slate-50 rounded p-2">
                                            <div class="font-semibold text-slate-700">GIF</div>
                                            <div class="text-slate-500">Animasi Support</div>
                                        </div>
                                        <div class="bg-slate-50 rounded p-2">
                                            <div class="font-semibold text-slate-700">TIFF</div>
                                            <div class="text-slate-500">High Quality</div>
                                        </div>
                                        <div class="bg-slate-50 rounded p-2">
                                            <div class="font-semibold text-slate-700">ICO</div>
                                            <div class="text-slate-500">Icon</div>
                                        </div>
                                        <div class="bg-slate-50 rounded p-2">
                                            <div class="font-semibold text-slate-700">HEIC</div>
                                            <div class="text-slate-500">Apple Format</div>
                                        </div>
                                    </div>
                                </div>

                                <div class="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                                    Setelah dibeli, menu Convert Images akan muncul di sidebar.
                                </div>
                            </div>
                        `,
                        actionText: 'Mengerti'
                    });
                }
                if (addonKey === 'text_to_speech') {
                    window.showModernPopup({
                        title: 'Text to Speech Studio',
                        message: `
                            <div class="space-y-4 text-sm text-slate-700">
                                <div class="text-slate-600">
                                    Text to Speech Studio adalah addon lengkap untuk mengolah suara dengan AI. Tersedia 5 mode utama:
                                </div>
                                <div class="space-y-2">
                                    <div class="font-bold text-slate-800">Fitur lengkap</div>
                                    <ul class="list-disc pl-5 space-y-1 text-slate-600">
                                        <li><span class="font-semibold">Teks ke Suara</span> — Ubah teks apapun menjadi suara natural AI. Pilih suara, bahasa, kecepatan, pitch, dan instruksi kustom.</li>
                                        <li><span class="font-semibold">Suara ke Teks</span> — Transkripsi audio ke teks. Bisa rekam langsung atau upload file audio.</li>
                                        <li><span class="font-semibold">Ganti Suara</span> — Upload audio asli, lalu ubah ke suara yang berbeda tanpa mengubah isi.</li>
                                        <li><span class="font-semibold">Gambar ke Suara</span> — Upload gambar, AI akan mendeskripsikan lalu membuat narasi suara otomatis.</li>
                                        <li><span class="font-semibold">Suara Promosi</span> — Masukkan info produk, AI buat script promosi dan ubah ke audio profesional.</li>
                                    </ul>
                                </div>
                                <div class="space-y-2">
                                    <div class="font-bold text-slate-800">Kontrol lengkap</div>
                                    <ul class="list-disc pl-5 space-y-1 text-slate-600">
                                        <li>Pilihan 4 suara AI (pria & wanita)</li>
                                        <li>8 bahasa termasuk Indonesia, Inggris, Jepang, Korea</li>
                                        <li>Atur kecepatan dan pitch suara</li>
                                        <li>Template cepat untuk berbagai kebutuhan</li>
                                        <li>Audio player modern dengan waveform visualizer</li>
                                        <li>Download hasil audio langsung</li>
                                    </ul>
                                </div>
                                <div class="text-[11px] text-slate-500">
                                    Setelah addon aktif, menu Text to Speech akan muncul di sidebar.
                                </div>
                            </div>
                        `,
                        actionText: 'Mengerti'
                    });
                }
                if (addonKey === 'private_server') {
                    const isDark = document.body.classList.contains('theme-dark');
                    window.showModernPopup({
                        title: 'Addons: Private Server',
                        message: `
                            <div style="display: flex; flex-direction: column; gap: 16px;">
                                <!-- Tagline -->
                                <div style="border-radius: 12px; background: ${isDark ? 'rgba(217, 119, 6, 0.15)' : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'}; border: 1px solid ${isDark ? '#78350f' : '#fde68a'}; padding: 12px 14px;">
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${isDark ? '#fbbf24' : '#d97706'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                                        </svg>
                                        <p style="font-size: 13px; font-weight: 700; color: ${isDark ? '#fbbf24' : '#92400e'}; margin: 0;">Generate wajah lebih konsisten pakai model premium!</p>
                                    </div>
                                </div>
                                
                                <!-- Description -->
                                <p style="font-size: 12px; color: ${isDark ? '#94a3b8' : '#64748b'}; margin: 0; line-height: 1.5;">Memungkinkan anda bebas memilih model AI untuk mencapai hasil foto maksimal sesuai kebutuhan.</p>
                                
                                <!-- Models List -->
                                <div style="display: flex; flex-direction: column; gap: 12px;">
                                    <p style="font-size: 13px; font-weight: 700; color: ${isDark ? '#f1f5f9' : '#1e293b'}; margin: 0;">Tersedia 6 Model AI Premium</p>
                                    
                                    <div style="display: flex; flex-direction: column; gap: 10px;">
                                        <!-- Nano Banana -->
                                        <div style="border-radius: 10px; background: ${isDark ? 'rgba(22, 163, 74, 0.15)' : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'}; border: 1px solid ${isDark ? '#14532d' : '#bbf7d0'}; padding: 10px 12px;">
                                            <div style="display: flex; align-items: flex-start; gap: 8px;">
                                                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; margin-top: 4px; flex-shrink: 0;"></span>
                                                <div style="flex: 1;">
                                                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                                        <span style="font-size: 12px; font-weight: 700; color: ${isDark ? '#bbf7d0' : '#166534'};">Nano Banana 1</span>
                                                    </div>
                                                    <p style="font-size: 11px; color: ${isDark ? '#86efac' : '#15803d'}; margin: 0; line-height: 1.4;">Model standar di semua fitur, akurasi wajah 90%, cocok untuk kecepatan generate.</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Nano Banana 2 -->
                                        <div style="border-radius: 10px; background: ${isDark ? 'rgba(22, 163, 74, 0.15)' : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'}; border: 1px solid ${isDark ? '#14532d' : '#bbf7d0'}; padding: 10px 12px;">
                                            <div style="display: flex; align-items: flex-start; gap: 8px;">
                                                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; margin-top: 4px; flex-shrink: 0;"></span>
                                                <div style="flex: 1;">
                                                    <p style="font-size: 12px; font-weight: 700; color: ${isDark ? '#86efac' : '#15803d'}; margin: 0 0 4px 0;">Nano Banana 2</p>
                                                    <p style="font-size: 11px; color: ${isDark ? '#4ade80' : '#166534'}; margin: 0; line-height: 1.4;">Model terbaru akurasi wajah 99% dan text anti typo, cocok untuk infografis, poster, banner.</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Super Grok -->
                                        <div style="border-radius: 10px; background: ${isDark ? 'rgba(22, 163, 74, 0.15)' : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'}; border: 1px solid ${isDark ? '#14532d' : '#bbf7d0'}; padding: 10px 12px;">
                                            <div style="display: flex; align-items: flex-start; gap: 8px;">
                                                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; margin-top: 4px; flex-shrink: 0;"></span>
                                                <div style="flex: 1;">
                                                    <p style="font-size: 12px; font-weight: 700; color: ${isDark ? '#86efac' : '#15803d'}; margin: 0 0 4px 0;">Super Grok</p>
                                                    <p style="font-size: 11px; color: ${isDark ? '#4ade80' : '#166534'}; margin: 0; line-height: 1.4;">Model premium dengan akurasi tinggi dan kecepatan generate yang cepat.</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- SeeDream 4.5 -->
                                        <div style="border-radius: 10px; background: ${isDark ? 'rgba(22, 163, 74, 0.15)' : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'}; border: 1px solid ${isDark ? '#14532d' : '#bbf7d0'}; padding: 10px 12px;">
                                            <div style="display: flex; align-items: flex-start; gap: 8px;">
                                                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; margin-top: 4px; flex-shrink: 0;"></span>
                                                <div style="flex: 1;">
                                                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                                        <span style="font-size: 12px; font-weight: 700; color: ${isDark ? '#86efac' : '#15803d'};">SeeDream 4.5</span>
                                                        <span style="font-size: 8px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: #ffffff;">4K</span>
                                                    </div>
                                                    <p style="font-size: 11px; color: ${isDark ? '#4ade80' : '#166534'}; margin: 0; line-height: 1.4;">Model terbaik dari ByteDance dengan kelebihan konsistensi wajah yang tinggi hingga 99%.</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Qwen 3.7 -->
                                        <div style="border-radius: 10px; background: ${isDark ? 'rgba(22, 163, 74, 0.15)' : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'}; border: 1px solid ${isDark ? '#14532d' : '#bbf7d0'}; padding: 10px 12px;">
                                            <div style="display: flex; align-items: flex-start; gap: 8px;">
                                                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; margin-top: 4px; flex-shrink: 0;"></span>
                                                <div style="flex: 1;">
                                                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                                        <span style="font-size: 12px; font-weight: 700; color: ${isDark ? '#86efac' : '#15803d'};">Qwen 3.7</span>
                                                    </div>
                                                    <p style="font-size: 11px; color: ${isDark ? '#4ade80' : '#166534'}; margin: 0; line-height: 1.4;">Model AI dari Alibaba dengan render text sangat akurat, cocok untuk infografis dan poster.</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- Flux 2 Dev -->
                                        <div style="border-radius: 10px; background: ${isDark ? 'rgba(22, 163, 74, 0.15)' : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'}; border: 1px solid ${isDark ? '#14532d' : '#bbf7d0'}; padding: 10px 12px;">
                                            <div style="display: flex; align-items: flex-start; gap: 8px;">
                                                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; margin-top: 4px; flex-shrink: 0;"></span>
                                                <div style="flex: 1;">
                                                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                                        <span style="font-size: 12px; font-weight: 700; color: ${isDark ? '#86efac' : '#15803d'};">Flux 2 Dev</span>
                                                    </div>
                                                    <p style="font-size: 11px; color: ${isDark ? '#4ade80' : '#166534'}; margin: 0; line-height: 1.4;">Foto sinematik premium dengan detail wajah tajam, pencahayaan natural, dan akurasi warna tinggi. Terbaik untuk portrait, lifestyle, dan produk.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Duration Info -->
                                <div style="border-radius: 12px; background: ${isDark ? 'rgba(220, 38, 38, 0.15)' : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'}; border: 1px solid ${isDark ? '#7f1d1d' : '#fecaca'}; padding: 12px 14px;">
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${isDark ? '#fca5a5' : '#dc2626'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <polyline points="12 6 12 12 16 14"></polyline>
                                        </svg>
                                        <p style="font-size: 12px; color: ${isDark ? '#fca5a5' : '#991b1b'}; margin: 0; line-height: 1.4;"><strong>Masa Aktif: 15 hari</strong> tanpa batasan generate. Setelah berakhir, bisa diperpanjang kembali.</p>
                                    </div>
                                </div>
                                
                                <!-- Footer Note -->
                                <p style="font-size: 11px; color: ${isDark ? '#64748b' : '#94a3b8'}; margin: 0; padding-top: 8px; border-top: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; line-height: 1.4;">Setelah dibeli, menu <strong style="color: ${isDark ? '#cbd5e1' : '#64748b'};">Private Server</strong> akan muncul di sidebar. Klik untuk memilih model AI.</p>
                            </div>
                        `,
                        actionText: 'Mengerti'
                    });
                }
                if (addonKey === 'grok_video') {
                    window.showModernPopup({
                        title: 'AI Video',
                        message: `
                            <div class="space-y-4 text-sm text-slate-700">
                                <div class="text-slate-600">
                                    Isi ulang kredit video untuk membuat video AI dari teks atau gambar menggunakan Grok.
                                </div>
                                <div class="space-y-2">
                                    <div class="font-bold text-slate-800">Paket Kredit Video</div>
                                    <ul class="list-disc pl-5 space-y-1 text-slate-600">
                                        <li><span class="font-semibold">5 Video</span> — Rp 10.000</li>
                                        <li><span class="font-semibold">15 Video</span> — Rp 25.000</li>
                                        <li><span class="font-semibold">50 Video</span> — Rp 50.000</li>
                                    </ul>
                                </div>
                                <div class="space-y-2">
                                    <div class="font-bold text-slate-800">Cara pakai</div>
                                    <ul class="list-disc pl-5 space-y-1 text-slate-600">
                                        <li>Setiap akun mendapatkan 1 kredit video gratis.</li>
                                        <li>Beli paket kredit tambahan melalui tombol topup di halaman AI Video.</li>
                                        <li>Pembayaran via QRIS, otomatis aktif setelah bayar.</li>
                                        <li>Kredit video tidak ada masa kadaluarsa.</li>
                                    </ul>
                                </div>
                                <div class="text-[11px] text-slate-500">
                                    Klik "Isi Ulang" untuk langsung ke halaman AI Video.
                                </div>
                            </div>
                        `,
                        actionText: 'Isi Ulang',
                        onAction: () => {
                            if (typeof window.switchTab === 'function') {
                                window.switchTab('video-generator');
                            }
                        }
                    });
                }
                if (addonKey === 'gif_maker') {
                    window.showModernPopup({
                        title: 'GIF Maker',
                        message: `
                            <div class="space-y-4 text-sm text-slate-700">
                                <div class="text-slate-600">
                                    GIF Maker memungkinkan anda membuat animasi GIF berkualitas tinggi dari beberapa foto dengan kontrol lengkap.
                                </div>
                                <div class="space-y-2">
                                    <div class="font-bold text-slate-800">Fitur utama</div>
                                    <ul class="list-disc pl-5 space-y-1 text-slate-600">
                                        <li><span class="font-semibold">Multi Image</span> — Upload minimal 2 foto untuk dijadikan frame animasi GIF.</li>
                                        <li><span class="font-semibold">Kontrol Durasi</span> — Atur berapa lama setiap frame ditampilkan (0.1s - 5s per gambar).</li>
                                        <li><span class="font-semibold">Loop Animation</span> — Pilih apakah GIF diputar terus-menerus atau hanya sekali.</li>
                                    </ul>
                                </div>
                                <div class="space-y-2">
                                    <div class="font-bold text-slate-800">Cara pakai</div>
                                    <ul class="list-disc pl-5 space-y-1 text-slate-600">
                                        <li>Setelah dibeli, menu GIF Maker akan muncul di sidebar.</li>
                                        <li>Upload minimal 2 foto yang ingin dijadikan animasi.</li>
                                        <li>Atur durasi per frame dan aktifkan/nonaktifkan loop.</li>
                                        <li>Klik Buat GIF dan download hasil animasi GIF anda.</li>
                                    </ul>
                                </div>
                                <div class="text-[11px] text-slate-500">
                                    Harga: Rp 5.000 (sekali bayar, aktif selamanya)
                                </div>
                            </div>
                        `,
                        actionText: 'Mengerti'
                    });
                }
                if (addonKey === 'compress_images') {
                    window.showModernPopup({
                        title: 'Compress IMG',
                        message: `
                            <div class="space-y-4 text-sm text-slate-700">
                                <div class="text-slate-600">
                                    Compress IMG memungkinkan anda mengkompres gambar hingga 90% lebih kecil tanpa kehilangan kualitas visual yang signifikan.
                                </div>
                                <div class="rounded-xl overflow-hidden border border-slate-200">
                                    <img src="/assets/compress_img.png" alt="Compress IMG Preview" class="w-full">
                                </div>
                                <div class="space-y-2">
                                    <div class="font-bold text-slate-800">Fitur utama</div>
                                    <ul class="list-disc pl-5 space-y-1 text-slate-600">
                                        <li><span class="font-semibold">Single Compress</span> — Kompres hingga 10 gambar sekaligus dengan preview before/after.</li>
                                        <li><span class="font-semibold">Batch Compress</span> — Proses hingga 50 gambar dalam satu kali kompres untuk efisiensi maksimal.</li>
                                        <li><span class="font-semibold">3 Level Kompresi</span> — Pilih antara Rekomendasi, Extreme, atau Low sesuai kebutuhan.</li>
                                        <li><span class="font-semibold">Circular Progress</span> — Lihat persentase penghematan size dan perbandingan before/after.</li>
                                        <li><span class="font-semibold">Download ZIP</span> — Download semua hasil kompres dalam satu file ZIP.</li>
                                    </ul>
                                </div>
                                <div class="space-y-2">
                                    <div class="font-bold text-slate-800">Cara pakai</div>
                                    <ul class="list-disc pl-5 space-y-1 text-slate-600">
                                        <li>Setelah dibeli, menu Compress IMG akan muncul di sidebar.</li>
                                        <li>Pilih tab Single atau Batch sesuai kebutuhan.</li>
                                        <li>Upload gambar, pilih level kompresi, lalu klik Kompres.</li>
                                        <li>Download hasil kompres individual atau semua dalam ZIP.</li>
                                    </ul>
                                </div>
                                <div class="text-[11px] text-slate-500">
                                    Harga: Rp 10.000 (sekali bayar, aktif selamanya)
                                </div>
                            </div>
                        `,
                        actionText: 'Mengerti'
                    });
                }
                if (addonKey === 'lighting_shadows') {
                    window.showModernPopup({
                        title: 'Light & Shadw',
                        message: `
                            <div style="line-height:1.7;font-size:13px;">
                                Atur ulang pencahayaan dan bayangan estetis pada foto produk untuk hasil sinematik.
                                <br>
                                <div style="display:flex;gap:8px;margin:10px 0 6px;">
                                    <div style="flex:1;text-align:center;">
                                        <img src="assets/lighting_shadows_2.jpeg" alt="Sebelum" style="width:100%;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.12);display:block;">
                                        <div style="font-size:11px;color:#64748b;margin-top:4px;font-weight:600;">Sebelum</div>
                                    </div>
                                    <div style="flex:1;text-align:center;">
                                        <img src="assets/lighting_shadows_1.png" alt="Sesudah" style="width:100%;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.12);display:block;">
                                        <div style="font-size:11px;color:#64748b;margin-top:4px;font-weight:600;">Sesudah</div>
                                    </div>
                                </div>
                                <br>
                                <strong>Fitur utama:</strong><br>
                                &bull; Arah cahaya: depan, samping, backlight<br>
                                &bull; Jenis cahaya: Golden Hour, Hard Sunlight, Soft Studio, Moody/Cinematic<br>
                                &bull; Shadow gobo: daun palem, tirai jendela, bingkai jendela<br>
                                &bull; Partikel udara: dust motes, magic dust<br>
                                &bull; Kontrol Depth of Field (bokeh)
                                <br><br>
                                <strong>Cara pakai:</strong><br>
                                1. Beli addon Light &amp; Shadw<br>
                                2. Menu <em>Light &amp; Shadw</em> akan muncul di sidebar<br>
                                3. Unggah foto produk, atur lighting &amp; shadow, klik generate
                                <br><br>
                                <strong>Harga:</strong> Rp 10.000 (sekali bayar, aktif selamanya)
                            </div>
                        `,
                        actionText: 'Mengerti'
                    });
                }
                if (addonKey === 'storyboard') {
                    window.showModernPopup({
                        title: 'Storyboard AI',
                        message: `
                            <div style="line-height:1.7;font-size:13px;">
                                Buat storyboard visual dari konsep video secara otomatis.
                                <br>
                                <img src="assets/fiturstoryboard.png" alt="Storyboard AI Preview" style="width:100%;border-radius:12px;margin:10px 0 6px;box-shadow:0 4px 16px rgba(0,0,0,0.12);display:block;">
                                <br>
                                <strong>Cara pakai:</strong><br>
                                1. Upload hingga 5 gambar referensi (opsional)<br>
                                2. Masukkan konsep/ide video<br>
                                3. Klik <em>Buat Ide Otomatis</em> untuk analisa &amp; buat prompt tiap scene<br>
                                4. Klik <em>Generate Storyboard</em> untuk membuat gambar — setiap scene berkesinambungan otomatis<br>
                                5. Edit prompt tiap scene dan regenerate jika perlu
                                <br><br>
                                <strong>Fitur:</strong><br>
                                • Analisa gambar &amp; konsep menggunakan AI<br>
                                • Generate 2–10 scene sekaligus<br>
                                • Mendukung semua model Private Server<br>
                                • Aspect ratio: 16:9, 9:16, 1:1, 4:3, 3:4<br>
                                • Regenerate per scene<br>
                                • Download hasil gambar
                                <br><br>
                                <strong>Harga:</strong> Rp 15.000 (lifetime)
                            </div>
                        `,
                        actionText: 'Mengerti'
                    });
                }
                if (addonKey === 'menu_restoran') {
                    window.showModernPopup({
                        title: 'Menu Restoran',
                        message: `
                            <div style="line-height:1.7;font-size:13px;">
                                Generate desain buku menu restoran profesional siap cetak hanya dengan beberapa klik.
                                <br>
                                <div style="margin:12px 0;border-radius:10px;overflow:hidden;">
                                    <img src="/assets/menu restoran.png" alt="Menu Restoran Preview" style="width:100%;height:auto;display:block;">
                                </div>
                                <strong>Fitur utama:</strong><br>
                                &bull; Upload logo, foto referensi, atau foto menu<br>
                                &bull; Input nama menu, deskripsi, dan harga<br>
                                &bull; Pilih template desain (Dark Elegant, Classic Brown, Modern Minimal, Vibrant, Kustom)<br>
                                &bull; Pilih ukuran: A4 Portrait/Landscape, Letter, Square<br>
                                &bull; Preview hasil scroll sebelum download<br>
                                &bull; Download PDF/Cetak atau PNG
                                <br><br>
                                <strong>Cara pakai:</strong><br>
                                1. Beli addon Menu Restoran AI<br>
                                2. Menu <em>Menu Restoran</em> akan muncul di sidebar<br>
                                3. Upload logo, isi identitas & item menu, pilih template<br>
                                4. Klik Generate — AI akan buat desain menu otomatis<br>
                                5. Preview hasilnya, lalu download PDF atau PNG
                                <br><br>
                                <strong>Harga:</strong> Rp 20.000 (sekali bayar, aktif selamanya)
                            </div>
                        `,
                        actionText: 'Mengerti'
                    });
                }
                if (addonKey === 'batik_tenun') {
                    window.showModernPopup({
                        title: 'Batik & Tenun',
                        message: `
                            <div style="line-height:1.7;font-size:13px;">
                                Ubah motif pakaian pada foto menjadi kain batik atau tenun khas Nusantara, tanpa mengubah wajah, pose, dan komposisi asli.
                                <br><br>
                                <img src="/assets/batik%20tenun.png" alt="Contoh Batik &amp; Tenun" style="width:100%;border-radius:12px;display:block;margin:0 auto;">
                                <br>
                                <strong>Fitur utama:</strong><br>
                                &bull; Upload foto orang berpakaian<br>
                                &bull; Pilih jenis kain: Batik atau Tenun<br>
                                &bull; Pilih motif: Parang, Kawung, Mega Mendung, Sogan, Songket, Ikat, dll<br>
                                &bull; Opsional: upload gambar referensi motif sendiri<br>
                                &bull; Pilih warna dominan &amp; rasio hasil<br>
                                &bull; Download hasil
                                <br><br>
                                <strong>Cara pakai:</strong><br>
                                1. Beli addon Batik &amp; Tenun<br>
                                2. Menu <em>Batik &amp; Tenun</em> akan muncul di sidebar<br>
                                3. Upload foto, pilih jenis kain &amp; motif<br>
                                4. Klik Generate — AI mengubah motif pakaian otomatis
                                <br><br>
                                <strong>Harga:</strong> Rp 20.000 (sekali bayar, aktif selamanya)
                            </div>
                        `,
                        actionText: 'Mengerti'
                    });
                }
                if (addonKey === 'foto_era_sejarah') {
                    window.showModernPopup({
                        title: 'Foto Era Sejarah',
                        message: `
                            <div style="line-height:1.7;font-size:13px;">
                                Masukkan wajahmu ke era-era bersejarah Indonesia dan dunia — dari Kerajaan Majapahit hingga Disco 70an.
                                <br><br>
                                <img src='/assets/foto-sejarah.png' style='width:100%;border-radius:10px;margin-bottom:12px;object-fit:cover;' alt='Contoh Foto Era Sejarah'>
                                <br>
                                <strong>Era yang tersedia:</strong><br>
                                &bull; Kerajaan Majapahit (abad 13-15)<br>
                                &bull; Kerajaan Sriwijaya<br>
                                &bull; Era Kolonial Belanda (1600-1945)<br>
                                &bull; Indonesia 1945 — Kemerdekaan<br>
                                &bull; Era 80an Orde Baru<br>
                                &bull; Disco &amp; Retro 70an-90an<br>
                                &bull; Zaman Prasejarah
                                <br><br>
                                <strong>Gaya Visual:</strong><br>
                                &bull; Realistis (foto portrait)<br>
                                &bull; Lukisan (oil painting)<br>
                                &bull; Sinematik (dramatic film)
                                <br><br>
                                <strong>Cara pakai:</strong><br>
                                1. Upload foto wajah yang jelas<br>
                                2. Pilih era sejarah yang diinginkan<br>
                                3. Pilih gaya visual &amp; detail tambahan<br>
                                4. Klik Generate — AI akan mentransformasi penampilanmu
                                <br><br>
                                <strong>Harga:</strong> Rp 7.000 (sekali bayar, aktif selamanya)
                            </div>
                        `,
                        actionText: 'Mengerti'
                    });
                }
                if (addonKey === 'foto_zodiak') {
                    window.showModernPopup({
                        title: 'Foto Zodiak',
                        message: `
                            <div style="line-height:1.7;font-size:13px;">
                                Generate potret fantasy epik berdasarkan zodiak dan elemennya — tiap zodiak punya tema visual unik yang memukau.
                                <br><br>
                                <img src='/assets/foto-zodiak.png' style='width:100%;border-radius:10px;margin-bottom:12px;object-fit:cover;' alt='Contoh Foto Zodiak'>
                                <br>
                                <strong>Tema per Zodiak:</strong><br>
                                &bull; ♌ Leo → Raja Singa (lion king royalty)<br>
                                &bull; ♏ Scorpio → Dark Warrior (armor kalajengking)<br>
                                &bull; ♓ Pisces → Underwater Mermaid (kerajaan lautan)<br>
                                &bull; ♈ Aries → Fire Warrior (tanduk domba api)<br>
                                &bull; ♒ Aquarius → Star Traveler (futuristik bintang)<br>
                                &bull; dan 7 zodiak lainnya dengan tema eksklusif
                                <br><br>
                                <strong>Gaya Fantasy:</strong><br>
                                &bull; Epic Fantasy (dramatis &amp; megah)<br>
                                &bull; Dark Gothic (gelap &amp; misterius)<br>
                                &bull; Ethereal Magic (sihir &amp; cahaya)<br>
                                &bull; Anime Style (ilustrasi anime)
                                <br><br>
                                <strong>Cara pakai:</strong><br>
                                1. Upload foto wajah (opsional — bisa tanpa foto)<br>
                                2. Pilih zodiak &amp; gaya fantasy<br>
                                3. Klik Generate — AI buat potret fantasy zodiak kamu
                                <br><br>
                                <strong>Harga:</strong> Rp 10.000 (sekali bayar, aktif selamanya)
                            </div>
                        `,
                        actionText: 'Mengerti'
                    });
                }
                if (addonKey === 'standalone') {
                    window.showModernPopup({
                        title: 'Sulap Foto (Standalone)',
                        message: `
                            <div class="space-y-4 text-sm text-slate-700">
                                <div class="text-slate-600">
                                    Versi khusus Sulap Foto yang di-install ke PC atau Mac anda. Berjalan tanpa server eksternal, dan semua fitur terbuka!
                                </div>
                                <div class="space-y-2">
                                    <div class="font-bold text-slate-800">Keunggulan Standalone</div>
                                    <ul class="space-y-2 text-slate-600">
                                        <li class="flex items-start gap-2">
                                            <span class="inline-block w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
                                            <div><span class="font-semibold text-slate-800">10x Lebih Cepat</span><br>PC atau Mac anda menjadi server lokal, proses generate jauh lebih cepat tanpa delay jaringan.</div>
                                        </li>
                                        <li class="flex items-start gap-2">
                                            <span class="inline-block w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
                                            <div><span class="font-semibold text-slate-800">Tanpa Limit</span><br>Generate sebanyak yang anda mau, tidak ada batasan harian atau kuota.</div>
                                        </li>
                                        <li class="flex items-start gap-2">
                                            <span class="inline-block w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
                                            <div><span class="font-semibold text-slate-800">Semua Fitur Terbuka</span><br>Pro, VIP, dan semua Addons langsung aktif tanpa biaya tambahan selamanya.</div>
                                        </li>
                                        <li class="flex items-start gap-2">
                                            <span class="inline-block w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
                                            <div><span class="font-semibold text-slate-800">Tetap Butuh Internet</span><br>Proses generate tetap menggunakan koneksi internet untuk mengakses AI model, namun PC/Mac anda yang jadi server perantara.</div>
                                        </li>
                                    </ul>
                                </div>
                                <div class="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                    <div class="text-xs font-bold text-amber-800 mb-1">💡 Catatan Penting</div>
                                    <div class="text-[11px] text-amber-700">
                                        Standalone version memerlukan instalasi aplikasi desktop. Setelah pembelian, anda akan menerima link download dan license key via email.
                                    </div>
                                </div>
                            </div>
                        `,
                        actionText: 'Mengerti'
                    });
                }
            });
        });
    }

    // Function to update Addons UI based on Boost Toggle state
    function updateAddonsUI() {
        if (!boostToggles.length || !addonsBoostStatus || !addonsBoostBtn) return;
        
        const isBoostActive = boostToggles[0].checked;

        if (isBoostActive) {
            addonsBoostStatus.textContent = 'Aktif';
            addonsBoostStatus.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700';
            addonsBoostBtn.textContent = 'Non-aktifkan';
            addonsBoostBtn.className = 'w-full py-2.5 rounded-xl font-semibold text-sm transition-all bg-red-50 text-red-600 hover:bg-red-100';
        } else {
            addonsBoostStatus.textContent = 'Non-Aktif';
            addonsBoostStatus.className = 'px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500';
            addonsBoostBtn.textContent = 'Aktifkan';
            addonsBoostBtn.className = 'w-full py-2.5 rounded-xl font-semibold text-sm transition-all bg-slate-100 text-slate-600 hover:bg-slate-200';
        }
    }

    function removeUpscaleButtons() {
        document.querySelectorAll('.upscale-btn').forEach(btn => btn.remove());
    }

    function findResultRootForImage(img) {
        if (!img) return null;
        return img.closest('[id$="results-grid"],[id$="results-container"],[id$="result-container"],[id*="-results-"],[id*="-result-"]');
    }

    function findCardContainerForImage(img, resultRoot) {
        if (!img) return null;

        let card = img.closest('.result-card') || img.closest('.card');
        if (card) return card;

        if (resultRoot) {
            let node = img;
            while (node && node.parentElement && node.parentElement !== resultRoot) {
                node = node.parentElement;
            }
            if (node && node.parentElement === resultRoot) return node;
        }

        return img.parentElement;
    }

    function findActionContainerInCard(card) {
        if (!card) return null;

        const primaryViewBtn = card.querySelector('button.view-btn, a.view-btn');
        if (primaryViewBtn && primaryViewBtn.parentElement) return primaryViewBtn.parentElement;

        const viewBtns = card.querySelectorAll('.view-btn');
        for (let i = 0; i < viewBtns.length; i++) {
            const el = viewBtns[i];
            if (!el || !el.tagName) continue;
            if (el.tagName === 'IMG') continue;
            if (el.parentElement) return el.parentElement;
        }

        const directAction = card.querySelector('a[download],button[onclick*="openTiImagePreview"],button[onclick*="window.openTiImagePreview"]');
        if (directAction) {
            const wrap = directAction.closest('div');
            if (wrap && card.contains(wrap) && wrap !== card) return wrap;
        }

        const buttons = card.querySelectorAll('button,a');
        for (let i = 0; i < buttons.length; i++) {
            const el = buttons[i];
            const title = (el.getAttribute('title') || '').toLowerCase();
            const onclick = (el.getAttribute('onclick') || '').toLowerCase();
            if (!title.includes('lihat') && !onclick.includes('opentiimagepreview')) continue;
            const wrap = el.closest('div');
            if (wrap && card.contains(wrap)) return wrap;
        }

        return null;
    }

    function ensureUpscaleButtonForImage(img) {
        if (!img || img.closest('.auto-upscale-card')) return;
        if (img.src.includes('sflogo.gif')) return;
        if (img.dataset.upscaleButtonAdded === 'true') return;
        if (img.classList && img.classList.contains('ba-image-img-before')) return;

        const src = img.src;
        if (!src || (!src.startsWith('http') && !src.startsWith('data:image'))) return;

        const strongCard = img.closest('.result-card') || img.closest('.card');
        const resultRoot = findResultRootForImage(img);
        if (!strongCard && !resultRoot) return;

        const card = strongCard || findCardContainerForImage(img, resultRoot);
        if (!card) return;

        const hoResultContainer = img.closest('#ho-result-container');
        const hoActions = document.getElementById('ho-result-actions');
        const hoDownloadBtn = document.getElementById('ho-download-btn');
        if (hoResultContainer && hoActions && hoDownloadBtn) {
            if (!hoActions.querySelector('.upscale-btn')) {
                const upscaleBtn = document.createElement('button');
                upscaleBtn.type = 'button';
                upscaleBtn.className = 'upscale-btn flex-1 py-3 bg-slate-900 text-white text-sm font-bold rounded-xl shadow-lg shadow-slate-200/50 hover:bg-slate-800 transition-all text-center flex items-center justify-center gap-2';
                upscaleBtn.title = 'Upscale 4K';
                upscaleBtn.dataset.imgSrc = src;
                upscaleBtn.innerHTML = `<i data-lucide="scan-line" class="w-4 h-4 text-teal-400"></i> Upscale`;
                hoDownloadBtn.insertAdjacentElement('beforebegin', upscaleBtn);
                if (window.lucide) window.lucide.createIcons();
            }
            img.dataset.upscaleButtonAdded = 'true';
            return;
        }

        if (card.querySelector('.upscale-btn')) {
            img.dataset.upscaleButtonAdded = 'true';
            return;
        }

        let actionContainer = findActionContainerInCard(card);
        if (!actionContainer) {
            const computed = window.getComputedStyle ? window.getComputedStyle(card) : null;
            if (computed && computed.position === 'static') {
                card.style.position = 'relative';
            }

            actionContainer = document.createElement('div');
            actionContainer.className = 'absolute bottom-3 right-3 flex gap-2 z-30';
            if (card.classList && card.classList.contains('group')) {
                actionContainer.className += ' opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0';
            }
            card.appendChild(actionContainer);
        }

        const upscaleBtn = document.createElement('button');
        upscaleBtn.type = 'button';
        upscaleBtn.className = 'upscale-btn result-action-btn shadow-md bg-white/90 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-lg backdrop-blur-sm transition-all transform hover:scale-110 active:scale-95';
        upscaleBtn.title = 'Upscale 4K';
        upscaleBtn.dataset.imgSrc = src;
        upscaleBtn.innerHTML = `<i data-lucide="scan-line" class="w-4 h-4"></i>`;

        const viewBtn = actionContainer.querySelector('.view-btn');
        if (viewBtn) {
            viewBtn.insertAdjacentElement('afterend', upscaleBtn);
        } else {
            actionContainer.insertBefore(upscaleBtn, actionContainer.firstChild);
        }
        img.dataset.upscaleButtonAdded = 'true';
        if (window.lucide) window.lucide.createIcons();
    }

    // Observer for new images
    const observer = new MutationObserver((mutations) => {
        const isEnabled = localStorage.getItem('auto_upscale_enabled') === 'true';
        if (!isEnabled) {
            removeUpscaleButtons();
            return;
        }

        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // Element
                    // Check for images in result cards
                    const imagesToCheck = [];
                    if (node.tagName === 'IMG') {
                        imagesToCheck.push(node);
                    }
                    node.querySelectorAll('img').forEach(img => imagesToCheck.push(img));

                    imagesToCheck.forEach(img => {
                        if (img.closest('.auto-upscale-card')) return;
                        if (img.src && img.src.includes('sflogo.gif')) return;

                        const src = img.src;
                        if (src && (src.startsWith('http') || src.startsWith('data:image'))) {
                            ensureUpscaleButtonForImage(img);
                        }
                    });
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    function initBeforeAfterSlider(container, beforeSrc, afterSrc) {
        container.innerHTML = `
            <div class="ba-slider-container w-full h-full relative overflow-hidden rounded-lg cursor-ew-resize select-none">
                <img src="${afterSrc}" class="ba-image-img absolute top-0 left-0 w-full h-full object-contain pointer-events-none" style="z-index: 1;">
                <div class="ba-resize-div absolute top-0 left-0 h-full w-[50%] overflow-hidden border-r-2 border-white bg-white" style="z-index: 2;">
                    <img src="${beforeSrc}" class="ba-image-img-before absolute top-0 left-0 w-full h-full object-contain max-w-none pointer-events-none">
                </div>
                <div class="ba-slider-handle absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10 shadow-lg left-[50%]">
                    <div class="ba-slider-circle absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center">
                        <i data-lucide="move-horizontal" class="w-4 h-4 text-slate-600"></i>
                    </div>
                </div>
                <div class="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded z-20 font-medium">Before</div>
                <div class="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded z-20 font-medium">After</div>
            </div>
            
            <!-- Zoom Controls -->
            <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-lg z-30 border border-slate-200">
                <button class="ug-zoom-out p-1.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors" title="Zoom Out">
                    <i data-lucide="minus" class="w-4 h-4"></i>
                </button>
                <span class="ug-zoom-level text-xs font-bold text-slate-700 w-12 text-center">100%</span>
                <button class="ug-zoom-in p-1.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors" title="Zoom In">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                </button>
                <div class="w-px h-4 bg-slate-300 mx-1"></div>
                <button class="ug-reset-zoom p-1.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors" title="Reset">
                    <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        
        const slider = container.querySelector('.ba-slider-container');
        const resizeDiv = container.querySelector('.ba-resize-div');
        const handle = container.querySelector('.ba-slider-handle');
        const beforeImg = resizeDiv.querySelector('.ba-image-img-before');
        const afterImg = container.querySelector('.ba-image-img');
        
        // Zoom Logic
        let zoomLevel = 1;
        const zoomStep = 0.25;
        const maxZoom = 4;
        const minZoom = 1;
        
        const zoomInBtn = container.querySelector('.ug-zoom-in');
        const zoomOutBtn = container.querySelector('.ug-zoom-out');
        const resetBtn = container.querySelector('.ug-reset-zoom');
        const zoomDisplay = container.querySelector('.ug-zoom-level');
        
        const updateZoom = () => {
            zoomDisplay.textContent = `${Math.round(zoomLevel * 100)}%`;
            const scaleStyle = `scale(${zoomLevel})`;
            beforeImg.style.transform = scaleStyle;
            afterImg.style.transform = scaleStyle;
            beforeImg.style.transformOrigin = 'center center';
            afterImg.style.transformOrigin = 'center center';
        };
        
        zoomInBtn.addEventListener('click', () => {
            if (zoomLevel < maxZoom) {
                zoomLevel += zoomStep;
                updateZoom();
            }
        });
        
        zoomOutBtn.addEventListener('click', () => {
            if (zoomLevel > minZoom) {
                zoomLevel -= zoomStep;
                updateZoom();
            }
        });
        
        resetBtn.addEventListener('click', () => {
            zoomLevel = 1;
            updateZoom();
        });

        // Slider Logic
        const updateWidths = () => {
            if (beforeImg && slider) {
                const width = slider.clientWidth;
                if (width > 0) {
                    beforeImg.style.width = `${width}px`;
                } else {
                    requestAnimationFrame(updateWidths);
                }
            }
        };
        
        // Initial width set
        setTimeout(updateWidths, 100);
        beforeImg.onload = updateWidths;
        window.addEventListener('resize', updateWidths);

        const move = (e) => {
            const rect = slider.getBoundingClientRect();
            let clientX = e.clientX;
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
            }
            
            let x = clientX - rect.left;
            x = Math.max(0, Math.min(x, rect.width));
            const percent = (x / rect.width) * 100;
            
            resizeDiv.style.width = `${percent}%`;
            handle.style.left = `${percent}%`;
        };
        
        slider.addEventListener('mousemove', move);
        slider.addEventListener('touchmove', move);
        
        const controls = container.querySelector('.absolute.bottom-4');
        if (controls) {
            controls.addEventListener('mousemove', (e) => e.stopPropagation());
            controls.addEventListener('touchmove', (e) => e.stopPropagation());
            controls.addEventListener('mousedown', (e) => e.stopPropagation());
            controls.addEventListener('touchstart', (e) => e.stopPropagation());
        }
    }

    function ensureUpscaleModal() {
        let modal = document.getElementById('upscale-preview-modal');
        if (modal) {
            return {
                modal,
                content: modal.querySelector('[data-upscale-modal-content]'),
                closeBtn: modal.querySelector('[data-upscale-close-btn]'),
                imageContainer: modal.querySelector('[data-upscale-image-container]')
            };
        }

        modal = document.createElement('div');
        modal.id = 'upscale-preview-modal';
        modal.className = 'fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4 opacity-0 pointer-events-none transition-opacity duration-300';
        modal.innerHTML = `
            <div class="absolute inset-0" data-upscale-backdrop></div>
            <div class="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/10" data-upscale-modal-content>
                <div class="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                            <i data-lucide="scan-line" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <div class="font-extrabold text-slate-900 leading-tight">Upscale 4K</div>
                            <div class="text-xs text-slate-500 font-medium">Proses & lihat hasil di popup</div>
                        </div>
                    </div>
                    <button type="button" class="text-white bg-red-600 rounded-full p-2 hover:bg-red-700 transition-colors" data-upscale-close-btn title="Tutup">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>

                <div class="p-4 sm:p-6">
                    <div class="relative w-full h-[55vh] sm:h-[65vh] rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex flex-col items-center justify-center" data-upscale-image-container>
                        <img src="/assets/sflogo.gif" class="w-16 h-16 opacity-60 mb-3">
                        <div class="text-xs font-bold text-teal-600 uppercase tracking-wider">Pilih Proses untuk mulai</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (window.lucide) window.lucide.createIcons();

        const close = () => closeUpscaleModal();
        modal.querySelector('[data-upscale-close-btn]').addEventListener('click', close);
        modal.querySelector('[data-upscale-backdrop]').addEventListener('click', close);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && upscaleModalState.isOpen) close();
        });

        return {
            modal,
            content: modal.querySelector('[data-upscale-modal-content]'),
            closeBtn: modal.querySelector('[data-upscale-close-btn]'),
            imageContainer: modal.querySelector('[data-upscale-image-container]')
        };
    }

    function ensureUpscaleDownloadOverlay(container, url) {
        if (!container || !url) return;
        const existing = container.querySelector('[data-upscale-download-overlay]');
        if (existing) existing.remove();
        const downloadBtnContainer = document.createElement('div');
        downloadBtnContainer.dataset.upscaleDownloadOverlay = 'true';
        downloadBtnContainer.className = 'absolute bottom-4 right-4 z-30';
        downloadBtnContainer.innerHTML = `
            <a href="${url}" download="upscaled_4k_${Date.now()}.png" class="bg-teal-500 hover:bg-teal-600 text-white p-2.5 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110" title="Unduh Hasil">
                <i data-lucide="download" class="w-5 h-5"></i>
            </a>
        `;
        container.appendChild(downloadBtnContainer);
        if (window.lucide) window.lucide.createIcons();
    }

    function openUpscaleModal(beforeSrc, opts = {}) {
        const ui = ensureUpscaleModal();
        upscaleModalState.isOpen = true;

        ui.modal.classList.remove('opacity-0', 'pointer-events-none');

        // Check cache first for this image
        const cachedResult = upscaleCache.get(beforeSrc);
        
        // If we have cached result or passed result, show it immediately
        if (opts.afterUrl || cachedResult) {
            const afterUrl = opts.afterUrl || cachedResult;
            upscaleModalState.beforeSrc = beforeSrc || '';
            upscaleModalState.afterUrl = afterUrl;
            ui.imageContainer.innerHTML = '';
            ui.imageContainer.className = 'relative w-full h-[55vh] sm:h-[65vh] rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 block';
            initBeforeAfterSlider(ui.imageContainer, beforeSrc, afterUrl);
            ensureUpscaleDownloadOverlay(ui.imageContainer, afterUrl);

            if (window.lucide) window.lucide.createIcons();
            return;
        }

        // If currently processing the same image, just reopen without resetting
        if (upscaleModalState.beforeSrc === beforeSrc && upscaleModalState.isProcessing) {
            return;
        }

        // New image — start upscale automatically
        upscaleModalState.beforeSrc = beforeSrc || '';
        upscaleModalState.isProcessing = true;

        ui.imageContainer.className = 'relative w-full h-[55vh] sm:h-[65vh] rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex flex-col items-center justify-center';
        ui.imageContainer.innerHTML = `
            <img src="/assets/sflogo.gif" class="w-16 h-16 opacity-60 mb-3">
            <div class="text-xs font-bold text-teal-600 uppercase tracking-wider animate-pulse">Sedang Memproses 4K...</div>
        `;

        if (upscaleModalState.afterUrl) {
            try { URL.revokeObjectURL(upscaleModalState.afterUrl); } catch (_) {}
            upscaleModalState.afterUrl = '';
        }

        // Auto-call the upscale endpoint
        (async () => {
            const afterUrl = await processUpscaleInline(upscaleModalState.beforeSrc, { imageContainer: ui.imageContainer });
            upscaleModalState.isProcessing = false;
            if (afterUrl) {
                // Save to cache
                upscaleCache.set(upscaleModalState.beforeSrc, afterUrl);
                upscaleModalState.afterUrl = afterUrl;
            } else {
            }
        })();
    }

    function closeUpscaleModal() {
        const modal = document.getElementById('upscale-preview-modal');
        if (!modal) return;
        upscaleModalState.isOpen = false;
        modal.classList.add('opacity-0', 'pointer-events-none');
    }

    window.openUpscaleModal = openUpscaleModal;

    async function processUpscaleInline(imageUrl, ui) {
        const toBlobFromDataUrl = (dataUrl) => {
            const parts = dataUrl.split(',');
            const meta = parts[0];
            const base64 = parts[1];
            const mimeMatch = meta.match(/data:(.*);base64/);
            const mime = mimeMatch ? mimeMatch[1] : 'image/png';
            const bytes = atob(base64);
            const buffer = new Uint8Array(bytes.length);
            for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
            return new Blob([buffer], { type: mime });
        };

        try {
            let blob;
            if (imageUrl.startsWith('data:image')) {
                blob = toBlobFromDataUrl(imageUrl);
            } else if (imageUrl.includes('ibyteimg.com') || imageUrl.includes('ciciai.com')) {
                const proxyResp = await fetch('/server/upscale_proxy.php?action=proxy_image&url=' + encodeURIComponent(imageUrl));
                if (!proxyResp.ok) throw new Error('Proxy image fetch failed: ' + proxyResp.status);
                blob = await proxyResp.blob();
            } else {
                const resp = await fetch(imageUrl, { cache: 'no-store' });
                blob = await resp.blob();
            }

            const form = new FormData();
            form.append('image', blob, `image_${Date.now()}.png`);

            const uploadRes = await fetch('/server/upscale_proxy.php?action=upload', {
                method: 'POST',
                body: form
            });
            
            if (!uploadRes.ok) {
                const errorText = await uploadRes.text();
                throw new Error(`Upload failed: ${uploadRes.status} - ${errorText.substring(0, 200)}`);
            }
            
            const uploadText = await uploadRes.text();
            let uploadJson;
            try {
                uploadJson = JSON.parse(uploadText);
            } catch (e) {
                console.error('Invalid JSON response:', uploadText.substring(0, 500));
                throw new Error('Server mengembalikan response tidak valid');
            }
            
            if (!uploadJson.success) {
                throw new Error(uploadJson.message || 'Upload gagal');
            }

            let serverFilename = uploadJson.data?.server_filename || uploadJson.data?.files?.[0]?.server_filename || '';
            if (!serverFilename) throw new Error('server_filename tidak ditemukan');

            const upscaleRes = await fetch('/server/upscale_proxy.php?action=upscale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ server_filename: serverFilename })
            });
            
            if (!upscaleRes.ok) {
                const errorText = await upscaleRes.text();
                let errorMsg = 'Upscale gagal';
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMsg = errorJson.message || errorMsg;
                } catch (e) {
                    errorMsg = `Upscale failed: ${upscaleRes.status}`;
                }
                throw new Error(errorMsg);
            }

            const upscaledBlob = await upscaleRes.blob();
            
            // Validasi blob tidak kosong
            if (upscaledBlob.size === 0) {
                throw new Error('Response upscale kosong');
            }
            const upscaledUrl = URL.createObjectURL(upscaledBlob);

            // Update UI with result
            // Clear loading elements
            ui.imageContainer.innerHTML = '';
            ui.imageContainer.classList.remove('flex-col', 'items-center', 'justify-center'); // Remove flex layout used for loader
            ui.imageContainer.classList.add('block'); // Reset to block for slider

            // Initialize slider
            initBeforeAfterSlider(ui.imageContainer, imageUrl, upscaledUrl);

            // Add download button
            const downloadBtnContainer = document.createElement('div');
            downloadBtnContainer.className = 'absolute bottom-4 right-4 z-30';
            downloadBtnContainer.innerHTML = `
                <a href="${upscaledUrl}" download="upscaled_4k_${Date.now()}.png" class="bg-teal-500 hover:bg-teal-600 text-white p-2.5 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110" title="Unduh Hasil">
                    <i data-lucide="download" class="w-5 h-5"></i>
                </a>
            `;
            ui.imageContainer.appendChild(downloadBtnContainer);

            if (window.lucide) window.lucide.createIcons();
            return upscaledUrl;

        } catch (e) {
            console.error(e);
            ui.imageContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full p-4 text-center">
                    <i data-lucide="alert-circle" class="w-8 h-8 text-red-400 mb-2"></i>
                    <p class="text-xs text-slate-500">Gagal memproses upscale.</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return null;
        }
    }

    document.body.addEventListener('click', (e) => {
        const upscaleBtn = e.target.closest('.upscale-btn');
        if (!upscaleBtn) return;

        const isEnabled = localStorage.getItem('auto_upscale_enabled') === 'true';
        if (!isEnabled) return;

        const card = upscaleBtn.closest('.result-card') || upscaleBtn.closest('.card');
        const imgEl = card ? card.querySelector('img') : upscaleBtn.closest('div')?.querySelector('img');
        const imageUrl = upscaleBtn.dataset.imgSrc || (imgEl ? imgEl.src : '');
        if (!imageUrl) return;
        upscaleBtn.disabled = true;
        upscaleBtn.classList.add('opacity-60', 'cursor-not-allowed');

        openUpscaleModal(imageUrl);

        setTimeout(() => {
            upscaleBtn.disabled = false;
            upscaleBtn.classList.remove('opacity-60', 'cursor-not-allowed');
        }, 300);
    });

    // Initial check for existing images (in case page loaded with images)
    function checkExistingImages() {
        const isEnabled = localStorage.getItem('auto_upscale_enabled') === 'true';
        if (!isEnabled) return;

        const imgs = document.querySelectorAll('img');
        imgs.forEach(img => {
            if (img.closest('.auto-upscale-card')) return;
            if (img.src && img.src.includes('sflogo.gif')) return;

            const src = img.src;
            if (src && (src.startsWith('http') || src.startsWith('data:image'))) {
                ensureUpscaleButtonForImage(img);
            }
        });
    }
    
    // Run check after a short delay to ensure DOM is ready
    setTimeout(checkExistingImages, 1000);

    // Old Modal Functions Removed


    // Function to check Auto Upscale status
    window.checkAutoUpscaleStatus = async function() {
        const email = localStorage.getItem('sulapfoto_verified_email');
        if (!email) return;

        try {
            const result = await window.getAddonStatus(email, 'auto_upscale');
            if (result.success) {
                const btn = document.getElementById('addons-upscale-btn');
                const status = document.getElementById('addons-upscale-status');
                const price = document.getElementById('addons-upscale-price');
                
                if (result.is_active) {
                    // Check if enabled in localStorage, auto-enable if not set
                    if (localStorage.getItem('auto_upscale_enabled') === null) {
                        localStorage.setItem('auto_upscale_enabled', 'true');
                    }
                    
                    // Update UI for active status
                    if (status) {
                        status.textContent = 'Sudah Dibeli';
                        status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700';
                    }
                    if (price) price.style.display = 'none';
                    if (btn) {
                        const isEnabled = localStorage.getItem('auto_upscale_enabled') === 'true';

                        btn.textContent = isEnabled ? 'Non-aktifkan' : 'Aktifkan';
                        btn.className = isEnabled 
                            ? 'w-full py-2.5 rounded-xl font-semibold text-sm transition-all bg-red-50 text-red-600 hover:bg-red-100'
                            : 'w-full py-2.5 rounded-xl font-semibold text-sm transition-all bg-slate-100 text-slate-600 hover:bg-slate-200';
                        
                        // Override click handler for toggle
                        btn.onclick = function() {
                            const newState = !isEnabled;
                            localStorage.setItem('auto_upscale_enabled', newState);
                            checkAutoUpscaleStatus(); // Recursive update
                            
                            // Show toast
                            if (window.showServerToast) {
                                window.showServerToast(
                                    newState ? "Auto Upscale Diaktifkan" : "Auto Upscale Dinonaktifkan",
                                    null,
                                    { icon: newState ? '<svg class="text-teal-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : '<svg class="text-slate-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M15 9l-6 6"></path><path d="M9 9l6 6"></path></svg>' }
                                );
                            }
                        };
                    }
                } else {
                    // Setup buy handler
                    if (btn) {
                        btn.onclick = function() {
                            if (window.showAddonBuyConfirm) {
                                window.showAddonBuyConfirm('auto_upscale', 35000, 'Auto Upscale (4K)');
                                return;
                            }
                            if (window.buyAddon) window.buyAddon('auto_upscale', 35000, 'Auto Upscale (4K)');
                        };
                    }
                }
            }
        } catch (e) {
            console.error('Failed to check auto upscale status', e);
        }
    };

    window.checkGifMakerStatus = async function () {
        const email = localStorage.getItem('sulapfoto_verified_email');
        const sidebarBtn = document.getElementById('tab-gif-maker');
        if (!email) {
            if (sidebarBtn) sidebarBtn.classList.add('hidden');
            return;
        }

        try {
            const result = await window.getAddonStatus(email, 'gif_maker');
            if (!result.success) return;

            const btn = document.getElementById('addons-gifmaker-btn');
            const status = document.getElementById('addons-gifmaker-status');
            const price = document.getElementById('addons-gifmaker-price');

            if (result.is_active) {
                if (sidebarBtn) sidebarBtn.classList.remove('hidden');
                if (status) {
                    status.textContent = 'Sudah Dibeli';
                    status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700';
                }
                if (price) price.style.display = 'none';
                if (btn) {
                    btn.textContent = 'Buka';
                    btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-rose-950 text-white hover:bg-rose-950 transition-all';
                    btn.onclick = function () {
                        if (typeof window.switchTab === 'function') {
                            window.switchTab('gif-maker');
                        }
                    };
                }
            } else {
                if (sidebarBtn) sidebarBtn.classList.add('hidden');
                if (status) {
                    status.textContent = 'Baru';
                    status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900';
                }
                if (price) price.style.display = '';
                if (btn) {
                    btn.textContent = 'Beli Sekarang';
                    btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-rose-900 text-white hover:bg-rose-950 transition-all';
                    btn.onclick = function () {
                        if (window.showAddonBuyConfirm) {
                            window.showAddonBuyConfirm('gif_maker', 5000, 'GIF Maker');
                            return;
                        }
                        if (window.buyAddon) window.buyAddon('gif_maker', 5000, 'GIF Maker');
                    };
                }
            }
        } catch (e) {
            console.error('Failed to check GIF Maker status', e);
        }
    };

    window.checkCompressImagesStatus = async function () {
        const email = localStorage.getItem('sulapfoto_verified_email');
        const sidebarBtn = document.getElementById('tab-compress-images');
        if (!email) {
            if (sidebarBtn) sidebarBtn.classList.add('hidden');
            return;
        }

        try {
            const result = await window.getAddonStatus(email, 'compress_images');
            if (!result.success) return;

            const btn = document.getElementById('addons-compress-btn');
            const status = document.getElementById('addons-compress-status');
            const price = document.getElementById('addons-compress-price');

            if (result.is_active) {
                if (sidebarBtn) sidebarBtn.classList.remove('hidden');
                if (status) {
                    status.textContent = 'Sudah Dibeli';
                    status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700';
                }
                if (price) price.style.display = 'none';
                if (btn) {
                    btn.textContent = 'Buka';
                    btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-violet-600 text-white hover:bg-violet-700 transition-all';
                    btn.onclick = function () {
                        if (typeof window.switchTab === 'function') {
                            window.switchTab('compress-images');
                        }
                    };
                }
            } else {
                if (sidebarBtn) sidebarBtn.classList.add('hidden');
                if (status) {
                    status.textContent = 'Baru';
                    status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-700';
                }
                if (price) price.style.display = '';
                if (btn) {
                    btn.textContent = 'Beli Sekarang';
                    btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-violet-500 text-white hover:bg-violet-600 transition-all';
                    btn.onclick = function () {
                        if (window.showAddonBuyConfirm) {
                            window.showAddonBuyConfirm('compress_images', 10000, 'Compress IMG');
                            return;
                        }
                        if (window.buyAddon) window.buyAddon('compress_images', 10000, 'Compress IMG');
                    };
                }
            }
        } catch (e) {
            console.error('Failed to check Compress Images status', e);
        }
    };

    window.checkMyFavoriteStatus = async function () {
        const email = localStorage.getItem('sulapfoto_verified_email');
        const sidebarBtn = document.getElementById('tab-my-favorite');
        if (!email) {
            if (sidebarBtn) sidebarBtn.classList.add('hidden');
            return;
        }

        try {
            const result = await window.getAddonStatus(email, 'my_favorite');
            if (!result.success) return;

            const btn = document.getElementById('addons-myfavorite-btn');
            const status = document.getElementById('addons-myfavorite-status');
            const price = document.getElementById('addons-myfavorite-price');

            if (result.is_active) {
                if (sidebarBtn) sidebarBtn.classList.remove('hidden');
                if (status) {
                    status.textContent = 'Sudah Dibeli';
                    status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700';
                }
                if (price) price.style.display = 'none';
                if (btn) {
                    btn.textContent = 'Buka';
                    btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-pink-600 text-white hover:bg-pink-700 transition-all';
                    btn.onclick = function () {
                        if (typeof window.switchTab === 'function') {
                            window.switchTab('my-favorite');
                        }
                    };
                }
            } else {
                if (sidebarBtn) sidebarBtn.classList.add('hidden');
                if (status) {
                    status.textContent = 'Baru';
                    status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-pink-100 text-pink-700';
                }
                if (price) price.style.display = '';
                if (btn) {
                    btn.textContent = 'Beli Sekarang';
                    btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-pink-500 text-white hover:bg-pink-600 transition-all';
                    btn.onclick = function () {
                        if (window.showAddonBuyConfirm) {
                            window.showAddonBuyConfirm('my_favorite', 15000, 'My Favorite');
                            return;
                        }
                        if (window.buyAddon) window.buyAddon('my_favorite', 15000, 'My Favorite');
                    };
                }
            }
        } catch (e) {
            console.error('Failed to check my favorite status', e);
        }
    };

    window.checkVectorSvgStatus = async function () {
        const email = localStorage.getItem('sulapfoto_verified_email');
        const sidebarBtn = document.getElementById('tab-vector-svg');
        if (!email) {
            if (sidebarBtn) sidebarBtn.classList.add('hidden');
            return;
        }

        try {
            const result = await window.getAddonStatus(email, 'vector_svg');
            if (!result.success) return;

            const btn = document.getElementById('addons-vectorsvg-btn');
            const status = document.getElementById('addons-vectorsvg-status');
            const price = document.getElementById('addons-vectorsvg-price');

            if (result.is_active) {
                if (sidebarBtn) sidebarBtn.classList.remove('hidden');
                if (status) {
                    status.textContent = 'Sudah Dibeli';
                    status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700';
                }
                if (price) price.style.display = 'none';
                if (btn) {
                    btn.textContent = 'Buka';
                    btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-yellow-700 text-white hover:bg-yellow-800 transition-all';
                    btn.onclick = function () {
                        if (typeof window.switchTab === 'function') {
                            window.switchTab('vector-svg');
                        }
                    };
                }
            } else {
                if (sidebarBtn) sidebarBtn.classList.add('hidden');
                if (status) {
                    status.textContent = 'Baru';
                    status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700';
                }
                if (price) price.style.display = '';
                if (btn) {
                    btn.textContent = 'Beli Sekarang';
                    btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-yellow-600 text-white hover:bg-yellow-700 transition-all';
                    btn.onclick = function () {
                        if (window.showAddonBuyConfirm) {
                            window.showAddonBuyConfirm('vector_svg', 10000, 'Vector & SVG');
                            return;
                        }
                        if (window.buyAddon) window.buyAddon('vector_svg', 10000, 'Vector & SVG');
                    };
                }
            }
        } catch (e) {
            console.error('Failed to check vector svg status', e);
        }
    };

    window.checkConvertImagesStatus = async function () {
        const email = localStorage.getItem('sulapfoto_verified_email');
        const sidebarBtn = document.getElementById('tab-convert-images');
        if (!email) {
            if (sidebarBtn) sidebarBtn.classList.add('hidden');
            return;
        }

        try {
            const result = await window.getAddonStatus(email, 'convert_images');
            if (!result.success) return;

            const btn = document.getElementById('addons-convertimages-btn');
            const status = document.getElementById('addons-convertimages-status');
            const price = document.getElementById('addons-convertimages-price');

            if (result.is_active) {
                if (sidebarBtn) sidebarBtn.classList.remove('hidden');
                if (status) {
                    status.textContent = 'Sudah Dibeli';
                    status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700';
                }
                if (price) price.style.display = 'none';
                if (btn) {
                    btn.textContent = 'Buka';
                    btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-all';
                    btn.onclick = function () {
                        if (typeof window.switchTab === 'function') {
                            window.switchTab('convert-images');
                        }
                    };
                }
            } else {
                if (sidebarBtn) sidebarBtn.classList.add('hidden');
                if (status) {
                    status.textContent = 'Baru';
                    status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700';
                }
                if (price) price.style.display = '';
                if (btn) {
                    btn.textContent = 'Beli Sekarang';
                    btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all';
                    btn.onclick = function () {
                        if (window.showAddonBuyConfirm) {
                            window.showAddonBuyConfirm('convert_images', 5000, 'Convert Images');
                            return;
                        }
                        if (window.buyAddon) window.buyAddon('convert_images', 5000, 'Convert Images');
                    };
                }
            }
        } catch (e) {
            console.error('Failed to check convert images status', e);
        }
    };

    window.checkSufoGptStatus = async function () {
        const email = localStorage.getItem('sulapfoto_verified_email');
        const sidebarBtn = document.getElementById('tab-sufo-gpt');
        if (!email) {
            if (sidebarBtn) sidebarBtn.classList.add('hidden');
            return;
        }

        try {
            const result = await window.getAddonStatus(email, 'sufo_gpt');
            if (!result.success) return;

            const btn = document.getElementById('addons-sufogpt-btn');
            const status = document.getElementById('addons-sufogpt-status');
            const price = document.getElementById('addons-sufogpt-price');

            if (result.is_active) {
                if (sidebarBtn) sidebarBtn.classList.remove('hidden');
                if (status) {
                    status.textContent = 'Sudah Dibeli';
                    status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700';
                }
                if (price) price.style.display = 'none';
                if (btn) {
                    btn.textContent = 'Buka';
                    btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-all';
                    btn.onclick = function () {
                        if (typeof window.switchTab === 'function') {
                            window.switchTab('sufo-gpt');
                        }
                    };
                }
            } else {
                if (sidebarBtn) sidebarBtn.classList.add('hidden');
                if (status) {
                    status.textContent = 'Baru';
                    status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700';
                }
                if (price) price.style.display = '';
                if (btn) {
                    btn.textContent = 'Beli Sekarang';
                    btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-blue-500 text-white hover:bg-blue-600 transition-all';
                    btn.onclick = function () {
                        if (window.showAddonBuyConfirm) {
                            window.showAddonBuyConfirm('sufo_gpt', 30000, 'SuFo GPT');
                            return;
                        }
                        if (window.buyAddon) window.buyAddon('sufo_gpt', 30000, 'SuFo GPT');
                    };
                }
            }
        } catch (e) {
            console.error('Failed to check SuFo GPT status', e);
        }
    };

    // Function to check Premium Themes status
    window.checkThemesStatus = async function() {
        const email = localStorage.getItem('sulapfoto_verified_email');
        if (!email) {
            // Hide themes menu if not logged in
            const themesMenu = document.getElementById('tab-themes');
            if (themesMenu) themesMenu.classList.add('hidden');
            return;
        }

        try {
            const result = await window.getAddonStatus(email, 'premium_themes');
            if (result.success) {
                const btn = document.getElementById('addons-themes-btn');
                const status = document.getElementById('addons-themes-status');
                const price = document.getElementById('addons-themes-price');
                const themesMenu = document.getElementById('tab-themes');
                
                if (result.is_active) {
                    // Show themes menu in sidebar
                    if (themesMenu) themesMenu.classList.remove('hidden');
                    
                    // Update UI for active status
                    if (status) {
                        status.textContent = 'Sudah Dibeli';
                        status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700';
                    }
                    if (price) price.style.display = 'none';
                    if (btn) {
                        btn.textContent = 'Ganti Tema';
                        btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-violet-500 text-white hover:bg-violet-600 transition-all';
                        btn.onclick = function() {
                            document.getElementById('tab-themes')?.click();
                        };
                    }
                } else {
                    // Hide themes menu in sidebar if not purchased
                    if (themesMenu) themesMenu.classList.add('hidden');
                    
                    // Setup buy handler
                    if (btn) {
                        btn.onclick = function() {
                            if (window.showAddonBuyConfirm) {
                                window.showAddonBuyConfirm('premium_themes', 10000, 'Premium Themes');
                                return;
                            }
                            if (window.buyAddon) window.buyAddon('premium_themes', 10000, 'Premium Themes');
                        };
                    }
                }
            }
        } catch (e) {
            console.error('Failed to check themes status', e);
            // Hide themes menu on error
            const themesMenu = document.getElementById('tab-themes');
            if (themesMenu) themesMenu.classList.add('hidden');
        }
    };

    // Function to check Super Book status
    window.checkSuperBookStatus = async function () {
        const email = localStorage.getItem('sulapfoto_verified_email');
        const sidebarBtn = document.getElementById('tab-super-book');
        if (!email) {
            if (sidebarBtn) sidebarBtn.classList.add('hidden');
            return;
        }

        try {
            const result = await window.getAddonStatus(email, 'super_book');
            if (!result.success) return;

            const btn = document.getElementById('addons-superbook-btn');
            const status = document.getElementById('addons-superbook-status');
            const price = document.getElementById('addons-superbook-price');

            if (result.is_active) {
                if (sidebarBtn) sidebarBtn.classList.remove('hidden');
                if (status) {
                    status.textContent = 'Sudah Dibeli';
                    status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700';
                }
                if (price) price.style.display = 'none';
                if (btn) {
                    btn.textContent = 'Buka';
                    btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-all';
                    btn.onclick = function () {
                        if (typeof window.switchTab === 'function') {
                            window.switchTab('super-book');
                        }
                    };
                }
            } else {
                if (sidebarBtn) sidebarBtn.classList.add('hidden');
                if (status) {
                    status.textContent = 'Baru';
                    status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700';
                }
                if (price) price.style.display = '';
                if (btn) {
                    btn.textContent = 'Beli Sekarang';
                    btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all';
                    btn.onclick = function () {
                        if (window.showAddonBuyConfirm) {
                            window.showAddonBuyConfirm('super_book', 20000, 'Super Book');
                            return;
                        }
                        if (window.buyAddon) window.buyAddon('super_book', 20000, 'Super Book');
                    };
                }
            }
        } catch (e) {
            console.error('Failed to check Super Book status', e);
        }
    };

    // Function to check Text to Speech status
    window.checkTtsStatus = async function () {
        const email = localStorage.getItem('sulapfoto_verified_email');
        const sidebarBtn = document.getElementById('tab-text-to-speech');
        if (!email) {
            if (sidebarBtn) sidebarBtn.classList.add('hidden');
            return;
        }

        try {
            const result = await window.getAddonStatus(email, 'text_to_speech');
            if (!result.success) return;

            const btn = document.getElementById('addons-tts-btn');
            const status = document.getElementById('addons-tts-status');
            const price = document.getElementById('addons-tts-price');

            if (result.is_active) {
                if (sidebarBtn) sidebarBtn.classList.remove('hidden');
                if (status) {
                    status.textContent = 'Sudah Dibeli';
                    status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700';
                }
                if (price) price.style.display = 'none';
                if (btn) {
                    btn.textContent = 'Buka';
                    btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-orange-600 text-white hover:bg-orange-700 transition-all';
                    btn.onclick = function () {
                        if (typeof window.switchTab === 'function') {
                            window.switchTab('text-to-speech');
                        }
                    };
                }
            } else {
                if (sidebarBtn) sidebarBtn.classList.add('hidden');
                if (status) {
                    status.textContent = 'Baru';
                    status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700';
                }
                if (price) price.style.display = '';
                if (btn) {
                    btn.textContent = 'Beli Sekarang';
                    btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-orange-500 text-white hover:bg-orange-600 transition-all';
                    btn.onclick = function () {
                        if (window.showAddonBuyConfirm) {
                            window.showAddonBuyConfirm('text_to_speech', 25000, 'Text to Speech');
                            return;
                        }
                        if (window.buyAddon) window.buyAddon('text_to_speech', 25000, 'Text to Speech');
                    };
                }
            }
        } catch (e) {
            console.error('Failed to check TTS status', e);
        }
    };

    // AI Video addon button - navigate to video generator page
    const grokVideoBtn = document.getElementById('addons-grokvideo-btn');
    if (grokVideoBtn) {
        grokVideoBtn.addEventListener('click', () => {
            if (typeof window.switchTab === 'function') {
                window.switchTab('video-generator');
            }
        });
    }

    // Private Server model selection popup
    window.showPrivateServerModelPopup = async function() {
        // Ensure status is loaded first to get remaining days
        await window.checkPrivateServerStatus();
        
        const models = window.PRIVATE_SERVER_MODELS || {};
        const currentModel = localStorage.getItem('private_server_model') || 'nanobanana';
        
        const isDark = document.body.classList.contains('theme-dark');
        
        const modelColors = {
            'nanobanana': 'green',
            'nanobanana2': 'purple',
            'grok': 'red',
            'seedream': 'rose',
            'qwen': 'orange',
            'flux2dev': 'teal'
        };
        
        const modelDescs = {
            'nanobanana': 'Model yang digunakan di semua fitur Sulap Foto, akurasi wajah 90%, cocok untuk kecepatan generate, bisa foto bayi, anak, dan artis',
            'nanobanana2': 'Model terbaru, akurasi wajah 99% dan text anti typo, cocok untuk infografis, support Boost Mode, tidak bisa foto bayi, anak, dan artis',
            'grok': 'Model premium dengan akurasi tinggi dan kecepatan generate, aspect rasio mengikuti foto referensi',
            'seedream': 'Model terbaik dari ByteDance dengan kelebihan konsistensi wajah yang tinggi hingga 99%, Hasil 4K Ultra HD tanpa perlu upscale',
            'qwen': 'Model AI dari Alibaba dengan render sangat akurat, cocok untuk infografis dan poster. Hanya support rasio 16:9',
            'flux2dev': 'Foto sinematik premium dengan detail wajah tajam, pencahayaan natural, dan akurasi warna tinggi. Terbaik untuk portrait, lifestyle, dan produk.'
        };

        const colorBgLight = {
            'green': '#f0fdf4',
            'blue': '#eff6ff',
            'purple': '#faf5ff',
            'orange': '#fff7ed',
            'red': '#fef2f2',
            'teal': '#f0fdfa',
            'rose': '#fff1f2',
            'indigo': '#eef2ff',
            'slate': '#f8fafc'
        };
        
        const colorBgDark = {
            'green': 'rgba(22, 163, 74, 0.15)',
            'blue': 'rgba(59, 130, 246, 0.15)',
            'purple': 'rgba(168, 85, 247, 0.15)',
            'orange': 'rgba(249, 115, 22, 0.15)',
            'red': 'rgba(239, 68, 68, 0.15)',
            'teal': 'rgba(20, 184, 166, 0.15)',
            'rose': 'rgba(244, 63, 94, 0.15)',
            'indigo': 'rgba(99, 102, 241, 0.15)',
            'slate': 'rgba(148, 163, 184, 0.15)'
        };
        
        const colorBorderLight = {
            'green': '#bbf7d0',
            'blue': '#bfdbfe',
            'purple': '#e9d5ff',
            'orange': '#fed7aa',
            'red': '#fecaca',
            'teal': '#99f6e4',
            'rose': '#fecdd3',
            'indigo': '#c7d2fe',
            'slate': '#e2e8f0'
        };
        
        const colorBorderDark = {
            'green': '#14532d',
            'blue': '#1e3a8a',
            'purple': '#581c87',
            'orange': '#7c2d12',
            'red': '#7f1d1d',
            'teal': '#134e4a',
            'rose': '#881337',
            'indigo': '#312e81',
            'slate': '#475569'
        };

        let modelListHtml = '';
        for (const [key, info] of Object.entries(models)) {
            const color = modelColors[key] || 'slate';
            const isSelected = key === currentModel && !info.disabled;
            const isComingSoon = !info.endpoint;
            const isDisabled = info.disabled === true;
            const desc = modelDescs[key] || '';
            
            // Use green color for all cards like Nano Banana
            const greenBgLight = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
            const greenBgDark = 'rgba(22, 163, 74, 0.15)';
            const greenBorderLight = '#bbf7d0';
            const greenBorderDark = '#14532d';
            
            const bgColor = isSelected 
                ? (isDark ? greenBgDark : greenBgLight)
                : (isDark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff');
            const borderColor = isSelected
                ? (isDark ? greenBorderDark : greenBorderLight)
                : (isDark ? '#334155' : '#e2e8f0');
            const textColor = isDark ? '#f1f5f9' : '#1e293b';
            const descColor = isDark ? '#94a3b8' : '#64748b';
            const hoverBg = isDark ? 'rgba(51, 65, 85, 0.5)' : '#f8fafc';
            
            modelListHtml += `
                <div class="ps-model-option" 
                     style="border-radius: 12px; border: 2px solid ${borderColor}; background: ${bgColor}; padding: 12px; transition: all 0.2s; cursor: ${(isComingSoon || isDisabled) ? 'not-allowed' : 'pointer'}; opacity: ${(isComingSoon || isDisabled) ? '0.5' : '1'};"
                     data-model="${key}" 
                     data-hover-bg="${hoverBg}"
                     ${(isComingSoon || isDisabled) ? 'data-disabled="true"' : ''}
                     onmouseover="if(!this.dataset.disabled) this.style.background='${hoverBg}'"
                     onmouseout="this.style.background='${bgColor}'">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #22c55e; flex-shrink: 0;"></span>
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <span style="font-weight: 700; font-size: 13px; color: ${textColor};">${info.label}</span>
                                ${(key === 'nanobanana' || key === 'nanobanana2' || key === 'seedream') && !isComingSoon && !isDisabled ? `<span style="font-size: 8px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #1e293b;">BOOST</span>` : ''}

                ${key === 'seedream' && !isComingSoon && !isDisabled ? `<span style="font-size: 8px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: #ffffff;">4K</span>` : ''}
                                ${key === 'grok' && isComingSoon ? `<span style="font-size: 9px; background: ${isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'}; color: ${isDark ? '#fca5a5' : '#dc2626'}; padding: 2px 6px; border-radius: 10px; font-weight: 700;">Offline</span>` : ''}
                                ${isDisabled ? `<span onclick="window._psRemoveMaintenance('${key}'); event.stopPropagation();" style="font-size: 9px; background: ${isDark ? 'rgba(148, 163, 184, 0.2)' : '#f1f5f9'}; color: ${isDark ? '#94a3b8' : '#64748b'}; padding: 2px 6px; border-radius: 10px; font-weight: 700; cursor: pointer;" title="Klik untuk hapus maintenance">Maintenance ×</span>` : ''}
                                ${key !== 'grok' && isComingSoon && !isDisabled ? `<span style="font-size: 9px; background: ${isDark ? 'rgba(148, 163, 184, 0.2)' : '#f1f5f9'}; color: ${isDark ? '#94a3b8' : '#64748b'}; padding: 2px 6px; border-radius: 10px; font-weight: 700;">Maintenance</span>` : ''}
                                ${isSelected && !isComingSoon && !isDisabled ? `<svg style="width: 16px; height: 16px; color: #22c55e;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ''}
                            </div>
                            <div style="font-size: 11px; color: ${descColor}; line-height: 1.4;">${desc}</div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (typeof window.showModernPopup === 'function') {
            const isDark = document.body.classList.contains('theme-dark');
            
            // Custom title with "Sisa masa aktif" info
            const customTitle = `
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <span style="color: white;">Pilih Model AI</span>
                    ${(window._psExpiresAt && window._psExpiresAt > 0 && window._psRemainingDays > 0) ? `
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="font-size: 11px; font-weight: 600; color: white;">Sisa masa aktif: ${window._psRemainingDays} hari</span>
                        </div>
                    ` : ''}
                </div>
            `;
            
            window.showModernPopup({
                title: customTitle,
                message: `
                    <div style="display: flex; flex-direction: column; gap: 14px;">
                        <div style="display: flex; flex-direction: column; gap: 10px;" class="ps-model-list">
                            ${modelListHtml}
                        </div>
                        <div style="font-size: 11px; color: ${isDark ? '#64748b' : '#94a3b8'}; margin-top: 4px; padding-top: 12px; border-top: 1px solid ${isDark ? '#334155' : '#e2e8f0'};" id="ps-active-model-label">
                            Model aktif saat ini: <span style="font-weight: 700; color: ${isDark ? '#cbd5e1' : '#475569'};" id="ps-active-model-name">${models[currentModel]?.label || 'Nano Banana'}</span>
                        </div>
                        <div style="border-radius: 10px; background: ${isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(219, 234, 254, 0.8)'}; border: 1px solid ${isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(147, 197, 253, 0.5)'}; padding: 10px 12px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                                <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${isDark ? '#93c5fd' : '#2563eb'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <circle cx="12" cy="12" r="6"></circle>
                                        <circle cx="12" cy="12" r="2"></circle>
                                    </svg>
                                    <span style="font-size: 11px; font-weight: 600; color: ${isDark ? '#93c5fd' : '#2563eb'};">Tampilkan Menu Melayang</span>
                                </div>
                                <label style="position: relative; display: inline-block; width: 40px; height: 22px; cursor: pointer;">
                                    <input type="checkbox" id="ps-floating-toggle" style="opacity: 0; width: 0; height: 0;" ${localStorage.getItem('ps_floating_enabled') === 'true' ? 'checked' : ''}>
                                    <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${isDark ? '#334155' : '#cbd5e1'}; transition: 0.3s; border-radius: 22px;"></span>
                                    <span style="position: absolute; content: ''; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: 0.3s; border-radius: 50%;"></span>
                                </label>
                            </div>
                        </div>
                        <div style="border-radius: 10px; background: ${isDark ? 'rgba(220, 38, 38, 0.1)' : 'rgba(254, 226, 226, 0.8)'}; border: 1px solid ${isDark ? 'rgba(220, 38, 38, 0.25)' : 'rgba(252, 165, 165, 0.5)'}; padding: 10px 12px;">
                            <div style="display: flex; align-items: start; gap: 8px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${isDark ? '#fca5a5' : '#dc2626'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 1px;">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="16" x2="12" y2="12"></line>
                                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                                <div style="flex: 1;">
                                    <p style="font-size: 11px; font-weight: 700; color: ${isDark ? '#fca5a5' : '#dc2626'}; margin: 0 0 4px 0;">Batasan Private Server</p>
                                    <p style="font-size: 10px; color: ${isDark ? '#fca5a5' : '#991b1b'}; margin: 0; line-height: 1.4;">Semua model private server (kecuali nano banana 1 &amp; seedream 4.5) hanya dapat menghasilkan <strong>1 gambar per generate</strong> untuk kestabilan server dan hasil maksimal.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                actionText: 'Tutup',
                customHeaderClass: 'ps-model-popup-header',
                customBtnClass: 'ps-model-popup-btn'
            });

            // Attach click handlers after popup renders
            setTimeout(() => {
                const isDarkMode = document.body.classList.contains('theme-dark');
                
                // Handle floating toggle
                const floatingToggle = document.getElementById('ps-floating-toggle');
                if (floatingToggle) {
                    // Update toggle visual state
                    const updateToggleVisual = (checked) => {
                        const slider = floatingToggle.nextElementSibling;
                        const knob = slider?.nextElementSibling;
                        if (slider) {
                            slider.style.backgroundColor = checked ? '#22c55e' : (isDarkMode ? '#334155' : '#cbd5e1');
                        }
                        if (knob) {
                            knob.style.transform = checked ? 'translateX(18px)' : 'translateX(0)';
                        }
                    };
                    
                    updateToggleVisual(floatingToggle.checked);
                    
                    floatingToggle.addEventListener('change', (e) => {
                        const isEnabled = e.target.checked;
                        localStorage.setItem('ps_floating_enabled', isEnabled);
                        updateToggleVisual(isEnabled);
                        
                        if (isEnabled) {
                            window.showPsFloatingButton();
                        } else {
                            window.hidePsFloatingButton();
                        }
                    });
                }
                
                document.querySelectorAll('.ps-model-option').forEach(el => {
                    el.addEventListener('click', () => {
                        if (el.dataset.disabled === 'true') return;
                        const modelKey = el.dataset.model;
                        localStorage.setItem('private_server_model', modelKey);
                        // Dispatch custom event for same-tab listeners (storage event only fires cross-tab)
                        window.dispatchEvent(new CustomEvent('privateServerModelChanged', { detail: { model: modelKey } }));
                        
                        // Update visual selection - reset all cards
                        document.querySelectorAll('.ps-model-option').forEach(opt => {
                            const optModel = opt.dataset.model;
                            const optColor = modelColors[optModel] || 'slate';
                            const defaultBg = isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#ffffff';
                            const defaultBorder = isDarkMode ? '#334155' : '#e2e8f0';
                            
                            opt.style.background = defaultBg;
                            opt.style.borderColor = defaultBorder;
                            opt.dataset.hoverBg = isDarkMode ? 'rgba(51, 65, 85, 0.5)' : '#f8fafc';
                            
                            // Remove checkmark if exists
                            const existingSvg = opt.querySelector('svg');
                            if (existingSvg) existingSvg.remove();
                        });
                        
                        // Highlight selected card with green color
                        const greenBgLight = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
                        const greenBgDark = 'rgba(22, 163, 74, 0.15)';
                        const greenBorderLight = '#bbf7d0';
                        const greenBorderDark = '#14532d';
                        const selectedBg = isDarkMode ? greenBgDark : greenBgLight;
                        const selectedBorder = isDarkMode ? greenBorderDark : greenBorderLight;
                        
                        el.style.background = selectedBg;
                        el.style.borderColor = selectedBorder;
                        el.dataset.hoverBg = selectedBg;
                        
                        // Add checkmark to selected
                        const titleDiv = el.querySelector('div > div > div');
                        if (titleDiv && !el.querySelector('svg')) {
                            titleDiv.insertAdjacentHTML('beforeend', `<svg style="width: 16px; height: 16px; color: #22c55e;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`);
                        }
                        
                        // Update active model text in footer
                        const footerText = document.getElementById('ps-active-model-name');
                        if (footerText) footerText.textContent = models[modelKey]?.label || modelKey;

                        if (window.showServerToast) {
                            window.showServerToast(`Model diubah ke ${models[modelKey]?.label || modelKey}`, null, {
                                icon: '<svg class="text-indigo-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
                            });
                        }
                        
                        // Update sliders after model change
                        if (typeof window.updateAllResultCountSliders === 'function') {
                            window.updateAllResultCountSliders();
                        }
                    });
                });
            }, 200);
        }
    };

    // Remove maintenance (disabled) flag for a private server model and reopen popup
    window._psRemoveMaintenance = function(key) {
        if (window.PRIVATE_SERVER_MODELS && window.PRIVATE_SERVER_MODELS[key]) {
            delete window.PRIVATE_SERVER_MODELS[key].disabled;
        }
        const backdrop = document.getElementById('sf-popup-backdrop');
        if (backdrop) {
            backdrop.classList.remove('active');
            setTimeout(() => {
                backdrop.remove();
                document.body.style.overflow = '';
                if (typeof window.showPrivateServerModelPopup === 'function') {
                    window.showPrivateServerModelPopup();
                }
            }, 200);
        }
    };

    // Function to check Private Server status
    window.checkPrivateServerStatus = async function() {
        const email = localStorage.getItem('sulapfoto_verified_email');
        const sidebarBtn = document.getElementById('tab-private-server');
        if (!email) {
            if (sidebarBtn) sidebarBtn.classList.add('hidden');
            return;
        }

        try {
            const result = await window.getAddonStatus(email, 'private_server');
            if (!result.success) return;

            const btn = document.getElementById('addons-privateserver-btn');
            const status = document.getElementById('addons-privateserver-status');
            const price = document.getElementById('addons-privateserver-price');

            // Store remaining days globally for popup use
            window._psRemainingDays = result.remaining_days || 0;
            window._psExpiresAt = result.expires_at || 0;
            
            if (result.is_active) {
                if (sidebarBtn) {
                    sidebarBtn.classList.remove('hidden');
                    sidebarBtn.onclick = function() {
                        window.showPrivateServerModelPopup();
                    };
                }
                if (status) {
                    const days = result.remaining_days || 0;
                    const expiresAt = result.expires_at || 0;
                    if (expiresAt > 0 && days > 0) {
                        status.textContent = `Aktif - ${days} hari tersisa`;
                        if (days <= 3) {
                            status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700';
                        } else if (days <= 7) {
                            status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700';
                        } else {
                            status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700';
                        }
                    } else {
                        status.textContent = 'Sudah Dibeli';
                        status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700';
                    }
                }
                if (price) price.style.display = 'none';
                if (btn) {
                    btn.textContent = 'Pilih Model';
                    btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-amber-700 text-white hover:bg-amber-800 transition-all';
                    btn.onclick = function() {
                        window.showPrivateServerModelPopup();
                    };
                }
            } else {
                if (sidebarBtn) sidebarBtn.classList.add('hidden');
                // Clear any stored model if addon not active
                localStorage.removeItem('private_server_model');
                
                // Check if previously purchased but expired
                const wasExpired = result.expires_at && result.expires_at > 0 && result.purchased_at > 0;
                
                if (status) {
                    if (wasExpired) {
                        status.textContent = 'Berakhir';
                        status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700';
                    } else {
                        status.textContent = 'Baru';
                        status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700';
                    }
                }
                if (price) price.style.display = '';
                if (btn) {
                    btn.textContent = wasExpired ? 'Perpanjang' : 'Beli Sekarang';
                    btn.className = wasExpired 
                        ? 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-red-600 text-white hover:bg-red-700 transition-all'
                        : 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-amber-600 text-white hover:bg-amber-700 transition-all';
                    btn.onclick = function() {
                        if (window.buyAddon) {
                            window.buyAddon('private_server', 0, 'Private Server');
                        }
                    };
                }
            }
        } catch (e) {
            console.error('Failed to check Private Server status', e);
        }
    };

    // Floating button for Private Server model selection
    window.showPsFloatingButton = function() {
        // Remove existing button if any
        window.hidePsFloatingButton();
        
        const isDark = document.body.classList.contains('theme-dark');
        
        const floatingBtn = document.createElement('div');
        floatingBtn.id = 'ps-floating-button';
        floatingBtn.style.cssText = `
            position: fixed;
            top: 50%;
            right: 20px;
            transform: translateY(-50%);
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.8) 100%);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            box-shadow: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: move;
            z-index: 9999;
            transition: transform 0.2s, box-shadow 0.2s;
            user-select: none;
            touch-action: none;
        `;
        
        floatingBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                <line x1="6" y1="6" x2="6.01" y2="6"></line>
                <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
        `;
        
        document.body.appendChild(floatingBtn);
        
        // Hover effect
        floatingBtn.addEventListener('mouseenter', () => {
            floatingBtn.style.transform = 'translateY(-50%) scale(1.1)';
            floatingBtn.style.boxShadow = 'none';
        });
        
        floatingBtn.addEventListener('mouseleave', () => {
            floatingBtn.style.transform = 'translateY(-50%) scale(1)';
            floatingBtn.style.boxShadow = 'none';
        });
        
        // Draggable functionality
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        let hasMoved = false;
        let wasCentered = true;
        
        const onStart = (e) => {
            isDragging = true;
            hasMoved = false;
            
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
            
            startX = clientX;
            startY = clientY;
            
            const rect = floatingBtn.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            
            // Check if button is still centered (has top: 50%)
            wasCentered = floatingBtn.style.top === '50%';
            
            floatingBtn.style.transition = 'none';
            e.preventDefault();
        };
        
        const onMove = (e) => {
            if (!isDragging) return;
            
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
            
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;
            
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                hasMoved = true;
                
                const newLeft = startLeft + deltaX;
                const newTop = startTop + deltaY;
                
                // Constrain to viewport
                const maxLeft = window.innerWidth - floatingBtn.offsetWidth;
                const maxTop = window.innerHeight - floatingBtn.offsetHeight;
                
                floatingBtn.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
                floatingBtn.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
                floatingBtn.style.right = 'auto';
                floatingBtn.style.bottom = 'auto';
                floatingBtn.style.transform = 'none';
            }
            
            e.preventDefault();
        };
        
        const onEnd = (e) => {
            if (!isDragging) return;
            isDragging = false;
            
            // Restore transform if button wasn't moved
            if (!hasMoved && wasCentered) {
                floatingBtn.style.transform = 'translateY(-50%)';
            }
            
            floatingBtn.style.transition = 'transform 0.2s, box-shadow 0.2s';
            
            // If not moved, treat as click
            if (!hasMoved) {
                if (window.showPrivateServerModelPopup) {
                    window.showPrivateServerModelPopup();
                }
            }
            
            e.preventDefault();
        };
        
        // Mouse events
        floatingBtn.addEventListener('mousedown', onStart);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        
        // Touch events
        floatingBtn.addEventListener('touchstart', onStart, { passive: false });
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd, { passive: false });
        
        // Store cleanup function
        floatingBtn._cleanup = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        };
    };
    
    window.hidePsFloatingButton = function() {
        const existingBtn = document.getElementById('ps-floating-button');
        if (existingBtn) {
            if (existingBtn._cleanup) {
                existingBtn._cleanup();
            }
            existingBtn.remove();
        }
    };
    
    // Initialize floating button if enabled
    window.initPsFloatingButton = async function() {
        const email = localStorage.getItem('sulapfoto_verified_email');
        if (!email) return;
        
        try {
            const result = await window.getAddonStatus(email, 'private_server');
            if (result.success && result.is_active) {
                const isEnabled = localStorage.getItem('ps_floating_enabled') === 'true';
                if (isEnabled) {
                    window.showPsFloatingButton();
                }
            }
        } catch (e) {
            console.error('Failed to init floating button', e);
        }
    };

    window.checkStoryboardStatus = async function () {
        const email = localStorage.getItem('sulapfoto_verified_email');
        const sidebarBtn = document.getElementById('tab-storyboard');
        if (!email) {
            if (sidebarBtn) sidebarBtn.classList.add('hidden');
            return;
        }

        try {
            const result = await window.getAddonStatus(email, 'storyboard');
            if (!result.success) return;

            const btn = document.getElementById('addons-storyboard-btn');
            const status = document.getElementById('addons-storyboard-status');
            const price = document.getElementById('addons-storyboard-price');

            if (result.is_active) {
                if (sidebarBtn) sidebarBtn.classList.remove('hidden');
                if (status) {
                    status.textContent = 'Sudah Dibeli';
                    status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700';
                }
                if (price) price.style.display = 'none';
                if (btn) {
                    btn.textContent = 'Buka';
                    btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-violet-600 text-white hover:bg-violet-700 transition-all';
                    btn.onclick = function () {
                        if (typeof window.switchTab === 'function') {
                            window.switchTab('storyboard');
                        }
                    };
                }
                // Refresh storyboard UI if visible
                if (typeof window.initStoryboard === 'function') window.initStoryboard();
            } else {
                if (sidebarBtn) sidebarBtn.classList.add('hidden');
                if (status) {
                    status.textContent = 'Baru';
                    status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-700';
                }
                if (price) price.style.display = '';
                if (btn) {
                    btn.textContent = 'Beli Sekarang';
                    btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-violet-500 text-white hover:bg-violet-600 transition-all';
                    btn.onclick = function () {
                        if (window.showAddonBuyConfirm) {
                            window.showAddonBuyConfirm('storyboard', 15000, 'Storyboard AI');
                            return;
                        }
                        if (window.buyAddon) window.buyAddon('storyboard', 15000, 'Storyboard AI');
                    };
                }
            }
        } catch (e) {
            console.error('Failed to check Storyboard status', e);
        }
    };

    window.checkMenuRestoranStatus = async function () {
        const email = localStorage.getItem('sulapfoto_verified_email');
        const sidebarBtn = document.getElementById('tab-menu-restoran');
        if (!email) {
            if (sidebarBtn) sidebarBtn.classList.add('hidden');
            return;
        }
        try {
            const result = await window.getAddonStatus(email, 'menu_restoran');
            if (!result.success) return;
            const btn    = document.getElementById('addons-menurestoran-btn');
            const status = document.getElementById('addons-menurestoran-status');
            const price  = document.getElementById('addons-menurestoran-price');
            if (result.is_active) {
                if (sidebarBtn) sidebarBtn.classList.remove('hidden');
                if (status) { status.textContent = 'Sudah Dibeli'; status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700'; }
                if (price) price.style.display = 'none';
                if (btn) { btn.textContent = 'Buka'; btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-amber-600 text-white hover:bg-amber-700 transition-all'; btn.onclick = () => { if (typeof window.switchTab === 'function') window.switchTab('menu-restoran'); }; }
            } else {
                if (sidebarBtn) sidebarBtn.classList.add('hidden');
                if (status) { status.textContent = 'Baru'; status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700'; }
                if (price) price.style.display = '';
                if (btn) { btn.textContent = 'Beli Sekarang'; btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-amber-500 text-white hover:bg-amber-600 transition-all'; btn.onclick = () => { if (window.showAddonBuyConfirm) { window.showAddonBuyConfirm('menu_restoran', 20000, 'Menu Restoran'); return; } if (window.buyAddon) window.buyAddon('menu_restoran', 20000, 'Menu Restoran'); }; }
            }
        } catch (e) {
            console.error('Failed to check Menu Restoran status', e);
        }
    };

    window.checkBatikTenunStatus = async function () {
        const email = localStorage.getItem('sulapfoto_verified_email');
        const sidebarBtn = document.getElementById('tab-batik-tenun');
        if (!email) {
            if (sidebarBtn) sidebarBtn.classList.add('hidden');
            return;
        }
        try {
            const result = await window.getAddonStatus(email, 'batik_tenun');
            if (!result.success) return;
            const btn    = document.getElementById('addons-batiktenun-btn');
            const status = document.getElementById('addons-batiktenun-status');
            const price  = document.getElementById('addons-batiktenun-price');
            if (result.is_active) {
                if (sidebarBtn) sidebarBtn.classList.remove('hidden');
                if (status) { status.textContent = 'Sudah Dibeli'; status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700'; }
                if (price) price.style.display = 'none';
                if (btn) { btn.textContent = 'Buka'; btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-rose-600 text-white hover:bg-rose-700 transition-all'; btn.onclick = () => { if (typeof window.switchTab === 'function') window.switchTab('batik-tenun'); }; }
            } else {
                if (sidebarBtn) sidebarBtn.classList.add('hidden');
                if (status) { status.textContent = 'Baru'; status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700'; }
                if (price) price.style.display = '';
                if (btn) { btn.textContent = 'Beli Sekarang'; btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-rose-500 text-white hover:bg-rose-600 transition-all'; btn.onclick = () => { if (window.showAddonBuyConfirm) { window.showAddonBuyConfirm('batik_tenun', 20000, 'Batik & Tenun'); return; } if (window.buyAddon) window.buyAddon('batik_tenun', 20000, 'Batik & Tenun'); }; }
            }
        } catch (e) {
            console.error('Failed to check Batik & Tenun status', e);
        }
    };

    window.checkFotoEraSejarahStatus = async function () {
        const email = localStorage.getItem('sulapfoto_verified_email');
        const sidebarBtn = document.getElementById('tab-foto-era-sejarah');
        if (!email) {
            if (sidebarBtn) sidebarBtn.classList.add('hidden');
            return;
        }
        try {
            const result = await window.getAddonStatus(email, 'foto_era_sejarah');
            if (!result.success) return;
            const btn    = document.getElementById('addons-fotoerasej-btn');
            const status = document.getElementById('addons-fotoerasej-status');
            const price  = document.getElementById('addons-fotoerasej-price');
            if (result.is_active) {
                if (sidebarBtn) sidebarBtn.classList.remove('hidden');
                if (status) { status.textContent = 'Sudah Dibeli'; status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700'; }
                if (price) price.style.display = 'none';
                if (btn) { btn.textContent = 'Buka'; btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-amber-800 text-white hover:bg-amber-900 transition-all'; btn.onclick = () => { if (typeof window.switchTab === 'function') window.switchTab('foto-era-sejarah'); }; }
            } else {
                if (sidebarBtn) sidebarBtn.classList.add('hidden');
                if (price) price.style.display = '';
                // Check for pending payment
                try {
                    const pendingRes = await fetch('/server/addons_payment.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'check_pending', email })
                    });
                    const pendingData = await pendingRes.json();
                    if (pendingData.success && pendingData.has_pending && pendingData.transaction.addon_key === 'foto_era_sejarah') {
                        if (status) { status.textContent = 'Pending'; status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700'; }
                        if (btn) { btn.textContent = 'Lanjutkan Bayar'; btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-yellow-500 text-white hover:bg-yellow-600 transition-all'; btn.onclick = () => { if (window.buyAddon) window.buyAddon('foto_era_sejarah', 7000, 'Foto Era Sejarah'); }; }
                        return;
                    }
                } catch (_) {}
                if (status) { status.textContent = 'Baru'; status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800'; }
                if (btn) { btn.textContent = 'Beli Sekarang'; btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-amber-700 text-white hover:bg-amber-800 transition-all'; btn.onclick = () => { if (window.showAddonBuyConfirm) { window.showAddonBuyConfirm('foto_era_sejarah', 7000, 'Foto Era Sejarah'); return; } if (window.buyAddon) window.buyAddon('foto_era_sejarah', 7000, 'Foto Era Sejarah'); }; }
            }
        } catch (e) {
            console.error('Failed to check Foto Era Sejarah status', e);
        }
    };

    window.checkFotoZodiakStatus = async function () {
        const email = localStorage.getItem('sulapfoto_verified_email');
        const sidebarBtn = document.getElementById('tab-foto-zodiak');
        if (!email) {
            if (sidebarBtn) sidebarBtn.classList.add('hidden');
            return;
        }
        try {
            const result = await window.getAddonStatus(email, 'foto_zodiak');
            if (!result.success) return;
            const btn    = document.getElementById('addons-fotozodiak-btn');
            const status = document.getElementById('addons-fotozodiak-status');
            const price  = document.getElementById('addons-fotozodiak-price');
            if (result.is_active) {
                if (sidebarBtn) sidebarBtn.classList.remove('hidden');
                if (status) { status.textContent = 'Sudah Dibeli'; status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700'; }
                if (price) price.style.display = 'none';
                if (btn) { btn.textContent = 'Buka'; btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all'; btn.onclick = () => { if (typeof window.switchTab === 'function') window.switchTab('foto-zodiak'); }; }
            } else {
                if (sidebarBtn) sidebarBtn.classList.add('hidden');
                if (price) price.style.display = '';
                // Check for pending payment
                try {
                    const pendingRes = await fetch('/server/addons_payment.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'check_pending', email })
                    });
                    const pendingData = await pendingRes.json();
                    if (pendingData.success && pendingData.has_pending && pendingData.transaction.addon_key === 'foto_zodiak') {
                        if (status) { status.textContent = 'Pending'; status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700'; }
                        if (btn) { btn.textContent = 'Lanjutkan Bayar'; btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-yellow-500 text-white hover:bg-yellow-600 transition-all'; btn.onclick = () => { if (window.buyAddon) window.buyAddon('foto_zodiak', 10000, 'Foto Zodiak'); }; }
                        return;
                    }
                } catch (_) {}
                if (status) { status.textContent = 'Baru'; status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700'; }
                if (btn) { btn.textContent = 'Beli Sekarang'; btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-indigo-500 text-white hover:bg-indigo-600 transition-all'; btn.onclick = () => { if (window.showAddonBuyConfirm) { window.showAddonBuyConfirm('foto_zodiak', 10000, 'Foto Zodiak'); return; } if (window.buyAddon) window.buyAddon('foto_zodiak', 10000, 'Foto Zodiak'); }; }
            }
        } catch (e) {
            console.error('Failed to check Foto Zodiak status', e);
        }
    };

    window.checkLightingShadowsStatus = async function () {
        const email = localStorage.getItem('sulapfoto_verified_email');
        const sidebarBtn = document.getElementById('tab-lighting-shadows');
        if (!email) {
            if (sidebarBtn) sidebarBtn.classList.add('hidden');
            return;
        }

        try {
            const result = await window.getAddonStatus(email, 'lighting_shadows');
            if (!result.success) return;

            const btn = document.getElementById('addons-lightshadw-btn');
            const status = document.getElementById('addons-lightshadw-status');
            const price = document.getElementById('addons-lightshadw-price');

            if (result.is_active) {
                if (sidebarBtn) sidebarBtn.classList.remove('hidden');
                if (status) {
                    status.textContent = 'Sudah Dibeli';
                    status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700';
                }
                if (price) price.style.display = 'none';
                if (btn) {
                    btn.textContent = 'Buka';
                    btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-amber-600 text-white hover:bg-amber-700 transition-all';
                    btn.onclick = function () {
                        if (typeof window.switchTab === 'function') {
                            window.switchTab('lighting-shadows');
                        }
                    };
                }
            } else {
                if (sidebarBtn) sidebarBtn.classList.add('hidden');
                if (status) {
                    status.textContent = 'Baru';
                    status.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700';
                }
                if (price) price.style.display = '';
                if (btn) {
                    btn.textContent = 'Beli Sekarang';
                    btn.className = 'px-4 py-2.5 rounded-xl font-semibold text-sm bg-amber-500 text-white hover:bg-amber-600 transition-all';
                    btn.onclick = function () {
                        if (window.showAddonBuyConfirm) {
                            window.showAddonBuyConfirm('lighting_shadows', 10000, 'Light & Shadw');
                            return;
                        }
                        if (window.buyAddon) window.buyAddon('lighting_shadows', 10000, 'Light & Shadw');
                    };
                }
            }
        } catch (e) {
            console.error('Failed to check Light & Shadw status', e);
        }
    };

    // Initial check — deferred so config can pre-populate cache first (avoids addons_payment.php on load)
    const _addonsSkeleton = document.getElementById('sidebar-addons-skeleton');
    function _showAddonsSkeleton() {
        if (_addonsSkeleton) _addonsSkeleton.classList.remove('hidden');
    }
    function _hideAddonsSkeleton() {
        if (_addonsSkeleton) _addonsSkeleton.classList.add('hidden');
    }

    function runAllAddonChecks() {
        const checks = Promise.all([
            checkAutoUpscaleStatus(),
            checkGifMakerStatus(),
            checkCompressImagesStatus(),
            checkConvertImagesStatus(),
            checkMyFavoriteStatus(),
            checkVectorSvgStatus(),
            checkSufoGptStatus(),
            checkThemesStatus(),
            checkSuperBookStatus(),
            checkTtsStatus(),
            checkPrivateServerStatus(),
            window.checkStoryboardStatus(),
            window.checkMenuRestoranStatus(),
            window.checkBatikTenunStatus(),
            window.checkLightingShadowsStatus(),
            window.checkFotoEraSejarahStatus(),
            window.checkFotoZodiakStatus(),
        ]);
        checks.finally(_hideAddonsSkeleton);
        return checks;
    }
    window.runAllAddonChecks = runAllAddonChecks;
    // Listen for cache pre-populated from config → run checks once (no HTTP needed)
    let _addonChecksRan = false;
    function _onAddonsReady() {
        if (_addonChecksRan) return;
        _addonChecksRan = true;
        const email = localStorage.getItem('sulapfoto_verified_email');
        if (email) _showAddonsSkeleton();
        runAllAddonChecks();
    }
    document.addEventListener('sulap:addons-ready', _onAddonsReady);
    // Fallback: if config doesn't fire within 5s, run checks anyway (may need HTTP)
    setTimeout(() => { if (!_addonChecksRan) _onAddonsReady(); }, 5000);
    
    // Initialize floating button
    setTimeout(() => {
        window.initPsFloatingButton();
    }, 1000);

    // Popup: Fitur Private Server Required
    window.showUpgradePrivateServerPopup = function () {
        if (typeof window.showModernPopup === 'function') {
            window.showModernPopup({
                title: 'Fitur Private Server',
                message: 'Fitur ini bisa digunakan hanya untuk pengguna <strong>private server</strong>.<br><br>Aktifkan addon <strong>Private Server</strong> untuk menggunakan fitur ini.',
                actionText: 'Buka Addons',
                onAction: () => {
                    if (typeof window.switchTab === 'function') {
                        window.switchTab('addons');
                    } else {
                        const addonsBtn = document.getElementById('tab-addons');
                        if (addonsBtn) addonsBtn.click();
                    }
                }
            });
        }
    };

    // Initial Update
    updateAddonsUI();

    // Listen for custom event from main script
    document.addEventListener('sulap:boost-updated', updateAddonsUI);
    
    // Fallback: Listen for change on toggles directly (for immediate feedback if custom event lags or isn't fired)
    boostToggles.forEach(toggle => {
        toggle.addEventListener('change', updateAddonsUI);
    });
});
