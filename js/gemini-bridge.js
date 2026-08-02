(function() {
    // Detect if running in iframe
    const isEmbedded = window.parent !== window;
    if (!isEmbedded) return;

    console.log('[GeminiBridge] Embedded mode detected');

    // Generate unique ID
    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

    // Pending requests map
    const pendingRequests = new Map();

    // Listen for messages from parent
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (!data || data.source !== 'sufo-server') return;

        // Handle Auth Response
        if (data.type === 'auth-response') {
            console.log('[GeminiBridge] Auth token received:', data.token);
            
            // Hide verification overlay if present
            const overlay = document.getElementById('verification-overlay');
            if (overlay) {
                overlay.style.display = 'none';
                overlay.classList.add('hidden');
            }
            return;
        }

        // Handle API Responses
        if (data.id && pendingRequests.has(data.id)) {
            const { resolve, reject } = pendingRequests.get(data.id);
            pendingRequests.delete(data.id);
            
            if (data.error) {
                console.error('[GeminiBridge] Error:', data.error);
                reject(new Error(data.error));
            } else {
                resolve(data.result);
            }
        }
    });

    // Initiate Auth Request
    window.parent.postMessage({ source: 'sufo-auth-request' }, '*');

    // Helper: File to Base64
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Process images (File/Blob/DataURL -> { mimeType, base64 })
    async function processImages(images) {
        if (!images || !images.length) return [];
        const processed = [];
        
        // Ensure images is an array
        const imgArray = Array.isArray(images) ? images : [images];
        
        for (const img of imgArray) {
            if (img instanceof File || img instanceof Blob) {
                 const base64 = await fileToBase64(img);
                 processed.push({
                     mimeType: img.type || 'image/png',
                     base64: base64
                 });
            } else if (typeof img === 'string') {
                if (img.startsWith('data:')) {
                    const [meta, data] = img.split(',');
                    const mimeType = meta.split(':')[1].split(';')[0];
                    processed.push({
                        mimeType,
                        base64: data
                    });
                } else {
                    console.warn('[GeminiBridge] Unsupported image format (URL):', img);
                }
            }
        }
        return processed;
    }

    // Expose Bridge API
    window.GeminiBridge = {
        isAvailable: true,

        chat: async ({ prompt, images }) => {
            const id = generateId();
            const processedImages = await processImages(images);
            
            return new Promise((resolve, reject) => {
                pendingRequests.set(id, { resolve, reject });
                window.parent.postMessage({
                    source: 'sufo-bridge',
                    id,
                    type: 'chat',
                    payload: {
                        prompt,
                        images: processedImages
                    }
                }, '*');
            });
        },

        generate: async ({ instruction, aspectRatio, images }) => {
            const id = generateId();
            const processedImages = await processImages(images);
            
            return new Promise((resolve, reject) => {
                pendingRequests.set(id, { resolve, reject });
                window.parent.postMessage({
                    source: 'sufo-bridge',
                    id,
                    type: 'generate',
                    payload: {
                        instruction,
                        aspectRatio,
                        images: processedImages
                    }
                }, '*');
            });
        },

        tts: async (payload) => {
            const id = generateId();
            const payloadCopy = { ...payload };
            
            // Handle audio/image files in payload
            if (payloadCopy.audio instanceof File || payloadCopy.audio instanceof Blob) {
                payloadCopy.audio = await fileToBase64(payloadCopy.audio);
            }
            if (payloadCopy.image instanceof File || payloadCopy.image instanceof Blob) {
                 payloadCopy.image = await fileToBase64(payloadCopy.image);
            }

            return new Promise((resolve, reject) => {
                pendingRequests.set(id, { resolve, reject });
                window.parent.postMessage({
                    source: 'sufo-bridge',
                    id,
                    type: 'tts',
                    payload: payloadCopy
                }, '*');
            });
        }
    };

})();
