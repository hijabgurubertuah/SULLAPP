(function () {
    function initGantiCuaca() {
        const gcImageInput = document.getElementById('gc-image-input');
        const gcUploadBox = document.getElementById('gc-upload-box');
        const gcPreview = document.getElementById('gc-preview');
        const gcPlaceholder = document.getElementById('gc-placeholder');
        const gcRemoveBtn = document.getElementById('gc-remove-btn');
        const gcWeatherOptions = document.getElementById('gc-weather-options');
        const gcIntensityOptions = document.getElementById('gc-intensity-options');
        const gcRatioOptions = document.getElementById('gc-ratio-options');
        const gcExtraInput = document.getElementById('gc-extra-input');
        const gcGenerateBtn = document.getElementById('gc-generate-btn');
        const gcResultsContainer = document.getElementById('gc-results-container');
        const gcResultsGrid = document.getElementById('gc-results-grid');
        const gcResultsPlaceholder = document.getElementById('gc-results-placeholder');
        const gcClearBtn = document.getElementById('gc-clear-btn');
        const gcCountSlider = document.getElementById('gc-count-slider');
        const gcAutoConceptToggle = document.getElementById('gc-auto-concept');
        const gcOptionsWrapper = document.getElementById('gc-options-wrapper');

        if (!gcGenerateBtn) return;

        let gcImageData = null;
        let gcAutoConceptOn = false;
        let gcPrivateServerActive = false;

        async function checkGcPrivateServerStatus() {
            const email = localStorage.getItem('sulapfoto_verified_email');
            if (!email) { gcPrivateServerActive = false; return; }
            try {
                const r = window.getAddonStatus ? await window.getAddonStatus(email, 'private_server') : await (await fetch('/server/addons_payment.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_active_addon', email, addon_key: 'private_server' }) })).json();
                gcPrivateServerActive = r.success && r.is_active;
            } catch (e) { gcPrivateServerActive = false; }
        }
        checkGcPrivateServerStatus();

        const optionGroups = [gcWeatherOptions, gcIntensityOptions, gcRatioOptions];
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

        gcRatioOptions?.querySelector('[data-value="4:3"]')?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
        gcIntensityOptions?.querySelector('[data-value="moderate, natural weather effect"]')?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');

        gcAutoConceptToggle?.addEventListener('change', () => {
            gcAutoConceptOn = gcAutoConceptToggle.checked;
            if (gcOptionsWrapper) {
                gcOptionsWrapper.classList.toggle('opacity-50', gcAutoConceptOn);
                gcOptionsWrapper.classList.toggle('pointer-events-none', gcAutoConceptOn);
            }
            updateBtn();
        });

        function updateBtn() {
            gcGenerateBtn.disabled = gcAutoConceptOn ? !gcImageData : !(gcImageData && gcWeatherOptions?.querySelector('.selected'));
        }

        async function gcGetAutoConceptPrompt() {
            const _chatUrl = (typeof CHAT_URL !== 'undefined' ? CHAT_URL : '') || (GENERATE_URL || '').replace('/generate', '/chat');
            const _apiKey = (typeof API_KEY !== 'undefined' ? API_KEY : '') || '';
            const base64ToBlob = window.base64ToBlob || function (b, m) { const bytes = atob(b); const arr = new Uint8Array(bytes.length); for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i); return new Blob([arr], { type: m }); };
            const fd = new FormData();
            fd.append('images[]', base64ToBlob(gcImageData.base64, gcImageData.mimeType));
            fd.append('prompt', 'Analyze this photo carefully — the scene, lighting, time of day, atmosphere, and mood. Then determine the single most dramatic and visually stunning weather transformation that would look most spectacular applied to this specific photo. Return ONLY a complete, detailed image generation instruction in English (no explanations, no preamble) that describes: what weather to apply, its intensity, how it changes the sky/light/atmosphere/reflections/shadows, and any atmospheric special effects. Be very specific and vivid. Start directly with the instruction.');
            const resp = await fetch(_chatUrl, { method: 'POST', headers: { 'X-API-Key': _apiKey }, body: fd });
            if (!resp.ok) throw new Error('Gagal menghubungi AI untuk analisa foto.');
            const data = await resp.json();
            return (data.response || data.text || '').trim();
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

        function autoDetectRatio() {
            if (!gcImageData) return;
            const img = new Image();
            img.onload = function () {
                const r = img.width / img.height;
                const best = r > 1.6 ? '16:9' : r > 1.1 ? '4:3' : r > 0.85 ? '1:1' : r > 0.6 ? '3:4' : '9:16';
                gcRatioOptions?.querySelectorAll('button').forEach(b => b.classList.remove('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700'));
                gcRatioOptions?.querySelector(`[data-value="${best}"]`)?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
            };
            img.src = gcImageData.dataUrl;
        }

        function setImage(data) {
            gcImageData = data;
            gcPreview.src = data.dataUrl;
            gcPlaceholder.classList.add('hidden');
            gcPreview.classList.remove('hidden');
            gcRemoveBtn.classList.remove('hidden');
            autoDetectRatio();
            updateBtn();
        }

        function clearImage() {
            gcImageData = null;
            if (gcImageInput) gcImageInput.value = '';
            gcPreview.src = '#';
            gcPreview.classList.add('hidden');
            gcPlaceholder.classList.remove('hidden');
            gcRemoveBtn.classList.add('hidden');
            updateBtn();
        }

        gcImageInput?.addEventListener('change', async (e) => {
            if (e.target.files[0]) setImage(await readFileAsBase64(e.target.files[0]));
        });

        gcUploadBox?.addEventListener('dragover', e => { e.preventDefault(); gcUploadBox.classList.add('border-teal-400'); });
        gcUploadBox?.addEventListener('dragleave', () => gcUploadBox.classList.remove('border-teal-400'));
        gcUploadBox?.addEventListener('drop', async (e) => {
            e.preventDefault();
            gcUploadBox.classList.remove('border-teal-400');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) setImage(await readFileAsBase64(file));
        });

        gcRemoveBtn?.addEventListener('click', (e) => { e.stopPropagation(); clearImage(); });

        if (gcClearBtn) {
            gcClearBtn.addEventListener('click', () => {
                gcResultsGrid.innerHTML = '';
                gcResultsContainer.classList.add('hidden');
                gcResultsPlaceholder.classList.remove('hidden');
            });
        }

        gcGenerateBtn.addEventListener('click', async () => {
            if (!gcImageData) return;
            if (!gcPrivateServerActive) {
                if (typeof window.showUpgradePrivateServerPopup === 'function') window.showUpgradePrivateServerPopup();
                return;
            }

            const ratio = gcRatioOptions?.querySelector('.selected')?.dataset.value || '4:3';
            const originalBtnHTML = gcGenerateBtn.innerHTML;
            gcGenerateBtn.disabled = true;

            let prompt;
            try {
                if (gcAutoConceptOn) {
                    gcGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Menganalisa foto...</span>`;
                    prompt = await gcGetAutoConceptPrompt();
                    if (!prompt) throw new Error('AI tidak menghasilkan konsep. Coba lagi.');
                } else {
                    const weather = gcWeatherOptions?.querySelector('.selected')?.dataset.value || 'clear sunny day';
                    const intensity = gcIntensityOptions?.querySelector('.selected')?.dataset.value || 'moderate, natural weather effect';
                    const extra = gcExtraInput?.value.trim();
                    prompt = `Transform the weather in this photo to: ${weather}. Apply a ${intensity} weather transformation while keeping all subjects, people, objects, and scene composition exactly the same.`;
                    prompt += ` Only change the sky, atmosphere, lighting, and environmental weather effects. The result must look photorealistic and natural, as if the photo was taken under this weather condition.`;
                    if (extra) prompt += ` Additional details: ${extra}.`;
                    prompt += ` Ultra-realistic, seamless weather replacement, professional photo editing quality.`;
                }
            } catch (err) {
                gcGenerateBtn.disabled = false;
                gcGenerateBtn.innerHTML = originalBtnHTML;
                alert(err.message);
                return;
            }

            gcGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Mengganti Cuaca...</span>`;
            gcResultsPlaceholder.classList.add('hidden');
            gcResultsContainer.classList.remove('hidden');

            const resultCount = parseInt(gcCountSlider?.value) || 1;
            const aspectClass = ratio === '9:16' ? 'aspect-[9/16]' : ratio === '16:9' ? 'aspect-video' : ratio === '3:4' ? 'aspect-[3/4]' : ratio === '4:3' ? 'aspect-[4/3]' : 'aspect-square';
            const gridCols = resultCount === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2';
            gcResultsGrid.className = `grid ${gridCols} gap-4 md:gap-6`;
            gcResultsGrid.innerHTML = '';
            const cards = [];
            for (let i = 0; i < resultCount; i++) {
                const c = document.createElement('div');
                c.className = `relative rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center ${aspectClass}`;
                c.innerHTML = `<div class="spinner"></div>`;
                gcResultsGrid.appendChild(c);
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
                    formData.append('images[]', base64ToBlob(gcImageData.base64, gcImageData.mimeType));
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
                            <a href="${imageUrl}" download="ganti_cuaca.png" class="result-action-btn download-btn" title="Unduh"><i data-lucide="download" class="w-4 h-4"></i></a>
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
                gcGenerateBtn.disabled = false;
                gcGenerateBtn.innerHTML = originalBtnHTML;
                if (window.lucide) window.lucide.createIcons();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGantiCuaca);
    } else {
        initGantiCuaca();
    }
})();
