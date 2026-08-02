(function () {
    function initFotoClone() {
        const fcImageInput = document.getElementById('fc-image-input');
        const fcUploadBox = document.getElementById('fc-upload-box');
        const fcPreview = document.getElementById('fc-preview');
        const fcPlaceholder = document.getElementById('fc-placeholder');
        const fcRemoveBtn = document.getElementById('fc-remove-btn');
        const fcObjectOptions = document.getElementById('fc-object-options');
        const fcCountOptions = document.getElementById('fc-count-options');
        const fcLayoutOptions = document.getElementById('fc-layout-options');
        const fcRatioOptions = document.getElementById('fc-ratio-options');
        const fcExtraInput = document.getElementById('fc-extra-input');
        const fcGenerateBtn = document.getElementById('fc-generate-btn');
        const fcResultsContainer = document.getElementById('fc-results-container');
        const fcResultsGrid = document.getElementById('fc-results-grid');
        const fcResultsPlaceholder = document.getElementById('fc-results-placeholder');
        const fcClearBtn = document.getElementById('fc-clear-btn');
        const fcCountSlider = document.getElementById('fc-count-slider');
        const fcAutoConceptToggle = document.getElementById('fc-auto-concept');
        const fcOptionsWrapper = document.getElementById('fc-options-wrapper');

        if (!fcGenerateBtn) return;

        let fcImageData = null;
        let fcAutoConceptOn = false;
        let fcPrivateServerActive = false;

        async function checkFcPrivateServerStatus() {
            const email = localStorage.getItem('sulapfoto_verified_email');
            if (!email) { fcPrivateServerActive = false; return; }
            try {
                const r = window.getAddonStatus ? await window.getAddonStatus(email, 'private_server') : await (await fetch('/server/addons_payment.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_active_addon', email, addon_key: 'private_server' }) })).json();
                fcPrivateServerActive = r.success && r.is_active;
            } catch (e) { fcPrivateServerActive = false; }
        }
        checkFcPrivateServerStatus();

        const optionGroups = [fcObjectOptions, fcCountOptions, fcLayoutOptions, fcRatioOptions];
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

        fcCountOptions?.querySelector('[data-value="2 identical copies, total 2 versions"]')?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
        fcLayoutOptions?.querySelector('[data-value="side by side in a horizontal row, evenly spaced"]')?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');

        fcAutoConceptToggle?.addEventListener('change', () => {
            fcAutoConceptOn = fcAutoConceptToggle.checked;
            if (fcOptionsWrapper) {
                fcOptionsWrapper.classList.toggle('opacity-50', fcAutoConceptOn);
                fcOptionsWrapper.classList.toggle('pointer-events-none', fcAutoConceptOn);
            }
            updateBtn();
        });

        function updateBtn() {
            fcGenerateBtn.disabled = fcAutoConceptOn ? !fcImageData : !(fcImageData && fcObjectOptions?.querySelector('.selected'));
        }

        async function fcGetAutoConceptPrompt() {
            const _chatUrl = (typeof CHAT_URL !== 'undefined' ? CHAT_URL : '') || (GENERATE_URL || '').replace('/generate', '/chat');
            const _apiKey = (typeof API_KEY !== 'undefined' ? API_KEY : '') || '';
            const base64ToBlob = window.base64ToBlob || function (b, m) { const bytes = atob(b); const arr = new Uint8Array(bytes.length); for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i); return new Blob([arr], { type: m }); };
            const fd = new FormData();
            fd.append('images[]', base64ToBlob(fcImageData.base64, fcImageData.mimeType));
            fd.append('prompt', 'Analyze this photo carefully. Identify the main subject (person, object, animal, or character). Determine the most natural, visually stunning, and realistic way to clone/duplicate this subject within the exact same scene. Return ONLY a complete image generation instruction in English (no explanations, no preamble) that describes: the subject to clone, how many copies, their exact natural positions and arrangement, how they interact with the scene lighting and shadows, and why this specific arrangement looks most natural and photorealistic. Emphasize it must be ONE single unified photo with no grid or collage. Be very specific. Start directly with the instruction.');
            const resp = await fetch(_chatUrl, { method: 'POST', headers: { 'X-API-Key': _apiKey }, body: fd });
            if (!resp.ok) throw new Error('Gagal menghubungi AI untuk analisa foto.');
            const data = await resp.json();
            return (data.response || data.text || '').trim();
        }

        function autoDetectRatio() {
            if (!fcImageData) return;
            const img = new Image();
            img.onload = function () {
                const r = img.width / img.height;
                const best = r > 1.6 ? '16:9' : r > 1.1 ? '4:3' : r > 0.85 ? '1:1' : r > 0.6 ? '3:4' : '9:16';
                fcRatioOptions?.querySelectorAll('button').forEach(b => b.classList.remove('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700'));
                fcRatioOptions?.querySelector(`[data-value="${best}"]`)?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
            };
            img.src = fcImageData.dataUrl;
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
            fcImageData = data;
            fcPreview.src = data.dataUrl;
            fcPlaceholder.classList.add('hidden');
            fcPreview.classList.remove('hidden');
            fcRemoveBtn.classList.remove('hidden');
            autoDetectRatio();
            updateBtn();
        }

        function clearImage() {
            fcImageData = null;
            if (fcImageInput) fcImageInput.value = '';
            fcPreview.src = '#';
            fcPreview.classList.add('hidden');
            fcPlaceholder.classList.remove('hidden');
            fcRemoveBtn.classList.add('hidden');
            updateBtn();
        }

        fcImageInput?.addEventListener('change', async (e) => {
            if (e.target.files[0]) setImage(await readFileAsBase64(e.target.files[0]));
        });

        fcUploadBox?.addEventListener('dragover', e => { e.preventDefault(); fcUploadBox.classList.add('border-teal-400'); });
        fcUploadBox?.addEventListener('dragleave', () => fcUploadBox.classList.remove('border-teal-400'));
        fcUploadBox?.addEventListener('drop', async (e) => {
            e.preventDefault();
            fcUploadBox.classList.remove('border-teal-400');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) setImage(await readFileAsBase64(file));
        });

        fcRemoveBtn?.addEventListener('click', (e) => { e.stopPropagation(); clearImage(); });

        if (fcClearBtn) {
            fcClearBtn.addEventListener('click', () => {
                fcResultsGrid.innerHTML = '';
                fcResultsContainer.classList.add('hidden');
                fcResultsPlaceholder.classList.remove('hidden');
            });
        }

        fcGenerateBtn.addEventListener('click', async () => {
            if (!fcImageData) return;
            if (!fcPrivateServerActive) {
                if (typeof window.showUpgradePrivateServerPopup === 'function') window.showUpgradePrivateServerPopup();
                return;
            }

            const ratio = fcRatioOptions?.querySelector('.selected')?.dataset.value || '4:3';
            const originalBtnHTML = fcGenerateBtn.innerHTML;
            fcGenerateBtn.disabled = true;

            let prompt;
            try {
                if (fcAutoConceptOn) {
                    fcGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Menganalisa foto...</span>`;
                    prompt = await fcGetAutoConceptPrompt();
                    if (!prompt) throw new Error('AI tidak menghasilkan konsep. Coba lagi.');
                } else {
                    const objectType = fcObjectOptions?.querySelector('.selected')?.dataset.value || 'person';
                    const countVal = fcCountOptions?.querySelector('.selected')?.dataset.value || '2';
                    const layout = fcLayoutOptions?.querySelector('.selected')?.dataset.value || 'standing naturally side by side';
                    const extra = fcExtraInput?.value.trim();
                    prompt = `This is a SINGLE UNIFIED PHOTO — NOT a grid, NOT a collage, NOT split panels, NOT side-by-side comparison images. `;
                    prompt += `The output MUST be ONE single continuous photograph that looks exactly like a real camera photo taken in real life. `;
                    prompt += `\n\nTask: Realistically duplicate the main ${objectType} in this photo so that there are now ${countVal} identical ${objectType}s appearing together naturally in the same scene. `;
                    prompt += `They should be ${layout}. `;
                    prompt += `\n\nCritical requirements:\n`;
                    prompt += `- All ${countVal} copies must look IDENTICAL to the original — same face, same clothes, same body proportions, same hair, same skin tone.\n`;
                    prompt += `- The scene, background, lighting, and shadows must remain perfectly consistent as if they were all photographed together at the same moment.\n`;
                    prompt += `- Each copy must cast natural shadows and have correct lighting relative to the scene's light source.\n`;
                    prompt += `- The result must look 100% photorealistic — no painting, no illustration, no CGI look. A real person would not be able to tell this photo was edited.\n`;
                    prompt += `- Absolutely NO split image, NO grid layout, NO side-by-side panels, NO comparison format. ONE single photo frame only.\n`;
                    if (extra) prompt += `- Additional instruction: ${extra}\n`;
                    prompt += `\nStyle: Ultra-realistic seamless photo compositing, indistinguishable from a genuine photograph, professional retouching quality, 8K resolution.`;
                }
            } catch (err) {
                fcGenerateBtn.disabled = false;
                fcGenerateBtn.innerHTML = originalBtnHTML;
                alert(err.message);
                return;
            }

            fcGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Mengkloning...</span>`;
            fcResultsPlaceholder.classList.add('hidden');
            fcResultsContainer.classList.remove('hidden');

            const resultCount = parseInt(fcCountSlider?.value) || 1;
            const aspectClass = ratio === '9:16' ? 'aspect-[9/16]' : ratio === '16:9' ? 'aspect-video' : ratio === '3:4' ? 'aspect-[3/4]' : ratio === '4:3' ? 'aspect-[4/3]' : 'aspect-square';
            const gridCols = resultCount === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2';
            fcResultsGrid.className = `grid ${gridCols} gap-4 md:gap-6`;
            fcResultsGrid.innerHTML = '';
            const cards = [];
            for (let i = 0; i < resultCount; i++) {
                const c = document.createElement('div');
                c.className = `relative rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center ${aspectClass}`;
                c.innerHTML = `<div class="spinner"></div>`;
                fcResultsGrid.appendChild(c);
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
                    formData.append('images[]', base64ToBlob(fcImageData.base64, fcImageData.mimeType));
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
                            <a href="${imageUrl}" download="foto_clone.png" class="result-action-btn download-btn" title="Unduh"><i data-lucide="download" class="w-4 h-4"></i></a>
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
                fcGenerateBtn.disabled = false;
                fcGenerateBtn.innerHTML = originalBtnHTML;
                if (window.lucide) window.lucide.createIcons();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFotoClone);
    } else {
        initFotoClone();
    }
})();
