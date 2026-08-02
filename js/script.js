

let API_KEY = window.API_KEY || "";
const RAW_BASE_URL = window.BASE_URL ;
const BASE_URLS = RAW_BASE_URL.split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
        let nextItem = item;
        if (!/^https?:\/\//i.test(nextItem)) {
            nextItem = `https://${nextItem}`;
        }
        return nextItem.replace(/\/$/, "");
    });
const pickRandomBase = (list) => {
    if (!Array.isArray(list) || list.length === 0) return "";
    return list[Math.floor(Math.random() * list.length)];
};
const BASE_URL = pickRandomBase(BASE_URLS);
const MULTI_BASE = BASE_URLS.length > 1;

// BASE_URL_GROK untuk endpoint /imagegrok (Super Grok) - backward compatible dengan BASE_URL_FLOW
const RAW_BASE_URL_GROK = window.BASE_URL_GROK || window.BASE_URL_FLOW || window.BASE_URL_NB2 || "";
const BASE_URL_GROK = (() => {
    if (!RAW_BASE_URL_GROK) return "";
    let url = RAW_BASE_URL_GROK.trim();
    if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
    }
    return url.replace(/\/$/, "");
})();

// BASE_URL_PRIVATE untuk endpoint private server (camoufox_dola.py)
const BASE_URL_PRIVATE = (() => {
    const raw = window.BASE_URL_PRIVATE || "";
    if (!raw) return "";
    let url = raw.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    return url.replace(/\/$/, "");
})();

const GENERATE_URL = `${BASE_URL}/generate`;
const CHAT_URL = `${BASE_URL}/chat`;
const VIDEO_URL = `${BASE_URL}/seedance`;

// Flow endpoints - menggunakan BASE_URL_FLOW jika tersedia
const CHATGROK_URL = BASE_URL_GROK ? `${BASE_URL_GROK}/chat` : `${BASE_URL}/chat`;
const VIDEOGROK_URL = BASE_URL_GROK ? `${BASE_URL_GROK}/videogrok` : `${BASE_URL}/videogrok`;
const IMAGEGROK_URL = BASE_URL_GROK ? `${BASE_URL_GROK}/imagegrok` : '';
const IMAGEFLOW_URL = BASE_URL_GROK ? `${BASE_URL_GROK}/imageflow` : `${BASE_URL}/imageflow`;
const NANOBANANA2_URL = BASE_URL_GROK ? `${BASE_URL_GROK}/nanobanana2` : `${BASE_URL}/nanobanana2`;
const VIDEOFLOW_URL = BASE_URL_GROK ? `${BASE_URL_GROK}/videoflow` : `${BASE_URL}/videoflow`;
const VIDEOFLOW_STATUS_URL = BASE_URL_GROK ? `${BASE_URL_GROK}/videoflow-status` : `${BASE_URL}/videoflow-status`;
const VIDEOWEAVY_URL = BASE_URL;
const VIDEOWEAVY_STATUS_URL = `${BASE_URL}/weavy-status`;

// Private Server model endpoint override
const PRIVATE_SERVER_MODELS = {
    'nanobanana': { endpoint: 'imagegemini', label: 'Nano Banana 1' },
    'nanobanana2': { endpoint: 'imagegemini2', label: 'Nano Banana 2' },
    'seedream': { endpoint: 'seedreamdola', label: 'SeeDream 4.5' },
    'flux2dev': { endpoint: 'flux2dev', label: 'Flux 2 Dev', description: 'Foto sinematik premium dengan detail wajah tajam, pencahayaan natural, dan akurasi warna tinggi. Terbaik untuk portrait, lifestyle, dan produk.' },
    'qwen': { endpoint: 'qwen', label: 'Qwen 3.7', description: 'Qwen 3.7 - Model AI dari Alibaba dengan render sangat akurat, cocok untuk infografis dan poster. Hanya support rasio 16:9' },
    'grok': { endpoint: 'imagegrok', label: 'Super Grok', disabled: true }
};
window.PRIVATE_SERVER_MODELS = PRIVATE_SERVER_MODELS;

(function() {
    const _origFetch = window.fetch;
    // Seedream batch: N parallel calls collapsed into 1 request with imageCount=N
    let _sdBatch = null;
    const _SD_BATCH_WINDOW = 400;
    function _getSeedreamCount() {
        const sliders = document.querySelectorAll('input[type="range"][id$="count-slider"]');
        for (const s of sliders) {
            const v = parseInt(s.value) || 1;
            if (!s.disabled && v > 1) return v;
        }
        return 1;
    }
    window.fetch = async function(input, init) {
        const selectedModel = localStorage.getItem('private_server_model');
        if (selectedModel && PRIVATE_SERVER_MODELS[selectedModel]) {
            const modelInfo = PRIVATE_SERVER_MODELS[selectedModel];
            if (modelInfo.endpoint) {
                let url = typeof input === 'string' ? input : (input instanceof Request ? input.url : input);
                if (typeof url === 'string') {
                    const isGenerate = url.includes('/generate') || url.includes('?generate');
                    const isChat = url.includes('/chat') || url.includes('?chat');
                    // Skip /chat - let it pass through to show global toast
                    if (isGenerate && !isChat) {
                        const newEndpoint = modelInfo.endpoint;



                        const modelLabel = modelInfo.label || selectedModel;
                        let toast = null;
                        let controller = new AbortController();
                        if (window.showServerToast) {
                            toast = window.showServerToast(`Memproses di private server, model: ${modelLabel}`, () => {
                                controller.abort();
                            }, { icon: '' });
                        }
                        
                        const initWithSignal = Object.assign({}, init, { signal: controller.signal, __skipToast: true });
                        
                        // Endpoints yang menggunakan BASE_URL_PRIVATE exclusively (camoufox_dola.py)
                        const privateOnlyEndpoints = ['seedreamdola'];
                        const isPrivateOnly = privateOnlyEndpoints.includes(newEndpoint);

                        // Endpoints yang menggunakan BASE_URL_GROK exclusively
                        const grokOnlyEndpoints = ['imagegrok', 'imagewhisk'];
                        const isGrokOnly = grokOnlyEndpoints.includes(newEndpoint);
                        
                        // Endpoints with no fallback - pick random once, fail immediately if error
                        const noFallbackEndpoints = ['seedance', 'imagegrok', 'weavygpt2'];
                        const isNoFallback = noFallbackEndpoints.includes(newEndpoint);
                        
                        // Endpoints yang hanya menggunakan BASE_URL (tidak boleh ke BASE_URL_GROK)
                        const baseOnlyEndpoints = ['imagegemini', 'imagegemini2', 'qwen', 'weavygpt2', 'flux2dev'];
                        const isBaseOnly = baseOnlyEndpoints.includes(newEndpoint);
                        
                        // Select single server based on endpoint type
                        let serverUrl;
                        if (isPrivateOnly) {
                            // Private-only endpoints: gunakan BASE_URL_PRIVATE (camoufox_dola.py)
                            if (!BASE_URL_PRIVATE) {
                                if (toast && window.hideServerToast) window.hideServerToast(toast);
                                return new Response(
                                    JSON.stringify({ success: false, error: 'BASE_URL_PRIVATE tidak dikonfigurasi.' }),
                                    { status: 503, headers: { 'Content-Type': 'application/json' } }
                                );
                            }
                            serverUrl = BASE_URL_PRIVATE;
                        } else if (isGrokOnly) {
                            // Grok-only endpoints: use BASE_URL_GROK, fallback ke BASE_URL_PRIVATE
                            const grokUrl = BASE_URL_GROK || BASE_URL_PRIVATE;
                            if (!grokUrl) {
                                if (toast && window.hideServerToast) window.hideServerToast(toast);
                                return new Response(
                                    JSON.stringify({ success: false, error: 'Server tidak dikonfigurasi.' }),
                                    { status: 503, headers: { 'Content-Type': 'application/json' } }
                                );
                            }
                            serverUrl = grokUrl;
                        } else if (isBaseOnly) {
                            // Base-only endpoints: hanya gunakan BASE_URLS dari env BASE_URL
                            const baseUrls = Array.isArray(BASE_URLS) && BASE_URLS.length > 0 ? BASE_URLS : (BASE_URL ? [BASE_URL] : []);
                            serverUrl = pickRandomBase(baseUrls) || BASE_URL;
                        } else if (isNoFallback) {
                            // No-fallback endpoints (seedream, seedance): pick random from BASE_URLS, no retry
                            const noFallbackUrls = Array.isArray(BASE_URLS) && BASE_URLS.length > 0 ? BASE_URLS : (BASE_URL ? [BASE_URL] : []);
                            serverUrl = pickRandomBase(noFallbackUrls) || BASE_URL;
                        } else {
                            // Other endpoints: pick random per-request from BASE_URLS + BASE_URL_GROK
                            const allUrls = [
                                ...(Array.isArray(BASE_URLS) && BASE_URLS.length > 0 ? BASE_URLS : (BASE_URL ? [BASE_URL] : [])),
                                ...(BASE_URL_GROK ? [BASE_URL_GROK] : [])
                            ];
                            serverUrl = allUrls.length > 0
                                ? allUrls[Math.floor(Math.random() * allUrls.length)]
                                : (BASE_URL || BASE_URL_GROK);
                        }
                        
                        // Single request - no failover
                        try {
                            const newUrl = `${serverUrl}/${newEndpoint}`;
                            const privateInit = Object.assign({}, initWithSignal, { __privateServerRequest: true, __skipToast: true });
                            
                            // Use polling for seedream, fetchWithFlowBase for grok, fetchWithBase otherwise
                            let response;
                            if (newEndpoint === 'seedreamdola') {
                                // Each parallel request runs independently (Dola = 1 image per request)
                                response = await pollSeedreamTask(serverUrl, newUrl, privateInit);
                            } else if (newEndpoint === 'weavygpt2') {
                                response = await pollWeavyGpt2Task(serverUrl, newUrl, privateInit);
                            } else if (newEndpoint === 'qwen') {
                                response = await fetchWithBase(serverUrl, newUrl, privateInit);
                            } else if (serverUrl === BASE_URL_GROK) {
                                response = await fetchWithFlowBase(newUrl, privateInit);
                            } else {
                                response = await fetchWithBase(serverUrl, newUrl, privateInit);
                            }
                            
                            return response;
                        } finally {
                            // Always hide toast when done (success or failure)
                            if (toast && window.hideServerToast) {
                                window.hideServerToast(toast);
                            }
                        }
                    }
                }
            }
        }
        return _origFetch.apply(this, arguments);
    };
})();

const FRONTEND_TOKEN_CACHE = new Map();
let generateQueue = Promise.resolve();
const isGenerateRequest = (url) => {
    if (typeof url !== "string") return false;
    return url.includes("/generate") || url.includes("?generate") || url.includes("generate.php") || (url.includes("/nanobananapro") && !url.includes("/nanobananaproflow"));
};
const runGenerateQueued = (task) => {
    const next = generateQueue.then(task, task);
    generateQueue = next.catch(() => {});
    return next;
};
const shouldRunParallel = (modeValue) => {
    if (typeof modeValue === "boolean") return modeValue;
    return String(modeValue || "").toUpperCase() === "TRUE";
};

window.showServerToast = function (message, onCancel, options = {}) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'server-toast';
    toast.style.pointerEvents = 'auto'; // Enable pointer events

    // Icon logic
    let iconHtml = options.icon;
    
    if (!iconHtml) {
        // Default Spinner Icon (Lucide-style SVG)
        iconHtml = `
            <svg class="animate-spin text-teal-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
        `;
    }

    // Cancel Button HTML
    let cancelBtnHtml = '';
    if (typeof onCancel === 'function') {
        cancelBtnHtml = `
            <button class="toast-cancel-btn ml-2 px-2 py-0.5 text-[10px] font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded transition-colors cursor-pointer outline-none focus:ring-1 focus:ring-rose-500/40">
                Batal
            </button>
        `;
    }

    toast.innerHTML = `
        ${iconHtml}
        <span class="flex-1 text-left" style="white-space:normal;word-break:break-word;">${message}</span>
        ${cancelBtnHtml}
    `;
    
    container.appendChild(toast);

    // Attach Event Listener for Cancel
    if (onCancel) {
        const btn = toast.querySelector('.toast-cancel-btn');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                btn.textContent = '...';
                btn.disabled = true;
                onCancel();
            });
        }
    }

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Auto hide logic (unless it's a processing toast with cancel button)
    if (!onCancel) {
        setTimeout(() => {
            if (toast && toast.parentNode) {
                window.hideServerToast(toast);
            }
        }, 5000); // 5 seconds
    }

    return toast;
};

window.hideServerToast = function (toast) {
    if (!toast) return;
    toast.classList.remove('show');
    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
};

