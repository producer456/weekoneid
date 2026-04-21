// ============================================================
// BIO 40A Lab Quiz — Teacher/Student Labeling App
// Touch + Desktop + Leader Lines + Zoom/Pan
// ============================================================

const IMAGE_DATA = {
    cell_model: {
        src: 'images/cell_model.jpeg',
        title: 'The Cell',
        words: [
            'Plasma membrane', 'Cytosol/Cytoplasm', 'Nucleus', 'Nuclear envelope',
            'Mitochondria', 'Lysosome/Peroxisome', 'Centriole/Centromere',
            'Golgi apparatus (Golgi complex)', 'Golgi vesicles', 'Secretory vesicles',
            'Ribosomes', 'Rough endoplasmic reticulum (Rough ER)',
            'Smooth endoplasmic reticulum (Smooth ER)'
        ]
    },
    skin_diagram: {
        src: 'images/skin_diagram.jpeg',
        title: 'Skin Diagram',
        words: [
            'Epidermis', 'Stratum corneum', 'Stratum lucidum', 'Stratum granulosum',
            'Stratum spinosum', 'Stratum basale', 'Dermis', 'Dermal papilla',
            'Hair papilla', 'Hair bulb', 'Hair follicle', 'Papillary layer',
            'Reticular layer', 'Pacinian corpuscle', "Meissner's corpuscle",
            'Arrector pili muscle', 'Apocrine sweat gland', 'Eccrine sweat gland',
            'Sebaceous gland', 'Hypodermis', 'Adipose (Fat) Tissue'
        ]
    },
    skin_model: {
        src: 'images/skin_model.jpeg',
        title: 'Skin Model',
        words: [
            'Epidermis', 'Stratum corneum', 'Stratum lucidum', 'Stratum granulosum',
            'Stratum spinosum', 'Stratum basale', 'Dermis', 'Dermal papilla',
            'Hair papilla', 'Hair bulb', 'Hair follicle', 'Papillary layer',
            'Reticular layer', 'Pacinian corpuscle', "Meissner's corpuscle",
            'Arrector pili muscle', 'Apocrine sweat gland', 'Eccrine sweat gland',
            'Sebaceous gland', 'Hypodermis', 'Adipose (Fat) Tissue'
        ]
    },
    mitosis_stages: {
        src: 'images/mitosis_stages.jpeg',
        title: 'Mitosis Stages',
        words: [
            'Prophase', 'Metaphase', 'Anaphase', 'Telophase', 'Cytokinesis'
        ]
    }
};

let currentMode = 'teacher';
let currentImage = 'cell_model';
let markers = {};
let answerKeys = {};
let markerIdCounter = 0;
let draggedWord = null;

// Touch drag state (word chips)
let touchDragEl = null;
let touchGhost = null;
let touchCurrentTarget = null;

// Tap-to-select state
let selectedWord = null;

// Label dragging state
let draggingLabel = null;
let labelDragStart = null;

// Zoom & Pan state
let zoomLevel = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let panStart = null;

// Pinch zoom state
let pinchStartDist = 0;
let pinchStartZoom = 1;

// ---- Init ----
function init() {
    loadAnswerKeys();
    loadMarkers();
    setupTabs();
    renderImage();
    renderWordBank();
    renderMarkers();
    setupImageClick();
    setupDragAndDrop();
    setupTouchDrag();
    setupLabelDrag();
    setupZoomPan();
}

// ---- Zoom & Pan ----
function applyZoom() {
    const container = document.getElementById('image-container');
    container.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
    document.getElementById('zoom-level').textContent = Math.round(zoomLevel * 100) + '%';

    const viewport = document.getElementById('image-viewport');
    viewport.classList.toggle('zoomed', zoomLevel > 1.05);
}

function zoomIn() {
    zoomLevel = Math.min(zoomLevel * 1.3, 5);
    clampPan();
    applyZoom();
}

function zoomOut() {
    zoomLevel = Math.max(zoomLevel / 1.3, 1);
    if (zoomLevel < 1.05) { zoomLevel = 1; panX = 0; panY = 0; }
    clampPan();
    applyZoom();
}

function zoomReset() {
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    applyZoom();
}

