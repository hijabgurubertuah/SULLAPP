(function () {
    function initFotoBawahLaut() {
        const fblImageInput = document.getElementById('fbl-image-input');
        const fblUploadBox = document.getElementById('fbl-upload-box');
        const fblPreview = document.getElementById('fbl-preview');
        const fblPlaceholder = document.getElementById('fbl-placeholder');
        const fblRemoveBtn = document.getElementById('fbl-remove-btn');
        const fblSubjectOptions = document.getElementById('fbl-subject-options');
        const fblLocationOptions = document.getElementById('fbl-location-options');
        const fblMoodOptions = document.getElementById('fbl-mood-options');
        const fblCreatureOptions = document.getElementById('fbl-creature-options');
        const fblRatioOptions = document.getElementById('fbl-ratio-options');
        const fblExtraInput = document.getElementById('fbl-extra-input');
        const fblGenerateBtn = document.getElementById('fbl-generate-btn');
        const fblResultsContainer = document.getElementById('fbl-results-container');
        const fblResultsGrid = document.getElementById('fbl-results-grid');
        const fblResultsPlaceholder = document.getElementById('fbl-results-placeholder');
        const fblClearBtn = document.getElementById('fbl-clear-btn');
        const fblCountSlider = document.getElementById('fbl-count-slider');

        const fblAutoConceptToggle = document.getElementById('fbl-auto-concept');
        const fblOptionsWrapper = document.getElementById('fbl-options-wrapper');

        if (!fblGenerateBtn) return;

        let fblImageData = null;
        let fblAutoConceptOn = false;
        let fblPrivateServerActive = false;

        async function checkFblPrivateServerStatus() {
            const email = localStorage.getItem('sulapfoto_verified_email');
            if (!email) { fblPrivateServerActive = false; return; }
            try {
                const r = window.getAddonStatus ? await window.getAddonStatus(email, 'private_server') : await (await fetch('/server/addons_payment.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_active_addon', email, addon_key: 'private_server' }) })).json();
                fblPrivateServerActive = r.success && r.is_active;
            } catch (e) { fblPrivateServerActive = false; }
        }
        checkFblPrivateServerStatus();

        const optionGroups = [fblSubjectOptions, fblLocationOptions, fblMoodOptions, fblCreatureOptions, fblRatioOptions];
        optionGroups.forEach(group => {
            if (!group) return;
            group.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => {
                    group.querySelectorAll('button').forEach(b => b.classList.remove('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700'));
                    btn.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
                    updateBtn();
                });
            });
        });

        fblRatioOptions?.querySelector('[data-value="4:3"]')?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
        fblMoodOptions?.querySelector('[data-value*="bright sunny tropical"]')?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');

        fblAutoConceptToggle?.addEventListener('change', () => {
            fblAutoConceptOn = fblAutoConceptToggle.checked;
            if (fblOptionsWrapper) {
                fblOptionsWrapper.classList.toggle('opacity-50', fblAutoConceptOn);
                fblOptionsWrapper.classList.toggle('pointer-events-none', fblAutoConceptOn);
            }
            updateBtn();
        });

        function updateBtn() {
            fblGenerateBtn.disabled = fblAutoConceptOn ? !fblImageData : !(fblImageData && fblSubjectOptions?.querySelector('.selected'));
        }

        async function fblGetAutoConceptPrompt() {
            const _chatUrl = (typeof CHAT_URL !== 'undefined' ? CHAT_URL : '') || (GENERATE_URL || '').replace('/generate', '/chat');
            const _apiKey = (typeof API_KEY !== 'undefined' ? API_KEY : '') || '';
            const base64ToBlob = window.base64ToBlob || function (b, m) { const bytes = atob(b); const arr = new Uint8Array(bytes.length); for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i); return new Blob([arr], { type: m }); };
            const fd = new FormData();
            fd.append('images[]', base64ToBlob(fblImageData.base64, fblImageData.mimeType));
            fd.append('prompt', 'Analyze this photo carefully — identify the main subject, their appearance, the setting, and the overall mood. Determine the most visually stunning and immersive underwater world transformation that would look most spectacular and natural for this specific subject and scene. Return ONLY a complete, detailed image generation instruction in English (no explanations, no preamble) describing: the exact underwater environment type, depth and visibility, lighting quality (caustic rays, bioluminescence, etc.), water color and clarity, marine life or coral to include, how the subject integrates naturally into the underwater world, and the overall cinematic mood. Be very specific and vivid. Start directly with the instruction.');
            const resp = await fetch(_chatUrl, { method: 'POST', headers: { 'X-API-Key': _apiKey }, body: fd });
            if (!resp.ok) throw new Error('Gagal menghubungi AI untuk analisa foto.');
            const data = await resp.json();
            return (data.response || data.text || '').trim();
        }

        function autoDetectRatio() {
            if (!fblImageData) return;
            const img = new Image();
            img.onload = function () {
                const r = img.width / img.height;
                const best = r > 1.6 ? '16:9' : r > 1.1 ? '4:3' : r > 0.85 ? '1:1' : r > 0.6 ? '3:4' : '9:16';
                fblRatioOptions?.querySelectorAll('button').forEach(b => b.classList.remove('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700'));
                fblRatioOptions?.querySelector(`[data-value="${best}"]`)?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
            };
            img.src = fblImageData.dataUrl;
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

        function setImage(data) {
            fblImageData = data;
            fblPreview.src = data.dataUrl;
            fblPlaceholder.classList.add('hidden');
            fblPreview.classList.remove('hidden');
            fblRemoveBtn.classList.remove('hidden');
            autoDetectRatio();
            updateBtn();
        }

        function clearImage() {
            fblImageData = null;
            if (fblImageInput) fblImageInput.value = '';
            fblPreview.src = '#';
            fblPreview.classList.add('hidden');
            fblPlaceholder.classList.remove('hidden');
            fblRemoveBtn.classList.add('hidden');
            updateBtn();
        }

        fblImageInput?.addEventListener('change', async (e) => {
            if (e.target.files[0]) setImage(await readFileAsBase64(e.target.files[0]));
        });

        fblUploadBox?.addEventListener('dragover', e => { e.preventDefault(); fblUploadBox.classList.add('border-teal-400'); });
        fblUploadBox?.addEventListener('dragleave', () => fblUploadBox.classList.remove('border-teal-400'));
        fblUploadBox?.addEventListener('drop', async (e) => {
            e.preventDefault();
            fblUploadBox.classList.remove('border-teal-400');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) setImage(await readFileAsBase64(file));
        });

        fblRemoveBtn?.addEventListener('click', (e) => { e.stopPropagation(); clearImage(); });

        fblClearBtn?.addEventListener('click', () => {
            fblResultsGrid.innerHTML = '';
            fblResultsContainer.classList.add('hidden');
            fblResultsPlaceholder.classList.remove('hidden');
        });

        fblGenerateBtn.addEventListener('click', async () => {
            if (!fblImageData) return;
            if (!fblPrivateServerActive) {
                if (typeof window.showUpgradePrivateServerPopup === 'function') window.showUpgradePrivateServerPopup();
                return;
            }

            const ratio = fblRatioOptions?.querySelector('.selected')?.dataset.value || '4:3';
            const originalBtnHTML = fblGenerateBtn.innerHTML;
            fblGenerateBtn.disabled = true;

            let prompt;
            try {
                if (fblAutoConceptOn) {
                    fblGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Menganalisa foto...</span>`;
                    prompt = await fblGetAutoConceptPrompt();
                    if (!prompt) throw new Error('AI tidak menghasilkan konsep. Coba lagi.');
                } else {
                    if (!fblSubjectOptions?.querySelector('.selected')) throw new Error('Pilih Subjek Utama terlebih dahulu.');
                    const subject = fblSubjectOptions?.querySelector('.selected')?.dataset.value || '';
                    const location = fblLocationOptions?.querySelector('.selected')?.dataset.value || 'vibrant tropical coral reef, colorful corals, crystal clear turquoise shallow water, sunlight rays piercing through';
                    const mood = fblMoodOptions?.querySelector('.selected')?.dataset.value || 'bright sunny tropical, warm blue-green water, vibrant colors';
                    const creature = fblCreatureOptions?.querySelector('.selected')?.dataset.value || '';
                    const extra = fblExtraInput?.value.trim();
                    prompt = `Using this reference photo as the base, realistically transform the subject and scene into a breathtaking underwater world.`;
                    prompt += ` Place the subject into a ${location}. Subject: ${subject}.`;
                    prompt += ` Atmosphere: ${mood}.`;
                    prompt += ` The subject from the reference photo must remain clearly identifiable — same face, clothing, expression, and body — but now fully immersed in the underwater environment with authentic visual integration.`;
                    if (creature) prompt += ` Also include: ${creature} naturally present in the scene.`;
                    prompt += ` Include natural underwater effects: caustic light rays filtering from the surface, floating particles, realistic water refraction and distortion, subtle underwater haze, correct color grading shifted toward blue and cyan tones.`;
                    prompt += ` The result must look 100% photorealistic — as if actually photographed underwater with professional diving equipment.`;
                    if (extra) prompt += ` Additional details: ${extra}.`;
                    prompt += ` Ultra-realistic, cinematic underwater photography, National Geographic quality, 8K resolution.`;
                }
            } catch (err) {
                fblGenerateBtn.disabled = false;
                fblGenerateBtn.innerHTML = originalBtnHTML;
                alert(err.message);
                return;
            }

            fblGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Membuat...</span>`;
            fblResultsPlaceholder.classList.add('hidden');
            fblResultsContainer.classList.remove('hidden');

            const resultCount = parseInt(fblCountSlider?.value) || 1;
            const aspectClass = ratio === '9:16' ? 'aspect-[9/16]' : ratio === '16:9' ? 'aspect-video' : ratio === '3:4' ? 'aspect-[3/4]' : ratio === '4:3' ? 'aspect-[4/3]' : 'aspect-square';
            const gridCols = resultCount === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2';
            fblResultsGrid.className = `grid ${gridCols} gap-4 md:gap-6`;
            fblResultsGrid.innerHTML = '';
            const cards = [];
            for (let i = 0; i < resultCount; i++) {
                const c = document.createElement('div');
                c.className = `relative rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center ${aspectClass}`;
                c.innerHTML = `<div class="spinner"></div>`;
                fblResultsGrid.appendChild(c);
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
                    formData.append('images[]', base64ToBlob(fblImageData.base64, fblImageData.mimeType));
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
                            <a href="${imageUrl}" download="foto_bawah_laut.png" class="result-action-btn download-btn" title="Unduh"><i data-lucide="download" class="w-4 h-4"></i></a>
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
                fblGenerateBtn.disabled = false;
                fblGenerateBtn.innerHTML = originalBtnHTML;
                if (window.lucide) window.lucide.createIcons();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFotoBawahLaut);
    } else {
        initFotoBawahLaut();
    }
})();
