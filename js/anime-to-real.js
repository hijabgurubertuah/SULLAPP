(function () {
    function initAnimeToReal() {
        const atrImageInput = document.getElementById('atr-image-input');
        const atrUploadBox = document.getElementById('atr-upload-box');
        const atrPreview = document.getElementById('atr-preview');
        const atrPlaceholder = document.getElementById('atr-placeholder');
        const atrRemoveBtn = document.getElementById('atr-remove-btn');
        const atrStyleOptions = document.getElementById('atr-style-options');
        const atrGenderOptions = document.getElementById('atr-gender-options');
        const atrAgeOptions = document.getElementById('atr-age-options');
        const atrBgOptions = document.getElementById('atr-bg-options');
        const atrRatioOptions = document.getElementById('atr-ratio-options');
        const atrExtraInput = document.getElementById('atr-extra-input');
        const atrGenerateBtn = document.getElementById('atr-generate-btn');
        const atrGenerateBtnText = document.getElementById('atr-generate-btn-text');
        const atrResultsContainer = document.getElementById('atr-results-container');
        const atrResultsGrid = document.getElementById('atr-results-grid');
        const atrResultsPlaceholder = document.getElementById('atr-results-placeholder');
        const atrClearBtn = document.getElementById('atr-clear-btn');
        const atrCountSlider = document.getElementById('atr-count-slider');
        const atrAutoConceptToggle = document.getElementById('atr-auto-concept');
        const atrOptionsWrapper = document.getElementById('atr-options-wrapper');

        if (!atrGenerateBtn) return;

        let atrImageData = null;
        let atrAutoConceptOn = false;
        let atrPrivateServerActive = false;
        async function checkAtrPrivateServerStatus() {
            const email = localStorage.getItem('sulapfoto_verified_email');
            if (!email) { atrPrivateServerActive = false; return; }
            try {
                const r = window.getAddonStatus ? await window.getAddonStatus(email, 'private_server') : await (await fetch('/server/addons_payment.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_active_addon', email, addon_key: 'private_server' }) })).json();
                atrPrivateServerActive = r.success && r.is_active;
            } catch (e) { atrPrivateServerActive = false; }
        }
        checkAtrPrivateServerStatus();

        atrRatioOptions?.querySelector('[data-value="1:1"]')?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');

        atrAutoConceptToggle?.addEventListener('change', () => {
            atrAutoConceptOn = atrAutoConceptToggle.checked;
            if (atrOptionsWrapper) {
                atrOptionsWrapper.classList.toggle('opacity-50', atrAutoConceptOn);
                atrOptionsWrapper.classList.toggle('pointer-events-none', atrAutoConceptOn);
            }
            updateBtn();
        });

        async function atrGetAutoConceptPrompt() {
            const _chatUrl = (typeof CHAT_URL !== 'undefined' ? CHAT_URL : '') || (GENERATE_URL || '').replace('/generate', '/chat');
            const _apiKey = (typeof API_KEY !== 'undefined' ? API_KEY : '') || '';
            const base64ToBlob = window.base64ToBlob || function (b, m) { const bytes = atob(b); const arr = new Uint8Array(bytes.length); for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i); return new Blob([arr], { type: m }); };
            const fd = new FormData();
            fd.append('images[]', base64ToBlob(atrImageData.base64, atrImageData.mimeType));
            fd.append('prompt', 'Analyze this anime/illustration character image carefully — study the character\'s apparent gender, age, hair color and style, eye color, clothing/costume, expression, and overall aesthetic. Determine the single most photorealistic and stunning real-human conversion approach for this specific character. Return ONLY a complete, detailed image generation instruction in English (no explanations, no preamble) describing: the photography style, the character\'s realistic physical description (hair, eyes, skin, features), clothing, background setting, lighting, and any special details to preserve the character\'s identity while making them look 100% real. Be very specific. Start directly with the instruction.');
            const resp = await fetch(_chatUrl, { method: 'POST', headers: { 'X-API-Key': _apiKey }, body: fd });
            if (!resp.ok) throw new Error('Gagal menghubungi AI untuk analisa foto.');
            const data = await resp.json();
            return (data.response || data.text || '').trim();
        }

        function autoDetectRatio() {
            if (!atrImageData) return;
            const img = new Image();
            img.onload = function () {
                const r = img.width / img.height;
                const best = r > 1.6 ? '16:9' : r > 1.1 ? '4:3' : r > 0.85 ? '1:1' : r > 0.6 ? '3:4' : '9:16';
                atrRatioOptions?.querySelectorAll('button').forEach(b => b.classList.remove('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700'));
                atrRatioOptions?.querySelector(`[data-value="${best}"]`)?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
            };
            img.src = atrImageData.dataUrl;
        }

        const optionGroups = [atrStyleOptions, atrGenderOptions, atrAgeOptions, atrBgOptions, atrRatioOptions];
        optionGroups.forEach(group => {
            if (!group) return;
            group.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => {
                    group.querySelectorAll('button').forEach(b => b.classList.remove('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700'));
                    btn.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
                });
            });
        });

        function updateBtn() {
            atrGenerateBtn.disabled = !atrImageData;
        }

        function setImage(data) {
            atrImageData = data;
            atrPreview.src = data.dataUrl;
            atrPlaceholder.classList.add('hidden');
            atrPreview.classList.remove('hidden');
            atrRemoveBtn.classList.remove('hidden');
            autoDetectRatio();
            updateBtn();
        }

        function clearImage() {
            atrImageData = null;
            atrImageInput.value = '';
            atrPreview.src = '#';
            atrPreview.classList.add('hidden');
            atrPlaceholder.classList.remove('hidden');
            atrRemoveBtn.classList.add('hidden');
            updateBtn();
        }

        async function readFileAsBase64(file) {
            if (window.convertHeicToJpg) file = await window.convertHeicToJpg(file);
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const dataUrl = e.target.result;
                    const [header, base64] = dataUrl.split(',');
                    const mimeType = header.match(/:(.*?);/)[1];
                    resolve({ dataUrl, base64, mimeType, file });
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        atrImageInput?.addEventListener('change', async (e) => {
            if (e.target.files[0]) setImage(await readFileAsBase64(e.target.files[0]));
        });

        atrUploadBox?.addEventListener('dragover', e => { e.preventDefault(); atrUploadBox.classList.add('border-teal-400'); });
        atrUploadBox?.addEventListener('dragleave', () => atrUploadBox.classList.remove('border-teal-400'));
        atrUploadBox?.addEventListener('drop', async (e) => {
            e.preventDefault();
            atrUploadBox.classList.remove('border-teal-400');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) setImage(await readFileAsBase64(file));
        });

        atrRemoveBtn?.addEventListener('click', (e) => { e.stopPropagation(); clearImage(); });

        if (atrClearBtn) {
            atrClearBtn.addEventListener('click', () => {
                atrResultsGrid.innerHTML = '';
                atrResultsContainer.classList.add('hidden');
                atrResultsPlaceholder.classList.remove('hidden');
            });
        }

        atrGenerateBtn.addEventListener('click', async () => {
            if (!atrImageData) return;
            if (!atrPrivateServerActive) {
                if (typeof window.showUpgradePrivateServerPopup === 'function') window.showUpgradePrivateServerPopup();
                return;
            }

            const ratio = atrRatioOptions?.querySelector('.selected')?.dataset.value || '1:1';
            const originalBtnHTML = atrGenerateBtn.innerHTML;
            atrGenerateBtn.disabled = true;

            let prompt;
            try {
                if (atrAutoConceptOn) {
                    atrGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Menganalisa foto...</span>`;
                    prompt = await atrGetAutoConceptPrompt();
                    if (!prompt) throw new Error('AI tidak menghasilkan konsep. Coba lagi.');
                } else {
                    const style = atrStyleOptions?.querySelector('.selected')?.dataset.value || 'ultra-realistic portrait photography, 8K resolution, DSLR quality, professional studio lighting';
                    const gender = atrGenderOptions?.querySelector('.selected')?.dataset.value || 'character, person';
                    const age = atrAgeOptions?.querySelector('.selected')?.dataset.value || 'young adult, 20-28 years old';
                    const bg = atrBgOptions?.querySelector('.selected')?.dataset.value || 'neutral studio background, soft gradient';
                    const extra = atrExtraInput?.value.trim();
                    prompt = `Convert this anime/illustration character into a photorealistic real human. This is an image-to-image transformation task.`;
                    prompt += ` The subject is a ${age} ${gender}.`;
                    prompt += ` Photography style: ${style}.`;
                    prompt += ` Background: ${bg}.`;
                    if (extra) prompt += ` Additional details: ${extra}.`;
                    prompt += ` Maintain the original character's key features, hair color, eye color, clothing style, and expression while making them look completely real. Skin should have realistic pores, texture, and natural imperfections. Eyes must be hyper-realistic with natural reflections. Ultra sharp focus, professional photography, photorealistic masterpiece.`;
                }
            } catch (err) {
                atrGenerateBtn.disabled = false;
                atrGenerateBtn.innerHTML = originalBtnHTML;
                alert(err.message);
                return;
            }

            atrGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Mengubah ke Realistis...</span>`;
            atrResultsPlaceholder.classList.add('hidden');
            atrResultsContainer.classList.remove('hidden');

            const resultCount = parseInt(atrCountSlider?.value) || 1;
            const aspectClass = ratio === '9:16' ? 'aspect-[9/16]' : ratio === '16:9' ? 'aspect-video' : ratio === '3:4' ? 'aspect-[3/4]' : ratio === '4:3' ? 'aspect-[4/3]' : 'aspect-square';
            const gridCols = resultCount === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2';
            atrResultsGrid.className = `grid ${gridCols} gap-4 md:gap-6`;
            atrResultsGrid.innerHTML = '';
            const cards = [];
            for (let i = 0; i < resultCount; i++) {
                const c = document.createElement('div');
                c.className = `relative rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center ${aspectClass}`;
                c.innerHTML = `<div class="spinner"></div>`;
                atrResultsGrid.appendChild(c);
                cards.push(c);
            }

            if (window.lucide) window.lucide.createIcons();

            const generateSingle = async (card) => {
                try {
                    const _generateUrl = (typeof GENERATE_URL !== 'undefined' ? GENERATE_URL : '') || '';
                    const _apiKey = (typeof API_KEY !== 'undefined' ? API_KEY : '') || '';
                    const base64ToBlob = window.base64ToBlob || function (base64, mimeType) {
                        const bytes = atob(base64);
                        const arr = new Uint8Array(bytes.length);
                        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
                        return new Blob([arr], { type: mimeType });
                    };
                    const formData = new FormData();
                    formData.append('images[]', base64ToBlob(atrImageData.base64, atrImageData.mimeType));
                    formData.append('instruction', prompt);
                    formData.append('aspectRatio', ratio);
                    const response = await fetch(_generateUrl, { method: 'POST', headers: { 'X-API-Key': _apiKey }, body: formData });
                    if (!response.ok) throw new Error(await response.text() || `HTTP Error ${response.status}`);
                    const result = await response.json();
                    if (!result.success || !result.imageUrl) throw new Error('Tidak ada gambar yang dihasilkan.');
                    const imageUrl = result.imageUrl;
                    card.innerHTML = `
                        <img src="${imageUrl}" class="w-full h-full object-cover">
                        <div class="absolute bottom-2 right-2 flex gap-1">
                            <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat"><i data-lucide="eye" class="w-4 h-4"></i></button>
                            <a href="${imageUrl}" download="anime_to_real.png" class="result-action-btn download-btn" title="Unduh"><i data-lucide="download" class="w-4 h-4"></i></a>
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
                atrGenerateBtn.disabled = false;
                atrGenerateBtn.innerHTML = originalBtnHTML;
                if (window.lucide) window.lucide.createIcons();
            }
        });

        // Lihat Contoh popup (before/after 2 kolom)
        const atrShowExampleBtn = document.getElementById('atr-show-example-btn');
        if (atrShowExampleBtn) {
            atrShowExampleBtn.addEventListener('click', function () {
                const overlay = document.createElement('div');
                overlay.className = 'fixed inset-0 bg-black/85 z-[9999] flex items-center justify-center p-4 opacity-0 transition-opacity duration-300';
                overlay.innerHTML = `
                    <div class="relative w-full max-w-xl">
                        <button class="atr-close-example absolute -top-11 right-0 bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 transition-colors backdrop-blur-sm z-10">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                        </button>
                        <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
                            <div class="px-5 py-3 border-b border-slate-100 flex items-center justify-center">
                                <span class="text-sm font-bold text-slate-700 tracking-tight">Contoh Hasil — Anime to Real AI</span>
                            </div>
                            <div class="grid grid-cols-2">
                                <div class="flex flex-col">
                                    <div class="bg-slate-100 text-slate-500 text-[11px] font-bold uppercase tracking-widest text-center py-2">Before</div>
                                    <div class="aspect-square overflow-hidden">
                                        <img src="/assets/luffy.webp" alt="Before" class="w-full h-full object-cover">
                                    </div>
                                </div>
                                <div class="flex flex-col border-l border-slate-100">
                                    <div class="bg-teal-500 text-white text-[11px] font-bold uppercase tracking-widest text-center py-2">After</div>
                                    <div class="aspect-square overflow-hidden">
                                        <img src="/assets/anime_to_real.jpg" alt="After" class="w-full h-full object-cover">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(overlay);
                setTimeout(() => overlay.classList.remove('opacity-0'), 10);
                const closePopup = () => {
                    overlay.classList.add('opacity-0');
                    setTimeout(() => overlay.remove(), 300);
                };
                overlay.querySelector('.atr-close-example').addEventListener('click', (e) => { e.stopPropagation(); closePopup(); });
                overlay.addEventListener('click', function (e) {
                    if (e.target === overlay) closePopup();
                });
                document.addEventListener('keydown', function handleEsc(e) {
                    if (e.key === 'Escape') { closePopup(); document.removeEventListener('keydown', handleEsc); }
                });
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAnimeToReal);
    } else {
        initAnimeToReal();
    }
})();
