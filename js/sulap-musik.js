window.initSulapMusik = function({
    document,
    setupOptionButtons,
    lucide,
    getApiKey,
    getJwt,
    BASE_URL,
    getApiErrorMessage,
    doneSound,
    errorSound
}) {
    // DOM Elements
    const modeOptions = document.getElementById('sm-mode-options');
    const descriptionSection = document.getElementById('sm-description-section');
    const lyricsSection = document.getElementById('sm-lyrics-section');
    const descriptionInput = document.getElementById('sm-description-input');
    const lyricsInput = document.getElementById('sm-lyrics-input');
    const instrumentalToggle = document.getElementById('sm-instrumental-toggle');
    const descriptionHint = document.getElementById('sm-description-hint');
    const tagsInput = document.getElementById('sm-tags-input');
    const titleInput = document.getElementById('sm-title-input');
    const genreSuggestions = document.getElementById('sm-genre-suggestions');
    const genreSection = tagsInput?.closest('div').parentElement; // Get the Genre/Style section container
    const titleSection = titleInput?.closest('div').parentElement; // Get the Judul Musik section container
    const generateBtn = document.getElementById('sm-generate-btn');
    const generateBtnText = document.getElementById('sm-generate-btn-text');
    const resultsContainer = document.getElementById('sm-results-container');
    const resultsGrid = document.getElementById('sm-results-grid');
    const resultsPlaceholder = document.getElementById('sm-results-placeholder');
    const progressContainer = document.getElementById('sm-progress-container');
    const clearResultsBtn = document.getElementById('sm-clear-results');
    
    // Server Status Elements
    const serverStatusContainer = document.getElementById('sm-server-status');
    const statusText = document.getElementById('sm-status-text');
    const statusDot = document.getElementById('sm-status-dot');

    if (!generateBtn) return;
    
    // Server Status Checker
    let serverOnline = false;
    let statusCheckInterval = null;
    
    const updateServerStatus = (online) => {
        serverOnline = online;
        
        if (online) {
            // Online state
            serverStatusContainer.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300 bg-green-100 text-green-700 border border-green-200';
            statusDot.className = 'inline-flex rounded-full h-2 w-2 bg-green-500';
            statusText.textContent = 'Server Online';
            if (generateBtn) generateBtn.disabled = false;
        } else {
            // Offline state
            serverStatusContainer.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300 bg-red-100 text-red-700 border border-red-200';
            statusDot.className = 'inline-flex rounded-full h-2 w-2 bg-red-500';
            statusText.textContent = 'Server Offline';
            if (generateBtn) generateBtn.disabled = true;
        }
    };
    
    // Status comes from config polling (sulap:musik-status event) — no separate HTTP fetch
    if (typeof window.SULAP_MUSIK_ONLINE === 'boolean') {
        updateServerStatus(window.SULAP_MUSIK_ONLINE);
    }
    document.addEventListener('sulap:musik-status', (e) => {
        updateServerStatus(!!(e.detail && e.detail.online));
    });

    let isGenerating = false;
    let currentMode = 'description';
    let pollingIntervals = new Map(); // Track polling for each clip

    // Setup mode toggle - manual implementation for single select
    if (modeOptions) {
        const modeButtons = modeOptions.querySelectorAll('.option-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove selected from all buttons
                modeButtons.forEach(b => b.classList.remove('selected'));
                // Add selected to clicked button
                btn.classList.add('selected');
                
                // Get mode value
                currentMode = btn.dataset.value;
                
                // Toggle sections
                if (currentMode === 'description') {
                    descriptionSection.classList.remove('hidden');
                    lyricsSection.classList.add('hidden');
                    // Hide Genre and Title sections in description mode
                    if (genreSection) genreSection.classList.add('hidden');
                    if (titleSection) titleSection.classList.add('hidden');
                } else if (currentMode === 'lyrics') {
                    descriptionSection.classList.add('hidden');
                    lyricsSection.classList.remove('hidden');
                    // Show Genre and Title sections in lyrics mode
                    if (genreSection) genreSection.classList.remove('hidden');
                    if (titleSection) titleSection.classList.remove('hidden');
                }
                
                // Re-render icons
                if (lucide) lucide.createIcons();
            });
        });
    }

    // Initialize: Hide Genre and Title sections on page load (description mode is default)
    if (genreSection) genreSection.classList.add('hidden');
    if (titleSection) titleSection.classList.add('hidden');

    // Instrumental toggle handler
    if (instrumentalToggle && descriptionHint) {
        instrumentalToggle.addEventListener('change', () => {
            if (instrumentalToggle.checked) {
                descriptionHint.textContent = 'Mode instrumental: Musik tanpa vokal. Deskripsi akan digunakan untuk style musik.';
                descriptionInput.placeholder = 'Contoh: Musik piano klasik yang menenangkan dan penuh emosi';
            } else {
                descriptionHint.textContent = 'AI akan membuat lirik otomatis berdasarkan deskripsi Anda';
                descriptionInput.placeholder = 'Contoh: Lagu pop romantis dengan melodi ceria dan instrumen gitar akustik';
            }
        });
    }

    // Genre suggestions click handler
    if (genreSuggestions) {
        genreSuggestions.addEventListener('click', (e) => {
            const tag = e.target.closest('.genre-tag');
            if (tag) {
                const tags = tag.dataset.tags;
                tagsInput.value = tags;
            }
        });
    }

    // Download helper function
    window.downloadAudio = async function(url, filename) {
        try {
            console.log('[Download] Starting:', filename);
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            window.URL.revokeObjectURL(blobUrl);
            console.log('[Download] Success:', filename);
        } catch (error) {
            console.error('[Download] Error:', error);
            alert('Gagal mendownload file. Silakan coba lagi.');
        }
    };

    // Clear results
    if (clearResultsBtn) {
        clearResultsBtn.addEventListener('click', () => {
            resultsGrid.innerHTML = '';
            resultsContainer.classList.add('hidden');
            resultsPlaceholder.classList.remove('hidden');
            // Stop all polling
            pollingIntervals.forEach(interval => clearInterval(interval));
            pollingIntervals.clear();
        });
    }

    // Show progress
    function showProgress(message, status = 'processing') {
        progressContainer.classList.remove('hidden');
        const statusColor = status === 'complete' ? 'text-green-600' : 
                          status === 'error' ? 'text-red-600' : 'text-blue-600';
        const icon = status === 'complete' ? 'check-circle' : 
                    status === 'error' ? 'alert-circle' : 'loader';
        
        progressContainer.innerHTML = `
            <div class="bg-white rounded-2xl p-6 shadow-md border border-slate-200">
                <div class="flex items-center gap-3 mb-3">
                    <i data-lucide="${icon}" class="w-5 h-5 ${statusColor} ${status === 'processing' ? 'animate-spin' : ''}"></i>
                    <h4 class="font-semibold text-slate-800">${message}</h4>
                </div>
                ${status === 'processing' ? `
                    <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-pulse" style="width: 60%"></div>
                    </div>
                ` : ''}
            </div>
        `;
        lucide.createIcons();
    }

    function hideProgress() {
        progressContainer.classList.add('hidden');
        progressContainer.innerHTML = '';
    }

    // Create music card
    function createMusicCard(clip, index) {
        const card = document.createElement('div');
        card.className = 'music-card bg-gradient-to-br from-slate-50 to-white rounded-2xl p-5 shadow-md border border-slate-200';
        card.dataset.clipId = clip.id;
        
        const statusBadge = getStatusBadge(clip.status);
        const duration = clip.duration ? `${Math.floor(clip.duration)}s` : '-';
        
        const imageUrl = clip.image_url || clip.image_large_url || '';
        const audioUrl = clip.audio_url || '';
        
        card.innerHTML = `
            <div class="flex flex-col gap-3">
                <div class="flex items-start gap-4">
                    <div class="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                        ${imageUrl ? `
                            <img src="${imageUrl}" alt="Music Cover" class="w-full h-full object-cover">
                        ` : `
                            <div class="w-full h-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                <i data-lucide="music" class="w-8 h-8 text-white"></i>
                            </div>
                        `}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-2 mb-1">
                            <h4 class="font-medium text-sm text-slate-800 truncate">${clip.title && clip.title.toLowerCase() !== 'good2' ? clip.title : 'Tanpa Judul'}</h4>
                            ${statusBadge}
                        </div>
                        <div class="flex items-center gap-2 text-xs text-slate-500">
                            <span class="flex items-center gap-1">
                                <i data-lucide="clock" class="w-3 h-3"></i>
                                ${duration}
                            </span>
                            <span class="flex items-center gap-1">
                                <i data-lucide="calendar" class="w-3 h-3"></i>
                                ${new Date(clip.created_at).toLocaleDateString('id-ID')}
                            </span>
                        </div>
                    </div>
                </div>
                
                <!-- Audio Player Full Width -->
                <div class="audio-player-container"></div>
                
                <!-- Download buttons -->
                <div class="download-buttons flex flex-wrap gap-2"></div>
            </div>
        `;
        
        lucide.createIcons();
        return card;
    }

    function getStatusBadge(status) {
        const badges = {
            'submitted': '<span class="status-badge text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Menunggu</span>',
            'queued': '<span class="status-badge text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Antrian</span>',
            'streaming': '<span class="status-badge text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">onproses..</span>',
            'complete': '<span class="status-badge text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Selesai</span>',
            'error': '<span class="status-badge text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Error</span>'
        };
        return badges[status] || badges.submitted;
    }

    // Update card with URLs
    function updateMusicCard(clipId, clipData) {
        const card = document.querySelector(`.music-card[data-clip-id="${clipId}"]`);
        if (!card) return;

        // Update image if available
        const imageContainer = card.querySelector('.w-16.h-16.rounded-xl');
        const imageUrl = clipData.image_url || clipData.image_large_url || '';
        
        if (imageContainer && imageUrl) {
            const existingImg = imageContainer.querySelector('img');
            if (!existingImg) {
                imageContainer.innerHTML = `
                    <img src="${imageUrl}" alt="Music Cover" class="w-full h-full object-cover">
                `;
            } else if (existingImg.src !== imageUrl) {
                existingImg.src = imageUrl;
            }
        }

        // Update status badge
        const statusBadge = getStatusBadge(clipData.status);
        const displayTitle = clipData.title && clipData.title.toLowerCase() !== 'good2' ? clipData.title : 'Tanpa Judul';
        card.querySelector('.flex.items-start.justify-between').innerHTML = `
            <h4 class="font-medium text-sm text-slate-800 truncate">${displayTitle}</h4>
            ${statusBadge}
        `;

        // Update duration
        if (clipData.duration) {
            const durationEl = card.querySelector('.flex.items-center.gap-3 span:first-child');
            if (durationEl) {
                durationEl.innerHTML = `
                    <i data-lucide="clock" class="w-3 h-3"></i>
                    ${Math.floor(clipData.duration)}s
                `;
            }
        }

        // Update audio player (preserve playback state)
        const playerContainer = card.querySelector('.audio-player-container');
        const audioUrl = clipData.audio_url_streaming || clipData.audio_url_final || clipData.audio_url;
        
        if (playerContainer && audioUrl) {
            const existingAudio = playerContainer.querySelector('audio');
            const existingSrc = existingAudio?.querySelector('source')?.src;
            
            // Only recreate player if URL changed or doesn't exist
            if (!existingAudio || existingSrc !== audioUrl) {
                // Save playback state if exists
                const wasPlaying = existingAudio && !existingAudio.paused;
                const currentTime = existingAudio?.currentTime || 0;
                
                playerContainer.innerHTML = `
                    <audio controls class="w-full rounded-lg" style="height: 40px;">
                        <source src="${audioUrl}" type="audio/mpeg">
                        Browser Anda tidak mendukung audio player.
                    </audio>
                `;
                
                // Restore playback state if was playing
                const newAudio = playerContainer.querySelector('audio');
                if (newAudio && wasPlaying && existingSrc === audioUrl) {
                    newAudio.currentTime = currentTime;
                    newAudio.play().catch(() => {});
                }
            }
        }

        // Update download buttons
        const downloadContainer = card.querySelector('.download-buttons');
        if (downloadContainer) {
            let buttons = '';
            
            if (clipData.audio_url_final) {
                const filename = clipData.title ? `${clipData.title.replace(/[^a-z0-9]/gi, '_')}.mp3` : 'music.mp3';
                buttons += `
                    <button onclick="window.downloadAudio('${clipData.audio_url_final}', '${filename}')" 
                        class="download-btn text-xs px-2.5 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 flex items-center gap-1.5">
                        <i data-lucide="download" class="w-3 h-3"></i>
                        Download (MP3)
                    </button>
                `;
            }
            
            if (clipData.video_url) {
                const filename = clipData.title ? `${clipData.title.replace(/[^a-z0-9]/gi, '_')}.mp4` : 'video.mp4';
                buttons += `
                    <button onclick="window.downloadAudio('${clipData.video_url}', '${filename}')" 
                        class="download-btn text-xs px-2.5 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-1.5">
                        <i data-lucide="video" class="w-3 h-3"></i>
                        Video
                    </button>
                `;
            }
            
            downloadContainer.innerHTML = buttons;
        }

        lucide.createIcons();
    }

    // Poll status for clips
    async function pollClipStatus(clipIds) {
        try {
            // Get JWT token
            let token = null;
            if (typeof window.ensureFrontendToken === 'function') {
                try {
                    token = await window.ensureFrontendToken(BASE_URL);
                } catch (e) {
                    console.warn('Failed to get frontend token:', e);
                }
            }
            
            const headers = {
                'Content-Type': 'application/json',
                'X-API-Key': getApiKey()
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${BASE_URL}/suno`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ clip_ids: clipIds })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success && data.clips) {
                let completedCount = 0;
                let errorCount = 0;
                let streamingCount = 0;
                
                data.clips.forEach(clip => {
                    updateMusicCard(clip.id, clip);
                    
                    // Count status
                    if (clip.status === 'complete') {
                        completedCount++;
                    } else if (clip.status === 'error') {
                        errorCount++;
                    } else if (clip.status === 'streaming') {
                        streamingCount++;
                    }
                });

                const totalClips = data.clips.length;
                const allComplete = completedCount === totalClips;
                const anyError = errorCount > 0;

                console.log(`[Polling] Complete: ${completedCount}/${totalClips}, Streaming: ${streamingCount}, Error: ${errorCount}, Clips:`, data.clips.map(c => `${c.id.substring(0,8)}:${c.status}`));

                // Stop polling ONLY if ALL clips complete or any error
                if (allComplete || anyError) {
                    console.log('[Polling] Stopping - All complete or error detected');
                    clipIds.forEach(id => {
                        const interval = pollingIntervals.get(id);
                        if (interval) {
                            clearInterval(interval);
                            pollingIntervals.delete(id);
                        }
                    });
                    
                    hideProgress();
                    
                    // Re-enable generate button
                    generateBtn.disabled = false;
                    generateBtnText.textContent = 'Buat Musik';
                    isGenerating = false;
                    
                    if (allComplete) {
                        if (doneSound && typeof doneSound.play === 'function') {
                            try {
                                const playPromise = doneSound.play();
                                if (playPromise && typeof playPromise.catch === 'function') {
                                    playPromise.catch(() => {});
                                }
                            } catch (e) {
                                // Ignore play errors
                            }
                        }
                        showProgress('Semua musik berhasil dibuat!', 'complete');
                        setTimeout(hideProgress, 3000);
                    }
                } else {
                    console.log('[Polling] Continuing - Still processing');
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }

    // Generate music
    async function generateMusic() {
        // Check server status first
        if (!serverOnline) {
            showProgress('Server Sulap Musik sedang offline. Silakan coba lagi nanti.', 'error');
            setTimeout(hideProgress, 5000);
            return;
        }
        
        let content, payload;
        const isInstrumental = instrumentalToggle && instrumentalToggle.checked;
        
        if (currentMode === 'description') {
            content = descriptionInput.value.trim();
            if (!content && !isInstrumental) {
                showProgress('Mohon masukkan deskripsi musik', 'error');
                setTimeout(hideProgress, 3000);
                return;
            }
            
            payload = { 
                prompt: content || 'instrumental music',
                make_instrumental: isInstrumental
            };
        } else if (currentMode === 'lyrics') {
            content = lyricsInput.value.trim();
            if (!content) {
                showProgress('Mohon masukkan lirik lagu', 'error');
                setTimeout(hideProgress, 3000);
                return;
            }
            payload = { lyrics: content };
        }

        const tags = tagsInput.value.trim() || 'pop';
        const customTitle = titleInput ? titleInput.value.trim() : '';

        isGenerating = true;
        generateBtn.disabled = true;
        generateBtnText.textContent = 'Membuat Musik...';

        try {
            showProgress('Memulai generasi musik...', 'processing');

            // Get JWT token
            let token = null;
            if (typeof window.ensureFrontendToken === 'function') {
                try {
                    token = await window.ensureFrontendToken(BASE_URL);
                } catch (e) {
                    console.warn('Failed to get frontend token:', e);
                }
            }
            
            const headers = {
                'Content-Type': 'application/json',
                'X-API-Key': getApiKey()
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            payload.tags = tags;
            
            // Add custom title if provided
            if (customTitle) {
                payload.title = customTitle;
            }

            const response = await fetch(`${BASE_URL}/suno`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Gagal membuat musik');
            }

            // Show results
            resultsPlaceholder.classList.add('hidden');
            resultsContainer.classList.remove('hidden');

            // Add cards for each clip
            if (data.clips && data.clips.length > 0) {
                data.clips.forEach((clip, index) => {
                    const card = createMusicCard(clip, resultsGrid.children.length + index);
                    resultsGrid.insertBefore(card, resultsGrid.firstChild);
                });

                // Start polling for status
                showProgress('Menunggu musik selesai diproses... (20-60 detik)', 'processing');
                
                const clipIds = data.clipIds || data.clips.map(c => c.id);
                
                // Poll immediately
                pollClipStatus(clipIds);
                
                // Then poll every 5 seconds
                const interval = setInterval(() => {
                    pollClipStatus(clipIds);
                }, 5000);
                
                // Store interval for cleanup
                clipIds.forEach(id => pollingIntervals.set(id, interval));
                
                // Auto-stop polling after 2 minutes
                setTimeout(() => {
                    clearInterval(interval);
                    clipIds.forEach(id => pollingIntervals.delete(id));
                    hideProgress();
                }, 120000);
            }

        } catch (error) {
            console.error('Generate error:', error);
            hideProgress();
            showProgress(getApiErrorMessage(error.message), 'error');
            setTimeout(hideProgress, 5000);
            if (errorSound && typeof errorSound.play === 'function') {
                try {
                    const playPromise = errorSound.play();
                    if (playPromise && typeof playPromise.catch === 'function') {
                        playPromise.catch(() => {});
                    }
                } catch (e) {
                    // Ignore play errors
                }
            }
        } finally {
            isGenerating = false;
            generateBtn.disabled = false;
            generateBtnText.textContent = 'Buat Musik';
        }
    }

    // Event listeners
    generateBtn.addEventListener('click', generateMusic);

    // Allow Enter key in description (not lyrics)
    descriptionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            generateMusic();
        }
    });
};
