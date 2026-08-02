window.initMenuRestoran = function (ctx) {
    const wrap = document.getElementById('mr-wrap');
    if (!wrap) return;

    const GENERATE_URL     = ctx.GENERATE_URL     || window.GENERATE_URL     || '';
    const CHAT_URL         = ctx.CHAT_URL         || window.CHAT_URL         || '';
    const API_KEY          = ctx.API_KEY          || window.API_KEY          || '';
    const getApiErrorMsg   = ctx.getApiErrorMessage || function (r) { return r.statusText; };

    // ── State ────────────────────────────────────────────────────────────────
    let state = {
        logo: null,
        template: 'dark',
        items: [],
        catFilter: 'all'
    };
    let itemIdCounter = 1;

    // ── DOM refs ─────────────────────────────────────────────────────────────
    const logoArea    = document.getElementById('mr-logo-area');
    const logoImg     = document.getElementById('mr-logo-img');
    const logoInput   = document.getElementById('mr-logo-input');
    const logoPlaceh  = document.getElementById('mr-logo-placeholder');
    const logoRemove  = document.getElementById('mr-logo-remove');
    const itemsList   = document.getElementById('mr-items-list');
    const itemsEmpty  = document.getElementById('mr-items-empty');
    const itemCount   = document.getElementById('mr-item-count');
    const previewSec  = document.getElementById('mr-preview-section');
    const previewEmpty = document.getElementById('mr-preview-empty');
    const pagesWrap   = document.getElementById('mr-pages-wrap');
    const pageInfo    = document.getElementById('mr-page-info');

    // ── Logo upload ──────────────────────────────────────────────────────────
    logoArea.addEventListener('click', () => logoInput.click());
    logoInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            state.logo = ev.target.result;
            logoImg.src = state.logo;
            logoImg.classList.remove('hidden');
            logoPlaceh.classList.add('hidden');
            logoRemove.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    });
    logoRemove.addEventListener('click', e => {
        e.stopPropagation();
        state.logo = null;
        logoImg.src = '';
        logoImg.classList.add('hidden');
        logoPlaceh.classList.remove('hidden');
        logoRemove.classList.add('hidden');
        logoInput.value = '';
    });


    // ── Template selection ───────────────────────────────────────────────────
    document.querySelectorAll('.mr-tpl-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.mr-tpl-card').forEach(c => {
                c.classList.remove('active');
                c.querySelector('.mr-tpl-check').classList.add('hidden');
            });
            card.classList.add('active');
            card.querySelector('.mr-tpl-check').classList.remove('hidden');
            state.template = card.dataset.tpl;
            const customWrap = document.getElementById('mr-custom-style-wrap');
            if (customWrap) customWrap.classList.toggle('hidden', state.template !== 'custom');
        });
    });

    // ── Category filter ──────────────────────────────────────────────────────
    document.querySelectorAll('#mr-cat-filter .mr-cat-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('#mr-cat-filter .mr-cat-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.catFilter = pill.dataset.cat;
            renderItems();
        });
    });

    // ── Add / Remove items ───────────────────────────────────────────────────
    document.getElementById('mr-add-item-btn').addEventListener('click', () => addItem());
    document.getElementById('mr-import-demo-btn').addEventListener('click', importDemo);

    function addItem(data) {
        const id = itemIdCounter++;
        state.items.push({
            id,
            category: (data && data.category) || 'Makanan Utama',
            name:     (data && data.name)     || '',
            desc:     (data && data.desc)     || '',
            price:    (data && data.price)    || '',
            photo:    (data && data.photo)    || null
        });
        renderItems();
        updateCount();
        setTimeout(() => {
            const newRow = document.querySelector(`.mr-item-row[data-id="${id}"]`);
            if (newRow) newRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }

    function removeItem(id) {
        state.items = state.items.filter(it => it.id !== id);
        renderItems();
        updateCount();
    }

    function updateCount() {
        itemCount.textContent = `${state.items.length} item`;
    }

    // ── AI: Auto description per item via /chat ──────────────────────────────
    async function autoDescItem(itemId) {
        if (!CHAT_URL) { alert('CHAT_URL tidak tersedia.'); return; }
        const it = state.items.find(x => x.id === itemId);
        if (!it || !it.name.trim()) { alert('Isi nama item dulu.'); return; }

        const btn = document.querySelector(`.mr-ai-btn.desc[data-id="${itemId}"]`);
        const descInput = document.querySelector(`.mr-f-desc[data-id="${itemId}"]`);
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="mr-spin"></span>'; }

        try {
            const restoName = document.getElementById('mr-name').value.trim() || 'restoran';
            const prompt = `Buat deskripsi singkat menu restoran untuk: "${it.name}" (kategori: ${it.category}) dari restoran "${restoName}". Deskripsi maksimal 10 kata, deskriptif, menggugah selera, dalam Bahasa Indonesia. Balas hanya dengan teks deskripsi, tanpa tanda kutip atau penjelasan lain.`;
            const formData = new FormData();
            formData.append('prompt', prompt);
            const response = await fetch(CHAT_URL, {
                method: 'POST',
                headers: { 'X-API-Key': API_KEY },
                body: formData
            });
            if (!response.ok) throw new Error(await getApiErrorMsg(response));
            const result = await response.json();
            const text = (result.response || result.candidates?.[0]?.content?.parts?.[0]?.text || '').trim().replace(/^["']|["']$/g, '');
            if (text && it) {
                it.desc = text;
                if (descInput) descInput.value = text;
            }
        } catch (e) {
            console.error('autoDescItem error', e);
            alert('Gagal generate deskripsi: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="sparkles" style="width:10px;height:10px;pointer-events:none;"></i>'; if (window.lucide) window.lucide.createIcons({ nodes: [btn] }); }
        }
    }

    // ── AI: Auto foto item via /generate ────────────────────────────────────
    async function autoFotoItem(itemId) {
        if (!GENERATE_URL) { alert('GENERATE_URL tidak tersedia.'); return; }
        const it = state.items.find(x => x.id === itemId);
        if (!it || !it.name.trim()) { alert('Isi nama item dulu.'); return; }

        const btn = document.querySelector(`.mr-ai-btn.foto[data-id="${itemId}"]`);
        const photoArea = document.querySelector(`.mr-item-photo-area[data-photo-id="${itemId}"]`);
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="mr-spin"></span>'; }

        try {
            const prompt = `Professional food photography of "${it.name}", ${it.desc || 'Indonesian cuisine'}, top-down or 45-degree angle, vibrant colors, appetizing, clean white background, studio lighting, high resolution`;
            const formData = new FormData();
            formData.append('instruction', prompt);
            formData.append('aspectRatio', '1:1');
            const response = await fetch(GENERATE_URL, {
                method: 'POST',
                headers: { 'X-API-Key': API_KEY },
                body: formData
            });
            if (!response.ok) throw new Error(await getApiErrorMsg(response));
            const result = await response.json();
            if (!result.success || !result.imageUrl) throw new Error('Tidak ada gambar dari API.');
            if (it) {
                it.photo = result.imageUrl;
                if (photoArea) {
                    photoArea.innerHTML = `<img src="${result.imageUrl}" class="w-full h-full object-cover"><input type="file" class="hidden mr-item-photo-input" accept="image/*">`;
                    const newInput = photoArea.querySelector('.mr-item-photo-input');
                    if (newInput) {
                        photoArea.addEventListener('click', () => newInput.click(), { once: true });
                        newInput.addEventListener('change', e => handlePhotoFileChange(e, itemId));
                    }
                }
            }
        } catch (e) {
            console.error('autoFotoItem error', e);
            alert('Gagal generate foto: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="camera" style="width:10px;height:10px;pointer-events:none;"></i>Buat Foto'; if (window.lucide) window.lucide.createIcons({ nodes: [btn] }); }
        }
    }

    // ── Render item list ─────────────────────────────────────────────────────
    function handlePhotoFileChange(e, itemId) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const it = state.items.find(x => x.id === itemId);
            if (it) { it.photo = ev.target.result; renderItems(); }
        };
        reader.readAsDataURL(file);
    }

    function renderItems() {
        const filtered = state.catFilter === 'all'
            ? state.items
            : state.items.filter(it => it.category === state.catFilter);

        itemsEmpty.style.display = state.items.length === 0 ? 'block' : 'none';
        itemsList.innerHTML = '';

        filtered.forEach(item => {
            const row = document.createElement('div');
            row.className = 'mr-item-row';
            row.setAttribute('data-id', item.id);
            row.innerHTML = `
                <div class="flex gap-2 items-start">
                    <div class="flex flex-col items-center gap-1">
                        <div class="mr-item-photo-area" data-photo-id="${item.id}" title="Upload foto item">
                            ${item.photo
                                ? `<img src="${item.photo}" class="w-full h-full object-cover">`
                                : `<i data-lucide="camera" class="w-4 h-4 text-slate-300 pointer-events-none"></i>`}
                            <input type="file" class="hidden mr-item-photo-input" accept="image/*">
                        </div>
                        <button class="mr-ai-btn foto" data-id="${item.id}" title="Auto generate foto"><i data-lucide="camera" style="width:10px;height:10px;pointer-events:none;"></i>Buat Foto</button>
                    </div>
                    <div class="flex-1 grid grid-cols-2 gap-1.5">
                        <div>
                            <label class="mr-label">Nama *</label>
                            <input type="text" class="mr-input mr-f-name" placeholder="Nasi Goreng Spesial" value="${escHtml(item.name)}">
                        </div>
                        <div>
                            <label class="mr-label">Kategori</label>
                            <select class="mr-input mr-f-cat">
                                ${['Makanan Utama','Minuman','Dessert','Snack','Paket','Spesial','Lainnya']
                                    .map(c => `<option value="${c}"${c===item.category?' selected':''}>${c}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="mr-label">Harga *</label>
                            <input type="text" class="mr-input mr-f-price" placeholder="25.000" value="${escHtml(item.price)}">
                        </div>
                        <div>
                            <label class="mr-label flex items-center justify-between">
                                <span>Deskripsi</span>
                                <button class="mr-ai-btn desc" data-id="${item.id}" title="Auto generate deskripsi"><i data-lucide="sparkles" style="width:10px;height:10px;pointer-events:none;"></i></button>
                            </label>
                            <textarea class="mr-input mr-f-desc" data-id="${item.id}" placeholder="Deskripsi singkat..." rows="2" style="resize:vertical;min-height:36px;">${escHtml(item.desc)}</textarea>
                        </div>
                    </div>
                    <button class="mr-del-btn flex-shrink-0 w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition-colors" title="Hapus">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5 pointer-events-none"></i>
                    </button>
                </div>`;
            itemsList.appendChild(row);

            // Photo upload click
            const photoArea = row.querySelector('.mr-item-photo-area');
            const photoInput = row.querySelector('.mr-item-photo-input');
            photoArea.addEventListener('click', () => photoInput.click());
            photoInput.addEventListener('change', e => handlePhotoFileChange(e, item.id));

            // AI buttons
            row.querySelector('.mr-ai-btn.desc').addEventListener('click', e => { e.stopPropagation(); autoDescItem(item.id); });
            row.querySelector('.mr-ai-btn.foto').addEventListener('click', e => { e.stopPropagation(); autoFotoItem(item.id); });

            // Field sync
            row.querySelector('.mr-f-name').addEventListener('input', e => { const it = state.items.find(x => x.id === item.id); if (it) it.name = e.target.value; });
            row.querySelector('.mr-f-cat').addEventListener('change', e => { const it = state.items.find(x => x.id === item.id); if (it) it.category = e.target.value; renderItems(); });
            row.querySelector('.mr-f-price').addEventListener('input', e => { const it = state.items.find(x => x.id === item.id); if (it) it.price = e.target.value; });
            row.querySelector('.mr-f-desc').addEventListener('input', e => { const it = state.items.find(x => x.id === item.id); if (it) it.desc = e.target.value; });
            row.querySelector('.mr-del-btn').addEventListener('click', () => removeItem(item.id));
        });

        if (window.lucide) window.lucide.createIcons({ nodes: itemsList.querySelectorAll('[data-lucide]') });
    }

    // ── Demo data ─────────────────────────────────────────────────────────────
    function importDemo() {
        const demo = [
            { category: 'Makanan Utama', name: 'Nasi Goreng Spesial',  desc: 'Cabe rawit, telur mata sapi, ayam suwir, kerupuk',   price: '25.000' },
            { category: 'Makanan Utama', name: 'Mie Goreng Seafood',   desc: 'Cumi, udang, sayuran segar, saus tiram',             price: '28.000' },
            { category: 'Makanan Utama', name: 'Ayam Bakar Madu',      desc: 'Marinasi rempah, saus madu, sambal matah',           price: '35.000' },
            { category: 'Minuman',       name: 'Es Teh Manis',         desc: 'Teh segar, gula aren, es batu, daun mint',           price: '8.000'  },
            { category: 'Minuman',       name: 'Jus Alpukat',          desc: 'Alpukat segar, susu kental manis, coklat bubuk',     price: '15.000' },
            { category: 'Dessert',       name: 'Es Campur Spesial',    desc: 'Cincau, nata de coco, sirup merah, santan',          price: '12.000' },
        ];
        demo.forEach(d => addItem(d));
        if (window.lucide) window.lucide.createIcons({ nodes: wrap.querySelectorAll('[data-lucide]') });
    }

    // ── Generate — /chat analysis → /generate per page ───────────────────────
    document.getElementById('mr-generate-btn').addEventListener('click', generateMenu);
    document.getElementById('mr-regenerate-btn').addEventListener('click', generateMenu);

    async function generateMenu() {
        const name = document.getElementById('mr-name').value.trim();
        if (!name) { alert('Masukkan nama restoran terlebih dahulu.'); return; }
        if (state.items.length === 0) { alert('Tambahkan minimal 1 item menu.'); return; }
        if (!CHAT_URL || !GENERATE_URL) { alert('Endpoint API belum dikonfigurasi.'); return; }

        const restoInfo = {
            name,
            tagline: document.getElementById('mr-tagline').value.trim(),
            address: document.getElementById('mr-address').value.trim(),
            contact: document.getElementById('mr-contact').value.trim(),
            logo:    state.logo
        };
        const cols = parseInt(document.getElementById('mr-cols').value);
        const ipp  = parseInt(document.getElementById('mr-ipp').value);
        const size = document.getElementById('mr-page-size').value;
        const tpl  = state.template;

        // ── Button state ──────────────────────────────────────────────────────
        const genBtn   = document.getElementById('mr-generate-btn');
        const regenBtn = document.getElementById('mr-regenerate-btn');
        const origHTML = genBtn.innerHTML;
        genBtn.disabled = true;
        if (regenBtn) regenBtn.disabled = true;
        genBtn.innerHTML = `<div class="mr-spin" style="width:16px;height:16px;border-width:2.5px;"></div><span>Fase 1/4...</span>`;

        if (previewEmpty) previewEmpty.classList.add('hidden');
        previewSec.classList.remove('hidden');
        pagesWrap.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 gap-4">
                <div class="mr-spin" style="width:36px;height:36px;border-width:3.5px;color:#f59e0b;"></div>
                <p class="text-sm font-semibold text-slate-500" id="mr-gen-status">Fase 1/4 - Menganalisa desain dengan AI...</p>
            </div>`;
        const setStatus = msg => { const el = document.getElementById('mr-gen-status'); if (el) el.textContent = msg; };

        try {
            // ── 1. Split items into pages ─────────────────────────────────────
            const catOrder = [], catMap = {};
            state.items.forEach(it => {
                if (!catMap[it.category]) { catMap[it.category] = []; catOrder.push(it.category); }
                catMap[it.category].push(it);
            });
            const flat = [];
            catOrder.forEach(cat => {
                flat.push({ type: 'cat', name: cat });
                catMap[cat].forEach(it => flat.push({ type: 'item', data: it }));
            });
            const pages = [];
            let pg = [], cnt = 0;
            flat.forEach(node => {
                pg.push(node);
                if (node.type === 'item') { cnt++; if (cnt >= ipp) { pages.push(pg); pg = []; cnt = 0; } }
            });
            if (pg.length) pages.push(pg);

            const customStyleText = (document.getElementById('mr-custom-style')?.value || '').trim();
            const tplLabels  = { dark: 'Dark Elegant (dark background, gold accents)', classic: 'Classic Brown (warm cream, serif fonts)', minimal: 'Modern Minimal (white, clean lines)', vibrant: 'Vibrant (bold gradient, colorful)', custom: customStyleText || 'Custom style restaurant menu' };
            const sizeLabels = { a4: 'A4 Portrait', a4l: 'A4 Landscape', letter: 'Letter Portrait', square: 'Square' };
            const arMap      = { a4: '3:4', a4l: '4:3', letter: '3:4', square: '1:1' };
            const aspectRatio = arMap[size] || '3:4';

            // ─── PHASE A: /chat ── design prompt + background-only prompt ────────────
            setStatus('Fase 1/4 - Menganalisa desain dengan AI...');
            const itemsText = state.items.map(it =>
                `  - ${it.name} | ${it.category} | Rp ${it.price}${it.desc ? ` | "${it.desc}"` : ''}`
            ).join('\n');

            const chatPrompt = `You are a world-class restaurant menu designer. Output EXACTLY two sections separated by ---BG---.\n\nSECTION 1 (before ---BG---): Highly detailed image generation prompt (200-300 words) for a complete restaurant menu page. Include: visual style for "${tplLabels[tpl]}", typography for restaurant name/categories/prices, ${cols}-column grid, header with restaurant name${restoInfo.tagline ? ` and tagline "${restoInfo.tagline}"` : ''}, footer, decorative elements, food photo frame treatment, print quality (300 DPI, high resolution, print-ready).\n\nSECTION 2 (after ---BG---): Background-only prompt (80-120 words). BACKGROUND ONLY - no text, no food, no logos. Only texture, colors, decorative borders, ornamental motifs, paper feel. Must match "${tplLabels[tpl]}" aesthetic.\n\nRESTAURANT:\nName: ${restoInfo.name}${restoInfo.tagline ? `\nTagline: "${restoInfo.tagline}"` : ''}${restoInfo.address ? `\nAddress: ${restoInfo.address}` : ''}\nTemplate: ${tplLabels[tpl]}, Page: ${sizeLabels[size]}, Layout: ${cols} cols / ${ipp} items per page\n\nMENU (${state.items.length} items):\n${itemsText}\n\nOutput ONLY the two sections. No extra commentary.`;

            const chatFd = new FormData();
            chatFd.append('prompt', chatPrompt);
            const chatResp = await fetch(CHAT_URL, { method: 'POST', headers: { 'X-API-Key': API_KEY }, body: chatFd });
            if (!chatResp.ok) throw new Error(await getApiErrorMsg(chatResp));
            const chatResult = await chatResp.json();
            const chatText = (chatResult.response || chatResult.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
            if (!chatText) throw new Error('AI tidak menghasilkan prompt desain. Coba lagi.');

            const bgDelim     = chatText.indexOf('---BG---');
            const basePrompt  = bgDelim > 0 ? chatText.substring(0, bgDelim).trim() : chatText;
            const bgOnlyPrompt = bgDelim > 0 ? chatText.substring(bgDelim + 8).trim()
                : `${tplLabels[tpl]} restaurant menu background only. Decorative borders, texture, color palette, paper feel. No text, no food, no logos.`;

            // ─── PHASE B: /generate ── background layer ──────────────────────────────
            setStatus('Fase 2/4 - Membuat background menu...');
            genBtn.innerHTML = `<div class="mr-spin" style="width:16px;height:16px;border-width:2.5px;"></div><span>Fase 2/4...</span>`;
            let bgBlob = null;
            try {
                const bgFd = new FormData();
                bgFd.append('instruction', bgOnlyPrompt);
                bgFd.append('aspectRatio', aspectRatio);
                const bgResp = await fetch(GENERATE_URL, { method: 'POST', headers: { 'X-API-Key': API_KEY }, body: bgFd });
                if (bgResp.ok) {
                    const bgResult = await bgResp.json();
                    if (bgResult.success && bgResult.imageUrl) bgBlob = await urlToBlob(bgResult.imageUrl);
                }
            } catch(e) { console.warn('BG generation skipped:', e.message); }

            // ─── PHASE C: /generate ── auto-generate missing item photos ─────────────
            const itemsNeedingPhotos = state.items.filter(it => it.name.trim() && !it.photo);
            if (itemsNeedingPhotos.length > 0) {
                setStatus(`Fase 3/4 - Generate foto ${itemsNeedingPhotos.length} item...`);
                genBtn.innerHTML = `<div class="mr-spin" style="width:16px;height:16px;border-width:2.5px;"></div><span>Fase 3/4...</span>`;
                for (const it of itemsNeedingPhotos.slice(0, 8)) {
                    try {
                        const pFd = new FormData();
                        pFd.append('instruction', `Professional food photography, white studio background, 45-degree angle, vibrant colors, appetizing, high resolution: "${it.name}"${it.desc ? `, ${it.desc}` : ''}, ${it.category} dish`);
                        pFd.append('aspectRatio', '1:1');
                        const pResp = await fetch(GENERATE_URL, { method: 'POST', headers: { 'X-API-Key': API_KEY }, body: pFd });
                        if (pResp.ok) { const pResult = await pResp.json(); if (pResult.success && pResult.imageUrl) it.photo = pResult.imageUrl; }
                    } catch(e) {}
                }
                renderItems();
            } else {
                setStatus('Fase 3/4 - Foto item siap.');
            }

            // ─── PHASE D: /generate ── composite each page ───────────────────────────
            setStatus(`Fase 4/4 - Menyusun ${pages.length} halaman...`);
            genBtn.innerHTML = `<div class="mr-spin" style="width:16px;height:16px;border-width:2.5px;"></div><span>Fase 4/4...</span>`;
            pagesWrap.innerHTML = '';

            for (let i = 0; i < pages.length; i++) {
                const pageItems      = pages[i].filter(n => n.type === 'item').map(n => n.data);
                const pageCategories = [...new Set(pages[i].filter(n => n.type === 'cat').map(n => n.name))];

                const card = document.createElement('div');
                card.className = 'mr-result-card mb-4';
                card.innerHTML = `
                    <div class="w-full max-w-2xl mx-auto rounded-2xl border border-slate-100 bg-slate-50 flex flex-col items-center justify-center gap-3 py-14">
                        <div class="mr-spin" style="width:30px;height:30px;border-width:3px;color:#f59e0b;"></div>
                        <p class="text-xs font-semibold text-slate-400">Menyusun halaman ${i+1} / ${pages.length}...</p>
                    </div>`;
                pagesWrap.appendChild(card);
                setStatus(`Fase 4/4 - Halaman ${i+1} dari ${pages.length}...`);

                try {
                    const pageItemText = pageItems.map(it =>
                        `"${it.name}" (${it.category}, Rp ${it.price}${it.desc ? `, ${it.desc}` : ''})`
                    ).join('; ');

                    const compositePrompt = `${basePrompt}\n\nCOMPOSITE PAGE ${i+1}/${pages.length}:\nUSE the provided background image as the base layer. Overlay:\n- Header: "${restoInfo.name}"${restoInfo.tagline ? ` | "${restoInfo.tagline}"` : ''}\n- Categories: ${pageCategories.join(', ') || 'General'}\n- Items (${pageItems.length}): ${pageItemText}\n- Arrange provided food photo references in item grid slots\n${i === 0 && restoInfo.address ? `- Footer: ${restoInfo.address}${restoInfo.contact ? ` | ${restoInfo.contact}` : ''}` : `- Footer: Page ${i+1} of ${pages.length}`}\n${restoInfo.logo ? '- Leave a clear rounded area (top corner, ~10% width) for logo overlay' : ''}\nPrices in "Rp X.XXX" format. Print-ready, ultra high resolution.`;

                    const genFd = new FormData();
                    genFd.append('instruction', compositePrompt);
                    genFd.append('aspectRatio', aspectRatio);
                    if (bgBlob) genFd.append('images[]', bgBlob, 'background.jpg');
                    for (const it of pageItems) {
                        if (!it.photo) continue;
                        try {
                            const blob = it.photo.startsWith('data:') ? dataUrlToBlob(it.photo) : await urlToBlob(it.photo);
                            genFd.append('images[]', blob, `food_${it.name.slice(0,8).replace(/\s/g,'_')}.jpg`);
                        } catch(e) {}
                    }

                    const genResp = await fetch(GENERATE_URL, { method: 'POST', headers: { 'X-API-Key': API_KEY }, body: genFd });
                    if (!genResp.ok) throw new Error(await getApiErrorMsg(genResp));
                    const genResult = await genResp.json();
                    if (!genResult.success || !genResult.imageUrl) throw new Error('Tidak ada gambar dari server.');

                    // PHASE E: Canvas overlay logo (preserves logo exactly)
                    let finalUrl = genResult.imageUrl;
                    if (restoInfo.logo) {
                        try { finalUrl = await canvasOverlayLogo(finalUrl, restoInfo.logo, tpl); }
                        catch(e) { console.warn('Logo overlay skipped:', e.message); }
                    }

                    const dlName = `${restoInfo.name.replace(/\s+/g,'-')}-hal${i+1}.png`;
                    card.innerHTML = `
                        <div class="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-lg border border-slate-100 group">
                            <img src="${finalUrl}" class="w-full h-auto block" alt="Menu halaman ${i+1}" loading="lazy">
                            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                            <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <span class="text-white text-xs font-bold drop-shadow-md">Halaman ${i+1} / ${pages.length}</span>
                                <div class="flex gap-1.5">
                                    <a href="${finalUrl}" download="${dlName}" class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white text-xs font-bold border border-white/20 transition-all" title="Unduh PNG">
                                        <i data-lucide="download" class="w-3 h-3 pointer-events-none"></i>
                                    </a>
                                </div>
                            </div>
                        </div>`;
                    if (window.lucide) window.lucide.createIcons({ nodes: card.querySelectorAll('[data-lucide]') });

                } catch (pageErr) {
                    console.error(`Page ${i+1} error:`, pageErr);
                    card.innerHTML = `
                        <div class="w-full max-w-2xl mx-auto rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
                            <p class="text-sm font-semibold text-red-500 mb-1">Halaman ${i+1} gagal</p>
                            <p class="text-xs text-red-400 break-all max-w-xs mx-auto">${pageErr.message}</p>
                            <button class="mt-3 px-4 py-1.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all mr-retry-page">Coba Lagi</button>
                        </div>`;
                    card.querySelector('.mr-retry-page')?.addEventListener('click', generateMenu);
                }
            }

            pageInfo.textContent = `${pages.length} halaman - ${state.items.length} item - AI Generated`;
            setTimeout(() => previewSec.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);

        } catch (err) {
            console.error('generateMenu error:', err);
            pagesWrap.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 gap-3 max-w-sm mx-auto text-center">
                    <div class="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                        <i data-lucide="alert-circle" class="w-6 h-6 text-red-400"></i>
                    </div>
                    <p class="text-sm font-bold text-red-500">Gagal generate menu</p>
                    <p class="text-xs text-slate-400">${err.message}</p>
                    <button id="mr-retry-main" class="mt-1 px-5 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-all">Coba Lagi</button>
                </div>`;
            if (window.lucide) window.lucide.createIcons({ nodes: pagesWrap.querySelectorAll('[data-lucide]') });
            document.getElementById('mr-retry-main')?.addEventListener('click', generateMenu);
        } finally {
            genBtn.disabled = false;
            genBtn.innerHTML = origHTML;
            if (regenBtn) regenBtn.disabled = false;
            if (window.lucide) window.lucide.createIcons({ nodes: [genBtn] });
        }
    }

    // ── Download PDF — open all generated images in print window ─────────────
    document.getElementById('mr-dl-pdf-btn').addEventListener('click', () => {
        const imgs = [...pagesWrap.querySelectorAll('img')];
        if (!imgs.length) { alert('Generate menu dulu.'); return; }
        const win = window.open('', '_blank');
        if (!win) { alert('Aktifkan popup untuk print.'); return; }
        const imgTags = imgs.map(img => `<img src="${img.src}" style="width:100%;max-width:794px;display:block;margin:0 auto 24px;page-break-after:always;">`).join('');
        win.document.write(`<!DOCTYPE html><html><head><title>${document.getElementById('mr-name').value||'Menu'}</title><style>body{margin:0;padding:16px;background:#fff;}@media print{body{padding:0;}img{page-break-after:always;max-width:100%!important;}}</style></head><body>${imgTags}<script>window.onload=()=>{window.print();}<\/script></body></html>`);
        win.document.close();
    });

    // ── Download PNG — trigger all image downloads ────────────────────────────
    document.getElementById('mr-dl-png-btn').addEventListener('click', async () => {
        const imgs = [...pagesWrap.querySelectorAll('img')];
        if (!imgs.length) { alert('Generate menu dulu.'); return; }
        const restoName = (document.getElementById('mr-name').value || 'menu').replace(/\s+/g, '-');
        const btn = document.getElementById('mr-dl-png-btn');
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader" class="w-3 h-3 animate-spin"></i> Unduh...';
        if (window.lucide) window.lucide.createIcons({ nodes: [btn] });
        for (let i = 0; i < imgs.length; i++) {
            const a = document.createElement('a');
            a.href = imgs[i].src;
            a.download = `${restoName}-hal${i+1}.png`;
            a.click();
            await sleep(400);
        }
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="image" class="w-3 h-3"></i> PNG';
        if (window.lucide) window.lucide.createIcons({ nodes: [btn] });
    });

    // ── Helpers ───────────────────────────────────────────────────────────────
    function escHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function dataUrlToBlob(dataUrl) {
        const [meta, b64] = dataUrl.split(',');
        const mime = meta.match(/:(.*?);/)[1];
        const bytes = atob(b64);
        const arr = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        return new Blob([arr], { type: mime });
    }
    async function urlToBlob(url) {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
        return r.blob();
    }
    function loadImg(src) {
        return new Promise((res, rej) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => res(img);
            img.onerror = rej;
            img.src = src;
        });
    }
    async function canvasOverlayLogo(menuImgUrl, logoDataUrl, template) {
        const menuBlob    = await urlToBlob(menuImgUrl);
        const menuBlobUrl = URL.createObjectURL(menuBlob);
        const menuImg     = await loadImg(menuBlobUrl);
        URL.revokeObjectURL(menuBlobUrl);
        const logoImg = await loadImg(logoDataUrl);
        const canvas  = document.createElement('canvas');
        canvas.width  = menuImg.naturalWidth;
        canvas.height = menuImg.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(menuImg, 0, 0);
        const size = Math.min(Math.round(canvas.width * 0.10), 96);
        const pad  = Math.round(canvas.width * 0.025);
        const isRight = (template === 'dark' || template === 'vibrant');
        const x = isRight ? canvas.width - size - pad : pad;
        const y = pad;
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logoImg, x, y, size, size);
        ctx.restore();
        return canvas.toDataURL('image/jpeg', 0.93);
    }
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    // Spinner style (injected once)
    if (!document.getElementById('mr-spin-style')) {
        const st = document.createElement('style');
        st.id = 'mr-spin-style';
        st.textContent = '.mr-spin{display:inline-block;width:10px;height:10px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:mr-spin 0.6s linear infinite;} @keyframes mr-spin{to{transform:rotate(360deg);}}';
        document.head.appendChild(st);
    }

    if (window.lucide) window.lucide.createIcons({ nodes: wrap.querySelectorAll('[data-lucide]') });
};
