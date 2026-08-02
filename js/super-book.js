document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('sb-app');
    const locked = document.getElementById('sb-locked');
    const openAddonsBtn = document.getElementById('sb-open-addons-btn');
    const newProjectBtn = document.getElementById('sb-new-project-btn');
    const headerSub = document.getElementById('sb-header-sub');
    const stepsIndicator = document.getElementById('sb-steps');

    if (!app) return;

    const ADDON_CHECK_ENDPOINT = '/server/addons_payment.php';
    let isBusy = false;

    // ── State ──
    let state = {
        type: '',
        idea: '',
        chapterCount: 5,
        wordCount: 1000,
        novelGenre: 'romance',
        novelPov: 'first',
        novelChapters: 7,
        komikPanels: 8,
        komikStyle: 'manga',
        language: 'indonesia',
        imageStyle: 'realistic',
        titles: [],
        selectedTitle: '',
        outline: [],
        results: []
    };

    const typeConfig = {
        ebook: { label: 'Ebook', color: 'emerald', icon: 'book-open', itemLabel: 'Bab' },
        artikel: { label: 'Artikel', color: 'blue', icon: 'file-text', itemLabel: 'Heading' },
        novel: { label: 'Novel', color: 'violet', icon: 'pen-tool', itemLabel: 'Bab' },
        komik: { label: 'Komik', color: 'orange', icon: 'image', itemLabel: 'Panel' }
    };

    // ── API ──
    const getApiConfig = async () => {
        const raw = String(window.BASE_URL || '');
        const urls = raw.split(',').map(u => u.trim()).filter(Boolean);
        const ri = urls.length > 0 ? Math.floor(Math.random() * urls.length) : -1;
        const base = (ri !== -1 ? urls[ri] : raw).replace(/\/$/, '');
        const h = {};
        if (window.API_KEY) h['X-API-Key'] = window.API_KEY;
        if (base && typeof window.ensureFrontendToken === 'function') {
            try { const t = await window.ensureFrontendToken(base); if (t) h['Authorization'] = `Bearer ${t}`; } catch (_) {}
        }
        return {
            chatEndpoint: `${base}/chat`,
            generateEndpoint: `${base}/generate`,
            apiHeaders: h
        };
    };

    const extractChatText = (r) => {
        const t = (r && r.success && r.response) ? r.response : (r?.response || r?.candidates?.[0]?.content?.parts?.[0]?.text || '');
        return String(t || '').trim();
    };

    const extractImageUrl = (r) => {
        if (!r) return '';
        if (r.success && r.imageUrl) return String(r.imageUrl);
        if (Array.isArray(r.images) && r.images.length) return String(r.images[0]);
        if (Array.isArray(r.imageUrls) && r.imageUrls.length) return String(r.imageUrls[0]);
        if (r.data && r.data.imageUrl) return String(r.data.imageUrl);
        return '';
    };

    async function callChat(prompt, systemPrompt, history = []) {
        const cfg = await getApiConfig();
        const messages = [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: prompt }];
        const resp = await fetch(cfg.chatEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...cfg.apiHeaders },
            body: JSON.stringify({ prompt, messages })
        });
        return extractChatText(await resp.json());
    }

    async function callGenerate(prompt) {
        const cfg = await getApiConfig();
        const resp = await fetch(cfg.generateEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...cfg.apiHeaders },
            body: JSON.stringify({ prompt })
        });
        return extractImageUrl(await resp.json());
    }

    const esc = (t) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const NO_TEXT_SUFFIX = ', absolutely no text, no letters, no words, no writing, no captions, no labels, no watermark, no typography, text-free, pure illustration only';

    function cleanAiResponse(text) {
        let t = String(text || '').trim();
        const patterns = [
            /^(tentu|baik|berikut|sure|here|okay|ok|siap|dengan senang hati)[^\n]*\n+/i,
            /^(tentu saja|baiklah|berikut adalah|berikut ini)[^\n]*\n+/i,
            /^(ini dia|mari kita|saya akan|let me|i'll|i will)[^\n]*\n+/i,
            /^.*?(berikut|here are|here is|ini adalah)[^\n]*:\s*\n+/i
        ];
        for (const p of patterns) { t = t.replace(p, ''); }
        t = t.replace(/\n+(semoga|harapan|selamat|good luck|hope|jika ada|if you|silakan|feel free)[^\n]*$/i, '');
        return t.trim();
    }

    const SYS_LIST_ONLY = 'PENTING: Berikan HANYA daftar bernomor. JANGAN tulis kalimat pembuka, penjelasan, atau penutup. Langsung mulai dari nomor 1.';
    const SYS_CONTENT_ONLY = 'PENTING: Langsung tulis kontennya saja. JANGAN tulis kalimat pembuka seperti "Tentu", "Baik", "Berikut" dll. JANGAN tulis kalimat penutup. Langsung mulai dari isi konten.';

    // ── Markdown renderer ──
    function renderMd(text) {
        let s = esc(text);
        s = s.replace(/^###\s+(.+)$/gm, '<h4 class="text-sm font-extrabold text-slate-900 mt-3">$1</h4>');
        s = s.replace(/^##\s+(.+)$/gm, '<h3 class="text-base font-extrabold text-slate-900 mt-4">$1</h3>');
        s = s.replace(/^#\s+(.+)$/gm, '<h2 class="text-lg font-extrabold text-slate-900 mt-4">$1</h2>');
        s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
        const lines = s.split('\n'), out = [];
        let ul = false, ol = false;
        const cl = () => { if (ul) { out.push('</ul>'); ul = false; } if (ol) { out.push('</ol>'); ol = false; } };
        for (const l of lines) {
            if (!l.trim()) { cl(); out.push('<div class="h-2"></div>'); continue; }
            const um = l.match(/^\s*-\s+(.+)$/);
            const om = l.match(/^\s*(\d+)\.\s+(.+)$/);
            if (um) { if (!ul) { cl(); ul = true; out.push('<ul class="list-disc pl-5 space-y-0.5 text-sm">'); } out.push(`<li>${um[1]}</li>`); continue; }
            if (om) { if (!ol) { cl(); ol = true; out.push('<ol class="list-decimal pl-5 space-y-0.5 text-sm">'); } out.push(`<li>${om[2]}</li>`); continue; }
            cl(); out.push(`<p class="text-sm leading-relaxed">${l}</p>`);
        }
        cl();
        return out.join('');
    }

    // ── Step Navigation ──
    const allSteps = ['sb-step-select', 'sb-step-idea', 'sb-step-titles', 'sb-step-outline', 'sb-step-result'];

    function showStep(stepId, stepNum) {
        allSteps.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('hidden', id !== stepId);
        });
        // Update step dots
        if (stepNum > 0) {
            stepsIndicator.classList.remove('hidden');
            stepsIndicator.classList.add('flex');
            stepsIndicator.querySelectorAll('.sb-step-dot').forEach(d => {
                const s = parseInt(d.dataset.step);
                d.className = `sb-step-dot w-2.5 h-2.5 rounded-full ${s <= stepNum ? 'bg-emerald-500' : 'bg-slate-200'}`;
            });
        } else {
            stepsIndicator.classList.add('hidden');
            stepsIndicator.classList.remove('flex');
        }
        // Scroll to top of main area
        document.getElementById('sb-main').scrollTop = 0;
        if (window.lucide) window.lucide.createIcons();
    }

    function resetAll() {
        state = { type: '', idea: '', chapterCount: 5, wordCount: 1000, novelGenre: 'romance', novelPov: 'first', novelChapters: 7, komikPanels: 8, komikStyle: 'manga', language: 'indonesia', imageStyle: 'realistic', titles: [], selectedTitle: '', outline: [], results: [] };
        isBusy = false;
        showStep('sb-step-select', 0);
        headerSub.textContent = 'Ebook • Artikel • Novel • Komik';
        newProjectBtn.style.display = 'none';
    }

    // ── Open addons ──
    if (openAddonsBtn) openAddonsBtn.addEventListener('click', () => { if (typeof window.switchTab === 'function') window.switchTab('addons'); });
    if (newProjectBtn) {
        newProjectBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isBusy) resetAll();
        });
    }

    // ════════════════════════════════════════
    // STEP 0: Type Selection
    // ════════════════════════════════════════
    document.querySelectorAll('.sb-type-card').forEach(card => {
        card.addEventListener('click', () => {
            const type = card.dataset.type;
            if (!type || !typeConfig[type]) return;
            state.type = type;
            const cfg = typeConfig[type];
            headerSub.textContent = cfg.label;

            // Setup idea step
            const icon = document.getElementById('sb-idea-icon');
            if (icon) icon.innerHTML = `<i data-lucide="${cfg.icon}" class="w-5 h-5"></i>`;
            document.getElementById('sb-idea-title').textContent = `Buat ${cfg.label}`;
            document.getElementById('sb-idea-input').value = '';
            document.getElementById('sb-idea-input').placeholder = {
                ebook: 'Contoh: Panduan lengkap memulai bisnis online untuk pemula...',
                artikel: 'Contoh: Manfaat olahraga pagi untuk produktivitas kerja...',
                novel: 'Contoh: Kisah cinta terlarang antara dua keluarga rival di kota kecil...',
                komik: 'Contoh: Petualangan superhero cilik menyelamatkan kucing-kucing terlantar...'
            }[type] || 'Deskripsikan ide kamu...';

            // Show/hide type-specific options
            document.getElementById('sb-opt-chapters').classList.toggle('hidden', type !== 'ebook');
            document.getElementById('sb-opt-wordcount').classList.toggle('hidden', type !== 'artikel');
            document.getElementById('sb-opt-novel').classList.toggle('hidden', type !== 'novel');
            document.getElementById('sb-opt-komik').classList.toggle('hidden', type !== 'komik');
            document.getElementById('sb-opt-common').classList.toggle('hidden', type === 'komik');

            document.getElementById('sb-generate-titles-btn').disabled = true;
            showStep('sb-step-idea', 1);
        });
    });

    // ════════════════════════════════════════
    // STEP 1: Idea Input
    // ════════════════════════════════════════
    const ideaInput = document.getElementById('sb-idea-input');
    const genTitlesBtn = document.getElementById('sb-generate-titles-btn');

    ideaInput.addEventListener('input', () => { genTitlesBtn.disabled = !ideaInput.value.trim(); });

    // Range sliders
    const chapterRange = document.getElementById('sb-chapter-count');
    const chapterVal = document.getElementById('sb-chapter-count-val');
    chapterRange.addEventListener('input', () => { chapterVal.textContent = chapterRange.value; state.chapterCount = parseInt(chapterRange.value); });

    const novelChapRange = document.getElementById('sb-novel-chapters');
    const novelChapVal = document.getElementById('sb-novel-chapters-val');
    novelChapRange.addEventListener('input', () => { novelChapVal.textContent = novelChapRange.value; state.novelChapters = parseInt(novelChapRange.value); });

    const komikPanelsRange = document.getElementById('sb-komik-panels');
    const komikPanelsVal = document.getElementById('sb-komik-panels-val');
    komikPanelsRange.addEventListener('input', () => { komikPanelsVal.textContent = komikPanelsRange.value; state.komikPanels = parseInt(komikPanelsRange.value); });

    // Word count buttons
    document.querySelectorAll('.sb-wordcount-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sb-wordcount-btn').forEach(b => { b.className = 'sb-wordcount-btn flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-xs font-bold text-slate-600 hover:border-blue-400 transition-all'; });
            btn.className = 'sb-wordcount-btn flex-1 py-2.5 rounded-xl border-2 border-blue-400 bg-blue-50 text-xs font-bold text-blue-700';
            state.wordCount = parseInt(btn.dataset.val);
        });
    });

    // Komik style buttons
    document.querySelectorAll('.sb-komik-style-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sb-komik-style-btn').forEach(b => { b.className = 'sb-komik-style-btn py-2 rounded-xl border-2 border-slate-200 text-[11px] font-bold text-slate-600 hover:border-orange-400 transition-all'; });
            btn.className = 'sb-komik-style-btn py-2 rounded-xl border-2 border-orange-400 bg-orange-50 text-[11px] font-bold text-orange-700';
            state.komikStyle = btn.dataset.val;
        });
    });

    // Back button
    document.getElementById('sb-back-to-select').addEventListener('click', () => { if (!isBusy) showStep('sb-step-select', 0); });

    // Generate titles
    genTitlesBtn.addEventListener('click', async () => {
        if (isBusy) return;
        isBusy = true;
        genTitlesBtn.disabled = true;
        state.idea = ideaInput.value.trim();
        state.language = document.getElementById('sb-language')?.value || 'indonesia';
        state.imageStyle = document.getElementById('sb-image-style')?.value || 'realistic';
        state.novelGenre = document.getElementById('sb-novel-genre')?.value || 'romance';
        state.novelPov = document.getElementById('sb-novel-pov')?.value || 'first';

        showStep('sb-step-titles', 2);
        document.getElementById('sb-titles-loading').classList.remove('hidden');
        document.getElementById('sb-titles-list').innerHTML = '';

        try {
            const lang = state.language === 'english' ? 'English' : 'Bahasa Indonesia';
            let prompt = '';
            if (state.type === 'ebook') prompt = `Buatkan 5 judul ebook yang menarik tentang: "${state.idea}". Ebook akan memiliki ${state.chapterCount} bab. Tulis dalam ${lang}. Format: hanya daftar bernomor 1-5, tanpa penjelasan.`;
            else if (state.type === 'artikel') prompt = `Buatkan 5 judul artikel blog/SEO yang menarik tentang: "${state.idea}". Artikel sekitar ${state.wordCount} kata. Tulis dalam ${lang}. Format: hanya daftar bernomor 1-5, tanpa penjelasan.`;
            else if (state.type === 'novel') prompt = `Buatkan 5 judul novel genre ${state.novelGenre} tentang: "${state.idea}". Novel ${state.novelChapters} bab, sudut pandang ${state.novelPov === 'first' ? 'orang pertama' : 'orang ketiga'}. Tulis dalam ${lang}. Format: hanya daftar bernomor 1-5, tanpa penjelasan.`;
            else if (state.type === 'komik') prompt = `Buatkan 5 judul komik yang menarik tentang: "${state.idea}". Komik ${state.komikPanels} panel gaya ${state.komikStyle}. Tulis dalam ${lang}. Format: hanya daftar bernomor 1-5, tanpa penjelasan.`;

            let text = await callChat(prompt, SYS_LIST_ONLY);
            text = cleanAiResponse(text);
            const titles = text.split('\n').map(l => l.replace(/^\d+[\.\)]\s*/, '').replace(/^\*\*|\*\*$/g, '').replace(/^["\u201c]|["\u201d]$/g, '').trim()).filter(l => l.length > 3 && !/^(tentu|baik|berikut|sure|here)/i.test(l)).slice(0, 5);

            state.titles = titles;
            renderTitles(titles);
        } catch (e) {
            console.error('Title gen error:', e);
            document.getElementById('sb-titles-list').innerHTML = '<div class="text-sm text-red-500 font-medium p-4">Gagal membuat judul. Silakan coba lagi.</div>';
        }
        document.getElementById('sb-titles-loading').classList.add('hidden');
        isBusy = false;
        genTitlesBtn.disabled = false;
    });

    function renderTitles(titles) {
        const list = document.getElementById('sb-titles-list');
        list.innerHTML = '';
        titles.forEach((title, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'w-full text-left px-4 py-3.5 rounded-xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all group';
            btn.innerHTML = `<div class="flex items-center gap-3"><span class="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-emerald-100 text-slate-600 group-hover:text-emerald-600 flex items-center justify-center text-xs font-extrabold flex-shrink-0">${i + 1}</span><span class="text-sm font-semibold text-slate-800">${esc(title)}</span></div>`;
            btn.addEventListener('click', () => selectTitle(title));
            list.appendChild(btn);
        });
    }

    // ════════════════════════════════════════
    // STEP 2: Title Selection → Generate Outline
    // ════════════════════════════════════════
    document.getElementById('sb-back-to-idea').addEventListener('click', () => { if (!isBusy) showStep('sb-step-idea', 1); });

    async function selectTitle(title) {
        if (isBusy) return;
        isBusy = true;
        state.selectedTitle = title;

        // For Komik: generate scene descriptions, then go to generation
        if (state.type === 'komik') {
            showStep('sb-step-outline', 3);
            document.getElementById('sb-outline-loading').classList.remove('hidden');
            document.getElementById('sb-outline-list').innerHTML = '';
            document.getElementById('sb-outline-actions').classList.add('hidden');

            try {
                const lang = state.language === 'english' ? 'English' : 'Bahasa Indonesia';
                const prompt = `Buatkan outline cerita komik "${title}" dengan ${state.komikPanels} panel. Tulis dalam ${lang}. Format: daftar bernomor 1-${state.komikPanels}, setiap item adalah deskripsi singkat scene/adegan untuk panel tersebut (1 kalimat pendek per panel).`;
                
                let text = await callChat(prompt, SYS_LIST_ONLY);
                text = cleanAiResponse(text);
                const items = text.split('\n').map(l => l.replace(/^\d+[\.\)]\s*/, '').replace(/^\*\*|\*\*$/g, '').trim()).filter(l => l.length > 3 && !/^(tentu|baik|berikut|sure|here)/i.test(l)).slice(0, state.komikPanels);
                
                // Ensure we have exactly the right number of panels
                while (items.length < state.komikPanels) {
                    items.push(`Scene ${items.length + 1}`);
                }
                
                state.outline = items;
                console.log('Komik outline generated:', items);
            } catch (e) {
                console.error('Komik outline gen error:', e);
                // Fallback to simple panel numbers
                state.outline = [];
                for (let i = 0; i < state.komikPanels; i++) {
                    state.outline.push(`Panel ${i + 1}`);
                }
            }
            
            document.getElementById('sb-outline-loading').classList.add('hidden');
            
            // Auto-start generation after brief delay
            setTimeout(() => {
                document.getElementById('sb-start-generate-btn').click();
            }, 100);
            isBusy = false;
            return;
        }

        showStep('sb-step-outline', 3);
        document.getElementById('sb-outline-loading').classList.remove('hidden');
        document.getElementById('sb-outline-list').innerHTML = '';
        document.getElementById('sb-outline-actions').classList.add('hidden');

        try {
            const lang = state.language === 'english' ? 'English' : 'Bahasa Indonesia';
            let prompt = '';
            if (state.type === 'ebook') prompt = `Outline ebook "${title}" dengan ${state.chapterCount} bab. ${lang}. Format: daftar bernomor, hanya judul bab saja.`;
            else if (state.type === 'artikel') prompt = `Outline headings artikel "${title}" ~${state.wordCount} kata. ${lang}. Format: daftar bernomor, hanya judul heading.`;
            else if (state.type === 'novel') prompt = `Outline novel "${title}" genre ${state.novelGenre}, ${state.novelChapters} bab. ${lang}. Format: daftar bernomor, hanya judul bab.`;

            let text = await callChat(prompt, SYS_LIST_ONLY);
            text = cleanAiResponse(text);
            const items = text.split('\n').map(l => l.replace(/^\d+[\.\)]\s*/, '').replace(/^\*\*|\*\*$/g, '').trim()).filter(l => l.length > 3 && !/^(tentu|baik|berikut|sure|here)/i.test(l));

            state.outline = items;
            renderOutline();
        } catch (e) {
            console.error('Outline gen error:', e);
            document.getElementById('sb-outline-list').innerHTML = '<div class="text-sm text-red-500 font-medium p-4">Gagal membuat outline. Silakan coba lagi.</div>';
        }
        document.getElementById('sb-outline-loading').classList.add('hidden');
        isBusy = false;
    }

    // ════════════════════════════════════════
    // STEP 3: Outline Editor (drag-drop, edit, add, delete)
    // ════════════════════════════════════════
    document.getElementById('sb-back-to-titles').addEventListener('click', () => { if (!isBusy) showStep('sb-step-titles', 2); });

    let dragSrcIdx = null;

    function syncOutlineInputs() {
        document.querySelectorAll('#sb-outline-list .sb-outline-text').forEach(inp => {
            const idx = parseInt(inp.dataset.idx);
            if (!isNaN(idx) && state.outline[idx] !== undefined) state.outline[idx] = inp.value.trim();
        });
    }

    function renderOutline() {
        const list = document.getElementById('sb-outline-list');
        list.innerHTML = '';
        const itemLabel = typeConfig[state.type]?.itemLabel || 'Item';

        state.outline.forEach((text, i) => {
            const row = document.createElement('div');
            row.className = 'sb-outline-item flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 group transition-all hover:shadow-sm';
            row.draggable = true;
            row.dataset.idx = i;
            row.innerHTML = `
                <div class="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 flex-shrink-0" data-drag-handle>
                    <i data-lucide="grip-vertical" class="w-4 h-4"></i>
                </div>
                <span class="text-[10px] font-extrabold text-slate-400 w-6 text-center flex-shrink-0">${itemLabel} ${i + 1}</span>
                <input type="text" value="${esc(text)}" class="sb-outline-text flex-1 text-sm text-slate-800 bg-transparent border-0 focus:outline-none focus:ring-0 px-1 font-medium" data-idx="${i}">
                <button type="button" class="sb-outline-delete text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100" data-idx="${i}" title="Hapus">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            `;

            row.addEventListener('dragstart', (e) => {
                dragSrcIdx = i;
                row.classList.add('opacity-50');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', row.innerHTML);
            });
            row.addEventListener('dragend', () => {
                row.classList.remove('opacity-50');
                dragSrcIdx = null;
                list.querySelectorAll('.sb-outline-item').forEach(r => { r.style.borderTopWidth = ''; r.classList.remove('border-t-emerald-400'); });
            });
            row.addEventListener('dragenter', (e) => {
                e.preventDefault();
                if (dragSrcIdx !== null && dragSrcIdx !== i) {
                    row.style.borderTopWidth = '3px';
                    row.classList.add('border-t-emerald-400');
                }
            });
            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
            row.addEventListener('dragleave', (e) => {
                if (e.target === row) {
                    row.style.borderTopWidth = '';
                    row.classList.remove('border-t-emerald-400');
                }
            });
            row.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                row.style.borderTopWidth = '';
                row.classList.remove('border-t-emerald-400');
                if (dragSrcIdx === null || dragSrcIdx === i) return;
                syncOutlineInputs();
                const item = state.outline.splice(dragSrcIdx, 1)[0];
                state.outline.splice(i, 0, item);
                renderOutline();
            });

            row.querySelector('.sb-outline-text').addEventListener('blur', (e) => { state.outline[i] = e.target.value.trim(); });

            row.querySelector('.sb-outline-delete').addEventListener('click', () => {
                if (state.outline.length <= 1) return;
                syncOutlineInputs();
                state.outline.splice(i, 1);
                renderOutline();
            });

            list.appendChild(row);
        });

        document.getElementById('sb-outline-actions').classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
    }

    document.getElementById('sb-add-outline-item').addEventListener('click', () => {
        syncOutlineInputs();
        const itemLabel = typeConfig[state.type]?.itemLabel || 'Item';
        state.outline.push(`${itemLabel} baru`);
        renderOutline();
        const inputs = document.querySelectorAll('#sb-outline-list .sb-outline-text');
        if (inputs.length) { const last = inputs[inputs.length - 1]; last.focus(); last.select(); }
    });

    // ════════════════════════════════════════
    // STEP 4: Generation (per section: text then image)
    // ════════════════════════════════════════
    document.getElementById('sb-start-generate-btn').addEventListener('click', async () => {
        if (isBusy) return;
        isBusy = true;

        syncOutlineInputs();

        showStep('sb-step-result', 4);
        newProjectBtn.style.display = 'inline-flex';

        const sections = document.getElementById('sb-result-sections');
        const progressWrap = document.getElementById('sb-progress-bar-wrap');
        const progressBar = document.getElementById('sb-progress-bar');
        const progressLabel = document.getElementById('sb-progress-label');
        const exportBar = document.getElementById('sb-export-bar');
        const resultTitle = document.getElementById('sb-result-title');
        const resultProgress = document.getElementById('sb-result-progress');

        const isKomik = state.type === 'komik';
        sections.innerHTML = '';
        if (isKomik) sections.className = 'sb-comic-grid';
        else sections.className = 'space-y-6';
        exportBar.classList.add('hidden');
        progressWrap.classList.remove('hidden');
        resultTitle.textContent = state.selectedTitle;
        state.results = [];

        const total = state.outline.length;
        const totalSteps = isKomik ? (total * 2) + 1 : total * 2; // +1 for character generation
        let completed = 0;
        const itemLabel = typeConfig[state.type]?.itemLabel || 'Item';
        const lang = state.language === 'english' ? 'English' : 'Bahasa Indonesia';
        const history = [];

        const styleMap = {
            realistic: 'photorealistic, high quality, detailed', anime: 'anime art style, vibrant colors',
            cartoon: 'cartoon style, colorful, fun', watercolor: 'watercolor painting, soft colors',
            '3d': '3D rendered, detailed textures',
            manga: 'manga art style, vibrant colors, detailed manga illustration', superhero: 'superhero comic style, bold dynamic action',
            webtoon: 'webtoon art style, clean lines, digital painting', chibi: 'chibi art style, cute, big head small body'
        };
        const imgStyle = isKomik ? (styleMap[state.komikStyle] || styleMap.manga) : (styleMap[state.imageStyle] || styleMap.realistic);

        function updateProgress(label) {
            const pct = Math.round((completed / totalSteps) * 100);
            progressBar.style.width = pct + '%';
            progressLabel.textContent = label;
            resultProgress.textContent = `${Math.round(pct)}%`;
        }

        // For Komik: Generate character descriptions FIRST for consistency
        let characterDesc = '';
        if (isKomik) {
            updateProgress('Membuat deskripsi karakter untuk konsistensi...');
            try {
                const charPrompt = `Describe the main character(s) for a comic titled "${state.selectedTitle}" in English. Include: physical appearance (hair, eyes, clothing, distinctive features). Keep it concise (2-3 sentences max). This will be used for consistent character appearance across all panels.`;
                characterDesc = await callChat(charPrompt, 'You are a character designer. Provide ONLY the character description in English, no preamble.');
                characterDesc = cleanAiResponse(characterDesc);
                console.log('Character description:', characterDesc);
                completed++;
            } catch (e) {
                console.error('Character desc error:', e);
                characterDesc = '';
            }
        }

        for (let i = 0; i < total; i++) {
            const outlineItem = state.outline[i];

            if (isKomik) {
                // ════ KOMIK: Comic panel with dialog/narration overlay ════
                const panelDiv = document.createElement('div');
                panelDiv.className = 'sb-comic-panel relative bg-black';
                panelDiv.id = `sb-section-${i}`;
                panelDiv.innerHTML = `<div class="aspect-[3/4] bg-slate-900 flex items-center justify-center"><div class="flex flex-col items-center gap-2 text-slate-500"><div class="w-6 h-6 border-2 border-slate-600 border-t-orange-400 rounded-full animate-spin"></div><span class="text-xs font-medium">Panel ${i + 1}...</span></div></div>`;
                sections.appendChild(panelDiv);
                panelDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                // Generate scene description for image prompt + dialog/narration
                updateProgress(`Panel ${i + 1}: membuat script...`);
                let sceneDesc = outlineItem, dialogText = '', narratorText = '';
                try {
                    const sysP = `${SYS_CONTENT_ONLY} Kamu penulis komik. Tulis dalam ${lang}. Format WAJIB:\nVISUAL: [deskripsi scene dalam English untuk image generation]\nDIALOG: [dialog karakter atau - jika kosong]\nNARASI: [narasi/caption atau - jika kosong]\nContoh:\nVISUAL: A young hero standing on cliff at sunset\nDIALOG: "Aku tidak akan menyerah!"\nNARASI: Tekad bulat terlihat di matanya`;
                    const usrP = `Panel ${i + 1} dari ${total} untuk komik "${state.selectedTitle}": ${outlineItem}`;
                    let scriptText = await callChat(usrP, sysP, history);
                    scriptText = cleanAiResponse(scriptText);
                    console.log(`Panel ${i + 1} script:`, scriptText);
                    
                    // Parse with multiline support
                    const lines = scriptText.split('\n').map(l => l.trim()).filter(l => l);
                    for (const line of lines) {
                        if (/^VISUAL:/i.test(line)) sceneDesc = line.replace(/^VISUAL:\s*/i, '').trim();
                        else if (/^DIALOG:/i.test(line)) {
                            const d = line.replace(/^DIALOG:\s*/i, '').trim();
                            if (d && d !== '-') dialogText = d;
                        }
                        else if (/^NARASI:/i.test(line)) {
                            const n = line.replace(/^NARASI:\s*/i, '').trim();
                            if (n && n !== '-') narratorText = n;
                        }
                    }
                    
                    // Fallback: if still empty, use simple defaults
                    if (!dialogText && !narratorText) {
                        dialogText = outlineItem;
                    }
                    
                    console.log(`Panel ${i + 1} parsed - Dialog: "${dialogText}", Narasi: "${narratorText}"`);
                    
                    history.push({ role: 'user', content: usrP });
                    history.push({ role: 'assistant', content: scriptText });
                } catch (e) { console.error(`Komik script error ${i}:`, e); }
                completed++;

                // Generate image with consistent character description
                updateProgress(`Panel ${i + 1}: membuat ilustrasi...`);
                let imageUrl = '';
                try {
                    const charPrefix = characterDesc ? `Character: ${characterDesc}. Scene: ` : '';
                    const imgPrompt = `${charPrefix}${sceneDesc}, ${imgStyle}, comic panel, dramatic lighting, expressive characters, dynamic composition, professional comic art, consistent character design${NO_TEXT_SUFFIX}`;
                    imageUrl = await callGenerate(imgPrompt);
                } catch (e) { console.error(`Komik img error ${i}:`, e); }
                completed++;

                state.results.push({ title: outlineItem, text: `${dialogText ? 'Dialog: ' + dialogText : ''}${narratorText ? '\nNarasi: ' + narratorText : ''}`, imageUrl, index: i, dialog: dialogText, narrator: narratorText, scene: sceneDesc, characterDesc });

                // Render markdown in overlays
                const renderOverlayMd = (txt) => {
                    let s = esc(txt);
                    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                    s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
                    s = s.replace(/\n/g, '<br>');
                    return s;
                };

                // Build comic panel HTML with overlays
                let ph = `<div class="aspect-[3/4] relative overflow-hidden cursor-pointer" onclick="(function(){ var m=document.getElementById('image-preview-modal'),im=document.getElementById('preview-modal-img'); if(m&&im){im.src='${esc(imageUrl)}';m.classList.remove('opacity-0','pointer-events-none');} })()">`;
                if (imageUrl) ph += `<img src="${esc(imageUrl)}" alt="Panel ${i + 1}" class="w-full h-full object-cover">`;
                else ph += `<div class="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500 text-xs">Gagal load</div>`;
                if (narratorText) ph += `<div class="absolute top-0 left-0 right-0 bg-yellow-100/95 border-b-2 border-yellow-300 px-3 py-2"><div class="text-[11px] text-slate-800 font-medium italic leading-tight">${renderOverlayMd(narratorText)}</div></div>`;
                if (dialogText) ph += `<div class="absolute bottom-0 left-0 right-0 p-3"><div class="bg-white/95 rounded-2xl rounded-bl-sm px-3 py-2 shadow-lg border border-slate-200 max-w-[90%]"><div class="text-xs text-slate-900 font-semibold leading-tight">${renderOverlayMd(dialogText)}</div></div></div>`;
                ph += `</div>`;
                ph += `<div class="absolute top-2 right-2 flex items-center gap-1"><span class="bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">${i + 1}</span><button type="button" class="sb-regen-img bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full transition-all" data-idx="${i}" title="Regenerate"><i data-lucide="refresh-cw" class="w-3 h-3"></i></button></div>`;
                panelDiv.innerHTML = ph;
                if (window.lucide) window.lucide.createIcons({ root: panelDiv });
                updateProgress(`Panel ${i + 1} selesai`);

            } else {
                // ════ NON-KOMIK: Standard section card ════
                const sectionDiv = document.createElement('div');
                sectionDiv.className = 'sb-section bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm';
                sectionDiv.id = `sb-section-${i}`;
                sectionDiv.innerHTML = `
                    <div class="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                        <span class="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-extrabold">${i + 1}</span>
                        <span class="text-sm font-bold text-slate-800 flex-1">${esc(outlineItem)}</span>
                    </div>
                    <div class="p-4">
                        <div class="sb-section-image hidden mb-4"></div>
                        <div class="sb-section-text text-sm text-slate-700 leading-relaxed">
                            <div class="flex items-center gap-2 text-slate-400"><div class="w-4 h-4 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div><span class="text-xs font-medium">Menulis ${itemLabel.toLowerCase()} ${i + 1}...</span></div>
                        </div>
                    </div>
                `;
                sections.appendChild(sectionDiv);
                sectionDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                // Generate image FIRST
                updateProgress(`Membuat ilustrasi ${itemLabel.toLowerCase()} ${i + 1}...`);
                const imageDiv = sectionDiv.querySelector('.sb-section-image');
                imageDiv.classList.remove('hidden');
                imageDiv.innerHTML = `<div class="flex items-center gap-2 text-slate-400"><div class="w-4 h-4 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div><span class="text-xs font-medium">Membuat ilustrasi...</span></div>`;

                let imageUrl = '';
                try {
                    const imgPrompt = `Illustration for "${outlineItem}" from ${state.type === 'novel' ? 'a novel' : state.type === 'ebook' ? 'an ebook' : 'an article'} titled "${state.selectedTitle}". ${imgStyle}, high resolution, beautiful illustration${NO_TEXT_SUFFIX}`;
                    imageUrl = await callGenerate(imgPrompt);
                } catch (e) { console.error(`Image gen error section ${i}:`, e); }
                completed++;

                // Generate text AFTER image
                updateProgress(`Menulis ${itemLabel} ${i + 1} dari ${total}...`);
                let textContent = '';
                try {
                    let sysPrompt = '', userPrompt = '';
                    if (state.type === 'ebook') {
                        sysPrompt = `${SYS_CONTENT_ONLY} Kamu penulis ebook profesional. Tulis dalam ${lang}. Tulis isi bab yang detail, informatif, engaging. Gunakan paragraf dan subheading.`;
                        userPrompt = `Tulis isi Bab ${i + 1}: "${outlineItem}" dari ebook "${state.selectedTitle}". Minimal 500 kata. Langsung tulis konten.`;
                    } else if (state.type === 'artikel') {
                        sysPrompt = `${SYS_CONTENT_ONLY} Kamu penulis artikel SEO profesional. Tulis dalam ${lang}. Tulis section artikel SEO-friendly dan informatif.`;
                        const wordPerSection = Math.round(state.wordCount / total);
                        userPrompt = `Tulis section "${outlineItem}" dari artikel "${state.selectedTitle}". Sekitar ${wordPerSection} kata. Langsung tulis konten.`;
                    } else if (state.type === 'novel') {
                        sysPrompt = `${SYS_CONTENT_ONLY} Kamu novelis ${state.novelGenre} profesional. Tulis dalam ${lang}. Sudut pandang ${state.novelPov === 'first' ? 'orang pertama (aku/saya)' : 'orang ketiga (dia)'}. Tulis narasi hidup dengan dialog dan deskripsi.`;
                        userPrompt = `Tulis Bab ${i + 1}: "${outlineItem}" dari novel "${state.selectedTitle}". Minimal 800 kata. Langsung tulis narasi.`;
                    }
                    textContent = await callChat(userPrompt, sysPrompt, history);
                    if (textContent) textContent = cleanAiResponse(textContent);
                    if (textContent) {
                        history.push({ role: 'user', content: userPrompt });
                        history.push({ role: 'assistant', content: textContent });
                    }
                } catch (e) {
                    console.error(`Text gen error section ${i}:`, e);
                    textContent = '⚠️ Gagal menulis konten ini.';
                }

                state.results.push({ title: outlineItem, text: textContent, imageUrl, index: i });

                const textDiv = sectionDiv.querySelector('.sb-section-text');
                textDiv.innerHTML = textContent ? renderMd(textContent) : '<p class="text-red-500 text-sm">Gagal generate teks.</p>';
                completed++;

                if (imageUrl) {
                    imageDiv.innerHTML = `
                        <div class="rounded-xl overflow-hidden border border-slate-100 inline-block">
                            <img src="${esc(imageUrl)}" alt="Ilustrasi" class="max-w-full max-h-64 cursor-pointer hover:opacity-90 transition-opacity" onclick="(function(){ var m=document.getElementById('image-preview-modal'),im=document.getElementById('preview-modal-img'); if(m&&im){im.src='${esc(imageUrl)}';m.classList.remove('opacity-0','pointer-events-none');} })()">
                        </div>
                        <div class="mt-2 flex items-center gap-2">
                            <button type="button" class="sb-regen-img inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-all" data-idx="${i}">
                                <i data-lucide="refresh-cw" class="w-3 h-3"></i> Regenerate
                            </button>
                            <a href="${esc(imageUrl)}" download="superbook-${i + 1}.png" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-all">
                                <i data-lucide="download" class="w-3 h-3"></i> Unduh
                            </a>
                        </div>
                    `;
                } else {
                    imageDiv.innerHTML = `
                        <div class="text-xs text-slate-400 italic">Gagal membuat ilustrasi.</div>
                        <button type="button" class="sb-regen-img mt-1 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-all" data-idx="${i}">
                            <i data-lucide="refresh-cw" class="w-3 h-3"></i> Coba lagi
                        </button>
                    `;
                }
                if (window.lucide) window.lucide.createIcons({ root: sectionDiv });
                completed++;
                updateProgress(`Selesai ${itemLabel.toLowerCase()} ${i + 1} dari ${total}`);
            }
        }

        // Done
        progressBar.style.width = '100%';
        progressLabel.textContent = 'Semua konten selesai dibuat!';
        resultProgress.textContent = '100%';
        exportBar.classList.remove('hidden');
        isBusy = false;
        if (window.lucide) window.lucide.createIcons();
    });

    // ── Image Regeneration ──
    document.getElementById('sb-result-sections').addEventListener('click', async (e) => {
        const btn = e.target.closest('.sb-regen-img');
        if (!btn || isBusy) return;
        const idx = parseInt(btn.dataset.idx);
        const section = document.getElementById(`sb-section-${idx}`);
        if (!section) return;

        isBusy = true;
        btn.disabled = true;
        btn.innerHTML = '<div class="w-3 h-3 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div> Regenerating...';

        try {
            const outlineItem = state.outline[idx];
            const styleMap = {
                realistic: 'photorealistic, high quality, detailed', anime: 'anime art style, vibrant colors',
                cartoon: 'cartoon style, colorful, fun', watercolor: 'watercolor painting, soft colors',
                '3d': '3D rendered, detailed textures',
                manga: 'manga art style, black and white ink, detailed manga illustration', superhero: 'superhero comic style, bold dynamic action',
                webtoon: 'webtoon art style, clean lines, digital painting', chibi: 'chibi art style, cute, big head small body'
            };
            const imgStyle = state.type === 'komik' ? (styleMap[state.komikStyle] || styleMap.manga) : (styleMap[state.imageStyle] || styleMap.realistic);
            let imgPrompt;
            if (state.type === 'komik') {
                const resultData = state.results[idx];
                const charDesc = resultData?.characterDesc || '';
                const sceneDesc = resultData?.scene || outlineItem;
                const charPrefix = charDesc ? `Character: ${charDesc}. Scene: ` : '';
                imgPrompt = `${charPrefix}${sceneDesc}, ${imgStyle}, comic panel, dramatic lighting, expressive characters, dynamic composition, professional comic art, consistent character design${NO_TEXT_SUFFIX}`;
            } else {
                imgPrompt = `Illustration for "${outlineItem}" from "${state.selectedTitle}". ${imgStyle}, high resolution, beautiful illustration${NO_TEXT_SUFFIX}`;
            }

            const newUrl = await callGenerate(imgPrompt);
            if (newUrl) {
                state.results[idx].imageUrl = newUrl;
                const imageDiv = section.querySelector('.sb-section-image');
                imageDiv.innerHTML = `
                    <div class="rounded-xl overflow-hidden border border-slate-100 inline-block">
                        <img src="${esc(newUrl)}" alt="Ilustrasi" class="max-w-full max-h-64 cursor-pointer hover:opacity-90 transition-opacity" onclick="(function(){ var m=document.getElementById('image-preview-modal'),im=document.getElementById('preview-modal-img'); if(m&&im){im.src='${esc(newUrl)}';m.classList.remove('opacity-0','pointer-events-none');} })()">
                    </div>
                    <div class="mt-2 flex items-center gap-2">
                        <button type="button" class="sb-regen-img inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-all" data-idx="${idx}">
                            <i data-lucide="refresh-cw" class="w-3 h-3"></i> Regenerate
                        </button>
                        <a href="${esc(newUrl)}" download="superbook-${idx + 1}.png" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-all">
                            <i data-lucide="download" class="w-3 h-3"></i> Unduh
                        </a>
                    </div>
                `;
                if (window.lucide) window.lucide.createIcons({ root: section });
            }
        } catch (e) { console.error('Regen error:', e); }
        isBusy = false;
    });

    // ════════════════════════════════════════
    // EXPORT: DOCX, PDF, HTML
    // ════════════════════════════════════════
    document.querySelectorAll('.sb-export-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const format = btn.dataset.format;
            exportContent(format);
        });
    });

    // ── Markdown to clean HTML for export ──
    function mdToExportHtml(text) {
        let s = esc(text);
        s = s.replace(/^###\s+(.+)$/gm, '<h4>$1</h4>');
        s = s.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');
        s = s.replace(/^#\s+(.+)$/gm, '<h2 style="font-size:18pt;margin-top:16pt;">$1</h2>');
        s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
        const lines = s.split('\n'), out = [];
        let ul = false, ol = false;
        const cl = () => { if (ul) { out.push('</ul>'); ul = false; } if (ol) { out.push('</ol>'); ol = false; } };
        for (const l of lines) {
            if (!l.trim()) { cl(); continue; }
            const um = l.match(/^\s*-\s+(.+)$/);
            const om = l.match(/^\s*(\d+)\.\s+(.+)$/);
            if (um) { if (!ul) { cl(); ul = true; out.push('<ul>'); } out.push(`<li>${um[1]}</li>`); continue; }
            if (om) { if (!ol) { cl(); ol = true; out.push('<ol>'); } out.push(`<li>${om[2]}</li>`); continue; }
            cl();
            if (!l.startsWith('<h')) out.push(`<p>${l}</p>`);
            else out.push(l);
        }
        cl();
        return out.join('\n');
    }

    function exportContent(format) {
        const title = state.selectedTitle || 'Super Book';
        const itemLabel = typeConfig[state.type]?.itemLabel || 'Item';
        const isKomik = state.type === 'komik';
        
        const css = isKomik 
            ? 'body{font-family:Georgia,serif;max-width:900px;margin:40px auto;padding:20px;color:#1e293b}h1{font-size:28px;text-align:center;margin-bottom:40px;color:#0f172a}.comic-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin:20px 0}.comic-panel{border:3px solid #1e293b;border-radius:12px;overflow:hidden;page-break-inside:avoid}.panel-img{width:100%;height:auto;display:block}.panel-text{padding:12px;background:#f8f9fa;border-top:2px solid #e2e8f0}.narrator{font-style:italic;color:#64748b;margin-bottom:8px;font-size:13px}.dialog{font-weight:600;color:#0f172a;font-size:14px}strong{font-weight:bold}em{font-style:italic}'
            : 'body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:20px;color:#1e293b;line-height:1.8}h1{font-size:28px;text-align:center;margin-bottom:40px;color:#0f172a}h2{font-size:22px;margin-top:40px;padding-bottom:8px;border-bottom:2px solid #e2e8f0;color:#0f172a}h3{font-size:18px;margin-top:20px;color:#0f172a}h4{font-size:15px;margin-top:16px;color:#334155}.section{margin-bottom:40px;page-break-inside:avoid}img{max-width:100%;height:auto;border-radius:12px;margin:16px 0}p{margin:8px 0}ul,ol{margin:8px 0;padding-left:24px}li{margin:4px 0}strong{font-weight:bold}em{font-style:italic}';
        
        let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>`;
        html += `<h1>${esc(title)}</h1>`;

        if (isKomik) {
            html += `<div class="comic-grid">`;
            state.results.forEach((r, i) => {
                html += `<div class="comic-panel">`;
                if (r.imageUrl) html += `<img src="${esc(r.imageUrl)}" alt="Panel ${i + 1}" class="panel-img">`;
                if (r.narrator || r.dialog) {
                    html += `<div class="panel-text">`;
                    if (r.narrator) html += `<div class="narrator">${mdToExportHtml(r.narrator)}</div>`;
                    if (r.dialog) html += `<div class="dialog">${mdToExportHtml(r.dialog)}</div>`;
                    html += `</div>`;
                }
                html += `</div>`;
            });
            html += `</div>`;
        } else {
            state.results.forEach((r, i) => {
                html += `<div class="section"><h2>${itemLabel} ${i + 1}: ${esc(r.title)}</h2>`;
                if (r.imageUrl) html += `<img src="${esc(r.imageUrl)}" alt="Ilustrasi ${i + 1}">`;
                html += mdToExportHtml(r.text);
                html += `</div>`;
            });
        }
        html += `</body></html>`;

        if (format === 'html') {
            downloadFile(html, `${title}.html`, 'text/html');
        } else if (format === 'pdf') {
            // Create iframe to print as PDF (more reliable than window.open)
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;left:-9999px;width:800px;height:600px;';
            document.body.appendChild(iframe);
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.write(html);
            doc.close();
            iframe.onload = () => {
                setTimeout(() => {
                    try { iframe.contentWindow.print(); } catch (e) { console.error('Print failed:', e); window.open('').document.write(html); }
                    setTimeout(() => { document.body.removeChild(iframe); }, 2000);
                }, 300);
            };
        } else if (format === 'docx') {
            const docHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${esc(title)}</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]--><style>body{font-family:Calibri,sans-serif;font-size:12pt;line-height:1.6;color:#1e293b}h1{font-size:24pt;text-align:center;color:#0f172a}h2{font-size:16pt;margin-top:24pt;border-bottom:1px solid #ccc;padding-bottom:4pt}h3{font-size:14pt;margin-top:16pt}h4{font-size:12pt;margin-top:12pt;font-weight:bold}img{max-width:100%;height:auto}p{margin:6pt 0}ul,ol{margin:6pt 0;padding-left:18pt}li{margin:3pt 0}strong{font-weight:bold}em{font-style:italic}.comic-panel{border:3px solid #000;margin:12pt 0;page-break-inside:avoid}.panel-text{padding:8pt;background:#f0f0f0}.narrator{font-style:italic;color:#666;margin-bottom:6pt}.dialog{font-weight:600;color:#000}</style></head><body>`;
            let docBody = docHtml + `<h1>${esc(title)}</h1>`;
            if (isKomik) {
                state.results.forEach((r, i) => {
                    docBody += `<div class="comic-panel">`;
                    if (r.imageUrl) docBody += `<p><img src="${esc(r.imageUrl)}" alt="Panel ${i + 1}"></p>`;
                    if (r.narrator || r.dialog) {
                        docBody += `<div class="panel-text">`;
                        if (r.narrator) docBody += `<div class="narrator">${mdToExportHtml(r.narrator)}</div>`;
                        if (r.dialog) docBody += `<div class="dialog">${mdToExportHtml(r.dialog)}</div>`;
                        docBody += `</div>`;
                    }
                    docBody += `</div>`;
                });
            } else {
                state.results.forEach((r, i) => {
                    docBody += `<h2>${itemLabel} ${i + 1}: ${esc(r.title)}</h2>`;
                    if (r.imageUrl) docBody += `<p><img src="${esc(r.imageUrl)}" alt="Ilustrasi"></p>`;
                    docBody += mdToExportHtml(r.text);
                });
            }
            docBody += `</body></html>`;
            downloadFile(docBody, `${title}.doc`, 'application/msword');
        }
    }

    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ════════════════════════════════════════
    // ACCESS CHECK
    // ════════════════════════════════════════
    async function checkAccess() {
        const email = localStorage.getItem('sulapfoto_verified_email');
        if (!email) {
            if (app) app.classList.add('hidden');
            if (locked) locked.classList.remove('hidden');
            return;
        }
        try {
            const result = window.getAddonStatus ? await window.getAddonStatus(email, 'super_book') : await (await fetch('/server/addons_payment.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_active_addon', email, addon_key: 'super_book' }) })).json();
            if (result.success && result.is_active) {
                if (app) app.classList.remove('hidden');
                if (locked) locked.classList.add('hidden');
            } else {
                if (app) app.classList.add('hidden');
                if (locked) locked.classList.remove('hidden');
            }
        } catch (e) {
            console.error('Super Book access check failed', e);
            if (app) app.classList.add('hidden');
            if (locked) locked.classList.remove('hidden');
        }
    }

    checkAccess();
});