// Helper for base64url encoding
function base64UrlEncode(str) {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Helper for signing JWT locally
async function generateLocalJwt(secret, ttlMinutes = 5) {
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

let originalFetch = null;
async function ensureFrontendToken(baseUrl) {
    if (!API_KEY) return "";
    
    const now = Date.now();
    const cached = FRONTEND_TOKEN_CACHE.get(baseUrl);
    if (cached && cached.token && cached.expiresAt > now + 5000) {
        return cached.token;
    }

    if (window.JWT_SECRET) {
        try {
            const mins = window.JWT_TTL_MIN || 5;
            const token = await generateLocalJwt(window.JWT_SECRET, mins);
            const expiresAt = Date.now() + (mins * 60_000);
            FRONTEND_TOKEN_CACHE.set(baseUrl, { token, expiresAt });
            return token;
        } catch (e) {
            console.error("Local JWT generation failed", e);
            return "";
        }
    }
    
    console.warn("JWT_SECRET missing, cannot generate token locally.");
    return "";
}
window.getToken = ensureFrontendToken;

// Helper function untuk fetch ke BASE_URL_FLOW dengan JWT token
async function fetchWithFlowBase(input, init = {}) {
    const token = await ensureFrontendToken(BASE_URL_FLOW);
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has("X-API-Key")) headers.set("X-API-Key", API_KEY);
    if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    
    // Create AbortController (no timeout - let requests complete naturally)
    const controller = new AbortController();
    const signal = controller.signal;
    if (init.signal) {
        init.signal.addEventListener('abort', () => controller.abort());
    }
    
    const nextInit = Object.assign({}, init, { headers, signal });
    
    // Determine URL
    let nextUrl = input instanceof Request ? input.url : input;
    if (typeof nextUrl === "string") {
        // If URL is from BASE_URL, replace with BASE_URL_FLOW
        if (nextUrl.startsWith(`${BASE_URL}/`)) {
            nextUrl = BASE_URL_FLOW + nextUrl.slice(BASE_URL.length);
        } else if (nextUrl === BASE_URL) {
            nextUrl = BASE_URL_FLOW;
        }
    }
    
    let toast = null;
    const isGenerateOrChat = typeof nextUrl === "string" && (nextUrl.includes("/generate") || nextUrl.includes("/chat") || nextUrl.includes("/seedream") || (nextUrl.includes("/nanobananapro") && !nextUrl.includes("/nanobananaproflow")));
    const skipToast = init && init.__skipToast;
    
    if (window.showServerToast && isGenerateOrChat && !skipToast) {
        const selectedModel = localStorage.getItem('private_server_model');
        const isChat = typeof nextUrl === "string" && (nextUrl.includes("/chat") || nextUrl.includes("?chat"));
        // Always show toast for /chat regardless of private server status
        // For /generate, only show toast if model is nanobanana (default) or not set
        if ((isChat || !selectedModel || selectedModel === 'nanobanana')) {
            toast = window.showServerToast('Memproses di Private Server...', () => {
                controller.abort();
            }, { icon: '' });
        }
    }
    
    try {
        if (input instanceof Request) {
            const request = new Request(nextUrl, nextInit);
            return await originalFetch(request);
        }
        return await originalFetch(nextUrl, nextInit);
    } catch (error) {
        if (error.name === 'AbortError') {
            const newError = new Error("Proses generate dibatalkan oleh user");
            newError.name = 'AbortError';
            throw newError;
        }
        throw error;
    } finally {
        if (toast && window.hideServerToast) {
            window.hideServerToast(toast);
        }
    }
}
window.fetchWithFlowBase = fetchWithFlowBase;

// Helper for Cookie Injection (Gemini Cookie or Token Key)
function appendCookieToFormData(init, url) {
    if (!init || !init.body || !(init.body instanceof FormData)) return;
    
    // Check if URL is generate or chat (string or Request object)
    let urlStr = url;
    if (url instanceof Request) urlStr = url.url;
    if (typeof urlStr !== 'string') return;
    
    // Only append to generate/chat/nanobananapro endpoints
    const isRelevantEndpoint = urlStr.includes('/generate') || 
                                urlStr.includes('/chat') || 
                                urlStr.includes('/nanobananapro');
    if (!isRelevantEndpoint) return;
    
    // Check if Token Key toggle is enabled
    const tokenKeyEnabled = localStorage.getItem('token_key_enabled') === 'true';
    
    if (tokenKeyEnabled) {
        // Use Token Key cookie
        const tokenKey = localStorage.getItem('sulapfoto_token_key');
        if (tokenKey && !init.body.has('cookie')) {
            init.body.append('cookie', tokenKey);
        }
    } else {
        // Use Gemini Cookie (default)
        const geminiCookie = localStorage.getItem('sulapfoto_gemini_cookie');
        if (geminiCookie && !init.body.has('cookie')) {
            init.body.append('cookie', geminiCookie);
        }
    }
}

// Helper: returns grid column class based on result count
// Mobile always 1 column, tablet/PC 2 columns when count > 1
function getResultGridCols(count) {
    return (parseInt(count) || 1) > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1';
}
window.getResultGridCols = getResultGridCols;

// GeminiBridge helper to intercept and handle requests
async function handleGeminiBridgeRequest(url, init) {
    // Skip bridge if Token Key is enabled - use internal endpoints directly
    const tokenKeyEnabled = localStorage.getItem('token_key_enabled') === 'true';
    if (tokenKeyEnabled) {
        return null;
    }
    
    // Check selected private server model
    const selectedModel = localStorage.getItem('private_server_model');
    // Only use bridge for Nano Banana 1 (nanobanana) or when no model is selected
    // Other models should go through BASE_URL/BASE_URL_FLOW
    if (selectedModel && selectedModel !== 'nanobanana') {
        return null;
    }
    
    if (!window.GeminiBridge || !window.GeminiBridge.isAvailable) return null;
    
    const urlStr = typeof url === 'string' ? url : (url instanceof Request ? url.url : '');
    const isGenerate = urlStr.includes('/generate') || urlStr.includes('?generate') || (urlStr.includes('/nanobananapro') && !urlStr.includes('/nanobananaproflow'));
    const isChat = urlStr.includes('/chat') || urlStr.includes('?chat');
    const isTts = urlStr.includes('/tts') || urlStr.includes('?tts');
    
    if (!isGenerate && !isChat && !isTts) return null;
    
    // Handle TTS with JSON payload
    if (isTts && init.body && typeof init.body === 'string') {
        try {
            const payload = JSON.parse(init.body);
            const result = await window.GeminiBridge.tts(payload);
            
            return new Response(JSON.stringify({
                success: true,
                audioBase64: result.audioBase64,
                mimeType: result.mimeType,
                audioUrl: result.audioUrl || (result.audioBase64 ? `data:${result.mimeType || 'audio/mp3'};base64,${result.audioBase64}` : undefined),
                text: result.text,
                response: result.response,
                transcription: result.transcription
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            let errorMsg = error.message || 'GeminiBridge TTS Error';
            
            return new Response(JSON.stringify({
                success: false,
                error: errorMsg
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // Extract FormData for generate/chat
    if (!init || !init.body || !(init.body instanceof FormData)) return null;
    const formData = init.body;
    
    try {
        if (isGenerate) {
            // Handle Generate Request
            const instruction = formData.get('instruction') || formData.get('prompt') || '';
            const aspectRatio = formData.get('aspectRatio') || '1:1';
            const images = formData.getAll('images') || formData.getAll('images[]') || [];
            
            const result = await window.GeminiBridge.generate({
                instruction,
                aspectRatio,
                images
            });
            
            // Return mock Response object
            return new Response(JSON.stringify({
                success: true,
                imageUrl: result.imageUrl,
                images: [result.imageUrl]
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else if (isChat) {
            // Handle Chat Request
            const prompt = formData.get('prompt') || '';
            const images = formData.getAll('images') || formData.getAll('images[]') || [];
            
            const result = await window.GeminiBridge.chat({
                prompt,
                images
            });
            
            // Return mock Response object
            return new Response(JSON.stringify({
                success: true,
                response: result.response
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        let errorMsg = error.message || 'GeminiBridge Error';
        
        return new Response(JSON.stringify({
            success: false,
            error: errorMsg
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    return null;
}

async function fetchWithBase(baseUrl, input, init) {
    const token = await ensureFrontendToken(baseUrl);
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has("X-API-Key")) headers.set("X-API-Key", API_KEY);
    if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);

    // Create AbortController (no timeout - let requests complete naturally)
    const controller = new AbortController();
    const signal = controller.signal;
    if (init.signal) {
        init.signal.addEventListener('abort', () => controller.abort());
    }

    const nextInit = Object.assign({}, init, { headers, signal });
    let nextUrl = input instanceof Request ? input.url : input;
    if (typeof nextUrl === "string") {
        if (nextUrl.startsWith(`${BASE_URL}/`)) {
            nextUrl = baseUrl + nextUrl.slice(BASE_URL.length);
        } else if (nextUrl === BASE_URL) {
            nextUrl = baseUrl;
        }
    }

    let toast = null;
    const isGenerateOrChat = typeof nextUrl === "string" && (nextUrl.includes("/generate") || nextUrl.includes("/chat") || (nextUrl.includes("/nanobananapro") && !nextUrl.includes("/nanobananaproflow")));

    if (window.showServerToast && isGenerateOrChat) {
        // Skip server toast if this request will be routed to BASE_URL_FLOW (private server toast handles it)
        const isFlowUrl = BASE_URL_FLOW && nextUrl && nextUrl.startsWith(BASE_URL_FLOW);
        const isPrivateServerRequest = init && init.__privateServerRequest;
        const skipToast = init && init.__skipToast;
        // Also skip if Private Server model is active — Interceptor 1 handles the toast
        const psModel = localStorage.getItem('private_server_model');
        const isPrivateServerActive = psModel && PRIVATE_SERVER_MODELS[psModel] && PRIVATE_SERVER_MODELS[psModel].endpoint;
        const isChat = typeof nextUrl === "string" && (nextUrl.includes("/chat") || nextUrl.includes("?chat"));
        // Always show toast for /chat regardless of private server status
        // For /generate, show toast only when NOT using private server
        if (!isFlowUrl && !isPrivateServerRequest && (isChat || !isPrivateServerActive) && !skipToast) {
            let sIdx = BASE_URLS.indexOf(baseUrl);
            // If baseUrl not found in array (due to normalization), default to index 0
            if (sIdx === -1 && BASE_URLS.length > 0) sIdx = 0;
            const msg = sIdx !== -1 ? `Memproses di Server ${sIdx + 1}...` : "Memproses...";
            toast = window.showServerToast(msg, () => {
                 controller.abort();
            }, { icon: '', truncate: false });
        }
    }

    try {
        if (input instanceof Request) {
            const request = new Request(nextUrl, nextInit);
            return await originalFetch(request);
        }
        return await originalFetch(nextUrl, nextInit);
    } catch (error) {
        if (error.name === 'AbortError') {
             const newError = new Error("Proses generate dibatalkan oleh user");
             newError.name = 'AbortError';
             throw newError;
        }
        throw error;
    } finally {
        if (toast && window.hideServerToast) window.hideServerToast(toast);
    }
}
async function pollSeedreamTask(serverUrl, url, init) {
    const submitFn = serverUrl === BASE_URL_FLOW
        ? (u, i) => fetchWithFlowBase(u, i)
        : (u, i) => fetchWithBase(serverUrl, u, i);

    const submitResp = await submitFn(url, init);
    if (!submitResp.ok) return submitResp;

    let submitData;
    try { submitData = await submitResp.json(); } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'Server response error' }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        });
    }

    if (!submitData.taskId) {
        return new Response(JSON.stringify(submitData), {
            status: 200, headers: { 'Content-Type': 'application/json' }
        });
    }

    const { taskId } = submitData;
    const statusUrl = `${serverUrl}/seedreamdola-status`;
    const pollInterval = 5000;
    const maxPollTime = 360000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxPollTime) {
        await new Promise(r => setTimeout(r, pollInterval));
        try {
            const statusResp = await fetchWithBase(serverUrl, statusUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId }),
                __skipToast: true,
            });
            if (!statusResp.ok) continue;
            const statusData = await statusResp.json();
            if (statusData.status === 'done' && statusData.imageUrl) {
                return new Response(JSON.stringify({ success: true, imageUrl: statusData.imageUrl, imageUrls: statusData.imageUrls || [statusData.imageUrl] }), {
                    status: 200, headers: { 'Content-Type': 'application/json' }
                });
            }
            if (statusData.status === 'failed') {
                return new Response(JSON.stringify({ success: false, error: statusData.error || 'Seedream generation failed' }), {
                    status: 500, headers: { 'Content-Type': 'application/json' }
                });
            }
            if (statusData.status === 'not_found') {
                return new Response(JSON.stringify({ success: false, error: statusData.error || 'Task not found or expired' }), {
                    status: 404, headers: { 'Content-Type': 'application/json' }
                });
            }
        } catch (_) { /* network glitch, retry */ }
    }

    return new Response(JSON.stringify({ success: false, error: 'Seedream timeout, coba lagi' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
    });
}
async function pollWeavyGpt2Task(serverUrl, url, init) {
    const submitFn = serverUrl === BASE_URL_FLOW
        ? (u, i) => fetchWithFlowBase(u, i)
        : (u, i) => fetchWithBase(serverUrl, u, i);

    const submitResp = await submitFn(url, init);
    if (!submitResp.ok) return submitResp;

    let submitData;
    try { submitData = await submitResp.json(); } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'Server response error' }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        });
    }

    if (!submitData.taskId) {
        return new Response(JSON.stringify(submitData), {
            status: 200, headers: { 'Content-Type': 'application/json' }
        });
    }

    const { taskId } = submitData;
    const statusUrl = `${serverUrl}/weavy-status`;
    const pollInterval = 5000;
    const maxPollTime = 300000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxPollTime) {
        await new Promise(r => setTimeout(r, pollInterval));
        try {
            const statusResp = await fetchWithBase(serverUrl, statusUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId }),
                __skipToast: true,
            });
            if (!statusResp.ok) continue;
            const statusData = await statusResp.json();
            if (statusData.status === 'done' && (statusData.imageUrl || statusData.videoUrl)) {
                const imgUrl = statusData.imageUrl || statusData.videoUrl;
                return new Response(JSON.stringify({ success: true, imageUrl: imgUrl, images: [imgUrl] }), {
                    status: 200, headers: { 'Content-Type': 'application/json' }
                });
            }
            if (statusData.status === 'failed') {
                return new Response(JSON.stringify({ success: false, error: statusData.error || 'GPT Image-2 generation failed' }), {
                    status: 500, headers: { 'Content-Type': 'application/json' }
                });
            }
            if (statusData.status === 'not_found') {
                return new Response(JSON.stringify({ success: false, error: statusData.error || 'Task not found or expired' }), {
                    status: 404, headers: { 'Content-Type': 'application/json' }
                });
            }
        } catch (_) { /* network glitch, retry */ }
    }

    return new Response(JSON.stringify({ success: false, error: 'GPT Image-2 timeout, coba lagi' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
    });
}
async function fetchMultiBase(input, init) {
    let lastError = null;
    let targetList = [];
    const requestUrl = input instanceof Request ? input.url : input;
    const isNanoReq = typeof requestUrl === 'string' && requestUrl.includes('/nanobananapro') && !requestUrl.includes('/nanobananaproflow');
    const isGenerateReq = typeof requestUrl === 'string' && (requestUrl.includes('/generate') || requestUrl.includes('?generate'));
    
    // Check user preference
    const preferredServer = localStorage.getItem('sulapfoto_boost_server');
    
    if (preferredServer && preferredServer !== 'random') {
        // Handle Flow Server selection
        if (preferredServer === 'flow') {
            if (BASE_URL_FLOW && !isGenerateReq) {
                // Route to Flow Server using fetchWithFlowBase
                try {
                    const res = await fetchWithFlowBase(input, init);
                    if (res.ok) {
                        return res;
                    }
                    lastError = new Error('Gagal Generate di Flow Server. Coba ganti server atau pilih Random.');
                } catch (error) {
                    if (error.name === 'AbortError') {
                        throw error;
                    }
                    lastError = error;
                }
                throw lastError || new Error("Gagal Generate di Flow Server.");
            }
        } 
        // Handle BASE_URL server selection (base_0, base_1, etc.)
        else if (preferredServer.startsWith('base_')) {
            const idx = parseInt(preferredServer.replace('base_', ''));
            if (!isNaN(idx) && BASE_URLS[idx]) {
                targetList = [BASE_URLS[idx]];
            }
        }
    }
    
    if (targetList.length === 0) {
        // Default behavior: Random/Shuffle all servers (BASE_URLS + BASE_URL_FLOW)
        targetList = Array.isArray(BASE_URLS) ? [...BASE_URLS] : [];
        if (BASE_URL_FLOW && !isGenerateReq && !targetList.includes(BASE_URL_FLOW)) {
            targetList.push(BASE_URL_FLOW);
        }
        for (let i = targetList.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = targetList[i];
            targetList[i] = targetList[j];
            targetList[j] = temp;
        }
    }

    // No-fallback endpoints: no retry on failure - use only one server
    const _activePrivateModel = localStorage.getItem('private_server_model');
    const _noFallbackModels = ['seedream', 'nanobanana_pro', 'grok'];
    if (_activePrivateModel && _noFallbackModels.includes(_activePrivateModel) && targetList.length > 1) {
        targetList = [targetList[0]];
    }
    
    for (const baseUrl of targetList) {
        try {
            const res = baseUrl === BASE_URL_FLOW
                ? await fetchWithFlowBase(input instanceof Request ? input.url : input, init)
                : await fetchWithBase(baseUrl, input, init);
            if (res.ok) {
                return res;
            }
            if (preferredServer && preferredServer !== 'random' && preferredServer.startsWith('base_')) {
                 // If user selected a specific BASE server and it failed, throw error immediately
                 const serverNum = parseInt(preferredServer.replace('base_', '')) + 1;
                 lastError = new Error(`Gagal Generate di Server ${serverNum}. Coba ganti server atau pilih Random.`);
            } else {
                 let errorMessage = "Gagal Generate karena melanggar kebijakan. coba foto lain atau ganti intruksi..";
                 try {
                     const rawText = await res.clone().text().catch(() => '');
                     let errBody = {};
                     if (rawText) {
                         try {
                             errBody = JSON.parse(rawText);
                         } catch (e) {
                         }
                     }
                     const msg = (typeof errBody.error === 'string' ? errBody.error : errBody.error?.message) || errBody.message || '';
                     const combinedMessage = String(msg || rawText || '');
                     
                     // Use server message if available, otherwise default
                     if (msg) errorMessage = msg;

                     if (isNanoReq && combinedMessage.includes('UNAUTHORIZED')) {
                         errorMessage = "Sesi telah berakhir atau server sedang sibuk. Silakan coba lagi nanti.";
                     } else if (isNanoReq && combinedMessage.toLowerCase().includes('unauthorized')) {
                         errorMessage = "Mohon Maaf, AI Model premium pada fitur ini sedang offline. Coba lagi beberapa saat.";
                     } else if (combinedMessage && combinedMessage.toLowerCase().includes("resource has been exhausted")) {
                         errorMessage = "Mohon Maaf, AI Model premium pada fitur ini sedang offline. Coba lagi beberapa saat.";
                     } else if (combinedMessage && combinedMessage.includes("TOO_MANY_REQUESTS")) {
                         errorMessage = "Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.";
                     } else if (combinedMessage && (combinedMessage.includes("No Whisk cookie available") || combinedMessage.includes("CHECK_FIREBASE"))) {
                         errorMessage = "Server sedang sibuk (Resources exhausted). Silakan coba lagi nanti.";
                     }
                 } catch (e) {}
                 lastError = new Error(errorMessage);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                throw error;
            }
            lastError = error;
        }
    }
    throw lastError || new Error("Gagal Generate. Semua server sibuk atau bermasalah.");
}
if (typeof FormData !== "undefined" && !FormData.prototype.__sulapfotoPatched) {
    const originalAppend = FormData.prototype.append;
    FormData.prototype.append = function (name, value, filename) {
        const nextName = name === "images[]" ? "images" : name;
        let nextValue = value;
        let nextFilename = filename;
        if (filename !== undefined && !(value instanceof Blob)) {
            if (typeof value === "string" && value.startsWith("data:")) {
                const match = value.match(/^data:(.*?);base64,(.*)$/);
                if (match) {
                    const mimeType = match[1];
                    const base64 = match[2];
                    const byteCharacters = atob(base64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    nextValue = new Blob([byteArray], { type: mimeType });
                }
            }
            if (!(nextValue instanceof Blob)) {
                return originalAppend.call(this, nextName, nextValue);
            }
        }
        if (nextFilename === undefined) {
            return originalAppend.call(this, nextName, nextValue);
        }
        return originalAppend.call(this, nextName, nextValue, nextFilename);
    };
    FormData.prototype.__sulapfotoPatched = true;
}
if (API_KEY && typeof window.fetch === "function") {
    originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init = {}) => {
        // Try GeminiBridge first
        const bridgeResponse = await handleGeminiBridgeRequest(input, init);
        if (bridgeResponse) return bridgeResponse;
        
        appendCookieToFormData(init, input);
        const url = input instanceof Request ? input.url : input;
        if (typeof url === "string") {
            // Check if request is to BASE_URL_FLOW
            const isFlowRequest = BASE_URL_FLOW && url.startsWith(`${BASE_URL_FLOW}/`);
            
            const isGenerate = url.includes('/generate') || url.includes('?generate');
            const isChat = url.includes('/chat');
            const isNano = url.includes("/nanobananapro") && !url.includes("/nanobananaproflow");
            const runRequest = async () => {
                // Handle BASE_URL_FLOW requests with JWT token
                if (isFlowRequest) {
                    // Route /seedream through fetchWithFlowBase (single polling logic)
                    const isSeedreamReq = url.includes('/seedream') && !url.includes('/seedream-');
                    if (isSeedreamReq && init.method === 'POST' && init.body instanceof FormData) {
                        return fetchWithFlowBase(input, init);
                    }
                    const token = await ensureFrontendToken(BASE_URL_FLOW);
                    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
                    if (!headers.has("X-API-Key")) headers.set("X-API-Key", API_KEY);
                    if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
                    
                    // Don't show toast here if already shown in interceptor 1
                    const skipToast = init && init.__skipToast;
                    const nextInit = Object.assign({}, init, { headers });
                    
                    if (input instanceof Request) {
                        const request = new Request(input, nextInit);
                        return await originalFetch(request);
                    }
                    return await originalFetch(url, nextInit);
                }
                
                if (MULTI_BASE && (isGenerate || isChat || isNano)) {
                    return fetchMultiBase(input, init);
                }
                if (url.startsWith(`${BASE_URL}/`) || url === BASE_URL) {
                    const token = await ensureFrontendToken(BASE_URL);
                    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
                    if (!headers.has("X-API-Key")) headers.set("X-API-Key", API_KEY);
                    if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
                    
                    // Show toast for single BASE_URL (when MULTI_BASE is false)
                    let toast = null;
                    const controller = new AbortController();
                    const skipToast = init && init.__skipToast;
                    const psModel = localStorage.getItem('private_server_model');
                    const isPrivateServerActive = psModel && PRIVATE_SERVER_MODELS[psModel] && PRIVATE_SERVER_MODELS[psModel].endpoint;
                    
                    if ((isGenerate || isChat || isNano) && window.showServerToast && !skipToast && !isPrivateServerActive) {
                        toast = window.showServerToast('Memproses di Server 1...', () => {
                            controller.abort();
                        }, { icon: '', truncate: false });
                    }
                    
                    const nextInit = Object.assign({}, init, { headers, signal: controller.signal });
                    
                    try {
                        if (input instanceof Request) {
                            const request = new Request(input, nextInit);
                            return await originalFetch(request);
                        }
                        return await originalFetch(input, nextInit);
                    } catch (error) {
                        if (error.name === 'AbortError') {
                            console.log('Request cancelled by user');
                        }
                        throw error;
                    } finally {
                        if (toast && window.hideServerToast) {
                            window.hideServerToast(toast);
                        }
                    }
                }
                return originalFetch(input, init);
            };
            // Parallel generation handled by Promise.allSettled in feature files
            return runRequest();
        }
        return originalFetch(input, init);
    };
}


let currentSession = {
    email: null
};
let _sseConn = null;

const DEVICE_ID_KEY = 'sulapfoto_device_id';
function getOrCreateDeviceId() {
    try {
        const existing = localStorage.getItem(DEVICE_ID_KEY);
        if (existing) return existing;
    } catch (e) {
    }
    let id = '';
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        id = window.crypto.randomUUID();
    } else if (window.crypto && window.crypto.getRandomValues) {
        const bytes = new Uint8Array(16);
        window.crypto.getRandomValues(bytes);
        id = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
        id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
    try {
        localStorage.setItem(DEVICE_ID_KEY, id);
    } catch (e) {
    }
    return id;
}
const deviceId = getOrCreateDeviceId();



// Session management removed as per request
window.addEventListener('load', async () => {

    let shouldSkipVerification = false;
    let foundEmail = null;
    let fotoMiniatur = null; // Module instance
    let editFoto = null;
    let perbaikiFoto = null;
    let buatBannerModule = null;

    const savedEmail = localStorage.getItem('sulapfoto_verified_email');
    if (savedEmail) {
        foundEmail = savedEmail;
        console.log('Email ditemukan di localStorage:', foundEmail);
    }

    let QUOTA_LIMIT = 0;

    // ===== Server Status Module =====
    class ServerStatusManager {
        constructor() {
            this.gridEl = document.getElementById('systeminfo-grid');
            this.totalLabelEl = document.getElementById('systeminfo-total-label');
            this.onlineCounterEl = document.getElementById('systeminfo-online-counter');
            this.cards = [];
            this.isRefreshing = false;
            this.refreshInterval = null;
        }

        init() {
            if (!this.gridEl) return;

            const servers = this.getServerUrls();
            if (servers.length === 0) return;

            this.gridEl.style.gridTemplateColumns = `repeat(${servers.length}, minmax(160px, 1fr))`;
            this.gridEl.innerHTML = '';
            
            this.cards = servers.map((server, index) => this.createServerCard(server, index));
            
            // Initialize counter with total server count
            this.updateOnlineCounter(0, this.cards.length);
            
            this.startAutoRefresh();
        }

        getServerUrls() {
            const candidates = Array.isArray(BASE_URLS) ? BASE_URLS : [];
            const normalized = candidates
                .map(base => {
                    if (!base || typeof base !== 'string') return '';
                    let url = base.trim();
                    if (!url) return '';
                    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
                    return url.replace(/\/$/, '');
                })
                .filter(Boolean);

            const fallback = typeof BASE_URL === 'string' && BASE_URL ? [BASE_URL.replace(/\/$/, '')] : [];
            const urls = Array.from(new Set(normalized.length ? normalized : fallback));
            
            if (BASE_URL_FLOW) urls.push(BASE_URL_FLOW);
            
            return urls.map((url, index) => ({
                url,
                label: BASE_URL_FLOW && url === BASE_URL_FLOW ? 'Server Private' : `Server ${index + 1}`,
                isPrivate: BASE_URL_FLOW && url === BASE_URL_FLOW
            }));
        }

        createServerCard(server, index) {
            const card = document.createElement('div');
            card.className = 'rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm min-w-[160px] flex flex-col gap-1.5';
            card.innerHTML = `
                <div class="flex items-center justify-between gap-2">
                    <div class="text-[10px] font-semibold text-slate-600">${server.label}</div>
                    <span class="status-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold border border-slate-200 bg-slate-50 text-slate-600">
                        <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>Memuat
                    </span>
                </div>
                <div class="grid grid-cols-2 gap-1">
                    <div>
                        <p class="text-[9px] font-bold uppercase tracking-wider text-slate-500">CPU</p>
                        <div class="metric-cpu text-xs font-bold text-sky-600 mt-0.5">—</div>
                    </div>
                    <div>
                        <p class="text-[9px] font-bold uppercase tracking-wider text-slate-500">RAM</p>
                        <div class="metric-ram text-xs font-bold text-violet-600 mt-0.5">—</div>
                    </div>
                    <div>
                        <p class="text-[9px] font-bold uppercase tracking-wider text-slate-500">Storage</p>
                        <div class="metric-storage text-xs font-bold text-amber-600 mt-0.5">—</div>
                    </div>
                    <div>
                        <p class="text-[9px] font-bold uppercase tracking-wider text-slate-500">Uptime</p>
                        <div class="metric-uptime text-xs font-bold text-emerald-600 mt-0.5">—</div>
                    </div>
                </div>
                <div class="metric-total text-[10px] text-slate-500 font-semibold pt-1 border-t border-slate-100">—</div>
            `;
            
            this.gridEl.appendChild(card);
            
            return {
                url: server.url,
                label: server.label,
                statusEl: card.querySelector('.status-badge'),
                cpuEl: card.querySelector('.metric-cpu'),
                ramEl: card.querySelector('.metric-ram'),
                storageEl: card.querySelector('.metric-storage'),
                uptimeEl: card.querySelector('.metric-uptime'),
                totalEl: card.querySelector('.metric-total'),
                totalValue: null
            };
        }

        updateCardStatus(card, isOnline) {
            if (!card.statusEl) return;
            
            const statusConfig = isOnline 
                ? { class: 'border-emerald-200 bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500', text: 'Online' }
                : { class: 'border-red-200 bg-red-50 text-red-600', dot: 'bg-red-500', text: 'Offline' };
            
            card.statusEl.className = `status-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold border ${statusConfig.class}`;
            card.statusEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full ${statusConfig.dot}"></span>${statusConfig.text}`;
        }

        updateTotalLabel() {
            if (!this.totalLabelEl) return;
            const total = this.cards.reduce((sum, card) => sum + (card.totalValue || 0), 0);
            this.totalLabelEl.textContent = `Total: ${this.formatNumber(total)} Gambar Dihasilkan.`;
        }

        updateOnlineCounter(onlineCount, totalCount) {
            if (!this.onlineCounterEl) return;
            
            const dotEl = this.onlineCounterEl.querySelector('span.w-2');
            const textEl = this.onlineCounterEl.querySelector('span.text-\\[10px\\]');
            
            if (!dotEl || !textEl) return;
            
            // Update text with server count - white color
            textEl.textContent = `${onlineCount}/${totalCount} Server`;
            textEl.className = 'text-[10px] font-bold text-white/80';
            
            // Update dot color and counter background based on status
            if (onlineCount === 0) {
                dotEl.className = 'w-2 h-2 rounded-full bg-red-500';
                this.onlineCounterEl.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/20';
            } else if (onlineCount < totalCount) {
                dotEl.className = 'w-2 h-2 rounded-full bg-amber-500';
                this.onlineCounterEl.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/20';
            } else {
                dotEl.className = 'w-2 h-2 rounded-full bg-emerald-500';
                this.onlineCounterEl.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/20';
            }
        }

        formatNumber(value) {
            if (typeof value !== 'number' || !Number.isFinite(value)) return '0';
            return new Intl.NumberFormat('en-US').format(value);
        }

        parseTotal(rawValue) {
            if (rawValue === undefined || rawValue === null || rawValue === '') return null;
            const numeric = Number(String(rawValue).replace(/[^\d]/g, ''));
            return Number.isFinite(numeric) ? numeric : null;
        }

        async fetchServerInfo(card) {
            try {
                const response = await fetchWithBase(card.url, `${card.url}/systeminfo`, { cache: 'no-store' });
                if (!response.ok) throw new Error('Server unavailable');
                
                const data = await response.json();
                
                card.cpuEl.textContent = data.cpu != null ? `${data.cpu}%` : '—';
                card.ramEl.textContent = data.ram != null ? `${data.ram}%` : '—';
                
                const storage = data.storage ?? data.disk ?? data.diskUsage ?? data.storageUsed;
                card.storageEl.textContent = storage != null ? `${storage}%` : '—';
                
                const uptime = data.uptime;
                if (uptime == null) {
                    card.uptimeEl.textContent = '—';
                } else if (typeof uptime === 'string') {
                    card.uptimeEl.textContent = uptime;
                } else {
                    card.uptimeEl.textContent = `${uptime} Jam`;
                }
                
                const totalImages = data.totalGeneratedImages ?? data.total_generated_images ?? data.totalGenerated ?? data.total;
                const totalValue = this.parseTotal(totalImages);
                card.totalValue = totalValue;
                
                if (totalValue != null) {
                    card.totalEl.innerHTML = `Total: <span class="font-bold">${this.formatNumber(totalValue)}</span> gambar telah dihasilkan dari server ini.`;
                } else {
                    card.totalEl.textContent = '—';
                }
                
                this.updateCardStatus(card, true);
                this.updateTotalLabel();
                return true;
            } catch (error) {
                card.cpuEl.textContent = '—';
                card.ramEl.textContent = '—';
                card.storageEl.textContent = '—';
                card.uptimeEl.textContent = '—';
                card.totalEl.textContent = '—';
                card.totalValue = null;
                
                this.updateCardStatus(card, false);
                this.updateTotalLabel();
                return false;
            }
        }

        async refresh() {
            if (this.isRefreshing || this.cards.length === 0) return;
            
            this.isRefreshing = true;
            let completedCount = 0;
            let onlineCount = 0;
            const totalCount = this.cards.length;
            
            // Initialize counter
            this.updateOnlineCounter(0, totalCount);
            
            // Fetch server info for each card
            this.cards.forEach((card) => {
                this.fetchServerInfo(card).then((isOnline) => {
                    completedCount += 1;
                    if (isOnline) onlineCount += 1;
                    
                    // Update counter as each server responds
                    this.updateOnlineCounter(onlineCount, totalCount);
                    
                    if (completedCount === this.cards.length) {
                        this.isRefreshing = false;
                    }
                });
            });
        }

        startAutoRefresh() {
            this.refresh();
            this.refreshInterval = setInterval(() => this.refresh(), 5000);
        }

        destroy() {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }
        }
    }

    // Initialize Server Status
    const serverStatusManager = new ServerStatusManager();
    if (document.getElementById('systeminfo-card')) {
        serverStatusManager.init();
        window.refreshSystemInfo = () => serverStatusManager.refresh();
    }

    function loadScriptAsync(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    function loadFaceApiScript() {
        loadScriptAsync('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js')
            .then(() => console.log('face-api.js loaded successfully'))
            .catch(err => console.warn('face-api.js failed to load:', err));
    }
 
    const sessionDb = null; // Stub to prevent immediate crash



    // Auto-login logic simplified (removed Firebase session check)
    if (foundEmail) {
        shouldSkipVerification = true;
    }


    // Online sessions list logic removed
    let onlineSessionsList = [];

    function maskEmail(email) {
        if (!email || typeof email !== 'string') return '***@***.***';

        const parts = email.split('@');
        if (parts.length !== 2) return '***@***.***';

        const [localPart, domain] = parts;


        let maskedLocal;
        if (localPart.length <= 4) {
            maskedLocal = localPart.charAt(0) + '*'.repeat(Math.max(1, localPart.length - 1));
        } else {
            maskedLocal = localPart.slice(0, 2) + '*'.repeat(localPart.length - 4) + localPart.slice(-2);
        }

        return maskedLocal + '@' + domain;
    }

    function updateSidebarOnlineCount() {
        const countEl = document.getElementById('sidebar-online-count');
        if (countEl) {
            countEl.textContent = '0';
        }
    }

    const CURRENT_APP_VERSION = "8.8";
    window.assistantMessages = [];

    let configPollInterval = null;
    let currentOnlineUsers = []; // Store online users list
    let currentChatOnlineUsers = [];
    let pendingChatQueue = [];
    let latestChatMessages = [];
    let latestBannedUsers = [];
    let latestChatUserProfile = null;
    window.queueChatMessage = function (message) {
        if (!message) return;
        if (typeof message === 'string') {
            const trimmed = message.trim();
            if (!trimmed) return;
            pendingChatQueue.push(trimmed);
        } else if (typeof message === 'object') {
            const text = typeof message.text === 'string' ? message.text.trim() : '';
            if (!text) return;
            const payload = {
                text,
                user: typeof message.user === 'string' ? message.user.trim() : '',
                province: typeof message.province === 'string' ? message.province.trim() : '',
                isVip: !!message.isVip,
                isAdmin: !!message.isAdmin,
                replyTo: message.replyTo && typeof message.replyTo === 'object' ? {
                    messageId: message.replyTo.messageId || null,
                    user: typeof message.replyTo.user === 'string' ? message.replyTo.user : '',
                    text: typeof message.replyTo.text === 'string' ? message.replyTo.text : ''
                } : null
            };
            pendingChatQueue.push(payload);
        } else {
            return;
        }
        if (typeof checkAppConfig === 'function') {
            checkAppConfig(false);
        }
    };
    window.getChatMessages = function () {
        return latestChatMessages.slice();
    };

    function performLogout() {
        if (_sseConn) { try { _sseConn.close(); } catch (e) {} _sseConn = null; }
        try {
            localStorage.removeItem('sulapfoto_verified_email');
            localStorage.removeItem('sulapfoto_verified_password');
        } catch (err) {
        }
        if (window.autoLogoutGroupChat) window.autoLogoutGroupChat();
        currentSession.email = null;
        const profileSection = document.getElementById('user-profile-section');
        if (profileSection) {
            profileSection.classList.add('hidden');
        }
        const verifyOverlay = document.getElementById('verification-overlay');
        if (verifyOverlay) {
            verifyOverlay.style.display = 'flex';
            verifyOverlay.classList.remove('opacity-0', 'scale-110');
        }
        if (document.body) document.body.classList.add('overflow-hidden');
        const verifyEmailInput = document.getElementById('verification-email');
        const verifyMsg = document.getElementById('verification-message');
        const verifyBtn = document.getElementById('verification-btn');
        if (verifyEmailInput) verifyEmailInput.value = '';
        if (verifyMsg) verifyMsg.classList.add('hidden');
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = `
                                <span>Masuk Aplikasi</span>
                                <i data-lucide="arrow-right" class="w-4 h-4"></i>
                            `;
        }
    }

    function handleForcedLogout(reason) {
        performLogout();
        try {
            const verifyMsg = document.getElementById('verification-message');
            if (verifyMsg) {
                const reasonText = typeof reason === 'string' ? reason.toLowerCase() : '';
                const isDeviceLogin = reasonText.includes('perangkat lain') || reasonText.includes('device') || reasonText.includes('login');
                if (isDeviceLogin) {
                    verifyMsg.textContent = "Email anda baru saja login di device lain";
                    verifyMsg.className = "p-3 rounded-lg text-xs font-medium text-center bg-red-100 text-red-600 block mb-4";
                    verifyMsg.classList.remove('hidden');
                }
            }
        } catch (e) { }
    }

    let isCheckingAppConfig = false;
    let _configFirstCall = true;
    function checkAppConfig(isLoginEvent = false) {
        if (isCheckingAppConfig) return;
        isCheckingAppConfig = true;
        const payload = {};
        if (currentSession && currentSession.email) {
            payload.email = currentSession.email;
        }
        if (deviceId) {
            payload.device_id = deviceId;
        }
        if (isLoginEvent) {
            payload.login = true;
        }
        if (typeof window !== 'undefined' && typeof window.IS_VIP_APP !== 'undefined') {
            payload.is_vip_app = !!window.IS_VIP_APP;
        }
        if (latestChatUserProfile && latestChatUserProfile.username) {
            payload.chat_username = latestChatUserProfile.username;
            if (latestChatUserProfile.province) {
                payload.chat_province = latestChatUserProfile.province;
            }
        }

        // Check if user is currently in chat group
        const contentBeranda = document.getElementById('content-beranda');
        const berandaContentGroup = document.getElementById('beranda-content-group');
        if (contentBeranda && !contentBeranda.classList.contains('hidden') &&
            berandaContentGroup && !berandaContentGroup.classList.contains('hidden')) {
            payload.is_in_chat_group = true;
        } else {
            payload.is_in_chat_group = false;
        }

        const nextChatMessage = pendingChatQueue.length > 0 ? pendingChatQueue[0] : '';
        if (nextChatMessage) {
            payload.chat_message = nextChatMessage;
        }

        if (window.currentPaymentReference) {
            payload.payment_reference = window.currentPaymentReference;
        }

        if (_configFirstCall) {
            payload.include_systeminfo = true;
            _configFirstCall = false;
        }

        // Boost quota is now merged into the config response (boost_data field).
        // No separate fetch needed — handled in the .then() below.

        fetch('/server/proxy.php?config=true', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(config => {
                if (config.error) {
                    console.error("Config Error:", config.error);
                    return;
                }
                if (nextChatMessage) {
                    pendingChatQueue.shift();
                }
                if (config.force_logout) {
                    handleForcedLogout(config.force_logout_reason);
                    return;
                }

                // Update Online Count & List
                if (config.online_count !== undefined) {
                    const countEl = document.getElementById('sidebar-online-count');
                    if (countEl) {
                        countEl.textContent = config.online_count;
                    }
                }
                if (config.online_users) {
                    currentOnlineUsers = config.online_users;
                }
                if (config.chat_online_users) {
                    currentChatOnlineUsers = config.chat_online_users;
                }
                if (Array.isArray(config.chat_messages)) {
                    latestChatMessages = config.chat_messages;
                }
                if (Array.isArray(config.banned_users)) {
                    latestBannedUsers = config.banned_users;
                }
                // Apply boost data merged from proxy config (eliminates separate boost_quota.php fetch)
                if (config.boost_data && typeof window.applyBoostData === 'function') {
                    window._boostFromConfig = true;
                    window.applyBoostData(config.boost_data);
                }
                // Immediately populate addon cache from config (eliminates addons_payment.php fetch)
                if (config.addons_data) {
                    window._addonPreload = config.addons_data;
                    if (typeof window.setAddonCache === 'function') {
                        window.setAddonCache(config.addons_data);
                    }
                    document.dispatchEvent(new CustomEvent('sulap:addons-ready'));
                }
                if (config.chat_user_profile && config.chat_user_profile.username) {
                    latestChatUserProfile = {
                        username: config.chat_user_profile.username,
                        province: config.chat_user_profile.province || ''
                    };
                    try {
                        window.dispatchEvent(new CustomEvent('chat:user-profile', { detail: config.chat_user_profile }));
                    } catch (e) { }
                }
                if (config.bot_settings) {
                    try {
                        window.dispatchEvent(new CustomEvent('bot:update', { detail: config.bot_settings }));
                    } catch (e) { }
                }
                try {
                    window.dispatchEvent(new CustomEvent('online:update', {
                        detail: {
                            count: config.online_count || 0,
                            users: currentOnlineUsers
                        }
                    }));
                    window.dispatchEvent(new CustomEvent('chat-online:update', {
                        detail: {
                            count: config.chat_online_count || 0,
                            users: currentChatOnlineUsers
                        }
                    }));
                    window.dispatchEvent(new CustomEvent('chat:update', {
                        detail: {
                            messages: latestChatMessages
                        }
                    }));
                    window.dispatchEvent(new CustomEvent('banned:update', {
                        detail: {
                            users: latestBannedUsers
                        }
                    }));
                } catch (e) { }
                if (nextChatMessage && config.chat_rejected) {
                    try {
                        window.dispatchEvent(new CustomEvent('chat:rejected', {
                            detail: config.chat_rejected
                        }));
                    } catch (e) { }
                }

                // Maintenance Mode / Update Logic
                const updatePending = localStorage.getItem('sulapfoto_update_pending') === 'true';
                
                if (config.refresh_app === true || updatePending) {
                    if (config.refresh_app === true) {
                        localStorage.setItem('sulapfoto_update_pending', 'true');
                    }

                    let maintenanceModal = document.getElementById('maintenance-mode-modal');
                    if (!maintenanceModal) {
                        maintenanceModal = document.createElement('div');
                        maintenanceModal.id = 'maintenance-mode-modal';
                        maintenanceModal.className = 'fixed bottom-4 right-4 z-[100] w-80 bg-white/95 backdrop-blur-md border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-4 animate-in slide-in-from-bottom-5 duration-500';
                        maintenanceModal.innerHTML = `
                                    <div class="flex items-start gap-3">
                                        <div class="flex-1">
                                            <h3 class="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                                                <i data-lucide="refresh-cw" class="w-4 h-4 text-teal-500"></i>
                                                Pembaruan Sistem
                                            </h3>
                                            <p class="text-xs text-slate-500 leading-relaxed mb-3">Sulap Foto telah melakukan pembaruan sistem, silahkan klik refresh.</p>
                                            <button id="btn-force-refresh" class="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-slate-200 active:scale-95 flex items-center justify-center gap-2">
                                                <span>Refresh Sekarang</span>
                                            </button>
                                        </div>
                                    </div>
                                `;
                        document.body.appendChild(maintenanceModal);
                        if (typeof lucide !== 'undefined') lucide.createIcons();

                        // Add click handler
                        const refreshBtn = maintenanceModal.querySelector('#btn-force-refresh');
                        if (refreshBtn) {
                            refreshBtn.addEventListener('click', () => {
                                localStorage.removeItem('sulapfoto_update_pending');
                                
                                // Hard Reload Attempt
                                try {
                                    // Append timestamp to force bypass cache
                                    const url = new URL(window.location.href);
                                    url.searchParams.set('_ts', Date.now());
                                    window.location.href = url.toString();
                                } catch (e) {
                                    window.location.reload();
                                }
                            });
                        }
                    }
                } else {
                    // Remove if exists and no update pending
                    const maintenanceModal = document.getElementById('maintenance-mode-modal');
                    if (maintenanceModal) {
                        maintenanceModal.remove();
                    }
                }
                if (configPollInterval && config.refresh_app !== true) {
                }


                if (config.system_info && typeof config.system_info === 'object') {
                    if (typeof window.updateSystemInfoUI === 'function') {
                        window.updateSystemInfoUI(config.system_info);
                    }
                    if (Object.keys(config.system_info).length > 0) {
                        window.SYSTEM_INFO = config.system_info;
                        document.dispatchEvent(new CustomEvent('systemInfoUpdated', { detail: config.system_info }));
                    }
                }
                if (typeof config.ai_video_online === 'boolean') {
                    window.AI_VIDEO_ONLINE = config.ai_video_online;
                    const badge = document.getElementById('ai-video-status-badge');
                    if (badge) {
                        badge.textContent = config.ai_video_online ? 'Online' : 'Offline';
                        badge.style.setProperty('background', config.ai_video_online
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 'important');
                    }
                    if (typeof window._updateVideoServerStatus === 'function') {
                        window._updateVideoServerStatus(config.ai_video_online);
                    }
                }
                if (typeof config.sulap_musik_online === 'boolean') {
                    window.SULAP_MUSIK_ONLINE = config.sulap_musik_online;
                    document.dispatchEvent(new CustomEvent('sulap:musik-status', { detail: { online: config.sulap_musik_online } }));
                }
                if (config.spin_winners !== undefined) {
                    window.SPIN_WINNERS      = config.spin_winners;
                    window.SPIN_MAIN_WINNERS = config.spin_main_winners || [];
                    document.dispatchEvent(new CustomEvent('sulap:spin-winners', { detail: { winners: config.spin_winners, main_winners: config.spin_main_winners || [] } }));
                }
                if (config.spin_status) {
                    window.SPIN_STATUS = config.spin_status;
                    document.dispatchEvent(new CustomEvent('sulap:spin-status', { detail: config.spin_status }));
                }
                if (config.payment_status && typeof window.handlePaymentStatusUpdate === 'function') {
                    window.handlePaymentStatusUpdate(config.payment_status);
                }
                if (config.assistant) {
                    window.assistantMessages = [config.assistant];
                    // Dispatch event for assistant.js to pick up
                    window.dispatchEvent(new CustomEvent('assistant:messages-updated'));
                }

                // Map DB columns to logic
                const remoteVersion = config.version_sulapfoto;
                const isVip = document.body.dataset.app === 'vip' || (window.IS_VIP_APP === true);
                let updateUrl = (isVip ? config.url_sulapfotovip : config.url_sulapfotopro) || '#';

                if (updateUrl !== '#' && !updateUrl.startsWith('http')) {
                    updateUrl = 'https://' + updateUrl;
                }

                if (remoteVersion && String(remoteVersion) !== String(CURRENT_APP_VERSION)) {
                    let modal = document.getElementById('blocking-update-modal');
                    if (!modal) {
                        modal = document.createElement('div');
                        modal.id = 'blocking-update-modal';
                        modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300';
                        document.body.appendChild(modal);
                        document.body.style.overflow = 'hidden';
                        if (typeof autoLogoutGroupChat === 'function') {
                            autoLogoutGroupChat();
                        }
                    }

                    modal.innerHTML = `
                                 <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-8 shadow-2xl text-center">
                                    <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-teal-500/20 mb-6 animate-bounce">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rocket h-10 w-10 text-teal-400"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
                                    </div>
                                    <h3 class="text-2xl font-bold text-white mb-2">Update Tersedia!</h3>
                                    <p class="text-slate-400 mb-8 leading-relaxed text-sm">
                                        Versi aplikasi anda (v${CURRENT_APP_VERSION}) sudah usang. <br/>
                                        Mohon update ke versi terbaru (v${remoteVersion}) untuk melanjutkan.
                                    </p>
                                    <a href="${updateUrl}" target="_blank" class="block w-full text-center bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-teal-500/20 transition-all transform hover:scale-[1.02] active:scale-95">
                                        Update Sekarang
                                    </a>
                                </div>
                            `;
                    // Re-init lucide icons if available
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                } else {
                    const modal = document.getElementById('blocking-update-modal');
                    if (modal) {
                        modal.remove();
                        document.body.style.overflow = '';
                    }
                }
            })
            .catch(e => console.error("Config check error:", e))
            .finally(() => {
                isCheckingAppConfig = false;
            });
    }

    // Call it
    checkAppConfig();
    if (configPollInterval) clearInterval(configPollInterval);
    configPollInterval = setInterval(checkAppConfig, 5000);

    window.addEventListener('chat:profile-selected', (e) => {
        const detail = e && e.detail ? e.detail : {};
        const username = typeof detail.username === 'string' ? detail.username.trim() : '';
        const province = typeof detail.province === 'string' ? detail.province.trim() : '';
        if (!username) return;
        latestChatUserProfile = {
            username,
            province
        };
        checkAppConfig(false);
    });

    // Add listener for Online Users Sidebar Button
    const onlineUsersBtn = document.getElementById('sidebar-online-users-btn');
    if (onlineUsersBtn) {
        onlineUsersBtn.addEventListener('click', () => {
            const modal = document.getElementById('sidebar-online-modal');
            const closeBtn = document.getElementById('sidebar-online-modal-close');
            const listEl = document.getElementById('sidebar-online-list');
            if (!modal || !listEl) return;
            if (modal.dataset.bound !== '1') {
                modal.dataset.bound = '1';
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        modal.classList.remove('active');
                    });
                }
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.classList.remove('active');
                    }
                });
            }
            listEl.innerHTML = '';
            if (currentOnlineUsers.length === 0) {
                listEl.innerHTML = '<p class="text-center text-sm text-gray-500 py-4">Tidak ada pengguna online.</p>';
            } else {
                currentOnlineUsers.forEach(user => {
                    const item = document.createElement('div');
                    item.className = 'sidebar-online-item';
                    const avatar = document.createElement('div');
                    avatar.className = 'sidebar-online-avatar';
                    const initial = (user.email || 'U').charAt(0).toUpperCase();
                    avatar.textContent = initial;
                    const info = document.createElement('div');
                    info.className = 'sidebar-online-info';
                    const emailEl = document.createElement('div');
                    emailEl.className = 'sidebar-online-email';
                    emailEl.textContent = user.email;
                    info.appendChild(emailEl);
                    const username = typeof user.username === 'string' ? user.username.trim() : '';
                    const province = typeof user.province === 'string' ? user.province.trim() : '';
                    if (username || province) {
                        const tags = document.createElement('div');
                        tags.className = 'sidebar-online-tags';
                        if (username) {
                            const tag = document.createElement('span');
                            tag.className = 'sidebar-online-tag';
                            tag.textContent = username;
                            tags.appendChild(tag);
                        }
                        if (province) {
                            const tag = document.createElement('span');
                            tag.className = 'sidebar-online-tag secondary';
                            tag.textContent = province;
                            tags.appendChild(tag);
                        }
                        info.appendChild(tags);
                    }
                    const meta = document.createElement('div');
                    meta.className = 'sidebar-online-meta';
                    if (user.is_vip) {
                        const badge = document.createElement('span');
                        badge.className = 'sidebar-online-badge vip';
                        badge.textContent = 'VIP';
                        meta.appendChild(badge);
                    }
                    item.appendChild(avatar);
                    item.appendChild(info);
                    if (meta.childNodes.length > 0) {
                        item.appendChild(meta);
                    }
                    listEl.appendChild(item);
                });
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
            modal.classList.add('active');
        });
    }

    const database = null;
    
    const verifyOverlay = document.getElementById('verification-overlay');
    const verifyForm = document.getElementById('verification-form');
    const verifyEmailInput = document.getElementById('verification-email');
    const verifyPasswordContainer = document.getElementById('verification-password-container');
    const verifyPasswordInput = document.getElementById('verification-password');

    if (verifyEmailInput && verifyPasswordContainer && verifyPasswordInput) {
        verifyEmailInput.addEventListener('input', () => {
            const email = verifyEmailInput.value.trim().toLowerCase();
            const adminEmailRaw = typeof window !== 'undefined' && typeof window.ADMIN_EMAIL === 'string' ? window.ADMIN_EMAIL : 'pichfpv@gmail.com';
            const adminEmailList = adminEmailRaw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
            if (adminEmailList.includes(email)) {
                verifyPasswordContainer.classList.remove('hidden');
                verifyPasswordInput.setAttribute('required', 'true');
            } else {
                verifyPasswordContainer.classList.add('hidden');
                verifyPasswordInput.removeAttribute('required');
                verifyPasswordInput.value = '';
            }
        });
    }

    const verifyBtn = document.getElementById('verification-btn');
    const verifyMsg = document.getElementById('verification-message');
    const bodyEl = document.body;
    const bannedEmailRaw = typeof window !== 'undefined' && typeof window.BANNED_EMAIL === 'string' ? window.BANNED_EMAIL : '';
    const bannedEmailList = bannedEmailRaw.split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
    const isBannedEmail = (email) => {
        if (!email) return false;
        const normalized = String(email).trim().toLowerCase();
        if (!normalized) return false;
        return bannedEmailList.some((item) => {
            if (!item) return false;
            if (item.includes('@')) return normalized === item;
            return normalized.endsWith(`@${item}`) || normalized === item;
        });
    };

    function collectStrings(obj, acc = []) {
        if (obj == null) return acc;
        const t = typeof obj;
        if (t === 'string') {
            acc.push(obj);
            return acc;
        }
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) collectStrings(obj[i], acc);
            return acc;
        }
        if (t === 'object') {
            const keys = Object.keys(obj);
            for (let i = 0; i < keys.length; i++) {
                const k = keys[i];
                collectStrings(obj[k], acc);
            }
        }
        return acc;
    }
    function isVipProduct(data) {
        const all = collectStrings(data).join(' ').toLowerCase();
        if (!all) return false;
        if (all.includes('sulap foto vip')) return true;
        if (/\bvip\b/.test(all)) return true;
        return false;
    }
    function isVipRoute() {
        if (typeof window === 'undefined') return false;
        const path = String(window.location && window.location.pathname ? window.location.pathname : '');
        if (path === '/vipacc' || path === '/vipacc/') return true;
        if (path.endsWith('/vipacc') || path.includes('/vipacc/')) return true;
        const search = String(window.location && window.location.search ? window.location.search : '');
        if (search.includes('app=vipacc')) return true;
        return false;
    }
    function shouldRedirectVip(data) {
        if (!isVipProduct(data)) return false;
        if (isVipRoute()) return false;
        return true;
    }
    const verifyOrderAccess = (data) => {
        console.log('Verifying access for data:', data);
        // New API logic
        if (data && data.canAccess === true) {
            return true;
        }
        return false;
    };

    const monitorSession = (email) => {
        currentSession.email = email;

        const profileSection = document.getElementById('user-profile-section');
        const emailDisplay = document.getElementById('user-display-email');
        let toggleBtn = document.getElementById('toggle-email-visibility');

        if (profileSection && emailDisplay) {
            const updateVisibility = () => {
                const isHidden = localStorage.getItem('sulapfoto_hide_email') === 'true';
                const currentBtn = document.getElementById('toggle-email-visibility');
                
                if (isHidden) {
                    const parts = email.split('@');
                    const domain = parts.length === 2 ? parts[1] : 'sulapfoto.com';
                    emailDisplay.textContent = `****@${domain}`;
                    if (currentBtn) currentBtn.innerHTML = '<i data-lucide="eye-off" class="w-3 h-3"></i>';
                } else {
                    emailDisplay.textContent = email;
                    if (currentBtn) currentBtn.innerHTML = '<i data-lucide="eye" class="w-3 h-3"></i>';
                }
                
                if (typeof lucide !== 'undefined') lucide.createIcons();
            };

            if (toggleBtn) {
                // Clone to remove existing listeners (prevent duplicate listeners if re-initialized)
                const newBtn = toggleBtn.cloneNode(true);
                toggleBtn.parentNode.replaceChild(newBtn, toggleBtn);
                toggleBtn = newBtn;
                
                toggleBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const isHidden = localStorage.getItem('sulapfoto_hide_email') === 'true';
                    localStorage.setItem('sulapfoto_hide_email', (!isHidden).toString());
                    updateVisibility();
                });
            }

            // Initialize visibility state
            updateVisibility();

            emailDisplay.title = email;
            profileSection.classList.remove('hidden');
        }

        // SSE: koneksi push untuk deteksi multi-login instan (seperti SeeDance2)
        if (_sseConn) { try { _sseConn.close(); } catch (e) {} _sseConn = null; }
        if (email && deviceId) {
            try {
                _sseConn = new EventSource(
                    '/server/sse.php?email=' + encodeURIComponent(email) +
                    '&device_id=' + encodeURIComponent(deviceId)
                );
                _sseConn.addEventListener('session_expired', function () {
                    handleForcedLogout('Akun ini sedang digunakan di perangkat lain.');
                });
                _sseConn.addEventListener('timeout', function () {
                    // Server tutup koneksi setelah ~110 detik, EventSource akan auto-reconnect
                });
                _sseConn.onerror = function () {};
            } catch (e) {}
        }
    };

    if (shouldSkipVerification && foundEmail) {
        if (isBannedEmail(foundEmail)) {
            try {
                localStorage.removeItem('sulapfoto_verified_email');
                localStorage.removeItem('sulapfoto_verified_password');
            } catch (e) { }
            shouldSkipVerification = false;
        }
    }

    if (shouldSkipVerification && foundEmail) {
        console.log('Memulai proses auto-login dengan email:', foundEmail);
        try {
            const foundPassword = localStorage.getItem('sulapfoto_verified_password') || '';
            let response;
            if (foundEmail.trim().toLowerCase() === 'pichfpv@gmail.com') {
                response = await fetch(`${window.location.origin}/server/proxy.php?email`, {
                    method: 'POST',
                    cache: "no-store",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: foundEmail, password: foundPassword })
                });
            } else {
                response = await fetch(`${window.location.origin}/server/proxy.php?email`, {
                    method: 'POST',
                    cache: "no-store",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: foundEmail, password: foundPassword })
                });
            }

            const data = await response.json();
            console.log('Response dari API check:', data);

            if (verifyOrderAccess(data)) {
                try {
                    if (shouldRedirectVip(data)) {
                        window.location.href = 'vipacc';
                        return;
                    }
                } catch (e) { }
                // Session logic removed

                loadFaceApiScript();

                // Auto-pause music logic removed

                monitorSession(foundEmail);
                if (typeof checkAppConfig === 'function') {
                    checkAppConfig(true);
                }

                if (verifyOverlay) {
                    verifyOverlay.style.display = 'none';
                }
                if (bodyEl) bodyEl.classList.remove('overflow-hidden');

                // Boost and addons come from config response — no separate fetches needed

                console.log('Auto-login berhasil dengan email:', foundEmail);
                shouldSkipVerification = true;
            } else {
                console.log('Auto-login gagal: API tidak memberikan akses');
                console.log('Response data:', data);
                shouldSkipVerification = false;
            }
        } catch (error) {
            console.error('Auto-login error:', error);
            shouldSkipVerification = false;
        }
    } else {
        console.log('Auto-login tidak dilakukan - shouldSkipVerification:', shouldSkipVerification, 'foundEmail:', foundEmail);
    }

    if (!shouldSkipVerification && verifyOverlay) {
        verifyOverlay.style.display = 'flex';
        bodyEl.classList.add('overflow-hidden');


        if (foundEmail && verifyEmailInput) {
            verifyEmailInput.value = foundEmail;
            console.log('Email di-auto-fill ke form verifikasi dari localStorage:', foundEmail);

            if (isBannedEmail(foundEmail)) {
                if (verifyMsg) {
                    verifyMsg.textContent = "Email ini diblokir dari akses aplikasi.";
                    verifyMsg.className = "p-3 rounded-lg text-xs font-medium text-center bg-red-100 text-red-600 block mb-4";
                    verifyMsg.classList.remove('hidden');
                }
                verifyEmailInput.classList.add('border-red-500', 'focus:ring-red-500');
            } else {
                // Auto-click verification logic simplified
                setTimeout(() => {
                    if (verifyBtn && !verifyBtn.disabled) {
                        verifyBtn.click();
                    }
                }, 500);
            }
        }


        // Auto-play music logic removed
    }

    if (verifyForm) {
        verifyForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = verifyEmailInput.value.trim().toLowerCase();
                if (!email) return;
                if (isBannedEmail(email)) {
                    verifyMsg.textContent = "Email ini diblokir dari akses aplikasi.";
                    verifyMsg.className = "p-3 rounded-lg text-xs font-medium text-center bg-red-100 text-red-600 block mb-4";
                    verifyMsg.classList.remove('hidden');
                    verifyEmailInput.classList.add('border-red-500', 'focus:ring-red-500');
                    return;
                }

                const originalBtnContent = verifyBtn.innerHTML;
                verifyBtn.disabled = true;
                verifyBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Memeriksa...</span>`;
                verifyMsg.classList.add('hidden');
                verifyEmailInput.classList.remove('border-red-500', 'focus:ring-red-500');

                try {
                    const password = verifyPasswordInput ? verifyPasswordInput.value.trim() : '';
                    let response;
                    if (email.trim().toLowerCase() === 'pichfpv@gmail.com') {
                        response = await fetch(`${window.location.origin}/server/proxy.php?email`, {
                            method: 'POST',
                            cache: "no-store",
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: email, password: password })
                        });
                    } else {
                        response = await fetch(`${window.location.origin}/server/proxy.php?email`, {
                            method: 'POST',
                            cache: "no-store",
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: email, password: password })
                        });
                    }

                    const data = await response.json();

                    if (verifyOrderAccess(data)) {
                        localStorage.setItem('sulapfoto_verified_email', email);
                        if (password) {
                            localStorage.setItem('sulapfoto_verified_password', password);
                        } else {
                            localStorage.removeItem('sulapfoto_verified_password');
                        }
                        console.log('Email disimpan ke localStorage:', email);

                        try {
                            if (shouldRedirectVip(data)) {
                                verifyMsg.textContent = "Akses VIP terdeteksi, mengalihkan ke VIP...";
                                verifyMsg.className = "p-3 rounded-lg text-xs font-medium text-center bg-green-100 text-green-700 animate-pulse block mb-4";
                                verifyMsg.classList.remove('hidden');
                                window.location.href = 'vipacc';
                                return;
                            }
                        } catch (e) { }

                        // Session logic removed

                        verifyMsg.textContent = "Akses Diterima! Mengalihkan...";
                        verifyMsg.className = "p-3 rounded-lg text-xs font-medium text-center bg-green-100 text-green-700 animate-pulse block mb-4";
                        verifyMsg.classList.remove('hidden');

                        loadFaceApiScript();

                        // Manual login auto-pause logic removed

                        monitorSession(email);
                        if (typeof checkAppConfig === 'function') {
                            checkAppConfig(true);
                        }

                        // Boost and addons come from config response — no separate fetches needed

                        // Addon checks are triggered via sulap:addons-ready event (fired from config handler)

                        setTimeout(() => {
                            verifyOverlay.classList.add('opacity-0', 'scale-110');
                            bodyEl.classList.remove('overflow-hidden');
                            setTimeout(() => verifyOverlay.style.display = 'none', 600);
                        }, 1000);

                    } else {
                        throw new Error(data.message || "Email tidak terdaftar atau tidak memiliki akses.");
                    }

                } catch (error) {
                    console.error("Verification Error:", error);
                    verifyMsg.textContent = error.message || "Terjadi kesalahan koneksi. Coba lagi.";
                    verifyMsg.className = "p-3 rounded-lg text-xs font-medium text-center bg-red-100 text-red-600 block mb-4";
                    verifyMsg.classList.remove('hidden');
                    verifyEmailInput.classList.add('border-red-500', 'focus:ring-red-500');

                    verifyForm.classList.add('translate-x-2');
                    setTimeout(() => verifyForm.classList.remove('translate-x-2'), 100);
                    setTimeout(() => verifyForm.classList.add('-translate-x-2'), 200);
                    setTimeout(() => verifyForm.classList.remove('-translate-x-2'), 300);

                    verifyBtn.disabled = false;
                    verifyBtn.innerHTML = originalBtnContent;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
        });
    }


    document.addEventListener('click', async (e) => {
        const logoutBtn = e.target.closest('#btn-logout');
        if (logoutBtn) {
            console.log('Logout button clicked');
            e.preventDefault();
            e.stopPropagation();


            const originalContent = logoutBtn.innerHTML;
            logoutBtn.innerHTML = '<span class="animate-pulse">Keluar...</span>';
            logoutBtn.disabled = true;

            console.log('Starting logout process...');

            try {
                // Session cleanup removed
                localStorage.removeItem('sulapfoto_verified_email');
                localStorage.removeItem('sulapfoto_verified_password');
            } catch (err) {
                console.error("Logout cleanup error:", err);
            } finally {
                if (window.autoLogoutGroupChat) window.autoLogoutGroupChat();

                currentSession.email = null;

                if (verifyOverlay) {
                    verifyOverlay.style.display = 'flex';
                    setTimeout(() => {
                        verifyOverlay.classList.remove('opacity-0', 'pointer-events-none');
                    }, 50);

                    // Logout auto-play logic removed
                }
                if (bodyEl) bodyEl.classList.add('overflow-hidden');


                const sidebar = document.querySelector('aside');
                if (sidebar && window.innerWidth < 1024) {
                    sidebar.classList.add('-translate-x-full');
                    const overlay = document.getElementById('sidebar-overlay');
                    if (overlay) overlay.classList.remove('visible');
                }

                if (logoutBtn) {
                    logoutBtn.innerHTML = originalContent;
                    logoutBtn.disabled = false;
                }


                if (verifyBtn) {
                    verifyBtn.disabled = false;
                    verifyBtn.innerHTML = verifyBtn.innerHTML.includes('Memeriksa') ? '<i data-lucide="log-in"></i><span class="ml-2">Masuk</span>' : verifyBtn.innerHTML;
                }
                if (verifyEmailInput) {
                    verifyEmailInput.value = '';
                    verifyEmailInput.disabled = false;
                }
                if (verifyForm) {
                    verifyForm.classList.remove('translate-x-2', '-translate-x-2');
                }
                if (verifyMsg) {
                    verifyMsg.classList.add('hidden');
                }
            }
        }
    });

    async function _checkQuotaInternal(count) {
        return true;
    }

    async function _updateQuotaInternal(count = 1) {
        // No-op
    }

    const fbReelUrls = []; // Not used

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        if (!navigator.onLine) {
            return Promise.reject(new Error("Tidak ada koneksi internet."));
        }

        const response = await originalFetch(...args);

        if (response.status === 401 || response.status === 403) {
            let errorMsg = `Request failed: ${response.status}`;
            try {
                const errText = await response.clone().text();
                try {
                    const errJson = JSON.parse(errText);
                    const possibleMsg = errJson.error?.message || errJson.error || errJson.message;
                    if (possibleMsg) {
                        errorMsg = typeof possibleMsg === 'object' ? JSON.stringify(possibleMsg) : possibleMsg;
                    } else if (errText) {
                        errorMsg = errText;
                    }
                } catch {
                    if (errText) errorMsg = errText;
                }
            } catch (e) {}
            return Promise.reject(new Error(errorMsg));
        }

        return response;
    };

    function showQuotaLimitModal() {
        console.log("Quota limit modal disabled");
    }



    // POV Tangan logic moved to js/pov-tangan.js
    const videoModalBackdrop = document.getElementById('video-modal-backdrop');
    const videoModalContentWrapper = document.getElementById('video-modal-content-wrapper');
    function showVideoModal(videoSrc) {
        let finalVideoSrc = videoSrc.replace('muted=false', 'muted=true');
        if (!finalVideoSrc.includes('muted=')) {
            finalVideoSrc += '&muted=true';
        }
        
        const isLandscapeVideo = finalVideoSrc.includes('51b88231-18f8-40fb-8022-b73ed6ffd110') || 
                                  finalVideoSrc.includes('f11a9ae3-c795-452c-b49b-930f19a1479e') ||
                                  finalVideoSrc.includes('53a92576-1048-45bb-8ec6-1064c03d62f9');
        const paddingTop = isLandscapeVideo ? '75.21%' : '133.33%';
        
        if (isLandscapeVideo) {
            videoModalContentWrapper.className = 'relative w-full max-w-4xl';
            videoModalBackdrop.className = 'fixed inset-0 bg-black/80 z-[60] flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-300';
        } else {
            videoModalContentWrapper.className = 'relative w-full max-w-sm';
            videoModalBackdrop.className = 'fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 opacity-0 pointer-events-none transition-opacity duration-300';
        }
        
        const modalContentHTML = `
                <div id="video-modal-container" style="position:relative; padding-top:${paddingTop}; border-radius: 0.75rem; overflow: hidden; background-color: black;">
                    <iframe 
                        src="${finalVideoSrc}" 
                        loading="lazy" 
                        style="border:0; position:absolute; top:0; height:100%; width:100%;" 
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                        >
                    </iframe>
                </div>
                <button id="video-modal-close-btn" class="absolute -top-2 -right-2 text-white bg-black/75 rounded-full p-1.5 hover:bg-black/90 transition-colors z-10 shadow-lg">
                    <i data-lucide="x" class="w-6 h-6"></i>
                </button>
            `;
        videoModalContentWrapper.innerHTML = modalContentHTML;
        lucide.createIcons();
        document.getElementById('video-modal-close-btn').addEventListener('click', hideVideoModal);
        videoModalBackdrop.classList.remove('opacity-0', 'pointer-events-none');
    }
    function hideVideoModal() {
        videoModalBackdrop.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => {
            videoModalContentWrapper.innerHTML = '';
        }, 300);
    }
    if (videoModalBackdrop) {
        videoModalBackdrop.addEventListener('click', (e) => {
            if (e.target === videoModalBackdrop) {
                hideVideoModal();
            }
        });
    }
    const allTutorialButtons = document.querySelectorAll('.tutorial-btn');
    allTutorialButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const videoSrc = event.currentTarget.dataset.videoSrc;
            if (videoSrc && !videoSrc.includes('PLACEHOLDER')) {
                showVideoModal(videoSrc);
            } else {
                alert('Tutorial untuk fitur ini belum tersedia.');
            }
        });
    });

    const berandaTabAssistant = document.getElementById('beranda-tab-assistant');
    const berandaTabGroup = document.getElementById('beranda-tab-group');
    const berandaContentAssistant = document.getElementById('beranda-content-assistant');
    const berandaContentGroup = document.getElementById('beranda-content-group');
    const berandaDesktopQuery = window.matchMedia('(min-width: 1024px)');
    let berandaGroupInitialized = false;
    const sidebarToggle = document.getElementById('mobile-sidebar-toggle');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    const sidebarToggleIcon = document.getElementById('sidebar-toggle-icon-wrapper');
    const sidebarTooltip = document.getElementById('sidebar-tooltip');
    const sidebar = document.querySelector('aside');
    const shouldShowTooltip = sidebarTooltip && !localStorage.getItem('sidebarTooltipShown');
    function setupSidebarAutoScroll() {
        const sidebarNav = document.querySelector('aside nav');
        const sidebarButtons = document.querySelectorAll('.sidebar-btn');
        if (!sidebarNav || sidebarButtons.length === 0) {
            console.error("Elemen sidebar untuk auto-scroll tidak ditemukan.");
            return;
        }
        sidebarButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                if (sidebarNav.scrollHeight <= sidebarNav.clientHeight) {
                    return;
                }
                const clickedButton = event.currentTarget;
                const navVisibleHeight = sidebarNav.clientHeight;
                const buttonTopInVisibleArea = clickedButton.offsetTop - sidebarNav.scrollTop;
                const buttonHeight = clickedButton.offsetHeight;
                const triggerZoneUp = navVisibleHeight * 0.40;
                const triggerZoneDown = navVisibleHeight * 0.60;
                if (buttonTopInVisibleArea > triggerZoneDown) {
                    const isAtBottom = (sidebarNav.scrollHeight - sidebarNav.scrollTop - sidebarNav.clientHeight) < 1;
                    if (!isAtBottom) {
                        sidebarNav.scrollBy({
                            top: 80,
                            behavior: 'smooth'
                        });
                    }
                }
                else if ((buttonTopInVisibleArea + buttonHeight) < triggerZoneUp) {
                    const isAtTop = sidebarNav.scrollTop === 0;
                    if (!isAtTop) {
                        sidebarNav.scrollBy({
                            top: -80,
                            behavior: 'smooth'
                        });
                    }
                }
            });
        });
    }
    setupSidebarAutoScroll();
    if (shouldShowTooltip) {
        setTimeout(() => {
            sidebarTooltip.classList.add('visible');
        }, 800);
        localStorage.setItem('sidebarTooltipShown', 'true');
    }
    if (sidebar && sidebarToggle && sidebarBackdrop && sidebarToggleIcon) {
        const openSidebar = () => {
            sidebar.classList.remove('-translate-x-full');
            sidebarBackdrop.classList.remove('opacity-0', 'pointer-events-none');
            sidebarToggle.classList.add('translate-x-64');
            sidebarToggleIcon.classList.add('rotate-180');
        };
        const closeSidebar = () => {
            sidebar.classList.add('-translate-x-full');
            sidebarBackdrop.classList.add('opacity-0', 'pointer-events-none');
            sidebarToggle.classList.remove('translate-x-64');
            sidebarToggleIcon.classList.remove('rotate-180');
        };
        const toggleSidebar = () => {
            if (sidebar.classList.contains('-translate-x-full')) {
                openSidebar();
            } else {
                closeSidebar();
            }
        };
        sidebarToggle.addEventListener('click', () => {
            if (sidebarTooltip && sidebarTooltip.classList.contains('visible')) {
                sidebarTooltip.classList.remove('visible');
            }
            toggleSidebar();
        });
        sidebarBackdrop.addEventListener('click', closeSidebar);
        sidebar.querySelectorAll('.sidebar-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.innerWidth < 768 && !sidebar.classList.contains('-translate-x-full')) {
                    closeSidebar();
                }
            });
        });
    }

    // Chat helpers removed




    async function getVipStatusForCurrentSession() {
        return false;
    }


    async function checkUserIsBlocked() {
        if (!currentSession.email) return false;
        try {
            const safeEmail = currentSession.email.replace(/\./g, '_');

            const snapshot = await sessionDb.ref('sessions/' + safeEmail + '/isblock').once('value');
            if (snapshot.exists() && snapshot.val() === true) {
                return true;
            }

            const vipSnapshot = await sessionDb.ref('sessions/' + safeEmail + '/isblock').once('value');
            if (vipSnapshot.exists() && vipSnapshot.val() === true) {
                return true;
            }
            return false;
        } catch (e) {
            console.error('Error checking block status:', e);
            return false;
        }
    }



    async function loadUsernameAndProvinceFromSession() {
        if (!currentSession.email) return;
        try {
            const safeEmail = currentSession.email.replace(/\./g, '_');
            const snapshot = await sessionDb.ref('sessions/' + safeEmail).once('value');
            const sessionData = snapshot.val();

            if (sessionData) {

                if (sessionData.username && sessionData.province) {

                    return { username: sessionData.username, province: sessionData.province };
                }

                if (sessionData.groupChatInfo && sessionData.groupChatInfo.name && sessionData.groupChatInfo.province) {
                    await sessionDb.ref('sessions/' + safeEmail).update({
                        username: sessionData.groupChatInfo.name,
                        province: sessionData.groupChatInfo.province
                    });
                    return {
                        username: sessionData.groupChatInfo.name,
                        province: sessionData.groupChatInfo.province
                    };
                }
            }
        } catch (e) {
            console.error('Error loading username and province from session:', e);
        }
        return null;
    }
    const userColors = {};
    const colorPalette = [
        { solid: '#f97316', soft: '#ffedd5' },
        { solid: '#eab308', soft: '#fef9c3' },
        { solid: '#84cc16', soft: '#f0fdf4' },
        { solid: '#14b8a6', soft: '#f0fdfa' },
        { solid: '#06b6d4', soft: '#ecfeff' },
        { solid: '#3b82f6', soft: '#dbeafe' },
        { solid: '#8b5cf6', soft: '#f5f3ff' },
        { solid: '#d946ef', soft: '#fae8ff' },
        { solid: '#ec4899', soft: '#fce7f3' },
        { solid: '#64748b', soft: '#f1f5f9' },
    ];
    const adminColor = { solid: '#ef4444', soft: '#fee2e2' };
    const getUserColor = (name, province, isAdmin) => {
        if (isAdmin) return adminColor;
        const userKey = `${name}-${province}`;
        if (userColors[userKey]) {
            return userColors[userKey];
        }
        let hash = 0;
        for (let i = 0; i < userKey.length; i++) {
            hash = userKey.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colorIndex = Math.abs(hash % colorPalette.length);
        const color = colorPalette[colorIndex];
        userColors[userKey] = color;
        return color;
    };
    const provinceList = ["Aceh", "Bali", "Banten", "Bengkulu", "DI Yogyakarta", "DKI Jakarta", "Gorontalo", "Jambi", "Jawa Barat", "Jawa Tengah", "Jawa Timur", "Kalimantan Barat", "Kalimantan Selatan", "Kalimantan Tengah", "Kalimantan Timur", "Kalimantan Utara", "Kep. Bangka Belitung", "Kep. Riau", "Lampung", "Maluku", "Maluku Utara", "Nusa Tenggara Barat", "Nusa Tenggara Timur", "Papua", "Papua Barat", "Riau", "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tengah", "Sulawesi Tenggara", "Sulawesi Utara", "Sumatera Barat", "Sumatera Selatan", "Sumatera Utara"];


    const chatSound = new Howl({
        src: ['/chat.mp3'],
        volume: 1,
        preload: true
    });

    if (window.initChatGlobalNotification) {
        // Feature removed or pending MySQL implementation
    }

    function showBerandaDual() {
        if (berandaTabAssistant && berandaTabGroup) {
            berandaTabAssistant.classList.add('active');
            berandaTabGroup.classList.add('active');
        }
        if (berandaContentAssistant && berandaContentGroup) {
            berandaContentAssistant.classList.remove('hidden');
            berandaContentGroup.classList.remove('hidden');
        }
        if (window.initChatGroup && !berandaGroupInitialized) {
            window.initChatGroup({
                sessionDb,
                database,
                currentSession,
                getUserColor,
                checkUserIsBlocked,
                getVipStatusForCurrentSession,
                maskEmail,
                API_KEY,
                CHAT_URL
            });
            berandaGroupInitialized = true;
        }
    }

    function switchBerandaTab(tabName) {
        if (berandaDesktopQuery.matches) {
            showBerandaDual();
            return;
        }
        const isAssistantActive = tabName === 'assistant';
        if (berandaTabAssistant && berandaTabGroup) {
            berandaTabAssistant.classList.toggle('active', isAssistantActive);
            berandaTabGroup.classList.toggle('active', !isAssistantActive);
        }
        if (berandaContentAssistant && berandaContentGroup) {
            berandaContentAssistant.classList.toggle('hidden', !isAssistantActive);
            berandaContentGroup.classList.toggle('hidden', isAssistantActive);
        }
        if (tabName === 'group' && window.initChatGroup) {
            window.initChatGroup({
                sessionDb,
                database,
                currentSession,
                getUserColor,
                checkUserIsBlocked,
                getVipStatusForCurrentSession,
                maskEmail,
                API_KEY,
                CHAT_URL
            });
            berandaGroupInitialized = true;
        }
    }
    if (berandaTabAssistant) {
        berandaTabAssistant.addEventListener('click', () => switchBerandaTab('assistant'));
    }
    if (berandaTabGroup) {
        berandaTabGroup.addEventListener('click', () => switchBerandaTab('group'));
    }
    if (berandaDesktopQuery.matches) {
        showBerandaDual();
    } else {
        switchBerandaTab('group');
    }
    berandaDesktopQuery.addEventListener('change', (event) => {
        if (event.matches) {
            showBerandaDual();
        } else {
            switchBerandaTab('assistant');
        }
    });
    // Background music initialization removed
    window.backgroundMusic = null;
    const musicToggleBtn = null;
    let musicInitialized = false;

    function updateMusicIcon(isPlaying) {
        // Function kept to prevent reference errors if called elsewhere
    }

    function toggleMusic() {
        // Function kept to prevent reference errors if called elsewhere
    }

    // Music event listeners removed


    Howler.html5PoolSize = 50;

    const hoverSound = new Howl({
        src: ['/hover.mp3'],
        volume: 0.6,
        preload: true
    });

    const clickSound = new Howl({
        src: ['/click.mp3'],
        volume: 1,
        preload: true
    });

    const doneSound = new Howl({
        src: ['/done.mp3'],
        volume: 1,
        preload: true
    });

    const errorSound = new Howl({
        src: ['/error.mp3'],
        volume: 1,
        preload: true
    });

    // Crop Foto Module Initialization
    if (window.initCropFoto) {
        window.initCropFoto({
            document: document,
            setupImageUpload: setupImageUpload,
            lucide: window.lucide,
            doneSound: doneSound,
            errorSound: errorSound
        });
    }

  
    let lastHoverTime = 0;

    document.querySelectorAll('.sidebar-btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            const now = Date.now();

            if (now - lastHoverTime > 80) {

                hoverSound.stop();
                hoverSound.play();
                lastHoverTime = now;
            }
        });
        btn.addEventListener('click', () => {

            clickSound.stop();
            clickSound.play();
        });
    });
    window.getApiErrorMessage = async function (response) {
        const isNano = String(response?.url || '').includes('nanobananapro');
        try {
            const rawText = await response.clone().text().catch(() => '');
            let errorBody = {};
            if (rawText) {
                try {
                    errorBody = JSON.parse(rawText);
                } catch (e) {
                }
            }
            const message = (typeof errorBody.error === 'string' ? errorBody.error : errorBody.error?.message) || errorBody.message || '';
            const combinedMessage = String(message || rawText || '');
            if (isNano && combinedMessage.toLowerCase().includes('unauthorized')) {
                return 'Mohon Maaf, AI Model premium pada fitur ini sedang offline. Coba lagi beberapa saat.';
            }
            if (response.status === 401 || response.status === 403) {
                return message || 'Anda tidak bisa menggunakan fitur ini karena belum login, silahkan klik tombol signin/login/masuk di kanan atas halaman ini.';
            }
            if (combinedMessage.includes("Method doesn't allow unregistered callers")) {
                return 'Anda tidak bisa menggunakan fitur ini karena belum login, silahkan klik tombol signin/login/masuk di kanan atas halaman ini.';
            }
            if (combinedMessage.toLowerCase().includes("resource has been exhausted")) {
                return "Mohon Maaf, AI Model premium pada fitur ini melebihi limit, tunggu beberapa saat lagi.";
            }
            return combinedMessage || `Kode ${response.status}: Gagal Generate karena melanggar kebijakan. coba foto lain atau ganti intruksi..`;
        } catch (e) {
            if (isNano && (response.status === 401 || response.status === 403)) {
                return 'Mohon Maaf, AI Model premium pada fitur ini sedang offline. Coba lagi beberapa saat.';
            }
            if (response.status === 401 || response.status === 403) {
                return 'Anda tidak bisa menggunakan fitur ini karena belum login, silahkan klik tombol signin/login/masuk di kanan atas halaman ini.';
            }
            return `Error ${response.status}: ${response.statusText || 'Terjadi kesalahan tidak diketahui.'}`;
        }
    }
    function getAspectRatioClass(ratio) {
        const mapping = {
            '1:1': 'aspect-square',
            '3:4': 'aspect-[3/4]',
            '4:3': 'aspect-[4/3]',
            '16:9': 'aspect-video',
            '9:16': 'aspect-[9/16]'
        };
        return mapping[ratio] || 'aspect-square';
    }
    function setupOptionButtons(container, isCheckbox = false) {
        if (!container) return;
        container.addEventListener('click', (e) => {
            const clickedButton = e.target.closest('button');
            if (clickedButton && container.contains(clickedButton)) {
                if (isCheckbox) {
                    clickedButton.classList.toggle('selected');
                } else {
                    Array.from(container.children).forEach(btn => btn.classList.remove('selected'));
                    clickedButton.classList.add('selected');
                }
            }
        });
    }
    async function downloadDataURI(dataURI, filename) {
        try {
            const response = await fetch(dataURI);
            const blob = await response.blob();
            saveAs(blob, filename);
        } catch (error) {
            console.error("Gagal mengunduh file:", error);
            window.open(dataURI, '_blank');
        }
    }
    document.body.addEventListener('click', function (e) {
        const downloadButton = e.target.closest('.download-btn:not(.crsl-open-download-btn)');
        if (downloadButton) {
            e.preventDefault();
            const dataURI = downloadButton.getAttribute('href');
            const filename = downloadButton.getAttribute('download') || 'sulap-foto.png';
            if (dataURI && dataURI !== '#') downloadDataURI(dataURI, filename);
        }
        const crslIndividualDownloadBtn = e.target.closest('.crsl-individual-download-btn');
        if (crslIndividualDownloadBtn) {
            e.preventDefault();
            const dataURI = crslIndividualDownloadBtn.dataset.src;
            const filename = crslIndividualDownloadBtn.dataset.filename;
            if (dataURI && filename) downloadDataURI(dataURI, filename);
        }
    });
    const tabMapping = {
        'beranda': 'beranda',
        'addons': 'addons',
        'convert-images': 'convert-images',
        'vector-svg': 'vector-svg',
        'themes': 'themes',
        'sufo-gpt': 'sufo-gpt',
        'my-favorite': 'my-favorite',
        'super-book': 'super-book',
        'product': 'product-photography',
        'vto': 'virtual-try-on',
        'fashion': 'fashion',
        'pre-wedding': 'pre-wedding',
        'model': 'model-generator',
        'photographer-rental': 'photographer-rental',
        'desain-rumah': 'desain-rumah',
        'edit-foto': 'edit-foto',
        'perbaiki-foto': 'perbaiki-foto',
        'buat-banner': 'buat-banner',
        'bikin-carousel': 'bikin-carousel',
        'sketch-to-image': 'sketch-to-image',
        'art-karikatur': 'art-karikatur',
        'auto-rapi': 'auto-rapi',
        'desain-mockup': 'desain-mockup',
        'foto-miniatur': 'foto-miniatur',
        'menu-restoran': 'menu-restoran',
        'batik-tenun': 'batik-tenun',
        'lighting-shadows': 'lighting-shadows',
        'barbershop': 'barbershop',
        'face-swap': 'face-swap',
        'face-swap-3': 'face-swap-3',
        'foto-artis': 'foto-artis',
        'hapus-bg': 'hapus-bg',
        'hapus-objek': 'hapus-objek',
        'perluas-foto': 'perluas-foto',
        'pov-tangan': 'pov-tangan',
        'kamar-pas': 'kamar-pas',
        'retouch-wajah': 'retouch-wajah',
        'text-to-image': 'text-to-image',
        'business-card': 'business-card',
        'graduation-photo': 'graduation-photo',
        'create-logo': 'create-logo',
        'create-mascot': 'create-mascot',
        'photo-collage': 'photo-collage',
        'foto-polaroid': 'foto-polaroid',
        'video-thumbnail': 'video-thumbnail',
        'potret-cinta': 'potret-cinta',
        'size-produk': 'size-produk',
        'watermark': 'watermark',
        'age-filter': 'age-filter',
        'pov-selfie': 'pov-selfie',
        'wedding-2': 'wedding-2',
        'potret-cinta-2': 'potret-cinta-2',
        'crop-foto': 'crop-foto',
        'upscale-gambar': 'upscale-gambar',
        'hapus-bg-2': 'hapus-bg-2',
        'text-to-speech': 'text-to-speech',
        'cv-lamaran': 'cv-lamaran',
        'poster-flyer': 'poster-flyer',
        'infografis': 'infografis',
        'wedding-invitation': 'wedding-invitation',
        'video-generator': 'video-generator',
        'sulap-musik': 'sulap-musik',
        'idul-fitri': 'idul-fitri',
        'super-quote': 'super-quote',
        'baby-v2': 'baby-v2',
        'studio-keluarga': 'studio-keluarga',
        'food-photography': 'food-photography',
        'time-machine': 'time-machine',
        'gif-maker': 'gif-maker',
        'compress-images': 'compress-images',
        'blur-background': 'blur-background',
        'ganti-background': 'ganti-background',
        'meme-creator': 'meme-creator',
        'cover-buku': 'cover-buku',
        'anime-to-real': 'anime-to-real',
        'buat-topeng': 'buat-topeng',
        'gambar-ke-prompt': 'gambar-ke-prompt',
        'foto-olahraga': 'foto-olahraga',
        'ganti-cuaca': 'ganti-cuaca',
        'foto-clone': 'foto-clone',
        'foto-bawah-laut': 'foto-bawah-laut',
        'foto-360': 'foto-360',
        'pov-drone': 'pov-drone',
        'storyboard': 'storyboard',
        'foto-era-sejarah': 'foto-era-sejarah',
        'foto-zodiak': 'foto-zodiak',
    };
    window.SF_TAB_MAPPING = tabMapping;
    window.SF_TAB_MAPPING_INV = {};
    Object.keys(tabMapping).forEach((k) => {
        window.SF_TAB_MAPPING_INV[tabMapping[k]] = k;
    });
    function startDesainMockupIntent() {
        switchTab('desain-mockup', () => {
        });
    }
    const allSidebarBtns = document.querySelectorAll('.sidebar-btn');
    let previousAutoUpscaleState = null;
    function switchTab(tabKey, callback = () => { }) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const contentId = `content-${tabMapping[tabKey]}`;
        const newContent = document.getElementById(contentId);
        if (!newContent) return;
        const activeContent = document.querySelector('.tab-content-pane.is-active');
        if (activeContent === newContent) {
            callback();
            return;
        }
        
        // Handle Auto Upscale addon for sulap musik
        const previousTabKey = activeContent ? Object.keys(tabMapping).find(k => `content-${tabMapping[k]}` === activeContent.id) : null;
        
        // If leaving sulap musik, restore Auto Upscale state
        if (previousTabKey === 'sulap-musik' && previousAutoUpscaleState !== null) {
            localStorage.setItem('auto_upscale_enabled', previousAutoUpscaleState);
            if (typeof window.checkAutoUpscaleStatus === 'function') {
                window.checkAutoUpscaleStatus();
            }
            previousAutoUpscaleState = null;
        }
        
        // When entering addons tab: invalidate cache so status is always fresh
        if (tabKey === 'addons' && typeof window.invalidateAddonCache === 'function') {
            window.invalidateAddonCache();
            setTimeout(() => {
                const checks = [
                    'checkAutoUpscaleStatus','checkGifMakerStatus','checkCompressImagesStatus',
                    'checkConvertImagesStatus','checkMyFavoriteStatus','checkVectorSvgStatus',
                    'checkSufoGptStatus','checkThemesStatus','checkSuperBookStatus',
                    'checkTtsStatus','checkPrivateServerStatus','checkStoryboardStatus',
                    'checkMenuRestoranStatus','checkBatikTenunStatus','checkLightingShadowsStatus'
                ];
                checks.forEach(fn => { if (typeof window[fn] === 'function') window[fn](); });
            }, 50);
        }

        // If entering sulap musik, disable Auto Upscale
        if (tabKey === 'sulap-musik') {
            const currentState = localStorage.getItem('auto_upscale_enabled');
            if (currentState !== null) {
                previousAutoUpscaleState = currentState;
                localStorage.setItem('auto_upscale_enabled', 'false');
                if (typeof window.checkAutoUpscaleStatus === 'function') {
                    window.checkAutoUpscaleStatus();
                }
            }
        }
        
        allSidebarBtns.forEach(btn => btn.classList.remove('active'));
        document.getElementById(`tab-${tabMapping[tabKey]}`)?.classList.add('active');
        const mobileNavItem = document.getElementById(`mobile-nav-${tabMapping[tabKey]}`);
        if (activeContent) {
            // Check if animations are disabled
            const style = window.getComputedStyle(activeContent);
            const isAnimationDisabled = style.animationName === 'none' || style.animationDuration === '0s';

            if (isAnimationDisabled) {
                activeContent.classList.remove('is-active', 'is-exiting');
                activeContent.classList.add('hidden');
                newContent.classList.remove('hidden');
                newContent.classList.add('is-active');
                callback();
            } else {
                activeContent.classList.add('is-exiting');
                activeContent.addEventListener('animationend', () => {
                    activeContent.classList.remove('is-active', 'is-exiting');
                    activeContent.classList.add('hidden');
                    newContent.classList.remove('hidden');
                    newContent.classList.add('is-active');
                    callback();
                }, { once: true });
            }
        } else {
            newContent.classList.remove('hidden');
            newContent.classList.add('is-active');
            callback();
        }
    }
    window.switchTab = switchTab;
    // Re-apply Qwen 16:9 lock + auto-select whenever a page is opened
    const _origSwitchTab = switchTab;
    switchTab = function(tabKey, callback = () => {}) {
        _origSwitchTab(tabKey, function() {
            callback();
            if (typeof window.applyQwenAspectRatioLock === 'function') window.applyQwenAspectRatioLock();
        });
    };
    window.switchTab = switchTab;
    for (const key in tabMapping) {
        const tabElement = document.getElementById(`tab-${tabMapping[key]}`);
        if (tabElement && !tabElement.hasAttribute('data-listener-added')) {
            tabElement.addEventListener('click', () => {
                switchTab(key);
            });
            tabElement.setAttribute('data-listener-added', 'true');
        }
    }
    const modelSubTabs = {
        'subtab-model-create': 'create',
        'subtab-model-repose': 'repose',
        'subtab-model-angle': 'angle'
    };
    Object.entries(modelSubTabs).forEach(([id, tabKey]) => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('active'));
            switchTab('model');
            switchModelTab(tabKey);
            e.currentTarget.classList.add('active');
        });
    });
    const productToggle = document.getElementById('nav-product-toggle');
    const productSubmenu = document.getElementById('submenu-product');
    if (productToggle && productSubmenu) {
        productToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const isOpen = productToggle.classList.toggle('open');
            productSubmenu.classList.toggle('hidden', !isOpen);
            if (isOpen) {
                switchTab('vto');
                switchVtoTab('product-only');
            }
        });
        const productSubTabs = {
            'subtab-product-only': 'product-only',
            'subtab-product-model': 'product-model'
        };
        Object.entries(productSubTabs).forEach(([id, subKey]) => {
            document.getElementById(id)?.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('active'));
                switchTab('vto');
                switchVtoTab(subKey);
                e.currentTarget.classList.add('active');
            });
        });
    }
    const photographerSubTabs = {
        'subtab-baby': 'baby',
        'subtab-kids': 'kids',
        'subtab-umrah': 'umrah',
        'subtab-passport': 'passport',
        'subtab-maternity': 'maternity'
    };
    Object.entries(photographerSubTabs).forEach(([id, tabKey]) => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('active'));
            switchTab('photographer-rental');
            switchPhotographerTab(tabKey);
            e.currentTarget.classList.add('active');
        });
    });
    document.getElementById(`tab-${tabMapping['foto-artis']}`)?.addEventListener('click', () => switchTab('foto-artis'));
    document.getElementById(`tab-${tabMapping['hapus-bg']}`)?.addEventListener('click', () => switchTab('hapus-bg'));
    document.getElementById(`tab-${tabMapping['pov-selfie']}`)?.addEventListener('click', () => switchTab('pov-selfie'));
    const universalModal = document.getElementById('universal-modal');
    const imagePreviewModal = document.getElementById('image-preview-modal');
    let previewModalImages = [];
    let previewModalIndex = -1;
    let activePreviewModal = 'default';
    function collectPreviewSources() {
        const sources = [];
        const addSource = (url) => {
            if (url && !sources.includes(url)) sources.push(url);
        };
        document.querySelectorAll('.view-btn[data-img-src]').forEach(btn => addSource(btn.dataset.imgSrc));
        document.querySelectorAll('[onclick*="openTiImagePreview"]').forEach(el => {
            const handler = el.getAttribute('onclick') || '';
            const match = handler.match(/openTiImagePreview\('([^']+)'\)/);
            if (match) addSource(match[1]);
        });
        return sources;
    }
    function updatePreviewNavButtons() {
        const prevBtnId = activePreviewModal === 'ti' ? 'ti-preview-prev' : 'preview-modal-prev';
        const nextBtnId = activePreviewModal === 'ti' ? 'ti-preview-next' : 'preview-modal-next';
        const prevBtn = document.getElementById(prevBtnId);
        const nextBtn = document.getElementById(nextBtnId);
        const hasMultiple = previewModalImages.length > 1;
        const atStart = previewModalIndex <= 0;
        const atEnd = previewModalIndex >= previewModalImages.length - 1;
        if (prevBtn) {
            prevBtn.disabled = !hasMultiple || atStart;
            prevBtn.classList.toggle('opacity-40', !hasMultiple || atStart);
        }
        if (nextBtn) {
            nextBtn.disabled = !hasMultiple || atEnd;
            nextBtn.classList.toggle('opacity-40', !hasMultiple || atEnd);
        }
    }
    function showPreviewAt(index) {
        if (!previewModalImages.length) return;
        const nextIndex = Math.max(0, Math.min(previewModalImages.length - 1, index));
        previewModalIndex = nextIndex;
        const url = previewModalImages[previewModalIndex];
        if (activePreviewModal === 'ti') {
            document.getElementById('ti-image-preview-content').src = url;
        } else {
            document.getElementById('preview-modal-img').src = url;
        }
        updatePreviewNavButtons();
    }
    function setPreviewState(url, modalType) {
        activePreviewModal = modalType;
        previewModalImages = collectPreviewSources();
        if (!previewModalImages.length && url) previewModalImages = [url];
        previewModalIndex = previewModalImages.indexOf(url);
        if (previewModalIndex === -1 && url) {
            previewModalImages.push(url);
            previewModalIndex = previewModalImages.length - 1;
        }
        updatePreviewNavButtons();
    }
    function hideAndClearModal() {
        universalModal.classList.remove('visible');
        setTimeout(() => {
            const modalBody = document.getElementById('modal-body');
            const iframe = modalBody.querySelector('iframe');
            if (iframe) {
                iframe.src = '';
            }
            modalBody.innerHTML = '';
        }, 300);
    }
    function showContentModal(title, bodyHTML) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = bodyHTML;
        universalModal.classList.add('visible');
    }
    document.getElementById('close-modal-btn').addEventListener('click', hideAndClearModal);
    universalModal.addEventListener('click', (e) => {
        if (e.target === universalModal) {
            hideAndClearModal();
        }
    });
    function showImagePreview(imgSrc) {
        document.getElementById('preview-modal-img').src = imgSrc;
        imagePreviewModal.classList.remove('opacity-0', 'pointer-events-none');
        setPreviewState(imgSrc, 'default');
    }
    function hideImagePreview() {
        imagePreviewModal.classList.add('opacity-0', 'pointer-events-none');
        document.getElementById('preview-modal-img').src = "";
    }
    document.getElementById('preview-modal-close').addEventListener('click', hideImagePreview);
    document.getElementById('preview-modal-prev')?.addEventListener('click', () => showPreviewAt(previewModalIndex - 1));
    document.getElementById('preview-modal-next')?.addEventListener('click', () => showPreviewAt(previewModalIndex + 1));
    imagePreviewModal.addEventListener('click', (e) => { if (e.target === imagePreviewModal) hideImagePreview(); });
    document.body.addEventListener('click', (e) => {
        const viewButton = e.target.closest('.view-btn');
        if (viewButton && viewButton.dataset.imgSrc) showImagePreview(viewButton.dataset.imgSrc);
    });

    // === GLOBAL: Auto-inject animate video icon into ALL result cards ===
    function injectAnimateVideoBtn(container) {
        // Find all button containers that have a view-btn but no animate-video-btn yet
        const viewBtns = container.querySelectorAll('.view-btn.result-action-btn');
        viewBtns.forEach(viewBtn => {
            const parent = viewBtn.parentElement;
            if (!parent || parent.querySelector('.animate-video-btn')) return;
            // Get image URL from view button or nearby img
            const imgUrl = viewBtn.dataset.imgSrc || '';
            if (!imgUrl) return;
            const animBtn = document.createElement('button');
            animBtn.className = 'animate-video-btn result-action-btn';
            animBtn.title = 'Animasikan Video';
            animBtn.dataset.animateUrl = imgUrl;
            animBtn.innerHTML = '<i data-lucide="video" class="w-4 h-4"></i>';
            parent.insertBefore(animBtn, viewBtn);
            if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [animBtn] });
        });
    }

    // MutationObserver: watch for new result cards added to DOM
    const animateObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;
                // Check the node itself and its children
                if (node.querySelector && node.querySelector('.view-btn.result-action-btn')) {
                    injectAnimateVideoBtn(node);
                }
            }
        }
    });
    animateObserver.observe(document.body, { childList: true, subtree: true });

    // Also handle cards that replace innerHTML (view-btn appears via innerHTML, not addedNodes)
    // Use a periodic check as fallback for innerHTML-based card updates
    setInterval(() => {
        document.querySelectorAll('.view-btn.result-action-btn').forEach(viewBtn => {
            const parent = viewBtn.parentElement;
            if (!parent || parent.querySelector('.animate-video-btn')) return;
            const imgUrl = viewBtn.dataset.imgSrc || '';
            if (!imgUrl) return;
            const animBtn = document.createElement('button');
            animBtn.className = 'animate-video-btn result-action-btn';
            animBtn.title = 'Animasikan Video';
            animBtn.dataset.animateUrl = imgUrl;
            animBtn.innerHTML = '<i data-lucide="video" class="w-4 h-4"></i>';
            parent.insertBefore(animBtn, viewBtn);
            if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [animBtn] });
        });
    }, 1000);

    // Global click handler for animate-video-btn
    document.body.addEventListener('click', async (e) => {
        const animBtn = e.target.closest('.animate-video-btn');
        if (!animBtn) return;
        const imageUrl = animBtn.dataset.animateUrl;
        if (!imageUrl) return;
        try {
            if (typeof window.switchTab === 'function') {
                window.switchTab('video-generator');
                await new Promise(resolve => setTimeout(resolve, 300));
                const vgModeOptions = document.getElementById('vg-mode-options');
                const vgImageInput = document.getElementById('vg-image-input');
                const vgPromptInput = document.getElementById('vg-prompt-input');
                if (vgModeOptions && vgImageInput && vgPromptInput) {
                    const imageToVideoBtn = vgModeOptions.querySelector('[data-value="image-to-video"]');
                    if (imageToVideoBtn) {
                        imageToVideoBtn.click();
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    const resp = await fetch(imageUrl);
                    const blob = await resp.blob();
                    const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    vgImageInput.files = dataTransfer.files;
                    vgImageInput.dispatchEvent(new Event('change', { bubbles: true }));
                    vgPromptInput.value = 'animate this photo with gentle movements, soft transitions, and beautiful atmosphere';
                    const videoGenContainer = document.querySelector('[data-feature="video-generator"]');
                    if (videoGenContainer) videoGenContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        } catch (error) {
            console.error('Error switching to video generator:', error);
        }
    });




    async function convertHeicToJpg(file) {
        const isHeic = file.name.toLowerCase().endsWith('.heic') || file.type.toLowerCase() === 'image/heic' || file.type.toLowerCase() === 'image/heif';
        if (isHeic) {
            console.log("HEIC file detected, converting...");
            try {
                const conversionResult = await heic2any({
                    blob: file,
                    toType: "image/png",
                });
                const finalBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
                const originalName = file.name.split('.').slice(0, -1).join('.');
                const jpegFile = new File([finalBlob], `${originalName}.png`, { type: 'image/png' });
                console.log("Conversion successful.");
                return jpegFile;
            } catch (error) {
                console.error("HEIC conversion failed:", error);
                alert("Gagal mengonversi file HEIC. File mungkin rusak atau tidak didukung.");
                throw error;
            }
        } else {
            return file;
        }
    }
    window.convertHeicToJpg = convertHeicToJpg;
    function base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }
    window.base64ToBlob = base64ToBlob;
    function showModernPopup({ title, message, actionText, customHeaderClass, customBtnClass, onAction } = {}) {
        const existing = document.getElementById('sf-popup-backdrop');
        if (existing) existing.remove();
        const backdrop = document.createElement('div');
        backdrop.id = 'sf-popup-backdrop';
        backdrop.className = 'sf-popup-backdrop';
        backdrop.innerHTML = `
                    <div class="sf-popup-card" role="dialog" aria-modal="true">
                        <div class="sf-popup-header ${customHeaderClass || ''}">
                            <div class="sf-popup-title">
                                <span class="sf-popup-icon">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <path d="M12 8h.01"></path>
                                        <path d="M11 12h1v4h1"></path>
                                    </svg>
                                </span>
                                <span>${title || 'Perhatian'}</span>
                            </div>
                            <button class="sf-popup-close ${customHeaderClass || ''}" type="button" aria-label="Tutup">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M18 6 6 18"></path>
                                    <path d="m6 6 12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="sf-popup-body">${message || ''}</div>
                        <div class="sf-popup-actions">
                            <button class="sf-popup-btn ${customBtnClass || ''}" type="button">${actionText || 'Mengerti'}</button>
                        </div>
                    </div>
                `;
        document.body.appendChild(backdrop);
        requestAnimationFrame(() => {
            backdrop.classList.add('active');
        });
        const closePopup = () => {
            backdrop.classList.remove('active');
            setTimeout(() => backdrop.remove(), 200);
            document.body.style.overflow = '';
        };
        document.body.style.overflow = 'hidden';
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closePopup();
        });
        const closeBtn = backdrop.querySelector('.sf-popup-close');
        const actionBtn = backdrop.querySelector('.sf-popup-btn');
        if (closeBtn) closeBtn.addEventListener('click', closePopup);
        if (actionBtn) actionBtn.addEventListener('click', () => {
            closePopup();
            if (typeof onAction === 'function') onAction();
        });
    }
    function showConfirmPopup({ title, message, confirmText, cancelText, onConfirm } = {}) {
        const existing = document.getElementById('sf-confirm-backdrop');
        if (existing) existing.remove();
        const backdrop = document.createElement('div');
        backdrop.id = 'sf-confirm-backdrop';
        backdrop.className = 'sf-popup-backdrop';
        backdrop.innerHTML = `
                    <div class="sf-popup-card" role="dialog" aria-modal="true">
                        <div class="sf-popup-header">
                            <div class="sf-popup-title">
                                <span class="sf-popup-icon">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <path d="M12 16h.01"></path>
                                        <path d="M12 8v4"></path>
                                    </svg>
                                </span>
                                <span>${title || 'Konfirmasi'}</span>
                            </div>
                            <button class="sf-popup-close" type="button" aria-label="Tutup">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M18 6 6 18"></path>
                                    <path d="m6 6 12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="sf-popup-body">${message || ''}</div>
                        <div class="sf-popup-actions" style="display:flex; gap:10px;">
                            <button class="sf-confirm-cancel sf-popup-btn" type="button" style="background:#f1f5f9; color:#0f172a;">${cancelText || 'Batal'}</button>
                            <button class="sf-confirm-ok sf-popup-btn" type="button">${confirmText || 'Beli'}</button>
                        </div>
                    </div>
                `;
        document.body.appendChild(backdrop);
        requestAnimationFrame(() => {
            backdrop.classList.add('active');
        });
        let done = false;
        const closePopup = () => {
            backdrop.classList.remove('active');
            setTimeout(() => backdrop.remove(), 200);
            document.body.style.overflow = '';
        };
        const confirmOnce = () => {
            if (done) return;
            done = true;
            closePopup();
            try {
                if (typeof onConfirm === 'function') onConfirm();
            } catch (e) { }
        };
        document.body.style.overflow = 'hidden';
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closePopup();
        });
        const closeBtn = backdrop.querySelector('.sf-popup-close');
        const cancelBtn = backdrop.querySelector('.sf-confirm-cancel');
        const okBtn = backdrop.querySelector('.sf-confirm-ok');
        if (closeBtn) closeBtn.addEventListener('click', closePopup);
        if (cancelBtn) cancelBtn.addEventListener('click', closePopup);
        if (okBtn) okBtn.addEventListener('click', confirmOnce);
    }
    function showUploadLimitPopup() {
        showModernPopup({
            title: 'Ukuran Terlalu Besar',
            message: 'Ukuran file maksimal 15MB. Silakan pilih gambar lebih kecil.',
            actionText: 'Pilih Ulang'
        });
    }
    window.showModernPopup = showModernPopup;
    window.showConfirmPopup = showConfirmPopup;
    window.showUploadLimitPopup = showUploadLimitPopup;

    function showBoostModeVipOnlyPopup() {
        showModernPopup({
            title: 'Fitur Eksklusif VIP',
            message: 'Boost Mode hanya tersedia untuk pengguna VIP. Upgrade sekarang untuk menikmati kecepatan generate maksimal!',
            actionText: 'Upgrade ke VIP'
        });
        
        // Add custom action to the button
        setTimeout(() => {
            const btn = document.querySelector('.sf-popup-btn');
            if (btn) {
                btn.onclick = () => {
                    window.open('https://klikcerdas.id/p/sulap-foto-vip-by-ichsanlabs', '_blank', 'noopener');
                    const backdrop = document.getElementById('sf-popup-backdrop');
                    if (backdrop) backdrop.click(); // Close modal
                };
            }
        }, 100);
    }
    window.showBoostModeVipOnlyPopup = showBoostModeVipOnlyPopup;

    const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
    function setupImageUpload(input, uploadArea, onFile) {
        async function handleFile(file) {
            if (file) {
                if (file.size > MAX_UPLOAD_BYTES) {
                    showUploadLimitPopup();
                    if (input) input.value = '';
                    return;
                }
                try {
                    const processedFile = await convertHeicToJpg(file);
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const parts = e.target.result.split(',');
                        const mimeType = parts[0].match(/:(.*?);/)[1];
                        const base64 = parts[1];
                        onFile({ base64, mimeType, dataUrl: e.target.result });
                    };
                    reader.readAsDataURL(processedFile);
                } catch (error) {
                    console.error("Error processing file:", error);
                }
            }
        }
        input.addEventListener('change', (event) => {
            setTimeout(() => {
                if (event.target.files && event.target.files.length > 0) {
                    handleFile(event.target.files[0]);
                }
            }, 100);
        });
        if (uploadArea) {
            ['dragover', 'drop', 'dragleave'].forEach(eventName => {
                uploadArea.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); });
            });
            uploadArea.addEventListener('dragover', () => uploadArea.classList.add('border-teal-500'));
            uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('border-teal-500'));
            uploadArea.addEventListener('drop', (e) => {
                uploadArea.classList.remove('border-teal-500');
                handleFile(e.dataTransfer.files[0]);
            });
        }
    }
    if (window.initProdukModel) {
        window.initProdukModel({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }
    // Initialize Buat Model Module
    if (window.initBuatModel) {
        window.initBuatModel({
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
        });
    }

    // Initialize Ubah Pose Module
    if (window.initUbahPose) {
        window.initUbahPose({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    // Initialize Ubah Angle Module
    if (window.initUbahAngle) {
        window.initUbahAngle({
            document,
            setupImageUpload,
            setupOptionButtons,
            updateSliderProgress,
            getAspectRatioClass,
            lucide,
            API_KEY,
            GENERATE_URL,
            CHAT_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    // Initialize Wedding 2.0 Module
    if (window.initWedding2) {
        window.initWedding2({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            base64ToBlob,
            doneSound,
            errorSound
        });
    }

    // Initialize Baby Born Module
    if (window.initBabyBorn) {
        window.sfBabyModule = window.initBabyBorn({
            document,
            setupImageUpload,
            setupOptionButtons,
            generatePhotographerImage,
            autoSelectClosestRatio,
            lucide
        });
    }

    // Initialize Baby V2 Module
    if (window.initBabyV2) {
        window.sfBabyV2Module = window.initBabyV2({
            document,
            setupImageUpload,
            setupOptionButtons,
            generatePhotographerImage,
            autoSelectClosestRatio,
            lucide
        });
    }

    // Initialize Kids Module
    if (window.initKids) {
        window.sfKidsModule = window.initKids({
            document,
            setupImageUpload,
            setupOptionButtons,
            generatePhotographerImage,
            autoSelectClosestRatio
        });
    }

    // Initialize Umrah Module
    if (window.initUmrah) {
        window.sfUmrahModule = window.initUmrah({
            document,
            setupImageUpload,
            setupOptionButtons,
            generatePhotographerImage,
            autoSelectClosestRatio
        });
    }

    // Initialize Passport Module
    if (window.initPassport) {
        window.sfPassportModule = window.initPassport({
            document,
            setupImageUpload,
            setupOptionButtons,
            generatePhotographerImage
        });
    }

    // Initialize Idul Fitri Module
    if (window.initIdulFitri) {
        window.sfIdulFitriModule = window.initIdulFitri({
            document,
            setupImageUpload,
            setupOptionButtons,
            generatePhotographerImage,
            autoSelectClosestRatio,
            lucide,
            convertHeicToJpg,
            API_KEY,
            CHAT_URL,
            getApiErrorMessage
        });
    }

    // Idul Fitri Banner Click Handler
    const idulfitriB = document.getElementById('idulfitri-banner');
    if (idulfitriB) {
        idulfitriB.addEventListener('click', () => {
            const idulfitriTabBtn = document.getElementById('tab-idul-fitri');
            if (idulfitriTabBtn) {
                idulfitriTabBtn.click();
                return;
            }
            if (typeof window.switchTab === 'function') {
                window.switchTab('idul-fitri');
                return;
            }
            // Fallback: set hash
            window.location.hash = '#idul-fitri';
        });
    }

    // Initialize Maternity Module
    if (window.initMaternity) {
        window.sfMaternityModule = window.initMaternity({
            document,
            setupImageUpload,
            setupOptionButtons,
            generatePhotographerImage,
            autoSelectClosestRatio
        });
    }

    // Initialize Studio Keluarga Module
    if (window.initStudioKeluarga) {
        window.sfStudioKeluargaModule = window.initStudioKeluarga({
            document,
            setupImageUpload,
            setupOptionButtons,
            generatePhotographerImage,
            autoSelectClosestRatio,
            getImageAspectRatio,
            getClosestStandardRatio
        });
    }

    // Initialize Buat Logo Module
    if (window.initBuatLogo) {
        window.initBuatLogo({
            document,
            setupOptionButtons,
            getAspectRatioClass,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    // Initialize Vector & SVG Module
    if (window.initVectorSvg) {
        window.initVectorSvg({
            document,
            setupOptionButtons,
            getAspectRatioClass,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound,
            convertHeicToJpg
        });
    }

    // Initialize Super Quote Module
    if (window.initSuperQuote) {
        window.initSuperQuote({
            document,
            setupOptionButtons,
            getAspectRatioClass,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            CHAT_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    // Initialize Convert Images Module
    if (window.initConvertImages) {
        window.initConvertImages({
            document,
            lucide,
            convertHeicToJpg
        });
    }

    if (window.initFotoKolase) {
        window.initFotoKolase({
            document,
            lucide,
            convertHeicToJpg,
            base64ToBlob,
            GENERATE_URL,
            API_KEY,
            getApiErrorMessage,
            doneSound
        });
    }

    // Initialize Foto Polaroid Module
    if (window.initFotoPolaroid) {
        window.initFotoPolaroid({
            document,
            setupOptionButtons,
            getAspectRatioClass,
            lucide,
            convertHeicToJpg,
            getApiErrorMessage,
            doneSound,
            errorSound,
            switchTab,
            API_KEY,
            GENERATE_URL
        });
    }

    if (window.initHapusObjek) {
        window.initHapusObjek();
    }
    // Upgrade VIP Modal Logic
    const upgradeVipModal = document.getElementById('upgrade-vip-modal');
    const closeUpgradeVipModalBtn = document.getElementById('upgrade-vip-modal-close');

    if (upgradeVipModal && closeUpgradeVipModalBtn) {
        closeUpgradeVipModalBtn.addEventListener('click', () => {
            upgradeVipModal.classList.remove('active');
            upgradeVipModal.style.display = '';
        });
        upgradeVipModal.addEventListener('click', (e) => {
            if (e.target === upgradeVipModal) {
                upgradeVipModal.classList.remove('active');
                upgradeVipModal.style.display = '';
            }
        });
    }

    function showUpgradeVipPopup() {
        if (upgradeVipModal) {
            upgradeVipModal.classList.add('active');
        } else if (window.showModernPopup) {
             window.showModernPopup({
                title: 'Fitur VIP',
                message: 'Fitur ini khusus untuk pengguna VIP. Upgrade sekarang untuk akses penuh!',
                actionText: 'Upgrade ke VIP'
            });
        } else {
            alert("Fitur ini khusus VIP. Silakan upgrade!");
        }
    }

    window.showBoostModeVipOnlyPopup = function () {
        const existing = document.getElementById('sf-popup-backdrop');
        if (existing) existing.remove();
        const backdrop = document.createElement('div');
        backdrop.id = 'sf-popup-backdrop';
        backdrop.className = 'sf-popup-backdrop';
        backdrop.innerHTML = `
                    <div class="sf-popup-card" role="dialog" aria-modal="true">
                        <div class="sf-popup-header" style="background: linear-gradient(135deg, #1f2937, #0f172a); border-bottom: 1px solid rgba(255,255,255,0.08);">
                            <div class="sf-popup-title" style="color: #f8fafc;">
                                <span class="sf-popup-icon" style="width: 28px; height: 28px; border-radius: 10px; background: rgba(251, 191, 36, 0.18); color: #fbbf24;">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                                    </svg>
                                </span>
                                <span>Boost Mode</span>
                            </div>
                            <button class="sf-popup-close" type="button" aria-label="Tutup" style="color: #cbd5f5;">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M18 6 6 18"></path>
                                    <path d="m6 6 12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="sf-popup-body" style="padding: 14px 18px 8px; color: #475569; font-size: 0.875rem; line-height: 1.6;">Boost Mode hanya tersedia untuk pengguna <strong style="color:#1e293b;">VIP</strong>. Upgrade sekarang untuk menikmati kecepatan generate maksimal dan akses semua fitur premium!</div>
                        <div class="sf-popup-actions" style="padding: 10px 18px 18px;">
                            <a class="sf-popup-btn" href="https://klikcerdas.id/p/sulap-foto-vip-by-ichsanlabs" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;gap:7px;width:100%;padding:11px 16px;font-size:0.875rem;font-weight:700;background:linear-gradient(135deg,#f59e0b,#d97706);color:#1f2937;border-radius:12px;box-shadow:0 8px 16px rgba(245,158,11,0.3);text-decoration:none;letter-spacing:0.2px;"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>Upgrade ke VIP Sekarang</a>
                        </div>
                    </div>
                `;
        document.body.appendChild(backdrop);
        requestAnimationFrame(() => {
            backdrop.classList.add('active');
        });
        const closePopup = () => {
            backdrop.classList.remove('active');
            setTimeout(() => backdrop.remove(), 200);
            document.body.style.overflow = '';
        };
        document.body.style.overflow = 'hidden';
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closePopup();
        });
        const closeBtn = backdrop.querySelector('.sf-popup-close');
        const actionBtn = backdrop.querySelector('.sf-popup-btn');
        if (closeBtn) closeBtn.addEventListener('click', closePopup);
        if (actionBtn) actionBtn.addEventListener('click', closePopup);
    };

    // VIP Blocking Logic
    const vipGenerateButtonIds = [
        'ti-generate-btn', // Buat Gambar
        'bc-generate-btn', // Kartu Nama
        'cl-generate-btn', // Buat Logo
        'bm-generate-btn', // Buat Mascot
        'fk-generate-btn', // Foto Kolase
        'fp-generate-btn', // Foto Polaroid
        'wm-generate-btn', // Watermark
        'crop-generate-btn', // Crop Foto
        'so-generate-btn', // Size Objek
        'ho-generate-btn', // Hapus Objek
        'gp-generate-btn', // Foto Wisuda
        'vt-generate-btn', // Video Thumbnail
        'af-generate-btn', // Age Filter
        'pov-selfie-generate-btn', // POV Selfie
    ];

    if (!window.IS_VIP_APP) {
        vipGenerateButtonIds.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                // Use capture phase to intercept click before other listeners
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    showUpgradeVipPopup();
                }, true);
            }
        });
    }

    const sfTabBaby = document.getElementById('sf-tab-baby');
    const sfTabKids = document.getElementById('sf-tab-kids');
    const sfTabUmrah = document.getElementById('sf-tab-umrah');
    const sfTabPassport = document.getElementById('sf-tab-passport');
    const sfTabMaternity = document.getElementById('sf-tab-maternity');
    const sfContentBaby = document.getElementById('sf-content-baby');
    const sfContentKids = document.getElementById('sf-content-kids');
    const sfContentUmrah = document.getElementById('sf-content-umrah');
    const sfContentPassport = document.getElementById('sf-content-passport');
    const sfContentMaternity = document.getElementById('sf-content-maternity');
    function switchPhotographerTab(tabName) {
        const tabs = {
            'baby': { btn: sfTabBaby, content: sfContentBaby },
            'kids': { btn: sfTabKids, content: sfContentKids },
            'umrah': { btn: sfTabUmrah, content: sfContentUmrah },
            'passport': { btn: sfTabPassport, content: sfContentPassport },
            'maternity': { btn: sfTabMaternity, content: sfContentMaternity }
        };
        for (const key in tabs) {
            const isActive = (key === tabName);
            if (tabs[key].btn) tabs[key].btn.classList.toggle('selected', isActive);
            if (tabs[key].content) tabs[key].content.classList.toggle('hidden', !isActive);
        }
    }
    window.switchPhotographerTab = switchPhotographerTab;


    async function generatePhotographerImage(type, prompt, imageData, aspectRatio, refImageData = null, numOutputs = 1) {
        const resultsContainer = document.getElementById(`sf-${type}-results-container`);
        const resultsGrid = document.getElementById(`sf-${type}-results-grid`);
        const generateBtn = document.getElementById(`sf-${type}-generate-btn`);
        const originalBtnHTML = generateBtn.innerHTML;
        generateBtn.disabled = true;
        generateBtn.innerHTML = `<div class="spinner"></div><span class="ml-2">Membuat Foto...</span>`;
        const aspectClass = getAspectRatioClass(aspectRatio);
        resultsContainer.classList.remove('hidden');
        resultsGrid.innerHTML = '';
        resultsGrid.className = `grid ${getResultGridCols(numOutputs)} gap-4 md:gap-6`;
        const numVariations = numOutputs;
        for (let i = 1; i <= numVariations; i++) {
            const card = document.createElement('div');
            card.id = `sf-${type}-card-${i}`;
            card.className = `card overflow-hidden transition-all ${aspectClass} bg-gray-100 flex items-center justify-center`;
            card.innerHTML = `<div class="spinner"></div>`;
            resultsGrid.appendChild(card);
        }
        lucide.createIcons();
        const generationPromises = Array.from({ length: numVariations }, (_, i) =>
            generateSingleSFImage(i + 1, type, prompt, imageData, aspectRatio, refImageData)
        );
        await Promise.allSettled(generationPromises);
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalBtnHTML;
        lucide.createIcons();
    }
    async function generateSingleSFImage(id, type, prompt, imageData, aspectRatio, refImageData = null) {
        const card = document.getElementById(`sf-${type}-card-${id}`);
        try {

            const finalPrompt = `${prompt} This is variation number ${id}.`;

            const base64ToBlob = (base64, mimeType) => {
                const byteCharacters = atob(base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                return new Blob([byteArray], { type: mimeType });
            };

            const formData = new FormData();
            const imagesArray = Array.isArray(imageData) ? imageData : [imageData];
            imagesArray.forEach((img, idx) => {
                if (!img || !img.base64) return;
                formData.append('images[]', base64ToBlob(img.base64, img.mimeType || 'image/jpeg'), `image_${idx + 1}.jpg`);
            });
            if (refImageData) {
                formData.append('images[]', base64ToBlob(refImageData.base64, refImageData.mimeType || 'image/jpeg'), 'ref_image.jpg');
            }
            formData.append('instruction', finalPrompt);
            formData.append('aspectRatio', aspectRatio);

            const response = await fetch(`${GENERATE_URL}`, {
                method: 'POST',
                headers: {
                    'X-API-Key': API_KEY
                },
                body: formData
            });

            if (!response.ok) throw new Error(await getApiErrorMessage(response));
            const result = await response.json();

            if (!result.success || !result.imageUrl) throw new Error("Respon API tidak valid (tidak ada data gambar).");
            const imageUrl = result.imageUrl;
            
            // Create image card (animate icon auto-injected by global observer)
            const imageCardHTML = `
                <div class="relative w-full h-full">
                    <img src="${imageUrl}" class="w-full h-full object-cover">
                    <div class="absolute bottom-2 right-2 flex gap-1">
                        <button data-img-src="${imageUrl}" class="view-btn result-action-btn" title="Lihat Gambar">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        <a href="${imageUrl}" download="${type}_foto_${id}.png" class="result-action-btn download-btn" title="Unduh Gambar">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </a>
                    </div>
                </div>`;
            
            card.innerHTML = '';
            const imageCardDiv = document.createElement('div');
            imageCardDiv.className = `relative rounded-2xl overflow-hidden bg-white border border-slate-200 w-full ${getAspectRatioClass(aspectRatio)}`;
            imageCardDiv.innerHTML = imageCardHTML;
            card.appendChild(imageCardDiv);
            card.className = 'w-full';
            doneSound.play();

        } catch (error) {
            errorSound.play();
            console.error(`Error for SF card ${type}-${id}:`, error);
            card.innerHTML = `<div class="text-xs text-red-500 p-2 text-center break-all">${error.message}</div>`;
        } finally {
            lucide.createIcons();
        }
    }
    // Desain Rumah logic moved to js/desain-rumah.js
    // Sketsa Gambar logic moved to js/sketsa-gambar.js
    // Art & Karikatur logic moved to js/art-karikatur.js

    function updateSliderProgress(slider) {
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        const val = parseFloat(slider.value);
        const percentage = ((val - min) * 100) / (max - min);
        slider.style.background = `linear-gradient(to right, var(--accent) ${percentage}%, var(--border-color) ${percentage}%)`;
    }

    let desainRumahModule;
    let sketsaGambarModule;
    let artKarikaturModule;
    let autoRapiModule;

    // Initialize Foto Miniatur Module
    if (window.initFotoMiniatur) {
        fotoMiniatur = window.initFotoMiniatur({
            document,
            setupImageUpload,
            setupOptionButtons,
            updateSliderProgress,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    // Initialize Menu Restoran Module
    if (window.initMenuRestoran) {
        window.initMenuRestoran({
            GENERATE_URL,
            CHAT_URL,
            API_KEY,
            getApiErrorMessage
        });
    }

    // Initialize Lighting & Shadows Module
    if (window.initLightingShadows) {
        window.lightingShadows = window.initLightingShadows({
            document,
            setupImageUpload,
            setupOptionButtons,
            updateSliderProgress,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    if (window.initPerbaikiFoto) {
        perbaikiFoto = window.initPerbaikiFoto({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    if (window.initEditFoto) {
        editFoto = window.initEditFoto({
            document,
            setupOptionButtons,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            lucide
        });
    }

    if (window.initPerluasFoto) {
        window.initPerluasFoto({
            document,
            setupImageUpload,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    if (window.initKartuNama) {
        window.initKartuNama({
            document,
            setupOptionButtons,
            getAspectRatioClass,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            CHAT_URL,
            getApiErrorMessage,
            doneSound,
            errorSound,
            switchTab
        });
    }

    if (window.initFaceSwap) {
        window.initFaceSwap({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    if (window.initFotoArtis) {
        window.initFotoArtis({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            getImageAspectRatio,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            CHAT_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    if (window.initHapusBg) {
        window.initHapusBg({
            document,
            setupImageUpload,
            setupOptionButtons,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    if (window.initGabungFoto) {
        window.gabungFotoModule = window.initGabungFoto({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            CHAT_URL,
            getApiErrorMessage,
            doneSound,
            errorSound,
            convertHeicToJpg
        });
    }

    if (window.initFotoProduk) {
        window.initFotoProduk({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound,
            showContentModal,
            hideModal: hideAndClearModal,
            applyLogoToImage,
            getLogoData: () => psLogoData
        });
    }

    if (window.initUpscaleGambar) {
        window.initUpscaleGambar({
            document,
            setupImageUpload,
            lucide,
            doneSound,
            errorSound
        });
    }

    if (window.initHapusBg2) {
        window.initHapusBg2({
            document,
            setupImageUpload,
            autoSelectClosestRatio,
            lucide,
            doneSound,
            errorSound
        });
    }

    if (window.initFotoFashion) {
        window.initFotoFashion({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound,
            setupLogoUpload,
            setupLogoControls,
            setupSlider,
            applyLogoToImage
        });
    }

    if (window.initBuatMockup) {
        window.initBuatMockup({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    // Initialize Buat Banner Module
    if (window.initBuatBanner) {
        buatBannerModule = window.initBuatBanner({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            CHAT_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    
    
    
    // Initialize CV Lamaran Kerja Module
    if (window.initCvLamaran) {
        window.initCvLamaran({
            document,
            setupOptionButtons,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            CHAT_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    // Initialize Poster & Flyer Module
    if (window.initPosterFlyer) {
        window.initPosterFlyer({
            document,
            setupOptionButtons,
            getAspectRatioClass,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            CHAT_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    // Initialize Infografis Module
    if (window.initInfografis) {
        window.initInfografis({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            CHAT_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    // Initialize Video Generator Module
    if (window.initVideoGenerator) {
        window.initVideoGenerator({
            document,
            setupImageUpload,
            setupOptionButtons,
            lucide,
            getApiKey: () => API_KEY,
            getEmail: () => currentSession.email,
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
        });
    }

    // AI Video Server Status Badge — updated from config polling (no separate fetch needed)

    // Initialize Sulap Musik Module
    if (window.initSulapMusik) {
        window.initSulapMusik({
            document,
            setupOptionButtons,
            lucide,
            getApiKey: () => API_KEY,
            getJwt: () => currentSession.jwt,
            BASE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    // Initialize Food Photography Module
    if (window.initFoodPhotography) {
        window.initFoodPhotography({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    // Initialize Time Machine Module
    if (window.initTimeMachine) {
        window.initTimeMachine({
            document,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound,
            convertHeicToJpg
        });
    }

    // Initialize GIF Maker Module
    if (window.initGifMaker) {
        window.initGifMaker({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    // Initialize Blur Background Module
    if (window.initBlurBackground) {
        window.initBlurBackground({
            document,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound,
            convertHeicToJpg
        });
    }

    // Initialize Ganti Background Module
    if (window.initGantiBackground) {
        window.initGantiBackground({
            document,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound,
            convertHeicToJpg
        });
    }

    // Initialize Foto Era Sejarah Module (addon)
    if (window.initFotoEraSejarah) {
        window.initFotoEraSejarah({
            document,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound,
            convertHeicToJpg
        });
    }

    // Initialize Foto Zodiak Module (addon)
    if (window.initFotoZodiak) {
        window.initFotoZodiak({
            document,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound,
            convertHeicToJpg
        });
    }

    // Initialize Batik & Tenun Module (addon)
    if (window.initBatikTenun) {
        window.initBatikTenun({
            document,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            getApiKey: () => API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound,
            convertHeicToJpg
        });
    }

    // Initialize Potret Cinta Module
    if (window.initPotretCinta) {
        window.initPotretCinta({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    // Initialize Potret Cinta 2.0 Module
    if (window.initPotretCinta2) {
        window.initPotretCinta2({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            API_KEY,
            GENERATE_URL,
            CHAT_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    // Initialize Prewedding Module
    if (window.initPrewedding) {
        window.initPrewedding({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound,
            showContentModal,
            hideAndClearModal
        });
    }

    // Initialize POV Tangan Module
    if (window.initPovTangan) {
        window.initPovTangan({
            document,
            setupImageUpload,
            setupOptionButtons,
            updateSliderProgress,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    // Initialize Kamar Pas Module
    if (window.initKamarPas) {
        window.initKamarPas({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound,
            getImageAspectRatio
        });
    }

    // Initialize Retouch Wajah Module
    if (window.initRetouchWajah) {
        window.initRetouchWajah({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    // Initialize Buat Carousel Module
    if (window.initBuatCarousel) {
        window.initBuatCarousel({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            API_KEY,
            CHAT_URL,
            GENERATE_URL,
            getApiErrorMessage,
            showContentModal,
            downloadDataURI,
            JSZip: window.JSZip,
            saveAs: window.saveAs,
            doneSound,
            errorSound
        });
    }
    function autoSelectClosestRatio(dataUrl, ratioContainer) {
        if (!ratioContainer || !dataUrl) return;
        const buttons = Array.from(ratioContainer.querySelectorAll('button'));
        if (!buttons.length) return;
        // Qwen only supports 16:9 — ignore the uploaded image ratio and keep 16:9 locked.
        if (localStorage.getItem('private_server_model') === 'qwen') {
            if (typeof window.applyQwenAspectRatioLock === 'function') {
                window.applyQwenAspectRatioLock();
                return;
            }
        }
        const img = new Image();
        img.onload = () => {
            const imageRatio = img.naturalWidth / img.naturalHeight;
            const parseRatio = (value) => {
                if (!value) return 1;
                const normalized = value.toString().toLowerCase().replace(/\s/g, '');
                const separator = normalized.includes(':') ? ':' : (normalized.includes('x') ? 'x' : null);
                if (!separator) return 1;
                const parts = normalized.split(separator);
                if (parts.length !== 2) return 1;
                const w = Number(parts[0]);
                const h = Number(parts[1]);
                if (!w || !h) return 1;
                return w / h;
            };
            let closestButton = buttons[0];
            let closestDiff = Math.abs(imageRatio - parseRatio(closestButton.dataset.value));
            buttons.forEach((button) => {
                if (button.dataset.value === 'Auto') return;
                const diff = Math.abs(imageRatio - parseRatio(button.dataset.value));
                if (diff < closestDiff) {
                    closestDiff = diff;
                    closestButton = button;
                }
            });
            buttons.forEach(button => button.classList.remove('selected'));
            closestButton.classList.add('selected');
            // Trigger click event to update the variable via callback
            closestButton.click();
        };
        img.src = dataUrl;
    }

    async function getImageAspectRatio(imageData) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
            img.onerror = reject;
            img.src = imageData.dataUrl;
        });
    }
    function getClosestStandardRatio(ratio) {
        const standards = [
            { label: '1:1', value: 1 / 1 },
            { label: '16:9', value: 16 / 9 },
            { label: '9:16', value: 9 / 16 },
            { label: '16:9', value: 4 / 3 },
            { label: '9:16', value: 3 / 4 }
        ];
        let closest = standards[0];
        let minDiff = Math.abs(ratio - closest.value);
        for (let i = 1; i < standards.length; i++) {
            let diff = Math.abs(ratio - standards[i].value);
            if (diff < minDiff) {
                minDiff = diff;
                closest = standards[i];
            }
        }
        return closest.label;
    }

    function initBeforeAfterSlider(container, beforeSrc, afterSrc) {
        container.innerHTML = `
            <div class="ba-slider-container">
                <img src="${afterSrc}" class="ba-image-img" style="z-index: 1;">
                <div class="ba-resize-div" style="position: absolute; top: 0; left: 0; height: 100%; width: 50%; overflow: hidden; z-index: 2; border-right: 2px solid white;">
                    <img src="${beforeSrc}" class="ba-image-img" style="width: ${container.clientWidth}px; max-width: none;">
                </div>
                <div class="ba-slider-handle" style="left: 50%;">
                    <div class="ba-slider-circle"><i data-lucide="move-horizontal" class="w-4 h-4 text-slate-600"></i></div>
                </div>
                <div class="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded z-20">Before</div>
                <div class="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded z-20">After</div>
            </div>
        `;
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        const slider = container.querySelector('.ba-slider-container');
        const resizeDiv = container.querySelector('.ba-resize-div');
        const handle = container.querySelector('.ba-slider-handle');
        const beforeImg = resizeDiv.querySelector('img');

        const updateWidths = () => {
            if (beforeImg && container) {
                beforeImg.style.width = `${container.clientWidth}px`;
            }
        };
        window.addEventListener('resize', updateWidths);

        const move = (e) => {
            const rect = slider.getBoundingClientRect();
            let x = (e.clientX || e.touches[0].clientX) - rect.left;
            x = Math.max(0, Math.min(x, rect.width));
            const percent = (x / rect.width) * 100;
            resizeDiv.style.width = `${percent}%`;
            handle.style.left = `${percent}%`;
        };
        slider.addEventListener('mousemove', move);
        slider.addEventListener('touchmove', move);
    }

    // Initialize Barbershop Module
    if (window.initBarbershop) {
        window.initBarbershop({
            document,
            setupImageUpload,
            setupOptionButtons,
            showContentModal,
            hideAndClearModal,
            lucide,
            API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound,
            getAspectRatioClass,
            autoSelectClosestRatio,
            getImageAspectRatio,
            getClosestStandardRatio
        });
    }

    // Initialize Desain Rumah Module
    if (window.initDesainRumah) {
        desainRumahModule = window.initDesainRumah({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            API_KEY,
            GENERATE_URL,
            CHAT_URL,
            getApiErrorMessage,
            doneSound,
            errorSound,
            getImageAspectRatio,
            getClosestStandardRatio
        });
    }

    // Initialize Sketsa Gambar Module
    if (window.initSketsaGambar) {
        sketsaGambarModule = window.initSketsaGambar({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
    }

    // Initialize Art & Karikatur Module
        if (window.initArtKarikatur) {
            artKarikaturModule = window.initArtKarikatur({
                document,
                setupImageUpload,
                setupOptionButtons,
                getAspectRatioClass,
                autoSelectClosestRatio,
                lucide,
                API_KEY,
                GENERATE_URL,
                CHAT_URL,
                getApiErrorMessage,
                doneSound,
                errorSound
            });
        }



    lucide.createIcons();
    // Initialize Assistant Module
    if (window.initAssistant) {
        const { initBeranda: initBerandaFn } = window.initAssistant({
            document,
            chatSound,
            switchTab,
            API_KEY,
            GENERATE_URL,
            CHAT_URL,
            lucide,
            convertHeicToJpg,
            base64ToBlob,
            showModernPopup,
            showUploadLimitPopup,
            setupImageUpload,
            getApiErrorMessage,
            doneSound,
            errorSound
        });
        window.initBeranda = initBerandaFn;
        initBerandaFn();
    }

    // Initialize Auto Rapi Module
    if (window.initAutoRapi) {
        autoRapiModule = window.initAutoRapi({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            lucide,
            API_KEY,
            GENERATE_URL,
            CHAT_URL,
            getApiErrorMessage,
            doneSound,
            errorSound,
            initBeforeAfterSlider,
            switchTab
        });
    }

    // Potret Cinta logic moved to js/potret-cinta.js

    switchTab('beranda');

    const initialLoader = document.getElementById('initial-page-loader');
    if (initialLoader) {
        initialLoader.classList.add('opacity-0');
        setTimeout(() => initialLoader.remove(), 700);
    }

    const footerTextEl = document.getElementById('footer-text');
    if (footerTextEl) {
        const appVariant = document.body?.dataset?.app;
        const logoImg = '<img src="/sflogo.png" class="w-3 h-3 inline-block mr-1 align-middle" alt="Logo">';
        if (appVariant === 'vip') {
            footerTextEl.innerHTML = `${logoImg} 2026. Sulap Foto versi ${CURRENT_APP_VERSION} <span class="sf-vip-badge sf-vip-badge--footer align-middle">VIP</span> by A-Labs`;
        } else {
            footerTextEl.innerHTML = `${logoImg} 2026. Sulap Foto versi ${CURRENT_APP_VERSION} <span class="sf-pro-badge align-middle">PRO</span> by A-Labs`;
        }
    }

    const rmpPlayer = document.getElementById('ramadhan-music-player');
    if (rmpPlayer) {
        const rmpAudio = document.getElementById('ramadhan-audio');
        const rmpPlayBtn = document.getElementById('rmp-play');
        const rmpNextBtn = document.getElementById('rmp-next');
        const rmpTitle = document.getElementById('rmp-track-title');
        const rmpEq = document.getElementById('rmp-eq');
        const rmpVolume = document.getElementById('rmp-volume');
        const rmpToggle = document.getElementById('rmp-toggle');
        const tracks = [
            { title: 'Sulap Foto - Original', src: '/assets/Sulap Foto - Original.mp3' },
            { title: 'Sulap Foto - Idul Fitri', src: '/assets/Sulap Foto - Idul Fitri.mp3' },
            { title: 'Sulap Foto - Penuh Berkah', src: '/assets/Sulap Foto - Penuh Berkah.mp3' },
            { title: 'Sulap Foto - Ramadhan Cuan', src: '/assets/Sulap Foto - Ramadhan Cuan.mp3' }
        ];
        let currentIndex = 0;

        const setPlayIcon = (iconName) => {
            if (!rmpPlayBtn) return;
            rmpPlayBtn.innerHTML = `<i data-lucide="${iconName}" class="mmp-icon"></i>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        };

        const formatTime = (seconds) => {
            if (isNaN(seconds)) return '0:00';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        const updateProgress = () => {
            const progressFill = document.getElementById('mmp-progress-fill');
            const currentTime = document.getElementById('mmp-current-time');
            const duration = document.getElementById('mmp-duration');
            
            if (rmpAudio && progressFill) {
                const percent = (rmpAudio.currentTime / rmpAudio.duration) * 100 || 0;
                progressFill.style.width = percent + '%';
            }
            
            if (rmpAudio && currentTime) {
                currentTime.textContent = formatTime(rmpAudio.currentTime);
            }
            
            if (rmpAudio && duration && rmpAudio.duration) {
                duration.textContent = formatTime(rmpAudio.duration);
            }
        };

        const setToggleIcon = (iconName, label) => {
            if (!rmpToggle) return;
            rmpToggle.setAttribute('aria-label', label);
            rmpToggle.innerHTML = `<i data-lucide="${iconName}" class="rmp-icon"></i>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        };

        const setTrack = (index, shouldPlay = false) => {
            if (!rmpAudio) return;
            currentIndex = index % tracks.length;
            if (rmpTitle) rmpTitle.textContent = tracks[currentIndex].title;
            rmpAudio.src = tracks[currentIndex].src;
            rmpAudio.load();
            if (shouldPlay) {
                rmpAudio.play().catch(() => {});
            }
        };

        // Set default volume to 30%
        if (rmpAudio) {
            rmpAudio.volume = 0.1;
        }
        
        // Volume control slider (if exists)
        if (rmpAudio && rmpVolume) {
            rmpVolume.value = 0.3;
            rmpVolume.addEventListener('input', (e) => {
                rmpAudio.volume = parseFloat(e.target.value);
            });
        }

        if (rmpAudio) {
            rmpAudio.addEventListener('play', () => {
                if (rmpEq) rmpEq.classList.add('playing');
                setPlayIcon('pause');
            });

            rmpAudio.addEventListener('pause', () => {
                if (rmpEq) rmpEq.classList.remove('playing');
                setPlayIcon('play');
            });

            // Progress bar updates
            rmpAudio.addEventListener('timeupdate', updateProgress);
            rmpAudio.addEventListener('loadedmetadata', updateProgress);
            
            // Seek functionality - click on progress bar
            const progressBar = document.getElementById('mmp-progress-bar');
            if (progressBar) {
                progressBar.addEventListener('click', (e) => {
                    if (!rmpAudio || !rmpAudio.duration) return;
                    const rect = progressBar.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const percent = clickX / rect.width;
                    rmpAudio.currentTime = percent * rmpAudio.duration;
                });
            }

        // Draggable Logic for Music Player
        if (typeof rmpPlayer !== 'undefined' && rmpPlayer) {
            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

            const initDragPosition = () => {
                if (rmpPlayer.dataset.dragInitialized) return;
                const rect = rmpPlayer.getBoundingClientRect();
                rmpPlayer.style.left = rect.left + 'px';
                rmpPlayer.style.top = rect.top + 'px';
                rmpPlayer.style.bottom = 'auto';
                rmpPlayer.style.right = 'auto';
                rmpPlayer.style.transform = 'none';
                rmpPlayer.style.margin = '0';
                rmpPlayer.dataset.dragInitialized = 'true';
            };

            const dragMouseDown = (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('input')) return;
                e.preventDefault();
                initDragPosition();
                pos3 = e.clientX;
                pos4 = e.clientY;
                document.onmouseup = closeDragElement;
                document.onmousemove = elementDrag;
            };

            const dragTouchStart = (e) => {
                 if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('input')) return;
                 // e.preventDefault(); 
                 initDragPosition();
                 pos3 = e.touches[0].clientX;
                 pos4 = e.touches[0].clientY;
                 document.ontouchend = closeDragElement;
                 document.ontouchmove = elementDragTouch;
            };

            const elementDrag = (e) => {
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                rmpPlayer.style.top = (rmpPlayer.offsetTop - pos2) + "px";
                rmpPlayer.style.left = (rmpPlayer.offsetLeft - pos1) + "px";
            };

            const elementDragTouch = (e) => {
                // e.preventDefault(); 
                pos1 = pos3 - e.touches[0].clientX;
                pos2 = pos4 - e.touches[0].clientY;
                pos3 = e.touches[0].clientX;
                pos4 = e.touches[0].clientY;
                rmpPlayer.style.top = (rmpPlayer.offsetTop - pos2) + "px";
                rmpPlayer.style.left = (rmpPlayer.offsetLeft - pos1) + "px";
            };

            const closeDragElement = () => {
                document.onmouseup = null;
                document.onmousemove = null;
                document.ontouchend = null;
                document.ontouchmove = null;
            };

            // rmpPlayer.onmousedown = dragMouseDown;
            // rmpPlayer.ontouchstart = dragTouchStart;
        }

            rmpAudio.addEventListener('ended', () => {
                setTrack((currentIndex + 1) % tracks.length, true);
            });
        }

        if (rmpPlayBtn) {
            rmpPlayBtn.addEventListener('click', () => {
                if (!rmpAudio) return;
                if (rmpAudio.paused) {
                    rmpAudio.play().catch(() => {});
                } else {
                    rmpAudio.pause();
                }
            });
        }

        if (rmpNextBtn) {
            rmpNextBtn.addEventListener('click', () => {
                setTrack((currentIndex + 1) % tracks.length, true);
            });
        }

        // rmpToggle logic removed as per request

        // Auto-hide (minimize) on mobile start - REMOVED
        // Music autoplay disabled — playback only via user click on play button.

        setTrack(0, false);
        setPlayIcon('play');
    }
    if (typeof initBuatGambar === 'function') {
        initBuatGambar({
            setupOptionButtons,
            setupLogoUpload,
            setupLogoControls,
            setupSlider,
            API_KEY,
            GENERATE_URL,
            getApiErrorMessage
        });
    }

    // Initialize Foto Wisuda Module
    if (window.initFotoWisuda) {
        window.initFotoWisuda({
            document,
            setupImageUpload,
            setupOptionButtons,
            getAspectRatioClass,
            autoSelectClosestRatio,
            lucide,
            API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound,
            convertHeicToJpg,
            switchTab
        });
    }


    const tabCreateMascot = document.getElementById('tab-create-mascot');
    if (tabCreateMascot) {
        tabCreateMascot.addEventListener('click', () => switchTab('create-mascot'));


        if (typeof initBuatMascot === 'function') {
            initBuatMascot({
                document,
                setupOptionButtons,
                getAspectRatioClass,
                lucide,
                getApiKey: () => API_KEY,
                GENERATE_URL,
                getApiErrorMessage,
                doneSound,
                errorSound
            });
        }
    }

    // Initialize Video Thumbnail Module
    if (window.initVideoThumbnail) {
        window.initVideoThumbnail({
            document,
            convertHeicToJpg,
            lucide,
            API_KEY,
            GENERATE_URL,
            CHAT_URL,
            getApiErrorMessage,
            doneSound,
            errorSound,
            getAspectRatioClass,
            autoSelectClosestRatio,
            switchTab
        });
    }

    // Initialize Watermark Module
    if (window.initWatermark) {
        window.initWatermark({
            document,
            API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound,
            switchTab,
            convertHeicToJpg,
            autoSelectClosestRatio,
            lucide
        });
    }


    // Foto Polaroid logic moved to js/foto-polaroid.js

    const tabSizeProduk = document.getElementById('tab-size-produk');
    if (tabSizeProduk) {
        if (window.initSizeObjek) {
            window.initSizeObjek({
                setupImageUpload,
                autoSelectClosestRatio,
                lucide,
                doneSound,
                switchTab
            });
        } else {
        tabSizeProduk.addEventListener('click', () => switchTab('size-produk'));

        const spProductName = document.getElementById('sp-product-name');
        const spProductSize = document.getElementById('sp-product-size');
        const spCompareOptions = document.getElementById('sp-compare-options');
        const spRatioOptions = document.getElementById('sp-ratio-options');
        const spCountSlider = document.getElementById('sp-count-slider');
        const spCountValue = document.getElementById('sp-count-value');
        const spGenerateBtn = document.getElementById('sp-generate-btn');
        const spResultsGrid = document.getElementById('sp-results-grid');
        const spResultsPlaceholder = document.getElementById('sp-results-placeholder');

        const spSourceUpload = document.getElementById('sp-source-upload');
        const spSourceManual = document.getElementById('sp-source-manual');
        const spUploadSection = document.getElementById('sp-upload-section');
        const spManualSection = document.getElementById('sp-manual-section');
        const spAnalysisResult = document.getElementById('sp-analysis-result');
        const spResultSizeInput = document.getElementById('sp-result-size-input');

        const spImageInput = document.getElementById('sp-image-input');
        const spUploadBox = document.getElementById('sp-upload-box');
        const spUploadPlaceholder = document.getElementById('sp-upload-placeholder');
        const spUploadPreview = document.getElementById('sp-upload-preview');
        const spRemoveUpload = document.getElementById('sp-remove-upload');
        const spAnalyzeBtn = document.getElementById('sp-analyze-btn');
        const spAnalyzeTextBtn = document.getElementById('sp-analyze-text-btn');

        let spImageData = null;
        let spActiveSource = 'upload';
        let spAnalyzedData = { size: '' };

        function spSetSource(source) {
            spActiveSource = source;
            if (source === 'upload') {
                spSourceUpload.classList.add('bg-white', 'text-teal-600', 'shadow-sm');
                spSourceUpload.classList.remove('text-slate-500');
                spSourceManual.classList.remove('bg-white', 'text-teal-600', 'shadow-sm');
                spSourceManual.classList.add('text-slate-500');

                spUploadSection.classList.remove('hidden');
                spManualSection.classList.add('hidden');

                spAnalysisResult.classList.remove('hidden');
            } else {
                spSourceManual.classList.add('bg-white', 'text-teal-600', 'shadow-sm');
                spSourceManual.classList.remove('text-slate-500');
                spSourceUpload.classList.remove('bg-white', 'text-teal-600', 'shadow-sm');
                spSourceUpload.classList.add('text-slate-500');

                spUploadSection.classList.add('hidden');
                spManualSection.classList.remove('hidden');
                spAnalysisResult.classList.add('hidden');
            }
        }

        if (spSourceUpload && spSourceManual) {
            spSourceUpload.addEventListener('click', () => spSetSource('upload'));
            spSourceManual.addEventListener('click', () => spSetSource('manual'));
            spSetSource('upload');
        }

        setupImageUpload(spImageInput, spUploadBox, (data) => {
            spImageData = data;
            spUploadPreview.src = data.dataUrl;
            spUploadPreview.classList.remove('hidden');
            spUploadPlaceholder.classList.add('hidden');
            spRemoveUpload.classList.remove('hidden');
            spAnalyzeBtn.disabled = false;

            spAnalyzedData = { size: '' };
            spResultSizeInput.value = '';
            spAnalysisResult.classList.remove('hidden');
        });

        if (spRemoveUpload) {
            spRemoveUpload.addEventListener('click', (e) => {
                e.stopPropagation();
                spImageData = null;
                spImageInput.value = '';
                spUploadPreview.src = '';
                spUploadPreview.classList.add('hidden');
                spUploadPlaceholder.classList.remove('hidden');
                spRemoveUpload.classList.add('hidden');
                spAnalyzeBtn.disabled = true;

                spAnalyzedData = { size: '' };
                spResultSizeInput.value = '';
                spAnalysisResult.classList.remove('hidden');
            });
        }

        function handleAnalysisResult(data) {
            spAnalyzedData.size = data.size || '';

            if (spActiveSource === 'upload') {
                spResultSizeInput.value = spAnalyzedData.size;
                spAnalysisResult.classList.remove('hidden');
            } else {
                spProductName.value = data.name || spProductName.value;
                spProductSize.value = spAnalyzedData.size;
                spProductName.classList.add('ring-2', 'ring-teal-500');
                spProductSize.classList.add('ring-2', 'ring-teal-500');
                setTimeout(() => {
                    spProductName.classList.remove('ring-2', 'ring-teal-500');
                    spProductSize.classList.remove('ring-2', 'ring-teal-500');
                }, 2000);
            }

            if (data.comparisons && Array.isArray(data.comparisons) && data.comparisons.length > 0) {
                spCompareOptions.innerHTML = '';
                data.comparisons.forEach((comp, index) => {
                    const btn = document.createElement('button');
                    btn.dataset.value = comp;
                    btn.className = `option-btn ${index === 0 ? 'selected' : ''} py-2.5`;
                    btn.textContent = comp;
                    spCompareOptions.appendChild(btn);
                });
            }
        }

        if (spAnalyzeBtn) {
            spAnalyzeBtn.addEventListener('click', async () => {
                if (!spImageData) return;

                const originalBtnHTML = spAnalyzeBtn.innerHTML;
                spAnalyzeBtn.disabled = true;
                spAnalyzeBtn.innerHTML = `<div class="spinner"></div> Menganalisa...`;

                try {
                    const prompt = `Analyze this image and identify the main object. Estimate its real-world dimensions (length, width, or height) in metric (cm) or imperial (inch). 
                            Also suggest 6 suitable comparison objects to visualize scale.
                            CRITICAL: The comparison objects MUST be in Bahasa Indonesia (e.g., Koin, Tangan, Manusia, Mobil).
                            Return JSON: {"size": "Dimensions", "comparisons": ["Benda1", "Benda2", ...]}. Only JSON. No Object Name needed.`;
                    const formData = new FormData();
                    formData.append('prompt', prompt);
                    const base64ToBlob = (base64, mimeType) => {
                        const byteCharacters = atob(base64);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        return new Blob([byteArray], { type: mimeType });
                    };
                    formData.append('images[]', base64ToBlob(spImageData.base64, spImageData.mimeType), 'object.jpg');
                    const response = await fetch(`${CHAT_URL}`, {
                        method: 'POST',
                        headers: {
                            'X-API-Key': API_KEY
                        },
                        body: formData
                    });
                    if (!response.ok) throw new Error(await getApiErrorMessage(response));

                    const result = await response.json();
                    const text = (result.success && result.response ? result.response : (result.response || result.candidates?.[0]?.content?.parts?.[0]?.text || '')).trim();
                    const jsonMatch = text.match(/\{[\s\S]*\}/);

                    if (jsonMatch) {
                        handleAnalysisResult(JSON.parse(jsonMatch[0]));
                    } else {
                        alert("Gagal membaca hasil analisa.");
                    }

                } catch (error) {
                    console.error("Image Analysis failed:", error);
                    alert("Gagal menganalisa gambar: " + error.message);
                } finally {
                    spAnalyzeBtn.innerHTML = originalBtnHTML;
                    spAnalyzeBtn.disabled = false;
                }
            });
        }

        if (spAnalyzeTextBtn) {
            spAnalyzeTextBtn.addEventListener('click', async () => {
                const nameInput = spProductName.value.trim();
                if (!nameInput) {
                    alert("Masukkan nama objek terlebih dahulu.");
                    return;
                }

                const originalBtnHTML = spAnalyzeTextBtn.innerHTML;
                const originalBg = spAnalyzeTextBtn.style.background;
                spAnalyzeTextBtn.disabled = true;
                spAnalyzeTextBtn.innerHTML = `<div class="spinner"></div>`;

                try {
                    const prompt = `Object Name: "${nameInput}". 
                            Estimate its standard real-world dimensions. Suggest 6 suitable comparison objects.
                            CRITICAL: The comparison objects MUST be in Bahasa Indonesia.
                            Return JSON: {"name": "${nameInput}", "size": "Estimated Dimensions", "comparisons": ["Benda1", "Benda2", ...]}. Only JSON.`;
                    const formData = new FormData();
                    formData.append('prompt', prompt);
                    const response = await fetch(`${CHAT_URL}`, {
                        method: 'POST',
                        headers: {
                            'X-API-Key': API_KEY
                        },
                        body: formData
                    });
                    if (!response.ok) throw new Error(await getApiErrorMessage(response));

                    const result = await response.json();
                    const text = (result.success && result.response ? result.response : (result.response || result.candidates?.[0]?.content?.parts?.[0]?.text || '')).trim();
                    const jsonMatch = text.match(/\{[\s\S]*\}/);

                    if (jsonMatch) {
                        handleAnalysisResult(JSON.parse(jsonMatch[0]));
                    } else {
                        alert("Gagal mendapatkan data objek.");
                    }
                } catch (error) {
                    console.error("Text Analysis failed:", error);
                    alert("Gagal menganalisa teks: " + error.message);
                } finally {
                    spAnalyzeTextBtn.innerHTML = originalBtnHTML;
                    spAnalyzeTextBtn.disabled = false;
                }
            });
        }


        if (spCountSlider && spCountValue) {
            spCountSlider.addEventListener('input', (e) => {
                spCountValue.textContent = e.target.value;
            });
        }

        [spCompareOptions, spRatioOptions].forEach(parent => {
            if (parent) {
                parent.addEventListener('click', (e) => {
                    const btn = e.target.closest('button');
                    if (btn) {
                        parent.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
                        btn.classList.add('selected');
                    }
                });
            }
        });


        }
    }






    // Initialize Age Filter Module
    if (window.initAgeFilter) {
        window.initAgeFilter({
            document,
            API_KEY,
            GENERATE_URL,
            getApiErrorMessage,
            doneSound,
            errorSound,
            switchTab,
            convertHeicToJpg,
            setupOptionButtons,
            autoSelectClosestRatio,
            lucide
        });
    }

    // Initialize POV Selfie Module
    if (window.initPOVSelfie) {
        window.initPOVSelfie({
            document,
            API_KEY,
            GENERATE_URL,
            setupImageUpload,
            setupOptionButtons,
            autoSelectClosestRatio,
            lucide,
            doneSound,
            errorSound,
            switchTab
        });
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const sulapVideoBtn = document.getElementById('tab-sulap-video');
    const sulapVideoModal = document.getElementById('sulap-video-modal');
    const closeSulapVideoModal = document.getElementById('close-sulap-video-modal');

    if (sulapVideoBtn && sulapVideoModal && closeSulapVideoModal) {
        sulapVideoBtn.addEventListener('click', (e) => {
            e.preventDefault();


            const sidebar = document.querySelector('aside');
            const backdrop = document.getElementById('sidebar-backdrop');
            if (sidebar && !sidebar.classList.contains('-translate-x-full') && window.innerWidth < 768) {
                sidebar.classList.add('-translate-x-full');
                if (backdrop) backdrop.classList.remove('opacity-100', 'pointer-events-auto');
            }

            sulapVideoModal.classList.add('visible');

            if (typeof lucide !== 'undefined') lucide.createIcons();
        });

        closeSulapVideoModal.addEventListener('click', () => {
            sulapVideoModal.classList.remove('visible');
        });

        sulapVideoModal.addEventListener('click', (e) => {
            if (e.target === sulapVideoModal) {
                sulapVideoModal.classList.remove('visible');
            }
        });
    }
});
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window !== 'undefined' && window.IS_VIP_APP) return;
    const modal = document.getElementById('upgrade-vip-modal');
    const closeBtn = document.getElementById('upgrade-vip-modal-close');

    if (!modal) return;

    const closeModal = () => {
        modal.classList.remove('active');
        modal.style.display = '';
    };
    const showUpgradeVipModal = () => {
        modal.classList.add('active');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    const handleVipClick = (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();

        showUpgradeVipModal();
    };

    // Function to attach listener to VIP buttons
    const vipGenerateButtonIds = [
        'ti-generate-btn',
        'bc-generate-btn',
        'cl-generate-btn',
        'bm-generate-btn',
        'fk-generate-btn',
        'fp-generate-btn',
        'cf-generate-btn',
        'sp-generate-btn',
        'ho-generate-btn',
        'gp-generate-btn',
        'vt-generate-btn',
        'wm-generate-btn',
        'af-generate-btn',
        'povs-generate-btn',
        'w2-generate-btn'
    ];
    const attachVipGenerateListeners = () => {
        vipGenerateButtonIds.forEach((id) => {
            const btn = document.getElementById(id);
            if (btn && !btn.dataset.vipGenerateAttached) {
                btn.addEventListener('click', handleVipClick, true);
                btn.dataset.vipGenerateAttached = 'true';
            }
        });
    };
    const attachVipCountLimit = () => {
        const sliders = document.querySelectorAll('input[type="range"][id$="-count-slider"], input[type="range"][id$="-result-slider"], input[type="range"][id$="-result-count-slider"]');
        sliders.forEach((slider) => {
            if (slider.dataset.vipCountAttached) return;
            slider.addEventListener('input', (e) => {
                // Check if booster is active
                const boosterToggle = document.getElementById('boost-generate-toggle') || document.getElementById('boost-generate-toggle-home');
                const isBoosterOn = boosterToggle && boosterToggle.checked;
                
                const value = parseInt(e.target.value, 10) || 0;
                const maxAllowed = isBoosterOn ? 10 : 1;
                
                if (value > maxAllowed) {
                    e.target.value = maxAllowed;
                    const valueEl = document.getElementById(e.target.id.replace('-slider', '-value'));
                    if (valueEl) {
                        valueEl.textContent = maxAllowed === 1 ? '1 Gambar' : `${maxAllowed} Gambar`;
                    }
                    
                    if (!isBoosterOn) {
                        // Show popup to activate booster
                        const popup = document.createElement('div');
                        popup.className = 'fixed top-24 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg z-[9999] transition-all duration-300 flex items-center gap-2';
                        popup.style.maxWidth = '90%';
                        popup.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-yellow-400"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><span>Aktifkan Boost Mode untuk generate lebih dari 1 gambar</span>';
                        document.body.appendChild(popup);
                        setTimeout(() => {
                            popup.classList.add('opacity-0', '-translate-y-4');
                            setTimeout(() => popup.remove(), 300);
                        }, 3000);
                    }
                }
            });
            slider.dataset.vipCountAttached = 'true';
        });
    };

    // Global anti-manipulation: validated slider count helper
    // Usage: const count = window.getSafeImageCount('feature-count-slider');
    window.getSafeImageCount = function(sliderId) {
        const slider = document.getElementById(sliderId);
        if (!slider) return 1;
        const raw = parseInt(slider.value) || 1;
        const boostToggle = document.getElementById('boost-generate-toggle') || document.getElementById('boost-generate-toggle-home');
        const isBoostOn = boostToggle && boostToggle.checked;
        if (!isBoostOn) return 1;
        return Math.min(Math.max(1, raw), 10);
    };

    // Initial attach
    attachVipGenerateListeners();
    attachVipCountLimit();

    // Observer for dynamic content
    const observer = new MutationObserver((mutations) => {
        let shouldReattach = false;
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0) shouldReattach = true;
        });
        if (shouldReattach) {
            attachVipGenerateListeners();
            attachVipCountLimit();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
});
document.addEventListener('DOMContentLoaded', () => {
    const banner = document.getElementById('pwa-install-modal');
    if (!banner) return;
    if (window.IS_VIP_APP) {
        localStorage.setItem('sf_pwa_start_path', '/vipacc');
    }
    const startPath = localStorage.getItem('sf_pwa_start_path') || '';
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone && startPath === '/vipacc' && window.location.pathname !== '/vipacc') {
        window.location.replace('/vipacc');
        return;
    }
    if (banner.parentElement !== document.body) {
        document.body.appendChild(banner);
    }

    const installBtn = document.getElementById('pwa-install-btn');
    const dismissBtn = document.getElementById('pwa-dismiss-btn');
    const neverBtn = document.getElementById('pwa-never-btn');
    const closeBtn = document.getElementById('pwa-close-btn');
    const backdrop = document.getElementById('pwa-install-backdrop');
    const sectionPrompt = document.getElementById('pwa-section-prompt');
    const sectionIos = document.getElementById('pwa-section-ios');
    const sectionAndroid = document.getElementById('pwa-section-android');
    const sectionDesktop = document.getElementById('pwa-section-desktop');

    const dismissed = localStorage.getItem('sf_pwa_prompt_dismissed') === '1';
    const isVerified = localStorage.getItem('sulapfoto_verified_email');
    if (dismissed || isStandalone || !isVerified) {
        banner.classList.add('hidden');
        return;
    }

    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    const isMac = /macintosh/.test(ua) && !isIOS;
    const isWindows = /windows/.test(ua);

    let deferredPrompt = null;

    const hideAllSections = () => {
        [sectionPrompt, sectionIos, sectionAndroid, sectionDesktop].forEach((section) => {
            if (section && !section.classList.contains('hidden')) section.classList.add('hidden');
        });
    };

    const setSections = (mode) => {
        hideAllSections();
        if (mode === 'prompt' && sectionPrompt) sectionPrompt.classList.remove('hidden');
        if (mode === 'ios' && sectionIos) sectionIos.classList.remove('hidden');
        if (mode === 'android' && sectionAndroid) sectionAndroid.classList.remove('hidden');
        if (mode === 'desktop' && sectionDesktop) sectionDesktop.classList.remove('hidden');
        if (installBtn) {
            if (mode === 'prompt') installBtn.classList.remove('hidden');
            else installBtn.classList.add('hidden');
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    const showBanner = () => {
        banner.classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    const hideBanner = () => {
        banner.classList.add('hidden');
    };

    if (dismissBtn) dismissBtn.addEventListener('click', hideBanner);
    if (closeBtn) closeBtn.addEventListener('click', hideBanner);
    if (backdrop) backdrop.addEventListener('click', hideBanner);
    if (neverBtn) {
        neverBtn.addEventListener('click', () => {
            localStorage.setItem('sf_pwa_prompt_dismissed', '1');
            hideBanner();
        });
    }

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const choice = await deferredPrompt.userChoice;
            if (choice && choice.outcome === 'accepted') {
                localStorage.setItem('sf_pwa_prompt_dismissed', '1');
            }
            deferredPrompt = null;
            hideBanner();
        });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const dismissed = localStorage.getItem('sf_pwa_prompt_dismissed') === '1';
        const isVerified = localStorage.getItem('sulapfoto_verified_email');
        if (dismissed || isStandalone || !isVerified) return;
        showBanner();
        setSections('prompt');
    });

    window.addEventListener('appinstalled', () => {
        localStorage.setItem('sf_pwa_prompt_dismissed', '1');
        hideBanner();
    });

    const fallbackShow = () => {
        if (dismissed || isStandalone) return;
        if (deferredPrompt) {
            setSections('prompt');
            showBanner();
            return;
        }
        if (isIOS) setSections('ios');
        else if (isAndroid) setSections('android');
        else if (isMac || isWindows) setSections('desktop');
        else setSections('desktop');
        showBanner();
    };

    setTimeout(fallbackShow, 400);

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(() => { });
        });
    }
});
// Integration of /chat features
document.addEventListener('DOMContentLoaded', () => {
    // --- AI Concept Magic Button ---
    const akMagicPromptBtn = document.getElementById('ak-magic-prompt-btn');
    const akPromptInput = document.getElementById('ak-prompt-input');
    const akTypeOptions = document.getElementById('ak-type-options');
    const akStyleOptions = document.getElementById('ak-style-options');
    const akCustomStyleInput = document.getElementById('ak-custom-style-input');

    if (akMagicPromptBtn && akPromptInput) {
        akMagicPromptBtn.addEventListener('click', async () => {
            // Check akImageData
            let hasImage = false;
            if (typeof akImageData !== 'undefined' && akImageData) {
                hasImage = true;
            }

            if (!hasImage) {
                return;
            }

            const originalBtnHTML = akMagicPromptBtn.innerHTML;
            akMagicPromptBtn.disabled = true;
            akMagicPromptBtn.innerHTML = `<div class="spinner"></div>`;

            try {
                const type = akTypeOptions.querySelector('.selected').dataset.value;
                let style = akStyleOptions.querySelector('.selected').dataset.value;
                if (style === 'Kustom') {
                    style = akCustomStyleInput.value.trim() || 'Seni Digital';
                }

                const systemPrompt = `You are a creative art director. Analyze the user's photo, their chosen art type, and style. Based on these, write a concise, descriptive instruction in Indonesian that adds creative details to the final image. For example, 'Tambahkan latar belakang pemandangan kota di malam hari dengan lampu neon' or 'Buat ekspresi wajah menjadi tersenyum lebar dan gembira'. Respond ONLY with the instruction text.`;
                const userQuery = `Analisis foto ini. Jenis: ${type}. Gaya: ${style}. Buatkan satu instruksi tambahan yang kreatif.`;

                const formData = new FormData();
                formData.append('prompt', userQuery);
                formData.append('instruction', systemPrompt);

                const byteCharacters = atob(akImageData.base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: akImageData.mimeType });
                formData.append('images[]', blob, `image.jpg`);

                const response = await fetch(`${CHAT_URL}`, {
                    method: 'POST',
                    headers: {
                        'X-API-Key': API_KEY
                    },
                    body: formData
                });

                if (!response.ok) throw new Error("Gagal menghubungi AI");
                const result = await response.json();

                if (result.success && result.response) {
                    const responseStr = typeof result.response === 'string' ? result.response : JSON.stringify(result.response);
                    akPromptInput.value = responseStr.trim();
                }
            } catch (error) {
                console.error("AI Concept Magic Error:", error);
                alert(error.message);
            } finally {
                akMagicPromptBtn.innerHTML = originalBtnHTML;
                akMagicPromptBtn.disabled = false;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }


});
// Logo Upload Logic
let psLogoData = null;
let fsLogoData = null;
let tiLogoData = null;

