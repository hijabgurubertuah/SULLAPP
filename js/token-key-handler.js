// Token Key Toggle Handler
document.addEventListener('DOMContentLoaded', function() {
    const tokenKeyToggle = document.getElementById('token-key-toggle');
    if (!tokenKeyToggle) return;
    
    // Load saved state
    const savedState = localStorage.getItem('token_key_enabled');
    if (savedState === 'true') {
        tokenKeyToggle.checked = true;
    }

    // Handle toggle change
    tokenKeyToggle.addEventListener('change', function() {
        const isEnabled = this.checked;
        localStorage.setItem('token_key_enabled', isEnabled);

        if (isEnabled) {
            // Show token input popup using existing modal system with small delay
            setTimeout(() => showTokenKeyPopup(), 100);
        } else {
            // Don't clear token - keep it in localStorage for next time
            if (window.showServerToast) {
                window.showServerToast("Token Key dinonaktifkan", null, { 
                    icon: '<i data-lucide="key" class="w-4 h-4 text-yellow-500"></i>' 
                });
            }
        }
    });

    function showTokenKeyPopup() {
        const modal = document.getElementById('universal-modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');
        const closeBtn = document.getElementById('close-modal-btn');
        const modalContent = modal ? modal.querySelector('.modal-content') : null;

        if (!modal || !title || !body || !modalContent) return;

        // Adapt modal theme to light
        modalContent.classList.add('bg-white', 'text-slate-900');
        if (closeBtn) closeBtn.classList.replace('text-slate-400', 'text-slate-500');
        if (closeBtn) closeBtn.classList.replace('hover:text-white', 'hover:text-slate-900');

        title.textContent = 'Set Token Key';
        const currentToken = localStorage.getItem('sulapfoto_token_key') || '';
        
        body.innerHTML = `
            <div class="space-y-6">
                <!-- Importance Section -->
                <div class="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 p-4 rounded-xl text-xs flex items-start gap-3">
                    <i data-lucide="alert-triangle" class="w-5 h-5 flex-shrink-0"></i>
                    <div>
                        <p class="font-bold mb-1">Penting: Perubahan Algoritma Google</p>
                        <p class="leading-relaxed text-slate-600 dark:text-slate-400 mb-3">Google baru saja memperbarui algoritma keamanannya. <b>Token Key</b> ini sangat diperlukan agar proses generate gambar tetap lancar dan tidak terhambat oleh sistem baru tersebut.</p>
                        <a href="https://t.me/+Hk6V3kAX8O0zMDBl" target="_blank" class="inline-flex items-center gap-2 bg-[#229ED9] hover:bg-[#1e8ub1] text-white px-3 py-1.5 rounded-lg transition-colors font-bold shadow-sm">
                            <i data-lucide="send" class="w-3.5 h-3.5"></i> Join Group Telegram
                        </a>
                    </div>
                </div>

                <!-- Tutorial Section -->
                <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                    <h4 class="text-teal-600 dark:text-teal-400 font-semibold mb-3 text-sm flex items-center gap-2">
                        <i data-lucide="book-open" class="w-4 h-4"></i> Cara Mendapatkan Token
                    </h4>
                    <ol class="list-decimal list-outside ml-4 space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        <li>
                            Unduh aplikasi Token Manager 2.0 sesuai perangkat Anda di bawah ini.
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 mb-2">
                                <a href="https://drive.google.com/file/d/1ZB3Oy1F7dBCxSRJUYnYmjX5Xh5Zbpsyk/view?usp=sharing" target="_blank" class="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white py-2 px-3 rounded-lg text-xs font-medium transition-colors border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500">
                                    <i data-lucide="laptop" class="w-3.5 h-3.5"></i> Mac
                                </a>
                                <a href="https://drive.google.com/file/d/1kUkSo37Cvd8_obN-mIjpZ_kx5-6l1xhN/view?usp=sharing" target="_blank" class="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white py-2 px-3 rounded-lg text-xs font-medium transition-colors border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500">
                                    <i data-lucide="monitor" class="w-3.5 h-3.5"></i> Windows
                                </a>
                                <a href="https://drive.google.com/file/d/17twFGZ6z9G2rAV2SjbAZQQwG8gIVv_Uj/view?usp=sharing" target="_blank" class="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white py-2 px-3 rounded-lg text-xs font-medium transition-colors border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500">
                                    <i data-lucide="smartphone" class="w-3.5 h-3.5"></i> Android
                                </a>
                            </div>
                            <div class="mt-2 p-2 bg-blue-50 border border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20 rounded-lg text-[10px] text-blue-600 dark:text-blue-300">
                                <i data-lucide="info" class="inline w-3 h-3 mr-1 align-text-bottom"></i>
                                <b>Pengguna Mac:</b> Jika aplikasi tidak bisa dibuka, buka <i>System Settings</i> &rarr; <i>Privacy & Security</i> &rarr; Klik <i>Open Anyway</i>.
                            </div>
                        </li>
                        <li>Install dan buka aplikasi tersebut.</li>
                        <li>Login menggunakan akun Google (Gmail) Anda.</li>
                        <li>Copy Token Key yang muncul setelah login berhasil.</li>
                        <li>Paste kode tersebut ke kolom <b>Token Key</b> di bawah ini.</li>
                    </ol>
                </div>

                <!-- Input Section -->
                <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Token Key</label>
                    <div class="relative">
                        <input type="text" id="token-key-input" class="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder-slate-400 dark:placeholder-slate-500 text-sm font-mono transition-all" value="${currentToken}" placeholder="Tempel token key disini...">
                    </div>
                </div>

                <!-- Actions -->
                <div class="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                     <button id="cancel-token-key" class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm">Tutup</button>
                     <button id="clear-token-key" class="bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 font-medium py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2 ${!currentToken ? 'hidden' : ''}">
                        <i data-lucide="trash-2" class="w-4 h-4"></i> Hapus
                     </button>
                     <button id="save-token-key" class="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2">
                        <i data-lucide="save" class="w-4 h-4"></i> Simpan
                     </button>
                </div>
            </div>
        `;
        
        modal.style.zIndex = '10000';
        modal.classList.add('visible');
        
        // Re-initialize icons for the new content
        if (window.lucide) window.lucide.createIcons();

        const saveBtn = document.getElementById('save-token-key');
        const cancelBtn = document.getElementById('cancel-token-key');
        const clearBtn = document.getElementById('clear-token-key');
        const input = document.getElementById('token-key-input');

        const closeModal = () => {
            modal.classList.remove('visible');
            // Revert theme adaptation and z-index
            setTimeout(() => {
                modal.style.zIndex = '';
                modalContent.classList.remove('bg-white', 'text-slate-900');
                if (closeBtn) closeBtn.classList.replace('text-slate-500', 'text-slate-400');
                if (closeBtn) closeBtn.classList.replace('hover:text-slate-900', 'hover:text-white');
            }, 300);
        };

        // Show/hide clear button based on input
        input.addEventListener('input', () => {
            if (input.value.trim()) {
                clearBtn.classList.remove('hidden');
            } else {
                clearBtn.classList.add('hidden');
            }
        });

        saveBtn.onclick = () => {
            const val = input.value.trim();
            if (val) {
                localStorage.setItem('sulapfoto_token_key', val);
                localStorage.setItem('token_key_enabled', 'true');
                tokenKeyToggle.checked = true;
                if (window.showServerToast) window.showServerToast("Token Key berhasil disimpan!", null, { icon: '<i data-lucide="check" class="w-4 h-4 text-emerald-500"></i>' });
            } else {
                // If empty and saved, treats as clear
                localStorage.removeItem('sulapfoto_token_key');
            }
            closeModal();
        };

        clearBtn.onclick = () => {
            if (confirm('Apakah Anda yakin ingin menghapus Token Key?')) {
                input.value = '';
                localStorage.removeItem('sulapfoto_token_key');
                tokenKeyToggle.checked = false;
                localStorage.setItem('token_key_enabled', 'false');
                clearBtn.classList.add('hidden');
                if (window.showServerToast) window.showServerToast("Token Key berhasil dihapus!", null, { icon: '<i data-lucide="trash-2" class="w-4 h-4 text-red-500"></i>' });
            }
        };
        
        cancelBtn.onclick = () => {
            if (!localStorage.getItem('sulapfoto_token_key')) {
                tokenKeyToggle.checked = false;
                localStorage.setItem('token_key_enabled', 'false');
            }
            closeModal();
        };
        closeBtn.onclick = closeModal;
        
        // Close on click outside
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
    }
});
