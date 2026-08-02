(function () {
    'use strict';

    var API_KEY = window.API_KEY || '';

    function sbGetRandomBase() {
        var urls = (window.BASE_URL || '').split(',').map(function (u) { return u.trim().replace(/\/$/, ''); }).filter(Boolean);
        return urls.length > 0 ? urls[Math.floor(Math.random() * urls.length)] : '';
    }
    function sbChatUrl()     { return sbGetRandomBase() + '/chat'; }
    function sbGenerateUrl() { return sbGetRandomBase() + '/generate'; }

    async function sbFetchAsBlob(url) {
        try {
            var r = await fetch(url);
            if (!r.ok) return null;
            return await r.blob();
        } catch (e) { return null; }
    }

    var sbImages = [];
    var sbScenes = [];
    var sbAspectRatio = '16:9';
    var sbSceneCount = 4;
    var sbIsGenerating = false;
    var sbIsAnalyzing = false;
    var sbPrevRefinedPrompt = null;
    var sbStoryContext = null;
    var sbPrevGeneratedBlob = null;
    var sbSetupDone = false;

    function sbGetAspectStyle(ar) {
        var map = { '16:9': '16/9', '9:16': '9/16', '4:3': '4/3', '3:4': '3/4', '1:1': '1/1' };
        return 'style="width:100%;aspect-ratio:' + (map[ar] || '16/9') + ';display:block;"';
    }

    async function sbCheckAddonActive() {
        var email = localStorage.getItem('sulapfoto_verified_email');
        if (!email) return false;
        try {
            var d = window.getAddonStatus ? await window.getAddonStatus(email, 'storyboard') : await (await fetch('/server/addons_payment.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_active_addon', email, addon_key: 'storyboard' }) })).json();
            return !!(d && d.success && d.is_active);
        } catch (e) { return false; }
    }

    async function sbInit() {
        var locked = document.getElementById('sboard-locked');
        var app = document.getElementById('sboard-app');
        if (!locked || !app) return;

        var active = await sbCheckAddonActive();
        if (active) {
            locked.classList.add('hidden');
            app.classList.remove('hidden');
            if (!sbSetupDone) {
                sbSetupEvents();
                sbSetupDone = true;
            }
            sbUpdateArButtons();
        } else {
            locked.classList.remove('hidden');
            app.classList.add('hidden');
        }
    }
    window.initStoryboard = sbInit;

    function sbSetupEvents() {
        var uploadArea = document.getElementById('sboard-upload-area');
        var fileInput = document.getElementById('sboard-image-input');
        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', function () { fileInput.click(); });
            uploadArea.addEventListener('dragover', function (e) {
                e.preventDefault();
                uploadArea.classList.add('border-violet-400', 'bg-violet-50');
            });
            uploadArea.addEventListener('dragleave', function () {
                uploadArea.classList.remove('border-violet-400', 'bg-violet-50');
            });
            uploadArea.addEventListener('drop', function (e) {
                e.preventDefault();
                uploadArea.classList.remove('border-violet-400', 'bg-violet-50');
                sbHandleFiles(Array.from(e.dataTransfer.files));
            });
            fileInput.addEventListener('change', function () {
                sbHandleFiles(Array.from(fileInput.files));
                fileInput.value = '';
            });
        }

        var slider = document.getElementById('sboard-scene-count');
        var sliderLabel = document.getElementById('sboard-scene-count-label');
        if (slider && sliderLabel) {
            slider.addEventListener('input', function () {
                sbSceneCount = parseInt(slider.value);
                sliderLabel.textContent = sbSceneCount;
            });
        }

        document.querySelectorAll('.sboard-ar-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                sbAspectRatio = btn.dataset.ar;
                sbUpdateArButtons();
            });
        });

        var autoBtn = document.getElementById('sboard-auto-idea-btn');
        if (autoBtn) autoBtn.addEventListener('click', sbHandleAutoIdea);

        var genBtn = document.getElementById('sboard-generate-btn');
        if (genBtn) genBtn.addEventListener('click', sbHandleGenerate);

        var openAddons = document.getElementById('sboard-open-addons-btn');
        if (openAddons) {
            openAddons.addEventListener('click', function () {
                if (typeof window.switchTab === 'function') window.switchTab('addons');
            });
        }
    }

    function sbUpdateArButtons() {
        document.querySelectorAll('.sboard-ar-btn').forEach(function (b) {
            if (b.dataset.ar === sbAspectRatio) {
                b.className = 'sboard-ar-btn text-[10px] font-bold py-1.5 rounded-lg border transition-all bg-violet-600 text-white border-violet-600';
            } else {
                b.className = 'sboard-ar-btn text-[10px] font-bold py-1.5 rounded-lg border transition-all bg-slate-50 text-slate-600 border-slate-200 hover:border-violet-300';
            }
        });
    }

    function sbHandleFiles(files) {
        var validFiles = files.filter(function (f) { return f.type.startsWith('image/'); });
        validFiles.forEach(function (f) {
            if (sbImages.length >= 5) return;
            var reader = new FileReader();
            reader.onload = function (e) {
                sbImages.push({ file: f, url: e.target.result });
                sbRenderImagePreview();
            };
            reader.readAsDataURL(f);
        });
    }

    function sbRenderImagePreview() {
        var container = document.getElementById('sboard-image-preview');
        var uploadArea = document.getElementById('sboard-upload-area');
        if (!container) return;
        container.innerHTML = '';
        sbImages.forEach(function (img, i) {
            var el = document.createElement('div');
            el.style.cssText = 'position:relative;width:56px;height:56px;border-radius:12px;overflow:hidden;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.1);flex-shrink:0;';
            el.innerHTML =
                '<img src="' + img.url + '" style="width:100%;height:100%;object-fit:cover;">' +
                '<button class="sboard-remove-img" data-idx="' + i + '" style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:#ef4444;border:none;color:#fff;cursor:pointer;font-size:10px;line-height:1;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.2);">&#x2715;</button>';
            container.appendChild(el);
        });
        container.querySelectorAll('.sboard-remove-img').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                sbImages.splice(parseInt(btn.dataset.idx), 1);
                sbRenderImagePreview();
            });
        });
        if (sbImages.length > 0) {
            if (uploadArea) uploadArea.style.display = 'none';
            container.style.marginTop = '0';
            if (sbImages.length < 5) {
                var addBtn = document.createElement('div');
                addBtn.style.cssText = 'width:56px;height:56px;border-radius:12px;border:2px dashed #cbd5e1;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:border-color 0.15s,background 0.15s;';
                addBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#94a3b8" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
                addBtn.addEventListener('mouseenter', function () { this.style.borderColor = '#a78bfa'; this.style.background = '#f5f3ff'; });
                addBtn.addEventListener('mouseleave', function () { this.style.borderColor = '#cbd5e1'; this.style.background = ''; });
                addBtn.addEventListener('click', function () {
                    var fi = document.getElementById('sboard-image-input');
                    if (fi) fi.click();
                });
                container.appendChild(addBtn);
            }
        } else {
            if (uploadArea) uploadArea.style.display = '';
            container.style.marginTop = '8px';
        }
    }

    async function sbHandleAutoIdea() {
        if (sbIsAnalyzing) return;
        if (sbImages.length === 0) {
            var uploadArea = document.getElementById('sboard-upload-area');
            if (uploadArea) {
                uploadArea.style.borderColor = '#f87171';
                uploadArea.style.background = '#fff1f1';
                setTimeout(function () {
                    uploadArea.style.borderColor = '';
                    uploadArea.style.background = '';
                }, 2000);
            }
            var hint = document.querySelector('#sboard-upload-area .sboard-upload-hint');
            if (hint) {
                var origHtml = hint.innerHTML;
                hint.innerHTML = '<span style="font-size:11px;color:#ef4444;font-weight:600;">Upload gambar referensi dulu!</span>';
                setTimeout(function () { hint.innerHTML = origHtml; }, 2000);
            }
            return;
        }

        sbIsAnalyzing = true;
        var btn = document.getElementById('sboard-auto-idea-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid #c4b5fd;border-top-color:#7c3aed;border-radius:50%;animation:spin 0.7s linear infinite;vertical-align:middle;margin-right:6px;"></span>Menganalisa...';
        }

        try {
            var fd = new FormData();
            var p = 'Kamu adalah sutradara kreatif. Analisis gambar-gambar referensi berikut dan buatlah 1 konsep / ide video yang menarik, deskriptif, dan kreatif dalam Bahasa Indonesia. ' +
                'Tuliskan hanya ide/konsep videonya saja (2-3 kalimat), mencakup tema, suasana, dan tujuan video. Tanpa penjelasan tambahan, tanpa nomor, tanpa judul.';
            fd.append('prompt', p);
            sbImages.forEach(function (img) { fd.append('images', img.file, img.file.name); });

            var resp = await fetch(sbChatUrl(), { method: 'POST', headers: { 'X-API-Key': API_KEY }, body: fd });
            var data = await resp.json();
            var text = (data.response || data.text || '').trim();
            if (text) {
                var conceptInput = document.getElementById('sboard-concept');
                if (conceptInput) {
                    conceptInput.value = text;
                    conceptInput.style.borderColor = '#a78bfa';
                    conceptInput.focus();
                    setTimeout(function () { conceptInput.style.borderColor = ''; }, 2000);
                }
            }
        } catch (e) {
            console.error('Storyboard auto idea error:', e);
        } finally {
            sbIsAnalyzing = false;
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:6px;"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>Buat Ide Otomatis';
            }
        }
    }

    async function sbAnalyzeContext(concept) {
        sbStoryContext = null;
        try {
            var fd = new FormData();
            var hasImages = sbImages.length > 0;
            var p = hasImages
                ? 'Analyze the reference images carefully. Detect: 1) Exact visual art style (e.g. "anime illustration", "photorealistic photography", "watercolor", "3D render", "cartoon", etc) — be very specific. 2) Main character(s) appearance and clothing. 3) Environment/background description. Also consider concept: "' + concept + '". Reply ONLY with valid JSON, no extra text: {"style":"...","characters":"...","setting":"..."}'
                : 'Based on this video concept: "' + concept + '", determine: 1) Best visual art style. 2) Main subject/character description. 3) Environment/setting. Reply ONLY with valid JSON: {"style":"...","characters":"...","setting":"..."}';            fd.append('prompt', p);
            sbImages.slice(0, 3).forEach(function (img) { fd.append('images', img.file, img.file.name); });
            var resp = await fetch(sbChatUrl(), { method: 'POST', headers: { 'X-API-Key': API_KEY }, body: fd });
            var data = await resp.json();
            var text = (data.response || data.text || '').trim();
            var match = text.match(/\{[\s\S]*?\}/);
            if (match) {
                try {
                    var parsed = JSON.parse(match[0]);
                    sbStoryContext = {
                        style: (parsed.style || '').trim(),
                        characters: (parsed.characters || '').trim(),
                        setting: (parsed.setting || '').trim()
                    };
                } catch (e) {}
            }
        } catch (e) {
            console.error('sbAnalyzeContext error:', e);
        }
    }

    async function sbHandleGenerate() {
        if (sbIsGenerating) return;
        var conceptInput = document.getElementById('sboard-concept');
        var concept = conceptInput ? conceptInput.value.trim() : '';
        var sceneNum = parseInt(document.getElementById('sboard-scene-count')?.value || '4');
        sbSceneCount = sceneNum;

        var newScenes = [];
        for (var i = 0; i < sceneNum; i++) {
            newScenes.push({ id: i, prompt: '', status: 'idle', imageUrl: null, error: null });
        }
        sbScenes = newScenes;
        sbIsGenerating = true;
        sbPrevRefinedPrompt = null;
        sbStoryContext = null;
        sbPrevGeneratedBlob = null;

        var genBtn = document.getElementById('sboard-generate-btn');
        if (genBtn) {
            genBtn.disabled = true;
            genBtn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;vertical-align:middle;margin-right:6px;"></span>Generating...';
        }

        sbRenderScenes();

        var progressBar = document.getElementById('sboard-progress-bar');
        var progressFill = document.getElementById('sboard-progress-fill');
        var progressText = document.getElementById('sboard-progress-text');
        if (progressBar) progressBar.classList.remove('hidden');
        if (progressFill) progressFill.style.width = '0%';
        if (progressText) progressText.textContent = 'Menganalisa gaya visual referensi...';
        await sbAnalyzeContext(concept);
        if (progressText) progressText.textContent = '0/' + sbScenes.length + ' scene selesai';

        var completed = 0;
        var total = sbScenes.length;

        for (var j = 0; j < sbScenes.length; j++) {
            var scene = sbScenes[j];
            scene.status = 'generating';
            sbUpdateSceneCard(j);
            try {
                var refinedPrompt = await sbRefinePrompt(scene.prompt, concept, j, total);
                var imageUrl = await sbGenerateImage(refinedPrompt);
                scene.prompt = refinedPrompt;
                scene.imageUrl = imageUrl;
                scene.status = 'done';
                sbPrevRefinedPrompt = refinedPrompt;
                sbPrevGeneratedBlob = await sbFetchAsBlob(imageUrl);
            } catch (e) {
                scene.status = 'error';
                scene.error = e.message || 'Gagal generate';
            }
            sbUpdateSceneCard(j);
            completed++;
            var pct = Math.round((completed / total) * 100);
            if (progressFill) progressFill.style.width = pct + '%';
            if (progressText) progressText.textContent = completed + '/' + total + ' scene selesai';
        }

        sbIsGenerating = false;
        if (genBtn) {
            genBtn.disabled = false;
            genBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;vertical-align:middle;margin-right:6px;"><polygon points="5 3 19 12 5 21 5 3"/></svg>Generate Storyboard';
        }
        if (progressBar) setTimeout(function () { progressBar.classList.add('hidden'); }, 3000);

        var allDone = sbScenes.every(function (s) { return s.status === 'done'; });
        if (allDone && typeof window.doneSound === 'function') window.doneSound();
    }

    async function sbRefinePrompt(scenePrompt, concept, sceneIdx, total) {
        if (!scenePrompt && !concept) return 'cinematic scene ' + (sceneIdx + 1);
        try {
            var fd = new FormData();
            var prevCtx = sbPrevRefinedPrompt ? 'Previous scene prompt: "' + sbPrevRefinedPrompt + '". ' : '';

            var styleCtx = '';
            if (sbStoryContext) {
                if (sbStoryContext.style)      styleCtx += 'Art style: ' + sbStoryContext.style + '. ';
                if (sbStoryContext.characters) styleCtx += 'Characters: ' + sbStoryContext.characters + '. ';
                if (sbStoryContext.setting)    styleCtx += 'Setting: ' + sbStoryContext.setting + '. ';
            }

            var p = 'You are writing image generation prompts for a STORYBOARD series. ' +
                'STRICT RULES — you MUST follow all of these: ' +
                '(1) KEEP the EXACT same visual art style throughout — do NOT switch from anime to photorealistic or vice versa. ' +
                '(2) KEEP the EXACT same characters with same appearance, same clothing, same hair. ' +
                '(3) KEEP a CONSISTENT background/environment that matches the overall concept. ' +
                (styleCtx ? 'STORYBOARD CONTEXT (MUST FOLLOW): ' + styleCtx : '') +
                (prevCtx ? prevCtx : '') +
                'Now write the image prompt for SCENE ' + (sceneIdx + 1) + ' of ' + total + ': ' +
                '"' + (scenePrompt || concept) + '". Overall concept: "' + concept + '". ' +
                'Output ONLY the image prompt (max 80 words). No titles, no explanations.';

            fd.append('prompt', p);
            sbImages.slice(0, 2).forEach(function (img) { fd.append('images', img.file, img.file.name); });
            if (sbPrevGeneratedBlob && sceneIdx > 0) {
                fd.append('images', sbPrevGeneratedBlob, 'prev_scene_ref.png');
            }
            var resp = await fetch(sbChatUrl(), { method: 'POST', headers: { 'X-API-Key': API_KEY }, body: fd });
            var data = await resp.json();
            return ((data.response || data.text || scenePrompt || concept) + '').trim();
        } catch (e) {
            return scenePrompt || concept || 'cinematic scene';
        }
    }

    async function sbGenerateImage(prompt) {
        var fd = new FormData();
        fd.append('instruction', prompt + ', no text, no words, no letters, no typography, no watermark');
        fd.append('aspectRatio', sbAspectRatio);
        sbImages.slice(0, 2).forEach(function (img) { fd.append('images', img.file, img.file.name); });
        if (sbPrevGeneratedBlob) {
            fd.append('images', sbPrevGeneratedBlob, 'prev_scene_ref.png');
        }
        var resp = await fetch(sbGenerateUrl(), { method: 'POST', headers: { 'X-API-Key': API_KEY }, body: fd });
        var data = await resp.json();
        if (!data.success) throw new Error(data.error || data.message || 'Gagal generate gambar');
        var url = data.imageUrl || (data.images && data.images[0]) || '';
        if (!url) throw new Error('Tidak ada gambar dihasilkan');
        return url;
    }

    async function sbRegenerateScene(idx) {
        if (sbIsGenerating) return;
        var scene = sbScenes[idx];
        if (!scene) return;
        var conceptInput = document.getElementById('sboard-concept');
        var concept = conceptInput ? conceptInput.value.trim() : '';
        var promptEl = document.getElementById('sboard-scene-prompt-' + idx);
        if (promptEl && promptEl.value.trim()) scene.prompt = promptEl.value.trim();
        scene.status = 'generating';
        scene.imageUrl = null;
        scene.error = null;
        sbUpdateSceneCard(idx);
        sbIsGenerating = true;
        try {
            var refinedPrompt = await sbRefinePrompt(scene.prompt, concept, idx, sbScenes.length);
            var imageUrl = await sbGenerateImage(refinedPrompt);
            scene.prompt = refinedPrompt;
            scene.imageUrl = imageUrl;
            scene.status = 'done';
        } catch (e) {
            scene.status = 'error';
            scene.error = e.message || 'Gagal';
        }
        sbIsGenerating = false;
        sbUpdateSceneCard(idx);
    }

    function sbRenderScenes() {
        var grid = document.getElementById('sboard-scenes-grid');
        var empty = document.getElementById('sboard-empty-state');
        if (!grid) return;
        if (sbScenes.length === 0) {
            grid.classList.add('hidden');
            if (empty) empty.classList.remove('hidden');
            return;
        }
        grid.classList.remove('hidden');
        if (empty) empty.classList.add('hidden');
        grid.innerHTML = '';
        sbScenes.forEach(function (scene, i) {
            var card = document.createElement('div');
            card.id = 'sboard-scene-card-' + i;
            card.className = 'bg-white rounded-2xl border border-slate-200 shadow-sm';
            grid.appendChild(card);
            sbUpdateSceneCard(i);
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function sbUpdateSceneCard(i) {
        var card = document.getElementById('sboard-scene-card-' + i);
        if (!card) return;
        var scene = sbScenes[i];
        var arStyle = sbGetAspectStyle(sbAspectRatio);
        var imageArea = '';

        if (scene.status === 'idle') {
            imageArea = '<div class="sboard-status-area sboard-idle" style="width:100%;aspect-ratio:' + (sbAspectRatio.replace(':','/')) + ';background:#f8fafc;display:flex;align-items:center;justify-content:center;border-radius:14px 14px 0 0;">' +
                '<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#cbd5e1" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>';
        } else if (scene.status === 'generating') {
            imageArea = '<div class="sboard-status-area sboard-generating" style="width:100%;aspect-ratio:' + (sbAspectRatio.replace(':','/')) + ';background:#f8fafc;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border-radius:14px 14px 0 0;">' +
                '<div style="width:32px;height:32px;border:4px solid #e9d5ff;border-top-color:#7c3aed;border-radius:50%;animation:spin 0.7s linear infinite;"></div>' +
                '<p style="font-size:11px;color:#94a3b8;">Generating...</p></div>';
        } else if (scene.status === 'done' && scene.imageUrl) {
            imageArea = '<div class="sboard-img-wrap" style="width:100%;aspect-ratio:' + (sbAspectRatio.replace(':','/')) + ';position:relative;overflow:hidden;border-radius:14px 14px 0 0;cursor:zoom-in;">' +
                '<img src="' + scene.imageUrl + '" class="sboard-preview-img" data-url="' + scene.imageUrl + '" data-scene="' + (i+1) + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" loading="lazy">' +
                '<a href="' + scene.imageUrl + '" download="storyboard_scene_' + (i + 1) + '.png" style="position:absolute;bottom:8px;right:8px;padding:6px;background:rgba(255,255,255,0.9);border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.15);display:flex;z-index:2;" title="Unduh" onclick="event.stopPropagation()">' +
                '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
                '</a></div>';
        } else if (scene.status === 'error') {
            imageArea = '<div class="sboard-error-area" style="width:100%;aspect-ratio:' + (sbAspectRatio.replace(':','/')) + ';background:#fef2f2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:16px;box-sizing:border-box;border-radius:14px 14px 0 0;">' +
                '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
                '<p style="font-size:11px;color:#ef4444;text-align:center;">' + (scene.error || 'Error') + '</p></div>';
        }

        var currentPrompt = scene.prompt || '';
        card.innerHTML = imageArea +
            '<div style="padding:10px 12px 12px;">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">' +
            '<span style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;">Scene ' + (i + 1) + ' — Prompt</span>' +
            '<button class="sboard-regen-btn" data-idx="' + i + '" title="Regenerate" style="padding:4px 6px;border-radius:7px;background:#f1f5f9;border:none;cursor:pointer;color:#64748b;display:flex;align-items:center;gap:3px;font-size:10px;font-weight:600;">' +
            '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>Ulang' +
            '</button></div>' +
            '<div style="position:relative;">' +
            '<textarea id="sboard-scene-prompt-' + i + '" rows="4" placeholder="Tulis prompt untuk scene ' + (i + 1) + '..." style="width:100%;font-size:11px;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:7px 10px 28px 10px;resize:none;outline:none;box-sizing:border-box;font-family:inherit;line-height:1.5;">' + sbEscape(currentPrompt) + '</textarea>' +
            '<button class="sboard-copy-btn" data-idx="' + i + '" title="Salin prompt" style="position:absolute;bottom:6px;right:7px;padding:3px 7px;border-radius:6px;background:#e2e8f0;border:none;cursor:pointer;color:#64748b;display:flex;align-items:center;gap:3px;font-size:10px;font-weight:600;">' +
            '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>Salin' +
            '</button></div>' +
            '</div>';

        card.querySelector('.sboard-regen-btn').addEventListener('click', function (e) {
            e.preventDefault();
            sbRegenerateScene(parseInt(this.dataset.idx));
        });
        card.querySelector('.sboard-copy-btn').addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var ta = document.getElementById('sboard-scene-prompt-' + this.dataset.idx);
            var text = ta ? ta.value : currentPrompt;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(function () {
                    var btn = e.currentTarget;
                    var orig = btn.innerHTML;
                    btn.innerHTML = '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Tersalin';
                    btn.style.color = '#22c55e';
                    setTimeout(function () { btn.innerHTML = orig; btn.style.color = ''; }, 1500);
                });
            }
        });
        var imgEl = card.querySelector('.sboard-preview-img');
        if (imgEl) {
            imgEl.addEventListener('click', function () {
                sbShowImageModal(this.dataset.url, 'Scene ' + this.dataset.scene);
            });
        }
    }

    function sbShowImageModal(url, title) {
        var existing = document.getElementById('sboard-img-modal');
        if (existing) existing.remove();
        var modal = document.createElement('div');
        modal.id = 'sboard-img-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;cursor:zoom-out;';
        modal.innerHTML =
            '<div style="width:100%;max-width:860px;" onclick="event.stopPropagation()">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
            '<span style="color:#f1f5f9;font-size:13px;font-weight:700;">' + title + '</span>' +
            '<div style="display:flex;gap:8px;">' +
            '<a href="' + url + '" download="storyboard_' + title.replace(/\s+/g,'-').toLowerCase() + '.png" style="padding:6px 12px;border-radius:9px;background:#334155;color:#f1f5f9;font-size:12px;font-weight:600;text-decoration:none;display:flex;align-items:center;gap:5px;"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Unduh</a>' +
            '<button id="sboard-img-modal-close" style="padding:6px 10px;border-radius:9px;background:#334155;border:none;color:#f1f5f9;cursor:pointer;font-size:18px;line-height:1;display:flex;align-items:center;">&times;</button>' +
            '</div></div>' +
            '<img src="' + url + '" style="width:100%;max-height:80vh;object-fit:contain;border-radius:14px;display:block;box-shadow:0 20px 60px rgba(0,0,0,0.5);">' +
            '</div>';
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        modal.addEventListener('click', function () { sbCloseImageModal(); });
        document.getElementById('sboard-img-modal-close').addEventListener('click', function (e) { e.stopPropagation(); sbCloseImageModal(); });
        var onKey = function (e) { if (e.key === 'Escape') { sbCloseImageModal(); document.removeEventListener('keydown', onKey); } };
        document.addEventListener('keydown', onKey);
    }

    function sbCloseImageModal() {
        var modal = document.getElementById('sboard-img-modal');
        if (modal) { modal.remove(); document.body.style.overflow = ''; }
    }

    function sbEscape(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function sbObserveTab() {
        var content = document.getElementById('content-storyboard');
        if (!content) return;
        // Fire immediately if already active
        if (content.classList.contains('is-active')) {
            sbInit();
        }
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (m) {
                if (m.type === 'attributes' && m.attributeName === 'class') {
                    if (content.classList.contains('is-active')) {
                        sbInit();
                    }
                }
            });
        });
        observer.observe(content, { attributes: true, attributeFilter: ['class'] });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', sbObserveTab);
    } else {
        sbObserveTab();
    }

    // Add spin keyframe if not present
    if (!document.getElementById('sb-spin-style')) {
        var style = document.createElement('style');
        style.id = 'sb-spin-style';
        style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
        document.head.appendChild(style);
    }

})();
