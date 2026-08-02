(function () {
    function initPovDrone() {
        const fdroneImageInput = document.getElementById('fdrone-image-input');
        const fdroneUploadBox = document.getElementById('fdrone-upload-box');
        const fdronePreview = document.getElementById('fdrone-preview');
        const fdronePlaceholder = document.getElementById('fdrone-placeholder');
        const fdroneRemoveBtn = document.getElementById('fdrone-remove-btn');
        const fdroneLocationOptions = document.getElementById('fdrone-location-options');
        const fdroneAltitudeOptions = document.getElementById('fdrone-altitude-options');
        const fdroneAngleOptions = document.getElementById('fdrone-angle-options');
        const fdroneMoodOptions = document.getElementById('fdrone-mood-options');
        const fdroneRatioOptions = document.getElementById('fdrone-ratio-options');
        const fdroneExtraInput = document.getElementById('fdrone-extra-input');
        const fdroneGenerateBtn = document.getElementById('fdrone-generate-btn');
        const fdroneResultsContainer = document.getElementById('fdrone-results-container');
        const fdroneResultsGrid = document.getElementById('fdrone-results-grid');
        const fdroneResultsPlaceholder = document.getElementById('fdrone-results-placeholder');
        const fdroneClearBtn = document.getElementById('fdrone-clear-btn');
        const fdroneCountSlider = document.getElementById('fdrone-count-slider');

        const fdroneAutoConceptToggle = document.getElementById('fdrone-auto-concept');
        const fdroneOptionsWrapper = document.getElementById('fdrone-options-wrapper');

        if (!fdroneGenerateBtn) return;

        let fdroneImageData = null;
        let fdroneAutoConceptOn = false;
        let fdronePrivateServerActive = false;

        async function checkPrivateServerStatus() {
            const email = localStorage.getItem('sulapfoto_verified_email');
            if (!email) { fdronePrivateServerActive = false; return; }
            try {
                const r = window.getAddonStatus ? await window.getAddonStatus(email, 'private_server') : await (await fetch('/server/addons_payment.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_active_addon', email, addon_key: 'private_server' }) })).json();
                fdronePrivateServerActive = r.success && r.is_active;
            } catch (e) { fdronePrivateServerActive = false; }
        }
        checkPrivateServerStatus();

        const optionGroups = [fdroneLocationOptions, fdroneAltitudeOptions, fdroneAngleOptions, fdroneMoodOptions, fdroneRatioOptions];
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

        fdroneRatioOptions?.querySelector('[data-value="16:9"]')?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
        fdroneAltitudeOptions?.querySelector('[data-value*="medium altitude"]')?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
        fdroneAngleOptions?.querySelector('[data-value*="45-degree"]')?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
        fdroneMoodOptions?.querySelector('[data-value*="golden hour"]')?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');

        fdroneAutoConceptToggle?.addEventListener('change', () => {
            fdroneAutoConceptOn = fdroneAutoConceptToggle.checked;
            if (fdroneOptionsWrapper) {
                fdroneOptionsWrapper.classList.toggle('opacity-50', fdroneAutoConceptOn);
                fdroneOptionsWrapper.classList.toggle('pointer-events-none', fdroneAutoConceptOn);
            }
            updateBtn();
        });

        function updateBtn() {
            fdroneGenerateBtn.disabled = fdroneAutoConceptOn ? !fdroneImageData : !(fdroneImageData && fdroneLocationOptions?.querySelector('.selected'));
        }

        async function fdroneGetAutoConceptPrompt() {
            const _chatUrl = (typeof CHAT_URL !== 'undefined' ? CHAT_URL : '') || (GENERATE_URL || '').replace('/generate', '/chat');
            const _apiKey = (typeof API_KEY !== 'undefined' ? API_KEY : '') || '';
            const base64ToBlob = window.base64ToBlob || function (b, m) { const bytes = atob(b); const arr = new Uint8Array(bytes.length); for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i); return new Blob([arr], { type: m }); };
            const fd = new FormData();
            fd.append('images[]', base64ToBlob(fdroneImageData.base64, fdroneImageData.mimeType));
            fd.append('prompt', 'Analyze this photo carefully — identify the location type, terrain, key visual elements, time of day, and lighting conditions. Determine the most cinematic, dramatic, and realistic aerial drone perspective that would look most spectacular for this specific scene. Return ONLY a complete, detailed image generation instruction in English (no explanations, no preamble) describing: the exact drone altitude and camera angle, the aerial reconstruction approach, how the terrain/environment looks from above, the lighting and atmospheric conditions, and any special visual details that would make this aerial shot extraordinary. Emphasize photorealistic DJI cinema drone quality. Be very specific. Start directly with the instruction.');
            const resp = await fetch(_chatUrl, { method: 'POST', headers: { 'X-API-Key': _apiKey }, body: fd });
            if (!resp.ok) throw new Error('Gagal menghubungi AI untuk analisa foto.');
            const data = await resp.json();
            return (data.response || data.text || '').trim();
        }

        function autoDetectRatio() {
            if (!fdroneImageData) return;
            const img = new Image();
            img.onload = function () {
                const r = img.width / img.height;
                const best = r > 1.6 ? '16:9' : r > 1.1 ? '4:3' : r > 0.85 ? '1:1' : r > 0.6 ? '3:4' : '9:16';
                fdroneRatioOptions?.querySelectorAll('button').forEach(b => b.classList.remove('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700'));
                fdroneRatioOptions?.querySelector(`[data-value="${best}"]`)?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
            };
            img.src = fdroneImageData.dataUrl;
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
            fdroneImageData = data;
            fdronePreview.src = data.dataUrl;
            fdronePlaceholder.classList.add('hidden');
            fdronePreview.classList.remove('hidden');
            fdroneRemoveBtn.classList.remove('hidden');
            autoDetectRatio();
            updateBtn();
        }

        function clearImage() {
            fdroneImageData = null;
            if (fdroneImageInput) fdroneImageInput.value = '';
            fdronePreview.src = '#';
            fdronePreview.classList.add('hidden');
            fdronePlaceholder.classList.remove('hidden');
            fdroneRemoveBtn.classList.add('hidden');
            updateBtn();
        }

        fdroneImageInput?.addEventListener('change', async (e) => {
            if (e.target.files[0]) setImage(await readFileAsBase64(e.target.files[0]));
        });

        fdroneUploadBox?.addEventListener('dragover', e => { e.preventDefault(); fdroneUploadBox.classList.add('border-teal-400'); });
        fdroneUploadBox?.addEventListener('dragleave', () => fdroneUploadBox.classList.remove('border-teal-400'));
        fdroneUploadBox?.addEventListener('drop', async (e) => {
            e.preventDefault();
            fdroneUploadBox.classList.remove('border-teal-400');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) setImage(await readFileAsBase64(file));
        });

        fdroneRemoveBtn?.addEventListener('click', (e) => { e.stopPropagation(); clearImage(); });

        fdroneClearBtn?.addEventListener('click', () => {
            fdroneResultsGrid.innerHTML = '';
            fdroneResultsContainer.classList.add('hidden');
            fdroneResultsPlaceholder.classList.remove('hidden');
        });

        fdroneGenerateBtn.addEventListener('click', async () => {
            if (!fdroneImageData) return;
            if (!fdronePrivateServerActive) {
                if (typeof window.showUpgradePrivateServerPopup === 'function') window.showUpgradePrivateServerPopup();
                return;
            }

            const ratio = fdroneRatioOptions?.querySelector('.selected')?.dataset.value || '16:9';
            const originalBtnHTML = fdroneGenerateBtn.innerHTML;
            fdroneGenerateBtn.disabled = true;

            let prompt;
            try {
                if (fdroneAutoConceptOn) {
                    fdroneGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Menganalisa foto...</span>`;
                    prompt = await fdroneGetAutoConceptPrompt();
                    if (!prompt) throw new Error('AI tidak menghasilkan konsep. Coba lagi.');
                } else {
                    if (!fdroneLocationOptions?.querySelector('.selected')) throw new Error('Pilih Lokasi terlebih dahulu.');
                    const location = fdroneLocationOptions?.querySelector('.selected')?.dataset.value || '';
                    const altitude = fdroneAltitudeOptions?.querySelector('.selected')?.dataset.value || 'medium altitude drone shot at 100-300 meters';
                    const angle = fdroneAngleOptions?.querySelector('.selected')?.dataset.value || '45-degree oblique diagonal angle, tilted perspective';
                    const mood = fdroneMoodOptions?.querySelector('.selected')?.dataset.value || 'golden hour sunrise or sunset';
                    const extra = fdroneExtraInput?.value.trim();
                    prompt = `Using this reference photo as the base, reconstruct and transform the scene into a realistic aerial drone photograph.`;
                    prompt += ` Location/subject: ${location}. Altitude: ${altitude}. Camera angle: ${angle}. Lighting: ${mood}.`;
                    prompt += ` The content and environment from the reference photo must be recognizable — same location, same elements — but completely re-rendered from an aerial bird's-eye perspective as if captured by a professional cinema drone (DJI Mavic 3 Cine style).`;
                    prompt += ` The perspective shift must be convincing: correct foreshortening, realistic aerial scale, natural ground texture patterns visible from above, proper shadow direction consistent with the lighting condition.`;
                    prompt += ` No visible drone or camera in frame. Pure aerial photography perspective.`;
                    if (extra) prompt += ` Additional details: ${extra}.`;
                    prompt += ` Cinematic aerial photography, DJI Pro quality, photorealistic, 8K ultra-high resolution, award-winning aerial composition.`;
                }
            } catch (err) {
                fdroneGenerateBtn.disabled = false;
                fdroneGenerateBtn.innerHTML = originalBtnHTML;
                alert(err.message);
                return;
            }

            fdroneGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Terbang...</span>`;
            fdroneResultsPlaceholder.classList.add('hidden');
            fdroneResultsContainer.classList.remove('hidden');

            const resultCount = parseInt(fdroneCountSlider?.value) || 1;
            const aspectClass = ratio === '9:16' ? 'aspect-[9/16]' : ratio === '16:9' ? 'aspect-video' : ratio === '3:4' ? 'aspect-[3/4]' : ratio === '4:3' ? 'aspect-[4/3]' : 'aspect-square';
            const gridCols = resultCount === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2';
            fdroneResultsGrid.className = `grid ${gridCols} gap-4 md:gap-6`;
            fdroneResultsGrid.innerHTML = '';
            const cards = [];
            for (let i = 0; i < resultCount; i++) {
                const c = document.createElement('div');
                c.className = `relative rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center ${aspectClass}`;
                c.innerHTML = `<div class="spinner"></div>`;
                fdroneResultsGrid.appendChild(c);
                cards.push(c);
            }

            if (window.lucide) window.lucide.createIcons();

            const generateSingle = async (card) => {
                try {
                    const _generateUrl = (typeof GENERATE_URL !== 'undefined' ? GENERATE_URL : '') || '';
                    const _apiKey = (typeof API_KEY !== 'undefined' ? API_KEY : '') || '';
                    const base64ToBlob = window.base64ToBlob || function (b, m) {
                        const bytes = atob(b); const arr = new Uint8Array(bytes.length);
                        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
                        return new Blob([arr], { type: m });
                    };
                    const formData = new FormData();
                    formData.append('images[]', base64ToBlob(fdroneImageData.base64, fdroneImageData.mimeType));
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
                            <a href="${imageUrl}" download="pov_drone.png" class="result-action-btn download-btn" title="Unduh"><i data-lucide="download" class="w-4 h-4"></i></a>
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
                fdroneGenerateBtn.disabled = false;
                fdroneGenerateBtn.innerHTML = originalBtnHTML;
                if (window.lucide) window.lucide.createIcons();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPovDrone);
    } else {
        initPovDrone();
    }
})();
