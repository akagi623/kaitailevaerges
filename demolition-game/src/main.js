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

    startBtn: document.getElementById('startBtn'),
    openStageBtn: document.getElementById('openStageBtn'),
    openCharBtn: document.getElementById('openCharBtn'),
    backFromStageBtn: document.getElementById('backFromStageBtn'),
    backToMainBtn: document.getElementById('backToMainBtn'),

    charName: document.getElementById('selectedCharName'),
    charDesc: document.getElementById('selectedCharDesc'),
    charStats: document.getElementById('selectedCharStats'),
    stageList: document.getElementById('stageList'),
    charList: document.getElementById('charList')
};

let currentCharacter = CHARACTERS[0];
let currentStage = STAGES[0];
let totalMoney = 0;

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
    }
});

function showScreen(screen) {
    [ui.startScreen, ui.stageScreen, ui.charScreen, ui.resultScreen, ui.gameOverScreen].forEach(s => s.classList.add('hidden'));
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
    [ui.startScreen, ui.stageScreen, ui.charScreen, ui.resultScreen, ui.gameOverScreen].forEach(s => s.classList.add('hidden'));
    engine.startLevel(currentStage, currentCharacter);
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

document.getElementById('backToTopBtn').addEventListener('click', () => showScreen(ui.startScreen));
document.getElementById('gameOverTopBtn').addEventListener('click', () => showScreen(ui.startScreen));
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