function setupLogoUpload(inputId, previewId, removeBtnId, controlsId, callback) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const removeBtn = document.getElementById(removeBtnId);
    const controls = document.getElementById(controlsId);

    if (!input) return;

    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target.result.split(',')[1];
                const mimeType = file.type;
                const dataUrl = e.target.result;

                preview.src = dataUrl;
                preview.classList.remove('hidden');
                removeBtn.classList.remove('hidden');
                if (controls) controls.classList.remove('hidden');

                callback({ base64, mimeType, dataUrl });
            };
            reader.readAsDataURL(file);
        }
    });

    removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        input.value = '';
        preview.src = '';
        preview.classList.add('hidden');
        removeBtn.classList.add('hidden');
        if (controls) controls.classList.add('hidden');
        callback(null);
    });
}

function setupLogoControls(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn) {
            // Remove selected class from siblings
            btn.parentElement.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        }
    });
}

function setupSlider(inputId, valueId, suffix = '') {
    const input = document.getElementById(inputId);
    const valueDisplay = document.getElementById(valueId);
    if (input && valueDisplay) {
        const initialValue = input.value;
        input.addEventListener('input', () => {
            // Jika slider disabled, kembalikan ke nilai awal
            if (input.disabled) {
                input.value = initialValue;
                valueDisplay.textContent = initialValue + suffix;
            } else {
                valueDisplay.textContent = input.value + suffix;
            }
        });
    }
}