function clampPan() {
    if (zoomLevel <= 1) { panX = 0; panY = 0; return; }
    const viewport = document.getElementById('image-viewport');
    const container = document.getElementById('image-container');
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const cw = container.scrollWidth * zoomLevel;
    const ch = container.scrollHeight * zoomLevel;

    const maxX = 0;
    const minX = Math.min(0, vw - cw);
    const maxY = 0;
    const minY = Math.min(0, vh - ch);

    panX = Math.max(minX, Math.min(maxX, panX));
    panY = Math.max(minY, Math.min(maxY, panY));
}

// Convert screen coordinates to image-container percentage coordinates
function screenToContainerPct(clientX, clientY) {
    const container = document.getElementById('image-container');
    // Get the container's untransformed dimensions
    const w = container.scrollWidth;
    const h = container.scrollHeight;
    // Get viewport position
    const viewport = document.getElementById('image-viewport');
    const vRect = viewport.getBoundingClientRect();
    // Account for pan and zoom
    const localX = (clientX - vRect.left - panX) / zoomLevel;
    const localY = (clientY - vRect.top - panY) / zoomLevel;
    return {
        x: (localX / w) * 100,
        y: (localY / h) * 100
    };
}

function setupZoomPan() {
    const viewport = document.getElementById('image-viewport');

    // ---- Mouse wheel zoom ----
    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const oldZoom = zoomLevel;
        zoomLevel = Math.max(1, Math.min(5, zoomLevel * delta));

        if (zoomLevel > 1) {
            // Zoom toward mouse position
            const vRect = viewport.getBoundingClientRect();
            const mx = e.clientX - vRect.left;
            const my = e.clientY - vRect.top;
            panX = mx - (mx - panX) * (zoomLevel / oldZoom);
            panY = my - (my - panY) * (zoomLevel / oldZoom);
        } else {
            panX = 0;
            panY = 0;
        }

        clampPan();
        applyZoom();
    }, { passive: false });

    // ---- Mouse pan (drag on viewport when zoomed) ----
    viewport.addEventListener('mousedown', (e) => {
        if (zoomLevel <= 1.05) return;
        // Only pan if clicking on the image area, not on markers/labels
        if (e.target.closest('.marker-dot') || e.target.closest('.marker-label') ||
            e.target.closest('.marker-delete') || e.target.closest('.zoom-controls')) return;

        // Don't start panning if we might be placing a marker — we'll determine
        // intent by whether the user moves (pan) or just clicks (place marker)
        panStart = { x: e.clientX, y: e.clientY, startPanX: panX, startPanY: panY, moved: false };
    });

    document.addEventListener('mousemove', (e) => {
        if (!panStart) return;
        if (draggingLabel !== null) return;

        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;

        if (!panStart.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            panStart.moved = true;
            isPanning = true;
            viewport.classList.add('panning');
        }

        if (panStart.moved) {
            panX = panStart.startPanX + dx;
            panY = panStart.startPanY + dy;
            clampPan();
            applyZoom();
        }
    });

    document.addEventListener('mouseup', () => {
        if (panStart) {
            isPanning = false;
            viewport.classList.remove('panning');
            panStart = null;
        }
    });

    // ---- Touch: pinch zoom + two-finger pan ----
    let lastTouchCount = 0;
    let touchPanStart = null;

    viewport.addEventListener('touchstart', (e) => {
        if (e.target.closest('.zoom-controls')) return;

        if (e.touches.length === 2) {
            // Pinch zoom start
            e.preventDefault();
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            pinchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            pinchStartZoom = zoomLevel;
            touchPanStart = {
                midX: (t1.clientX + t2.clientX) / 2,
                midY: (t1.clientY + t2.clientY) / 2,
                startPanX: panX,
                startPanY: panY
            };
        } else if (e.touches.length === 1 && zoomLevel > 1.05) {
            // Single finger pan when zoomed
            const t = e.touches[0];
            if (!e.target.closest('.marker-dot') && !e.target.closest('.marker-label') &&
                !e.target.closest('.marker-delete')) {
                touchPanStart = {
                    x: t.clientX, y: t.clientY,
                    startPanX: panX, startPanY: panY,
                    moved: false, isSingleFinger: true
                };
            }
        }
        lastTouchCount = e.touches.length;
    }, { passive: false });

    viewport.addEventListener('touchmove', (e) => {
        if (e.target.closest('.zoom-controls')) return;

        if (e.touches.length === 2) {
            e.preventDefault();
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            const oldZoom = zoomLevel;
            zoomLevel = Math.max(1, Math.min(5, pinchStartZoom * (dist / pinchStartDist)));

            // Pan with pinch center
            if (touchPanStart) {
                const midX = (t1.clientX + t2.clientX) / 2;
                const midY = (t1.clientY + t2.clientY) / 2;
                const vRect = viewport.getBoundingClientRect();
                const anchorX = midX - vRect.left;
                const anchorY = midY - vRect.top;
                panX = anchorX - (anchorX - touchPanStart.startPanX) * (zoomLevel / pinchStartZoom);
                panY = anchorY - (anchorY - touchPanStart.startPanY) * (zoomLevel / pinchStartZoom);
                // Also apply pan from mid-point movement
                panX += midX - touchPanStart.midX;
                panY += midY - touchPanStart.midY;
            }

            if (zoomLevel <= 1) { panX = 0; panY = 0; }
            clampPan();
            applyZoom();
        } else if (e.touches.length === 1 && touchPanStart && touchPanStart.isSingleFinger) {
            const t = e.touches[0];
            const dx = t.clientX - touchPanStart.x;
            const dy = t.clientY - touchPanStart.y;

            if (!touchPanStart.moved && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
                touchPanStart.moved = true;
            }

            if (touchPanStart.moved) {
                e.preventDefault();
                panX = touchPanStart.startPanX + dx;
                panY = touchPanStart.startPanY + dy;
                clampPan();
                applyZoom();
            }
        }
    }, { passive: false });

    viewport.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
            touchPanStart = null;
        }
        if (e.touches.length < 2) {
            pinchStartDist = 0;
        }
    });
}

