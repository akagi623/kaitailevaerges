import { GameEngine } from './engine';
import { CHARACTERS, STAGES } from './data';

const canvas = document.getElementById('gameCanvas');
const ui = {
    money: document.getElementById('moneyValue'),
    score: document.getElementById('scoreValue'),
    timer: document.getElementById('timerValue'),
    lives: document.getElementById('livesValue'),
    combo: document.getElementById('comboValue'),
    comboContainer: document.getElementById('comboContainer'),

    startScreen: document.getElementById('startScreen'),
    stageScreen: document.getElementById('stageScreen'),
    charScreen: document.getElementById('charScreen'),
    resultScreen: document.getElementById('resultScreen'),
    gameOverScreen: document.getElementById('gameOverScreen'),
    pauseScreen: document.getElementById('pauseScreen'),

    startBtn: document.getElementById('startBtn'),
    openStageBtn: document.getElementById('openStageBtn'),
    openCharBtn: document.getElementById('openCharBtn'),
    backFromStageBtn: document.getElementById('backFromStageBtn'),
    backToMainBtn: document.getElementById('backToMainBtn'),
    stopBtn: document.getElementById('stopBtn'),
    resumeBtn: document.getElementById('resumeBtn'),
    pauseTopBtn: document.getElementById('pauseTopBtn'),
    retireBtn: document.getElementById('retireBtn'),

    charName: document.getElementById('selectedCharName'),
    charDesc: document.getElementById('selectedCharDesc'),
    charStats: document.getElementById('selectedCharStats'),
    stageList: document.getElementById('stageList'),
    charList: document.getElementById('charList'),
    pauseCharName: document.getElementById('pauseCharName'),
    pauseScore: document.getElementById('pauseScore'),
    pauseLives: document.getElementById('pauseLives')
};

let currentCharacter = CHARACTERS[0];
let currentStage = STAGES[0];
let totalMoney = 0;

// Web Audio API for BGM (to support iOS volume control)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let bgmBuffer = null;
let bgmSource = null;
let bgmGain = audioCtx.createGain();
bgmGain.connect(audioCtx.destination);
bgmGain.gain.value = 0.4;
let isBgmPlaying = false;
let bgmStartTime = 0;
let bgmPauseTime = 0;

// Load BGM
fetch('BURNING ADRENALINE.mp3')
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => audioCtx.decodeAudioData(arrayBuffer))
    .then(audioBuffer => {
        bgmBuffer = audioBuffer;
    })
    .catch(e => console.error("Failed to load BGM:", e));

function playBGM() {
    if (!bgmBuffer || isBgmPlaying) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    bgmSource = audioCtx.createBufferSource();
    bgmSource.buffer = bgmBuffer;
    bgmSource.loop = true;
    bgmSource.connect(bgmGain);
    
    // Calculate offset if it was paused
    const offset = bgmPauseTime % bgmBuffer.duration;
    bgmSource.start(0, offset);
    bgmStartTime = audioCtx.currentTime - offset;
    isBgmPlaying = true;
}

function pauseBGM() {
    if (isBgmPlaying && bgmSource) {
        bgmSource.stop();
        bgmPauseTime = audioCtx.currentTime - bgmStartTime;
        isBgmPlaying = false;
    }
}

function resetBGM() {
    pauseBGM();
    bgmPauseTime = 0;
}

const engine = new GameEngine(canvas, (type, data) => {
    if (type === 'update') {
        ui.money.textContent = Math.floor(totalMoney + data.score).toLocaleString();
        ui.score.textContent = data.score.toString().padStart(4, '0');
        ui.lives.textContent = data.lives;
        ui.combo.textContent = data.combo;

        // タイマーの表示更新
        const mins = Math.floor(data.time / 60);
        const secs = data.time % 60;
        ui.timer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        if (data.combo > 1) {
            ui.comboContainer.classList.remove('hidden');
        } else {
            ui.comboContainer.classList.add('hidden');
        }
    } else if (type === 'win') {
        showScreen(ui.resultScreen);
        const earned = engine.stats.score;
        totalMoney += earned;
        document.getElementById('earnedMoney').textContent = earned.toLocaleString();
    } else if (type === 'gameover') {
        showScreen(ui.gameOverScreen);
        ui.stopBtn.classList.add('hidden');
        ui.retireBtn.classList.add('hidden');
        bgm.pause();
        bgm.currentTime = 0;
    }
});

function showScreen(screen) {
    [ui.startScreen, ui.stageScreen, ui.charScreen, ui.resultScreen, ui.gameOverScreen, ui.pauseScreen].forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
}

function updateCharPreview(char) {
    ui.charName.textContent = char.name;
    ui.charDesc.textContent = char.desc;
    ui.charStats.innerHTML = `
        <div class="stat-item">SPEED <span>${char.speed}/10</span></div>
        <div class="stat-item">POWER <span>${char.power}/10</span></div>
        <div class="stat-item">SIZE <span>${char.size}px</span></div>
    `;
    const avatar = document.getElementById('previewAvatar');
    if (avatar) avatar.style.background = char.color;
}

