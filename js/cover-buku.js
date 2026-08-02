(function () {
    function initCoverBuku() {
        const cbGenreOptions = document.getElementById('cb-genre-options');
        const cbStyleOptions = document.getElementById('cb-style-options');
        const cbMoodOptions = document.getElementById('cb-mood-options');
        const cbColorOptions = document.getElementById('cb-color-options');
        const cbRatioOptions = document.getElementById('cb-ratio-options');
        const cbTitleInput = document.getElementById('cb-title-input');
        const cbAuthorInput = document.getElementById('cb-author-input');
        const cbExtraInput = document.getElementById('cb-extra-input');
        const cbGenerateBtn = document.getElementById('cb-generate-btn');
        const cbGenerateBtnText = document.getElementById('cb-generate-btn-text');
        const cbResultsContainer = document.getElementById('cb-results-container');
        const cbResultsGrid = document.getElementById('cb-results-grid');
        const cbResultsPlaceholder = document.getElementById('cb-results-placeholder');
        const cbClearBtn = document.getElementById('cb-clear-btn');
        const cbCountSlider = document.getElementById('cb-count-slider');

        if (!cbGenerateBtn) return;

        let cbPrivateServerActive = false;
        async function checkCbPrivateServerStatus() {
            const email = localStorage.getItem('sulapfoto_verified_email');
            if (!email) { cbPrivateServerActive = false; return; }
            try {
                const r = window.getAddonStatus ? await window.getAddonStatus(email, 'private_server') : await (await fetch('/server/addons_payment.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_active_addon', email, addon_key: 'private_server' }) })).json();
                cbPrivateServerActive = r.success && r.is_active;
            } catch (e) { cbPrivateServerActive = false; }
        }
        checkCbPrivateServerStatus();

        const optionGroups = [cbGenreOptions, cbStyleOptions, cbMoodOptions, cbColorOptions, cbRatioOptions];
        optionGroups.forEach(group => {
            if (!group) return;
            group.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => {
                    group.querySelectorAll('button').forEach(b => b.classList.remove('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700'));
                    btn.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
                    updateGenerateBtn();
                });
            });
        });

        cbRatioOptions?.querySelector('[data-value="3:4"]')?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');

        cbTitleInput?.addEventListener('input', updateGenerateBtn);

        function updateGenerateBtn() {
            const hasTitle = cbTitleInput?.value.trim().length > 0;
            const hasGenre = cbGenreOptions?.querySelector('.selected');
            cbGenerateBtn.disabled = !(hasTitle && hasGenre);
        }

        if (cbClearBtn) {
            cbClearBtn.addEventListener('click', () => {
                cbResultsGrid.innerHTML = '';
                cbResultsContainer.classList.add('hidden');
                cbResultsPlaceholder.classList.remove('hidden');
            });
        }

        cbGenerateBtn.addEventListener('click', async () => {
            if (!cbPrivateServerActive) {
                if (typeof window.showUpgradePrivateServerPopup === 'function') window.showUpgradePrivateServerPopup();
                return;
            }
            const title = cbTitleInput?.value.trim();
            const author = cbAuthorInput?.value.trim();
            const genre = cbGenreOptions?.querySelector('.selected')?.dataset.value || 'Fiksi';
            const style = cbStyleOptions?.querySelector('.selected')?.dataset.value || 'Ilustrasi Digital, vibrant, painterly';
            const mood = cbMoodOptions?.querySelector('.selected')?.dataset.value || 'epic adventure, dynamic';
            const color = cbColorOptions?.querySelector('.selected')?.dataset.value || '';
            const ratio = cbRatioOptions?.querySelector('.selected')?.dataset.value || '3:4';
            const extra = cbExtraInput?.value.trim();

            let prompt = `Professional book cover design for a "${genre}" book titled "${title}"`;
            if (author) prompt += ` by ${author}`;
            prompt += `. Visual style: ${style}. Mood and atmosphere: ${mood}.`;
            if (color) prompt += ` Dominant color palette: ${color}.`;
            if (extra) prompt += ` Additional visual elements: ${extra}.`;
            prompt += ` The cover must be highly detailed, visually striking, and commercially professional. Include compelling composition with clear focal point. The title "${title}" should be elegantly integrated into the design. Ultra high quality, 8K resolution, masterpiece.`;

            const originalBtnHTML = cbGenerateBtn.innerHTML;
            cbGenerateBtn.disabled = true;
            cbGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Membuat Cover...</span>`;
            cbResultsPlaceholder.classList.add('hidden');
            cbResultsContainer.classList.remove('hidden');

            const resultCount = parseInt(cbCountSlider?.value) || 1;
            const aspectClass = ratio === '9:16' ? 'aspect-[9/16]' : ratio === '16:9' ? 'aspect-video' : ratio === '3:4' ? 'aspect-[3/4]' : ratio === '4:3' ? 'aspect-[4/3]' : 'aspect-square';
            const gridCols = resultCount === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2';
            cbResultsGrid.className = `grid ${gridCols} gap-4 md:gap-6`;
            cbResultsGrid.innerHTML = '';
            const cards = [];
            for (let i = 0; i < resultCount; i++) {
                const c = document.createElement('div');
                c.className = `relative rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center ${aspectClass}`;
                c.innerHTML = `<div class="spinner"></div>`;
                cbResultsGrid.appendChild(c);
                cards.push(c);
            }

            if (window.lucide) window.lucide.createIcons();

            const generateSingle = async (card) => {
                try {
                    const _generateUrl = (typeof GENERATE_URL !== 'undefined' ? GENERATE_URL : '') || '';
                    const _apiKey = (typeof API_KEY !== 'undefined' ? API_KEY : '') || '';
                    const formData = new FormData();
                    formData.append('instruction', prompt);
                    formData.append('aspectRatio', ratio);
                    const response = await fetch(_generateUrl, { method: 'POST', headers: { 'X-API-Key': _apiKey }, body: formData });
                    if (!response.ok) {
                        const errText = await response.text();
                        throw new Error(errText || `HTTP Error ${response.status}`);
                    }
                    const result = await response.json();
                    if (!result.success || !result.imageUrl) throw new Error('Tidak ada gambar yang dihasilkan.');
                    const imageUrl = result.imageUrl;
                    card.innerHTML = `
                        <img src="${imageUrl}" class="w-full h-full object-cover">
                        <div class="absolute bottom-2 right-2 flex gap-1">
                            <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat"><i data-lucide="eye" class="w-4 h-4"></i></button>
                            <a href="${imageUrl}" download="cover_buku.png" class="result-action-btn download-btn" title="Unduh"><i data-lucide="download" class="w-4 h-4"></i></a>
                        </div>`;
                    card.className = `relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full ${aspectClass}`;
                } catch (err) {
                    card.innerHTML = `<div class="text-xs text-red-500 p-4 text-center">${err.message}</div>`;
                    if (window.errorSound) window.errorSound.play();
                }
            };

            try {
                await Promise.all(cards.map(card => generateSingle(card)));
                if (window.doneSound) window.doneSound.play();
            } finally {
                cbGenerateBtn.disabled = false;
                cbGenerateBtn.innerHTML = originalBtnHTML;
                if (window.lucide) window.lucide.createIcons();
            }
        });

        // Lihat Contoh popup
        const cbShowExampleBtn = document.getElementById('cb-show-example-btn');
        if (cbShowExampleBtn) {
            cbShowExampleBtn.addEventListener('click', function () {
                const overlay = document.createElement('div');
                overlay.className = 'fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 opacity-0 transition-opacity duration-300';
                overlay.innerHTML = `
                    <img src="/assets/cover_buku.png" alt="Contoh Hasil Cover Buku" class="max-w-full max-h-full object-contain rounded-2xl shadow-2xl">
                    <button class="cb-close-example absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors backdrop-blur-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                    </button>
                `;
                document.body.appendChild(overlay);
                setTimeout(() => overlay.classList.remove('opacity-0'), 10);
                const closePopup = () => {
                    overlay.classList.add('opacity-0');
                    setTimeout(() => overlay.remove(), 300);
                };
                overlay.querySelector('.cb-close-example').addEventListener('click', (e) => { e.stopPropagation(); closePopup(); });
                overlay.addEventListener('click', closePopup);
                document.addEventListener('keydown', function handleEsc(e) {
                    if (e.key === 'Escape') { closePopup(); document.removeEventListener('keydown', handleEsc); }
                });
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCoverBuku);
    } else {
        initCoverBuku();
    }
})();