// Make zoom functions global for onclick
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.zoomReset = zoomReset;

// ---- Mode ----
function setMode(mode) {
    currentMode = mode;
    document.getElementById('btn-teacher').classList.toggle('active', mode === 'teacher');
    document.getElementById('btn-student').classList.toggle('active', mode === 'student');
    document.body.classList.toggle('student-mode', mode === 'student');

    document.getElementById('btn-save').style.display = mode === 'teacher' ? '' : 'none';
    document.getElementById('btn-submit').style.display = mode === 'student' ? '' : 'none';

    const inst = document.getElementById('instructions');
    if (mode === 'teacher') {
        inst.innerHTML = `<h3>Teacher Mode</h3>
            <p>1. Tap the image to place a pin<br>
               2. Tap a term, then tap a pin's label to assign it<br>
               3. Drag a label to reposition it (leader line connects to pin)<br>
               4. Tap X to remove a pin<br>
               5. Use +/&minus; or pinch to zoom, drag to pan<br>
               6. Save when done</p>`;
    } else {
        const hasKey = answerKeys[currentImage] && answerKeys[currentImage].length > 0;
        if (hasKey) {
            inst.innerHTML = `<h3>Student Mode</h3>
                <p>Drag terms onto the numbered markers, or tap a term then tap a marker.<br>
                   Use +/&minus; to zoom in. Tap Submit when done.</p>`;
        } else {
            inst.innerHTML = `<h3>Student Mode</h3>
                <p style="color:var(--coral);">No answer key saved for this image yet.
                   Switch to Teacher Mode first.</p>`;
        }
    }

    document.getElementById('results').style.display = 'none';

    if (mode === 'student') {
        const key = answerKeys[currentImage];
        if (key && key.length > 0) {
            markers[currentImage] = key.map(k => ({
                id: k.id,
                x: k.x,
                y: k.y,
                labelDx: k.labelDx || 0,
                labelDy: k.labelDy || 5,
                word: null,
                resultClass: null
            }));
        } else {
            markers[currentImage] = [];
        }
        saveMarkers();
    }

    clearSelectedWord();
    renderAll();
}

// ---- Tabs ----
function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentImage = tab.dataset.image;
            document.getElementById('results').style.display = 'none';
            clearSelectedWord();
            zoomReset();
            renderAll();
            if (currentMode === 'student') setMode('student');
        });
    });
}

// ---- Render ----
function renderAll() {
    renderImage();
    renderWordBank();
    renderMarkers();
    renderLines();
}

function renderImage() {
    const img = document.getElementById('main-image');
    img.src = IMAGE_DATA[currentImage].src;
    img.alt = IMAGE_DATA[currentImage].title;
}

