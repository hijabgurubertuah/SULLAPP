document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('myfavorite-search');
    const resultsEl = document.getElementById('myfavorite-results');
    const listEl = document.getElementById('myfavorite-list');
    const emptyEl = document.getElementById('myfavorite-empty');
    const countEl = document.getElementById('myfavorite-count');
    const resetBtn = document.getElementById('myfavorite-reset');
    const searchCardEl = document.getElementById('myfavorite-search-card');
    const featurePanelEl = document.getElementById('myfavorite-feature-panel');
    const featureHostEl = document.getElementById('myfavorite-feature-host');
    const featureTitleEl = document.getElementById('myfavorite-feature-title');
    const featureCloseBtn = document.getElementById('myfavorite-feature-close');

    if (!searchInput || !resultsEl || !listEl || !emptyEl) return;

    const STORAGE_KEY = 'sf_my_favorite_items';
    const embeddedState = {
        key: '',
        contentEl: null,
        originalParent: null,
        placeholder: null
    };

    function normalizeText(s) {
        return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    }
    function formatCurrencyIDR(amount) {
        const n = Number(amount);
        if (!Number.isFinite(n)) return '';
        return `Rp ${n.toLocaleString('id-ID')}`;
    }

    function safeIconName(name) {
        const s = String(name || '').trim();
        if (!s) return '';
        if (!/^[a-z0-9-]+$/i.test(s)) return '';
        return s;
    }

    function getStoredFavorites() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            const list = Array.isArray(parsed) ? parsed : [];
            return list
                .map((x) => {
                    if (!x) return null;
                    if (x.id && x.kind) return x;
                    if (x.key) {
                        return {
                            id: `tab:${x.key}`,
                            kind: 'tab',
                            tabKey: x.key,
                            label: x.label || x.key,
                            icon: safeIconName(x.icon) || ''
                        };
                    }
                    return null;
                })
                .filter(Boolean);
        } catch (e) {
            return [];
        }
    }

    function setStoredFavorites(items) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items || []));
        } catch (e) { }
    }

    const SUBTAB_DEFS = {
        'subtab-model-create': { kind: 'model_sub', tabKey: 'model', subKey: 'create' },
        'subtab-model-repose': { kind: 'model_sub', tabKey: 'model', subKey: 'repose' },
        'subtab-model-angle': { kind: 'model_sub', tabKey: 'model', subKey: 'angle' },
        'subtab-baby': { kind: 'photographer_sub', tabKey: 'photographer-rental', subKey: 'baby' },
        'subtab-kids': { kind: 'photographer_sub', tabKey: 'photographer-rental', subKey: 'kids' },
        'subtab-umrah': { kind: 'photographer_sub', tabKey: 'photographer-rental', subKey: 'umrah' },
        'subtab-passport': { kind: 'photographer_sub', tabKey: 'photographer-rental', subKey: 'passport' },
        'subtab-maternity': { kind: 'photographer_sub', tabKey: 'photographer-rental', subKey: 'maternity' }
    };

    function extractButtonLabel(btn) {
        if (!btn) return '';
        let label = '';
        const spans = Array.from(btn.querySelectorAll('span'));
        for (const sp of spans) {
            const text = (sp.textContent || '').trim();
            if (!text) continue;
            if (text === 'New' || text === 'VIP' || text === 'Hot' || text === 'Launch' || text === 'Addons') continue;
            label = text;
            break;
        }
        if (!label) {
            label = (btn.textContent || '').replace(/\s+/g, ' ').trim();
            label = label.replace(/\b(New|VIP|Hot|Launch|Addons)\b/g, '').replace(/\s+/g, ' ').trim();
        }
        return label;
    }

    function extractButtonIcon(btn) {
        if (!btn) return '';
        const el = btn.querySelector('[data-lucide]');
        if (!el) return '';
        return safeIconName(el.getAttribute('data-lucide') || '');
    }

    function getFeatureCatalog() {
        const mapping = window.SF_TAB_MAPPING || {};
        const inv = window.SF_TAB_MAPPING_INV || {};
        const tabButtons = Array.from(document.querySelectorAll('aside .sidebar-btn[id^="tab-"]'));
        const subtabButtons = Array.from(document.querySelectorAll('aside .sidebar-btn[id^="subtab-"]'));
        const items = [];

        tabButtons.forEach((btn) => {
            const id = btn.id || '';
            const mappedId = id.replace(/^tab-/, '').trim();
            const tabKey = inv[mappedId] || '';
            if (!tabKey) return;
            if (tabKey === 'addons' || tabKey === 'beranda' || tabKey === 'my-favorite') return;

            const contentName = mapping[tabKey];
            if (!contentName) return;
            const content = document.getElementById(`content-${contentName}`);
            if (!content) return;

            const label = extractButtonLabel(btn);
            if (!label) return;
            const icon = extractButtonIcon(btn);

            items.push({
                id: `tab:${tabKey}`,
                kind: 'tab',
                tabKey: tabKey,
                label: label,
                icon: icon || ''
            });
        });

        subtabButtons.forEach((btn) => {
            const def = SUBTAB_DEFS[btn.id || ''];
            if (!def) return;
            const mappingName = mapping[def.tabKey];
            if (!mappingName) return;
            const content = document.getElementById(`content-${mappingName}`);
            if (!content) return;

            const label = extractButtonLabel(btn);
            if (!label) return;
            const icon = extractButtonIcon(btn);

            const id = `${def.kind}:${def.tabKey}:${def.subKey}`;
            items.push({
                id,
                kind: def.kind,
                tabKey: def.tabKey,
                subKey: def.subKey,
                label,
                icon: icon || ''
            });
        });

        const byId = new Map();
        items.forEach((it) => {
            if (!byId.has(it.id)) byId.set(it.id, it);
        });

        return Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label, 'id'));
    }

    let featureCatalog = [];
    let featureIndex = [];

    function rebuildFeatureCatalog() {
        featureCatalog = getFeatureCatalog();
        featureIndex = featureCatalog.map((it) => ({ ...it, norm: normalizeText(it.label) }));
    }

    rebuildFeatureCatalog();

    function restoreEmbeddedFeature() {
        if (!embeddedState.contentEl || !embeddedState.originalParent || !embeddedState.placeholder) {
            if (featurePanelEl) featurePanelEl.classList.add('hidden');
            if (featureHostEl) featureHostEl.innerHTML = '';
            embeddedState.key = '';
            embeddedState.contentEl = null;
            embeddedState.originalParent = null;
            embeddedState.placeholder = null;
            return;
        }

        try {
            embeddedState.contentEl.classList.add('hidden');
            embeddedState.contentEl.classList.remove('is-active');
            embeddedState.originalParent.insertBefore(embeddedState.contentEl, embeddedState.placeholder);
            embeddedState.placeholder.remove();
        } catch (e) { }

        embeddedState.key = '';
        embeddedState.contentEl = null;
        embeddedState.originalParent = null;
        embeddedState.placeholder = null;
        if (featurePanelEl) featurePanelEl.classList.add('hidden');
        if (featureHostEl) featureHostEl.innerHTML = '';
        if (featureTitleEl) featureTitleEl.textContent = 'Fitur';
    }

    function openFeatureInsideFavorites(tabKey, label) {
        const mapping = window.SF_TAB_MAPPING || {};
        const contentName = mapping[tabKey];
        if (!contentName) return false;
        const contentEl = document.getElementById(`content-${contentName}`);
        if (!contentEl) return false;
        if (!featurePanelEl || !featureHostEl) return false;

        if (embeddedState.key && embeddedState.key !== tabKey) {
            restoreEmbeddedFeature();
        }

        if (embeddedState.key === tabKey && embeddedState.contentEl) {
            featurePanelEl.classList.remove('hidden');
            if (featureTitleEl) featureTitleEl.textContent = label || 'Fitur';
            return true;
        }

        try {
            const parent = contentEl.parentElement;
            if (!parent) return false;
            const placeholder = document.createElement('div');
            placeholder.setAttribute('data-myfavorite-placeholder', tabKey);
            parent.insertBefore(placeholder, contentEl);

            embeddedState.key = tabKey;
            embeddedState.contentEl = contentEl;
            embeddedState.originalParent = parent;
            embeddedState.placeholder = placeholder;

            contentEl.classList.remove('hidden');
            contentEl.classList.remove('is-active');
            featureHostEl.innerHTML = '';
            featureHostEl.appendChild(contentEl);

            featurePanelEl.classList.remove('hidden');
            if (featureTitleEl) featureTitleEl.textContent = label || 'Fitur';
            if (window.lucide) window.lucide.createIcons();
            try {
                featurePanelEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } catch (e) { }
            return true;
        } catch (e) {
            return false;
        }
    }

    function openFavoriteItemInsideFavorites(item) {
        if (!item) return false;
        if (item.kind === 'tab') {
            return openFeatureInsideFavorites(item.tabKey, item.label || '');
        }
        if (item.kind === 'model_sub') {
            const ok = openFeatureInsideFavorites(item.tabKey, item.label || '');
            if (ok && typeof window.switchModelTab === 'function') {
                window.switchModelTab(item.subKey);
            }
            return ok;
        }
        if (item.kind === 'photographer_sub') {
            const ok = openFeatureInsideFavorites(item.tabKey, item.label || '');
            if (ok && typeof window.switchPhotographerTab === 'function') {
                window.switchPhotographerTab(item.subKey);
            }
            return ok;
        }
        return false;
    }

    function resolveItemIcon(item) {
        const own = safeIconName(item && item.icon);
        if (own) return own;
        const id = item && item.id;
        if (id) {
            const found = featureCatalog.find((x) => x && x.id === id);
            const fromCatalog = safeIconName(found && found.icon);
            if (fromCatalog) return fromCatalog;
        }
        return 'sparkles';
    }

    function clearSearchUI() {
        if (!searchInput || !resultsEl) return;
        if (!searchInput.value) {
            resultsEl.innerHTML = '';
            resultsEl.classList.add('hidden');
            return;
        }
        searchInput.value = '';
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
    }

    function renderFavorites() {
        const favorites = getStoredFavorites();
        listEl.innerHTML = '';

        if (countEl) {
            countEl.textContent = favorites.length ? `${favorites.length} favorit` : '';
        }

        if (!favorites.length) {
            emptyEl.classList.remove('hidden');
            listEl.classList.add('hidden');
            return;
        }

        emptyEl.classList.add('hidden');
        listEl.classList.remove('hidden');

        favorites.forEach((fav) => {
            const card = document.createElement('div');
            card.className = 'bg-white/90 border border-slate-200 rounded-3xl p-4 sm:p-5 flex items-center gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 hover:border-slate-300';

            const iconName = resolveItemIcon(fav);
            const badge = document.createElement('div');
            badge.className = 'w-11 h-11 rounded-3xl bg-rose-50 text-rose-700 flex items-center justify-center flex-shrink-0 ring-1 ring-rose-100';
            badge.innerHTML = `<i data-lucide="${iconName}" class="w-5 h-5"></i>`;

            const openBtn = document.createElement('button');
            openBtn.type = 'button';
            openBtn.className = 'flex-1 text-left focus:outline-none';

            const titleEl = document.createElement('div');
            titleEl.className = 'text-sm font-extrabold text-slate-800';
            titleEl.textContent = fav.label || '';

            openBtn.appendChild(titleEl);
            openBtn.addEventListener('click', () => {
                const ok = openFavoriteItemInsideFavorites(fav);
                if (!ok && fav.kind === 'tab' && typeof window.switchTab === 'function' && fav.tabKey) {
                    window.switchTab(fav.tabKey);
                }
            });

            const actions = document.createElement('div');
            actions.className = 'flex items-center gap-2';

            const openActionBtn = document.createElement('button');
            openActionBtn.type = 'button';
            openActionBtn.className = 'inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/30';
            openActionBtn.innerHTML = `<i data-lucide="arrow-right" class="w-4 h-4"></i><span>Buka</span>`;
            openActionBtn.addEventListener('click', () => {
                openBtn.click();
            });

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'w-11 h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/30';
            removeBtn.innerHTML = `<i data-lucide="trash-2" class="w-4 h-4"></i>`;
            removeBtn.addEventListener('click', () => {
                if (embeddedState.key && embeddedState.key === fav.tabKey) {
                    restoreEmbeddedFeature();
                }
                const next = getStoredFavorites().filter((x) => x && x.id !== fav.id);
                setStoredFavorites(next);
                renderFavorites();
                renderSearchResults(searchInput.value);
                if (window.lucide) window.lucide.createIcons();
            });

            actions.appendChild(openActionBtn);
            actions.appendChild(removeBtn);

            card.appendChild(badge);
            card.appendChild(openBtn);
            card.appendChild(actions);
            listEl.appendChild(card);
        });

        if (window.lucide) window.lucide.createIcons();
    }

    if (featureCloseBtn) {
        featureCloseBtn.addEventListener('click', restoreEmbeddedFeature);
    }

    document.addEventListener('click', (e) => {
        if (!searchCardEl) return;
        const t = e.target;
        if (!(t instanceof Element)) return;
        if (searchCardEl.contains(t)) return;
        clearSearchUI();
    });

    document.addEventListener('click', (e) => {
        const sidebarBtn = e.target.closest('.sidebar-btn[id^="tab-"]');
        if (!sidebarBtn) return;
        if (sidebarBtn.id === 'tab-my-favorite') return;
        restoreEmbeddedFeature();
    });

    function addFavorite(item) {
        if (!item || !item.id) return;
        const current = getStoredFavorites();
        if (current.some((x) => x && x.id === item.id)) return;
        const next = current.concat([item]);
        setStoredFavorites(next);
        renderFavorites();
    }

    function renderSearchResults(query) {
        if (!featureIndex.length) {
            rebuildFeatureCatalog();
        }
        const q = normalizeText(query);
        if (!q) {
            resultsEl.classList.add('hidden');
            resultsEl.innerHTML = '';
            return;
        }

        const favorites = getStoredFavorites();
        const favIds = new Set(favorites.map((x) => x && x.id).filter(Boolean));
        const matches = featureIndex
            .filter((it) => it.norm.includes(q))
            .slice(0, 10)
            .map((it) => ({ id: it.id, label: it.label, icon: safeIconName(it.icon) || '', isAdded: favIds.has(it.id) }));

        if (!matches.length) {
            resultsEl.classList.remove('hidden');
            resultsEl.innerHTML = '';

            const emptyCard = document.createElement('div');
            emptyCard.className = 'bg-white/80 border border-slate-200 rounded-3xl p-5 text-sm font-semibold text-slate-600 ring-1 ring-black/5 flex items-center gap-3';
            emptyCard.innerHTML = `<div class="w-10 h-10 rounded-2xl bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-200"><i data-lucide="search-x" class="w-5 h-5"></i></div><div>Tidak ada fitur yang cocok.</div>`;
            resultsEl.appendChild(emptyCard);
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        resultsEl.classList.remove('hidden');
        resultsEl.innerHTML = '';

        const wrap = document.createElement('div');
        wrap.className = 'bg-white/90 border border-slate-200 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5';

        const head = document.createElement('div');
        head.className = 'px-4 py-3 flex items-center justify-between';
        head.innerHTML = `
            <div class="flex items-center gap-2 text-[11px] font-extrabold text-slate-600 tracking-wide uppercase">
                <i data-lucide="search" class="w-4 h-4 text-slate-400"></i>
                <span>Hasil Pencarian</span>
            </div>
            <div class="text-[11px] font-bold text-slate-500">${matches.length} hasil</div>
        `;

        const list = document.createElement('div');
        list.className = 'divide-y divide-slate-200';

        matches.forEach((m) => {
            const row = document.createElement('div');
            row.className = 'px-4 py-3 flex items-center gap-3 hover:bg-slate-50';

            const left = document.createElement('div');
            left.className = 'w-10 h-10 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center border border-slate-200 flex-shrink-0';
            left.innerHTML = `<i data-lucide="${m.icon || 'sparkles'}" class="w-5 h-5"></i>`;

            const labelWrap = document.createElement('div');
            labelWrap.className = 'flex-1 min-w-0';
            const label = document.createElement('div');
            label.className = 'text-sm font-extrabold text-slate-800 truncate';
            label.textContent = m.label || '';
            labelWrap.appendChild(label);

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.setAttribute('data-id', m.id);
            if (m.isAdded) {
                btn.className = 'inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-extrabold border border-emerald-100 cursor-default';
                btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i><span>Ditambahkan</span>`;
            } else {
                btn.className = 'inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/30';
                btn.innerHTML = `<i data-lucide="plus" class="w-4 h-4"></i><span>Tambah</span>`;
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id') || '';
                    const match = featureCatalog.find((x) => x.id === id);
                    if (!match) return;
                    addFavorite(match);
                    renderSearchResults(searchInput.value);
                    if (window.lucide) window.lucide.createIcons();
                });
            }

            row.appendChild(left);
            row.appendChild(labelWrap);
            row.appendChild(btn);
            list.appendChild(row);
        });

        wrap.appendChild(head);
        wrap.appendChild(list);
        resultsEl.appendChild(wrap);

        if (window.lucide) window.lucide.createIcons();
    }

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            resultsEl.innerHTML = '';
            resultsEl.classList.add('hidden');
            e.preventDefault();
            return;
        }
        if (e.key === 'Enter') {
            const q = normalizeText(searchInput.value);
            if (!q) return;
            const exact = featureIndex.find((it) => it.norm === q);
            const first = exact || featureIndex.find((it) => it.norm.includes(q));
            if (first) {
                addFavorite(first);
                renderSearchResults(searchInput.value);
                e.preventDefault();
            }
        }
    });

    searchInput.addEventListener('input', (e) => {
        renderSearchResults(e.target.value);
    });
    searchInput.addEventListener('focus', (e) => {
        renderSearchResults(e.target.value);
    });

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            setStoredFavorites([]);
            searchInput.value = '';
            resultsEl.innerHTML = '';
            resultsEl.classList.add('hidden');
            renderFavorites();
        });
    }

    renderFavorites();
    renderSearchResults(searchInput.value);
});
