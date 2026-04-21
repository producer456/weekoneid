// ============================================================
// BIO 40A Lab Quiz — Teacher/Student Labeling App
// Touch + Desktop + Leader Lines
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

// Touch drag state
let touchDragEl = null;
let touchGhost = null;
let touchCurrentTarget = null;

// Tap-to-select state
let selectedWord = null;

// Label dragging state
let draggingLabel = null;
let labelDragStart = null;

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
}

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
               3. Drag a label to reposition it (a leader line will connect it to the pin)<br>
               4. Tap X to remove a pin<br>
               5. Save when done</p>`;
    } else {
        const hasKey = answerKeys[currentImage] && answerKeys[currentImage].length > 0;
        if (hasKey) {
            inst.innerHTML = `<h3>Student Mode</h3>
                <p>Drag terms onto the numbered markers, or tap a term then tap a marker.<br>
                   Tap Submit when done.</p>`;
        } else {
            inst.innerHTML = `<h3>Student Mode</h3>
                <p style="color:#ef4444;">No answer key saved for this image yet.
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

    // Tap-to-select on word chips
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

        // Tap dot to assign selected word
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

        // Make label a drag handle for repositioning
        label.classList.add('draggable-label');

        // Tap label to assign selected word
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
        label.addEventListener('dragover', (e) => {
            e.preventDefault();
            label.classList.add('drop-hover');
        });
        label.addEventListener('dragleave', () => {
            label.classList.remove('drop-hover');
        });
        label.addEventListener('drop', (e) => {
            e.preventDefault();
            label.classList.remove('drop-hover');
            if (draggedWord) assignWord(mk.id, draggedWord);
        });

        dot.addEventListener('dragover', (e) => {
            e.preventDefault();
            label.classList.add('drop-hover');
        });
        dot.addEventListener('dragleave', () => {
            label.classList.remove('drop-hover');
        });
        dot.addEventListener('drop', (e) => {
            e.preventDefault();
            label.classList.remove('drop-hover');
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

        // Only draw line if label is offset from dot
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
        // Don't start label drag if we're assigning a word
        if (selectedWord) return;

        e.preventDefault();
        const markerId = parseInt(label.dataset.markerId);
        const rect = container.getBoundingClientRect();
        draggingLabel = markerId;
        labelDragStart = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            containerW: rect.width,
            containerH: rect.height
        };
        label.classList.add('label-dragging');
    });

    document.addEventListener('mousemove', (e) => {
        if (draggingLabel === null) return;
        e.preventDefault();
        const mk = findMarker(draggingLabel);
        if (!mk) return;

        const dx = e.clientX - labelDragStart.mouseX;
        const dy = e.clientY - labelDragStart.mouseY;
        const pctDx = (dx / labelDragStart.containerW) * 100;
        const pctDy = (dy / labelDragStart.containerH) * 100;

        // Update label position in real-time
        const label = document.querySelector(`.marker-label[data-marker-id="${draggingLabel}"]`);
        if (label) {
            const newX = mk.x + (mk._startDx || mk.labelDx || 0) + pctDx;
            const newY = mk.y + (mk._startDy || mk.labelDy || 5) + pctDy;
            label.style.left = newX + '%';
            label.style.top = newY + '%';
        }

        // Update line in real-time
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

        const markerId = parseInt(label.dataset.markerId);
        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();

        // Store start info but wait for movement to confirm drag
        label._touchStartX = touch.clientX;
        label._touchStartY = touch.clientY;
        label._touchMarkerId = markerId;
        label._touchMoved = false;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        const label = e.target.closest('.draggable-label');
        if (!label || label._touchMarkerId === undefined) return;

        const touch = e.touches[0];
        const dx = touch.clientX - label._touchStartX;
        const dy = touch.clientY - label._touchStartY;

        if (!label._touchMoved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            label._touchMoved = true;
            const rect = container.getBoundingClientRect();
            draggingLabel = label._touchMarkerId;
            const mk = findMarker(draggingLabel);
            if (mk) {
                mk._startDx = mk.labelDx || 0;
                mk._startDy = mk.labelDy || 5;
            }
            labelDragStart = {
                mouseX: label._touchStartX,
                mouseY: label._touchStartY,
                containerW: rect.width,
                containerH: rect.height
            };
            label.classList.add('label-dragging');
        }

        if (label._touchMoved && draggingLabel !== null) {
            e.preventDefault();
            const mk = findMarker(draggingLabel);
            if (!mk) return;

            const pctDx = (dx / labelDragStart.containerW) * 100;
            const pctDy = (dy / labelDragStart.containerH) * 100;

            const newX = mk.x + mk._startDx + pctDx;
            const newY = mk.y + mk._startDy + pctDy;
            label.style.left = newX + '%';
            label.style.top = newY + '%';

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
        const dx = endX - labelDragStart.mouseX;
        const dy = endY - labelDragStart.mouseY;
        const pctDx = (dx / labelDragStart.containerW) * 100;
        const pctDy = (dy / labelDragStart.containerH) * 100;

        mk.labelDx = (mk._startDx || mk.labelDx || 0) + pctDx;
        mk.labelDy = (mk._startDy || mk.labelDy || 5) + pctDy;
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

    const startDx = mk._startDx || mk.labelDx || 0;
    const startDy = mk._startDy || mk.labelDy || 5;
    const newDx = startDx + pctDx;
    const newDy = startDy + pctDy;

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
        if (chip.dataset.word === word) {
            chip.classList.add('selected');
        }
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
        if (e.target.closest('.marker-dot') || e.target.closest('.marker-label') ||
            e.target.closest('.marker-delete') || e.target.closest('.draggable-label')) return;
        const rect = container.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        addMarker(x, y);
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
            touchStartPos = null;
            return;
        }

        const elapsed = Date.now() - touchStartTime;
        if (elapsed > 500) { touchStartPos = null; return; }

        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartPos.x;
        const dy = touch.clientY - touchStartPos.y;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) { touchStartPos = null; return; }

        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const x = ((touch.clientX - rect.left) / rect.width) * 100;
        const y = ((touch.clientY - rect.top) / rect.height) * 100;
        addMarker(x, y);
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
                // Find corresponding label
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

        const wasMoved = touchDragEl._touchMoved;

        if (wasMoved && touchCurrentTarget && draggedWord) {
            const markerId = parseInt(touchCurrentTarget.dataset.markerId);
            if (markerId) {
                assignWord(markerId, draggedWord);
            }
        }

        if (touchGhost) {
            touchGhost.remove();
            touchGhost = null;
        }
        if (touchDragEl) {
            touchDragEl.classList.remove('dragging');
        }
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
        html += `<div class="detail" style="color:#22c55e; text-align:center;">Perfect score!</div>`;
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

// ---- Start ----
document.addEventListener('DOMContentLoaded', init);
