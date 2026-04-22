const { Renderer, Stave, StaveNote, Voice, Formatter, Beam } = Vex.Flow;

let currentMode = null;
let currentNotes = [];
let isPlaying = false;
let currentTempo = 0.6;

const piano = new Tone.Sampler({
    urls: { "C4": "audio/C4.mp3" },
    release: 1.5
}).toDestination();

function showWarning() {
    const msgDiv = document.getElementById('status-message');
    if (msgDiv) msgDiv.style.display = 'block';
}

function hideWarning() {
    const msgDiv = document.getElementById('status-message');
    if (msgDiv) msgDiv.style.display = 'none';
}

function selectDifficulty(mode) {
    if (isPlaying) { showWarning(); return; }
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-${mode}`);
    if (activeBtn) activeBtn.classList.add('active');
    generateAndPlay();
}

function generateMelody() {
    const scale = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
    let melody = [];
    
    if (currentMode === 'easy') {
        // Đơn giản: 12-15 nốt ngẫu nhiên
        let target = Math.floor(Math.random() * (15 - 12 + 1)) + 12;
        let lastIdx = 0;
        for (let i = 0; i < target; i++) {
            let jump = Math.floor(Math.random() * 3) - 1;
            lastIdx = Math.max(0, Math.min(scale.length - 1, lastIdx + jump));
            let dur = (Math.random() < 0.2) ? "8" : "q";
            melody.push({ key: scale[lastIdx], duration: dur });
        }
    } else {
        // KHÓ HƠN: Cấu trúc A - A' (22-26 nốt)
        let totalTarget = Math.floor(Math.random() * (26 - 22 + 1)) + 22;
        let half = Math.floor(totalTarget / 2);
        
        // Tạo đoạn A (vế đầu)
        let partA = [];
        let lastIdx = 0;
        for (let i = 0; i < half; i++) {
            let jump = Math.floor(Math.random() * 3) - 1;
            lastIdx = Math.max(0, Math.min(scale.length - 1, lastIdx + jump));
            let dur = (Math.random() < 0.2) ? "8" : "q";
            partA.push({ key: scale[lastIdx], duration: dur });
        }
        
        // Tạo đoạn A' (Copy A nhưng đổi nốt cuối)
        let partAPrime = JSON.parse(JSON.stringify(partA)); // Copy mảng
        
        // Thay đổi nốt cuối cùng hoặc 2 nốt cuối
        let changeIdx = partAPrime.length - 1;
        let newIdx = Math.floor(Math.random() * scale.length);
        partAPrime[changeIdx].key = scale[newIdx];
        
        // Nếu số nốt lẻ, bù thêm 1 nốt vào cuối đoạn A'
        if (totalTarget % 2 !== 0) {
            partAPrime.push({ key: scale[Math.floor(Math.random() * scale.length)], duration: "q" });
        }
        
        melody = partA.concat(partAPrime);
    }
    return melody;
}

async function generateAndPlay() {
    if (Tone.context.state !== 'running') await Tone.start();
    currentNotes = generateMelody();
    renderSheet(currentNotes);
    playMusic(currentNotes);
}

function renderSheet(notesArray) {
    const div = document.getElementById("staff");
    div.innerHTML = ""; 
    const isMobile = window.innerWidth < 600;
    const measuresPerLine = isMobile ? 2 : 4;
    
    let measures = [];
    let tempM = [];
    let beats = 0;
    notesArray.forEach(n => {
        tempM.push(n);
        beats += (n.duration === "q" ? 1 : 0.5);
        if (beats >= 4) {
            measures.push(tempM);
            tempM = [];
            beats = 0;
        }
    });
    if (tempM.length > 0) measures.push(tempM);

    const totalLines = Math.ceil(measures.length / measuresPerLine);
    const containerWidth = div.offsetWidth - 20;
    const rowHeight = isMobile ? 80 : 100; 
    
    const renderer = new Renderer(div, Renderer.Backends.SVG);
    const context = renderer.getContext();
    renderer.resize(containerWidth, totalLines * rowHeight);

    measures.forEach((m, idx) => {
        const lineIdx = Math.floor(idx / measuresPerLine);
        const colIdx = idx % measuresPerLine;
        const staveWidth = containerWidth / measuresPerLine;
        const stave = new Stave(10 + colIdx * staveWidth, lineIdx * rowHeight, staveWidth);
        if (colIdx === 0) stave.addClef("treble");
        stave.setContext(context).draw();

        const vexNotes = m.map(n => new StaveNote({ keys: [`${n.key[0]}/${n.key[1]}`], duration: n.duration }));
        const beams = Beam.generateBeams(vexNotes);
        const voice = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
        voice.addTickables(vexNotes);
        new Formatter().joinVoices([voice]).format([voice], staveWidth - 40);
        voice.draw(context, stave);
        beams.forEach(b => b.setContext(context).draw());
    });
}

function playMusic(notes) {
    if (isPlaying) return;
    isPlaying = true;
    hideWarning();
    let now = Tone.now() + 0.1; 
    let timeOffset = 0;
    notes.forEach((n) => {
        let duration = (n.duration === "q" ? currentTempo : currentTempo / 2);
        piano.triggerAttackRelease(n.key, "4n", now + timeOffset);
        timeOffset += duration;
    });
    setTimeout(() => { isPlaying = false; hideWarning(); }, (timeOffset * 1000) + 500);
}

function replayMusic() {
    if (isPlaying) { showWarning(); return; }
    if (currentNotes.length === 0) return;
    playMusic(currentNotes);
}

function changeMusic() {
    if (isPlaying) { showWarning(); return; }
    if (!currentMode) return;
    generateAndPlay();
}

function updateTempo(change) {
    if (isPlaying) { showWarning(); return; }
    let newTempo = parseFloat((currentTempo + change).toFixed(1));
    if (newTempo >= 0.3 && newTempo <= 1.5) {
        currentTempo = newTempo;
        document.getElementById('tempo-display').innerText = currentTempo + "s";
    }
}

window.onresize = function() {
    if (currentNotes.length > 0) renderSheet(currentNotes);
};