function renderWordBank() {
    const list = document.getElementById('word-list');
    const words = IMAGE_DATA[currentImage].words;
    const usedWords = getUsedWords();

    list.innerHTML = words.map(w => {
        const used = usedWords.has(w);
        return `<div class="word-chip ${used ? 'used' : ''}"
                     draggable="${!used}"
                     data-word="${escapeAttr(w)}">${w}</div>`;
    }).join('');

    list.querySelectorAll('.word-chip:not(.used)').forEach(chip => {
        chip.addEventListener('click', (e) => {
            if (!chip._wasDragged) {
                e.stopPropagation();
                selectWord(chip.dataset.word);
            }
        });
    });
}

function getUsedWords() {
    const set = new Set();
    const m = getActiveMarkers();
    m.forEach(mk => { if (mk.word) set.add(mk.word); });
    return set;
}

function getActiveMarkers() {
    return markers[currentImage] || [];
}

function renderMarkers() {
    const layer = document.getElementById('markers-layer');
    layer.innerHTML = '';
    const m = getActiveMarkers();

    m.forEach((mk, idx) => {
        // --- Dot ---
        const dot = document.createElement('div');
        dot.className = 'marker-dot';
        if (mk.resultClass) dot.classList.add(mk.resultClass === 'correct' ? 'dot-correct' : 'dot-incorrect');
        dot.style.left = mk.x + '%';
        dot.style.top = mk.y + '%';
        dot.textContent = idx + 1;
        dot.dataset.id = mk.id;

        dot.addEventListener('click', (e) => {
            if (selectedWord) {
                e.preventDefault();
                e.stopPropagation();
                assignWord(mk.id, selectedWord);
                clearSelectedWord();
            }
        });

        // --- Label ---
        const labelX = mk.x + (mk.labelDx || 0);
        const labelY = mk.y + (mk.labelDy || 5);

        const label = document.createElement('div');
        label.className = 'marker-label' + (mk.word ? '' : ' empty');
        if (mk.resultClass) label.classList.add(mk.resultClass);
        label.style.left = labelX + '%';
        label.style.top = labelY + '%';
        label.textContent = mk.word || 'Drop here';
        label.dataset.markerId = mk.id;
        label.classList.add('draggable-label');

        label.addEventListener('click', (e) => {
            if (selectedWord) {
                e.preventDefault();
                e.stopPropagation();
                assignWord(mk.id, selectedWord);
                clearSelectedWord();
            }
        });

        // --- Delete button ---
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'marker-delete';
        deleteBtn.textContent = 'x';
        deleteBtn.style.left = (mk.x + 1.5) + '%';
        deleteBtn.style.top = (mk.y - 2) + '%';
        const handleDelete = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (currentMode === 'teacher') {
                removeMarker(mk.id);
            } else {
                unassignWord(mk.id);
            }
        };
        deleteBtn.addEventListener('click', handleDelete);
        deleteBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDelete(e);
        });

        // --- Desktop drop targets ---
        label.addEventListener('dragover', (e) => { e.preventDefault(); label.classList.add('drop-hover'); });
        label.addEventListener('dragleave', () => { label.classList.remove('drop-hover'); });
        label.addEventListener('drop', (e) => {
            e.preventDefault(); label.classList.remove('drop-hover');
            if (draggedWord) assignWord(mk.id, draggedWord);
        });
        dot.addEventListener('dragover', (e) => { e.preventDefault(); label.classList.add('drop-hover'); });
        dot.addEventListener('dragleave', () => { label.classList.remove('drop-hover'); });
        dot.addEventListener('drop', (e) => {
            e.preventDefault(); label.classList.remove('drop-hover');
            if (draggedWord) assignWord(mk.id, draggedWord);
        });

        layer.appendChild(dot);
        layer.appendChild(label);
        layer.appendChild(deleteBtn);
    });
}

function renderLines() {
    const svg = document.getElementById('lines-layer');
    svg.innerHTML = '';
    const m = getActiveMarkers();

    m.forEach(mk => {
        const dx = mk.labelDx || 0;
        const dy = mk.labelDy || 5;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 3) return;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', mk.x + '%');
        line.setAttribute('y1', mk.y + '%');
        line.setAttribute('x2', (mk.x + dx) + '%');
        line.setAttribute('y2', (mk.y + dy) + '%');

        let color = '#1a6fa0';
        if (mk.resultClass === 'correct') color = '#4a7c59';
        if (mk.resultClass === 'incorrect') color = '#e07a5f';

        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '4,3');
        line.setAttribute('opacity', '0.8');
        svg.appendChild(line);
    });
}

