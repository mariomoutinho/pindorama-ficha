/* ====================================================================
   Pindorama — Campo de Batalha
   Vanilla JS: grid CSS + tokens posicionados absolutamente, com
   drag&drop, snap-to-grid, pinch-zoom, pan, resize e rotação.
   ==================================================================== */

(() => {
    'use strict';

    // ----------------------------------------------------------------
    // Estado
    // ----------------------------------------------------------------

    const STORAGE_KEY = 'pindorama:campo-batalha:v1';
    const CELL_SIZE = 56;          // tamanho base da célula em pixels
    const MIN_SCALE = 0.4;
    const MAX_SCALE = 3;

    const state = {
        cols: 20,
        rows: 15,
        showNumbers: false,
        viewport: { x: 0, y: 0, scale: 1 },
        tokens: [],                // { id, fichaId|null, name, image, col, row, sizeCells, rotation }
        selectedId: null,
        fichas: [],                // cache da lista de fichas
        fichasLoaded: false
    };

    // ----------------------------------------------------------------
    // Refs DOM
    // ----------------------------------------------------------------

    const els = {
        stage: document.getElementById('cbStage'),
        viewport: document.getElementById('cbViewport'),
        board: document.getElementById('cbBoard'),
        tokensLayer: document.getElementById('cbTokensLayer'),
        addToken: document.getElementById('cbAddToken'),
        removeToken: document.getElementById('cbRemoveToken'),
        rotateToken: document.getElementById('cbRotateToken'),
        clearAll: document.getElementById('cbClearAll'),
        zoomIn: document.getElementById('cbZoomIn'),
        zoomOut: document.getElementById('cbZoomOut'),
        zoomReset: document.getElementById('cbZoomReset'),
        zoomDisplay: document.getElementById('cbZoomDisplay'),
        toggleNumbers: document.getElementById('cbToggleNumbers'),
        cols: document.getElementById('cbCols'),
        rows: document.getElementById('cbRows'),
        applySize: document.getElementById('cbApplySize'),
        modal: document.getElementById('cbModal'),
        modalClose: document.getElementById('cbModalClose'),
        modalSearch: document.getElementById('cbModalSearch'),
        fichaList: document.getElementById('cbFichaList'),
        addGenericToken: document.getElementById('cbAddGenericToken'),
        tooltip: document.getElementById('cbTooltip')
    };

    // ----------------------------------------------------------------
    // Persistência
    // ----------------------------------------------------------------

    function saveState() {
        try {
            const snap = {
                cols: state.cols,
                rows: state.rows,
                showNumbers: state.showNumbers,
                viewport: state.viewport,
                tokens: state.tokens
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
        } catch (e) {
            // localStorage cheio ou bloqueado — ignorar silenciosamente
        }
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const snap = JSON.parse(raw);
            if (snap.cols) state.cols = snap.cols;
            if (snap.rows) state.rows = snap.rows;
            if (typeof snap.showNumbers === 'boolean') state.showNumbers = snap.showNumbers;
            if (snap.viewport) state.viewport = snap.viewport;
            if (Array.isArray(snap.tokens)) state.tokens = snap.tokens;
        } catch (e) {
            // estado corrompido — recomeçar
        }
    }

    // ----------------------------------------------------------------
    // Render: tabuleiro
    // ----------------------------------------------------------------

    function renderBoard() {
        els.board.style.gridTemplateColumns = `repeat(${state.cols}, ${CELL_SIZE}px)`;
        els.board.style.gridTemplateRows = `repeat(${state.rows}, ${CELL_SIZE}px)`;
        els.board.style.width = (state.cols * CELL_SIZE) + 'px';
        els.board.style.height = (state.rows * CELL_SIZE) + 'px';
        els.tokensLayer.style.width = els.board.style.width;
        els.tokensLayer.style.height = els.board.style.height;

        els.board.classList.toggle('show-numbers', state.showNumbers);
        els.board.innerHTML = '';

        const frag = document.createDocumentFragment();
        for (let r = 0; r < state.rows; r++) {
            for (let c = 0; c < state.cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'cb-cell' + (((r + c) % 2 === 0) ? ' is-even' : '');
                if (state.showNumbers) {
                    const lbl = document.createElement('span');
                    lbl.className = 'cb-cell-label';
                    lbl.textContent = `${c + 1},${r + 1}`;
                    cell.appendChild(lbl);
                }
                frag.appendChild(cell);
            }
        }
        els.board.appendChild(frag);
    }

    // ----------------------------------------------------------------
    // Render: tokens
    // ----------------------------------------------------------------

    function renderTokens() {
        els.tokensLayer.innerHTML = '';
        const frag = document.createDocumentFragment();
        for (const t of state.tokens) {
            frag.appendChild(buildTokenElement(t));
        }
        els.tokensLayer.appendChild(frag);
        updateActionButtons();
    }

    function buildTokenElement(token) {
        const sizePx = token.sizeCells * CELL_SIZE;
        const wrap = document.createElement('div');
        wrap.className = 'cb-token';
        if (token.id === state.selectedId) wrap.classList.add('is-selected');
        wrap.dataset.tokenId = token.id;
        wrap.style.left = (token.col * CELL_SIZE) + 'px';
        wrap.style.top = (token.row * CELL_SIZE) + 'px';
        wrap.style.width = sizePx + 'px';
        wrap.style.height = sizePx + 'px';
        wrap.style.transform = `rotate(${token.rotation || 0}deg)`;

        const circle = document.createElement('div');
        circle.className = 'cb-token-circle';
        if (token.image) {
            const img = document.createElement('img');
            img.src = token.image;
            img.alt = token.name || 'Token';
            img.draggable = false;
            circle.appendChild(img);
        } else {
            circle.textContent = (token.name || '?').trim().charAt(0) || '?';
        }
        wrap.appendChild(circle);

        const nameLbl = document.createElement('div');
        nameLbl.className = 'cb-token-name';
        nameLbl.textContent = token.name || 'Sem nome';
        wrap.appendChild(nameLbl);

        const resize = document.createElement('div');
        resize.className = 'cb-token-handle cb-token-handle--resize';
        resize.dataset.handle = 'resize';
        wrap.appendChild(resize);

        const rotate = document.createElement('div');
        rotate.className = 'cb-token-handle cb-token-handle--rotate';
        rotate.dataset.handle = 'rotate';
        wrap.appendChild(rotate);

        return wrap;
    }

    function updateTokenElement(token) {
        const el = els.tokensLayer.querySelector(`[data-token-id="${token.id}"]`);
        if (!el) return;
        const sizePx = token.sizeCells * CELL_SIZE;
        el.style.left = (token.col * CELL_SIZE) + 'px';
        el.style.top = (token.row * CELL_SIZE) + 'px';
        el.style.width = sizePx + 'px';
        el.style.height = sizePx + 'px';
        el.style.transform = `rotate(${token.rotation || 0}deg)`;
    }

    function updateSelectionVisuals() {
        els.tokensLayer.querySelectorAll('.cb-token').forEach(el => {
            el.classList.toggle('is-selected', el.dataset.tokenId === state.selectedId);
        });
        updateActionButtons();
    }

    function updateActionButtons() {
        const has = !!state.selectedId;
        els.removeToken.disabled = !has;
        els.rotateToken.disabled = !has;
    }

    // ----------------------------------------------------------------
    // Viewport (zoom + pan)
    // ----------------------------------------------------------------

    function applyViewport() {
        const { x, y, scale } = state.viewport;
        els.viewport.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
        els.zoomDisplay.textContent = Math.round(scale * 100) + '%';
    }

    function setScale(newScale, anchorX, anchorY) {
        const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
        if (anchorX === undefined) {
            const rect = els.stage.getBoundingClientRect();
            anchorX = rect.width / 2;
            anchorY = rect.height / 2;
        }
        // ponto sob o cursor (em coords do viewport)
        const before = screenToViewport(anchorX, anchorY);
        state.viewport.scale = clamped;
        const after = screenToViewport(anchorX, anchorY);
        // ajusta o pan para manter o ponto âncora estável
        state.viewport.x += (after.x - before.x) * clamped;
        state.viewport.y += (after.y - before.y) * clamped;
        applyViewport();
    }

    function screenToViewport(sx, sy) {
        const rect = els.stage.getBoundingClientRect();
        const localX = sx - rect.left - state.viewport.x;
        const localY = sy - rect.top - state.viewport.y;
        return { x: localX / state.viewport.scale, y: localY / state.viewport.scale };
    }

    function centerBoard() {
        const stageRect = els.stage.getBoundingClientRect();
        const boardW = state.cols * CELL_SIZE;
        const boardH = state.rows * CELL_SIZE;
        const fitX = (stageRect.width - 24) / boardW;
        const fitY = (stageRect.height - 24) / boardH;
        const fit = Math.min(1, fitX, fitY);
        state.viewport.scale = fit;
        state.viewport.x = (stageRect.width - boardW * fit) / 2;
        state.viewport.y = (stageRect.height - boardH * fit) / 2;
        applyViewport();
    }

    // ----------------------------------------------------------------
    // Interação: pan, pinch, drag, resize, rotate (Pointer Events)
    // ----------------------------------------------------------------

    const pointers = new Map(); // pointerId -> { x, y, mode }
    let interaction = null;     // descreve a interação ativa

    function onStagePointerDown(ev) {
        // Verificamos se o alvo é um token, handle ou stage vazio
        const tokenEl = ev.target.closest('.cb-token');
        const handle = ev.target.closest('.cb-token-handle');

        if (handle && tokenEl) {
            const token = state.tokens.find(t => t.id === tokenEl.dataset.tokenId);
            if (!token) return;
            ev.preventDefault();
            ev.stopPropagation();
            selectToken(token.id);

            if (handle.dataset.handle === 'resize') {
                startResize(ev, token);
            } else if (handle.dataset.handle === 'rotate') {
                startRotate(ev, token);
            }
            return;
        }

        if (tokenEl) {
            const token = state.tokens.find(t => t.id === tokenEl.dataset.tokenId);
            if (!token) return;
            ev.preventDefault();
            selectToken(token.id);
            startTokenDrag(ev, token);
            return;
        }

        // Stage vazio: pan ou pinch
        pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

        if (pointers.size === 1) {
            // pan single-finger / mouse
            // (segundo pointer pode entrar e virar pinch)
            interaction = {
                type: 'pan',
                lastX: ev.clientX,
                lastY: ev.clientY,
                pointerId: ev.pointerId
            };
            els.stage.classList.add('is-panning');
            try { els.stage.setPointerCapture(ev.pointerId); } catch (_) {}
            // Desselecionar se clique vazio
            selectToken(null);
        } else if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            interaction = {
                type: 'pinch',
                startDist: distance(a, b),
                startScale: state.viewport.scale,
                startMid: midpoint(a, b)
            };
        }
    }

    function onStagePointerMove(ev) {
        const tt = pointers.get(ev.pointerId);
        if (tt) {
            tt.x = ev.clientX;
            tt.y = ev.clientY;
        }

        if (!interaction) return;

        if (interaction.type === 'pan' && ev.pointerId === interaction.pointerId) {
            const dx = ev.clientX - interaction.lastX;
            const dy = ev.clientY - interaction.lastY;
            interaction.lastX = ev.clientX;
            interaction.lastY = ev.clientY;
            state.viewport.x += dx;
            state.viewport.y += dy;
            applyViewport();
        } else if (interaction.type === 'pinch' && pointers.size >= 2) {
            const [a, b] = [...pointers.values()];
            const newDist = distance(a, b);
            const ratio = newDist / interaction.startDist;
            const newScale = interaction.startScale * ratio;
            setScale(newScale, interaction.startMid.x, interaction.startMid.y);
        } else if (interaction.type === 'token-drag' && ev.pointerId === interaction.pointerId) {
            handleTokenDragMove(ev);
        } else if (interaction.type === 'resize' && ev.pointerId === interaction.pointerId) {
            handleResizeMove(ev);
        } else if (interaction.type === 'rotate' && ev.pointerId === interaction.pointerId) {
            handleRotateMove(ev);
        }
    }

    function onStagePointerUp(ev) {
        pointers.delete(ev.pointerId);

        if (!interaction) {
            els.stage.classList.remove('is-panning');
            return;
        }

        if (interaction.type === 'token-drag' && ev.pointerId === interaction.pointerId) {
            finishTokenDrag();
        } else if (interaction.type === 'resize' && ev.pointerId === interaction.pointerId) {
            finishResize();
        } else if (interaction.type === 'rotate' && ev.pointerId === interaction.pointerId) {
            finishRotate();
        } else if (interaction.type === 'pan' && ev.pointerId === interaction.pointerId) {
            els.stage.classList.remove('is-panning');
            saveState();
        } else if (interaction.type === 'pinch') {
            if (pointers.size < 2) {
                interaction = null;
                saveState();
                // Se ainda houver 1 pointer, retornar a pan
                if (pointers.size === 1) {
                    const [last] = [...pointers.entries()];
                    interaction = {
                        type: 'pan',
                        lastX: last[1].x,
                        lastY: last[1].y,
                        pointerId: last[0]
                    };
                }
                return;
            }
        }

        if (pointers.size === 0) {
            interaction = null;
        }
    }

    function distance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.hypot(dx, dy);
    }

    function midpoint(a, b) {
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    // ----------- Drag de token

    function startTokenDrag(ev, token) {
        const start = screenToViewport(ev.clientX, ev.clientY);
        interaction = {
            type: 'token-drag',
            pointerId: ev.pointerId,
            tokenId: token.id,
            offsetX: start.x - token.col * CELL_SIZE,
            offsetY: start.y - token.row * CELL_SIZE,
            tempCol: token.col,
            tempRow: token.row
        };
        const el = els.tokensLayer.querySelector(`[data-token-id="${token.id}"]`);
        if (el) el.classList.add('is-dragging');
        try { els.stage.setPointerCapture(ev.pointerId); } catch (_) {}
    }

    function handleTokenDragMove(ev) {
        const token = state.tokens.find(t => t.id === interaction.tokenId);
        if (!token) return;
        const p = screenToViewport(ev.clientX, ev.clientY);
        const rawCol = (p.x - interaction.offsetX) / CELL_SIZE;
        const rawRow = (p.y - interaction.offsetY) / CELL_SIZE;
        // posição livre durante o drag (sem snap)
        const el = els.tokensLayer.querySelector(`[data-token-id="${token.id}"]`);
        if (el) {
            el.style.left = (rawCol * CELL_SIZE) + 'px';
            el.style.top = (rawRow * CELL_SIZE) + 'px';
        }
        interaction.tempCol = rawCol;
        interaction.tempRow = rawRow;
    }

    function finishTokenDrag() {
        const token = state.tokens.find(t => t.id === interaction.tokenId);
        if (!token) {
            interaction = null;
            return;
        }
        // snap-to-grid + clamp dentro do tabuleiro
        const max = token.sizeCells;
        const snappedCol = clamp(Math.round(interaction.tempCol), 0, state.cols - max);
        const snappedRow = clamp(Math.round(interaction.tempRow), 0, state.rows - max);
        token.col = snappedCol;
        token.row = snappedRow;
        const el = els.tokensLayer.querySelector(`[data-token-id="${token.id}"]`);
        if (el) el.classList.remove('is-dragging');
        updateTokenElement(token);
        saveState();
        interaction = null;
    }

    // ----------- Resize

    function startResize(ev, token) {
        const start = screenToViewport(ev.clientX, ev.clientY);
        interaction = {
            type: 'resize',
            pointerId: ev.pointerId,
            tokenId: token.id,
            startSize: token.sizeCells,
            startPx: { x: start.x, y: start.y }
        };
        try { els.stage.setPointerCapture(ev.pointerId); } catch (_) {}
    }

    function handleResizeMove(ev) {
        const token = state.tokens.find(t => t.id === interaction.tokenId);
        if (!token) return;
        const p = screenToViewport(ev.clientX, ev.clientY);
        // distância do canto esquerdo-cima do token até o cursor
        const fromLeft = p.x - token.col * CELL_SIZE;
        const fromTop = p.y - token.row * CELL_SIZE;
        const cellsByX = fromLeft / CELL_SIZE;
        const cellsByY = fromTop / CELL_SIZE;
        const proposal = Math.max(cellsByX, cellsByY);
        const newSize = clamp(Math.round(proposal), 1, 6);
        const maxByCols = state.cols - token.col;
        const maxByRows = state.rows - token.row;
        const finalSize = Math.min(newSize, maxByCols, maxByRows);
        if (finalSize !== token.sizeCells) {
            token.sizeCells = finalSize;
            updateTokenElement(token);
        }
    }

    function finishResize() {
        saveState();
        interaction = null;
    }

    // ----------- Rotate

    function startRotate(ev, token) {
        interaction = {
            type: 'rotate',
            pointerId: ev.pointerId,
            tokenId: token.id,
            startAngle: token.rotation || 0
        };
        try { els.stage.setPointerCapture(ev.pointerId); } catch (_) {}
    }

    function handleRotateMove(ev) {
        const token = state.tokens.find(t => t.id === interaction.tokenId);
        if (!token) return;
        const sizePx = token.sizeCells * CELL_SIZE;
        const center = screenToViewport(ev.clientX, ev.clientY);
        const cx = token.col * CELL_SIZE + sizePx / 2;
        const cy = token.row * CELL_SIZE + sizePx / 2;
        const dx = center.x - cx;
        const dy = center.y - cy;
        // O handle "rotate" fica em cima do token, então rotação 0 = handle para cima.
        // angle em graus, com 0 apontando para cima.
        const angle = (Math.atan2(dy, dx) * 180 / Math.PI) + 90;
        token.rotation = Math.round(angle);
        updateTokenElement(token);
    }

    function finishRotate() {
        saveState();
        interaction = null;
    }

    // ----------------------------------------------------------------
    // Seleção & ações
    // ----------------------------------------------------------------

    function selectToken(id) {
        state.selectedId = id;
        updateSelectionVisuals();
    }

    function removeSelectedToken() {
        if (!state.selectedId) return;
        state.tokens = state.tokens.filter(t => t.id !== state.selectedId);
        state.selectedId = null;
        renderTokens();
        saveState();
    }

    function rotateSelectedTokenStep() {
        if (!state.selectedId) return;
        const t = state.tokens.find(x => x.id === state.selectedId);
        if (!t) return;
        t.rotation = ((t.rotation || 0) + 90) % 360;
        updateTokenElement(t);
        saveState();
    }

    function clearAllTokens() {
        if (!state.tokens.length) return;
        if (!confirm('Remover todos os tokens do campo?')) return;
        state.tokens = [];
        state.selectedId = null;
        renderTokens();
        saveState();
    }

    function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

    function genId() {
        return 'tok_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
    }

    // ----------------------------------------------------------------
    // Adicionar token a partir de uma ficha
    // ----------------------------------------------------------------

    function addTokenFromFicha(ficha) {
        const t = {
            id: genId(),
            fichaId: ficha.id,
            name: ficha.personagem || 'Sem nome',
            image: ficha.personagem_imagem ? resolveImage(ficha.personagem_imagem) : null,
            col: 0,
            row: 0,
            sizeCells: 1,
            rotation: 0
        };
        // tenta achar uma célula vazia
        const occupied = new Set(state.tokens.map(x => x.col + ',' + x.row));
        outer: for (let r = 0; r < state.rows; r++) {
            for (let c = 0; c < state.cols; c++) {
                if (!occupied.has(c + ',' + r)) {
                    t.col = c; t.row = r;
                    break outer;
                }
            }
        }
        state.tokens.push(t);
        state.selectedId = t.id;
        renderTokens();
        saveState();
    }

    function addGenericToken() {
        const name = prompt('Nome do token:', 'Token');
        if (name === null) return;
        addTokenFromFicha({
            id: null,
            personagem: name.trim() || 'Token',
            personagem_imagem: null
        });
    }

    function resolveImage(path) {
        if (!path) return null;
        if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
            return path;
        }
        return path; // caminho relativo já serve (mesma origem)
    }

    // ----------------------------------------------------------------
    // Modal de fichas
    // ----------------------------------------------------------------

    async function openModal() {
        els.modal.hidden = false;
        els.modalSearch.value = '';
        els.modalSearch.focus();
        if (!state.fichasLoaded) {
            els.fichaList.innerHTML = '<li class="cb-ficha-empty">Carregando fichas...</li>';
            try {
                const resp = await fetch('listar-fichas.php', { credentials: 'same-origin' });
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                const data = await resp.json();
                // Para cada ficha pegamos só a thumb. As fichas básicas trazem id, personagem,
                // mas não a imagem — buscamos lazy quando o usuário escolhe.
                state.fichas = Array.isArray(data) ? data : [];
                state.fichasLoaded = true;
            } catch (e) {
                els.fichaList.innerHTML = '<li class="cb-ficha-empty">Não foi possível carregar fichas.</li>';
                return;
            }
        }
        renderFichaList(state.fichas);
    }

    function closeModal() {
        els.modal.hidden = true;
    }

    function renderFichaList(items) {
        els.fichaList.innerHTML = '';
        if (!items.length) {
            els.fichaList.innerHTML = '<li class="cb-ficha-empty">Nenhuma ficha salva.</li>';
            return;
        }
        const frag = document.createDocumentFragment();
        for (const f of items) {
            const li = document.createElement('li');
            li.dataset.fichaId = f.id;

            const thumb = document.createElement('div');
            thumb.className = 'cb-ficha-thumb';
            thumb.textContent = (f.personagem || '?').trim().charAt(0) || '?';
            li.appendChild(thumb);

            const info = document.createElement('div');
            info.className = 'cb-ficha-info';
            const nm = document.createElement('div');
            nm.className = 'cb-ficha-name';
            nm.textContent = f.personagem || 'Sem nome';
            info.appendChild(nm);
            const meta = document.createElement('div');
            meta.className = 'cb-ficha-meta';
            const partes = [];
            if (f.classe) partes.push(f.classe);
            if (f.nivel) partes.push('Nv ' + f.nivel);
            if (f.participante) partes.push(f.participante);
            meta.textContent = partes.join(' • ') || '—';
            info.appendChild(meta);
            li.appendChild(info);

            li.addEventListener('click', () => onFichaPicked(f));
            frag.appendChild(li);
        }
        els.fichaList.appendChild(frag);
    }

    async function onFichaPicked(fichaListItem) {
        // Buscar ficha completa para obter a imagem
        try {
            const resp = await fetch('buscar-ficha.php?id=' + encodeURIComponent(fichaListItem.id), {
                credentials: 'same-origin'
            });
            const data = await resp.json();
            if (data && data.success !== false) {
                addTokenFromFicha({
                    id: data.id || fichaListItem.id,
                    personagem: data.personagem || fichaListItem.personagem,
                    personagem_imagem: data.personagem_imagem || null
                });
            } else {
                addTokenFromFicha(fichaListItem);
            }
        } catch (e) {
            addTokenFromFicha(fichaListItem);
        }
        closeModal();
    }

    function filterFichas(term) {
        const q = term.trim().toLowerCase();
        if (!q) return renderFichaList(state.fichas);
        const filtered = state.fichas.filter(f => {
            const hay = [
                f.personagem, f.participante, f.classe, String(f.nivel || '')
            ].filter(Boolean).join(' ').toLowerCase();
            return hay.includes(q);
        });
        renderFichaList(filtered);
    }

    // ----------------------------------------------------------------
    // Tooltip ao passar sobre o token
    // ----------------------------------------------------------------

    function bindTooltip() {
        let lastToken = null;
        els.tokensLayer.addEventListener('pointermove', (ev) => {
            const tEl = ev.target.closest('.cb-token');
            if (!tEl) {
                hideTooltip(); lastToken = null; return;
            }
            const token = state.tokens.find(t => t.id === tEl.dataset.tokenId);
            if (!token) return;
            if (lastToken !== token.id) {
                lastToken = token.id;
                showTooltip(token, ev.clientX, ev.clientY);
            } else {
                positionTooltip(ev.clientX, ev.clientY);
            }
        });
        els.tokensLayer.addEventListener('pointerleave', hideTooltip);
    }

    function showTooltip(token, x, y) {
        els.tooltip.hidden = false;
        els.tooltip.innerHTML = `
            <strong>${escapeHtml(token.name || 'Sem nome')}</strong>
            <span>Tamanho: ${token.sizeCells}x${token.sizeCells} • Posição: ${token.col + 1},${token.row + 1}</span>
        `;
        positionTooltip(x, y);
    }

    function positionTooltip(x, y) {
        els.tooltip.style.left = (x + 14) + 'px';
        els.tooltip.style.top = (y + 14) + 'px';
    }

    function hideTooltip() {
        els.tooltip.hidden = true;
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[ch]));
    }

    // ----------------------------------------------------------------
    // Wheel zoom (desktop)
    // ----------------------------------------------------------------

    function onWheel(ev) {
        ev.preventDefault();
        const factor = ev.deltaY < 0 ? 1.1 : 1 / 1.1;
        setScale(state.viewport.scale * factor, ev.clientX, ev.clientY);
        saveState();
    }

    // ----------------------------------------------------------------
    // Event wiring
    // ----------------------------------------------------------------

    function bindEvents() {
        els.stage.addEventListener('pointerdown', onStagePointerDown);
        els.stage.addEventListener('pointermove', onStagePointerMove);
        els.stage.addEventListener('pointerup', onStagePointerUp);
        els.stage.addEventListener('pointercancel', onStagePointerUp);
        els.stage.addEventListener('wheel', onWheel, { passive: false });
        // Bloquear menu contextual no stage para permitir botão direito como pan no desktop
        els.stage.addEventListener('contextmenu', (e) => e.preventDefault());

        els.addToken.addEventListener('click', openModal);
        els.modalClose.addEventListener('click', closeModal);
        els.modal.addEventListener('click', (e) => {
            if (e.target === els.modal) closeModal();
        });
        els.modalSearch.addEventListener('input', (e) => filterFichas(e.target.value));
        els.addGenericToken.addEventListener('click', () => {
            closeModal();
            addGenericToken();
        });

        els.removeToken.addEventListener('click', removeSelectedToken);
        els.rotateToken.addEventListener('click', rotateSelectedTokenStep);
        els.clearAll.addEventListener('click', clearAllTokens);

        els.zoomIn.addEventListener('click', () => { setScale(state.viewport.scale * 1.2); saveState(); });
        els.zoomOut.addEventListener('click', () => { setScale(state.viewport.scale / 1.2); saveState(); });
        els.zoomReset.addEventListener('click', () => { centerBoard(); saveState(); });

        els.toggleNumbers.addEventListener('change', (e) => {
            state.showNumbers = e.target.checked;
            els.board.classList.toggle('show-numbers', state.showNumbers);
            // Re-render para criar/remover labels
            renderBoard();
            saveState();
        });

        els.applySize.addEventListener('click', () => {
            const c = parseInt(els.cols.value, 10);
            const r = parseInt(els.rows.value, 10);
            if (!isFinite(c) || !isFinite(r) || c < 5 || r < 5) {
                alert('Defina ao menos 5 colunas e 5 linhas.');
                return;
            }
            state.cols = clamp(c, 5, 60);
            state.rows = clamp(r, 5, 60);
            // remover tokens fora dos novos limites
            state.tokens = state.tokens.filter(t => t.col < state.cols && t.row < state.rows);
            renderBoard();
            renderTokens();
            centerBoard();
            saveState();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (state.selectedId && document.activeElement === document.body) {
                    removeSelectedToken();
                }
            } else if (e.key === 'Escape') {
                if (!els.modal.hidden) closeModal();
                else selectToken(null);
            }
        });

        window.addEventListener('resize', () => {
            // mantém o tabuleiro visível em redimensionamentos extremos
            applyViewport();
        });
    }

    // ----------------------------------------------------------------
    // Bootstrap
    // ----------------------------------------------------------------

    function init() {
        loadState();
        els.cols.value = state.cols;
        els.rows.value = state.rows;
        els.toggleNumbers.checked = state.showNumbers;
        renderBoard();
        renderTokens();
        if (state.viewport.scale === 1 && state.viewport.x === 0 && state.viewport.y === 0) {
            centerBoard();
        } else {
            applyViewport();
        }
        bindEvents();
        bindTooltip();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
