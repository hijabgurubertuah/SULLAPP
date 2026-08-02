document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('tts-app');
    const locked = document.getElementById('tts-locked');
    const openAddonsBtn = document.getElementById('tts-open-addons-btn');

    if (!app) return;

    const ADDON_CHECK_ENDPOINT = '/server/addons_payment.php';
    const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
    const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

    let currentMode = 'tts';
    let audioElement = null;
    let isPlaying = false;
    let playbackSpeed = 1;

    // ===================== TEMPLATES =====================
    const templates = {
        greeting: 'Assalamualaikum warahmatullahi wabarakatuh. Selamat datang di channel kami. Semoga hari ini menjadi hari yang penuh berkah dan kebermanfaatan untuk kita semua.',
        narration: 'Di tengah hiruk pikuk kehidupan modern, ada satu teknologi yang mengubah segalanya. Inilah cerita tentang bagaimana kecerdasan buatan membawa kita ke era baru.',
        podcast: 'Halo semua! Selamat datang kembali di podcast kami. Hari ini kita akan membahas topik yang sangat menarik dan pastinya bermanfaat untuk kalian semua. Jangan lupa subscribe ya!',
        education: 'Pada kesempatan kali ini, kita akan mempelajari konsep dasar yang sangat penting. Silakan siapkan catatan kalian karena materi ini akan sangat berguna.',
        announcement: 'Perhatian kepada seluruh pelanggan setia kami. Kami dengan bangga mengumumkan program spesial terbaru yang tidak boleh Anda lewatkan.'
    };

    // ===================== PROMO STYLE PROMPTS =====================
    const promoStyles = {
        energetic: 'Buat script promosi yang sangat energik, penuh semangat, menggunakan kata-kata power seperti "Luar biasa!", "Jangan lewatkan!", "Hanya untuk Anda!". Gunakan kalimat pendek dan bersemangat.',
        professional: 'Buat script promosi yang profesional, elegan, dan meyakinkan. Gunakan data dan fakta. Tonjolkan kredibilitas dan keunggulan kompetitif.',
        friendly: 'Buat script promosi yang ramah dan hangat seperti berbicara dengan teman. Gunakan bahasa santai namun tetap meyakinkan. Tambahkan sentuhan personal.',
        luxury: 'Buat script promosi yang mewah dan eksklusif. Gunakan bahasa yang sophisticated. Tonjolkan eksklusivitas dan premium quality.',
        urgent: 'Buat script promosi dengan nuansa mendesak dan FOMO. Tekankan kelangkaan, waktu terbatas, dan kesempatan emas yang tidak boleh dilewatkan.',
        storytelling: 'Buat script promosi dalam bentuk cerita singkat yang relatable. Mulai dari masalah, lalu tunjukkan solusinya dengan produk ini.'
    };

    // ===================== API CONFIG =====================
    const getApiConfig = async () => {
        const rawBaseUrl = String(window.BASE_URL || '');
        const baseUrls = rawBaseUrl.split(',').map(u => u.trim()).filter(Boolean);
        const randomIndex = baseUrls.length > 0 ? Math.floor(Math.random() * baseUrls.length) : -1;
        const randomBase = randomIndex !== -1 ? baseUrls[randomIndex] : rawBaseUrl;
        const baseUrlClean = String(randomBase || '').replace(/\/$/, '');

        const apiHeaders = {};
        if (window.API_KEY) apiHeaders['X-API-Key'] = window.API_KEY;

        if (baseUrlClean && typeof window.ensureFrontendToken === 'function') {
            try {
                const token = await window.ensureFrontendToken(baseUrlClean);
                if (token) apiHeaders['Authorization'] = `Bearer ${token}`;
            } catch (_) { }
        }

        const ttsEndpoint = `${baseUrlClean}/tts`;

        return { ttsEndpoint, apiHeaders, baseUrlClean };
    };

    // ===================== ADDON CHECK =====================
    const checkAddonAccess = async () => {
        const email = localStorage.getItem('sulapfoto_verified_email');
        if (!email) {
            if (locked) locked.classList.remove('hidden');
            if (app) app.classList.add('hidden');
            return false;
        }
        try {
            const result = window.getAddonStatus ? await window.getAddonStatus(email, 'text_to_speech') : await (await fetch('/server/addons_payment.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_active_addon', email, addon_key: 'text_to_speech' }) })).json();
            if (result.success && result.is_active) {
                if (locked) locked.classList.add('hidden');
                if (app) app.classList.remove('hidden');
                return true;
            } else {
                if (locked) locked.classList.remove('hidden');
                if (app) app.classList.add('hidden');
                return false;
            }
        } catch (e) {
            console.error('TTS addon check failed', e);
            if (locked) locked.classList.remove('hidden');
            if (app) app.classList.add('hidden');
            return false;
        }
    };

    checkAddonAccess();

    if (openAddonsBtn) {
        openAddonsBtn.addEventListener('click', () => {
            if (typeof window.switchTab === 'function') window.switchTab('addons');
        });
    }

    // ===================== MODE SWITCHING =====================
    const modeBtns = document.querySelectorAll('.tts-mode-btn');
    const panels = document.querySelectorAll('.tts-panel');

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.ttsMode;
            currentMode = mode;
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            panels.forEach(p => p.classList.add('hidden'));
            const target = document.getElementById(`tts-panel-${mode}`);
            if (target) target.classList.remove('hidden');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
    });

    // ===================== TEXT TO SPEECH =====================
    const ttsTextInput = document.getElementById('tts-text-input');
    const ttsCharCount = document.getElementById('tts-char-count');
    const ttsGenerateBtn = document.getElementById('tts-generate-btn');
    const ttsPasteBtn = document.getElementById('tts-paste-btn');
    const ttsClearBtn = document.getElementById('tts-clear-btn');
    const ttsAdvancedToggle = document.getElementById('tts-advanced-toggle');
    const ttsAdvancedPanel = document.getElementById('tts-advanced-panel');
    const ttsAdvancedIcon = document.getElementById('tts-advanced-icon');
    const ttsSpeedRange = document.getElementById('tts-speed-range');
    const ttsSpeedValue = document.getElementById('tts-speed-value');
    const ttsPitchRange = document.getElementById('tts-pitch-range');
    const ttsPitchValue = document.getElementById('tts-pitch-value');

    if (ttsTextInput && ttsCharCount) {
        ttsTextInput.addEventListener('input', () => {
            ttsCharCount.textContent = `${ttsTextInput.value.length} / 5000`;
        });
    }

    if (ttsPasteBtn) {
        ttsPasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (ttsTextInput) {
                    ttsTextInput.value = text;
                    ttsTextInput.dispatchEvent(new Event('input'));
                }
            } catch (e) { console.warn('Paste failed', e); }
        });
    }

    if (ttsClearBtn) {
        ttsClearBtn.addEventListener('click', () => {
            if (ttsTextInput) {
                ttsTextInput.value = '';
                ttsTextInput.dispatchEvent(new Event('input'));
            }
        });
    }

    if (ttsAdvancedToggle && ttsAdvancedPanel) {
        ttsAdvancedToggle.addEventListener('click', () => {
            ttsAdvancedPanel.classList.toggle('hidden');
            if (ttsAdvancedIcon) ttsAdvancedIcon.style.transform = ttsAdvancedPanel.classList.contains('hidden') ? '' : 'rotate(180deg)';
        });
    }

    if (ttsSpeedRange && ttsSpeedValue) {
        ttsSpeedRange.addEventListener('input', () => {
            ttsSpeedValue.textContent = `${parseFloat(ttsSpeedRange.value).toFixed(1)}x`;
        });
    }

    if (ttsPitchRange && ttsPitchValue) {
        ttsPitchRange.addEventListener('input', () => {
            const v = parseInt(ttsPitchRange.value);
            ttsPitchValue.textContent = v === 0 ? 'Normal' : v > 0 ? `+${v}` : `${v}`;
        });
    }

    // Template buttons
    document.querySelectorAll('.tts-template-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.template;
            if (templates[key] && ttsTextInput) {
                ttsTextInput.value = templates[key];
                ttsTextInput.dispatchEvent(new Event('input'));
            }
        });
    });

    // Generate TTS
    if (ttsGenerateBtn) {
        ttsGenerateBtn.addEventListener('click', async () => {
            const text = ttsTextInput?.value?.trim();
            if (!text) {
                showToast('Masukkan teks terlebih dahulu', 'error');
                return;
            }

            const voice = document.getElementById('tts-voice-select')?.value || 'Zephyr';
            const language = document.getElementById('tts-language-select')?.value || 'id';
            const speed = parseFloat(ttsSpeedRange?.value || '1.0');
            const pitch = parseInt(ttsPitchRange?.value || '0');
            const instruction = document.getElementById('tts-custom-instruction')?.value?.trim() || '';

            await generateTTS({
                text,
                voice,
                language,
                speed,
                pitch,
                instruction,
                mode: 'tts'
            });
        });
    }

    // ===================== SPEECH TO TEXT =====================
    let isRecording = false;
    let mediaRecorder = null;
    let recordedChunks = [];
    const sttRecordBtn = document.getElementById('stt-record-btn');
    const sttStatusText = document.getElementById('stt-status-text');
    const sttFileInput = document.getElementById('stt-file-input');
    const sttUploadZone = document.getElementById('stt-upload-zone');
    const sttAudioPreview = document.getElementById('stt-audio-preview');
    const sttTranscribeBtn = document.getElementById('stt-transcribe-btn');
    const sttResult = document.getElementById('stt-result');
    const sttResultText = document.getElementById('stt-result-text');
    const sttCopyBtn = document.getElementById('stt-copy-btn');
    let sttAudioFile = null;

    if (sttUploadZone) {
        sttUploadZone.addEventListener('click', () => sttFileInput?.click());
    }

    if (sttFileInput) {
        sttFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > MAX_AUDIO_BYTES) {
                showToast('File terlalu besar (maks 25MB)', 'error');
                return;
            }
            sttAudioFile = file;
            showAudioPreview('stt', file);
        });
    }

    const sttRemoveFile = document.getElementById('stt-remove-file');
    if (sttRemoveFile) {
        sttRemoveFile.addEventListener('click', () => {
            sttAudioFile = null;
            if (sttAudioPreview) sttAudioPreview.classList.add('hidden');
            if (sttFileInput) sttFileInput.value = '';
        });
    }

    // Record
    if (sttRecordBtn) {
        sttRecordBtn.addEventListener('click', async () => {
            if (isRecording) {
                stopRecording();
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                recordedChunks = [];
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) recordedChunks.push(e.data);
                };
                mediaRecorder.onstop = () => {
                    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
                    sttAudioFile = new File([blob], 'recording.webm', { type: 'audio/webm' });
                    showAudioPreview('stt', sttAudioFile);
                    stream.getTracks().forEach(t => t.stop());
                };
                mediaRecorder.start();
                isRecording = true;
                sttRecordBtn.classList.add('recording');
                if (sttStatusText) sttStatusText.textContent = 'Merekam... Tekan lagi untuk berhenti';
                const micIcon = document.getElementById('stt-mic-icon');
                if (micIcon) micIcon.setAttribute('data-lucide', 'square');
                if (typeof lucide !== 'undefined') lucide.createIcons();
            } catch (e) {
                showToast('Tidak bisa mengakses mikrofon', 'error');
            }
        });
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        isRecording = false;
        if (sttRecordBtn) sttRecordBtn.classList.remove('recording');
        if (sttStatusText) sttStatusText.textContent = 'Rekaman selesai';
        const micIcon = document.getElementById('stt-mic-icon');
        if (micIcon) micIcon.setAttribute('data-lucide', 'mic');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // Transcribe
    if (sttTranscribeBtn) {
        sttTranscribeBtn.addEventListener('click', async () => {
            if (!sttAudioFile) {
                showToast('Upload atau rekam audio terlebih dahulu', 'error');
                return;
            }
            const language = document.getElementById('stt-language-select')?.value || 'id';
            await transcribeAudio(sttAudioFile, language);
        });
    }

    if (sttCopyBtn) {
        sttCopyBtn.addEventListener('click', () => {
            const text = sttResultText?.textContent;
            if (text) {
                navigator.clipboard.writeText(text);
                showToast('Berhasil disalin!', 'success');
            }
        });
    }

    // ===================== VOICE CHANGE =====================
    const vcFileInput = document.getElementById('vc-file-input');
    const vcUploadZone = document.getElementById('vc-upload-zone');
    const vcAudioPreview = document.getElementById('vc-audio-preview');
    const vcGenerateBtn = document.getElementById('vc-generate-btn');
    let vcAudioFile = null;

    if (vcUploadZone) {
        vcUploadZone.addEventListener('click', () => vcFileInput?.click());
    }

    if (vcFileInput) {
        vcFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > MAX_AUDIO_BYTES) {
                showToast('File terlalu besar (maks 25MB)', 'error');
                return;
            }
            vcAudioFile = file;
            showAudioPreview('vc', file);
        });
    }

    const vcRemoveFile = document.getElementById('vc-remove-file');
    if (vcRemoveFile) {
        vcRemoveFile.addEventListener('click', () => {
            vcAudioFile = null;
            if (vcAudioPreview) vcAudioPreview.classList.add('hidden');
            if (vcFileInput) vcFileInput.value = '';
        });
    }

    if (vcGenerateBtn) {
        vcGenerateBtn.addEventListener('click', async () => {
            if (!vcAudioFile) {
                showToast('Upload audio terlebih dahulu', 'error');
                return;
            }
            const voice = document.getElementById('vc-voice-select')?.value || 'Zephyr';
            await voiceChange(vcAudioFile, voice);
        });
    }

    // ===================== IMAGE TO SPEECH =====================
    const i2sFileInput = document.getElementById('i2s-file-input');
    const i2sUploadZone = document.getElementById('i2s-upload-zone');
    const i2sImagePreview = document.getElementById('i2s-image-preview');
    const i2sGenerateBtn = document.getElementById('i2s-generate-btn');
    let i2sImageFile = null;

    if (i2sUploadZone) {
        i2sUploadZone.addEventListener('click', () => i2sFileInput?.click());
    }

    if (i2sFileInput) {
        i2sFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > MAX_IMAGE_BYTES) {
                showToast('File terlalu besar (maks 10MB)', 'error');
                return;
            }
            i2sImageFile = file;
            showImagePreview('i2s', file);
        });
    }

    const i2sRemoveImage = document.getElementById('i2s-remove-image');
    if (i2sRemoveImage) {
        i2sRemoveImage.addEventListener('click', () => {
            i2sImageFile = null;
            if (i2sImagePreview) i2sImagePreview.classList.add('hidden');
            if (i2sFileInput) i2sFileInput.value = '';
        });
    }

    if (i2sGenerateBtn) {
        i2sGenerateBtn.addEventListener('click', async () => {
            if (!i2sImageFile) {
                showToast('Upload gambar terlebih dahulu', 'error');
                return;
            }
            const style = document.getElementById('i2s-style-select')?.value || 'descriptive';
            const voice = document.getElementById('i2s-voice-select')?.value || 'Zephyr';
            const language = document.getElementById('i2s-language-select')?.value || 'id';
            await imageToSpeech(i2sImageFile, style, voice, language);
        });
    }

    // ===================== PROMO =====================
    const promoFileInput = document.getElementById('promo-file-input');
    const promoUploadZone = document.getElementById('promo-upload-zone');
    const promoImagePreview = document.getElementById('promo-image-preview');
    const promoGenerateBtn = document.getElementById('promo-generate-btn');
    let promoImageFile = null;

    if (promoUploadZone) {
        promoUploadZone.addEventListener('click', () => promoFileInput?.click());
    }

    if (promoFileInput) {
        promoFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > MAX_IMAGE_BYTES) {
                showToast('File terlalu besar (maks 10MB)', 'error');
                return;
            }
            promoImageFile = file;
            showImagePreview('promo', file);
        });
    }

    const promoRemoveImage = document.getElementById('promo-remove-image');
    if (promoRemoveImage) {
        promoRemoveImage.addEventListener('click', () => {
            promoImageFile = null;
            if (promoImagePreview) promoImagePreview.classList.add('hidden');
            if (promoFileInput) promoFileInput.value = '';
        });
    }

    if (promoGenerateBtn) {
        promoGenerateBtn.addEventListener('click', async () => {
            const productName = document.getElementById('promo-product-name')?.value?.trim();
            const description = document.getElementById('promo-description')?.value?.trim();
            if (!productName) {
                showToast('Masukkan nama produk', 'error');
                return;
            }
            const styleRadio = document.querySelector('input[name="promo-style"]:checked');
            const style = styleRadio?.value || 'energetic';
            const voice = document.getElementById('promo-voice-select')?.value || 'Zephyr';
            const duration = document.getElementById('promo-duration-select')?.value || '30';

            await generatePromo(productName, description, style, voice, duration, promoImageFile);
        });
    }

    const promoCopyScript = document.getElementById('promo-copy-script');
    if (promoCopyScript) {
        promoCopyScript.addEventListener('click', () => {
            const text = document.getElementById('promo-script-text')?.textContent;
            if (text) {
                navigator.clipboard.writeText(text);
                showToast('Script berhasil disalin!', 'success');
            }
        });
    }

    // ===================== AUDIO PLAYER =====================
    const resultContainer = document.getElementById('tts-result-container');
    const ttsPlayBtn = document.getElementById('tts-play-btn');
    // Helper: lucide.createIcons() replaces <i> with <svg>, losing the old reference.
    // Always re-query and rebuild the icon element to toggle play/pause.
    function setPlayIcon(iconName) {
        if (!ttsPlayBtn) return;
        const oldIcon = ttsPlayBtn.querySelector('svg, i');
        if (oldIcon) oldIcon.remove();
        const newIcon = document.createElement('i');
        newIcon.setAttribute('data-lucide', iconName);
        newIcon.id = 'tts-play-icon';
        newIcon.className = 'w-4 h-4 md:w-5 md:h-5';
        ttsPlayBtn.appendChild(newIcon);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    const ttsSeekBar = document.getElementById('tts-seek-bar');
    const ttsVolumeBar = document.getElementById('tts-volume-bar');
    const ttsCurrentTime = document.getElementById('tts-current-time');
    const ttsDuration = document.getElementById('tts-duration');
    const ttsDownloadBtn = document.getElementById('tts-download-btn');
    const ttsSpeedBtn = document.getElementById('tts-speed-btn');
    const ttsWaveform = document.getElementById('tts-waveform');
    let currentAudioUrl = null;


    // Convert PCM data to WAV format
    function pcmToWav(base64Data, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
        const pcmData = atob(base64Data);
        const pcmBytes = new Uint8Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
            pcmBytes[i] = pcmData.charCodeAt(i);
        }

        const dataLength = pcmBytes.length;
        const buffer = new ArrayBuffer(44 + dataLength);
        const view = new DataView(buffer);

        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + dataLength, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);
        view.setUint16(32, numChannels * bitsPerSample / 8, true);
        view.setUint16(34, bitsPerSample, true);
        writeString(36, 'data');
        view.setUint32(40, dataLength, true);

        // Copy PCM data
        const wavData = new Uint8Array(buffer);
        wavData.set(pcmBytes, 44);

        const blob = new Blob([wavData], { type: 'audio/wav' });
        return URL.createObjectURL(blob);
    }

    function showAudioResult(audioUrl) {
        currentAudioUrl = audioUrl;
        if (audioElement) {
            audioElement.pause();
            audioElement.src = '';
            audioElement = null;
        }
        isPlaying = false;

        // Check if it's PCM data and convert to WAV
        let finalAudioUrl = audioUrl;
        if (audioUrl.startsWith('data:audio/L16')) {
            try {
                const base64Match = audioUrl.match(/base64,(.+)$/);
                if (base64Match) {
                    const base64Data = base64Match[1];
                    finalAudioUrl = pcmToWav(base64Data);
                    console.log('Converted PCM to WAV');
                }
            } catch (e) {
                console.error('Error converting PCM to WAV:', e);
                showToast('Error converting audio format', 'error');
                return;
            }
        }

        audioElement = new Audio();
        audioElement.crossOrigin = 'anonymous';
        audioElement.preload = 'auto';
        audioElement.volume = parseFloat(ttsVolumeBar?.value || '1');
        audioElement.src = finalAudioUrl;

        audioElement.addEventListener('loadedmetadata', () => {
            if (ttsDuration) ttsDuration.textContent = formatTime(audioElement.duration);
        });

        audioElement.addEventListener('canplaythrough', () => {
            console.log('Audio ready to play');
        });

        audioElement.addEventListener('timeupdate', () => {
            if (!audioElement) return;
            const pct = (audioElement.currentTime / audioElement.duration) * 100;
            if (ttsSeekBar) ttsSeekBar.value = pct || 0;
            if (ttsCurrentTime) ttsCurrentTime.textContent = formatTime(audioElement.currentTime);
        });

        audioElement.addEventListener('ended', () => {
            isPlaying = false;
            setPlayIcon('play');
        });

        audioElement.addEventListener('error', (e) => {
            console.error('Audio error:', e, audioElement.error);
            const errorMsg = audioElement.error ? `Error code: ${audioElement.error.code}` : 'Error loading audio';
            showToast(errorMsg, 'error');
            isPlaying = false;
            setPlayIcon('play');
        });

        // Load the audio
        audioElement.load();

        if (resultContainer) {
            resultContainer.classList.remove('hidden');
            resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    if (ttsPlayBtn) {
        ttsPlayBtn.addEventListener('click', async () => {
            if (!audioElement) return;
            if (isPlaying) {
                audioElement.pause();
                isPlaying = false;
                setPlayIcon('play');
            } else {
                try {
                    await audioElement.play();
                    isPlaying = true;
                    setPlayIcon('pause');
                } catch (e) {
                    console.error('Audio play error:', e);
                    showToast('Gagal memutar audio', 'error');
                    isPlaying = false;
                }
            }
        });
    }

    if (ttsSeekBar) {
        ttsSeekBar.addEventListener('input', () => {
            if (!audioElement) return;
            audioElement.currentTime = (ttsSeekBar.value / 100) * audioElement.duration;
        });
    }

    if (ttsVolumeBar) {
        ttsVolumeBar.addEventListener('input', () => {
            if (audioElement) audioElement.volume = parseFloat(ttsVolumeBar.value);
        });
    }

    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    if (ttsSpeedBtn) {
        ttsSpeedBtn.addEventListener('click', () => {
            const idx = speeds.indexOf(playbackSpeed);
            playbackSpeed = speeds[(idx + 1) % speeds.length];
            ttsSpeedBtn.textContent = `${playbackSpeed}x`;
            if (audioElement) audioElement.playbackRate = playbackSpeed;
        });
    }

    if (ttsDownloadBtn) {
        ttsDownloadBtn.addEventListener('click', () => {
            if (!audioElement || !audioElement.src) return;
            const a = document.createElement('a');
            a.href = audioElement.src;
            a.download = `sulapfoto-tts-${Date.now()}.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }

    // ===================== CORE API FUNCTIONS =====================

    async function generateTTS({ text, voice, language, speed, pitch, instruction, mode }) {
        const btn = document.getElementById('tts-generate-btn');
        setButtonLoading(btn, true, 'Generating...');

        try {
            const config = await getApiConfig();
            const body = {
                text,
                voice_name: voice,
                language,
                speed,
                pitch,
                instruction,
                mode: mode || 'tts'
            };

            const response = await fetch(config.ttsEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...config.apiHeaders
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Server error ${response.status}`);
            }

            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('audio')) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                showAudioResult(url);
                showToast('Suara berhasil digenerate!', 'success');
            } else {
                const result = await response.json();
                if (result.audioUrl || result.audio_url) {
                    const audioUrl = result.audioUrl || result.audio_url;
                    showAudioResult(audioUrl);
                    showToast('Suara berhasil digenerate!', 'success');
                } else if (result.audioBase64 || result.audio_base64) {
                    const b64 = result.audioBase64 || result.audio_base64;
                    const audioUrl = `data:audio/mp3;base64,${b64}`;
                    showAudioResult(audioUrl);
                    showToast('Suara berhasil digenerate!', 'success');
                } else {
                    throw new Error(result.error || 'Format response tidak dikenal');
                }
            }
        } catch (e) {
            console.error('TTS generate error:', e);
            showToast(e.message || 'Gagal generate suara', 'error');
        } finally {
            setButtonLoading(btn, false);
        }
    }

    async function transcribeAudio(file, language) {
        const btn = document.getElementById('stt-transcribe-btn');
        setButtonLoading(btn, true, 'Mengekstrak teks dari audio...');

        try {
            const config = await getApiConfig();
            const chatEndpoint = `${config.baseUrlClean}/chat`;
            const langNote = language === 'id' ? ' Tulis hasil transkripsi dalam Bahasa Indonesia.' : ' Write the transcription in English.';

            const chatFd = new FormData();
            chatFd.append('prompt', 'Transkripsi semua yang diucapkan dalam audio ini secara persis kata per kata.' + langNote + ' Hanya tulis hasil transkripsinya saja, tanpa komentar atau penjelasan tambahan.');
            chatFd.append('images', file, file.name);

            const response = await fetch(chatEndpoint, {
                method: 'POST',
                headers: config.apiHeaders,
                body: chatFd
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Chat error ${response.status}`);
            }

            const result = await response.json();
            const text = (result.response || result.text || '').trim();
            if (text && sttResultText && sttResult) {
                sttResultText.textContent = text;
                sttResult.classList.remove('hidden');
                showToast('Transkripsi selesai!', 'success');
            } else {
                throw new Error('Tidak ada hasil transkripsi');
            }
        } catch (e) {
            console.error('STT error:', e);
            showToast(e.message || 'Gagal transkripsi', 'error');
        } finally {
            setButtonLoading(btn, false);
        }
    }

    async function voiceChange(file, voice) {
        const btn = document.getElementById('vc-generate-btn');
        setButtonLoading(btn, true, 'Mengekstrak teks dari audio...');

        try {
            const config = await getApiConfig();
            const chatEndpoint = `${config.baseUrlClean}/chat`;

            // Step 1: Extract text from audio via /chat
            const chatFd = new FormData();
            chatFd.append('prompt', 'Transkripsi semua yang diucapkan dalam audio ini secara persis kata per kata. Hanya tulis hasil transkripsinya saja, tanpa komentar atau penjelasan tambahan.');
            chatFd.append('images', file, file.name);

            const chatResp = await fetch(chatEndpoint, {
                method: 'POST',
                headers: config.apiHeaders,
                body: chatFd
            });
            if (!chatResp.ok) {
                const errData = await chatResp.json().catch(() => ({}));
                throw new Error(errData.error || `Chat error ${chatResp.status}`);
            }
            const chatData = await chatResp.json();
            const transcript = (chatData.response || chatData.text || '').trim();
            if (!transcript) throw new Error('Gagal mengekstrak teks dari audio');

            // Step 2: Re-generate with new voice via /tts
            setButtonLoading(btn, true, 'Mengubah ke suara baru...');
            const ttsResp = await fetch(config.ttsEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...config.apiHeaders },
                body: JSON.stringify({ text: transcript, voice_name: voice })
            });
            if (!ttsResp.ok) {
                const errData = await ttsResp.json().catch(() => ({}));
                throw new Error(errData.error || `TTS error ${ttsResp.status}`);
            }

            const contentType = ttsResp.headers.get('content-type') || '';
            if (contentType.includes('audio')) {
                showAudioResult(URL.createObjectURL(await ttsResp.blob()));
            } else {
                const result = await ttsResp.json();
                const audioUrl = result.audioUrl || result.audio_url || '';
                if (audioUrl) {
                    showAudioResult(audioUrl);
                } else if (result.audioBase64 || result.audio_base64) {
                    showAudioResult(`data:audio/mp3;base64,${result.audioBase64 || result.audio_base64}`);
                } else {
                    throw new Error(result.error || 'Format response tidak dikenal');
                }
            }
            showToast('Suara berhasil diubah!', 'success');
        } catch (e) {
            console.error('Voice change error:', e);
            showToast(e.message || 'Gagal mengubah suara', 'error');
        } finally {
            setButtonLoading(btn, false);
        }
    }

    async function imageToSpeech(imageFile, style, voice, language) {
        const btn = document.getElementById('i2s-generate-btn');
        setButtonLoading(btn, true, 'Menganalisa gambar...');

        try {
            const config = await getApiConfig();
            const chatEndpoint = `${config.baseUrlClean}/chat`;

            const styleInstructions = {
                descriptive: 'Deskripsikan gambar ini secara detail dan jelas, tulis sebagai narasi yang enak dibaca.',
                storytelling: 'Buat narasi cerita yang menarik berdasarkan gambar ini.',
                news: 'Buat narasi gaya pembaca berita berdasarkan gambar ini.',
                educational: 'Jelaskan gambar ini secara edukatif dan informatif.',
                poetic: 'Buat narasi puitis dan indah yang menggambarkan gambar ini.'
            };
            const langNote = language === 'id' ? ' Tulis dalam Bahasa Indonesia.' : ' Write in English.';
            const chatPrompt = (styleInstructions[style] || styleInstructions.descriptive) + langNote + ' Hanya tulis narasinya saja, tanpa penjelasan tambahan.';

            // Step 1: Get narration from /chat
            const chatFd = new FormData();
            chatFd.append('prompt', chatPrompt);
            chatFd.append('images', imageFile, imageFile.name);

            const chatResp = await fetch(chatEndpoint, {
                method: 'POST',
                headers: config.apiHeaders,
                body: chatFd
            });
            if (!chatResp.ok) {
                const errData = await chatResp.json().catch(() => ({}));
                throw new Error(errData.error || `Chat error ${chatResp.status}`);
            }
            const chatData = await chatResp.json();
            const narration = (chatData.response || chatData.text || '').trim();
            if (!narration) throw new Error('Gagal mendapatkan narasi dari AI');

            // Step 2: Send narration to /tts
            setButtonLoading(btn, true, 'Mengubah ke suara...');
            const ttsResp = await fetch(config.ttsEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...config.apiHeaders },
                body: JSON.stringify({ text: narration, voice_name: voice, language })
            });
            if (!ttsResp.ok) {
                const errData = await ttsResp.json().catch(() => ({}));
                throw new Error(errData.error || `TTS error ${ttsResp.status}`);
            }

            const contentType = ttsResp.headers.get('content-type') || '';
            if (contentType.includes('audio')) {
                showAudioResult(URL.createObjectURL(await ttsResp.blob()));
            } else {
                const result = await ttsResp.json();
                const audioUrl = result.audioUrl || result.audio_url || '';
                if (audioUrl) {
                    showAudioResult(audioUrl);
                } else if (result.audioBase64 || result.audio_base64) {
                    showAudioResult(`data:audio/mp3;base64,${result.audioBase64 || result.audio_base64}`);
                } else {
                    throw new Error(result.error || 'Format response tidak dikenal');
                }
            }
            showToast('Narasi suara berhasil dibuat!', 'success');
        } catch (e) {
            console.error('Image to speech error:', e);
            showToast(e.message || 'Gagal membuat narasi', 'error');
        } finally {
            setButtonLoading(btn, false);
        }
    }

    async function generatePromo(productName, description, style, voice, duration, imageFile) {
        const btn = document.getElementById('promo-generate-btn');
        setButtonLoading(btn, true, 'Membuat script promosi...');

        try {
            const config = await getApiConfig();
            const chatEndpoint = `${config.baseUrlClean}/chat`;
            const durationSec = parseInt(duration);
            const wordsEstimate = durationSec <= 15 ? 50 : durationSec <= 30 ? 100 : 200;

            const stylePrompt = promoStyles[style] || promoStyles.energetic;
            const promoPrompt = `${stylePrompt}\n\nProduk: ${productName}\nDeskripsi: ${description || 'Tidak ada deskripsi tambahan'}\n\nBuat script promosi audio sekitar ${wordsEstimate} kata untuk durasi ${durationSec} detik. Langsung tulis scriptnya saja tanpa penjelasan.`;

            // Step 1: Get promo script from /chat
            const chatFd = new FormData();
            chatFd.append('prompt', promoPrompt);
            if (imageFile) chatFd.append('images', imageFile, imageFile.name);

            const chatResp = await fetch(chatEndpoint, {
                method: 'POST',
                headers: config.apiHeaders,
                body: chatFd
            });
            if (!chatResp.ok) {
                const errData = await chatResp.json().catch(() => ({}));
                throw new Error(errData.error || `Chat error ${chatResp.status}`);
            }
            const chatData = await chatResp.json();
            const script = (chatData.response || chatData.text || '').trim();
            if (!script) throw new Error('Gagal mendapatkan script promosi dari AI');

            // Show script
            const promoScriptResult = document.getElementById('promo-script-result');
            const promoScriptText = document.getElementById('promo-script-text');
            if (promoScriptResult && promoScriptText) {
                promoScriptText.textContent = script;
                promoScriptResult.classList.remove('hidden');
            }

            // Step 2: Send script to /tts
            setButtonLoading(btn, true, 'Mengubah ke suara...');
            const ttsResp = await fetch(config.ttsEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...config.apiHeaders },
                body: JSON.stringify({ text: script, voice_name: voice, language: 'id' })
            });
            if (!ttsResp.ok) {
                const errData = await ttsResp.json().catch(() => ({}));
                throw new Error(errData.error || `TTS error ${ttsResp.status}`);
            }

            const contentType = ttsResp.headers.get('content-type') || '';
            if (contentType.includes('audio')) {
                showAudioResult(URL.createObjectURL(await ttsResp.blob()));
            } else {
                const result = await ttsResp.json();
                const audioUrl = result.audioUrl || result.audio_url || '';
                if (audioUrl) {
                    showAudioResult(audioUrl);
                } else if (result.audioBase64 || result.audio_base64) {
                    showAudioResult(`data:audio/mp3;base64,${result.audioBase64 || result.audio_base64}`);
                } else {
                    throw new Error(result.error || 'Format response tidak dikenal');
                }
            }
            showToast('Audio promosi berhasil dibuat!', 'success');
        } catch (e) {
            console.error('Promo generate error:', e);
            showToast(e.message || 'Gagal membuat promosi', 'error');
        } finally {
            setButtonLoading(btn, false);
        }
    }

    // ===================== HELPERS =====================
    function showAudioPreview(prefix, file) {
        const preview = document.getElementById(`${prefix}-audio-preview`);
        const nameEl = document.getElementById(`${prefix}-file-name`);
        const sizeEl = document.getElementById(`${prefix}-file-size`);
        if (!preview || !nameEl || !sizeEl) return;
        if (preview) preview.classList.remove('hidden');
        if (nameEl) nameEl.textContent = file.name;
        if (sizeEl) sizeEl.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    }

    function showImagePreview(prefix, file) {
        const preview = document.getElementById(`${prefix}-image-preview`);
        const img = document.getElementById(`${prefix}-preview-img`);
        if (!preview || !img) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                const base64 = result.split(',')[1] || result;
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function setButtonLoading(btn, loading, text) {
        if (!btn) return;
        if (loading) {
            btn.disabled = true;
            btn._origHTML = btn.innerHTML;
            btn.innerHTML = `<svg class="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg><span>${text || 'Memproses...'}</span>`;
        } else {
            btn.disabled = false;
            if (btn._origHTML) btn.innerHTML = btn._origHTML;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    function showToast(message, type) {
        if (typeof window.showServerToast === 'function') {
            const iconMap = {
                success: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
                error: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-400"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
            };
            window.showServerToast(message, null, { icon: iconMap[type] || '' });
        }
    }

    function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }
});
