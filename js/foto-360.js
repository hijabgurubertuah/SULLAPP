(function () {
    function initFoto360() {
        const f360ImageInput = document.getElementById('f360-image-input');
        const f360UploadBox = document.getElementById('f360-upload-box');
        const f360Preview = document.getElementById('f360-preview');
        const f360Placeholder = document.getElementById('f360-placeholder');
        const f360RemoveBtn = document.getElementById('f360-remove-btn');
        const f360SceneOptions = document.getElementById('f360-scene-options');
        const f360ViewOptions = document.getElementById('f360-view-options');
        const f360MoodOptions = document.getElementById('f360-mood-options');
        const f360RatioOptions = document.getElementById('f360-ratio-options');
        const f360ExtraInput = document.getElementById('f360-extra-input');
        const f360GenerateBtn = document.getElementById('f360-generate-btn');
        const f360ResultsContainer = document.getElementById('f360-results-container');
        const f360ResultsGrid = document.getElementById('f360-results-grid');
        const f360ResultsPlaceholder = document.getElementById('f360-results-placeholder');
        const f360ClearBtn = document.getElementById('f360-clear-btn');
        const f360CountSlider = document.getElementById('f360-count-slider');

        const f360AutoConceptToggle = document.getElementById('f360-auto-concept');
        const f360OptionsWrapper = document.getElementById('f360-options-wrapper');

        if (!f360GenerateBtn) return;

        let f360ImageData = null;
        let f360AutoConceptOn = false;
        let f360PrivateServerActive = false;

        async function checkPrivateServerStatus() {
            const email = localStorage.getItem('sulapfoto_verified_email');
            if (!email) { f360PrivateServerActive = false; return; }
            try {
                const r = window.getAddonStatus ? await window.getAddonStatus(email, 'private_server') : await (await fetch('/server/addons_payment.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_active_addon', email, addon_key: 'private_server' }) })).json();
                f360PrivateServerActive = r.success && r.is_active;
            } catch (e) { f360PrivateServerActive = false; }
        }
        checkPrivateServerStatus();

        const optionGroups = [f360SceneOptions, f360ViewOptions, f360MoodOptions, f360RatioOptions];
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

        f360RatioOptions?.querySelector('[data-value="16:9"]')?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
        f360ViewOptions?.querySelector('[data-value*="equirectangular"]')?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');

        f360AutoConceptToggle?.addEventListener('change', () => {
            f360AutoConceptOn = f360AutoConceptToggle.checked;
            if (f360OptionsWrapper) {
                f360OptionsWrapper.classList.toggle('opacity-50', f360AutoConceptOn);
                f360OptionsWrapper.classList.toggle('pointer-events-none', f360AutoConceptOn);
            }
            updateBtn();
        });

        function updateBtn() {
            f360GenerateBtn.disabled = f360AutoConceptOn ? !f360ImageData : !(f360ImageData && f360SceneOptions?.querySelector('.selected'));
        }

        async function f360GetAutoConceptPrompt() {
            const _chatUrl = (typeof CHAT_URL !== 'undefined' ? CHAT_URL : '') || (GENERATE_URL || '').replace('/generate', '/chat');
            const _apiKey = (typeof API_KEY !== 'undefined' ? API_KEY : '') || '';
            const base64ToBlob = window.base64ToBlob || function (b, m) { const bytes = atob(b); const arr = new Uint8Array(bytes.length); for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i); return new Blob([arr], { type: m }); };
            const fd = new FormData();
            fd.append('images[]', base64ToBlob(f360ImageData.base64, f360ImageData.mimeType));
            fd.append('prompt', 'Analyze this photo carefully — the scene type, environment, spatial composition, and mood. Determine the single most visually stunning and immersive 360-degree or panoramic projection style that would look most spectacular applied to this specific photo. Return ONLY a complete, detailed image generation instruction in English (no explanations, no preamble) describing: the panoramic projection style to apply (e.g. equirectangular, tiny planet, fisheye, tunnel), how the scene wraps or projects, the atmosphere and lighting enhancement, and any special visual effects. The instruction must emphasize preserving the original scene content while applying the chosen panoramic style. Be very specific. Start directly with the instruction.');
            const resp = await fetch(_chatUrl, { method: 'POST', headers: { 'X-API-Key': _apiKey }, body: fd });
            if (!resp.ok) throw new Error('Gagal menghubungi AI untuk analisa foto.');
            const data = await resp.json();
            return (data.response || data.text || '').trim();
        }

        function autoDetectRatio() {
            if (!f360ImageData) return;
            const img = new Image();
            img.onload = function () {
                const r = img.width / img.height;
                const best = r > 1.6 ? '16:9' : r > 1.1 ? '4:3' : r > 0.85 ? '1:1' : r > 0.6 ? '3:4' : '9:16';
                f360RatioOptions?.querySelectorAll('button').forEach(b => b.classList.remove('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700'));
                f360RatioOptions?.querySelector(`[data-value="${best}"]`)?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
            };
            img.src = f360ImageData.dataUrl;
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
            f360ImageData = data;
            f360Preview.src = data.dataUrl;
            f360Placeholder.classList.add('hidden');
            f360Preview.classList.remove('hidden');
            f360RemoveBtn.classList.remove('hidden');
            autoDetectRatio();
            updateBtn();
        }

        function clearImage() {
            f360ImageData = null;
            if (f360ImageInput) f360ImageInput.value = '';
            f360Preview.src = '#';
            f360Preview.classList.add('hidden');
            f360Placeholder.classList.remove('hidden');
            f360RemoveBtn.classList.add('hidden');
            updateBtn();
        }

        f360ImageInput?.addEventListener('change', async (e) => {
            if (e.target.files[0]) setImage(await readFileAsBase64(e.target.files[0]));
        });

        f360UploadBox?.addEventListener('dragover', e => { e.preventDefault(); f360UploadBox.classList.add('border-teal-400'); });
        f360UploadBox?.addEventListener('dragleave', () => f360UploadBox.classList.remove('border-teal-400'));
        f360UploadBox?.addEventListener('drop', async (e) => {
            e.preventDefault();
            f360UploadBox.classList.remove('border-teal-400');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) setImage(await readFileAsBase64(file));
        });

        f360RemoveBtn?.addEventListener('click', (e) => { e.stopPropagation(); clearImage(); });

        f360ClearBtn?.addEventListener('click', () => {
            f360ResultsGrid.innerHTML = '';
            f360ResultsContainer.classList.add('hidden');
            f360ResultsPlaceholder.classList.remove('hidden');
        });

        f360GenerateBtn.addEventListener('click', async () => {
            if (!f360ImageData) return;
            if (!f360PrivateServerActive) {
                if (typeof window.showUpgradePrivateServerPopup === 'function') window.showUpgradePrivateServerPopup();
                return;
            }

            const ratio = f360RatioOptions?.querySelector('.selected')?.dataset.value || '16:9';
            const originalBtnHTML = f360GenerateBtn.innerHTML;
            f360GenerateBtn.disabled = true;

            let prompt;
            try {
                if (f360AutoConceptOn) {
                    f360GenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Menganalisa foto...</span>`;
                    prompt = await f360GetAutoConceptPrompt();
                    if (!prompt) throw new Error('AI tidak menghasilkan konsep. Coba lagi.');
                } else {
                    if (!f360SceneOptions?.querySelector('.selected')) throw new Error('Pilih Jenis Scene terlebih dahulu.');
                    const scene = f360SceneOptions?.querySelector('.selected')?.dataset.value || '';
                    const view = f360ViewOptions?.querySelector('.selected')?.dataset.value || 'equirectangular 360-degree panoramic projection, full spherical wrap';
                    const mood = f360MoodOptions?.querySelector('.selected')?.dataset.value || 'bright clear daytime, vivid saturated colors';
                    const extra = f360ExtraInput?.value.trim();
                    prompt = `Using this reference photo as the base, transform and reconstruct it into a stunning ${view} panoramic image.`;
                    prompt += ` Scene type: ${scene}. Atmosphere: ${mood}.`;
                    prompt += ` The content and subject of the reference photo must be preserved and recognizable, but re-rendered with the selected panoramic projection style applied faithfully.`;
                    prompt += ` The image must feel completely immersive and spatially cohesive — seamlessly wrapped or projected with no visible seams or distortion artifacts. Ultra-sharp details, photorealistic rendering, dramatic sense of depth and scale.`;
                    if (extra) prompt += ` Additional details: ${extra}.`;
                    prompt += ` Professional panoramic photography quality, ultra-wide angle immersive lens, 8K resolution, visually stunning composition.`;
                }
            } catch (err) {
                f360GenerateBtn.disabled = false;
                f360GenerateBtn.innerHTML = originalBtnHTML;
                alert(err.message);
                return;
            }

            f360GenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Membuat...</span>`;
            f360ResultsPlaceholder.classList.add('hidden');
            f360ResultsContainer.classList.remove('hidden');

            const resultCount = parseInt(f360CountSlider?.value) || 1;
            const aspectClass = ratio === '9:16' ? 'aspect-[9/16]' : ratio === '16:9' ? 'aspect-video' : ratio === '3:4' ? 'aspect-[3/4]' : ratio === '4:3' ? 'aspect-[4/3]' : 'aspect-square';
            const gridCols = resultCount === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2';
            f360ResultsGrid.className = `grid ${gridCols} gap-4 md:gap-6`;
            f360ResultsGrid.innerHTML = '';
            const cards = [];
            for (let i = 0; i < resultCount; i++) {
                const c = document.createElement('div');
                c.className = `relative rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center ${aspectClass}`;
                c.innerHTML = `<div class="spinner"></div>`;
                f360ResultsGrid.appendChild(c);
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
                    formData.append('images[]', base64ToBlob(f360ImageData.base64, f360ImageData.mimeType));
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
                            <a href="${imageUrl}" download="foto_360.png" class="result-action-btn download-btn" title="Unduh"><i data-lucide="download" class="w-4 h-4"></i></a>
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
                f360GenerateBtn.disabled = false;
                f360GenerateBtn.innerHTML = originalBtnHTML;
                if (window.lucide) window.lucide.createIcons();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFoto360);
    } else {
        initFoto360();
    }
})();
