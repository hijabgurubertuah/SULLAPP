(function () {
    function initBuatTopeng() {
        const btImageInput = document.getElementById('bt-image-input');
        const btUploadBox = document.getElementById('bt-upload-box');
        const btPreview = document.getElementById('bt-preview');
        const btPlaceholder = document.getElementById('bt-placeholder');
        const btRemoveBtn = document.getElementById('bt-remove-btn');
        const btTypeOptions = document.getElementById('bt-type-options');
        const btColorOptions = document.getElementById('bt-color-options');
        const btIntensityOptions = document.getElementById('bt-intensity-options');
        const btRatioOptions = document.getElementById('bt-ratio-options');
        const btExtraInput = document.getElementById('bt-extra-input');
        const btGenerateBtn = document.getElementById('bt-generate-btn');
        const btGenerateBtnText = document.getElementById('bt-generate-btn-text');
        const btResultsContainer = document.getElementById('bt-results-container');
        const btResultsGrid = document.getElementById('bt-results-grid');
        const btResultsPlaceholder = document.getElementById('bt-results-placeholder');
        const btClearBtn = document.getElementById('bt-clear-btn');
        const btCountSlider = document.getElementById('bt-count-slider');
        const btAutoConceptToggle = document.getElementById('bt-auto-concept');
        const btOptionsWrapper = document.getElementById('bt-options-wrapper');

        if (!btGenerateBtn) return;

        let btImageData = null;
        let btAutoConceptOn = false;
        let btPrivateServerActive = false;
        async function checkBtPrivateServerStatus() {
            const email = localStorage.getItem('sulapfoto_verified_email');
            if (!email) { btPrivateServerActive = false; return; }
            try {
                const r = window.getAddonStatus ? await window.getAddonStatus(email, 'private_server') : await (await fetch('/server/addons_payment.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_active_addon', email, addon_key: 'private_server' }) })).json();
                btPrivateServerActive = r.success && r.is_active;
            } catch (e) { btPrivateServerActive = false; }
        }
        checkBtPrivateServerStatus();

        btRatioOptions?.querySelector('[data-value="1:1"]')?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');

        btAutoConceptToggle?.addEventListener('change', () => {
            btAutoConceptOn = btAutoConceptToggle.checked;
            if (btOptionsWrapper) {
                btOptionsWrapper.classList.toggle('opacity-50', btAutoConceptOn);
                btOptionsWrapper.classList.toggle('pointer-events-none', btAutoConceptOn);
            }
            updateBtn();
        });

        async function btGetAutoConceptPrompt() {
            const _chatUrl = (typeof CHAT_URL !== 'undefined' ? CHAT_URL : '') || (GENERATE_URL || '').replace('/generate', '/chat');
            const _apiKey = (typeof API_KEY !== 'undefined' ? API_KEY : '') || '';
            const base64ToBlob = window.base64ToBlob || function (b, m) { const bytes = atob(b); const arr = new Uint8Array(bytes.length); for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i); return new Blob([arr], { type: m }); };
            const fd = new FormData();
            fd.append('images[]', base64ToBlob(btImageData.base64, btImageData.mimeType));
            fd.append('prompt', 'Analyze this photo carefully — study the person\'s face shape, skin tone, facial features, and overall aesthetic. Determine the single most visually stunning and perfectly fitting artistic mask concept for this specific person. Return ONLY a complete, detailed image generation instruction in English (no explanations, no preamble) describing: the exact mask type and style, the colors and materials, the intensity and coverage, how it complements the person\'s features, and any special decorative elements. The mask must feel custom-made for this person. Be very specific and vivid. Start directly with the instruction.');
            const resp = await fetch(_chatUrl, { method: 'POST', headers: { 'X-API-Key': _apiKey }, body: fd });
            if (!resp.ok) throw new Error('Gagal menghubungi AI untuk analisa foto.');
            const data = await resp.json();
            return (data.response || data.text || '').trim();
        }

        function autoDetectRatio() {
            if (!btImageData) return;
            const img = new Image();
            img.onload = function () {
                const r = img.width / img.height;
                const best = r > 1.6 ? '16:9' : r > 1.1 ? '4:3' : r > 0.85 ? '1:1' : r > 0.6 ? '3:4' : '9:16';
                btRatioOptions?.querySelectorAll('button').forEach(b => b.classList.remove('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700'));
                btRatioOptions?.querySelector(`[data-value="${best}"]`)?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
            };
            img.src = btImageData.dataUrl;
        }

        const optionGroups = [btTypeOptions, btColorOptions, btIntensityOptions, btRatioOptions];
        optionGroups.forEach(group => {
            if (!group) return;
            group.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => {
                    group.querySelectorAll('button').forEach(b => b.classList.remove('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700'));
                    btn.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
                });
            });
        });

        // Pre-select "Sedang" intensity
        btIntensityOptions?.querySelectorAll('button').forEach(btn => {
            if (btn.dataset.value === 'balanced intensity, clear and defined patterns') {
                btn.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
            }
        });

        function updateBtn() {
            btGenerateBtn.disabled = !btImageData;
        }

        function setImage(data) {
            btImageData = data;
            btPreview.src = data.dataUrl;
            btPlaceholder.classList.add('hidden');
            btPreview.classList.remove('hidden');
            btRemoveBtn.classList.remove('hidden');
            autoDetectRatio();
            updateBtn();
        }

        function clearImage() {
            btImageData = null;
            btImageInput.value = '';
            btPreview.src = '#';
            btPreview.classList.add('hidden');
            btPlaceholder.classList.remove('hidden');
            btRemoveBtn.classList.add('hidden');
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

        btImageInput?.addEventListener('change', async (e) => {
            if (e.target.files[0]) setImage(await readFileAsBase64(e.target.files[0]));
        });

        btUploadBox?.addEventListener('dragover', e => { e.preventDefault(); btUploadBox.classList.add('border-teal-400'); });
        btUploadBox?.addEventListener('dragleave', () => btUploadBox.classList.remove('border-teal-400'));
        btUploadBox?.addEventListener('drop', async (e) => {
            e.preventDefault();
            btUploadBox.classList.remove('border-teal-400');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) setImage(await readFileAsBase64(file));
        });

        btRemoveBtn?.addEventListener('click', (e) => { e.stopPropagation(); clearImage(); });

        if (btClearBtn) {
            btClearBtn.addEventListener('click', () => {
                btResultsGrid.innerHTML = '';
                btResultsContainer.classList.add('hidden');
                btResultsPlaceholder.classList.remove('hidden');
            });
        }

        btGenerateBtn.addEventListener('click', async () => {
            if (!btImageData) return;
            if (!btPrivateServerActive) {
                if (typeof window.showUpgradePrivateServerPopup === 'function') window.showUpgradePrivateServerPopup();
                return;
            }

            const originalBtnHTML = btGenerateBtn.innerHTML;
            btGenerateBtn.disabled = true;

            let prompt;
            try {
                if (btAutoConceptOn) {
                    btGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Menganalisa foto...</span>`;
                    prompt = await btGetAutoConceptPrompt();
                    if (!prompt) throw new Error('AI tidak menghasilkan konsep. Coba lagi.');
                } else {
                    const maskType = btTypeOptions?.querySelector('.selected')?.dataset.value || 'Venetian masquerade mask, ornate, elegant, gold filigree decorations';
                    const color = btColorOptions?.querySelector('.selected')?.dataset.value || 'shimmering gold and jewel tones';
                    const intensity = btIntensityOptions?.querySelector('.selected')?.dataset.value || 'balanced intensity, clear and defined patterns';
                    const extra = btExtraInput?.value.trim();
                    prompt = `Apply a stunning artistic mask to the person's face in this photo. Mask type: ${maskType}.`;
                    prompt += ` Color scheme: ${color}.`;
                    prompt += ` Intensity and coverage: ${intensity}.`;
                    if (extra) prompt += ` Additional decoration: ${extra}.`;
                    prompt += ` The mask must be perfectly fitted to the face contours, looking completely natural and realistic as if professionally applied. Preserve the person's identity and skin tone outside the mask area. The result should be a beautiful, high-quality artistic portrait. Studio quality lighting, sharp focus, ultra detailed, professional photography.`;
                }
            } catch (err) {
                btGenerateBtn.disabled = false;
                btGenerateBtn.innerHTML = originalBtnHTML;
                alert(err.message);
                return;
            }

            btGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Memasang Topeng...</span>`;
            btResultsPlaceholder.classList.add('hidden');
            btResultsContainer.classList.remove('hidden');

            const ratio = btRatioOptions?.querySelector('.selected')?.dataset.value || '1:1';
            const resultCount = parseInt(btCountSlider?.value) || 1;
            const aspectClass = ratio === '9:16' ? 'aspect-[9/16]' : ratio === '16:9' ? 'aspect-video' : ratio === '3:4' ? 'aspect-[3/4]' : ratio === '4:3' ? 'aspect-[4/3]' : 'aspect-square';
            const gridCols = resultCount === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2';
            btResultsGrid.className = `grid ${gridCols} gap-4 md:gap-6`;
            btResultsGrid.innerHTML = '';
            const cards = [];
            for (let i = 0; i < resultCount; i++) {
                const c = document.createElement('div');
                c.className = `relative rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center ${aspectClass}`;
                c.innerHTML = `<div class="spinner"></div>`;
                btResultsGrid.appendChild(c);
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
                    formData.append('images[]', base64ToBlob(btImageData.base64, btImageData.mimeType));
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
                            <a href="${imageUrl}" download="buat_topeng.png" class="result-action-btn download-btn" title="Unduh"><i data-lucide="download" class="w-4 h-4"></i></a>
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
                btGenerateBtn.disabled = false;
                btGenerateBtn.innerHTML = originalBtnHTML;
                if (window.lucide) window.lucide.createIcons();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBuatTopeng);
    } else {
        initBuatTopeng();
    }
})();
