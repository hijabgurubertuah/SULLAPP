window.initVideoGenerator = function({
    document,
    setupImageUpload,
    setupOptionButtons,
    lucide,
    getApiKey,
    getEmail,
    VIDEO_URL,
    VIDEOGROK_URL,
    VIDEOFLOW_URL,
    VIDEOFLOW_STATUS_URL,
    VIDEOWEAVY_URL,
    VIDEOWEAVY_STATUS_URL,
    CHAT_URL,
    getApiErrorMessage,
    doneSound,
    errorSound
}) {
    // JWT Token Generation (like SulapVideo)
    const JWT_SECRET = window.JWT_SECRET || '';
    const JWT_TTL_MIN = 5;
    const tokenCache = new Map();
    
    function base64UrlEncode(str) {
        return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    
    async function generateLocalJwt(secret, ttlMinutes = JWT_TTL_MIN) {
        if (!secret) return "";
        const header = { alg: "HS256", typ: "JWT" };
        const now = Math.floor(Date.now() / 1000);
        const exp = now + (ttlMinutes * 60);
        const payload = { sub: "api-client", iat: now, exp: exp };
        
        const encodedHeader = base64UrlEncode(JSON.stringify(header));
        const encodedPayload = base64UrlEncode(JSON.stringify(payload));
        const data = `${encodedHeader}.${encodedPayload}`;
        
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const key = await window.crypto.subtle.importKey(
            "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
        );
        const signature = await window.crypto.subtle.sign("HMAC", key, encoder.encode(data));
        
        let binary = '';
        const bytes = new Uint8Array(signature);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const encodedSignature = base64UrlEncode(binary);
        
        return `${data}.${encodedSignature}`;
    }
    
    async function getToken(baseUrl) {
        if (!baseUrl) return null;
        
        const cached = tokenCache.get(baseUrl);
        if (cached && Date.now() < cached.expiry) {
            return cached.token;
        }
        
        // Generate local JWT if secret available
        if (JWT_SECRET) {
            try {
                const token = await generateLocalJwt(JWT_SECRET, JWT_TTL_MIN);
                const expiry = Date.now() + (JWT_TTL_MIN * 60 * 1000) - 10000;
                tokenCache.set(baseUrl, { token, expiry });
                return token;
            } catch (e) {
                console.error('[Video] JWT generation failed:', e);
            }
        }
        
        return null;
    }
    
    function buildHeaders(token) {
        const headers = {};
        const apiKey = getApiKey();
        if (apiKey) headers['X-API-Key'] = apiKey;
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    }
    
    // Parse and shuffle BASE_URLs for fallback support
    const RAW_BASE_URL = window.BASE_URL || '';
    const BASE_URLS = RAW_BASE_URL.split(',')
        .map(url => url.trim())
        .filter(Boolean)
        .map(url => {
            if (!/^https?:\/\//i.test(url)) {
                url = 'https://' + url;
            }
            return url.replace(/\/$/, '');
        });
    
    // Shuffle BASE_URLs for random distribution
    function getShuffledBaseUrls() {
        const list = [...BASE_URLS];
        for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [list[i], list[j]] = [list[j], list[i]];
        }
        return list;
    }
    
    // Get single random BASE_URL (for backward compatibility)
    const BASE_URL = BASE_URLS.length > 0 ? BASE_URLS[Math.floor(Math.random() * BASE_URLS.length)] : '';
    
    // DOM Elements
    const modelOptions = document.getElementById('vg-model-options');
    const modeOptions = document.getElementById('vg-mode-options');
    const imageSection = document.getElementById('vg-image-section');
    const frameSection = document.getElementById('vg-frame-section');
    const promptSection = document.getElementById('vg-prompt-section');
    const imageInput = document.getElementById('vg-image-input');
    const imageUploadBox = document.getElementById('vg-upload-box');
    const imagePreview = document.getElementById('vg-preview');
    const imagePlaceholder = document.getElementById('vg-placeholder');
    const removeImageBtn = document.getElementById('vg-remove-btn');
    const faceGridToggleWrap = document.getElementById('vg-face-grid-toggle-wrap');
    const faceGridToggle = document.getElementById('vg-face-grid-toggle');
    
    // Frame to Frame elements
    const firstFrameInput = document.getElementById('vg-first-frame-input');
    const firstFrameUploadBox = document.getElementById('vg-first-frame-upload-box');
    const firstFramePreview = document.getElementById('vg-first-frame-preview');
    const firstFramePlaceholder = document.getElementById('vg-first-frame-placeholder');
    const firstFrameRemoveBtn = document.getElementById('vg-first-frame-remove-btn');
    
    const lastFrameInput = document.getElementById('vg-last-frame-input');
    const lastFrameUploadBox = document.getElementById('vg-last-frame-upload-box');
    const lastFramePreview = document.getElementById('vg-last-frame-preview');
    const lastFramePlaceholder = document.getElementById('vg-last-frame-placeholder');
    const lastFrameRemoveBtn = document.getElementById('vg-last-frame-remove-btn');
    
    const promptInput = document.getElementById('vg-prompt-input');
    const promptLabel = document.getElementById('vg-prompt-label');
    const durationLabel = document.getElementById('vg-duration-label');
    const ratioLabel = document.getElementById('vg-ratio-label');
    const qualityLabel = document.getElementById('vg-quality-label');
    const durationOptions = document.getElementById('vg-duration-options');
    const ratioOptions = document.getElementById('vg-ratio-options');
    const qualityOptions = document.getElementById('vg-quality-options');
    const generateBtn = document.getElementById('vg-generate-btn');
    const generateBtnText = document.getElementById('vg-generate-btn-text');
    const resultsContainer = document.getElementById('vg-results-container');
    const resultsGrid = document.getElementById('vg-results-grid');
    const resultsPlaceholder = document.getElementById('vg-results-placeholder');

    if (!generateBtn) return;

    let imageData = null;
    let rawImageData = null;
    let firstFrameData = null;
    let lastFrameData = null;
    let isGenerating = false;
    let resultCardIndex = 0;
    let videoQuota = null;

    const quotaCountEl = document.getElementById('vg-quota-count');

    // Allowed values per model (server-side truth - anti inspect element manipulation)
    const ALLOWED_VALUES = {
        seedance:     { durations: [6, 12],      qualities: ['480p', '720p'] },
        weavygrok:    { durations: [6, 10, 15],  qualities: ['480p', '720p'] },
        seedancedola: { durations: [5, 10, 15],  qualities: ['1080p'] },
        geminiomni:   { durations: [4, 8],       qualities: ['1080p'] },
    };

    // Quota cost calculator
    // Grok: 6s=1, 10s=2, 15s=3 kuota; 720p=+1 kuota. Dola: 5s=1, 10s=2, 15s=3 (1080p fixed)
    function getQuotaCost(model, duration, quality) {
        if (model === 'geminiomni') return duration === 4 ? 1 : 2;
        if (model === 'seedancedola') return Math.round(duration / 5);
        if (model === 'weavygrok') {
            let cost = duration >= 15 ? 3 : (duration >= 10 ? 2 : 1);
            if (quality === '720p') cost += 1;
            return cost;
        }
        // SeeDance legacy
        const allowed = ALLOWED_VALUES[model] || ALLOWED_VALUES.seedance;
        let cost = 1;
        if (allowed.durations.length > 1 && duration === allowed.durations[1]) cost += 1;
        if (allowed.qualities.length > 1 && quality === allowed.qualities[1]) cost += 1;
        return cost;
    }

    // Internal state variables (tamper-proof - only updated via click handlers)
    let _selectedModel = 'seedancedola';
    let _selectedDuration = 5;
    let _selectedQuality = '1080p';
    
    // Server Status Checker
    let serverOnline = false;
    let statusCheckInterval = null;
    const serverStatusContainer = document.getElementById('vg-server-status');
    const statusDot = document.getElementById('vg-status-dot');
    const statusText = document.getElementById('vg-status-text');
    
    const updateServerStatus = (online) => {
        serverOnline = online;
        if (online) {
            serverStatusContainer.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300 bg-green-100 text-green-700 border border-green-200 mb-4';
            statusDot.className = 'inline-flex rounded-full h-2 w-2 bg-green-500';
            statusText.textContent = 'Server Online';
            if (generateBtn) generateBtn.disabled = false;
        } else {
            serverStatusContainer.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300 bg-red-100 text-red-700 border border-red-200 mb-4';
            statusDot.className = 'inline-flex rounded-full h-2 w-2 bg-red-500';
            statusText.textContent = 'Server Offline';
            if (generateBtn) generateBtn.disabled = true;
        }
    };
    
    // Status is provided by the main config poll (proxy.php?config=true → window.AI_VIDEO_ONLINE)
    // Expose updater so script.js config handler can push updates without a separate HTTP call
    window._updateVideoServerStatus = updateServerStatus;

    // Apply immediately if config has already arrived, otherwise default offline until first config poll
    if (typeof window.AI_VIDEO_ONLINE !== 'undefined') {
        updateServerStatus(window.AI_VIDEO_ONLINE);
    } else {
        updateServerStatus(false);
    }

    // Fetch and display video quota
    async function fetchVideoQuota() {
        const email = getEmail();
        if (!email) {
            if (quotaCountEl) quotaCountEl.textContent = '-';
            return;
        }
        try {
            const res = await fetch(`/server/video_quota.php?action=get_quota&email=${encodeURIComponent(email)}`);
            const data = await res.json();
            if (data.success) {
                videoQuota = data.quota;
                if (quotaCountEl) quotaCountEl.textContent = data.quota;
                
                const convertBtn = document.getElementById('vg-convert-btn');
                if (convertBtn) {
                    if (videoQuota > 0) {
                        convertBtn.classList.remove('hidden');
                    } else {
                        convertBtn.classList.add('hidden');
                    }
                }
            }
        } catch (e) {
            console.error('Failed to fetch video quota:', e);
        }
    }
    
    // Expose to global for payment modal callback
    window.videoGeneratorFetchQuota = fetchVideoQuota;

    async function decreaseVideoQuota(amount = 1) {
        const email = getEmail();
        if (!email) return false;
        try {
            const res = await fetch(`/server/video_quota.php?action=decrease_quota&email=${encodeURIComponent(email)}&amount=${amount}`);
            const data = await res.json();
            if (data.success) {
                videoQuota = data.quota;
                if (quotaCountEl) quotaCountEl.textContent = data.quota;
                return true;
            } else {
                videoQuota = data.quota ?? 0;
                if (quotaCountEl) quotaCountEl.textContent = videoQuota;
                return false;
            }
        } catch (e) {
            console.error('Failed to decrease video quota:', e);
            return false;
        }
    }

    // Fetch quota on init
    fetchVideoQuota();

    // Helper function to get selected value
    function getSelectedValue(container) {
        const selected = container?.querySelector('.selected');
        return selected?.dataset.value || null;
    }

    // Update button state
    function updateGenerateButton() {
        if (!generateBtn) return;
        
        const mode = getSelectedValue(modeOptions);
        const prompt = promptInput?.value.trim() || '';
        let hasValidInput = false;
        
        if (mode === 'text-to-video') {
            hasValidInput = prompt;
        } else if (mode === 'image-to-video') {
            hasValidInput = prompt && imageData;
        } else if (mode === 'frame-to-frame') {
            hasValidInput = prompt && firstFrameData && lastFrameData;
        }
        
        if (hasValidInput && !isGenerating) {
            generateBtn.disabled = false;
            generateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            generateBtn.disabled = true;
            generateBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }

    // Setup option buttons
    setupOptionButtons(modelOptions);
    setupOptionButtons(modeOptions);
    setupOptionButtons(durationOptions);
    setupOptionButtons(ratioOptions);
    setupOptionButtons(qualityOptions);

    // Model change handler - update duration options based on model
    const durationExtraBtn  = document.getElementById('vg-duration-extra');
    const durationExtra2Btn = document.getElementById('vg-duration-extra2');
    const durationInfoText = document.getElementById('vg-duration-info');
    
    // Veo 3.1 supported aspect ratios
    const VEO3_SUPPORTED_RATIOS = ['16:9', '9:16'];

    // Dynamic quota cost display for Grok/Dola model
    function updateGrokCostInfo() {
        if (!durationInfoText) return;
        const cost = getQuotaCost(_selectedModel, _selectedDuration, _selectedQuality);
        if (_selectedModel === 'seedancedola' || _selectedModel === 'geminiomni') {
            durationInfoText.innerHTML = `<i data-lucide="info" class="w-3 h-3 inline-block mr-0.5 -mt-0.5"></i> ${_selectedDuration} detik = <strong>${cost} kuota video</strong>`;
        } else {
            durationInfoText.innerHTML = `<i data-lucide="info" class="w-3 h-3 inline-block mr-0.5 -mt-0.5"></i> ${_selectedDuration} detik + ${_selectedQuality} = <strong>${cost} kuota video</strong>`;
        }
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    }

    function updateDurationForModel(model) {
        if (!durationExtraBtn) return;
        
        const qualitySection = qualityOptions?.parentElement;
        const durationH3 = document.getElementById('vg-duration-label')?.closest('h3');
        const durationFirstBtn = durationOptions?.querySelector('button:not(#vg-duration-extra):not(#vg-duration-extra2)');

        {
            // Restore duration & quality sections
            if (durationH3) durationH3.style.display = '';
            if (durationOptions) durationOptions.style.display = '';
            if (qualitySection) qualitySection.style.display = '';
            // Re-enable all ratio buttons
            if (ratioOptions) {
                ratioOptions.querySelectorAll('button').forEach(btn => {
                    btn.disabled = false;
                    btn.style.opacity = '';
                });
            }

            if (model === 'geminiomni') {
                // Gemini Omni: 4s or 8s only; quality hidden; only 9:16 & 16:9 ratio
                if (durationFirstBtn) { durationFirstBtn.dataset.value = '4'; durationFirstBtn.innerHTML = '4 detik'; }
                durationExtraBtn.dataset.value = '8'; durationExtraBtn.innerHTML = '8 detik'; durationExtraBtn.style.display = '';
                if (durationExtra2Btn) { durationExtra2Btn.style.display = 'none'; }
                if (durationInfoText) { durationInfoText.style.display = ''; }
                if (qualitySection) qualitySection.style.display = 'none';
                // Restrict ratio buttons to 9:16 and 16:9 only
                if (ratioOptions) {
                    const OMNI_RATIOS = ['9:16', '16:9'];
                    ratioOptions.querySelectorAll('button').forEach(btn => {
                        if (!OMNI_RATIOS.includes(btn.dataset.value)) {
                            btn.disabled = true;
                            btn.style.opacity = '0.35';
                        }
                    });
                    const currentRatio = ratioOptions.querySelector('.selected')?.dataset.value;
                    if (!OMNI_RATIOS.includes(currentRatio)) {
                        ratioOptions.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
                        const defaultBtn = ratioOptions.querySelector('[data-value="16:9"]');
                        if (defaultBtn) defaultBtn.classList.add('selected');
                    }
                }
                updateGrokCostInfo();
            } else if (model === 'seedancedola') {
                // SeeDance 2.0 Fast (Dola): 5, 10, 15s; quality fixed 1080p
                const dolaAllowed = ALLOWED_VALUES.seedancedola;
                if (durationFirstBtn) { durationFirstBtn.dataset.value = '5'; durationFirstBtn.innerHTML = '5 detik'; }
                durationExtraBtn.dataset.value = '10'; durationExtraBtn.innerHTML = '10 detik'; durationExtraBtn.style.display = '';
                if (durationExtra2Btn) { durationExtra2Btn.dataset.value = '15'; durationExtra2Btn.innerHTML = '15 detik'; durationExtra2Btn.style.display = ''; }
                if (durationInfoText) { durationInfoText.style.display = ''; }
                if (qualitySection) qualitySection.style.display = '';
                if (qualityOptions) {
                    const qBtns = qualityOptions.querySelectorAll('button');
                    if (qBtns[0]) { qBtns[0].dataset.value = '1080p'; qBtns[0].textContent = '1080p'; qBtns[0].style.display = ''; }
                    if (qBtns[1]) { qBtns[1].style.display = 'none'; }
                }
                updateGrokCostInfo();
            } else if (model.startsWith('weavy')) {
                // Weavy models: 3 duration options from ALLOWED_VALUES
                const weavyAllowed = ALLOWED_VALUES[model] || { durations: [6, 10, 15], qualities: ['480p', '720p'] };
                if (durationFirstBtn) { durationFirstBtn.dataset.value = String(weavyAllowed.durations[0]); durationFirstBtn.innerHTML = `${weavyAllowed.durations[0]} detik`; }
                durationExtraBtn.dataset.value = String(weavyAllowed.durations[1]);
                durationExtraBtn.innerHTML = `${weavyAllowed.durations[1]} detik`;
                durationExtraBtn.style.display = '';
                if (durationExtra2Btn) {
                    durationExtra2Btn.dataset.value = String(weavyAllowed.durations[2] || 15);
                    durationExtra2Btn.innerHTML = `${weavyAllowed.durations[2] || 15} detik`;
                    durationExtra2Btn.style.display = '';
                }
                if (durationInfoText) { durationInfoText.style.display = ''; }
                if (qualityOptions) {
                    const qBtns = qualityOptions.querySelectorAll('button');
                    const q = weavyAllowed.qualities;
                    if (qBtns[0]) { qBtns[0].dataset.value = q[0]; qBtns[0].textContent = q[0]; qBtns[0].style.display = ''; }
                    if (qBtns[1]) { qBtns[1].dataset.value = q[1] || ''; qBtns[1].textContent = q[1] || ''; qBtns[1].style.display = q[1] ? '' : 'none'; }
                }
            } else {
                // SeeDance: 6s + 12s, hide 3rd button
                if (durationExtra2Btn) durationExtra2Btn.style.display = 'none';
                if (durationFirstBtn) { durationFirstBtn.dataset.value = '6'; durationFirstBtn.innerHTML = '6 detik'; }
                durationExtraBtn.dataset.value = '12'; durationExtraBtn.innerHTML = '12 detik';
                if (qualityOptions) {
                    const qBtns = qualityOptions.querySelectorAll('button');
                    if (qBtns[0]) { qBtns[0].dataset.value = '480p'; qBtns[0].textContent = '480p'; qBtns[0].style.display = ''; }
                    if (qBtns[1]) { qBtns[1].dataset.value = '720p'; qBtns[1].textContent = '720p'; qBtns[1].style.display = ''; }
                }
                if (durationInfoText) {
                    durationInfoText.style.display = '';
                    updateDurationInfoText();
                }
            }
        }
        
        // Reset duration and quality to first allowed value when model changes
        const allowedForModel = ALLOWED_VALUES[model] || ALLOWED_VALUES.seedance;
        _selectedDuration = allowedForModel.durations[0];
        _selectedQuality = allowedForModel.qualities[0];
        // Reset duration UI: deselect extra buttons, select first
        durationExtraBtn.classList.remove('selected');
        if (durationExtra2Btn) durationExtra2Btn.classList.remove('selected');
        if (durationFirstBtn && !durationFirstBtn.classList.contains('selected')) {
            durationFirstBtn.classList.add('selected');
        }
        // Reset quality UI: select first button
        if (qualityOptions) {
            qualityOptions.querySelectorAll('button').forEach((btn, idx) => {
                if (idx === 0) btn.classList.add('selected');
                else btn.classList.remove('selected');
            });
        }
        if (model === 'weavygrok') updateGrokCostInfo();
    }

    // Update estimate label text
    function updateEstimateText(model) {
        const el = document.getElementById('vg-estimate-text');
        if (!el) return;
        if (model === 'geminiomni') el.textContent = '1–3 menit';
        else el.textContent = '5–10 menit';
    }
    
    function updateDurationInfoText() {
        if (!durationInfoText) return;
        durationInfoText.innerHTML = '<i data-lucide="info" class="w-3 h-3 inline-block mr-0.5 -mt-0.5"></i> Durasi 12 detik +1 kuota, 720p +1 kuota';
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    }
    
    // Track model selection via buttons (tamper-proof)
    const validModels = ['seedancedola', 'geminiomni'];
    if (modelOptions) {
        modelOptions.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const val = btn.dataset.value;
            _selectedModel = validModels.includes(val) ? val : 'weavygrok';

            const frameBtn = modeOptions?.querySelector('[data-value="frame-to-frame"]');
            const t2vBtn   = modeOptions?.querySelector('[data-value="text-to-video"]');
            const i2vBtn   = modeOptions?.querySelector('[data-value="image-to-video"]');

            if (_selectedModel === 'weavygrok' || _selectedModel === 'geminiomni') {
                // Grok / Gemini Omni: T2V and I2V only, no frame-to-frame
                if (frameBtn) { frameBtn.disabled = true;  frameBtn.style.opacity = '0.35'; }
                if (t2vBtn)   { t2vBtn.disabled = false;   t2vBtn.style.opacity = ''; }
                if (i2vBtn)   { i2vBtn.disabled = false;   i2vBtn.style.opacity = ''; }
                // Switch back to T2V if currently on frame-to-frame
                if (getSelectedValue(modeOptions) === 'frame-to-frame') {
                    modeOptions.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
                    if (t2vBtn) t2vBtn.classList.add('selected');
                    if (frameSection) frameSection.classList.add('hidden');
                    if (imageSection) imageSection.classList.add('hidden');
                }
            } else {
                // seedancedola + others: all modes enabled
                if (frameBtn) { frameBtn.disabled = false; frameBtn.style.opacity = ''; }
                if (t2vBtn)   { t2vBtn.disabled = false;   t2vBtn.style.opacity = ''; }
                if (i2vBtn)   { i2vBtn.disabled = false;   i2vBtn.style.opacity = ''; }
            }

            // Hide face grid toggle for Gemini Omni
            if (faceGridToggleWrap) {
                if (_selectedModel === 'geminiomni') {
                    faceGridToggleWrap.classList.add('hidden');
                } else if (imageData) {
                    faceGridToggleWrap.classList.remove('hidden');
                }
            }
            updateEstimateText(_selectedModel);
            updateDurationForModel(_selectedModel);
            updateGenerateButton();
        });
    }
    // Apply seedancedola settings on init
    updateDurationForModel('seedancedola');

    // Track duration selection via click (tamper-proof)
    durationOptions.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button || button.disabled) return;
        const allowed = ALLOWED_VALUES[_selectedModel] || ALLOWED_VALUES.seedance;
        if (button.id === 'vg-duration-extra2') {
            _selectedDuration = allowed.durations[2] || allowed.durations[1] || allowed.durations[0];
        } else if (button.id === 'vg-duration-extra') {
            _selectedDuration = allowed.durations[1] || allowed.durations[0];
        } else {
            _selectedDuration = allowed.durations[0];
        }
        if (_selectedModel === 'weavygrok' || _selectedModel === 'seedancedola' || _selectedModel === 'geminiomni') updateGrokCostInfo();
    });

    // Track quality selection via click (tamper-proof)
    qualityOptions.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        const allowed = ALLOWED_VALUES[_selectedModel] || ALLOWED_VALUES.seedance;
        const buttons = Array.from(qualityOptions.querySelectorAll('button'));
        const idx = buttons.indexOf(button);
        if (idx >= 0 && idx < allowed.qualities.length) {
            _selectedQuality = allowed.qualities[idx];
        } else {
            _selectedQuality = allowed.qualities[0];
        }
        if (_selectedModel === 'weavygrok' || _selectedModel === 'seedancedola' || _selectedModel === 'geminiomni') updateGrokCostInfo();
    });

    // Mode change handler
    modeOptions.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        
        const mode = button.dataset.value;
        
        // Update enhance button label based on mode
        const enhanceBtn = document.getElementById('vg-enhance-prompt-btn');
        const enhanceBtnText = enhanceBtn?.querySelector('span');
        
        if (mode === 'image-to-video') {
            imageSection.classList.remove('hidden');
            frameSection.classList.add('hidden');
            promptLabel.textContent = '3. Deskripsi Animasi';
            durationLabel.textContent = '4. Durasi Video';
            ratioLabel.textContent = '5. Aspect Ratio';
            qualityLabel.textContent = '6. Kualitas';
            promptInput.placeholder = 'Contoh: animate this cat face, make it blink and smile';
            if (enhanceBtnText) enhanceBtnText.textContent = 'Buat Otomatis';
        } else if (mode === 'frame-to-frame') {
            imageSection.classList.add('hidden');
            frameSection.classList.remove('hidden');
            promptLabel.textContent = '4. Deskripsi Transisi';
            durationLabel.textContent = '5. Durasi Video';
            ratioLabel.textContent = '6. Aspect Ratio';
            qualityLabel.textContent = '7. Kualitas';
            promptInput.placeholder = 'Contoh: smooth transition from first to last frame';
            if (enhanceBtnText) enhanceBtnText.textContent = 'Buat Otomatis';
        } else {
            imageSection.classList.add('hidden');
            frameSection.classList.add('hidden');
            promptLabel.textContent = '2. Deskripsi Video';
            durationLabel.textContent = '3. Durasi Video';
            ratioLabel.textContent = '4. Aspect Ratio';
            qualityLabel.textContent = '5. Kualitas';
            promptInput.placeholder = 'Contoh: a cat walking in the rain';
            imageData = null;
            if (imagePreview) imagePreview.classList.add('hidden');
            if (imagePlaceholder) imagePlaceholder.classList.remove('hidden');
            if (removeImageBtn) removeImageBtn.classList.add('hidden');
            if (enhanceBtnText) enhanceBtnText.textContent = 'Sempurnakan';
        }
        
        updateGenerateButton();
    });

    // Helper function to auto-select aspect ratio based on image dimensions
    function autoSelectAspectRatio(width, height) {
        const ratio = width / height;
        let selectedRatio = '16:9'; // default
        
        // Calculate distances to each aspect ratio
        const ratios = {
            '16:9': 16/9,
            '9:16': 9/16,
            '1:1': 1,
            '4:3': 4/3,
            '3:4': 3/4
        };
        
        let minDistance = Infinity;
        for (const [ratioName, ratioValue] of Object.entries(ratios)) {
            const distance = Math.abs(ratio - ratioValue);
            if (distance < minDistance) {
                minDistance = distance;
                selectedRatio = ratioName;
            }
        }
        
        // Update UI to select the closest ratio
        const ratioButtons = ratioOptions.querySelectorAll('button');
        ratioButtons.forEach(btn => {
            if (btn.dataset.value === selectedRatio) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }

    // Grid overlay helper — 15x15 white grid (SeeDance2 bypass wajah v2 style)
    function applyGridOverlay(dataUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = function() {
                const w = img.naturalWidth || img.width;
                const h = img.naturalHeight || img.height;
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const cols = 15, rows = 15;
                const cw = w / cols, ch = h / rows;
                ctx.strokeStyle = 'rgba(255,255,255,1)';
                ctx.lineWidth = 5;
                for (let i = 0; i <= cols; i++) { ctx.beginPath(); ctx.moveTo(i * cw, 0); ctx.lineTo(i * cw, h); ctx.stroke(); }
                for (let j = 0; j <= rows; j++) { ctx.beginPath(); ctx.moveTo(0, j * ch); ctx.lineTo(w, j * ch); ctx.stroke(); }
                const gridDataUrl = canvas.toDataURL('image/jpeg', 0.92);
                resolve({ dataUrl: gridDataUrl, base64: gridDataUrl.split(',')[1], mimeType: 'image/jpeg' });
            };
            img.src = dataUrl;
        });
    }

    // Setup image upload
    if (imageInput && imageUploadBox) {
        setupImageUpload(imageInput, imageUploadBox, async (data) => {
            rawImageData = data;
            if (faceGridToggle && faceGridToggle.checked) {
                imageData = await applyGridOverlay(data.dataUrl);
            } else {
                imageData = data;
            }
            imagePreview.src = imageData.dataUrl;
            imagePlaceholder.classList.add('hidden');
            imagePreview.classList.remove('hidden');
            removeImageBtn.classList.remove('hidden');
            if (faceGridToggleWrap && _selectedModel !== 'geminiomni') faceGridToggleWrap.classList.remove('hidden');
            
            // Auto-select aspect ratio based on image dimensions
            const img = new Image();
            img.onload = function() {
                autoSelectAspectRatio(this.width, this.height);
            };
            img.src = data.dataUrl;
            
            updateGenerateButton();
        });
    }

    // Face grid toggle change
    if (faceGridToggle) {
        faceGridToggle.addEventListener('change', async () => {
            if (!rawImageData) return;
            if (faceGridToggle.checked) {
                imageData = await applyGridOverlay(rawImageData.dataUrl);
            } else {
                imageData = rawImageData;
            }
            imagePreview.src = imageData.dataUrl;
        });
    }

    // Remove image button
    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            imageData = null;
            rawImageData = null;
            imageInput.value = '';
            imagePreview.src = '#';
            imagePreview.classList.add('hidden');
            imagePlaceholder.classList.remove('hidden');
            removeImageBtn.classList.add('hidden');
            if (faceGridToggleWrap) faceGridToggleWrap.classList.add('hidden');
            if (faceGridToggle) faceGridToggle.checked = false;
            updateGenerateButton();
        });
    }

    // Setup first frame upload
    if (firstFrameInput && firstFrameUploadBox) {
        setupImageUpload(firstFrameInput, firstFrameUploadBox, (data) => {
            firstFrameData = data;
            firstFramePreview.src = data.dataUrl;
            firstFramePlaceholder.classList.add('hidden');
            firstFramePreview.classList.remove('hidden');
            firstFrameRemoveBtn.classList.remove('hidden');
            
            // Auto-select aspect ratio based on first frame dimensions
            const img = new Image();
            img.onload = function() {
                autoSelectAspectRatio(this.width, this.height);
            };
            img.src = data.dataUrl;
            
            updateGenerateButton();
        });
    }

    // Remove first frame button
    if (firstFrameRemoveBtn) {
        firstFrameRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            firstFrameData = null;
            firstFrameInput.value = '';
            firstFramePreview.src = '#';
            firstFramePreview.classList.add('hidden');
            firstFramePlaceholder.classList.remove('hidden');
            firstFrameRemoveBtn.classList.add('hidden');
            updateGenerateButton();
        });
    }

    // Setup last frame upload
    if (lastFrameInput && lastFrameUploadBox) {
        setupImageUpload(lastFrameInput, lastFrameUploadBox, (data) => {
            lastFrameData = data;
            lastFramePreview.src = data.dataUrl;
            lastFramePlaceholder.classList.add('hidden');
            lastFramePreview.classList.remove('hidden');
            lastFrameRemoveBtn.classList.remove('hidden');
            updateGenerateButton();
        });
    }

    // Remove last frame button
    if (lastFrameRemoveBtn) {
        lastFrameRemoveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            lastFrameData = null;
            lastFrameInput.value = '';
            lastFramePreview.src = '#';
            lastFramePreview.classList.add('hidden');
            lastFramePlaceholder.classList.remove('hidden');
            lastFrameRemoveBtn.classList.add('hidden');
            updateGenerateButton();
        });
    }

    // Prompt input change
    promptInput.addEventListener('input', updateGenerateButton);

    // Enhance Prompt Button
    const enhancePromptBtn = document.getElementById('vg-enhance-prompt-btn');
    if (enhancePromptBtn && promptInput) {
        enhancePromptBtn.addEventListener('click', async () => {
            const mode = getSelectedValue(modeOptions);
            const currentPrompt = promptInput.value.trim();
            
            // For image-to-video and frame-to-frame, check if images are uploaded
            if (mode === 'image-to-video' && !imageData) {
                alert('Upload gambar terlebih dahulu!');
                return;
            }
            if (mode === 'frame-to-frame' && (!firstFrameData || !lastFrameData)) {
                alert('Upload kedua frame terlebih dahulu!');
                return;
            }

            const originalBtnHTML = enhancePromptBtn.innerHTML;
            enhancePromptBtn.disabled = true;
            enhancePromptBtn.innerHTML = `<div class="spinner mr-1"></div>`;

            try {
                let contextType = 'video';
                let promptText = '';
                const formData = new FormData();
                
                if (mode === 'image-to-video') {
                    contextType = 'animasi gambar';
                    if (currentPrompt) {
                        promptText = `Analisa gambar ini dan sempurnakan deskripsi animasi berikut menjadi lebih detail dan sinematik untuk AI video generation. Tambahkan detail spesifik tentang gerakan, ekspresi, camera movement, lighting, dan atmosphere. Jaga bahasa yang sama dengan input. Respond ONLY with the enhanced prompt text itself: "${currentPrompt}"`;
                    } else {
                        promptText = `Analisa gambar ini dan buatkan deskripsi animasi yang detail dan sinematik untuk AI video generation. Deskripsikan gerakan apa yang cocok, ekspresi, camera movement, lighting, dan atmosphere. Gunakan bahasa Indonesia. Respond ONLY with the prompt text itself, without any introductory phrases.`;
                    }
                    
                    // Add image to FormData - convert base64 to blob properly
                    formData.append('prompt', promptText);
                    const dataUrl = imageData.dataUrl || imageData;
                    const parts = dataUrl.split(',');
                    const mimeMatch = parts[0].match(/:(.*?);/);
                    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
                    const base64Data = parts[1];
                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: mimeType });
                    formData.append('images[]', blob, 'image.jpg');
                    
                } else if (mode === 'frame-to-frame') {
                    contextType = 'transisi frame';
                    if (currentPrompt) {
                        promptText = `Analisa kedua frame ini dan sempurnakan deskripsi transisi berikut menjadi lebih detail dan sinematik untuk AI video generation. Tambahkan detail spesifik tentang pergerakan, transformasi, camera movement, lighting, dan atmosphere. Jaga bahasa yang sama dengan input. Respond ONLY with the enhanced prompt text itself: "${currentPrompt}"`;
                    } else {
                        promptText = `Analisa kedua frame ini dan buatkan deskripsi transisi yang smooth dan sinematik untuk AI video generation. Deskripsikan bagaimana transisi dari frame pertama ke frame terakhir, pergerakan, transformasi, camera movement, lighting, dan atmosphere. Gunakan bahasa Indonesia. Respond ONLY with the prompt text itself, without any introductory phrases.`;
                    }
                    
                    // Add both frames to FormData - convert base64 to blob properly
                    formData.append('prompt', promptText);
                    
                    // First frame
                    const dataUrl1 = firstFrameData.dataUrl || firstFrameData;
                    const parts1 = dataUrl1.split(',');
                    const mimeMatch1 = parts1[0].match(/:(.*?);/);
                    const mimeType1 = mimeMatch1 ? mimeMatch1[1] : 'image/jpeg';
                    const base64Data1 = parts1[1];
                    const byteCharacters1 = atob(base64Data1);
                    const byteNumbers1 = new Array(byteCharacters1.length);
                    for (let i = 0; i < byteCharacters1.length; i++) {
                        byteNumbers1[i] = byteCharacters1.charCodeAt(i);
                    }
                    const byteArray1 = new Uint8Array(byteNumbers1);
                    const blob1 = new Blob([byteArray1], { type: mimeType1 });
                    formData.append('images[]', blob1, 'first-frame.jpg');
                    
                    // Last frame
                    const dataUrl2 = lastFrameData.dataUrl || lastFrameData;
                    const parts2 = dataUrl2.split(',');
                    const mimeMatch2 = parts2[0].match(/:(.*?);/);
                    const mimeType2 = mimeMatch2 ? mimeMatch2[1] : 'image/jpeg';
                    const base64Data2 = parts2[1];
                    const byteCharacters2 = atob(base64Data2);
                    const byteNumbers2 = new Array(byteCharacters2.length);
                    for (let i = 0; i < byteCharacters2.length; i++) {
                        byteNumbers2[i] = byteCharacters2.charCodeAt(i);
                    }
                    const byteArray2 = new Uint8Array(byteNumbers2);
                    const blob2 = new Blob([byteArray2], { type: mimeType2 });
                    formData.append('images[]', blob2, 'last-frame.jpg');
                    
                } else {
                    // Text-to-video mode
                    if (!currentPrompt) {
                        alert('Masukkan deskripsi terlebih dahulu!');
                        enhancePromptBtn.innerHTML = originalBtnHTML;
                        enhancePromptBtn.disabled = false;
                        return;
                    }
                    promptText = `Kamu adalah video prompt engineer. Sempurnakan prompt ${contextType} berikut menjadi lebih detail dan sinematik untuk AI video generation. Tambahkan detail spesifik tentang camera movement, lighting, atmosphere, dan visual elements. Jaga bahasa yang sama dengan input (Indonesia/English). Respond ONLY with the enhanced prompt text itself, without any introductory phrases, greetings, or explanations: "${currentPrompt}"`;
                    formData.append('prompt', promptText);
                }

                const response = await fetch(`${CHAT_URL}`, {
                    method: 'POST',
                    headers: {
                        'X-API-Key': getApiKey()
                    },
                    body: formData
                });

                if (!response.ok) throw new Error("Gagal menghubungi AI");
                const result = await response.json();

                if (result.success && result.response) {
                    const enhancedPrompt = typeof result.response === 'string' ? result.response : JSON.stringify(result.response);
                    promptInput.value = enhancedPrompt.trim();
                    updateGenerateButton();
                }
            } catch (error) {
                console.error("Enhance Prompt Error:", error);
                alert('Gagal menyempurnakan prompt: ' + error.message);
            } finally {
                enhancePromptBtn.innerHTML = originalBtnHTML;
                enhancePromptBtn.disabled = false;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }

    // Create result card
    function createResultCard(videoUrl, prompt, mode, aspectRatio) {
        const cardId = `vg-result-${++resultCardIndex}`;
        const card = document.createElement('div');
        card.id = cardId;
        card.className = 'result-card bg-white/90 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100';
        
        // Determine aspect ratio class based on user selection
        let aspectClass = 'aspect-video'; // default 16:9
        if (aspectRatio === '9:16') {
            aspectClass = 'aspect-[9/16]';
        } else if (aspectRatio === '1:1') {
            aspectClass = 'aspect-square';
        } else if (aspectRatio === '4:3') {
            aspectClass = 'aspect-[4/3]';
        } else if (aspectRatio === '3:4') {
            aspectClass = 'aspect-[3/4]';
        }
        
        card.innerHTML = `
            <div class="relative bg-slate-100">
                <video class="w-full ${aspectClass} object-contain" controls>
                    <source src="${videoUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>
            <div class="p-4">
                <div class="flex items-start justify-between gap-3 mb-3">
                    <div class="flex-1">
                        <p class="text-xs text-slate-500 mb-1">${mode === 'image-to-video' ? 'Image to Video' : 'Text to Video'} • ${aspectRatio}</p>
                        <p class="text-sm text-slate-700 line-clamp-2">${prompt}</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.downloadVideo('${videoUrl}', 'video-${Date.now()}.mp4', this)"
                        class="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2">
                        <i data-lucide="download" class="w-4 h-4"></i>
                        <span>Download</span>
                    </button>
                </div>
            </div>
        `;
        
        resultsGrid.insertBefore(card, resultsGrid.firstChild);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        return card;
    }

    // Download video function (iOS-compatible)
    window.downloadVideo = function(videoUrl, filename, btn) {
        const originalHtml = btn ? btn.innerHTML : null;
        const spinnerHtml = `<svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg><span>Mengunduh...</span>`;
        if (btn) { btn.disabled = true; btn.innerHTML = spinnerHtml; }
        const restore = () => {
            if (btn && originalHtml) {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        };

        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
        if (isIOS) {
            // iOS: use server-side proxy to force download (bypasses cross-origin restrictions)
            const proxyUrl = 'server/download_video.php?url=' + encodeURIComponent(videoUrl) + '&filename=' + encodeURIComponent(filename);
            window.location.href = proxyUrl;
            setTimeout(restore, 8000);
        } else {
            // Desktop/Android: try fetch blob first, fallback to <a> click
            fetch(videoUrl, { mode: 'cors' })
                .then(res => {
                    if (!res.ok) throw new Error('Fetch failed');
                    return res.blob();
                })
                .then(blob => {
                    if (typeof saveAs !== 'undefined') {
                        saveAs(blob, filename);
                    } else {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = filename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        setTimeout(() => URL.revokeObjectURL(url), 5000);
                    }
                    restore();
                })
                .catch(() => {
                    // CORS blocked: fallback to server proxy
                    const proxyUrl = 'server/download_video.php?url=' + encodeURIComponent(videoUrl) + '&filename=' + encodeURIComponent(filename);
                    window.location.href = proxyUrl;
                    setTimeout(restore, 8000);
                });
        }
    };

    // Helper function to clean up UI after video generation
    const cleanupUI = () => {
        const activeProgress = document.getElementById('vg-active-progress');
        if (activeProgress) {
            activeProgress.remove();
        }
        
        const progressContainer = document.getElementById('vg-progress-container');
        if (progressContainer) {
            progressContainer.classList.add('hidden');
            progressContainer.innerHTML = '';
        }
        
        isGenerating = false;
        generateBtn.disabled = false;
        generateBtnText.textContent = 'Buat Video';
        updateGenerateButton();
    };

    // Generate video
    generateBtn.addEventListener('click', async () => {
        // Check server status first
        if (!serverOnline) {
            alert('Server AI Video sedang offline. Silakan coba lagi nanti.');
            return;
        }
        
        if (isGenerating) return;
        
        const mode = getSelectedValue(modeOptions);
        const prompt = promptInput.value.trim();
        
        // Use tamper-proof internal state instead of DOM values
        const selectedModel = _selectedModel;
        const duration = _selectedDuration;
        const quality = _selectedQuality;
        const aspectRatio = getSelectedValue(ratioOptions) || '16:9';
        
        // Double-check: validate against allowed whitelist (defense in depth)
        const allowed = ALLOWED_VALUES[selectedModel] || ALLOWED_VALUES.seedance;
        if (!allowed.durations.includes(duration) || !allowed.qualities.includes(quality)) {
            alert('Nilai durasi atau kualitas tidak valid. Silakan pilih ulang.');
            return;
        }
        
        // Calculate quota cost based on model, duration, quality
        const quotaCost = getQuotaCost(selectedModel, duration, quality);
        
        if (!prompt) {
            alert('Masukkan deskripsi video terlebih dahulu!');
            return;
        }
        
        if (mode === 'image-to-video' && !imageData) {
            alert('Upload gambar terlebih dahulu!');
            return;
        }

        // Check quota before generating
        const email = getEmail();
        if (!email) {
            alert('Silakan login terlebih dahulu untuk menggunakan fitur AI Video.');
            return;
        }

        // Cek kuota dari cache — tidak perlu network call
        if (videoQuota !== null && videoQuota < quotaCost) {
            alert(`Kuota video tidak cukup. Dibutuhkan ${quotaCost} kuota, sisa kuota Anda: ${videoQuota}.`);
            return;
        }

        // Lock UI langsung
        isGenerating = true;
        generateBtn.disabled = true;
        
        // Show progress - check if results are already visible
        const hasResults = !resultsContainer.classList.contains('hidden');
        let progressContainer = document.getElementById('vg-progress-container');
        
        if (hasResults) {
            // If results already exist, show progress at the top of results container
            const existingProgress = document.getElementById('vg-active-progress');
            if (existingProgress) {
                existingProgress.remove();
            }
            
            const progressDiv = document.createElement('div');
            progressDiv.id = 'vg-active-progress';
            progressDiv.className = 'bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 mb-6 border border-purple-200';
            progressDiv.innerHTML = `
                <div class="flex items-center justify-between mb-3">
                    <span class="text-sm font-semibold text-purple-700">Memproses Video...</span>
                    <span id="vg-progress-percent" class="text-sm font-bold text-purple-900">0.0s</span>
                </div>
                <div class="w-full bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner">
                    <div id="vg-progress-bar" class="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500" style="width: 0%"></div>
                </div>
                <p class="text-xs text-slate-500 mt-2 text-center">Mohon tunggu...</p>
            `;
            resultsGrid.insertBefore(progressDiv, resultsGrid.firstChild);
        } else {
            // First generation - use progress in placeholder
            if (progressContainer) {
                progressContainer.innerHTML = `
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-sm font-semibold text-purple-700">Memproses Video...</span>
                        <span id="vg-progress-percent" class="text-sm font-bold text-purple-900">0.0s</span>
                    </div>
                    <div class="w-full bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner">
                        <div id="vg-progress-bar" class="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500" style="width: 0%"></div>
                    </div>
                    <p class="text-xs text-slate-500 mt-2 text-center">Mohon tunggu...</p>
                `;
                progressContainer.classList.remove('hidden');
            }
        }
        
        const progressBar = document.getElementById('vg-progress-bar');
        const progressPercent = document.getElementById('vg-progress-percent');
        
        // Simulate progress with realistic timing based on video duration
        // 6 seconds video = ~60 seconds loading, 12 seconds video = ~120 seconds loading
        let progress = 0;
        const estimatedTime = duration === 6 ? 60000 : 120000; // 60s for 6s video, 120s for 12s video
        const startTime = Date.now();
        
        const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            // Progress follows a curve: fast at start, slower near end
            const baseProgress = Math.min((elapsed / estimatedTime) * 100, 95);
            progress = Math.floor(baseProgress);
            
            if (progressBar && progressPercent) {
                progressBar.style.width = progress + '%';
                progressPercent.textContent = (elapsed / 1000).toFixed(1) + 's';
            }
        }, 100);
        
        generateBtnText.innerHTML = '<div class="spinner mr-2"></div>Membuat Video...';
        
        try {
            // Use validated selectedModel from above
            
            // Prepare FormData
            const formData = new FormData();
            formData.append('prompt', prompt);
            formData.append('seconds', duration.toString());
            formData.append('aspectRatio', aspectRatio);
            formData.append('resolution', quality);
            
            if (mode === 'image-to-video' && imageData) {
                const byteCharacters = atob(imageData.base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: imageData.mimeType });
                formData.append('images', blob, 'image.jpg');
            } else if (mode === 'frame-to-frame' && firstFrameData && lastFrameData) {
                // First frame
                const firstByteCharacters = atob(firstFrameData.base64);
                const firstByteNumbers = new Array(firstByteCharacters.length);
                for (let i = 0; i < firstByteCharacters.length; i++) {
                    firstByteNumbers[i] = firstByteCharacters.charCodeAt(i);
                }
                const firstByteArray = new Uint8Array(firstByteNumbers);
                const firstBlob = new Blob([firstByteArray], { type: firstFrameData.mimeType });
                formData.append('images', firstBlob, 'first_frame.jpg');
                
                // Last frame
                const lastByteCharacters = atob(lastFrameData.base64);
                const lastByteNumbers = new Array(lastByteCharacters.length);
                for (let i = 0; i < lastByteCharacters.length; i++) {
                    lastByteNumbers[i] = lastByteCharacters.charCodeAt(i);
                }
                const lastByteArray = new Uint8Array(lastByteNumbers);
                const lastBlob = new Blob([lastByteArray], { type: lastFrameData.mimeType });
                formData.append('images', lastBlob, 'last_frame.jpg');
            }
            
            let result;
            let usedBaseUrl = BASE_URL;
            const baseUrlPool = BASE_URLS.length > 0 ? BASE_URLS : (BASE_URL ? [BASE_URL] : []);
            const pickedBaseUrl = (baseUrlPool[Math.floor(Math.random() * baseUrlPool.length)] || '').replace(/\/$/, '');
            
            if (selectedModel === 'geminiomni') {
                // Gemini Omni via Synthesia account rotation — use BASE_URL_PRIVATE
                const privUrl = (window.BASE_URL_PRIVATE || '').replace(/\/$/, '');
                if (!privUrl) throw new Error('BASE_URL_PRIVATE belum diatur');
                const token = await getToken(privUrl);
                const omniForm = new FormData();
                omniForm.append('prompt', prompt);
                omniForm.append('durationInSeconds', duration.toString());
                omniForm.append('aspectRatio', aspectRatio);
                omniForm.append('generateAudio', 'true');
                if (mode === 'image-to-video' && imageData) {
                    const bc = atob(imageData.base64);
                    const ba = new Uint8Array(bc.length);
                    for (let i = 0; i < bc.length; i++) ba[i] = bc.charCodeAt(i);
                    omniForm.append('image', new Blob([ba], { type: imageData.mimeType }), 'image.jpg');
                }
                const response = await fetch(`${privUrl}/st-geminiomni`, {
                    method: 'POST',
                    headers: buildHeaders(token),
                    body: omniForm
                });
                if (!response.ok) throw new Error(await getApiErrorMessage(response));
                result = await response.json();
                usedBaseUrl = privUrl;
            } else if (selectedModel === 'seedancedola') {
                // SeeDance 2.0 Fast via Dola — use BASE_URL_PRIVATE
                const privUrl = (window.BASE_URL_PRIVATE || '').replace(/\/$/, '');
                if (!privUrl) throw new Error('BASE_URL_PRIVATE belum diatur');
                const token = await getToken(privUrl);
                const response = await fetch(`${privUrl}/seedancedola`, {
                    method: 'POST',
                    headers: buildHeaders(token),
                    body: formData
                });
                if (!response.ok) throw new Error(await getApiErrorMessage(response));
                result = await response.json();
                usedBaseUrl = privUrl;
            } else if (selectedModel.startsWith('weavy')) {
                // Weavy models use a fresh random BASE_URL per request
                console.log(`[Video] Using random BASE_URL for ${selectedModel}: ${pickedBaseUrl}`);
                const token = await getToken(pickedBaseUrl);
                const response = await fetch(`${pickedBaseUrl}/${selectedModel}`, {
                    method: 'POST',
                    headers: buildHeaders(token),
                    body: formData
                });
                if (!response.ok) throw new Error(await getApiErrorMessage(response));
                result = await response.json();
                usedBaseUrl = pickedBaseUrl;
            } else {
                // SeeDance 1.5 (BytePlus)
                console.log(`[Video] Using random BASE_URL for seedance: ${pickedBaseUrl}`);
                const token = await getToken(pickedBaseUrl);
                const response = await fetch(`${pickedBaseUrl}/seedance`, {
                    method: 'POST',
                    headers: buildHeaders(token),
                    body: formData
                });
                if (!response.ok) throw new Error(await getApiErrorMessage(response));
                result = await response.json();
                usedBaseUrl = pickedBaseUrl;
            }
            
            // Polling for SeeDance and all Weavy models
            if (result.success && result.taskId && !result.videoUrl) {
                console.log(`[Video] Task created: ${result.taskId}, polling for completion...`);
                
                // Poll for video completion
                const pollInterval = 5000; // 5 seconds
                const maxPollTime = 600000; // 10 minutes max
                const pollStartTime = Date.now();
                
                const pollStatus = async () => {
                    try {
                        const statusUrl = selectedModel === 'geminiomni'
                            ? `${usedBaseUrl}/st-geminiomni-status`
                            : selectedModel === 'seedancedola'
                            ? `${usedBaseUrl}/seedancedola-status`
                            : selectedModel.startsWith('weavy')
                            ? `${usedBaseUrl}/weavy-status`
                            : `${usedBaseUrl}/seedance-status`;
                        const token = await getToken(usedBaseUrl);
                        const headers = buildHeaders(token);
                        headers['Content-Type'] = 'application/json';
                        const statusResponse = await fetch(statusUrl, {
                            method: 'POST',
                            headers: headers,
                            body: JSON.stringify({ taskId: result.taskId })
                        });
                        
                        if (!statusResponse.ok) {
                            throw new Error('Failed to check video status');
                        }
                        
                        const statusResult = await statusResponse.json();
                        
                        // Check if done
                        if (statusResult.status === 'done' && statusResult.videoUrl) {
                            clearInterval(progressInterval);
                            if (progressBar && progressPercent) {
                                progressBar.style.width = '100%';
                                progressPercent.textContent = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
                            }
                            
                            await decreaseVideoQuota(quotaCost);
                            resultsPlaceholder.classList.add('hidden');
                            resultsContainer.classList.remove('hidden');
                            createResultCard(statusResult.videoUrl, prompt, mode, aspectRatio);
                            if (doneSound) doneSound.play();
                            
                            // Clean up UI after success
                            cleanupUI();
                            return true; // Done
                        }
                        
                        // Check if failed
                        if (statusResult.status === 'failed') {
                            cleanupUI();
                            throw new Error(statusResult.error || 'Video generation failed');
                        }
                        
                        // Check if task not found / expired
                        if (statusResult.status === 'not_found') {
                            cleanupUI();
                            throw new Error(statusResult.error || 'Task not found or expired');
                        }
                        
                        // Still processing - check timeout
                        if (Date.now() - pollStartTime > maxPollTime) {
                            cleanupUI();
                            throw new Error('Video generation timeout - please try again');
                        }
                        
                        // Continue polling
                        setTimeout(pollStatus, pollInterval);
                        
                    } catch (pollError) {
                        clearInterval(progressInterval);
                        cleanupUI();
                        console.error('Video polling error:', pollError);
                        alert('Gagal membuat video: ' + pollError.message);
                        if (errorSound) errorSound.play();
                    }
                };
                
                // Start polling - don't await, let it run async
                setTimeout(pollStatus, pollInterval);
                
                // Return early to prevent finally block from running
                return;
                
            } else if (result.success && result.videoUrl) {
                // Direct response with videoUrl (old behavior for backward compatibility)
                clearInterval(progressInterval);
                if (progressBar && progressPercent) {
                    progressBar.style.width = '100%';
                    progressPercent.textContent = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
                }
                
                await decreaseVideoQuota(quotaCost);
                resultsPlaceholder.classList.add('hidden');
                resultsContainer.classList.remove('hidden');
                createResultCard(result.videoUrl, prompt, mode, aspectRatio);
                if (doneSound) doneSound.play();
                cleanupUI();
            } else {
                throw new Error(result.error || 'Gagal membuat video');
            }
            
        } catch (error) {
            clearInterval(progressInterval);
            console.error('Video generation error:', error);
            alert('Gagal membuat video: ' + error.message);
            if (errorSound) errorSound.play();
            cleanupUI();
        } finally {
            // Only cleanup if not polling (polling path returns early)
            // This finally block only runs for direct response or initial error
        }
    });

    // === Convert Video Quota to Booster Quota ===
    const convertBtn = document.getElementById('vg-convert-btn');
    if (convertBtn) {
        convertBtn.addEventListener('click', async () => {
            const email = getEmail();
            if (!email) {
                alert('Silakan login terlebih dahulu.');
                return;
            }

            if (videoQuota === null || videoQuota <= 0) {
                alert('Tidak ada sisa kuota video untuk dikonversi.');
                return;
            }

            const boostAmount = videoQuota * 20;
            if (typeof window.showConfirmPopup === 'function') {
                window.showConfirmPopup({
                    title: 'Konversi Kuota',
                    message: `<div class="text-center"><p class="mb-3">Anda akan mengkonversi <strong>${videoQuota} kuota Video</strong> menjadi <strong>${boostAmount} gambar Booster Mode</strong>.</p><p class="text-xs text-slate-500 bg-slate-100 py-2 px-3 rounded-lg"><strong>Info:</strong> 1 Video = 20 Gambar Booster Mode</p><p class="mt-3">Lanjutkan?</p></div>`,
                    confirmText: 'Ya, Konversi',
                    cancelText: 'Batal',
                    onConfirm: () => executeConversion(email)
                });
            } else {
                if (confirm(`Anda akan mengkonversi ${videoQuota} kuota Video menjadi ${boostAmount} gambar Booster Mode.\n\nInfo: 1 Video = 20 Gambar Booster Mode\n\nLanjutkan?`)) {
                    executeConversion(email);
                }
            }
        });
    }

    async function executeConversion(email) {
        if (convertBtn) {
            convertBtn.disabled = true;
            convertBtn.innerHTML = '<div class="spinner w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Memproses...';
        }

        try {
            const response = await fetch('/server/video_to_boost_convert.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'convert', email })
            });
            const result = await response.json();
            
            if (result.success) {
                alert(result.message);
                await fetchVideoQuota(); // Refresh quota display
                // If using global script.js logic for top up boost
                if (typeof window.fetchBoostStatus === 'function') {
                    window.fetchBoostStatus();
                } else {
                    window.location.reload();
                }
            } else {
                alert('Gagal: ' + (result.message || 'Terjadi kesalahan'));
            }
        } catch (e) {
            console.error('Error converting quota:', e);
            alert('Terjadi kesalahan koneksi.');
        } finally {
            if (convertBtn) {
                convertBtn.disabled = false;
                convertBtn.innerHTML = '<i data-lucide="refresh-cw" class="w-4 h-4"></i> Konversi ke Booster Mode';
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        }
    }

    // === Top-up Video Quota ===
    const topupButtons = [
        { id: 'vg-topup-5', tier: 'video_5', credits: 5, price: 5000 },
        { id: 'vg-topup-15', tier: 'video_15', credits: 15, price: 10000 },
        { id: 'vg-topup-50', tier: 'video_50', credits: 50, price: 25000 }
    ];

    topupButtons.forEach(({ id, tier, credits, price }) => {
        const btn = document.getElementById(id);
        if (!btn) return;

        btn.addEventListener('click', async () => {
            const email = getEmail();
            if (!email) {
                alert('Silakan login terlebih dahulu untuk top-up kuota video.');
                return;
            }

            // Check for pending transaction first
            try {
                const checkResp = await fetch('/server/video_payment.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'check_pending', email })
                });
                const checkData = await checkResp.json();
                
                if (checkData.success && checkData.has_pending) {
                    const tx = checkData.transaction;
                    // Always show QR popup for pending transaction
                    window.showVideoPaymentModal({
                        qrString: tx.qrString,
                        amount: tx.amount,
                        credits: tx.credits,
                        reference: tx.reference,
                        expiry_time: tx.expiry_time
                    });
                    return;
                }
            } catch (e) {
                console.error('Error checking pending transaction:', e);
            }

            // Show confirmation dialog before creating transaction
            const priceFormatted = `Rp ${(price / 1000).toFixed(0)}rb`;
            const confirmMessage = `Anda akan membeli ${credits} Kredit Video seharga ${priceFormatted}. Lanjutkan transaksi?`;
            
            if (typeof window.showConfirmPopup === 'function') {
                window.showConfirmPopup({
                    title: 'Konfirmasi Top-up Video',
                    message: confirmMessage,
                    confirmText: 'Ya, Lanjutkan',
                    cancelText: 'Batal',
                    onConfirm: () => processVideoTopup(btn, email, tier, credits, price)
                });
            } else {
                if (!confirm(confirmMessage)) return;
                processVideoTopup(btn, email, tier, credits, price);
            }
        });
    });

    async function processVideoTopup(btn, email, tier, credits, price) {
        // Create new transaction
        btn.disabled = true;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<div class="spinner w-3.5 h-3.5 inline mr-1 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Memproses...';

        try {
            const response = await fetch('/server/video_payment.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'create_transaction',
                    email,
                    tier
                })
            });
            const data = await response.json();

            if (data.success && data.qrString) {
                // Always show QR payment modal
                window.showVideoPaymentModal({
                    qrString: data.qrString,
                    amount: data.amount,
                    credits: data.credits,
                    reference: data.reference,
                    expiry_time: data.expiry_time
                });
            } else {
                alert('Gagal membuat transaksi: ' + (data.message || 'Unknown error'));
            }
        } catch (e) {
            console.error('Error creating video transaction:', e);
            alert('Terjadi kesalahan saat membuat transaksi.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    // Video Quota Top-up Modal Handler
    const videoTopupBtn = document.getElementById('vg-topup-btn');
    const videoTopupModal = document.getElementById('video-topup-modal');
    const closeVideoTopupModal = document.getElementById('close-video-topup-modal');
    const videoTierCards = document.querySelectorAll('.video-tier-card');
    const videoPayBtn = document.getElementById('video-topup-pay-btn');
    const videoSelectedDisplay = document.getElementById('video-selected-tier-display');
    const videoSelectedTierText = document.getElementById('video-selected-tier-text');
    const videoSelectedPriceText = document.getElementById('video-selected-price-text');

    let selectedVideoTier = null;
    let selectedVideoPrice = null;

    if (videoTopupBtn && videoTopupModal) {
        videoTopupBtn.addEventListener('click', async () => {
            const email = getEmail();
            if (!email) {
                alert('Silakan login terlebih dahulu');
                return;
            }

            // Check for pending transaction first
            try {
                const checkResp = await fetch('/server/video_payment.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'check_pending', email })
                });
                const checkData = await checkResp.json();
                
                if (checkData.success && checkData.has_pending) {
                    const tx = checkData.transaction;
                    // Show QR popup for pending transaction immediately
                    if (typeof window.showVideoPaymentModal === 'function') {
                        window.showVideoPaymentModal({
                            qrString: tx.qrString,
                            amount: tx.amount,
                            credits: tx.credits,
                            reference: tx.reference,
                            expiry_time: tx.expiry_time
                        });
                    }
                    return; // Don't open topup modal if there's pending transaction
                }
            } catch (e) {
                console.error('Error checking pending transaction:', e);
            }

            // No pending transaction, show topup modal
            videoTopupModal.style.display = 'flex';
            videoTopupModal.classList.remove('hidden');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
    }

    if (closeVideoTopupModal) {
        closeVideoTopupModal.addEventListener('click', () => {
            videoTopupModal.style.display = 'none';
            videoTopupModal.classList.add('hidden');
            resetVideoModal();
        });
    }

    // Click outside to close
    if (videoTopupModal) {
        videoTopupModal.addEventListener('click', (e) => {
            if (e.target === videoTopupModal) {
                videoTopupModal.style.display = 'none';
                videoTopupModal.classList.add('hidden');
                resetVideoModal();
            }
        });
    }

    function resetVideoModal() {
        videoTierCards.forEach(card => card.classList.remove('selected'));
        if (videoSelectedDisplay) videoSelectedDisplay.classList.add('hidden');
        if (videoPayBtn) videoPayBtn.disabled = true;
        selectedVideoTier = null;
        selectedVideoPrice = null;
    }

    videoTierCards.forEach(card => {
        card.addEventListener('click', function() {
            videoTierCards.forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            
            selectedVideoTier = parseInt(this.dataset.tier);
            selectedVideoPrice = parseInt(this.dataset.price);
            
            if (videoSelectedDisplay) {
                videoSelectedDisplay.classList.remove('hidden');
                videoSelectedTierText.textContent = `${selectedVideoTier} Video`;
                videoSelectedPriceText.textContent = `Rp ${selectedVideoPrice.toLocaleString('id-ID')}`;
            }
            
            if (videoPayBtn) {
                videoPayBtn.disabled = false;
            }
            
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
    });

    if (videoPayBtn) {
        videoPayBtn.addEventListener('click', async () => {
            if (!selectedVideoTier || !selectedVideoPrice) return;
            
            const email = getEmail();
            if (!email) {
                alert('Silakan login terlebih dahulu');
                return;
            }

            videoPayBtn.disabled = true;
            const originalHTML = videoPayBtn.innerHTML;
            videoPayBtn.innerHTML = '<span class="flex items-center justify-center gap-2"><div class="spinner"></div>Memproses...</span>';

            try {
                // Map tier to video_X format
                let tierString = `video_${selectedVideoTier}`;
                
                const response = await fetch('/server/video_payment.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'create_transaction',
                        email: email,
                        tier: tierString
                    })
                });

                const data = await response.json();
                
                if (data.success && data.qrString) {
                    // Close modal
                    videoTopupModal.style.display = 'none';
                    resetVideoModal();
                    
                    // Show QR payment modal
                    if (typeof window.showVideoPaymentModal === 'function') {
                        window.showVideoPaymentModal({
                            qrString: data.qrString,
                            amount: data.amount,
                            credits: data.credits,
                            reference: data.reference,
                            expiry_time: data.expiry_time
                        });
                    } else {
                        alert('QR Code: ' + data.qrString);
                    }
                } else {
                    throw new Error(data.message || 'Gagal membuat transaksi');
                }
            } catch (error) {
                console.error('Payment error:', error);
                alert('Gagal membuat pembayaran: ' + error.message);
            } finally {
                videoPayBtn.disabled = false;
                videoPayBtn.innerHTML = originalHTML;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }

    // Apply seedancedola default: all modes enabled
    if (modeOptions) {
        const _t2v = modeOptions.querySelector('[data-value="text-to-video"]');
        const _f2f = modeOptions.querySelector('[data-value="frame-to-frame"]');
        const _i2v = modeOptions.querySelector('[data-value="image-to-video"]');
        if (_t2v)   { _t2v.disabled = false; _t2v.style.opacity  = ''; }
        if (_i2v)   { _i2v.disabled = false; _i2v.style.opacity  = ''; }
        if (_f2f)   { _f2f.disabled = false; _f2f.style.opacity  = ''; }
        modeOptions.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
        if (_t2v)   { _t2v.classList.add('selected'); }
        if (imageSection) imageSection.classList.add('hidden');
        if (frameSection) frameSection.classList.add('hidden');
        if (promptLabel) promptLabel.textContent = '3. Deskripsi Video';
    }
    updateDurationForModel('seedancedola');

    // Initial state
    updateGenerateButton();
};
