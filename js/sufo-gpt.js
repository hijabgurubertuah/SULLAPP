document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('sfgpt-app');
    const locked = document.getElementById('sfgpt-locked');
    const openAddonsBtn = document.getElementById('sfgpt-open-addons-btn');
    const messagesEl = document.getElementById('sfgpt-messages');
    const threadEl = document.getElementById('sfgpt-thread');
    const starterEl = document.getElementById('sfgpt-starter');
    const form = document.getElementById('sfgpt-form');
    const input = document.getElementById('sfgpt-input');
    const sendBtn = document.getElementById('sfgpt-send-btn');
    const fileInput = document.getElementById('sfgpt-file-input');
    const addImageBtn = document.getElementById('sfgpt-add-image-btn');
    const browsePromptsBtn = document.getElementById('sfgpt-browse-prompts');
    const attachmentsEl = document.getElementById('sfgpt-attachments');
    const toolsBtn = document.getElementById('sfgpt-tools-btn');
    const toolsMenu = document.getElementById('sfgpt-tools-menu');
    const webSearchBtn = document.getElementById('sfgpt-websearch-btn');
    const modePill = document.getElementById('sfgpt-mode-pill');
    const suggestBtns = document.querySelectorAll('.sfgpt-suggest');
    const genOptionsEl = document.getElementById('sfgpt-gen-options');
    const aspectRatioEl = document.getElementById('sfgpt-aspect-ratio');
    const imageCountEl = document.getElementById('sfgpt-image-count');
    const countWrapEl = document.getElementById('sfgpt-count-wrap');
    const editRatioNoteEl = document.getElementById('sfgpt-edit-ratio-note');

    if (!app || !messagesEl || !form || !input || !sendBtn) return;

    const ADDON_CHECK_ENDPOINT = '/server/addons_payment.php';
    const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
    const SUPPORTED_ASPECT_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9'];

    let currentMode = 'chat';
    let attachments = [];
    let history = [];
    let isBusy = false;
    let webSearchEnabled = false;
    const addonActiveCache = new Map();

    const openSfgptImagePreview = (url) => {
        if (!url) return;
        const previewModalImg = document.getElementById('preview-modal-img');
        const imagePreviewModal = document.getElementById('image-preview-modal');
        if (previewModalImg && imagePreviewModal) {
            previewModalImg.src = url;
            imagePreviewModal.classList.remove('opacity-0', 'pointer-events-none');
        }
    };

    const extractChatText = (result) => {
        const text = (result && result.success && result.response)
            ? result.response
            : (result?.response || result?.candidates?.[0]?.content?.parts?.[0]?.text || '');
        return String(text || '').trim();
    };

    const extractGenerateImageUrl = (result) => {
        if (!result) return '';
        if (result.success && result.imageUrl) return String(result.imageUrl || '');
        if (Array.isArray(result.images) && result.images.length) return String(result.images[0] || '');
        if (Array.isArray(result.imageUrls) && result.imageUrls.length) return String(result.imageUrls[0] || '');
        if (result.data && result.data.imageUrl) return String(result.data.imageUrl || '');
        return '';
    };

    const getNearestAspectRatio = (width, height) => {
        const w = Number(width) || 0;
        const h = Number(height) || 0;
        if (w <= 0 || h <= 0) return '1:1';
        const r = w / h;
        const candidates = [
            { v: '1:1', r: 1 },
            { v: '3:4', r: 3 / 4 },
            { v: '4:3', r: 4 / 3 },
            { v: '9:16', r: 9 / 16 },
            { v: '16:9', r: 16 / 9 }
        ];
        let best = candidates[0];
        let bestDiff = Math.abs(r - best.r);
        for (const c of candidates) {
            const diff = Math.abs(r - c.r);
            if (diff < bestDiff) {
                best = c;
                bestDiff = diff;
            }
        }
        return best.v;
    };

    const getNearestAspectRatioFromFile = (file) => {
        return new Promise((resolve) => {
            try {
                const url = URL.createObjectURL(file);
                const img = new Image();
                img.onload = () => {
                    const ratio = getNearestAspectRatio(img.naturalWidth, img.naturalHeight);
                    URL.revokeObjectURL(url);
                    resolve(ratio);
                };
                img.onerror = () => {
                    URL.revokeObjectURL(url);
                    resolve('1:1');
                };
                img.src = url;
            } catch (_) {
                resolve('1:1');
            }
        });
    };

    const getApiConfig = async () => {
        const rawBaseUrl = String(window.BASE_URL || '');
        const baseUrls = rawBaseUrl.split(',').map(u => u.trim()).filter(Boolean);
        const randomIndex = baseUrls.length > 0 ? Math.floor(Math.random() * baseUrls.length) : -1;
        const randomBase = randomIndex !== -1 ? baseUrls[randomIndex] : rawBaseUrl;
        const baseUrlClean = String(randomBase || '').replace(/\/$/, '');
        const serverIndex = randomIndex !== -1 ? randomIndex + 1 : null;

        const apiHeaders = {};
        if (window.API_KEY) apiHeaders['X-API-Key'] = window.API_KEY;

        if (baseUrlClean && typeof window.ensureFrontendToken === 'function') {
            try {
                const token = await window.ensureFrontendToken(baseUrlClean);
                if (token) apiHeaders['Authorization'] = `Bearer ${token}`;
            } catch (_) { }
        }

        const chatEndpoint = `${baseUrlClean}/chat`;
        const chatWebEndpoint = `${baseUrlClean}/chatweb`;
        const generateEndpoint = `${baseUrlClean}/generate`;

        return { chatEndpoint, chatWebEndpoint, generateEndpoint, apiHeaders, serverIndex };
    };

    const getSelectedAspectRatio = () => {
        const raw = aspectRatioEl ? String(aspectRatioEl.value || '').trim() : '';
        return SUPPORTED_ASPECT_RATIOS.includes(raw) ? raw : '1:1';
    };

    const getSelectedImageCount = () => {
        const raw = imageCountEl ? parseInt(String(imageCountEl.value || '1'), 10) : 1;
        const count = Number.isFinite(raw) ? raw : 1;
        return Math.max(1, Math.min(4, count));
    };

    const updateGenOptionsUi = async () => {
        if (!genOptionsEl || !aspectRatioEl || !countWrapEl || !editRatioNoteEl) return;
        if (currentMode === 'create' || currentMode === 'edit') {
            genOptionsEl.classList.remove('hidden');
        } else {
            genOptionsEl.classList.add('hidden');
            return;
        }

        if (currentMode === 'create') {
            countWrapEl.classList.remove('hidden');
            editRatioNoteEl.classList.add('hidden');
            aspectRatioEl.disabled = false;
            aspectRatioEl.classList.remove('opacity-60');
            return;
        }

        countWrapEl.classList.add('hidden');
        editRatioNoteEl.classList.remove('hidden');
        aspectRatioEl.disabled = true;
        aspectRatioEl.classList.add('opacity-60');

        const file = attachments && attachments[0] ? attachments[0].file : null;
        if (file) {
            const ratio = await getNearestAspectRatioFromFile(file);
            aspectRatioEl.value = ratio;
        }
    };

    const setMode = (mode) => {
        currentMode = mode;
        updateGenOptionsUi();
        if (!modePill) return;
        if (mode === 'create') {
            modePill.textContent = 'Buat gambar';
            modePill.className = 'inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700';
            return;
        }
        if (mode === 'edit') {
            modePill.textContent = 'Edit gambar';
            modePill.className = 'inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-700';
            return;
        }
        modePill.textContent = 'Chat';
        modePill.className = 'inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-700';
    };

    const hideToolsMenu = () => {
        if (!toolsMenu) return;
        toolsMenu.classList.add('hidden');
    };

    const showToolsMenu = () => {
        if (!toolsMenu) return;
        toolsMenu.classList.remove('hidden');
        if (window.lucide && window.lucide.createIcons) {
            window.lucide.createIcons({ root: toolsMenu });
        }
    };

    const scrollToBottom = () => {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    };

    const escapeHtml = (text) => {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    const renderMarkdown = (text) => {
        const raw = String(text || '');
        let safe = escapeHtml(raw);

        const codeBlocks = [];
        safe = safe.replace(/```([\s\S]*?)```/g, (_, code) => {
            const idx = codeBlocks.length;
            codeBlocks.push(String(code || '').replace(/^\n+|\n+$/g, ''));
            return `@@SFGPT_CODEBLOCK_${idx}@@`;
        });

        safe = safe.replace(/^###\s+(.+)$/gm, '<div class="text-sm font-extrabold text-slate-900">$1</div>');
        safe = safe.replace(/^##\s+(.+)$/gm, '<div class="text-base font-extrabold text-slate-900">$1</div>');
        safe = safe.replace(/^#\s+(.+)$/gm, '<div class="text-lg font-extrabold text-slate-900">$1</div>');

        safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-teal-600 font-semibold hover:underline">$1</a>');
        safe = safe.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-teal-600 font-semibold hover:underline">$1</a>');

        safe = safe.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[12px] font-mono">$1</code>');
        safe = safe.replace(/\*\*([^*]+)\*\*/g, '<span class="font-extrabold">$1</span>');
        safe = safe.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<span class="italic">$2</span>');

        codeBlocks.forEach((code, idx) => {
            const html = `<pre class="mt-2 w-full overflow-auto rounded-xl bg-slate-900 text-slate-100 p-3 text-[12px] leading-relaxed"><code class="font-mono">${code}</code></pre>`;
            safe = safe.replace(`@@SFGPT_CODEBLOCK_${idx}@@`, html);
        });

        const lines = safe.split('\n');
        const out = [];
        let ulOpen = false;
        let olOpen = false;
        const closeLists = () => {
            if (ulOpen) {
                out.push('</ul>');
                ulOpen = false;
            }
            if (olOpen) {
                out.push('</ol>');
                olOpen = false;
            }
        };

        for (const lineRaw of lines) {
            const line = String(lineRaw || '');
            if (!line.trim()) {
                closeLists();
                out.push('<div class="h-2"></div>');
                continue;
            }
            const ul = line.match(/^\s*-\s+(.+)$/);
            const ol = line.match(/^\s*(\d+)\.\s+(.+)$/);
            if (ul) {
                if (!ulOpen) {
                    closeLists();
                    ulOpen = true;
                    out.push('<ul class="list-disc pl-5 space-y-1">');
                }
                out.push(`<li>${ul[1]}</li>`);
                continue;
            }
            if (ol) {
                if (!olOpen) {
                    closeLists();
                    olOpen = true;
                    out.push('<ol class="list-decimal pl-5 space-y-1">');
                }
                out.push(`<li>${ol[2]}</li>`);
                continue;
            }
            closeLists();
            out.push(`<div>${line}</div>`);
        }
        closeLists();

        return `<div class="space-y-1">${out.join('')}</div>`;
    };

    const buildAttachmentThumb = (att, idx) => {
        const wrap = document.createElement('div');
        wrap.className = 'inline-flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2 py-2';
        wrap.innerHTML = `
            <img src="${att.dataUrl}" class="w-10 h-10 rounded-lg object-cover border border-slate-200" alt="attachment">
            <div class="flex flex-col">
                <div class="text-[10px] font-bold text-slate-700 leading-none">Gambar ${idx + 1}</div>
                <div class="text-[9px] text-slate-400 mt-1">${Math.round(att.file.size / 1024)} KB</div>
            </div>
            <button type="button" class="sfgpt-remove-attachment w-8 h-8 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center" data-index="${idx}">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        `;
        return wrap;
    };

    const renderAttachments = () => {
        if (!attachmentsEl) return;
        if (!attachments.length) {
            attachmentsEl.classList.add('hidden');
            attachmentsEl.innerHTML = '';
            return;
        }
        attachmentsEl.classList.remove('hidden');
        attachmentsEl.className = 'mb-2 flex flex-wrap gap-2';
        attachmentsEl.innerHTML = '';
        attachments.forEach((att, idx) => {
            attachmentsEl.appendChild(buildAttachmentThumb(att, idx));
        });
        if (window.lucide && window.lucide.createIcons) {
            window.lucide.createIcons({ root: attachmentsEl });
        }
    };

    const addMessage = ({ role, text, imageUrl, images, resultImages }) => {
        const wrapper = document.createElement('div');
        wrapper.className = role === 'user' ? 'flex justify-end' : 'flex justify-start';

        const bubble = document.createElement('div');
        bubble.className = role === 'user'
            ? 'max-w-[92%] md:max-w-[75%] bg-gradient-to-br from-teal-500/25 via-sky-500/20 to-indigo-500/25 text-slate-900 rounded-3xl px-4 py-3 border border-white/70 backdrop-blur'
            : 'max-w-[92%] md:max-w-[75%] bg-white/90 backdrop-blur text-slate-800 rounded-3xl px-4 py-3 border border-slate-200';

        const body = document.createElement('div');
        body.className = 'text-sm leading-relaxed';
        body.innerHTML = renderMarkdown(text);
        bubble.appendChild(body);

        if (Array.isArray(images) && images.length) {
            const imgs = images;
            const grid = document.createElement('div');
            grid.className = 'mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2';
            imgs.forEach((u) => {
                if (!u) return;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50';
                btn.dataset.previewUrl = u;
                btn.innerHTML = `<img src="${u}" class="w-full h-28 object-cover block" alt="attachment">`;
                grid.appendChild(btn);
            });
            bubble.appendChild(grid);
        }

        if (Array.isArray(resultImages) && resultImages.length) {
            const imgs = resultImages;
            const grid = document.createElement('div');
            grid.className = 'mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2';
            imgs.forEach((u, idx) => {
                if (!u) return;
                const cell = document.createElement('div');
                cell.className = 'relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50';
                cell.innerHTML = `
                    <img src="${u}" class="w-full h-36 object-cover block" alt="result-${idx + 1}">
                    <div class="absolute top-2 right-2 flex items-center gap-2">
                        <button type="button" class="sfgpt-view-result w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center border border-slate-200" data-url="${u}" title="Lihat">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        <a href="${u}" download="sufo-gpt-${idx + 1}.png" class="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center border border-slate-200" title="Unduh">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </a>
                    </div>
                `;
                grid.appendChild(cell);
            });
            bubble.appendChild(grid);
        }

        if (imageUrl) {
            const imgWrap = document.createElement('div');
            imgWrap.className = 'mt-3';
            imgWrap.innerHTML = `
                <div class="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img src="${imageUrl}" alt="result" class="w-full h-auto block">
                    <div class="absolute top-2 right-2 flex items-center gap-2">
                        <button type="button" class="sfgpt-view-result w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center border border-slate-200" data-url="${imageUrl}" title="Lihat">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        <button type="button" class="sfgpt-upscale-result w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center border border-slate-200 hidden" data-url="${imageUrl}" title="Upscale 4K">
                            <i data-lucide="scan-line" class="w-4 h-4 text-teal-500"></i>
                        </button>
                        <a href="${imageUrl}" download="sufo-gpt.png" class="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center border border-slate-200" title="Unduh">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </a>
                    </div>
                </div>
            `;
            bubble.appendChild(imgWrap);
        }

        wrapper.appendChild(bubble);
        (threadEl || messagesEl).appendChild(wrapper);
        if (window.lucide && window.lucide.createIcons) {
            window.lucide.createIcons({ root: wrapper });
        }
        scrollToBottom();
        return wrapper;
    };

    const setTypingLabel = (label) => {
        const el = document.getElementById('sfgpt-typing-label');
        if (el) el.textContent = label;
    };

    const showTyping = (label = 'SuFo GPT sedang berfikir...') => {
        const wrapper = document.createElement('div');
        wrapper.id = 'sfgpt-typing';
        wrapper.className = 'flex justify-start';
        wrapper.innerHTML = `
            <div class="max-w-[90%] md:max-w-[75%] bg-white text-slate-800 rounded-2xl px-4 py-3 border border-slate-200">
                <div class="flex items-center gap-3">
                    <div class="spinner"></div>
                    <div id="sfgpt-typing-label" class="text-xs font-bold text-slate-500"></div>
                </div>
            </div>
        `;
        (threadEl || messagesEl).appendChild(wrapper);
        setTypingLabel(label);
        scrollToBottom();
    };

    const hideTyping = () => {
        const el = document.getElementById('sfgpt-typing');
        if (el) el.remove();
    };

    const requestChat = async ({ promptText, files, chatEndpoint, apiHeaders, serverIndex }) => {
        const formData = new FormData();
        formData.append('prompt', promptText);
        (files || []).forEach((f) => {
            if (!f) return;
            formData.append('images', f, f.name || 'image.png');
        });

        const controller = new AbortController();
        let toast = null;
        if (window.showServerToast) {
            const msg = serverIndex ? `Memproses di server ${serverIndex}...` : 'Memproses...';
            toast = window.showServerToast(msg, () => {
                controller.abort();
            });
        }

        try {
            const resp = await fetch(chatEndpoint, {
                method: 'POST',
                headers: apiHeaders || {},
                body: formData,
                signal: controller.signal
            });
            if (!resp.ok) {
                // Check for error response
                try {
                    const errorData = await resp.json();
                    const errorMsg = errorData?.error || errorData?.message || 'Gagal memproses /chat.';
                    throw new Error(errorMsg);
                } catch (e) {
                    throw e;
                }
            }
            const result = await resp.json();
            const text = extractChatText(result);
            if (!text) throw new Error('Jawaban kosong dari /chat.');
            return text;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Proses dibatalkan oleh user');
            }
            throw error;
        } finally {
            if (toast && typeof toast.remove === 'function') toast.remove();
        }
    };

    const requestGenerate = async ({ formData, generateEndpoint, apiHeaders, serverIndex }) => {
        const controller = new AbortController();
        let toast = null;
        if (window.showServerToast) {
            const msg = serverIndex ? `Memproses di server ${serverIndex}...` : 'Memproses...';
            toast = window.showServerToast(msg, () => {
                controller.abort();
            });
        }

        try {
            const resp = await fetch(generateEndpoint, {
                method: 'POST',
                headers: apiHeaders || {},
                body: formData,
                signal: controller.signal
            });
            if (!resp.ok) {
                // Check for error response
                try {
                    const errorData = await resp.json();
                    const errorMsg = errorData?.error || errorData?.message || 'Gagal memproses /generate.';
                    throw new Error(errorMsg);
                } catch (e) {
                    throw e;
                }
            }
            const result = await resp.json();
            const imageUrl = extractGenerateImageUrl(result);
            if (!imageUrl) throw new Error('Hasil gambar tidak ditemukan.');
            return imageUrl;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Proses dibatalkan oleh user');
            }
            throw error;
        } finally {
            if (toast && typeof toast.remove === 'function') toast.remove();
        }
    };

    const buildHistoryBlock = () => {
        const sliced = history.slice(-12);
        return sliced.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
    };

    const isAnalysisRequest = (text) => {
        const t = String(text || '').toLowerCase();
        return /(extract|ekstrak|baca|bacakan|bacain|analisa|analisis|analyze|describe|deskripsikan|jelaskan|terjemahkan|translate|ocr|tulisan|teks|text|isi|konten|caption|keterangan|apa itu|apa ini|apa yang|ceritakan|identifikasi|kenali|lihat|cek|periksa|review|rangkum|summarize|ringkas)/i.test(t);
    };

    const normalizeModeFromText = ({ text, hasImage }) => {
        const t = String(text || '').toLowerCase();
        const wantsAnalyze = isAnalysisRequest(t);
        const wantsCreate = /(buat|bikin|generate|gambar|ilustrasi|poster|logo|desain)/i.test(t) && /(buat|bikin|generate)/i.test(t);
        const wantsEdit = /(edit|ubah|ganti|hapus|remove|retouch|perbaiki|cerahkan|jernihkan|haluskan|background|bg|jerawat|noise|blur)/i.test(t);
        if (hasImage && wantsAnalyze && !wantsCreate && !wantsEdit) return 'chat';
        if (hasImage && wantsCreate && !wantsEdit) return 'create';
        if (hasImage && wantsEdit) return 'edit';
        if (hasImage && !wantsCreate && !wantsEdit) return 'chat';
        if (wantsCreate) return 'create';
        if (wantsEdit) return 'edit';
        return 'chat';
    };

    const safeParseJsonObject = (text) => {
        const raw = String(text || '').trim();
        try {
            const direct = JSON.parse(raw);
            if (direct && typeof direct === 'object') return direct;
        } catch (_) { }
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) return null;
        const sliced = raw.slice(start, end + 1);
        try {
            const parsed = JSON.parse(sliced);
            if (parsed && typeof parsed === 'object') return parsed;
        } catch (_) { }
        return null;
    };

    const isExplicitImageCreateRequest = (text) => {
        const t = String(text || '');
        if (/(buatkan|bikinin|generate|buat|bikin)\s+(gambar|image|ilustrasi|poster|logo|desain)/i.test(t)) return true;
        if (/(buat|bikin|generate).*(thumbnail|poster|logo|banner|cover)/i.test(t)) return true;
        return false;
    };

    const isExplicitEditRequest = (text) => {
        const t = String(text || '');
        return /(edit|ubah|ganti|retouch|perbaiki|hapus|remove|bersihkan|cerahkan|jernihkan|haluskan|background|bg|jerawat|noise|blur)/i.test(t);
    };

    const isQuestionLike = (text) => {
        const t = String(text || '').trim().toLowerCase();
        if (!t) return false;
        if (t.includes('?')) return true;
        if (/^(apa|bagaimana|gimana|kenapa|mengapa|kapan|di mana|dimana|siapa|boleh|bisa|tolong jelaskan|tolong|coba)\b/i.test(t)) return true;
        if (/\b(ide|saran|rekomendasi|contoh|tips|judul|outline|daftar isi|struktur|ringkasan|rangkuman)\b/i.test(t)) return true;
        if (isAnalysisRequest(t)) return true;
        return false;
    };

    const classifyIntentAndExtract = async ({ userText, hasImage, selectedMode }) => {
        const historyBlock = buildHistoryBlock();
        const explicitCreate = isExplicitImageCreateRequest(userText);
        const explicitEdit = isExplicitEditRequest(userText);
        const questionLike = isQuestionLike(userText);

        if (selectedMode === 'create' && questionLike && !explicitCreate) {
            return { intent: 'chat', extracted: userText, needsImage: false, confidence: 1 };
        }
        if (selectedMode === 'edit' && questionLike && !explicitEdit) {
            return { intent: 'chat', extracted: userText, needsImage: false, confidence: 1 };
        }

        const selected = (selectedMode === 'create' || selectedMode === 'edit' || selectedMode === 'chat') ? selectedMode : 'chat';
        const prompt = `Kamu adalah router intent untuk SuFo GPT.

Tugas:
1) Klasifikasikan intent user menjadi salah satu: "chat", "create", atau "edit".
2) Ekstrak 1 instruksi/permintaan final user yang jelas untuk dipakai sistem.

Konteks:
- selected_mode: ${selected}
- hasImage: ${hasImage ? 'true' : 'false'}

Riwayat:
${historyBlock || '(kosong)'}

Pesan user:
${userText}

Aturan output ketat:
- Kembalikan HANYA JSON valid (tanpa markdown, tanpa teks lain).
- Format: {"intent":"chat|create|edit","extracted":"...","needs_image":true|false,"confidence":0.0}
- intent "create" hanya jika user benar-benar ingin membuat/generate gambar BARU (bukan minta ide/outline/tips/penjelasan/analisa).
- Jika user minta ide ebook/outline/judul/strategi/promosi, itu intent "chat".
- PENTING: Jika user upload gambar lalu minta extract/baca/analisa/deskripsikan/jelaskan/terjemahkan/identifikasi isi gambar, itu intent "chat" (bukan create/edit). Analisis gambar = chat.
- Jika user minta "tolong extract tulisannya" atau "baca tulisan di gambar" atau "apa isi gambar ini" + ada gambar, itu PASTI intent "chat".
- Jika selected_mode "create" tapi user bertanya (minta ide/penjelasan/analisa), balas intent "chat".
- Jika selected_mode "edit" tapi user bertanya umum atau minta analisa, balas intent "chat".
- "extracted" harus ringkas namun lengkap; jangan menambahkan penjelasan.`;

        try {
            const { chatEndpoint, apiHeaders, serverIndex } = await getApiConfig();
            const raw = await requestChat({ promptText: prompt, files: [], chatEndpoint, apiHeaders, serverIndex });
            const data = safeParseJsonObject(raw);
            const fallback = normalizeModeFromText({ text: userText, hasImage });
            const intent = data && typeof data.intent === 'string' ? String(data.intent).toLowerCase() : fallback;
            const safeIntent = (intent === 'chat' || intent === 'create' || intent === 'edit') ? intent : fallback;
            const extracted = data && typeof data.extracted === 'string' && String(data.extracted).trim()
                ? String(data.extracted).trim()
                : userText;
            const needsImage = safeIntent === 'edit' && !hasImage;
            const confidenceNum = data && typeof data.confidence === 'number' ? data.confidence : null;
            const confidence = (typeof confidenceNum === 'number' && !Number.isNaN(confidenceNum)) ? confidenceNum : null;
            const postQuestionOverride = questionLike && !explicitCreate && safeIntent === 'create';
            const analysisOverride = hasImage && isAnalysisRequest(userText) && !explicitCreate && (safeIntent === 'create' || safeIntent === 'edit');
            const intentFinal = (postQuestionOverride || analysisOverride) ? 'chat' : safeIntent;
            return { intent: intentFinal, extracted, needsImage: intentFinal === 'edit' && !hasImage, confidence };
        } catch (e) {
            const fallback = normalizeModeFromText({ text: userText, hasImage });
            return { intent: fallback, extracted: userText, needsImage: fallback === 'edit' && !hasImage, confidence: null };
        }
    };

    const runChatFlow = async ({ userText, files, apiConfig }) => {
        const historyBlock = buildHistoryBlock();
        const prompt = `Kamu adalah SuFo GPT di aplikasi Sulap Foto.
Aturan:
- Bahasa Indonesia
- Jawab ringkas, jelas, dan membantu
- Jika user meminta edit foto tetapi tidak ada gambar terlampir, minta user menambahkan foto via tombol +.

Riwayat:
${historyBlock || '(kosong)'}

Pertanyaan user:
${userText}`;
        const endpoint = webSearchEnabled ? apiConfig.chatWebEndpoint : apiConfig.chatEndpoint;
        return await requestChat({ promptText: prompt, files, chatEndpoint: endpoint, apiHeaders: apiConfig.apiHeaders, serverIndex: apiConfig.serverIndex });
    };

    const runCreateFlow = async ({ userText, files, apiConfig }) => {
        const historyBlock = buildHistoryBlock();
        const prompt = `Kamu adalah prompt engineer untuk generator gambar.
Tugas: ubah permintaan user menjadi 1 instruksi generator gambar yang sangat detail.
Aturan output:
- Kembalikan HANYA instruksi final (tanpa markdown, tanpa JSON, tanpa penjelasan)
- Bahasa campuran diperbolehkan jika membantu kualitas prompt
- Sertakan style, lighting, composition, detail, dan larangan artifacts
- Jika user menyebut rasio (mis. 16:9), masukkan di instruksi sebagai "aspect ratio 16:9"

Riwayat (untuk konteks):
${historyBlock || '(kosong)'}

Permintaan user:
${userText}`;
        const enhanced = await requestChat({ promptText: prompt, files: [], chatEndpoint: apiConfig.chatEndpoint, apiHeaders: apiConfig.apiHeaders, serverIndex: apiConfig.serverIndex });
        const aspectRatio = getSelectedAspectRatio();
        const count = getSelectedImageCount();
        const formData = new FormData();
        formData.append('instruction', enhanced);
        formData.append('aspectRatio', aspectRatio);
        (files || []).forEach((f) => {
            if (!f) return;
            formData.append('images', f, f.name || 'ref.png');
        });
        const results = [];
        for (let i = 0; i < count; i++) {
            setTypingLabel(`SuFo GPT sedang membuat gambar (${i + 1}/${count})...`);
            const url = await requestGenerate({ formData, generateEndpoint: apiConfig.generateEndpoint, apiHeaders: apiConfig.apiHeaders, serverIndex: apiConfig.serverIndex });
            results.push(url);
        }
        return { enhanced, images: results, aspectRatio, count };
    };

    const runEditFlow = async ({ userText, file, apiConfig }) => {
        const prompt = `Kamu adalah prompt engineer untuk edit foto (image-to-image).
Tugas: tulis 1 instruksi edit yang jelas, aman, dan terarah.
Aturan output:
- Kembalikan HANYA instruksi final (tanpa markdown, tanpa JSON, tanpa penjelasan)
- Jangan menyebut "gunakan AI" atau proses teknis, hanya instruksi edit
- Pertahankan identitas wajah dan detail penting kecuali diminta berubah

Permintaan user:
${userText}`;
        const refined = await requestChat({ promptText: prompt, files: [], chatEndpoint: apiConfig.chatEndpoint, apiHeaders: apiConfig.apiHeaders, serverIndex: apiConfig.serverIndex });
        const aspectRatio = await getNearestAspectRatioFromFile(file);
        const formData = new FormData();
        formData.append('images', file, file.name || 'edit.png');
        formData.append('instruction', refined);
        formData.append('aspectRatio', aspectRatio);
        setTypingLabel('SuFo GPT sedang membuat gambar...');
        const imageUrl = await requestGenerate({ formData, generateEndpoint: apiConfig.generateEndpoint, apiHeaders: apiConfig.apiHeaders, serverIndex: apiConfig.serverIndex });
        return { refined, imageUrl, aspectRatio };
    };

    const updateWebSearchBtn = () => {
        if (!webSearchBtn) return;
        if (webSearchEnabled) {
            webSearchBtn.className = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-400 text-[11px] font-bold text-teal-700 hover:bg-teal-100 transition-all';
            const icon = webSearchBtn.querySelector('i[data-lucide]');
            if (icon) icon.className = 'w-3.5 h-3.5 text-teal-600';
        } else {
            webSearchBtn.className = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-all';
            const icon = webSearchBtn.querySelector('i[data-lucide]');
            if (icon) icon.className = 'w-3.5 h-3.5 text-slate-500';
        }
    };

    const setBusy = (busy) => {
        isBusy = busy;
        input.disabled = busy;
        addImageBtn.disabled = busy;
        if (toolsBtn) toolsBtn.disabled = busy;
        if (webSearchBtn) webSearchBtn.disabled = busy;
        sendBtn.disabled = busy || !String(input.value || '').trim();
    };

    const clearComposer = () => {
        input.value = '';
        attachments = [];
        renderAttachments();
        sendBtn.disabled = true;
        if (fileInput) fileInput.value = '';
    };

    const showStarter = () => {
        if (!starterEl) return;
        starterEl.classList.remove('hidden');
        if (threadEl) threadEl.classList.add('hidden');
        messagesEl.scrollTop = 0;
        if (window.lucide && window.lucide.createIcons) {
            window.lucide.createIcons({ root: starterEl });
        }
    };

    const hideStarter = () => {
        if (!starterEl) return;
        starterEl.classList.add('hidden');
        if (threadEl) threadEl.classList.remove('hidden');
    };

    const checkAddonActive = async () => {
        const email = localStorage.getItem('sulapfoto_verified_email');
        if (!email) return false;
        const cacheKey = `sufo_gpt::${email}`;
        if (addonActiveCache.has(cacheKey)) return addonActiveCache.get(cacheKey);
        try {
            const result = window.getAddonStatus
                ? await window.getAddonStatus(email, 'sufo_gpt')
                : await (await fetch(ADDON_CHECK_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_active_addon', email, addon_key: 'sufo_gpt' }) })).json();
            const ok = !!(result && result.success && result.is_active);
            addonActiveCache.set(cacheKey, ok);
            return ok;
        } catch (e) {
            return false;
        }
    };

    const checkAddonActiveKey = async (addonKey) => {
        const email = localStorage.getItem('sulapfoto_verified_email');
        if (!email) return false;
        const key = `${addonKey}::${email}`;
        if (addonActiveCache.has(key)) return addonActiveCache.get(key);
        try {
            const result = window.getAddonStatus
                ? await window.getAddonStatus(email, addonKey)
                : await (await fetch(ADDON_CHECK_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_active_addon', email, addon_key: addonKey }) })).json();
            const ok = !!(result && result.success && result.is_active);
            addonActiveCache.set(key, ok);
            return ok;
        } catch (e) {
            return false;
        }
    };

    const updateLockedState = async () => {
        const active = await checkAddonActive();
        if (active) {
            if (locked) locked.classList.add('hidden');
            app.classList.remove('hidden');
            return;
        }
        app.classList.add('hidden');
        if (locked) {
            locked.classList.remove('hidden');
            if (window.lucide && window.lucide.createIcons) {
                window.lucide.createIcons({ root: locked });
            }
        }
    };

    const handleSubmit = async (text) => {
        const userText = String(text || '').trim();
        if (!userText) return;
        if (isBusy) return;
        await updateLockedState();
        if (app.classList.contains('hidden')) return;

        hideStarter();
        const files = attachments.map(a => a.file).filter(Boolean);
        const userImages = attachments.map(a => a.dataUrl).filter(Boolean);
        const hasImage = files.length > 0;
        addMessage({ role: 'user', text: userText, images: userImages });
        history.push({ role: 'user', text: userText });
        if (history.length > 30) history = history.slice(-30);
        clearComposer();

        setBusy(true);
        showTyping('SuFo GPT sedang berfikir...');
        try {
            const apiConfig = await getApiConfig();

            const classified = await classifyIntentAndExtract({ userText, hasImage, selectedMode: currentMode });
            const effectiveMode = classified.intent;
            const extractedText = classified.extracted || userText;
            const needsImage = !!classified.needsImage;
            setMode(effectiveMode);

            if (effectiveMode === 'edit' && (!hasImage || needsImage)) {
                hideTyping();
                addMessage({ role: 'assistant', text: 'Untuk mode Edit, tambahkan 1 foto dulu lewat tombol +, lalu kirim instruksi editnya lagi.' });
                history.push({ role: 'assistant', text: 'Untuk mode Edit, tambahkan 1 foto dulu lewat tombol +, lalu kirim instruksi editnya lagi.' });
                return;
            }

            if (effectiveMode === 'create') {
                const { enhanced, images: resultImages } = await runCreateFlow({ userText: extractedText, files, apiConfig });
                hideTyping();
                let msgEl = null;
                if (Array.isArray(resultImages) && resultImages.length > 1) {
                    msgEl = addMessage({ role: 'assistant', text: `Selesai. Ini ${resultImages.length} hasil gambarnya.`, resultImages });
                } else {
                    msgEl = addMessage({ role: 'assistant', text: 'Selesai. Ini hasil gambarnya.', imageUrl: resultImages && resultImages[0] ? resultImages[0] : '' });
                }
                history.push({ role: 'assistant', text: enhanced });
                const canUpscale = await checkAddonActiveKey('auto_upscale');
                if (canUpscale) {
                    const btn = msgEl ? msgEl.querySelector('.sfgpt-upscale-result') : null;
                    if (btn) btn.classList.remove('hidden');
                }
                return;
            }
            if (effectiveMode === 'edit') {
                const { refined, imageUrl, aspectRatio } = await runEditFlow({ userText: extractedText, file: files[0], apiConfig });
                hideTyping();
                const msgEl = addMessage({ role: 'assistant', text: 'Siap. Ini hasil editnya.', imageUrl });
                history.push({ role: 'assistant', text: refined });
                const canUpscale = await checkAddonActiveKey('auto_upscale');
                if (canUpscale) {
                    const btn = msgEl ? msgEl.querySelector('.sfgpt-upscale-result') : null;
                    if (btn) btn.classList.remove('hidden');
                }
                if (aspectRatioEl) {
                    aspectRatioEl.value = aspectRatio;
                }
                return;
            }
            const answer = await runChatFlow({ userText: extractedText, files, apiConfig });
            hideTyping();
            addMessage({ role: 'assistant', text: answer });
            history.push({ role: 'assistant', text: answer });
        } catch (e) {
            hideTyping();
            addMessage({ role: 'assistant', text: String(e && e.message ? e.message : 'Terjadi kesalahan.') });
        } finally {
            setBusy(false);
        }
    };

    input.addEventListener('input', () => {
        sendBtn.disabled = isBusy || !String(input.value || '').trim();
    });

    if (openAddonsBtn) {
        openAddonsBtn.addEventListener('click', () => {
            if (typeof window.switchTab === 'function') {
                window.switchTab('addons');
            }
        });
    }

    if (addImageBtn && fileInput) {
        addImageBtn.addEventListener('click', () => {
            if (isBusy) return;
            fileInput.click();
        });
        fileInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;
            for (const file of files) {
                if (!file) continue;
                if (file.size > MAX_UPLOAD_BYTES) {
                    if (typeof window.showUploadLimitPopup === 'function') {
                        window.showUploadLimitPopup();
                    } else if (typeof window.showModernPopup === 'function') {
                        window.showModernPopup({ title: 'Ukuran file terlalu besar', message: 'Maksimal 15MB per gambar.', actionText: 'OK' });
                    }
                    continue;
                }
                const dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject(new Error('Gagal membaca file.'));
                    reader.readAsDataURL(file);
                });
                attachments.push({ file, dataUrl, mimeType: file.type || 'image/png' });
            }
            renderAttachments();
            updateGenOptionsUi();
        });
    }
    updateGenOptionsUi();

    if (browsePromptsBtn) {
        browsePromptsBtn.addEventListener('click', () => {
            if (!starterEl) return;
            const isHidden = starterEl.classList.contains('hidden');
            if (isHidden) showStarter();
            else hideStarter();
        });
    }

    document.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.sfgpt-remove-attachment');
        if (removeBtn) {
            const idx = parseInt(removeBtn.dataset.index, 10);
            if (!Number.isNaN(idx)) {
                attachments.splice(idx, 1);
                renderAttachments();
                updateGenOptionsUi();
            }
            return;
        }
        const viewBtn = e.target.closest('.sfgpt-view-result');
        if (viewBtn) {
            const url = viewBtn.dataset.url;
            if (url) {
                openSfgptImagePreview(url);
            }
            return;
        }
        const upscaleBtn = e.target.closest('.sfgpt-upscale-result');
        if (upscaleBtn) {
            const url = upscaleBtn.dataset.url;
            if (url && typeof window.openUpscaleModal === 'function') {
                window.openUpscaleModal(url);
            } else if (typeof window.showModernPopup === 'function') {
                window.showModernPopup({ title: 'Upscale belum siap', message: 'Fitur Upscale belum terpasang di halaman ini. Pastikan Addons Auto Upscale aktif dan halaman sudah dimuat ulang.', actionText: 'OK' });
            } else if (url) {
                openSfgptImagePreview(url);
            }
            return;
        }
        const attPreview = e.target.closest('[data-preview-url]');
        if (attPreview) {
            const url = attPreview.dataset.previewUrl;
            if (url) {
                openSfgptImagePreview(url);
            }
            return;
        }
        if (toolsMenu && toolsBtn) {
            const isToolsClick = toolsBtn.contains(e.target);
            const isMenuClick = toolsMenu.contains(e.target);
            if (!isToolsClick && !isMenuClick) hideToolsMenu();
        }
    });

    if (webSearchBtn) {
        webSearchBtn.addEventListener('click', () => {
            if (isBusy) return;
            webSearchEnabled = !webSearchEnabled;
            updateWebSearchBtn();
        });
    }

    if (toolsBtn) {
        toolsBtn.addEventListener('click', () => {
            if (isBusy) return;
            if (!toolsMenu) return;
            if (toolsMenu.classList.contains('hidden')) showToolsMenu();
            else hideToolsMenu();
        });
    }

    if (toolsMenu) {
        toolsMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.sfgpt-tool-item');
            if (!item) return;
            const mode = item.dataset.mode;
            if (mode) setMode(mode);
            hideToolsMenu();
        });
    }

    if (suggestBtns && suggestBtns.length) {
        suggestBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode || 'chat';
                const text = btn.dataset.text || '';
                setMode(mode);
                input.value = text;
                sendBtn.disabled = isBusy || !String(input.value || '').trim();
                input.focus();
                hideStarter();
            });
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSubmit(input.value);
    });

    setMode('chat');
    updateLockedState().then(() => {
        if (window.lucide && window.lucide.createIcons) {
            window.lucide.createIcons();
        }
    });
});
