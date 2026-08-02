(function () {
    function initGambarKePrompt() {
        const gkpImageInput = document.getElementById('gkp-image-input');
        const gkpUploadBox = document.getElementById('gkp-upload-box');
        const gkpPreview = document.getElementById('gkp-preview');
        const gkpPlaceholder = document.getElementById('gkp-placeholder');
        const gkpRemoveBtn = document.getElementById('gkp-remove-btn');
        const gkpModeOptions = document.getElementById('gkp-mode-options');
        const gkpLangOptions = document.getElementById('gkp-lang-options');
        const gkpFocusOptions = document.getElementById('gkp-focus-options');
        const gkpGenerateBtn = document.getElementById('gkp-generate-btn');
        const gkpGenerateBtnText = document.getElementById('gkp-generate-btn-text');
        const gkpResultContainer = document.getElementById('gkp-result-container');
        const gkpResultsPlaceholder = document.getElementById('gkp-results-placeholder');
        const gkpResultText = document.getElementById('gkp-result-text');
        const gkpResultTags = document.getElementById('gkp-result-tags');
        const gkpCopyBtn = document.getElementById('gkp-copy-btn');
        const gkpClearResultBtn = document.getElementById('gkp-clear-result-btn');
        const gkpUsePromptBtn = document.getElementById('gkp-use-prompt-btn');
        const gkpRegenerateBtn = document.getElementById('gkp-regenerate-btn');

        if (!gkpGenerateBtn) return;

        let gkpImageData = null;
        let gkpLastRawText = '';
        let gkpPrivateServerActive = false;
        async function checkGkpPrivateServerStatus() {
            const email = localStorage.getItem('sulapfoto_verified_email');
            if (!email) { gkpPrivateServerActive = false; return; }
            try {
                const r = window.getAddonStatus ? await window.getAddonStatus(email, 'private_server') : await (await fetch('/server/addons_payment.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_active_addon', email, addon_key: 'private_server' }) })).json();
                gkpPrivateServerActive = r.success && r.is_active;
            } catch (e) { gkpPrivateServerActive = false; }
        }
        checkGkpPrivateServerStatus();

        function renderMarkdown(text) {
            const lines = text.split('\n');
            let html = '';
            let inUl = false;
            let inOl = false;
            const closeList = () => {
                if (inUl) { html += '</ul>'; inUl = false; }
                if (inOl) { html += '</ol>'; inOl = false; }
            };
            const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            const inline = s => esc(s)
                .replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>')
                .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
                .replace(/\*(.+?)\*/g,'<em>$1</em>')
                .replace(/`([^`]+)`/g,'<code class="bg-slate-100 text-teal-600 px-1 rounded text-[11px] font-mono">$1</code>');
            for (const raw of lines) {
                const line = raw;
                const h3 = line.match(/^### (.+)$/);
                const h2 = line.match(/^## (.+)$/);
                const h1 = line.match(/^# (.+)$/);
                const ul = line.match(/^[\-\*] (.+)$/);
                const ol = line.match(/^\d+\. (.+)$/);
                if (h3) { closeList(); html += `<h3 class="font-bold text-slate-800 text-sm mt-3 mb-1">${inline(h3[1])}</h3>`; }
                else if (h2) { closeList(); html += `<h2 class="font-bold text-slate-800 text-base mt-4 mb-1">${inline(h2[1])}</h2>`; }
                else if (h1) { closeList(); html += `<h1 class="font-bold text-slate-800 text-lg mt-4 mb-2">${inline(h1[1])}</h1>`; }
                else if (ul) { if (!inUl) { closeList(); html += '<ul class="list-disc pl-5 space-y-0.5 my-1.5">'; inUl = true; } html += `<li>${inline(ul[1])}</li>`; }
                else if (ol) { if (!inOl) { closeList(); html += '<ol class="list-decimal pl-5 space-y-0.5 my-1.5">'; inOl = true; } html += `<li>${inline(ol[1])}</li>`; }
                else if (line.trim() === '') { closeList(); html += '<br>'; }
                else { closeList(); html += `<p class="mb-1.5 text-slate-700">${inline(line)}</p>`; }
            }
            closeList();
            return html;
        }

        // Option group handlers
        [gkpModeOptions, gkpFocusOptions].forEach(group => {
            if (!group) return;
            group.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => {
                    group.querySelectorAll('button').forEach(b => b.classList.remove('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700'));
                    btn.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
                });
            });
        });

        if (gkpLangOptions) {
            gkpLangOptions.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => {
                    gkpLangOptions.querySelectorAll('button').forEach(b => b.classList.remove('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700'));
                    btn.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
                });
            });
            // Pre-select English
            gkpLangOptions.querySelector('[data-value="english"]')?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');
        }

        // Pre-select defaults
        gkpFocusOptions?.querySelector('[data-value="overall"]')?.classList.add('selected', 'border-teal-400', 'bg-teal-50', 'text-teal-700');

        function updateBtn() {
            gkpGenerateBtn.disabled = !gkpImageData;
        }

        function setImage(data) {
            gkpImageData = data;
            gkpPreview.src = data.dataUrl;
            gkpPlaceholder.classList.add('hidden');
            gkpPreview.classList.remove('hidden');
            gkpRemoveBtn.classList.remove('hidden');
            updateBtn();
        }

        function clearImage() {
            gkpImageData = null;
            gkpImageInput.value = '';
            gkpPreview.src = '#';
            gkpPreview.classList.add('hidden');
            gkpPlaceholder.classList.remove('hidden');
            gkpRemoveBtn.classList.add('hidden');
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
                    resolve({ dataUrl, base64, mimeType });
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        gkpImageInput?.addEventListener('change', async (e) => {
            if (e.target.files[0]) setImage(await readFileAsBase64(e.target.files[0]));
        });

        gkpUploadBox?.addEventListener('dragover', e => { e.preventDefault(); gkpUploadBox.classList.add('border-teal-400'); });
        gkpUploadBox?.addEventListener('dragleave', () => gkpUploadBox.classList.remove('border-teal-400'));
        gkpUploadBox?.addEventListener('drop', async (e) => {
            e.preventDefault();
            gkpUploadBox.classList.remove('border-teal-400');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) setImage(await readFileAsBase64(file));
        });

        gkpRemoveBtn?.addEventListener('click', (e) => { e.stopPropagation(); clearImage(); });

        gkpCopyBtn?.addEventListener('click', () => {
            const text = gkpLastRawText || gkpResultText?.innerText || '';
            if (!text) return;
            navigator.clipboard.writeText(text).then(() => {
                const orig = gkpCopyBtn.innerHTML;
                gkpCopyBtn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i> Disalin!`;
                gkpCopyBtn.classList.add('bg-teal-100', 'text-teal-700');
                if (window.lucide) window.lucide.createIcons();
                setTimeout(() => {
                    gkpCopyBtn.innerHTML = orig;
                    gkpCopyBtn.classList.remove('bg-teal-100', 'text-teal-700');
                    if (window.lucide) window.lucide.createIcons();
                }, 2000);
            });
        });

        gkpClearResultBtn?.addEventListener('click', () => {
            gkpResultContainer.classList.add('hidden');
            gkpResultsPlaceholder.classList.remove('hidden');
            gkpResultText.innerHTML = '';
            gkpLastRawText = '';
            if (gkpResultTags) { gkpResultTags.innerHTML = ''; gkpResultTags.classList.add('hidden'); }
        });

        gkpUsePromptBtn?.addEventListener('click', () => {
            const promptText = gkpLastRawText || gkpResultText?.innerText || '';
            if (!promptText) return;
            if (window.switchTab) {
                window.switchTab('text-to-image', () => {
                    const tiPromptInput = document.getElementById('ti-prompt-input');
                    if (tiPromptInput) {
                        tiPromptInput.value = promptText;
                        tiPromptInput.dispatchEvent(new Event('input'));
                        tiPromptInput.focus();
                    }
                });
            }
        });

        gkpRegenerateBtn?.addEventListener('click', () => {
            if (gkpImageData) doAnalyze();
        });

        async function doAnalyze() {
            if (!gkpPrivateServerActive) {
                if (typeof window.showUpgradePrivateServerPopup === 'function') window.showUpgradePrivateServerPopup();
                return;
            }
            const mode = gkpModeOptions?.querySelector('.selected')?.dataset.value || 'detailed';
            const lang = gkpLangOptions?.querySelector('.selected')?.dataset.value || 'english';
            const focus = gkpFocusOptions?.querySelector('.selected')?.dataset.value || 'overall';

            const isEnglish = lang === 'english';
            const langInstruction = isEnglish
                ? 'Respond in English only.'
                : 'Berikan respons dalam Bahasa Indonesia saja.';

            let systemPrompt = '';
            let userQuery = '';

            const focusMap = {
                overall: 'all visual elements including subject, composition, lighting, colors, style, mood, background, and technical aspects',
                lighting: 'lighting setup, light sources, shadows, highlights, and overall lighting mood',
                style: 'artistic style, technique, medium, visual aesthetics, and artistic influences',
                character: 'the character or subject, their appearance, clothing, expression, pose, and attributes',
                background: 'the background, environment, setting, scenery, and atmospheric elements'
            };
            const focusDesc = focusMap[focus] || focusMap.overall;

            if (mode === 'detailed') {
                systemPrompt = `You are an expert image analyst and AI prompt engineer. Analyze images with extreme precision and detail. Focus on: ${focusDesc}. ${langInstruction}`;
                userQuery = isEnglish
                    ? `Analyze this image in detail. Describe ${focusDesc}. Be comprehensive and precise.`
                    : `Analisis gambar ini secara detail. Deskripsikan ${focusDesc}. Jadilah komprehensif dan tepat.`;
            } else if (mode === 'midjourney') {
                systemPrompt = `You are an expert Midjourney and Stable Diffusion prompt engineer. Convert images into optimized prompts. Format: [subject], [style], [lighting], [colors], [composition], [quality tags] --ar [ratio] --q 2. ${langInstruction}`;
                userQuery = isEnglish
                    ? 'Convert this image into an optimized Midjourney/Stable Diffusion prompt. Include style, lighting, composition, and quality modifiers.'
                    : 'Ubah gambar ini menjadi prompt Midjourney/Stable Diffusion yang optimal. Sertakan gaya, pencahayaan, komposisi, dan modifier kualitas.';
            } else if (mode === 'cinematic') {
                systemPrompt = `You are a professional cinematographer and film director. Analyze images from a cinematic perspective focusing on camera work, lighting, composition, color grading, and storytelling. ${langInstruction}`;
                userQuery = isEnglish
                    ? 'Analyze this image cinematically. Describe camera angle, focal length, lighting setup, color grading, depth of field, and the cinematic mood/story it conveys.'
                    : 'Analisis gambar ini secara sinematik. Deskripsikan sudut kamera, focal length, setup pencahayaan, color grading, depth of field, dan mood/cerita sinematiknya.';
            } else if (mode === 'short') {
                systemPrompt = `You are a concise AI prompt writer. Create short, powerful image prompts in 1-3 sentences maximum. ${langInstruction}`;
                userQuery = isEnglish
                    ? 'Write a short but powerful AI image generation prompt based on this image. Maximum 3 sentences.'
                    : 'Tulis prompt generasi gambar AI yang singkat namun kuat berdasarkan gambar ini. Maksimal 3 kalimat.';
            }

            const originalBtnHTML = gkpGenerateBtn.innerHTML;
            gkpGenerateBtn.disabled = true;
            gkpGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Menganalisis...</span>`;
            gkpResultsPlaceholder.classList.add('hidden');
            gkpResultContainer.classList.remove('hidden');
            gkpResultText.innerHTML = `<div class="flex items-center gap-2 text-slate-400"><div class="spinner"></div> Menganalisis gambar...</div>`;
            if (gkpResultTags) { gkpResultTags.innerHTML = ''; gkpResultTags.classList.add('hidden'); }

            if (window.lucide) window.lucide.createIcons();

            try {
                const _chatUrl = (typeof CHAT_URL !== 'undefined' ? CHAT_URL : '') || '';
                const _apiKey = (typeof API_KEY !== 'undefined' ? API_KEY : '') || '';

                const base64ToBlob = window.base64ToBlob || function (base64, mimeType) {
                    const bytes = atob(base64);
                    const arr = new Uint8Array(bytes.length);
                    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
                    return new Blob([arr], { type: mimeType });
                };

                const fullPrompt = systemPrompt + '\n\n' + userQuery;
                const formData = new FormData();
                formData.append('prompt', fullPrompt);
                formData.append('images[]', base64ToBlob(gkpImageData.base64, gkpImageData.mimeType), 'image.jpg');

                const response = await fetch(_chatUrl, {
                    method: 'POST',
                    headers: { 'X-API-Key': _apiKey },
                    body: formData
                });

                if (!response.ok) throw new Error(await response.text() || `HTTP Error ${response.status}`);
                const result = await response.json();

                const text = (result.success && result.response ? result.response : (result.response || result.candidates?.[0]?.content?.parts?.[0]?.text || '')).trim();
                if (!text) throw new Error('Tidak ada hasil dari AI.');

                gkpLastRawText = text;
                gkpResultText.innerHTML = renderMarkdown(text);

                // Add mode tag
                if (gkpResultTags) {
                    const modeLabels = { detailed: '📋 Detail', midjourney: '🎨 Midjourney', cinematic: '🎬 Sinematik', short: '⚡ Ringkas' };
                    const langLabels = { english: '🇺🇸 EN', indonesian: '🇮🇩 ID' };
                    gkpResultTags.innerHTML = `
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-700">${modeLabels[mode] || mode}</span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">${langLabels[lang] || lang}</span>`;
                    gkpResultTags.classList.remove('hidden');
                }

                if (window.doneSound) window.doneSound.play();
            } catch (err) {
                gkpResultText.innerHTML = `<span class="text-red-500">${err.message}</span>`;
                if (window.errorSound) window.errorSound.play();
            } finally {
                gkpGenerateBtn.disabled = false;
                gkpGenerateBtn.innerHTML = originalBtnHTML;
                if (window.lucide) window.lucide.createIcons();
            }
        }

        gkpGenerateBtn.addEventListener('click', () => {
            if (gkpImageData) doAnalyze();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGambarKePrompt);
    } else {
        initGambarKePrompt();
    }
})();
