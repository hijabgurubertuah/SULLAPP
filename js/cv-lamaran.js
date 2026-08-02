window.initCvLamaran = function({
    document,
    setupOptionButtons,
    lucide,
    getApiKey,
    GENERATE_URL,
    CHAT_URL,
    getApiErrorMessage,
    doneSound,
    errorSound
}) {
    // DOM refs
    const analyzeBtn       = document.getElementById('cv-analyze-btn');
    const analyzeBtnText   = document.getElementById('cv-analyze-btn-text');
    const psBlocker        = document.getElementById('cv-ps-blocker');
    const mainContent      = document.getElementById('cv-main-content');

    const analysisPanel    = document.getElementById('cv-analysis-panel');
    const analysisText     = document.getElementById('cv-analysis-text');
    const closeAnalysisBtn = document.getElementById('cv-close-analysis');

    const resultsContainer = document.getElementById('cv-results-container');
    const resultsGrid      = document.getElementById('cv-results-grid');
    const resultsPlaceholder = document.getElementById('cv-results-placeholder');

    const modelOptions     = document.getElementById('cv-model-options');
    const styleOptions     = document.getElementById('cv-style-options');
    const colorOptions     = document.getElementById('cv-color-options');

    const fotoInput        = document.getElementById('cv-foto-input');
    const fotoUploadBox    = document.getElementById('cv-foto-upload-box');
    const fotoPreview      = document.getElementById('cv-foto-preview');
    const fotoPlaceholder  = document.getElementById('cv-foto-placeholder-icon');
    const fotoRemove       = document.getElementById('cv-foto-remove');
    const addExpBtn        = document.getElementById('cv-add-exp-btn');

    if (!analyzeBtn) return;

    let isGenerating = false;
    let privateServerActive = false;
    let fotoData = null;
    let resultCardIndex = 0;

    // ── Private Server Check ─────────────────────────────────────────────
    async function checkPrivateServer() {
        const email = localStorage.getItem('sulapfoto_verified_email');
        if (!email) {
            showBlocker();
            return;
        }
        try {
            const r = window.getAddonStatus ? await window.getAddonStatus(email, 'private_server') : await (await fetch('/server/addons_payment.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_active_addon', email, addon_key: 'private_server' }) })).json();
            if (r.success && r.is_active) {
                privateServerActive = true;
                hideBlocker();
            } else {
                showBlocker();
            }
        } catch (e) {
            showBlocker();
        }
    }

    function showBlocker() {
        if (psBlocker) psBlocker.classList.remove('hidden');
        if (mainContent) mainContent.classList.add('opacity-40', 'pointer-events-none');
        if (analyzeBtn) analyzeBtn.disabled = true;
    }

    function hideBlocker() {
        if (psBlocker) psBlocker.classList.add('hidden');
        if (mainContent) mainContent.classList.remove('opacity-40', 'pointer-events-none');
        if (analyzeBtn) analyzeBtn.disabled = false;
        if (lucide) lucide.createIcons({ root: psBlocker?.parentElement || document.body });
    }

    checkPrivateServer();

    // ── Option Buttons ────────────────────────────────────────────────────
    if (styleOptions) setupOptionButtons(styleOptions);
    if (colorOptions) setupOptionButtons(colorOptions);
    if (modelOptions) setupOptionButtons(modelOptions);

    // ── Foto Upload ───────────────────────────────────────────────────────
    if (fotoInput && fotoUploadBox) {
        fotoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const dataUrl = ev.target.result;
                const parts = dataUrl.split(',');
                const mime = parts[0].match(/:(.*?);/)[1];
                fotoData = { base64: parts[1], mimeType: mime, dataUrl };
                if (fotoPreview) { fotoPreview.src = dataUrl; fotoPreview.classList.remove('hidden'); }
                if (fotoPlaceholder) fotoPlaceholder.classList.add('hidden');
                if (fotoRemove) fotoRemove.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        });

        if (fotoRemove) {
            fotoRemove.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                fotoData = null;
                fotoInput.value = '';
                if (fotoPreview) { fotoPreview.src = ''; fotoPreview.classList.add('hidden'); }
                if (fotoPlaceholder) fotoPlaceholder.classList.remove('hidden');
                fotoRemove.classList.add('hidden');
            });
        }
    }

    // ── Add Experience Entry ──────────────────────────────────────────────
    if (addExpBtn) {
        addExpBtn.addEventListener('click', () => {
            const list = document.getElementById('cv-experience-list');
            if (!list) return;
            const item = document.createElement('div');
            item.className = 'cv-exp-item bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 relative';
            item.innerHTML = `
                <button type="button" class="cv-exp-remove absolute top-2 right-2 text-red-400 hover:text-red-600">
                    <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
                <div class="grid grid-cols-2 gap-2">
                    <input type="text" class="cv-exp-company p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Nama Perusahaan">
                    <input type="text" class="cv-exp-role p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Jabatan">
                </div>
                <input type="text" class="cv-exp-period w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Periode (mis. Jan 2022 - Des 2023)">
                <textarea class="cv-exp-desc w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none resize-none" rows="2" placeholder="Deskripsi singkat tanggung jawab & pencapaian..."></textarea>
            `;
            list.appendChild(item);
            item.querySelector('.cv-exp-remove').addEventListener('click', () => item.remove());
            if (lucide) lucide.createIcons({ root: item });
        });
    }

    // ── Analysis Close ────────────────────────────────────────────────────
    if (closeAnalysisBtn) {
        closeAnalysisBtn.addEventListener('click', () => {
            if (analysisPanel) analysisPanel.classList.add('hidden');
        });
    }

    // ── Collect Form Data ─────────────────────────────────────────────────
    function collectFormData() {
        const val = (id) => (document.getElementById(id)?.value || '').trim();

        const experiences = [];
        document.querySelectorAll('.cv-exp-item').forEach(item => {
            const co = item.querySelector('.cv-exp-company')?.value.trim();
            const ro = item.querySelector('.cv-exp-role')?.value.trim();
            const pe = item.querySelector('.cv-exp-period')?.value.trim();
            const de = item.querySelector('.cv-exp-desc')?.value.trim();
            if (co || ro) experiences.push({ company: co, role: ro, period: pe, desc: de });
        });

        return {
            nama: val('cv-nama'),
            posisi: val('cv-posisi'),
            email: val('cv-email'),
            telp: val('cv-telp'),
            alamat: val('cv-alamat'),
            linkedin: val('cv-linkedin'),
            ringkasan: val('cv-ringkasan'),
            univ: val('cv-univ'),
            jurusan: val('cv-jurusan'),
            tahunMasuk: val('cv-tahun-masuk'),
            tahunLulus: val('cv-tahun-lulus'),
            ipk: val('cv-ipk'),
            experiences,
            skill: val('cv-skill'),
            bahasa: val('cv-bahasa'),
            sertif: val('cv-sertif'),
            hobi: val('cv-hobi'),
        };
    }

    function validateForm(data) {
        if (!data.nama) return 'Nama lengkap wajib diisi.';
        if (!data.posisi) return 'Posisi yang dilamar wajib diisi.';
        if (!data.email) return 'Email wajib diisi.';
        if (!data.telp) return 'No. HP wajib diisi.';
        if (!data.univ) return 'Nama universitas/sekolah wajib diisi.';
        if (!data.jurusan) return 'Jurusan wajib diisi.';
        return null;
    }

    function getSelectedValue(container) {
        const sel = container?.querySelector('.selected');
        return sel ? sel.dataset.value : null;
    }

    // ── Build Prompt from Data ────────────────────────────────────────────
    function buildChatPrompt(data) {
        let expSection = '';
        if (data.experiences.length > 0) {
            expSection = data.experiences.map(e =>
                `- ${e.role} di ${e.company} (${e.period || 'Periode tidak diisi'}): ${e.desc || '-'}`
            ).join('\n');
        } else {
            expSection = 'Fresh Graduate / Belum ada pengalaman kerja.';
        }

        return `Kamu adalah seorang HR Expert dan CV Writer profesional. Analisa data berikut dan buat ringkasan narasi CV yang kuat dan profesional dalam Bahasa Indonesia (maksimal 3 paragraf singkat). Fokus pada kekuatan kandidat, nilai yang bisa ditawarkan, dan kecocokan dengan posisi yang dilamar.

DATA KANDIDAT:
Nama: ${data.nama}
Posisi Dilamar: ${data.posisi}
Email: ${data.email} | HP: ${data.telp} | Kota: ${data.alamat}
${data.linkedin ? 'LinkedIn/Portfolio: ' + data.linkedin : ''}

RINGKASAN DIRI:
${data.ringkasan || 'Tidak diisi'}

PENDIDIKAN:
${data.jurusan} - ${data.univ} (${data.tahunMasuk || '?'} - ${data.tahunLulus || '?'})${data.ipk ? ', IPK: ' + data.ipk : ''}

PENGALAMAN KERJA:
${expSection}

KEAHLIAN: ${data.skill || 'Tidak diisi'}
BAHASA: ${data.bahasa || 'Tidak diisi'}
SERTIFIKASI: ${data.sertif || 'Tidak diisi'}
HOBI: ${data.hobi || 'Tidak diisi'}

Berikan analisa singkat dan padat. Respond ONLY with the analysis text.`;
    }

    // ── Build Generate Prompt ─────────────────────────────────────────────
    function buildGeneratePrompt(data, analysisResult, style, color, model) {
        let expSection = '';
        if (data.experiences.length > 0) {
            expSection = data.experiences.map(e =>
                `• ${e.role} | ${e.company} | ${e.period || ''}\n  ${e.desc || ''}`
            ).join('\n');
        }

        const hasFoto = !!fotoData;
        const photoNote = hasFoto
            ? 'A professional profile photo is provided — incorporate it in the top section of the CV with a circular or rounded frame.'
            : 'No profile photo — use a professional avatar placeholder or icon.';

        return `Create a high-quality, professional CV/Resume image design for job application. This must be a complete, visually appealing CV document layout.

CANDIDATE INFORMATION:
• Full Name: ${data.nama}
• Applied Position: ${data.posisi}
• Email: ${data.email}
• Phone: ${data.telp}
• City: ${data.alamat}
${data.linkedin ? '• LinkedIn/Portfolio: ' + data.linkedin : ''}

PROFESSIONAL SUMMARY:
${analysisResult || data.ringkasan || 'Highly motivated professional seeking opportunities to contribute and grow.'}

EDUCATION:
• ${data.jurusan} — ${data.univ}
  ${data.tahunMasuk || ''} – ${data.tahunLulus || ''}${data.ipk ? ' | GPA: ' + data.ipk : ''}

WORK EXPERIENCE:
${expSection || 'Fresh Graduate'}

SKILLS: ${data.skill || 'Microsoft Office, Communication, Teamwork'}
LANGUAGES: ${data.bahasa || 'Indonesian (Native)'}
${data.sertif ? 'CERTIFICATIONS: ' + data.sertif : ''}
${data.hobi ? 'INTERESTS: ' + data.hobi : ''}

DESIGN REQUIREMENTS:
• Style: ${style || 'Profesional Formal'}
• Color Scheme: ${color || 'Biru Profesional'} — use this as the primary accent/header color
• Layout: A4 Portrait document format (tall/vertical)
• ${photoNote}
• Include clear section headers with icons or dividers
• Use professional typography — clean, readable font hierarchy
• Add subtle visual elements: sidebar panel, colored header bar, or accent lines
• All text must be clearly legible — no typos
• Include subtle decorative elements: geometric shapes, thin lines, or patterns matching the color scheme
• Final result should look like a print-ready professional CV document
• Generated by: ${model === 'seedream' ? 'SeeDream 4.5' : 'Nano Banana 2'} AI

Make it visually impressive, modern, and suitable for sending to top companies.`;
    }

    // ── Append Cards ──────────────────────────────────────────────────────
    function appendLoadingCard() {
        resultCardIndex++;
        const idx = resultCardIndex;
        const card = document.createElement('div');
        card.id = `cv-loading-card-${idx}`;
        card.className = 'relative rounded-2xl overflow-hidden bg-white/80 border border-slate-200 w-full flex flex-col items-center justify-center animate-pulse mx-auto max-w-md shadow-lg';
        card.innerHTML = `
            <div class="w-full aspect-[3/4] flex flex-col items-center justify-center bg-slate-50 gap-3 p-6 text-center">
                <div class="spinner border-4 border-blue-200 border-t-blue-600 w-8 h-8"></div>
                <p class="text-slate-500 text-xs font-medium animate-pulse">AI sedang membuat CV...</p>
                <p class="text-slate-400 text-[10px]">Proses ini mungkin membutuhkan 30–90 detik</p>
            </div>
        `;
        resultsGrid.appendChild(card);
        return idx;
    }

    function replaceLoadingCard(idx, imgUrl) {
        const card = document.getElementById(`cv-loading-card-${idx}`);
        if (!card) return;
        card.id = '';
        card.className = 'relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full animate-fade-in mx-auto max-w-md shadow-lg';
        card.innerHTML = `
            <div class="relative w-full aspect-[3/4]">
                <img src="${imgUrl}" alt="CV ${idx}" class="absolute inset-0 w-full h-full object-contain bg-white">
            </div>
            <div class="absolute bottom-2 right-2 flex gap-1">
                <button data-img-src="${imgUrl}" class="view-btn result-action-btn bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded-full shadow-sm transition-colors" title="Lihat CV">
                    <i data-lucide="eye" class="w-4 h-4"></i>
                </button>
                <a href="${imgUrl}" download="cv_${idx}.png" class="result-action-btn download-btn bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded-full shadow-sm transition-colors" title="Unduh CV">
                    <i data-lucide="download" class="w-4 h-4"></i>
                </a>
            </div>
        `;
        if (lucide) lucide.createIcons({ root: card });
    }

    function markCardError(idx, msg) {
        const card = document.getElementById(`cv-loading-card-${idx}`);
        if (!card) return;
        card.innerHTML = `
            <div class="flex flex-col items-center gap-2 p-6 text-red-400 min-h-[200px] justify-center">
                <i data-lucide="alert-circle" class="w-8 h-8"></i>
                <p class="text-xs font-medium text-center">${msg}</p>
            </div>
        `;
        if (lucide) lucide.createIcons({ root: card });
    }

    // ── Main: Analyze + Generate ──────────────────────────────────────────
    analyzeBtn.addEventListener('click', async () => {
        if (isGenerating) return;
        if (!privateServerActive) {
            showBlocker();
            return;
        }

        const data = collectFormData();
        const validationError = validateForm(data);
        if (validationError) {
            alert(validationError);
            return;
        }

        const selectedStyle = getSelectedValue(styleOptions) || 'Profesional Formal';
        const selectedColor = getSelectedValue(colorOptions) || 'Biru Profesional';
        const selectedModel = getSelectedValue(modelOptions) || 'nanobanana2';

        isGenerating = true;
        analyzeBtn.disabled = true;
        const originalBtnContent = analyzeBtn.innerHTML;
        analyzeBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 mr-2 animate-spin"></i><span>Menganalisa...</span>';
        if (lucide) lucide.createIcons();

        // Reset results
        resultsGrid.innerHTML = '';
        resultsContainer.classList.add('hidden');
        resultsPlaceholder.classList.remove('hidden');
        resultCardIndex = 0;
        if (analysisPanel) analysisPanel.classList.add('hidden');

        let analysisResult = '';

        // ── Step 1: Analyze via /chat ─────────────────────────────────────
        try {
            analyzeBtn.querySelector('span') && (analyzeBtn.querySelector('span').textContent = 'Menganalisa data CV...');

            const chatPrompt = buildChatPrompt(data);
            const chatFormData = new FormData();
            chatFormData.append('prompt', chatPrompt);
            if (fotoData) {
                const byteCharacters = atob(fotoData.base64);
                const byteArray = new Uint8Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) byteArray[i] = byteCharacters.charCodeAt(i);
                const blob = new Blob([byteArray], { type: fotoData.mimeType });
                chatFormData.append('images', blob, 'foto_profil.jpg');
            }

            const chatRes = await fetch(CHAT_URL, {
                method: 'POST',
                headers: { 'X-API-Key': getApiKey() },
                body: chatFormData
            });

            if (chatRes.ok) {
                const chatData = await chatRes.json();
                if (chatData.success && chatData.response) {
                    analysisResult = typeof chatData.response === 'string'
                        ? chatData.response.trim()
                        : JSON.stringify(chatData.response);
                    if (analysisPanel && analysisText) {
                        analysisText.textContent = analysisResult;
                        analysisPanel.classList.remove('hidden');
                    }
                }
            }
        } catch (e) {
            console.warn('CV analysis error (non-fatal):', e);
        }

        // ── Step 2: Generate CV Image ─────────────────────────────────────
        try {
            const btnSpan = analyzeBtn.querySelector('span');
            if (btnSpan) btnSpan.textContent = 'Membuat CV...';

            // Switch selected model in localStorage so interceptor routes correctly
            localStorage.setItem('private_server_model', selectedModel);

            const generatePrompt = buildGeneratePrompt(data, analysisResult, selectedStyle, selectedColor, selectedModel);
            const genFormData = new FormData();
            genFormData.append('instruction', generatePrompt);
            genFormData.append('aspectRatio', '9:16');

            if (fotoData) {
                const byteCharacters = atob(fotoData.base64);
                const byteArray = new Uint8Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) byteArray[i] = byteCharacters.charCodeAt(i);
                const blob = new Blob([byteArray], { type: fotoData.mimeType });
                genFormData.append('images', blob, 'foto_profil.jpg');
            }

            const cardIdx = appendLoadingCard();
            resultsPlaceholder.classList.add('hidden');
            resultsContainer.classList.remove('hidden');

            const genRes = await fetch(GENERATE_URL, {
                method: 'POST',
                headers: { 'X-API-Key': getApiKey() },
                body: genFormData
            });

            if (!genRes.ok) {
                const errMsg = await getApiErrorMessage(genRes);
                throw new Error(errMsg);
            }

            const genData = await genRes.json();
            const imgUrl = genData.imageUrl || (genData.images && genData.images[0]) || genData.image;

            if (!imgUrl) throw new Error('Tidak ada gambar CV yang dihasilkan. Coba lagi.');

            replaceLoadingCard(cardIdx, imgUrl);
            if (doneSound) doneSound.play();

        } catch (err) {
            console.error('CV generate error:', err);
            if (errorSound) errorSound.play();

            if (resultCardIndex > 0) {
                markCardError(resultCardIndex, err.message || 'Gagal membuat CV');
            } else {
                resultsContainer.classList.add('hidden');
                resultsPlaceholder.classList.remove('hidden');
                resultsPlaceholder.innerHTML = `
                    <div class="flex flex-col items-center text-red-500 gap-3">
                        <i data-lucide="alert-circle" class="w-12 h-12"></i>
                        <p class="font-medium">Terjadi Kesalahan</p>
                        <p class="text-sm text-slate-400 text-center max-w-xs">${err.message || 'Gagal membuat CV'}</p>
                        <button id="cv-retry-btn" class="mt-2 px-4 py-2 bg-slate-100 rounded-lg text-sm text-slate-700 hover:bg-slate-200 transition-colors">Coba Lagi</button>
                    </div>
                `;
                document.getElementById('cv-retry-btn')?.addEventListener('click', () => analyzeBtn.click());
                if (lucide) lucide.createIcons({ root: resultsPlaceholder });
            }
        } finally {
            isGenerating = false;
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = originalBtnContent;
            if (lucide) lucide.createIcons();
        }
    });
};
