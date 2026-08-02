window.initBuatModel = function ({
    document,
    setupImageUpload,
    setupOptionButtons,
    updateSliderProgress,
    getAspectRatioClass,
    autoSelectClosestRatio,
    lucide,
    API_KEY,
    GENERATE_URL,
    CHAT_URL,
    getApiErrorMessage,
    doneSound,
    errorSound
}) {
    const mgPromptInput = document.getElementById('mg-prompt-input');
    const mgRandomBtn = document.getElementById('mg-random-btn');
    const mgGenerateBtn = document.getElementById('mg-generate-btn');
    const mgRatioOptions = document.getElementById('mg-ratio-options');
    const mgResultsContainer = document.getElementById('mg-results-container');
    const mgResultsGrid = document.getElementById('mg-results-grid');
    const mgResultCountSlider = document.getElementById('mg-result-count-slider');
    const mgResultCountDisplay = document.getElementById('mg-result-count-display');

    if (mgResultCountSlider && mgResultCountDisplay) {
        mgResultCountSlider.addEventListener('input', function() {
            mgResultCountDisplay.textContent = this.value + ' Gambar';
        });
    }

    const mgSettingsDropdown = document.getElementById('mg-settings-dropdown');
    const mgTabCreate = document.getElementById('mg-tab-create');
    const mgTabRepose = document.getElementById('mg-tab-repose');
    const mgTabAngle = document.getElementById('mg-tab-angle');
    const mgContentCreate = document.getElementById('mg-content-create');
    const mgContentRepose = document.getElementById('mg-content-repose');
    const mgContentAngle = document.getElementById('mg-content-angle');

    function switchModelTab(tabName) {
        if (mgTabCreate) mgTabCreate.classList.toggle('selected', tabName === 'create');
        if (mgTabRepose) mgTabRepose.classList.toggle('selected', tabName === 'repose');
        if (mgTabAngle) mgTabAngle.classList.toggle('selected', tabName === 'angle');
        if (mgContentCreate) mgContentCreate.classList.toggle('hidden', tabName !== 'create');
        if (mgContentRepose) mgContentRepose.classList.toggle('hidden', tabName !== 'repose');
        if (mgContentAngle) mgContentAngle.classList.toggle('hidden', tabName !== 'angle');
    }

    // Expose switchModelTab to global scope for sidebar interaction
    window.switchModelTab = switchModelTab;

    if (mgTabCreate) mgTabCreate.addEventListener('click', () => switchModelTab('create'));
    if (mgTabRepose) mgTabRepose.addEventListener('click', () => switchModelTab('repose'));
    if (mgTabAngle) mgTabAngle.addEventListener('click', () => switchModelTab('angle'));

    if (mgRatioOptions) setupOptionButtons(mgRatioOptions);

    async function getRandomModelPromptFromAI() {
        const templates = [
            "Seorang wanita muda Indonesia yang cantik mengenakan kebaya modern berwarna merah marun dengan detail renda emas, tersenyum lembut, rambut disanggul rapi dengan hiasan bunga melati, berdiri di pendopo tradisional Jawa dengan pencahayaan sore yang hangat, photorealistic, 8k, detailed texture.",
            "Seorang pria muda Indonesia yang tampan mengenakan kemeja batik lengan panjang motif mega mendung berwarna biru indigo, ekspresi percaya diri, rambut tertata rapi, latar belakang galeri seni yang elegan, pencahayaan studio yang dramatis, photorealistic, 8k, sharp focus.",
            "A stunning international fashion model with curly blonde hair, wearing a chic beige trench coat over a white turtleneck and high-waisted jeans, walking down a busy New York street, golden hour lighting, cinematic bokeh, photorealistic, 8k, high fashion.",
            "A handsome international male model with a sharp jawline and short dark hair, wearing a tailored navy blue three-piece suit, adjusting his cufflinks, standing in a luxury modern penthouse with city skyline background at night, neon city lights reflection, photorealistic, 8k.",
            "Seorang wanita Indonesia modern dengan kulit sawo matang yang eksotis, mengenakan pakaian kasual smart-casual blazer putih dan celana kulot, memegang tablet di sebuah cafe kekinian di Jakarta, pencahayaan alami yang terang, gaya fotografi lifestyle, photorealistic, 8k."
        ];
        const randomIndex = Math.floor(Math.random() * templates.length);
        await new Promise(resolve => setTimeout(resolve, 800));
        return templates[randomIndex];
    }

    if (mgRandomBtn) {
        mgRandomBtn.addEventListener('click', async () => {
            const originalBtnHTML = mgRandomBtn.innerHTML;
            mgRandomBtn.disabled = true;
            mgRandomBtn.innerHTML = `<div class="spinner"></div>`;
            if (lucide) lucide.createIcons();
            try {
                const randomPrompt = await getRandomModelPromptFromAI();
                if (mgPromptInput) mgPromptInput.value = randomPrompt;
            } catch (error) {
                console.error("Error generating random prompt:", error);
                if (mgPromptInput) mgPromptInput.value = `Gagal membuat prompt acak: ${error.message}`;
            } finally {
                mgRandomBtn.disabled = false;
                mgRandomBtn.innerHTML = originalBtnHTML;
                if (lucide) lucide.createIcons();
            }
        });
    }

    if (mgGenerateBtn) {
        mgGenerateBtn.addEventListener('click', async () => {
            const prompt = mgPromptInput.value.trim();
            if (!prompt) return;
            const placeholder = document.getElementById('mg-results-placeholder');
            if (placeholder) placeholder.classList.add('hidden');
            
            let aspectRatio = '1:1';
            const selectedRatio = mgRatioOptions.querySelector('.selected');
            if (selectedRatio) aspectRatio = selectedRatio.dataset.value;
            
            const aspectClass = getAspectRatioClass(aspectRatio);
            if (mgResultsContainer) mgResultsContainer.classList.remove('hidden');
            if (mgResultsGrid) {
                mgResultsGrid.innerHTML = '';
                mgGenerateBtn.disabled = true;
                
                const resultCount = mgResultCountSlider ? parseInt(mgResultCountSlider.value) : 1;
                mgResultsGrid.className = `grid ${getResultGridCols(resultCount)} gap-4`;
                
                mgGenerateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Membuat Model...</span>`;
                for (let i = 1; i <= resultCount; i++) {
                    const card = document.createElement('div');
                    card.id = `mg-card-${i}`;
                    card.className = `card overflow-hidden transition-all ${aspectClass} bg-gray-100 flex items-center justify-center`;
                    card.innerHTML = `<div class="spinner"></div>`;
                    mgResultsGrid.appendChild(card);
                }
                
                if (lucide) lucide.createIcons();
                const generationPromises = Array.from({ length: resultCount }, (_, i) => i + 1).map(i => generateModelImage(i, prompt, aspectRatio));
                await Promise.allSettled(generationPromises);
                mgGenerateBtn.disabled = false;
                mgGenerateBtn.innerHTML = `<i data-lucide="sparkles" class="w-5 h-5 mr-2"></i><span>Buat Foto Model</span>`;
            }
            if (lucide) lucide.createIcons();
        });
    }

    async function generateModelImage(id, userPrompt, aspectRatio) {
        const card = document.getElementById(`mg-card-${id}`);
        try {
            const finalPrompt = `${userPrompt}, photorealistic, 8k, high detail, professional photoshoot, sharp focus.`;

            const formData = new FormData();
            formData.append('instruction', finalPrompt);
            if (aspectRatio) {
                formData.append('aspectRatio', aspectRatio);
            }

            const response = await fetch(`${GENERATE_URL}`, {
                method: 'POST',
                headers: {
                    'X-API-Key': API_KEY
                },
                body: formData
            });

            if (!response.ok) throw new Error(await getApiErrorMessage(response));
            const result = await response.json();

            if (!result.success || !result.imageUrl) {
                throw new Error("No image data in API response.");
            }
            const imageUrl = result.imageUrl;
            card.innerHTML = `
                    <img src="${imageUrl}" alt="Generated model" class="w-full h-full object-cover">
                    <div class="absolute bottom-2 right-2 flex gap-1">
                        <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        <a href="${imageUrl}" download="model_${id}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                           <i data-lucide="download" class="w-4 h-4"></i>
                        </a>
                    </div>`;
            card.className = `card relative w-full overflow-hidden group ${getAspectRatioClass(aspectRatio)}`;
            if (lucide) lucide.createIcons();
            doneSound.play();
        } catch (error) {
            errorSound.play();
            console.error(`Error generating image for card ${id}:`, error);
            card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center flex flex-col items-center justify-center"><i data-lucide="alert-triangle" class="w-8 h-8 mb-2"></i><span class="break-all">${error.message}</span></div>`;
            if (lucide) lucide.createIcons();
        }
    }

    // Repose Logic is now in js/ubah-pose.js

    // Angle Logic is now in js/ubah-angle.js
};