// ---- Label Dragging (reposition labels) ----
function setupLabelDrag() {
    const container = document.getElementById('image-container');

    // --- Mouse ---
    container.addEventListener('mousedown', (e) => {
        const label = e.target.closest('.draggable-label');
        if (!label) return;
        if (selectedWord) return;

        e.preventDefault();
        e.stopPropagation();
        const markerId = parseInt(label.dataset.markerId);
        const mk = findMarker(markerId);
        if (mk) {
            mk._startDx = mk.labelDx || 0;
            mk._startDy = mk.labelDy || 5;
        }
        draggingLabel = markerId;
        labelDragStart = {
            mouseX: e.clientX,
            mouseY: e.clientY
        };
        label.classList.add('label-dragging');
    });

    document.addEventListener('mousemove', (e) => {
        if (draggingLabel === null) return;
        e.preventDefault();
        const mk = findMarker(draggingLabel);
        if (!mk) return;

        const container = document.getElementById('image-container');
        // Convert pixel delta to percentage, accounting for zoom
        const dx = (e.clientX - labelDragStart.mouseX) / zoomLevel;
        const dy = (e.clientY - labelDragStart.mouseY) / zoomLevel;
        const pctDx = (dx / container.scrollWidth) * 100;
        const pctDy = (dy / container.scrollHeight) * 100;

        const label = document.querySelector(`.marker-label[data-marker-id="${draggingLabel}"]`);
        if (label) {
            label.style.left = (mk.x + mk._startDx + pctDx) + '%';
            label.style.top = (mk.y + mk._startDy + pctDy) + '%';
        }
        updateLiveLineForMarker(mk, pctDx, pctDy);
    });

    document.addEventListener('mouseup', (e) => {
        if (draggingLabel === null) return;
        finishLabelDrag(e.clientX, e.clientY);
    });

    // --- Touch ---
    container.addEventListener('touchstart', (e) => {
        const label = e.target.closest('.draggable-label');
        if (!label) return;
        if (selectedWord) return;
        if (e.touches.length !== 1) return;

        const markerId = parseInt(label.dataset.markerId);
        const touch = e.touches[0];

        label._touchStartX = touch.clientX;
        label._touchStartY = touch.clientY;
        label._touchMarkerId = markerId;
        label._touchMoved = false;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        const label = e.target.closest('.draggable-label');
        if (!label || label._touchMarkerId === undefined) return;
        if (e.touches.length !== 1) return;

        const touch = e.touches[0];
        const dx = touch.clientX - label._touchStartX;
        const dy = touch.clientY - label._touchStartY;

        if (!label._touchMoved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            label._touchMoved = true;
            draggingLabel = label._touchMarkerId;
            const mk = findMarker(draggingLabel);
            if (mk) {
                mk._startDx = mk.labelDx || 0;
                mk._startDy = mk.labelDy || 5;
            }
            labelDragStart = {
                mouseX: label._touchStartX,
                mouseY: label._touchStartY
            };
            label.classList.add('label-dragging');
        }

        if (label._touchMoved && draggingLabel !== null) {
            e.preventDefault();
            e.stopPropagation();
            const mk = findMarker(draggingLabel);
            if (!mk) return;

            const container = document.getElementById('image-container');
            const pctDx = ((dx / zoomLevel) / container.scrollWidth) * 100;
            const pctDy = ((dy / zoomLevel) / container.scrollHeight) * 100;

            label.style.left = (mk.x + mk._startDx + pctDx) + '%';
            label.style.top = (mk.y + mk._startDy + pctDy) + '%';
            updateLiveLineForMarker(mk, pctDx, pctDy);
        }
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
        const label = e.target.closest('.draggable-label');
        if (!label) return;

        if (label._touchMoved && draggingLabel !== null) {
            const touch = e.changedTouches[0];
            finishLabelDrag(touch.clientX, touch.clientY);
        }
        label._touchMarkerId = undefined;
        label._touchMoved = false;
    });
}