// Initialize Logo Uploaders
setupLogoUpload('ps-logo-input', 'ps-logo-preview', 'ps-logo-remove', 'ps-logo-controls', (data) => {
    psLogoData = data;
});

setupLogoUpload('fs-logo-input', 'fs-logo-preview', 'fs-logo-remove', 'fs-logo-controls', (data) => {
    fsLogoData = data;
});

setupLogoUpload('ti-logo-input', 'ti-logo-preview', 'ti-logo-remove', 'ti-logo-controls', (data) => {
    tiLogoData = data;
});

// Initialize Controls
setupLogoControls('ps-logo-position-options');
setupLogoControls('fs-logo-position-options');
setupLogoControls('ti-logo-position-options');

setupSlider('ps-logo-opacity-input', 'ps-logo-opacity-value', '%');
setupSlider('ps-logo-size-input', 'ps-logo-size-value', 'px');
setupSlider('ps-count-slider', 'ps-count-value', ' Gambar');
setupSlider('fs-logo-opacity-input', 'fs-logo-opacity-value', '%');
// setupSlider('fs-logo-size-input', 'fs-logo-size-value', 'px');

// Helper to Apply Logo
async function applyLogoToImage(imageSrc, logoBase64, position, opacity, size) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            // Draw main image
            ctx.drawImage(img, 0, 0);

            if (logoBase64) {
                const logo = new Image();
                logo.crossOrigin = "Anonymous"; // Ensure logo also handles CORS if needed
                logo.onload = () => {
                    // Logo sizing
                    const logoWidth = size || 2;
                    const scale = logoWidth / logo.width;
                    const logoHeight = logo.height * scale;

                    let x = 0;
                    let y = 0;
                    const padding = canvas.width * 0.05;

                    switch (position) {
                        case 'top-left':
                            x = padding;
                            y = padding;
                            break;
                        case 'top-right':
                            x = canvas.width - logoWidth - padding;
                            y = padding;
                            break;
                        case 'bottom-left':
                            x = padding;
                            y = canvas.height - logoHeight - padding;
                            break;
                        case 'bottom-right':
                            x = canvas.width - logoWidth - padding;
                            y = canvas.height - logoHeight - padding;
                            break;
                        case 'center':
                            x = (canvas.width - logoWidth) / 2;
                            y = (canvas.height - logoHeight) / 2;
                            break;
                        default: // bottom-right default
                            x = canvas.width - logoWidth - padding;
                            y = canvas.height - logoHeight - padding;
                    }

                    ctx.globalAlpha = opacity;
                    ctx.drawImage(logo, x, y, logoWidth, logoHeight);
                    ctx.globalAlpha = 1.0;

                    resolve(canvas.toDataURL('image/png'));
                };
                logo.onerror = (e) => {
                    console.error("Failed to load logo image", e);
                    resolve(imageSrc); // Fallback to original
                };
                logo.src = 'data:image/png;base64,' + logoBase64;
            } else {
                resolve(imageSrc);
            }
        };
        img.onerror = (e) => {
            console.error("Failed to load main image for logo application", e);
            // If we can't load the image (CORS?), we return the original src
            resolve(imageSrc);
        };
        img.src = imageSrc;
    });
}
// Auto Refresh Logic - system_info merged into ?config=true on first call (no separate fetch)

