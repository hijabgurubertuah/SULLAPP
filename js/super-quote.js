window.initSuperQuote = function ({ document, setupOptionButtons, getAspectRatioClass, lucide, getApiKey, GENERATE_URL, CHAT_URL, getApiErrorMessage, doneSound, errorSound }) {

    const sqGenerateBtn = document.getElementById('sq-generate-btn');
    if (!sqGenerateBtn) return null;

    const sqGenerateText = document.getElementById('sq-generate-text');
    const sqQuotePreview = document.getElementById('sq-quote-preview');
    const sqQuoteText = document.getElementById('sq-quote-text');
    const sqQuoteSource = document.getElementById('sq-quote-source');
    const sqCopyBtn = document.getElementById('sq-copy-btn');
    const sqResultsPlaceholder = document.getElementById('sq-results-placeholder');
    const sqResultsContainer = document.getElementById('sq-results-container');
    const sqResultsGrid = document.getElementById('sq-results-grid');
    const sqTemaCustom = document.getElementById('sq-tema-custom');
    const sqPersonalInput = document.getElementById('sq-personal-input');
    const sqTokoh = document.getElementById('sq-tokoh');

    let currentMode = 'tema';
    let generatedQuote = '';

    // --- Mode Toggle ---
    function setMode(mode) {
        currentMode = mode;
        document.getElementById('sq-tema-section').classList.toggle('hidden', mode !== 'tema');
        document.getElementById('sq-personal-section').classList.toggle('hidden', mode !== 'personal');

        document.getElementById('sq-mode-tema').className = `flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'tema' ? 'shadow-sm bg-white text-teal-700' : 'text-slate-500 hover:text-slate-700'}`;
        document.getElementById('sq-mode-personal').className = `flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'personal' ? 'shadow-sm bg-white text-teal-700' : 'text-slate-500 hover:text-slate-700'}`;
    }

    document.getElementById('sq-mode-tema').addEventListener('click', () => setMode('tema'));
    document.getElementById('sq-mode-personal').addEventListener('click', () => setMode('personal'));

    // --- Tema Chips ---
    document.querySelectorAll('.sq-tema-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.sq-tema-chip').forEach(c => c.classList.remove('border-teal-400', 'text-teal-700', 'bg-teal-50'));
            chip.classList.add('border-teal-400', 'text-teal-700', 'bg-teal-50');
            sqTemaCustom.value = '';
        });
    });
    sqTemaCustom.addEventListener('input', () => {
        if (sqTemaCustom.value.trim()) {
            document.querySelectorAll('.sq-tema-chip').forEach(c => c.classList.remove('border-teal-400', 'text-teal-700', 'bg-teal-50'));
        }
    });

    // --- Option Buttons ---
    if (typeof setupOptionButtons === 'function') {
        setupOptionButtons(document.getElementById('sq-lang-options'));
        setupOptionButtons(document.getElementById('sq-gaya-bahasa'));
        setupOptionButtons(document.getElementById('sq-format'));
        setupOptionButtons(document.getElementById('sq-bg-style'));
    } else {
        [document.getElementById('sq-lang-options'), document.getElementById('sq-gaya-bahasa'), document.getElementById('sq-format'), document.getElementById('sq-bg-style')].forEach(container => {
            if (!container) return;
            container.querySelectorAll('.option-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    container.querySelectorAll('.option-btn').forEach(b => {
                        b.classList.remove('selected', 'border-teal-300', 'bg-teal-50', 'text-teal-700');
                        b.classList.add('border-slate-200', 'bg-white', 'text-slate-600');
                    });
                    btn.classList.add('selected', 'border-teal-300', 'bg-teal-50', 'text-teal-700');
                    btn.classList.remove('border-slate-200', 'bg-white', 'text-slate-600');
                });
            });
        });
    }

    // --- Copy Button ---
    sqCopyBtn.addEventListener('click', () => {
        if (!generatedQuote) return;
        navigator.clipboard.writeText(generatedQuote).then(() => {
            sqCopyBtn.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5"></i> Disalin!';
            if (typeof lucide !== 'undefined') lucide.createIcons({ el: sqCopyBtn });
            setTimeout(() => {
                sqCopyBtn.innerHTML = '<i data-lucide="copy" class="w-3.5 h-3.5"></i> Salin';
                if (typeof lucide !== 'undefined') lucide.createIcons({ el: sqCopyBtn });
            }, 2000);
        });
    });

    // --- Helper: get selected value ---
    const getSelected = (containerId) => {
        const el = document.getElementById(containerId)?.querySelector('.option-btn.selected');
        return el?.dataset.value || '';
    };

    const getBgStylePrompt = (style) => {
        const map = {
            dark: 'dark cinematic moody deep navy charcoal background with dramatic lighting',
            aesthetic: 'soft aesthetic pastel dreamy bokeh background with gentle warm tones',
            minimal: 'clean minimal white light grey geometric background with subtle shadow',
            nature: 'lush green nature forest bokeh background with soft morning light',
            neon: 'vibrant neon cyberpunk purple pink glowing light streaks dark background',
        };
        return map[style] || '';
    };

    const getGayaPrompt = (gaya) => {
        const map = {
            bijak: 'wise, thoughtful, philosophical and profound tone',
            santai: 'casual, relaxed, friendly and conversational tone',
            brutal: 'brutally honest, raw, blunt and no-nonsense tone',
            motivasi: 'highly motivational, energetic, inspiring and uplifting tone',
        };
        return map[gaya] || 'wise and inspiring tone';
    };

    // --- Main Generate ---
    sqGenerateBtn.addEventListener('click', async () => {
        const API_KEY = getApiKey();
        if (!API_KEY) { alert('API Key tidak ditemukan.'); return; }

        // Gather inputs
        const selectedTemaChip = document.querySelector('.sq-tema-chip.border-teal-400');
        const temaValue = sqTemaCustom.value.trim() || selectedTemaChip?.dataset.tema || '';
        const personalValue = sqPersonalInput?.value.trim() || '';
        const lang = getSelected('sq-lang-options') || 'id';
        const gayaBahasa = getSelected('sq-gaya-bahasa') || 'bijak';
        const tokoh = sqTokoh?.value || '';
        const format = getSelected('sq-format') || '1:1';
        const bgStyle = getSelected('sq-bg-style') || 'luxury';

        if (currentMode === 'tema' && !temaValue) { alert('Pilih atau ketik tema terlebih dahulu.'); return; }
        if (currentMode === 'personal' && !personalValue) { alert('Ceritakan masalahmu terlebih dahulu.'); return; }

        // VIP check: jika halaman PRO tampilkan upgrade modal
        if (!window.IS_VIP_APP) {
            if (typeof window.showUpgradeVipPopup === 'function') {
                window.showUpgradeVipPopup();
            } else {
                const modal = document.getElementById('upgrade-vip-modal');
                if (modal) modal.classList.add('active');
                else alert('Fitur Super Quote khusus VIP. Silakan upgrade!');
            }
            return;
        }

        // UI Loading
        const originalHTML = sqGenerateBtn.innerHTML;
        const originalStyle = sqGenerateBtn.style.cssText;
        sqGenerateBtn.disabled = true;
        sqGenerateBtn.innerHTML = '<div class="flex items-center justify-center gap-2"><div class="spinner w-4 h-4"></div><span>Membuat quote...</span></div>';

        sqResultsPlaceholder.classList.add('hidden');
        sqResultsContainer.classList.add('hidden');
        sqResultsGrid.innerHTML = '';
        sqQuotePreview.classList.add('hidden');

        try {
            // === STEP 1: Generate Quote via CHAT_URL ===
            let quotePrompt = '';
            if (currentMode === 'tema') {
                quotePrompt = `Buat 1 quote singkat dan powerful tentang tema "${temaValue}". Gunakan gaya bahasa ${getGayaPrompt(gayaBahasa)}.`;
            } else {
                quotePrompt = `Seorang user sedang mengalami masalah: "${personalValue}". Buatkan 1 quote yang sangat personal dan terasa dibuat khusus untuk situasinya. Gunakan gaya bahasa ${getGayaPrompt(gayaBahasa)}.`;
            }
            if (tokoh) {
                quotePrompt += ` Tulis dengan gaya bicara dan perspektif khas ${tokoh}.`;
            }
            quotePrompt += lang === 'en'
                ? ` Provide ONLY the quote itself, no quotation marks, no explanation, no attribution. Write in English. Maximum 3 sentences.`
                : ` Berikan HANYA quote-nya saja tanpa tanda kutip, tanpa penjelasan, tanpa atribusi. Bahasa Indonesia. Maksimal 3 kalimat.`;

            const chatFormData = new FormData();
            chatFormData.append('prompt', quotePrompt);

            const chatResponse = await fetch(CHAT_URL, {
                method: 'POST',
                headers: { 'X-API-Key': API_KEY },
                body: chatFormData
            });

            if (!chatResponse.ok) throw new Error(await getApiErrorMessage(chatResponse));
            const quoteRaw = await chatResponse.text();
            // Parse JSON response {"success":true,"response":"..."}
            try {
                const parsed = JSON.parse(quoteRaw);
                generatedQuote = (parsed.response || parsed.text || quoteRaw).trim();
            } catch {
                generatedQuote = quoteRaw.trim();
            }
            generatedQuote = generatedQuote.replace(/^["'\u201c\u2018]+|["'\u201d\u2019]+$/g, '').trim();

            // Show quote preview
            sqQuoteText.textContent = `"${generatedQuote}"`;
            sqQuoteSource.textContent = tokoh ? `— gaya ${tokoh}` : '';
            sqQuotePreview.classList.remove('hidden');
            if (typeof lucide !== 'undefined') lucide.createIcons({ el: sqQuotePreview });

            // === STEP 2a: Buat image prompt via CHAT_URL berdasarkan quote ===
            sqGenerateBtn.innerHTML = '<div class="flex items-center justify-center gap-2"><div class="spinner w-4 h-4"></div><span>Menyiapkan prompt gambar...</span></div>';

            const bgStyleHint = getBgStylePrompt(bgStyle);
            const styleClause = bgStyleHint ? ` dengan gaya visual: ${bgStyleHint}.` : ' dengan gaya visual yang paling cocok dan menarik.';
            const imgPromptQuery = `Dari quote ini: "${generatedQuote}", buatkan satu prompt bahasa Inggris yang singkat untuk generate gambar latar belakang yang SANGAT relevan dengan isi dan nuansa quote tersebut${styleClause} Tidak ada teks, tidak ada wajah manusia, tidak ada tipografi. Berikan HANYA promptnya saja, maksimal 2 kalimat.`;

            const imgPromptForm = new FormData();
            imgPromptForm.append('prompt', imgPromptQuery);
            const imgPromptRes = await fetch(CHAT_URL, {
                method: 'POST',
                headers: { 'X-API-Key': API_KEY },
                body: imgPromptForm
            });
            let imagePrompt = '';
            if (imgPromptRes.ok) {
                const imgPromptRaw = await imgPromptRes.text();
                try {
                    const p = JSON.parse(imgPromptRaw);
                    imagePrompt = (p.response || p.text || imgPromptRaw).trim();
                } catch { imagePrompt = imgPromptRaw.trim(); }
            }
            if (!imagePrompt) imagePrompt = `Beautiful artistic background${bgStyleHint ? ', ' + bgStyleHint : ''}, no text, no faces, high quality.`;
            else imagePrompt += ', no text, no words, no typography, no faces, high quality.';

            // === STEP 2b: Generate background image via GENERATE_URL ===
            sqGenerateBtn.innerHTML = '<div class="flex items-center justify-center gap-2"><div class="spinner w-4 h-4"></div><span>Membuat poster...</span></div>';

            const card = document.createElement('div');
            card.className = 'relative overflow-hidden rounded-2xl shadow-lg bg-slate-900';
            card.innerHTML = `<div class="flex flex-col items-center gap-3 text-center p-8 min-h-[300px] justify-center">
                <div class="spinner"></div>
                <span class="text-xs text-slate-400">Membuat background...</span>
            </div>`;

            sqResultsContainer.classList.remove('hidden');
            sqResultsGrid.appendChild(card);

            const posterFormData = new FormData();
            posterFormData.append('instruction', imagePrompt);
            posterFormData.append('aspectRatio', format);

            const posterResponse = await fetch(GENERATE_URL, {
                method: 'POST',
                headers: { 'X-API-Key': API_KEY },
                body: posterFormData
            });

            if (!posterResponse.ok) throw new Error(await getApiErrorMessage(posterResponse));
            const posterResult = await posterResponse.json();

            if (!posterResult.success || !posterResult.imageUrl) throw new Error('Gagal generate poster.');

            const imageUrl = posterResult.imageUrl;
            const quoteEscaped = generatedQuote.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const tokohEscaped = tokoh ? tokoh.replace(/'/g, "\\'") : '';
            const ts = Date.now();

            // Card: gambar + overlay solid 50% + teks CENTER
            card.innerHTML = `
                <div class="relative select-none">
                    <img src="${imageUrl}" class="w-full block object-cover">
                    <div class="absolute inset-0 flex flex-col items-center justify-center px-6 py-8 text-center" style="background:rgba(0,0,0,0.50);">
                        <p class="text-white font-bold text-sm sm:text-base leading-relaxed italic" style="text-shadow:0 2px 10px rgba(0,0,0,0.8);max-width:90%;">"${quoteEscaped}"</p>
                        ${tokoh ? `<p class="text-white/75 text-xs mt-3" style="text-shadow:0 1px 4px rgba(0,0,0,0.8);">— gaya ${tokohEscaped}</p>` : ''}
                    </div>
                </div>
                <div class="absolute top-2 right-2 flex gap-1.5">
                    <button data-sq-download="${ts}" class="result-action-btn bg-white/90 backdrop-blur text-slate-700 hover:bg-white shadow-md" title="Unduh Poster">
                        <i data-lucide="download" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons({ el: card });

            // Download via Canvas — baca dimensi & font persis dari elemen preview
            card.querySelector(`[data-sq-download="${ts}"]`)?.addEventListener('click', async () => {
                const btn = card.querySelector(`[data-sq-download="${ts}"]`);
                btn.innerHTML = '<div class="spinner w-4 h-4"></div>';
                try {
                    // Baca dimensi card yang sudah dirender
                    const cardInner = card.querySelector('.relative.select-none');
                    const rect = cardInner.getBoundingClientRect();
                    const W = Math.round(rect.width);
                    const H = Math.round(rect.height);

                    // Baca font size & line height dari elemen teks preview
                    const textEl = cardInner.querySelector('p');
                    const cs = window.getComputedStyle(textEl);
                    const fs = parseFloat(cs.fontSize);       // px, e.g. 14 or 16
                    const lh = parseFloat(cs.lineHeight) || fs * 1.5;
                    const paddingX = 24; // px-6

                    const res = await fetch(imageUrl);
                    const blob = await res.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = W;
                        canvas.height = H;
                        const ctx = canvas.getContext('2d');

                        // 1. Gambar image — fill canvas (sama dengan w-full block)
                        ctx.drawImage(img, 0, 0, W, H);

                        // 2. Overlay solid 50% — sama dengan CSS rgba(0,0,0,0.50)
                        ctx.fillStyle = 'rgba(0,0,0,0.50)';
                        ctx.fillRect(0, 0, W, H);

                        // 3. Quote text — pakai font size & line height persis dari preview
                        ctx.font = `italic bold ${fs}px Georgia, "Times New Roman", serif`;
                        ctx.fillStyle = 'white';
                        ctx.textAlign = 'center';
                        ctx.shadowColor = 'rgba(0,0,0,0.8)';
                        ctx.shadowBlur = 10;
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 2;

                        const maxW = W - paddingX * 2;
                        const words = (`"${generatedQuote}"`).split(' ');
                        let line = '', lines = [];
                        for (const w of words) {
                            const test = line + w + ' ';
                            if (ctx.measureText(test).width > maxW && line) { lines.push(line.trim()); line = w + ' '; }
                            else line = test;
                        }
                        lines.push(line.trim());

                        const tokohFs = fs * 0.75; // text-xs relatif
                        const totalH = lines.length * lh + (tokoh ? tokohFs * 2.5 : 0);
                        let y = (H - totalH) / 2 + fs;

                        for (const l of lines) { ctx.fillText(l, W / 2, y); y += lh; }

                        if (tokoh) {
                            ctx.font = `${tokohFs}px Georgia, serif`;
                            ctx.fillStyle = 'rgba(255,255,255,0.75)';
                            ctx.shadowBlur = 4;
                            ctx.fillText(`— gaya ${tokoh}`, W / 2, y + tokohFs);
                        }

                        canvas.toBlob(b => {
                            const a = document.createElement('a');
                            a.href = URL.createObjectURL(b);
                            a.download = `super_quote_${Date.now()}.png`;
                            a.click();
                        }, 'image/png');
                        URL.revokeObjectURL(blobUrl);
                        btn.innerHTML = '<i data-lucide="download" class="w-4 h-4"></i>';
                        if (typeof lucide !== 'undefined') lucide.createIcons({ el: btn });
                    };
                    img.onerror = () => {
                        window.open(imageUrl, '_blank');
                        btn.innerHTML = '<i data-lucide="download" class="w-4 h-4"></i>';
                        if (typeof lucide !== 'undefined') lucide.createIcons({ el: btn });
                    };
                    img.src = blobUrl;
                } catch {
                    window.open(imageUrl, '_blank');
                    btn.innerHTML = '<i data-lucide="download" class="w-4 h-4"></i>';
                    if (typeof lucide !== 'undefined') lucide.createIcons({ el: btn });
                }
            });

            if (typeof doneSound !== 'undefined') doneSound.play();

        } catch (e) {
            if (typeof errorSound !== 'undefined') errorSound.play();
            sqResultsPlaceholder.classList.remove('hidden');
            sqResultsContainer.classList.add('hidden');
            console.error('Super Quote error:', e);
            alert('Terjadi kesalahan: ' + e.message);
        } finally {
            sqGenerateBtn.disabled = false;
            sqGenerateBtn.innerHTML = originalHTML;
            sqGenerateBtn.style.cssText = originalStyle;
        }
    });

    return { cleanup: () => {} };
};