function finishLabelDrag(endX, endY) {
    if (draggingLabel === null) return;

    const mk = findMarker(draggingLabel);
    if (mk && labelDragStart) {
        const container = document.getElementById('image-container');
        const dx = (endX - labelDragStart.mouseX) / zoomLevel;
        const dy = (endY - labelDragStart.mouseY) / zoomLevel;
        const pctDx = (dx / container.scrollWidth) * 100;
        const pctDy = (dy / container.scrollHeight) * 100;

        mk.labelDx = mk._startDx + pctDx;
        mk.labelDy = mk._startDy + pctDy;
        delete mk._startDx;
        delete mk._startDy;
        saveMarkers();
    }

    document.querySelectorAll('.label-dragging').forEach(l => l.classList.remove('label-dragging'));
    draggingLabel = null;
    labelDragStart = null;
    renderLines();
}

function updateLiveLineForMarker(mk, pctDx, pctDy) {
    const svg = document.getElementById('lines-layer');
    const existingLine = svg.querySelector(`line[data-id="${mk.id}"]`);

    const newDx = mk._startDx + pctDx;
    const newDy = mk._startDy + pctDy;

    if (existingLine) {
        existingLine.setAttribute('x2', (mk.x + newDx) + '%');
        existingLine.setAttribute('y2', (mk.y + newDy) + '%');
    } else {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('data-id', mk.id);
        line.setAttribute('x1', mk.x + '%');
        line.setAttribute('y1', mk.y + '%');
        line.setAttribute('x2', (mk.x + newDx) + '%');
        line.setAttribute('y2', (mk.y + newDy) + '%');
        line.setAttribute('stroke', '#1a6fa0');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '4,3');
        line.setAttribute('opacity', '0.8');
        svg.appendChild(line);
    }
}

function findMarker(id) {
    return (markers[currentImage] || []).find(m => m.id === id);
}

// ---- Tap-to-select word ----
function selectWord(word) {
    clearSelectedWord();
    selectedWord = word;
    document.querySelectorAll('.word-chip').forEach(chip => {
        if (chip.dataset.word === word) chip.classList.add('selected');
    });
    showToast(`"${word}" selected — now tap a marker`, '');
}

function clearSelectedWord() {
    selectedWord = null;
    document.querySelectorAll('.word-chip.selected').forEach(c => c.classList.remove('selected'));
}

// ---- Image Click/Tap (place marker, teacher only) ----
function setupImageClick() {
    const container = document.getElementById('image-container');

    container.addEventListener('click', (e) => {
        if (currentMode !== 'teacher') return;
        if (isPanning) return;
        if (e.target.closest('.marker-dot') || e.target.closest('.marker-label') ||
            e.target.closest('.marker-delete') || e.target.closest('.draggable-label')) return;

        const pct = screenToContainerPct(e.clientX, e.clientY);
        if (pct.x < 0 || pct.x > 100 || pct.y < 0 || pct.y > 100) return;
        addMarker(pct.x, pct.y);
    });

    // Touch tap for placing markers
    let touchStartPos = null;
    let touchStartTime = 0;
    container.addEventListener('touchstart', (e) => {
        if (currentMode !== 'teacher') return;
        if (e.target.closest('.marker-dot') || e.target.closest('.marker-label') ||
            e.target.closest('.marker-delete') || e.target.closest('.draggable-label')) return;
        if (e.touches.length !== 1) return;
        touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        touchStartTime = Date.now();
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
        if (currentMode !== 'teacher') return;
        if (!touchStartPos) return;
        if (e.target.closest('.marker-dot') || e.target.closest('.marker-label') ||
            e.target.closest('.marker-delete') || e.target.closest('.draggable-label')) {
            touchStartPos = null; return;
        }

        const elapsed = Date.now() - touchStartTime;
        if (elapsed > 500) { touchStartPos = null; return; }

        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartPos.x;
        const dy = touch.clientY - touchStartPos.y;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) { touchStartPos = null; return; }

        e.preventDefault();
        const pct = screenToContainerPct(touch.clientX, touch.clientY);
        if (pct.x < 0 || pct.x > 100 || pct.y < 0 || pct.y > 100) { touchStartPos = null; return; }
        addMarker(pct.x, pct.y);
        touchStartPos = null;
    });
}

// ---- Marker Management ----
function addMarker(x, y) {
    if (!markers[currentImage]) markers[currentImage] = [];
    markers[currentImage].push({
        id: ++markerIdCounter,
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        labelDx: 0,
        labelDy: 5,
        word: null
    });
    saveMarkers();
    renderAll();
}