// Boost Generate Toggle Logic
const BOOST_FEATURE_LABELS = {
    'beranda': 'Beranda',
    'product-photography': 'Gabung Foto',
    'foto-miniatur': 'Foto Miniatur',
    'perluas-foto': 'Perluas Foto',
    'edit-foto': 'Edit Foto',
    'perbaiki-foto': 'Perbaiki Foto',
    'face-swap': 'Face Swap',
    'face-swap-3': 'Face Swap v3',
    'hapus-bg': 'Hapus BG',
    'hapus-bg-2': 'Hapus BG v2',
    'foto-artis': 'Foto Artis',
    'fashion': 'Foto Fashion',
    'desain-mockup': 'Buat Mockup',
    'buat-banner': 'Buat Banner',
    'bikin-carousel': 'Buat Carousel',
    'pov-tangan': 'POV Tangan',
    'pre-wedding': 'Pre+Wedding',
    'potret-cinta': 'Potret Cinta',
    'potret-cinta-2': 'Potret Cinta v2',
    'kamar-pas': 'Kamar Pas',
    'retouch-wajah': 'Retouch',
    'model-create': 'Buat Model',
    'model-repose': 'Ubah Pose',
    'model-angle': 'Ubah Angle',
    'baby': 'Baby Born',
    'kids': 'Foto Anak',
    'umrah': 'Umroh & Haji',
    'passport': 'Buat Pas Foto',
    'maternity': 'Foto Maternity',
    'barbershop': 'Barbershop',
    'desain-rumah': 'Desain Rumah',
    'sketch-to-image': 'Sketsa Gambar',
    'art-karikatur': 'Art & Karikatur',
    'auto-rapi': 'Auto Rapi',
    'cv-lamaran': 'Buat CV',
    'poster-flyer': 'Poster Flyer',
    'infografis': 'Infografis',
    'wedding-invitation': 'Undangan',
    'cover-buku': 'Cover Buku',
    'anime-to-real': 'Anime to Real',
    'buat-topeng': 'Buat Topeng',
    'gambar-ke-prompt': 'Gambar2Prompt',
    'video-generator': 'AI Video',
    'super-quote': 'Super Quote',
    'baby-v2': 'Foto Bayi v2',
    'studio-keluarga': 'Studio Keluarga',
    'idul-fitri': 'Idul Fitri',
    'upscale-gambar': 'Upscale Gambar',
    'text-to-image': 'Buat Gambar',
    'business-card': 'Kartu Nama',
    'create-logo': 'Buat Logo',
    'create-mascot': 'Buat Mascot',
    'photo-collage': 'Foto Kolase',
    'foto-polaroid': 'Foto Polaroid',
    'crop-foto': 'Crop Foto',
    'size-produk': 'Size Objek',
    'hapus-objek': 'Hapus Objek',
    'graduation-photo': 'Foto Wisuda',
    'video-thumbnail': 'Thumbnail',
    'watermark': 'Watermark',
    'age-filter': 'Filter Usia',
    'pov-selfie': 'POV Selfie',
    'blur-background': 'Blur BG',
    'ganti-background': 'Ganti BG',
    'time-machine': 'Time Machine',
    'meme-creator': 'Meme Creator',
    'food-photography': 'Foto Makanan',
    'sulap-musik': 'Sulap Musik',
    'sulap-video': 'Sulap Video',
    'gif-maker': 'GIF Maker',
    'compress-images': 'Compress IMG',
    'storyboard': 'Storyboard',
    'product-only': 'Produk Saja',
    'product-model': 'Produk + Model',
    'wedding-2': 'Wedding v2',
    'text-to-speech': 'Text to Speech',
    'vto': 'Virtual Try-On',
    'foto-bayi': 'Foto Bayi',
    'meme-generator': 'Meme Creator',
};
window.BOOST_FEATURE_LABELS = BOOST_FEATURE_LABELS;