ui.startBtn.addEventListener('click', () => {
    [ui.startScreen, ui.stageScreen, ui.charScreen, ui.resultScreen, ui.gameOverScreen, ui.pauseScreen].forEach(s => s.classList.add('hidden'));
    ui.stopBtn.classList.remove('hidden');
    ui.retireBtn.classList.remove('hidden');
    engine.startLevel(currentStage, currentCharacter);
    
    // Play BGM on first interaction
    playBGM();
});

ui.stopBtn.addEventListener('click', () => {
    engine.isPaused = true;
    bgmGain.gain.exponentialRampToValueAtTime(0.025, audioCtx.currentTime + 0.1); // スムーズに下げる
    
    // Update pause stats
    ui.pauseCharName.textContent = currentCharacter.name;
    ui.pauseScore.textContent = engine.stats.score.toLocaleString();
    ui.pauseLives.textContent = engine.stats.lives;
    
    showScreen(ui.pauseScreen);
});

ui.resumeBtn.addEventListener('click', () => {
    engine.isPaused = false;
    bgmGain.gain.exponentialRampToValueAtTime(0.4, audioCtx.currentTime + 0.1); // スムーズに戻す
    showScreen({ classList: { add: () => {}, remove: () => {} } }); // Hide modals but don't show any new one
    ui.pauseScreen.classList.add('hidden');
});

ui.pauseTopBtn.addEventListener('click', () => {
    engine.isPaused = false;
    engine.gameState = 'menu';
    resetBGM();
    showScreen(ui.startScreen);
    ui.stopBtn.classList.add('hidden');
    ui.retireBtn.classList.add('hidden');
});

ui.openStageBtn.addEventListener('click', () => {
    renderStages();
    showScreen(ui.stageScreen);
});

ui.openCharBtn.addEventListener('click', () => {
    renderCharacters();
    showScreen(ui.charScreen);
});

ui.backFromStageBtn.addEventListener('click', () => showScreen(ui.startScreen));
ui.backToMainBtn.addEventListener('click', () => showScreen(ui.startScreen));

ui.retireBtn.addEventListener('click', () => {
    if (confirm('現場から撤収しますか？ (現在のスコアは破棄されます)')) {
        engine.gameState = 'menu';
        resetBGM();
        showScreen(ui.startScreen);
        ui.stopBtn.classList.add('hidden');
        ui.retireBtn.classList.add('hidden');
    }
});

document.getElementById('backToTopBtn').addEventListener('click', () => {
    resetBGM();
    showScreen(ui.startScreen);
});
document.getElementById('gameOverTopBtn').addEventListener('click', () => {
    resetBGM();
    showScreen(ui.startScreen);
});
document.getElementById('restartBtn').addEventListener('click', () => {
    [ui.startScreen, ui.stageScreen, ui.charScreen, ui.resultScreen, ui.gameOverScreen].forEach(s => s.classList.add('hidden'));
    engine.startLevel(currentStage, currentCharacter);
});

function renderStages() {
    ui.stageList.innerHTML = '';
    STAGES.forEach(stage => {
        const card = document.createElement('div');
        card.className = 'stage-card';
        card.innerHTML = `<strong>${stage.name}</strong><p>報酬: ¥${stage.reward.toLocaleString()}</p>`;
        card.addEventListener('click', () => {
            currentStage = stage;
            showScreen(ui.startScreen);
        });
        ui.stageList.appendChild(card);
    });
}

function renderCharacters() {
    ui.charList.innerHTML = '';
    CHARACTERS.forEach(char => {
        const card = document.createElement('div');
        card.className = 'char-card';
        card.style.borderLeft = `4px solid ${char.color}`;
        card.innerHTML = `
            <strong>${char.name}</strong>
            <div class="char-card-stats">
                <div class="stat-bar-container">SPEED (${char.speed}) <div class="stat-bar"><div class="stat-fill" style="width: ${char.speed * 10}%; background: ${char.color}"></div></div></div>
                <div class="stat-bar-container">POWER (${char.power}) <div class="stat-bar"><div class="stat-fill" style="width: ${char.power * 10}%; background: ${char.color}"></div></div></div>
                <div class="stat-bar-container">SIZE (${char.size}) <div class="stat-bar"><div class="stat-fill" style="width: ${(char.size / 150) * 100}%; background: ${char.color}"></div></div></div>
            </div>
        `;
        card.addEventListener('click', () => {
            currentCharacter = char;
            updateCharPreview(char);
            showScreen(ui.startScreen);
        });
        ui.charList.appendChild(card);
    });
}

// Initial state
updateCharPreview(currentCharacter);
renderStages();
renderCharacters();