function removeMarker(id) {
    if (!markers[currentImage]) return;
    markers[currentImage] = markers[currentImage].filter(m => m.id !== id);
    saveMarkers();
    renderAll();
}

function assignWord(markerId, word) {
    const m = (markers[currentImage] || []).find(mk => mk.id === markerId);
    if (!m) return;
    (markers[currentImage] || []).forEach(mk => {
        if (mk.word === word) mk.word = null;
    });
    m.word = word;
    saveMarkers();
    renderAll();
}

function unassignWord(markerId) {
    const m = (markers[currentImage] || []).find(mk => mk.id === markerId);
    if (m) {
        m.word = null;
        saveMarkers();
        renderAll();
    }
}

// ---- Desktop Drag & Drop (word chips) ----
function setupDragAndDrop() {
    document.addEventListener('dragstart', (e) => {
        if (e.target.classList && e.target.classList.contains('word-chip') && !e.target.classList.contains('used')) {
            draggedWord = e.target.dataset.word;
            e.target.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedWord);
        }
    });

    document.addEventListener('dragend', (e) => {
        if (e.target.classList && e.target.classList.contains('word-chip')) {
            e.target.classList.remove('dragging');
        }
        draggedWord = null;
    });

    const layer = document.getElementById('markers-layer');
    layer.addEventListener('dragover', (e) => e.preventDefault());
}

// ---- Touch Drag & Drop (word chips) ----
function setupTouchDrag() {
    const wordList = document.getElementById('word-list');

    wordList.addEventListener('touchstart', (e) => {
        const chip = e.target.closest('.word-chip');
        if (!chip || chip.classList.contains('used')) return;

        chip._touchStartTime = Date.now();
        chip._touchMoved = false;
        chip._touchStartX = e.touches[0].clientX;
        chip._touchStartY = e.touches[0].clientY;
        chip._wasDragged = false;

        touchDragEl = chip;
        draggedWord = chip.dataset.word;
    }, { passive: true });

    wordList.addEventListener('touchmove', (e) => {
        if (!touchDragEl) return;

        const touch = e.touches[0];
        const dx = touch.clientX - (touchDragEl._touchStartX || 0);
        const dy = touch.clientY - (touchDragEl._touchStartY || 0);

        if (!touchDragEl._touchMoved && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
            touchDragEl._touchMoved = true;
            touchDragEl._wasDragged = true;
            touchGhost = document.createElement('div');
            touchGhost.className = 'word-chip touch-ghost';
            touchGhost.textContent = touchDragEl.textContent;
            document.body.appendChild(touchGhost);
            touchDragEl.classList.add('dragging');
        }

        if (touchDragEl._touchMoved && touchGhost) {
            e.preventDefault();
            touchGhost.style.left = (touch.clientX - 40) + 'px';
            touchGhost.style.top = (touch.clientY - 20) + 'px';

            touchGhost.style.display = 'none';
            const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            touchGhost.style.display = '';

            const label = elemBelow ? elemBelow.closest('.marker-label') : null;
            const dot = elemBelow ? elemBelow.closest('.marker-dot') : null;

            document.querySelectorAll('.marker-label.drop-hover').forEach(l => l.classList.remove('drop-hover'));

            if (label) {
                label.classList.add('drop-hover');
                touchCurrentTarget = label;
            } else if (dot) {
                const id = dot.dataset.id;
                const correspondingLabel = document.querySelector(`.marker-label[data-marker-id="${id}"]`);
                if (correspondingLabel) {
                    correspondingLabel.classList.add('drop-hover');
                    touchCurrentTarget = correspondingLabel;
                }
            } else {
                touchCurrentTarget = null;
            }
        }
    }, { passive: false });

    wordList.addEventListener('touchend', (e) => {
        if (!touchDragEl) return;

        if (touchDragEl._touchMoved && touchCurrentTarget && draggedWord) {
            const markerId = parseInt(touchCurrentTarget.dataset.markerId);
            if (markerId) assignWord(markerId, draggedWord);
        }

        if (touchGhost) { touchGhost.remove(); touchGhost = null; }
        if (touchDragEl) touchDragEl.classList.remove('dragging');
        document.querySelectorAll('.marker-label.drop-hover').forEach(l => l.classList.remove('drop-hover'));
        touchDragEl = null;
        touchCurrentTarget = null;
        draggedWord = null;
    });
}