function getActiveBoostFeature() {
    const activeEl = document.querySelector('.tab-content-pane.is-active');
    if (!activeEl) return { key: 'beranda', name: 'Beranda' };
    const key = activeEl.id.replace('content-', '') || 'beranda';
    if (key === 'beranda') return { key: 'beranda', name: 'Beranda' };
    // Primary: read from actual sidebar button (always reflects real menu name)
    const btn = document.getElementById('tab-' + key) || document.getElementById('subtab-' + key);
    if (btn) {
        const firstSpan = btn.querySelector('span');
        if (firstSpan) return { key, name: firstSpan.textContent.trim() };
    }
    // Fallback: corrected static map
    const name = BOOST_FEATURE_LABELS[key] || key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return { key, name };
}
window.getActiveBoostFeature = getActiveBoostFeature;

document.addEventListener('DOMContentLoaded', () => {
    let userBoostQuota = 100;
    let boostAutoActivated = false;
    const boostToggles = document.querySelectorAll('.boost-toggle-group');

    function updateBoostLabel() {
        if (!boostToggles.length) return;
        
        // Dispatch event for other scripts (e.g., addons.js)
        document.dispatchEvent(new CustomEvent('sulap:boost-updated'));

        boostToggles.forEach(toggle => {
            // Update Tooltip Visibility
            const label = toggle.closest('label');
            if (label) {
                const tooltip = label.querySelector('.boost-toggle-tooltip');
                if (tooltip) {
                    if (toggle.checked) {
                        tooltip.classList.remove('active');
                    } else {
                        tooltip.classList.add('active');
                    }
                }
            }

            const container = toggle.closest('.flex.items-center.justify-between') || toggle.closest('.bg-white');
            if (!container) return;
            const p = container.querySelector('p.text-\\[9px\\]') || container.querySelector('#boost-status-text-home');
            
            if (p) {
                if (toggle.checked) {
                    p.textContent = `Sisa kuota boost ${userBoostQuota} gambar`;
                    p.classList.remove('text-slate-400', 'text-slate-500');
                    p.classList.add('text-emerald-500', 'font-bold');
                } else if (userBoostQuota === 0) {
                    p.textContent = `Sisa kuota boost ${userBoostQuota} gambar`;
                    p.classList.remove('text-emerald-500');
                    p.classList.add('text-slate-400', 'font-bold');
                } else {
                    p.textContent = 'Aktifkan untuk kecepatan generate maksimal!';
                    p.classList.remove('text-emerald-500', 'font-bold');
                    p.classList.add('text-slate-400', 'text-slate-500');
                }
            }
        });
    }

    // Apply boost data received from server (called from config response or standalone fetch)
    function applyBoostData(data) {
        if (!data || data.quota === undefined) return;
        userBoostQuota = parseInt(data.quota);
        let serverBoostActive = data.boost_active === true;
        const isVip = typeof window !== 'undefined' && !!window.IS_VIP_APP;
        // If non-VIP (pro) but boost is active in DB, force it off
        if (!isVip && serverBoostActive) {
            const em = localStorage.getItem('sulapfoto_verified_email');
            if (em) {
                fetch(`server/boost_quota.php?action=set_boost_status&email=${encodeURIComponent(em)}&status=false&_ts=${Date.now()}`)
                    .catch(() => {});
            }
        }
        // Auto-aktif Boost Mode sekali saat pertama masuk halaman VIP jika ada kuota
        if (isVip && !boostAutoActivated && userBoostQuota > 0 && !serverBoostActive) {
            serverBoostActive = true;
            const _em = localStorage.getItem('sulapfoto_verified_email');
            if (_em) {
                fetch(`server/boost_quota.php?action=set_boost_status&email=${encodeURIComponent(_em)}&status=true&_ts=${Date.now()}`)
                    .catch(() => {});
            }
        }
        boostAutoActivated = true;
        // Capture current toggle state before applying server update (for VIP desync guard)
        const _prevOn = boostToggles.length > 0 && boostToggles[0].checked;
        boostToggles.forEach(toggle => {
            if (!toggle.disabled) {
                // VIP desync guard: jika user sudah ON tapi server tiba-tiba kirim OFF
                // dengan quota masih ada, re-sync kembali ke ON untuk menghindari
                // transient DB read yang mematikan boost secara tidak sengaja.
                if (isVip && _prevOn && !serverBoostActive && userBoostQuota > 0) {
                    toggle.checked = true;
                    const _em = localStorage.getItem('sulapfoto_verified_email');
                    if (_em) {
                        fetch(`server/boost_quota.php?action=set_boost_status&email=${encodeURIComponent(_em)}&status=true&_ts=${Date.now()}`)
                            .catch(() => {});
                    }
                } else {
                    toggle.checked = isVip && serverBoostActive && userBoostQuota > 0;
                }
            }
        });
        const isChecked = boostToggles.length > 0 && boostToggles[0].checked;
        const boostServerContainer = document.getElementById('boost-server-container');
        const hasMultipleBaseUrls = typeof BASE_URLS !== 'undefined' && BASE_URLS.length > 1;
        const hasFlowUrl = typeof BASE_URL_FLOW !== 'undefined' && BASE_URL_FLOW && BASE_URL_FLOW.trim() !== '';
        if (boostServerContainer && (hasMultipleBaseUrls || hasFlowUrl)) {
            if (isChecked) {
                boostServerContainer.classList.remove('hidden');
            } else {
                boostServerContainer.classList.add('hidden');
            }
        }
        updateBoostLabel();
        // Baca state toggle aktual (sudah termasuk desync guard di atas)
        const isBoostOn = boostToggles.length > 0 && boostToggles[0].checked;
        applySliderState(isBoostOn);
        try { document.dispatchEvent(new CustomEvent('sulap:boost-updated')); } catch (e) {}
    }

    async function fetchBoostQuota() {
        const email = localStorage.getItem('sulapfoto_verified_email');
        if (!email) return;
        try {
            const res = await fetch('server/boost_quota.php?action=get_status&email=' + encodeURIComponent(email) + '&_ts=' + Date.now());
            const data = await res.json();
            if (data.success) applyBoostData(data);
        } catch (e) {
            console.error('Failed to fetch boost quota', e);
        }
    }

    // Expose globally
    window.applyBoostData  = applyBoostData;
    window.fetchBoostQuota = fetchBoostQuota;

    if (boostToggles.length > 0) {
        updateBoostLabel();



        // Handle change for variable update
        boostToggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                
                // Sync all other toggles
                boostToggles.forEach(otherToggle => {
                    if (otherToggle !== e.target) {
                        otherToggle.checked = isChecked;
                    }
                });

                const isVip = typeof window !== 'undefined' && !!window.IS_VIP_APP;
                const email = localStorage.getItem('sulapfoto_verified_email');

                if (!isVip && isChecked) {
                    // Revert check if not VIP
                    e.target.checked = false;
                    boostToggles.forEach(t => t.checked = false); // Revert all
                    
                    if (window.showBoostModeVipOnlyPopup) {
                        window.showBoostModeVipOnlyPopup();
                    } else {
                        alert("Fitur Boost Mode hanya untuk pengguna VIP!");
                    }
                    updateBoostLabel();
                    updateAllResultCountSliders();
                    return;
                }

                if (isChecked && userBoostQuota <= 0) {
                    // Revert check if no quota
                    e.target.checked = false;
                    boostToggles.forEach(t => t.checked = false); // Revert all
                    
                    if (window.showBoostTopUpModal) {
                         window.showBoostTopUpModal();
                    } else if (window.showServerToast) {
                        window.showServerToast("Kuota Boost Habis! Silakan isi ulang.");
                    } else {
                         alert("Kuota Boost Habis! Silakan isi ulang.");
                    }
                    updateBoostLabel();
                    updateAllResultCountSliders();
                    return;
                }

                // Parallel generation handled by Promise.allSettled in feature files
                
                // Show/Hide server dropdown
                const boostServerContainer = document.getElementById('boost-server-container');
                const hasMultipleBaseUrls = typeof BASE_URLS !== 'undefined' && BASE_URLS.length > 1;
                const hasFlowUrl = typeof BASE_URL_FLOW !== 'undefined' && BASE_URL_FLOW && BASE_URL_FLOW.trim() !== '';
                if (boostServerContainer && (hasMultipleBaseUrls || hasFlowUrl)) {
                    if (isChecked) {
                        boostServerContainer.classList.remove('hidden');
                    } else {
                        boostServerContainer.classList.add('hidden');
                    }
                }
                
                // Save status to server
                if (email) {
                     fetch(`server/boost_quota.php?action=set_boost_status&email=${encodeURIComponent(email)}&status=${isChecked}&_ts=${Date.now()}`)
                        .catch(err => console.error('Failed to save boost status', err));
                }

                if (window.showServerToast) {
                    const toast = window.showServerToast(
                        isChecked ? "Boost Mode Aktif - Generate Hingga 10 Gambar" : "Boost Mode Nonaktif",
                        null,
                        {
                            icon: `<svg class="text-teal-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
                        }
                    );
                    if (window.hideServerToast) {
                        setTimeout(() => {
                            window.hideServerToast(toast);
                        }, 5000);
                    }
                }
                updateBoostLabel();
                updateAllResultCountSliders();
            });
        });
    }

    // Centralized: Lock/Unlock all result-count sliders based on boost mode from database
    function updateAllResultCountSliders() {
        const email = localStorage.getItem('sulapfoto_verified_email');
        if (!email) {
            // No email, lock all sliders
            applySliderState(false);
            return;
        }

        // Use current toggle state (boost data comes from config polling — no separate fetch)
        const isBoostOn = boostToggles.length > 0 && boostToggles[0].checked;
        applySliderState(isBoostOn);
    }

    function applySliderState(isBoostOn) {
        const allSliders = document.querySelectorAll('input[type="range"][id*="count-slider"]');
        const selectedModel = localStorage.getItem('private_server_model');
        const isRestrictedModel = selectedModel === 'nanobanana_pro' || selectedModel === 'grok' || selectedModel === 'gpt_image_15' || selectedModel === 'qwen';
        
        // Read quota from sidebar label (single source of truth)
        let quotaFromLabel = 10;
        const boostLabelElement = document.querySelector('p.text-\\[9px\\]') || document.querySelector('#boost-status-text-home');
        if (boostLabelElement) {
            const labelText = boostLabelElement.textContent || '';
            const match = labelText.match(/Sisa kuota boost (\d+) gambar/);
            if (match && match[1]) {
                quotaFromLabel = parseInt(match[1]);
            }
        }
        
        // Dynamic max based on quota from label (min 1, max 10)
        const dynamicMax = Math.min(Math.max(1, quotaFromLabel), 10);
        
        allSliders.forEach(slider => {
            // Skip non-result sliders (e.g. tts-speed, tts-pitch, wm-count for watermark repeats)
            const sid = slider.id || '';
            if (sid.startsWith('tts-') || sid === 'wm-count-slider') return;
            
            const wrapper = slider.closest('.sf-slider-wrapper') || slider.parentElement;
            const infoEl = wrapper?.parentElement?.querySelector('.sf-boost-slider-info') || wrapper?.querySelector('.sf-boost-slider-info');
            const display = wrapper?.querySelector('[id*="count-display"], [id*="count-value"]');
            
            if (isRestrictedModel) {
                slider.value = 1;
                slider.max = 1;
                slider.disabled = true;
                slider.classList.add('opacity-50', 'cursor-not-allowed');
                slider.classList.remove('cursor-pointer');
                if (infoEl) infoEl.classList.add('hidden');
                if (display) display.textContent = '1 Gambar';
            } else if (!isBoostOn) {
                // When boost mode is OFF, disable slider and reset to 1
                slider.value = 1;
                slider.max = 10;
                slider.disabled = true;
                slider.classList.add('opacity-50', 'cursor-not-allowed');
                slider.classList.remove('cursor-pointer');
                if (infoEl) infoEl.classList.add('hidden');
                if (display) {
                    const suffix = display.textContent.includes('Banner') ? ' Banner' : (display.textContent.includes('Gambar') ? ' Gambar' : '');
                    display.textContent = '1' + suffix;
                }
            } else {
                // Boost mode is ON and not restricted model
                slider.max = dynamicMax;
                slider.disabled = false;
                slider.classList.remove('opacity-50', 'cursor-not-allowed');
                slider.classList.add('cursor-pointer');
                if (infoEl) infoEl.classList.add('hidden');
                
                // Cap current value if exceeds new max
                if (parseInt(slider.value) > dynamicMax) {
                    slider.value = dynamicMax;
                    if (display) {
                        const suffix = display.textContent.includes('Banner') ? ' Banner' : (display.textContent.includes('Gambar') ? ' Gambar' : ' Foto');
                        display.textContent = dynamicMax + suffix;
                    }
                }
            }
        });
        
        // Dispatch event so individual JS can react
        document.dispatchEvent(new CustomEvent('sulap:slider-lock-updated', { detail: { boostOn: isBoostOn } }));
    }


    // Global input event delegation for all count-slider elements
    document.addEventListener('input', function(e) {
        const slider = e.target;
        if (!slider.matches('input[type="range"][id*="count-slider"]')) return;
        
        const wrapper = slider.closest('.sf-slider-wrapper') || slider.parentElement;
        if (wrapper) {
            const display = wrapper.querySelector('[id*="count-display"], [id*="count-value"]');
            if (display) {
                // If original text had " Gambar", preserve it
                const suffix = display.textContent.includes('Gambar') ? ' Gambar' : '';
                display.textContent = slider.value + suffix;
            }
        }
    });
    
    const origUpdateBoostLabel = updateBoostLabel;
    const _patchedUpdateBoostLabel = function() {
        origUpdateBoostLabel();
        updateAllResultCountSliders();
    };
    // Patch: after fetchBoostQuota resolves, also update sliders
    document.addEventListener('sulap:boost-updated', updateAllResultCountSliders);
    
    // Lock all sliders immediately on page load (before async fetch)
    // This prevents users from cheating by sliding during fetch window
    applySliderState(false);
    
    // Boost data comes from config polling — no separate initial fetch needed
    
    // Qwen only supports 16:9 — lock aspect ratio / layout options on all pages when selected.
    // Detects ratio groups by their button values (numeric ratios + named layouts) so it works
    // regardless of container id (e.g. *-ratio-options, vs-vector-ratio, bc-size-options, pflyer-layout-options).
    function applyQwenAspectRatioLock() {
        const isQwen = localStorage.getItem('private_server_model') === 'qwen';
        const NUMERIC_RE = /^\d{1,2}:\d{1,2}$/;
        const NAMED_TOKENS = ['vertical', 'horizontal', 'square', 'portrait', 'landscape', 'potret', 'lanskap', 'persegi'];
        // Values considered the "16:9 / landscape" equivalent that stays enabled for Qwen
        const LANDSCAPE_VALUES = ['16:9', 'horizontal', 'landscape', 'lanskap'];

        const isRatioToken = (v) => NUMERIC_RE.test(v) || NAMED_TOKENS.includes(v.toLowerCase());

        // Group ratio-like option buttons by their direct container
        const groups = new Map();
        document.querySelectorAll('.option-btn').forEach(btn => {
            const val = (btn.dataset.value || btn.dataset.ratio || '').trim();
            if (!val || !isRatioToken(val)) return;
            const container = btn.parentElement;
            if (!container) return;
            if (!groups.has(container)) groups.set(container, []);
            groups.get(container).push({ btn, val });
        });

        groups.forEach(items => {
            // Only act on groups that actually offer a 16:9 / landscape option
            const landscapeItem = items.find(it => LANDSCAPE_VALUES.includes(it.val.toLowerCase()));
            if (!landscapeItem) return;
            items.forEach(({ btn }) => {
                if (isQwen) {
                    if (btn === landscapeItem.btn) {
                        btn.disabled = false;
                        btn.classList.remove('opacity-40', 'cursor-not-allowed', 'qwen-locked');
                        // Auto-select 16:9: trigger the page handler (updates internal ratio var)
                        // and force the selected class in case the page manages selection differently.
                        if (!btn.classList.contains('selected')) btn.click();
                        btn.classList.add('selected');
                    } else {
                        btn.classList.remove('selected');
                        btn.disabled = true;
                        btn.classList.add('opacity-40', 'cursor-not-allowed', 'qwen-locked');
                    }
                } else if (btn.classList.contains('qwen-locked')) {
                    btn.disabled = false;
                    btn.classList.remove('opacity-40', 'cursor-not-allowed', 'qwen-locked');
                }
            });
        });
    }
    window.applyQwenAspectRatioLock = applyQwenAspectRatioLock;
    applyQwenAspectRatioLock();

    // Listen for private server model changes to update sliders (especially for Nano Banana 2)
    window.addEventListener('privateServerModelChanged', function(e) {
        updateAllResultCountSliders();
        applyQwenAspectRatioLock();
    });
    
    // Also listen for storage events (cross-tab changes)
    window.addEventListener('storage', function(e) {
        if (e.key === 'private_server_model') {
            updateAllResultCountSliders();
            applyQwenAspectRatioLock();
        }
    });

    // Initialize Boost Server Dropdown
    const boostServerContainer = document.getElementById('boost-server-container');
    const boostServerSelect = document.getElementById('boost-server-select');
    
    if (boostServerContainer && boostServerSelect) {
        const hasMultipleBaseUrls = typeof BASE_URLS !== 'undefined' && BASE_URLS.length > 1;
        const hasFlowUrl = typeof BASE_URL_FLOW !== 'undefined' && BASE_URL_FLOW && BASE_URL_FLOW.trim() !== '';
        
        if (hasMultipleBaseUrls || hasFlowUrl) {
            // Initial visibility check based on toggle
            const isAnyChecked = Array.from(boostToggles).some(t => t.checked);
            if (isAnyChecked) {
                 boostServerContainer.classList.remove('hidden');
            } else {
                 boostServerContainer.classList.add('hidden');
            }
            
            // Clear existing options except first
            while (boostServerSelect.options.length > 1) {
                boostServerSelect.remove(1);
            }
            
            // Add BASE_URL servers
            if (hasMultipleBaseUrls) {
                BASE_URLS.forEach((url, index) => {
                    const option = document.createElement('option');
                    option.value = `base_${index}`;
                    option.text = `Server ${index + 1} (PUBLIC)`;
                    boostServerSelect.appendChild(option);
                });
            }
            
            // Add BASE_URL_FLOW server
            if (hasFlowUrl) {
                const option = document.createElement('option');
                option.value = 'flow';
                option.text = 'Premium Server (PRIVATE)';
                boostServerSelect.appendChild(option);
            }
            
            // Force random/default on refresh
            localStorage.removeItem('sulapfoto_boost_server');
            boostServerSelect.value = 'random';
            
            // Event listener - Save selection to localStorage
            boostServerSelect.addEventListener('change', (e) => {
                localStorage.setItem('sulapfoto_boost_server', e.target.value);
            });
        }
    }

    // Intercept fetch to decrease quota on every successful base64 result
    const originalFetch = window.fetch;
    window.fetch = async function(input, init) {
        // Capture boost state at REQUEST START (not after response)
        const email = localStorage.getItem('sulapfoto_verified_email');
        const boostToggle = document.getElementById('boost-generate-toggle') || document.getElementById('boost-generate-toggle-home');
        const isBoostActiveAtStart = boostToggle && boostToggle.checked;
        
        const response = await originalFetch.apply(this, arguments);
        
        // Only process successful responses
        if (!response.ok) return response;
        
        if (!email) return response;
        
        // Use boost state captured at START, not current state
        if (!isBoostActiveAtStart) return response;
        
        try {
            const clone = response.clone();
            const data = await clone.json();
            
            // Detect if response contains base64 image result
            const hasImageResult = data && (
                (data.success === true || data.success === "true") && 
                (data.imageUrl || data.base64 || data.image || data.url)
            );
            
            if (hasImageResult) {
                // Decrease quota in background (non-blocking)
                const _bf = (typeof window.getActiveBoostFeature === 'function') ? window.getActiveBoostFeature() : { key: '', name: '' };
                fetch('server/boost_quota.php?action=decrease_quota&email=' + encodeURIComponent(email) + '&amount=1&feature_key=' + encodeURIComponent(_bf.key) + '&feature_name=' + encodeURIComponent(_bf.name) + '&_ts=' + Date.now())
                    .then(res => res.json())
                    .then(quotaData => {
                        if (quotaData.success) {
                            userBoostQuota = parseInt(quotaData.quota);
                            updateBoostLabel();
                            
                            // Update slider max dynamically based on remaining quota from label
                            if (userBoostQuota > 0) {
                                const boostToggle = document.getElementById('boost-generate-toggle') || document.getElementById('boost-generate-toggle-home');
                                const isBoostOn = boostToggle && boostToggle.checked;
                                if (isBoostOn) {
                                    applySliderState(true);
                                }
                            }
                            
                            // If quota runs out, disable boost mode
                            if (userBoostQuota <= 0) {
                                const boostToggles = document.querySelectorAll('.boost-toggle-group');
                                boostToggles.forEach(t => { t.checked = false; });
                                
                                // Save boost_active=false to database (same as manual toggle off)
                                fetch(`server/boost_quota.php?action=set_boost_status&email=${encodeURIComponent(email)}&status=false&_ts=${Date.now()}`)
                                    .catch(err => console.error('Failed to save boost status', err));
                                
                                // Immediately lock sliders to prevent bug
                                applySliderState(false);
                                
                                // Update label
                                updateBoostLabel();
                                
                                if (window.showServerToast) {
                                    const toast = window.showServerToast("⚠️ Kuota Boost habis! Mode Boost dinonaktifkan.");
                                    if (window.hideServerToast) {
                                        setTimeout(() => window.hideServerToast(toast), 5000);
                                    }
                                }
                            }
                        }
                    })
                    .catch(err => console.error('Error decreasing boost quota:', err));
            }
        } catch (e) {
            // Ignore JSON parse errors (non-JSON responses)
        }
        
        return response;
    };
});

// Spinner Optimization: Pause animation when out of viewport
document.addEventListener('DOMContentLoaded', () => {
    const spinnerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.remove('paused');
            } else {
                entry.target.classList.add('paused');
            }
        });
    }, { threshold: 0.01 });

    const observeSpinners = () => {
        const spinners = document.querySelectorAll('.spinner');
        spinners.forEach(s => {
            s.classList.add('paused'); // Start paused
            spinnerObserver.observe(s);
        });
    };

    // Initial observation
    observeSpinners();

    // Optional: Observe dynamic additions (basic implementation)
    // For a more robust solution, use MutationObserver if needed
    // exposing to window for manual call if needed
    window.observeSpinners = observeSpinners;
});

// Gemini Key UI Handler
document.addEventListener('DOMContentLoaded', () => {
    const geminiKeyBtn = document.getElementById('tab-gemini-key');
    if (geminiKeyBtn) {
        geminiKeyBtn.addEventListener('click', () => {
            const modal = document.getElementById('universal-modal');
            const title = document.getElementById('modal-title');
            const body = document.getElementById('modal-body');
            const closeBtn = document.getElementById('close-modal-btn');
            const modalContent = modal ? modal.querySelector('.modal-content') : null;

            if (modal && title && body && modalContent) {
                modalContent.classList.add('bg-white', 'text-slate-900');
                if (closeBtn) closeBtn.classList.replace('text-slate-400', 'text-slate-500');
                if (closeBtn) closeBtn.classList.replace('hover:text-white', 'hover:text-slate-900');

                title.textContent = 'Set Gemini Cookie';
                const currentCookie = localStorage.getItem('sulapfoto_gemini_cookie') || '';
                
                body.innerHTML = `
                    <div class="space-y-6">
                        <div class="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 p-4 rounded-xl text-xs flex items-start gap-3">
                            <i data-lucide="alert-triangle" class="w-5 h-5 flex-shrink-0"></i>
                            <div>
                                <p class="font-bold mb-1">Penting: Gemini Cookie</p>
                                <p class="leading-relaxed text-slate-600 dark:text-slate-400 mb-3">Masukkan cookie Gemini Anda untuk menggunakan fitur AI yang lebih canggih. Cookie ini diperlukan untuk autentikasi dengan server Gemini.</p>
                            </div>
                        </div>

                        <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                            <h4 class="text-teal-600 dark:text-teal-400 font-semibold mb-3 text-sm flex items-center gap-2">
                                <i data-lucide="book-open" class="w-4 h-4"></i> Cara Mendapatkan Cookie Gemini
                            </h4>
                            <ol class="list-decimal list-outside ml-4 space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                <li>Buka <a href="https://gemini.google.com" target="_blank" class="text-teal-500 hover:underline">gemini.google.com</a> di browser Anda.</li>
                                <li>Login dengan akun Google Anda.</li>
                                <li>Buka Developer Tools (F12 atau Ctrl+Shift+I).</li>
                                <li>Pergi ke tab <b>Application</b> → <b>Cookies</b> → <b>https://gemini.google.com</b>.</li>
                                <li>Cari cookie dengan nama <b>__Secure-1PSID</b>.</li>
                                <li>Copy nilai cookie tersebut dan paste ke kolom di bawah ini.</li>
                            </ol>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Gemini Cookie</label>
                            <div class="relative">
                                <textarea id="gemini-cookie-input" rows="4" class="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder-slate-400 dark:placeholder-slate-500 text-sm font-mono transition-all resize-none" placeholder="Paste cookie Gemini disini...">${currentCookie}</textarea>
                            </div>
                        </div>

                        <div class="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                             <button id="cancel-gemini-cookie" class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm">Tutup</button>
                             <button id="clear-gemini-cookie" class="bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 font-medium py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2 ${!currentCookie ? 'hidden' : ''}">
                                <i data-lucide="trash-2" class="w-4 h-4"></i> Hapus
                             </button>
                             <button id="save-gemini-cookie" class="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2">
                                <i data-lucide="save" class="w-4 h-4"></i> Simpan
                             </button>
                        </div>
                    </div>
                `;
                
                modal.style.zIndex = '10000';
                modal.classList.add('visible');
                
                if (window.lucide) {
                    window.lucide.createIcons();
                }

                const cookieInput = document.getElementById('gemini-cookie-input');
                const saveBtn = document.getElementById('save-gemini-cookie');
                const clearBtn = document.getElementById('clear-gemini-cookie');
                const cancelBtn = document.getElementById('cancel-gemini-cookie');

                saveBtn.addEventListener('click', () => {
                    const cookieValue = cookieInput.value.trim();
                    if (cookieValue) {
                        localStorage.setItem('sulapfoto_gemini_cookie', cookieValue);
                        modal.classList.remove('visible');
                        showToast('Cookie Gemini berhasil disimpan!', 'success');
                    } else {
                        showToast('Cookie tidak boleh kosong!', 'error');
                    }
                });

                clearBtn.addEventListener('click', () => {
                    if (confirm('Apakah Anda yakin ingin menghapus cookie Gemini?')) {
                        localStorage.removeItem('sulapfoto_gemini_cookie');
                        cookieInput.value = '';
                        clearBtn.classList.add('hidden');
                        showToast('Cookie Gemini berhasil dihapus!', 'success');
                    }
                });

                cancelBtn.addEventListener('click', () => {
                    modal.classList.remove('visible');
                });

                closeBtn.addEventListener('click', () => {
                    modal.classList.remove('visible');
                });
            }
        });
    }
});



