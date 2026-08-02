(function () {
    const MP_SONGS = [
        { title: 'Sulap Foto - Semua Bisa', file: 'Sulap Foto — Semua Bisa.mp3' },
        { title: 'Sulap Foto - Idul Fitri', file: 'Sulap Foto - Idul Fitri.mp3' },
        { title: 'Sulap Foto - Original', file: 'Sulap Foto - Original.mp3' },
        { title: 'Sulap Foto - Penuh Berkah', file: 'Sulap Foto - Penuh Berkah.mp3' },
        { title: 'Sulap Foto - Ramadhan Cuan', file: 'Sulap Foto - Ramadhan Cuan.mp3' },
    ];

    function initMusicPlayer() {
        const playBtn = document.getElementById('mp-play-btn');
        if (!playBtn) return;

        const prevBtn = document.getElementById('mp-prev-btn');
        const nextBtn = document.getElementById('mp-next-btn');
        const shuffleBtn = document.getElementById('mp-shuffle-btn');
        const progressEl = document.getElementById('mp-progress');
        const currentTimeEl = document.getElementById('mp-current-time');
        const durationEl = document.getElementById('mp-duration');
        const songTitleEl = document.getElementById('mp-song-title');
        const subtitleEl = document.getElementById('mp-subtitle');
        const discIcon = document.getElementById('mp-disc-icon');

        const audio = new Audio();
        let currentIndex = 0;
        let isPlaying = false;
        let isShuffle = true;
        let shuffleOrder = [];
        let shufflePos = 0;
        let pendingAutoPlay = false;

        function tryAutoPlay() {
            if (!pendingAutoPlay) return;
            pendingAutoPlay = false;
            ['click', 'keydown', 'touchstart', 'scroll'].forEach(e => document.removeEventListener(e, tryAutoPlay));
            audio.play().then(() => { isPlaying = true; updatePlayBtn(); }).catch(() => {});
        }

        if (!document.getElementById('mp-anim-style')) {
            const s = document.createElement('style');
            s.id = 'mp-anim-style';
            s.textContent = `
                #mp-disc-icon.playing { animation: mp-spin 4s linear infinite; }
                @keyframes mp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                #mp-progress::-webkit-slider-thumb { appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #14b8a6; cursor: pointer; }
                #mp-progress::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: #14b8a6; cursor: pointer; border: none; }
            `;
            document.head.appendChild(s);
        }

        function generateShuffle() {
            shuffleOrder = MP_SONGS.map((_, i) => i).sort(() => Math.random() - 0.5);
            shufflePos = 0;
        }
        generateShuffle();

        function fmt(s) {
            if (!s || isNaN(s)) return '0:00';
            const m = Math.floor(s / 60);
            const sec = String(Math.floor(s % 60)).padStart(2, '0');
            return `${m}:${sec}`;
        }

        function updatePlayBtn() {
            playBtn.innerHTML = isPlaying
                ? `<i data-lucide="pause" class="w-5 h-5"></i>`
                : `<i data-lucide="play" class="w-5 h-5 ml-0.5"></i>`;
            if (window.lucide) window.lucide.createIcons();
            if (discIcon) discIcon.classList.toggle('playing', isPlaying);
        }

        function loadSong(index, autoPlay) {
            currentIndex = index;
            audio.src = `/assets/${MP_SONGS[index].file}`;
            if (songTitleEl) songTitleEl.textContent = MP_SONGS[index].title;
            if (currentTimeEl) currentTimeEl.textContent = '0:00';
            if (durationEl) durationEl.textContent = '0:00';
            if (progressEl) progressEl.value = 0;
            audio.load();
            if (autoPlay) {
                audio.addEventListener('canplay', function handler() {
                    audio.removeEventListener('canplay', handler);
                    audio.play().then(() => {
                        isPlaying = true;
                        updatePlayBtn();
                    }).catch(() => {
                        pendingAutoPlay = true;
                        ['click', 'keydown', 'touchstart', 'scroll'].forEach(e =>
                            document.addEventListener(e, tryAutoPlay, { once: true })
                        );
                    });
                }, { once: true });
            }
        }

        function playNext() {
            if (isShuffle) {
                shufflePos = (shufflePos + 1) % shuffleOrder.length;
                loadSong(shuffleOrder[shufflePos], isPlaying);
            } else {
                loadSong((currentIndex + 1) % MP_SONGS.length, isPlaying);
            }
        }

        function playPrev() {
            if (audio.currentTime > 3) {
                audio.currentTime = 0;
                return;
            }
            if (isShuffle) {
                shufflePos = (shufflePos - 1 + shuffleOrder.length) % shuffleOrder.length;
                loadSong(shuffleOrder[shufflePos], isPlaying);
            } else {
                loadSong((currentIndex - 1 + MP_SONGS.length) % MP_SONGS.length, isPlaying);
            }
        }

        const shouldAutoPlay = localStorage.getItem('mp_user_stopped') !== '1';
        shufflePos = shuffleOrder.indexOf(0);
        if (shufflePos < 0) shufflePos = 0;
        loadSong(0, shouldAutoPlay);

        playBtn.addEventListener('click', () => {
            if (isPlaying) {
                audio.pause();
                isPlaying = false;
                updatePlayBtn();
                localStorage.setItem('mp_user_stopped', '1');
            } else {
                audio.play().then(() => {
                    isPlaying = true;
                    updatePlayBtn();
                    localStorage.removeItem('mp_user_stopped');
                }).catch(() => {});
            }
        });

        nextBtn?.addEventListener('click', playNext);
        prevBtn?.addEventListener('click', playPrev);

        shuffleBtn?.addEventListener('click', () => {
            isShuffle = !isShuffle;
            if (isShuffle) generateShuffle();
            shuffleBtn.classList.toggle('text-teal-400', isShuffle);
            shuffleBtn.classList.toggle('text-white/40', !isShuffle);
            if (subtitleEl) subtitleEl.textContent = `5 lagu · ${isShuffle ? 'Mode acak aktif' : 'Urutan normal'}`;
        });

        progressEl?.addEventListener('input', (e) => {
            if (audio.duration) audio.currentTime = (e.target.value / 100) * audio.duration;
        });

        audio.addEventListener('timeupdate', () => {
            if (!audio.duration) return;
            if (progressEl) progressEl.value = (audio.currentTime / audio.duration) * 100;
            if (currentTimeEl) currentTimeEl.textContent = fmt(audio.currentTime);
        });

        audio.addEventListener('loadedmetadata', () => {
            if (durationEl) durationEl.textContent = fmt(audio.duration);
        });

        audio.addEventListener('ended', () => {
            isPlaying = false;
            playNext();
        });

        audio.addEventListener('play', () => {
            localStorage.removeItem('mp_user_stopped');
        });
        audio.addEventListener('pause', () => {
            if (!audio.ended) localStorage.setItem('mp_user_stopped', '1');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMusicPlayer);
    } else {
        initMusicPlayer();
    }
})();