// ---- Save / Load ----
function saveMarkers() {
    try {
        localStorage.setItem('bio40a_markers', JSON.stringify(markers));
        localStorage.setItem('bio40a_markerCounter', markerIdCounter);
    } catch(e) {}
}

function loadMarkers() {
    try {
        const data = localStorage.getItem('bio40a_markers');
        if (data) markers = JSON.parse(data);
        const counter = localStorage.getItem('bio40a_markerCounter');
        if (counter) markerIdCounter = parseInt(counter);
    } catch(e) {}
}

function saveAnswerKey() {
    const m = markers[currentImage];
    if (!m || m.length === 0) {
        showToast('Place some markers first!', 'error');
        return;
    }

    const unassigned = m.filter(mk => !mk.word);
    if (unassigned.length > 0) {
        showToast(`${unassigned.length} marker(s) still need terms assigned`, 'error');
        return;
    }

    answerKeys[currentImage] = JSON.parse(JSON.stringify(m));
    localStorage.setItem('bio40a_answerKeys', JSON.stringify(answerKeys));
    showToast(`Answer key saved for "${IMAGE_DATA[currentImage].title}" (${m.length} items)`, 'success');
}

function loadAnswerKeys() {
    try {
        const data = localStorage.getItem('bio40a_answerKeys');
        if (data) answerKeys = JSON.parse(data);
    } catch(e) {}
}

// ---- Student Submit ----
function submitAnswers() {
    const key = answerKeys[currentImage];
    if (!key || key.length === 0) {
        showToast('No answer key for this image. Teacher must save one first.', 'error');
        return;
    }

    const studentMarkers = markers[currentImage] || [];
    let correct = 0;
    let total = key.length;
    const wrongItems = [];

    studentMarkers.forEach(sm => {
        const keyMarker = key.find(k => k.id === sm.id);
        if (keyMarker) {
            if (sm.word === keyMarker.word) {
                sm.resultClass = 'correct';
                correct++;
            } else {
                sm.resultClass = 'incorrect';
                wrongItems.push({
                    marker: key.indexOf(keyMarker) + 1,
                    yours: sm.word || '(empty)',
                    correct: keyMarker.word
                });
            }
        }
    });

    renderAll();

    const pct = Math.round((correct / total) * 100);
    const scoreClass = pct === 100 ? 'perfect' : pct >= 70 ? 'good' : 'poor';
    const resultsDiv = document.getElementById('results');
    resultsDiv.style.display = 'block';

    let html = `<h3>Results</h3>
        <div class="score ${scoreClass}">${correct}/${total} (${pct}%)</div>`;

    if (wrongItems.length > 0) {
        html += `<div class="detail" style="margin-bottom:8px;">Incorrect answers:</div>`;
        wrongItems.forEach(w => {
            html += `<div class="wrong-item">
                #${w.marker}: You said <strong>${w.yours}</strong><br>
                Correct: <strong>${w.correct}</strong>
            </div>`;
        });
    } else {
        html += `<div class="detail" style="color:#4a7c59; text-align:center;">Perfect score!</div>`;
    }

    resultsDiv.innerHTML = html;
}

// ---- Reset ----
function resetCurrent() {
    clearSelectedWord();
    markers[currentImage] = [];

    if (currentMode === 'student') {
        const key = answerKeys[currentImage];
        if (key && key.length > 0) {
            markers[currentImage] = key.map(k => ({
                id: k.id,
                x: k.x,
                y: k.y,
                labelDx: k.labelDx || 0,
                labelDy: k.labelDy || 5,
                word: null,
                resultClass: null
            }));
        }
    }

    saveMarkers();
    document.getElementById('results').style.display = 'none';
    renderAll();
    showToast('Cleared!', 'success');
}

// ---- Toast ----
function showToast(msg, type) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast ' + (type || '') + ' show';
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ---- Util ----
function escapeAttr(s) {
    return s.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---- Globals for HTML onclick ----
window.setMode = setMode;
window.saveAnswerKey = saveAnswerKey;
window.submitAnswers = submitAnswers;
window.resetCurrent = resetCurrent;

// ---- Start ----
document.addEventListener('DOMContentLoaded', init);
