// ============================================================
// BIO 40A Lab Quiz — Teacher/Student Labeling App
// Touch + Desktop support
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
            <p>1. Tap the image to place a marker<br>
               2. Drag a term onto the marker (or tap term then tap marker)<br>
               3. Long-press a marker to remove it<br>
               4. Save when done</p>`;
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
    resetCurrent();
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
        const div = document.createElement('div');
        div.className = 'marker';
        if (mk.resultClass) div.classList.add(mk.resultClass);
        div.style.left = mk.x + '%';
        div.style.top = mk.y + '%';
        div.dataset.id = mk.id;

        const dot = document.createElement('div');
        dot.className = 'marker-dot';
        dot.textContent = idx + 1;

        const label = document.createElement('div');
        label.className = 'marker-label' + (mk.word ? '' : ' empty');
        label.textContent = mk.word || 'Drop here';
        label.dataset.markerId = mk.id;

        // Right-click to remove (teacher only) — desktop
        if (currentMode === 'teacher') {
            dot.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                removeMarker(mk.id);
            });
            label.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                unassignWord(mk.id);
            });

            // Long-press to remove — touch
            let longPressTimer = null;
            dot.addEventListener('touchstart', (e) => {
                longPressTimer = setTimeout(() => {
                    e.preventDefault();
                    removeMarker(mk.id);
                    longPressTimer = null;
                }, 600);
            }, { passive: false });
            dot.addEventListener('touchend', () => {
                if (longPressTimer) clearTimeout(longPressTimer);
            });
            dot.addEventListener('touchmove', () => {
                if (longPressTimer) clearTimeout(longPressTimer);
            });
        }

        // Tap-to-assign: if a word is selected, tapping a marker assigns it
        const handleTapAssign = (e) => {
            if (selectedWord) {
                e.preventDefault();
                e.stopPropagation();
                assignWord(mk.id, selectedWord);
                clearSelectedWord();
            }
        };
        label.addEventListener('click', handleTapAssign);
        dot.addEventListener('click', handleTapAssign);

        // Desktop drag drop target
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
            if (draggedWord) {
                assignWord(mk.id, draggedWord);
            }
        });

        div.appendChild(dot);
        div.appendChild(label);
        layer.appendChild(div);
    });
}

// ---- Tap-to-select word (touch alternative to drag) ----
let selectedWord = null;

function selectWord(word) {
    clearSelectedWord();
    selectedWord = word;
    // Highlight the selected chip
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

    // Desktop click
    container.addEventListener('click', (e) => {
        if (currentMode !== 'teacher') return;
        if (e.target.closest('.marker')) return;
        const rect = container.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        addMarker(x, y);
    });

    // Touch tap — we need to distinguish from scrolling
    let touchStartPos = null;
    let touchStartTime = 0;
    container.addEventListener('touchstart', (e) => {
        if (currentMode !== 'teacher') return;
        if (e.target.closest('.marker')) return;
        if (e.touches.length !== 1) return;
        touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        touchStartTime = Date.now();
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
        if (currentMode !== 'teacher') return;
        if (!touchStartPos) return;
        if (e.target.closest('.marker')) { touchStartPos = null; return; }

        const elapsed = Date.now() - touchStartTime;
        if (elapsed > 500) { touchStartPos = null; return; } // was a long press, not a tap

        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartPos.x;
        const dy = touch.clientY - touchStartPos.y;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) { touchStartPos = null; return; } // was a scroll

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
        word: null
    });
    saveMarkers();
    renderMarkers();
    renderWordBank();
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

// ---- Desktop Drag & Drop ----
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

// ---- Touch Drag & Drop ----
function setupTouchDrag() {
    const wordList = document.getElementById('word-list');

    wordList.addEventListener('touchstart', (e) => {
        const chip = e.target.closest('.word-chip');
        if (!chip || chip.classList.contains('used')) return;

        // Tap-to-select: if it's a quick tap, select the word instead of dragging
        chip._touchStartTime = Date.now();
        chip._touchMoved = false;
        chip._touchStartX = e.touches[0].clientX;
        chip._touchStartY = e.touches[0].clientY;

        touchDragEl = chip;
        draggedWord = chip.dataset.word;
    }, { passive: true });

    wordList.addEventListener('touchmove', (e) => {
        if (!touchDragEl) return;

        const touch = e.touches[0];
        const dx = touch.clientX - (touchDragEl._touchStartX || 0);
        const dy = touch.clientY - (touchDragEl._touchStartY || 0);

        // Only start drag if moved enough
        if (!touchDragEl._touchMoved && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
            touchDragEl._touchMoved = true;
            // Create ghost element
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

            // Check if over a marker label
            const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            const label = elemBelow ? elemBelow.closest('.marker-label') : null;
            const dot = elemBelow ? elemBelow.closest('.marker-dot') : null;

            // Clear all hover states
            document.querySelectorAll('.marker-label.drop-hover').forEach(l => l.classList.remove('drop-hover'));

            if (label) {
                label.classList.add('drop-hover');
                touchCurrentTarget = label;
            } else if (dot) {
                const marker = dot.closest('.marker');
                const markerLabel = marker ? marker.querySelector('.marker-label') : null;
                if (markerLabel) {
                    markerLabel.classList.add('drop-hover');
                    touchCurrentTarget = markerLabel;
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
            // Drop on marker
            const markerId = parseInt(touchCurrentTarget.dataset.markerId);
            if (markerId) {
                assignWord(markerId, draggedWord);
            }
        } else if (!wasMoved) {
            // It was a tap — use tap-to-select
            selectWord(draggedWord);
        }

        // Cleanup
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

    renderMarkers();

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
    if (currentMode === 'student') {
        // Reload marker positions from answer key but clear all word assignments
        const key = answerKeys[currentImage];
        if (key && key.length > 0) {
            markers[currentImage] = key.map(k => ({
                id: k.id,
                x: k.x,
                y: k.y,
                word: null,
                resultClass: null
            }));
        } else {
            markers[currentImage] = [];
        }
    } else {
        // Teacher mode: clear all markers and start fresh
        markers[currentImage] = [];
    }

    saveMarkers();
    document.getElementById('results').style.display = 'none';
    renderAll();
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
