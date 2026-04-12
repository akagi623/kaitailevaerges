import { CANVAS_WIDTH, CANVAS_HEIGHT, BALL_INITIAL_SPEED, SPECIAL_GAUGE_MAX, GAUGE_CHARGE_PER_HIT, LASER_DAMAGE, MONEY_DROP_RATE, MAGNET_RADIUS, GAME_STATE, STAGE_ID, STAGE_CONFIG, EQUIPMENT_DATA } from './Constants.js';
import { Ball } from './Ball.js';
import { Paddle } from './Paddle.js';
import { LevelManager } from './LevelManager.js';
import { EffectManager } from './EffectManager.js';
import { Item, ITEM_TYPES, getRandomItemType } from './Item.js';
import { Player } from './Player.js';

// ========== キャラクターデータ ==========
const CHARACTERS = [
    {
        id: 'yasu',
        name: '熱血ルーキー ヤス',
        desc: 'バランス型。熱量でカバーする現場の新人。',
        attack: 10, speed: 8, defense: 100,
        color: '#ffeb3b', badge: '🔥',
    },
    {
        id: 'ryou',
        name: 'クールエース リョウ',
        desc: 'スピード特化。冷静な判断で現場を制す。',
        attack: 8, speed: 13, defense: 80,
        color: '#4fc3f7', badge: '❄',
    },
    {
        id: 'saki',
        name: 'ギャルクラッシャー サキ',
        desc: '攻撃特化。ブチ壊し系最強ギャル解体師。',
        attack: 20, speed: 7, defense: 100,
        color: '#f06292', badge: '💥',
    },
];

class Game {
    constructor() {
        this.init();
    }

    init() {
        // --- 一回限りの初期化 ---
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 画像の読み込み
        this.topImage = new Image();
        this.topImage.src = 'TOP.webp';
        this.yasuImage = new Image();
        this.yasuImage.src = 'chara_1_icon.webp';
        this.oyakataImage = new Image();
        this.oyakataImage.src = 'chara_2_icon.webp';

        // ステージ背景画像の読み込み
        this.stageBgImages = {
            [STAGE_ID.IKEBUKURO]: new Image(),
            [STAGE_ID.SHIBUYA]: new Image(),
            [STAGE_ID.SHINJUKU]: new Image()
        };
        this.stageBgImages[STAGE_ID.IKEBUKURO].src = 'ikebukuro.webp';
        this.stageBgImages[STAGE_ID.SHIBUYA].src = 'shibuya.webp';
        this.stageBgImages[STAGE_ID.SHINJUKU].src = 'shinjuku.webp';

        // BGMの設定
        this.bgm = new Audio('BURNING ADRENALINE.mp3');
        this.bgm.loop = true;
        this.bgm.volume = 0.5;
        this.bgm.autoplay = false;

        // 音声コンテキスト保持用
        this.audioCtx = null;
        this.hitSEBuffer = null;
        this.winSEBuffer = null;
        this.loseSEBuffer = null;
        this.laserSEBuffer = null;
        this.paddleStretchSEBuffer = null;
        this.levelupSEBuffer = null;

        // キャラクター選択インデックス
        this.selectedCharIndex = 0;

        // リスナー登録
        this.setupStartListener();
        
        // プレイヤー初期化とロード
        this.player = new Player();
        this.player.load();
        
        // ゲーム変数リセット
        this.resetGameStatus();
        
        // ループ開始
        this.lastTime = 0;
        this.loop(0);
    }

    // ゲーム変数（ステータス）の初期化
    resetGameStatus() {
        this.player.resetLevelAndStats();
        this.paddle = new Paddle(this.player.defense);
        this.ball = new Ball(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 50, BALL_INITIAL_SPEED, -BALL_INITIAL_SPEED);
        this.levelManager = new LevelManager();
        this.effectManager = new EffectManager();
        this.items = [];
        
        this.score = 0;
        this.lives = 3;
        this.destroyedBricksCount = 0;
        this.clearBonus = 5000;
        this.bonusAdded = false;
        this.gameOver = false;
        this.gameWin = false;
        this.gameStarted = false;
        this.gameState = GAME_STATE.TITLE;
        this.entranceEndTime = 0;
        this.combo = 0;
        this.lastCombo = 0;
        this.baseDamage = 10;
        this.isFadingOut = false;
        this.speedMultiplier = 1.0;
        this.specialGauge = 0;
        this.lastSETime = 0;
        this.lastLaserTime = 0;
        this.levelingUp = false;
        this.selectedStat = null;
        this.paused = false;

        this.tutorialState = 0;
        this.hasShownIntro = false;
        this.hasShownRespawn = false;
        this.hasShownIssue = false;
        this.tutorialTargetBrick = null;

        // アクティブエフェクト管理（時限式バフ）
        this.activeEffects = {
            powerChip: 0,
            magnetBoot: 0,
            speedWire: 0,
            comboShield: 0,
        };
        this.nanoShieldActive = false;
        this.comboShieldActive = false;

        // WARNINGエフェクト
        this.warningStartTime = 0;
        this.warningActive = false;
        this.warningShown = false;
        this.warningDuration = 1000;
        this.isBossIntro = false;
    }

    setupStartListener() {
        const handleCanvasInput = (clientX, clientY) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = CANVAS_WIDTH / rect.width;
            const scaleY = CANVAS_HEIGHT / rect.height;

            const canvasX = (clientX - rect.left) * scaleX;
            const canvasY = (clientY - rect.top) * scaleY;

            if (this.gameState === GAME_STATE.TITLE) {
                // タイトルの「Game Start」ボタン判定
                const btnX = CANVAS_WIDTH / 2 - 100;
                const btnY = CANVAS_HEIGHT - 150;
                if (canvasX > btnX && canvasX < btnX + 200 && canvasY > btnY && canvasY < btnY + 60) {
                    this.initAudio(); // 最初の操作でオーディオ初期化
                    this.gameState = GAME_STATE.CHAR_SELECT;
                }
            } else if (this.gameState === GAME_STATE.CHAR_SELECT) {
                // 選択ボタン (中央下)
                const btnX = CANVAS_WIDTH / 2 - 120;
                const btnY = CANVAS_HEIGHT / 2 + 155;
                if (canvasX > btnX && canvasX < btnX + 240 && canvasY > btnY && canvasY < btnY + 60) {
                    const chara = CHARACTERS[this.selectedCharIndex];
                    this.player.attack = chara.attack;
                    this.player.speed = chara.speed;
                    this.player.defense = chara.defense;
                    this.gameState = GAME_STATE.STAGE_SELECT;
                }
                // 左矢印
                if (canvasX > 20 && canvasX < 70 && canvasY > CANVAS_HEIGHT / 2 - 40 && canvasY < CANVAS_HEIGHT / 2 + 40) {
                    this.selectedCharIndex = (this.selectedCharIndex - 1 + CHARACTERS.length) % CHARACTERS.length;
                }
                // 右矢印
                if (canvasX > CANVAS_WIDTH - 70 && canvasX < CANVAS_WIDTH - 20 && canvasY > CANVAS_HEIGHT / 2 - 40 && canvasY < CANVAS_HEIGHT / 2 + 40) {
                    this.selectedCharIndex = (this.selectedCharIndex + 1) % CHARACTERS.length;
                }
                
                // プロショップボタン (右上へ移動)
                const shopBtnW = 140, shopBtnH = 40;
                const shopBtnX = CANVAS_WIDTH - shopBtnW - 15;
                const shopBtnY = 15;
                if (canvasX > shopBtnX && canvasX < shopBtnX + shopBtnW && canvasY > shopBtnY && canvasY < shopBtnY + shopBtnH) {
                    this.gameState = GAME_STATE.SHOP;
                }
            } else if (this.gameState === GAME_STATE.SHOP) {
                this.handleShopTouch(canvasX, canvasY);
            } else if (this.gameState === GAME_STATE.STAGE_SELECT) {
                const btnX = 50;
                const s1Y = 150;
                const s2Y = 250;
                const btnW = 350, btnH = 80;
                if (canvasX > btnX && canvasX < btnX + btnW && canvasY > s1Y && canvasY < s1Y + btnH) {
                    this.startGame(STAGE_ID.IKEBUKURO);
                }
                if (canvasX > btnX && canvasX < btnX + btnW && canvasY > s2Y && canvasY < s2Y + btnH) {
                    this.startGame(STAGE_ID.SHIBUYA);
                }
                const s3Y = 350;
                // クリック判定を少し広くする (450まで許容)
                if (canvasX > btnX - 50 && canvasX < btnX + btnW + 50 && canvasY > s3Y && canvasY < s3Y + btnH) {
                    this.startGame(STAGE_ID.SHINJUKU);
                }
                // 戻るボタン
                const backW = 140, backH = 45;
                const backX = CANVAS_WIDTH / 2 - backW / 2;
                const backY = CANVAS_HEIGHT - 70;
                if (canvasX > backX && canvasX < backX + backW && canvasY > backY && canvasY < backY + backH) {
                    this.gameState = GAME_STATE.CHAR_SELECT;
                }
            } else if (this.gameState === GAME_STATE.PLAYING) {
                if (this.paused) {
                    this.handlePauseTouch(canvasX, canvasY);
                    return;
                }
                if (this.levelingUp) {
                    this.handleLevelUpTouch(canvasX, canvasY);
                    return;
                }
                if (this.tutorialState > 0) {
                    if (this.tutorialState === 1.1) this.tutorialState = 1.2;
                    else if (this.tutorialState === 1.2) this.tutorialState = 0;
                    else if (this.tutorialState === 2.1) this.tutorialState = 0;
                    else if (this.tutorialState === 3.1) this.tutorialState = 3.2;
                    else if (this.tutorialState === 3.2) this.tutorialState = 0;
                    else this.tutorialState = 0;
                    return;
                }

                if (this.gameOver || this.gameWin) {
                    const btnW = 200, btnH = 50, cx = CANVAS_WIDTH / 2;
                    const restartY = CANVAS_HEIGHT / 2 + 130;
                    const titleY = CANVAS_HEIGHT / 2 + 190;
                    if (canvasX > cx - 100 && canvasX < cx + 100 && canvasY > restartY && canvasY < restartY + btnH) {
                        this.restartCurrentStage();
                    }
                    if (canvasX > cx - 100 && canvasX < cx + 100 && canvasY > titleY && canvasY < titleY + btnH) {
                        this.backToTitle();
                    }
                    return;
                }

                if (!this.gameOver && !this.gameWin) {
                    // 入場フラッシュ中ならタップでスキップ
                    if (Date.now() < this.entranceEndTime) {
                        this.entranceEndTime = 0;
                        return;
                    }
                    if (canvasX > CANVAS_WIDTH - 50 && canvasY < 40) {
                        this.paused = true;
                    } else if (canvasX < 155 && canvasY > CANVAS_HEIGHT - 65) {
                        this.fireLaser();
                    }
                }
            }
        };
        
        this.canvas.addEventListener('click', (e) => {
            handleCanvasInput(e.clientX, e.clientY);
        });

        this.canvas.addEventListener('touchstart', (e) => {
            for (const touch of e.changedTouches) {
                handleCanvasInput(touch.clientX, touch.clientY);
            }
            const firstTouch = e.changedTouches[0];
            if (firstTouch) {
                const rect = this.canvas.getBoundingClientRect();
                const scaleY = CANVAS_HEIGHT / rect.height;
                const canvasY = (firstTouch.clientY - rect.top) * scaleY;
                if (canvasY < CANVAS_HEIGHT - 100) {
                    e.preventDefault();
                }
            }
        }, { passive: false });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.gameStarted && !this.gameOver && !this.gameWin && !this.paused) {
                this.fireLaser();
            }
            if (e.code === 'Escape' && this.gameStarted && !this.gameOver && !this.gameWin && !this.levelingUp) {
                if (this.tutorialState > 0) {
                    this.tutorialState = 0;
                } else {
                    this.paused = !this.paused;
                }
            }
        });
    }

    restartCurrentStage() {
        const currentStageId = this.levelManager.currentStageId || STAGE_ID.IKEBUKURO;
        this.stopBGM();
        this.resetGameStatus();
        this.startGame(currentStageId);
    }

    backToTitle() {
        this.stopBGM();
        this.resetGameStatus();
        this.gameState = GAME_STATE.TITLE;
    }

    initAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

            // マスターGainノード: 一箇所でボリューム制御
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.gain.value = 1.0;
            this.masterGain.connect(this.audioCtx.destination);

            // 同時再生数管理
            this._activeSECount = 0;
            this._maxSE = 8; // 同時に鳴らせるSEの最大数

            const loadSE = (path) => fetch(path)
                .then(r => r.arrayBuffer())
                .then(buf => this.audioCtx.decodeAudioData(buf));
            loadSE('soundeffect/robot_hit.mp3').then(b => { this.hitSEBuffer = b; }).catch(e => console.error('Hit SE load failed:', e));
            loadSE('soundeffect/winse.mp3').then(b => { this.winSEBuffer = b; }).catch(e => console.error('Win SE load failed:', e));
            loadSE('soundeffect/losese.mp3').then(b => { this.loseSEBuffer = b; }).catch(e => console.error('Lose SE load failed:', e));
            loadSE('soundeffect/laser.mp3').then(b => { this.laserSEBuffer = b; }).catch(e => console.error('Laser SE load failed:', e));
            loadSE('soundeffect/padolstrech.mp3').then(b => { this.paddleStretchSEBuffer = b; }).catch(e => console.error('Paddle SE load failed:', e));
            loadSE('soundeffect/levelup.mp3').then(b => { this.levelupSEBuffer = b; }).catch(e => console.error('LevelUp SE load failed:', e));
        }
        // suspended状態（ブラウザの自動再生ポリシー）から確実に復帰する
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    startGame(stageId = STAGE_ID.IKEBUKURO) {
        if (stageId === STAGE_ID.SHIBUYA) {
            this.player.resetLevelAndStats();
            this.paddle.width = this.player.defense;
            this.paddle.speed = this.player.speed;
        }
        if (stageId !== STAGE_ID.IKEBUKURO) {
            this.hasShownIntro = true;
            this.hasShownRespawn = true;
            this.hasShownIssue = true;
        } else {
            this.hasShownIntro = false;
            this.hasShownRespawn = false;
            this.hasShownIssue = false;
        }
        this.levelManager.init(stageId);
        this.gameState = GAME_STATE.PLAYING;
        this.gameStarted = true;
        this.isBossIntro = false;
        this.entranceEndTime = Date.now() + 3500; // 全ステージ共通
        this.bgm.play().catch(e => console.error("Audio playback failed:", e));
    }

    showTutorial(step, brick = null) {
        this.tutorialState = step;
        this.tutorialTargetBrick = brick;
    }

    stopBGM() {
        if (this.bgm) {
            this.bgm.pause();
            this.bgm.currentTime = 0;
        }
    }

    update(deltaTime) {
        // WARNINGエフェクト終了チェック (ガードの外に出しておくことでデッドロックを回避)
        if (this.warningActive && Date.now() - this.warningStartTime > this.warningDuration) {
            this.warningActive = false;
        }

        if (!this.gameStarted || this.gameOver || this.gameWin || this.paused || this.warningActive || Date.now() < this.entranceEndTime) return;
        
        // チュートリアル初回表示
        if (!this.hasShownIntro) {
            this.hasShownIntro = true;
            this.showTutorial(1.1);
        }
        
        if (this.tutorialState > 0) return; // チュートリアル中は停止
        if (this.levelingUp || this.paused) return; // レベルアップ・ポーズ中は停止

        this.paddle.width = this.player.defense;
        this.paddle.speed = this.player.speed;
        this.paddle.update();
        this.ball.update();
        this.effectManager.update();
        // 毎フレーム火の粉を発生させる
        this.effectManager.createFireParticle(this.ball.x, this.ball.y);

        this.levelManager.update(deltaTime, 
            (brick) => {
                if (!this.hasShownRespawn) {
                    this.hasShownRespawn = true;
                    this.showTutorial(2.1, brick);
                }
                // 復活エフェクトの生成
                this.effectManager.createSpawnEffect(brick.x + brick.width / 2, brick.y + brick.height / 2);
            },
            (brick) => {
                // コアブロック出現: WARNINGエフェクトを無効化中
                /*
                if (!this.warningShown) {
                    this.warningShown = true;
                    this.warningActive = true;
                    this.warningStartTime = Date.now();
                }
                */
                if (!this.hasShownIssue) {
                    this.hasShownIssue = true;
                    setTimeout(() => { this.showTutorial(3.1, brick); }, this.warningDuration);
                }
                // 復活（ボスターゲット化）エフェクトの生成
                this.effectManager.createSpawnEffect(brick.x + brick.width / 2, brick.y + brick.height / 2);
            }
        );

        /* 
        // WARNINGエフェクト終了チェック (上部に移動済み)
        if (this.warningActive && Date.now() - this.warningStartTime > this.warningDuration) {
            this.warningActive = false;
        }
        */
        
        // アクティブエフェクトタイマー管理
        for (const key of Object.keys(this.activeEffects)) {
            if (this.activeEffects[key] > 0) {
                this.activeEffects[key] = Math.max(0, this.activeEffects[key] - deltaTime);
                if (this.activeEffects[key] === 0 && key === 'speedWire') {
                    const spd = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
                    if (spd > 0) { const r = (spd / 1.2) / spd; this.ball.dx *= r; this.ball.dy *= r; }
                }
            }
        }
        this.comboShieldActive = this.activeEffects.comboShield > 0;

        // コンボとプレイヤー攻撃力に応じたダメージ計算
        const attackMult = this.activeEffects.powerChip > 0 ? 2 : 1;
        const currentDamage = Math.floor(this.player.getTotalAttack(EQUIPMENT_DATA) * attackMult * Math.pow(1.5, Math.max(0, this.combo)));

        // ブロックとの衝突判定
        const collisionResult = this.levelManager.checkCollision(this.ball, currentDamage);
        if (collisionResult.hit) {
            this.combo++;
            this.lastCombo = this.combo; // コンボが続く限り更新
            this.score += collisionResult.damage; // スコアをダメージ量と同じにする
            
            // ダメージテキストの生成（数字のみ、コンボ数に応じてサイズ変更）
            this.effectManager.createDamageText(
                collisionResult.brick.x + collisionResult.brick.width / 2, 
                collisionResult.brick.y, 
                `-${collisionResult.damage}`, 
                this.combo
            );

            // 効果音の再生
            this.playHitSE();

            // スピードアップ
            this.increaseBallSpeed(0.02); // 1ヒットにつき2%アップ

            // ゲージチャージ
            this.specialGauge = Math.min(SPECIAL_GAUGE_MAX, this.specialGauge + GAUGE_CHARGE_PER_HIT);

            // 火花エフェクト（全てのヒットで発生）
            this.effectManager.createExplosion(
                collisionResult.brick.x + collisionResult.brick.width / 2, 
                collisionResult.brick.y + collisionResult.brick.height / 2
            );

            // 破壊された時のみの処理
            if (collisionResult.destroyed) {
                this.destroyedBricksCount++; // 破壊数をカウント
                
                // 通常の爆発エフェクトに戻す (フリーズ回避のため)
                this.effectManager.createExplosion(
                    collisionResult.brick.x + collisionResult.brick.width / 2, 
                    collisionResult.brick.y + collisionResult.brick.height / 2,
                    20
                );

                // EXP獲得
                const leveledUp = this.player.addExp(10);
                if (leveledUp) {
                    this.onLevelUp();
                }

                // アイテム確率ドロップ（重み付きランダム）
                if (Math.random() < MONEY_DROP_RATE) {
                    const itemType = getRandomItemType();
                    const bx = collisionResult.brick.x + collisionResult.brick.width / 2;
                    const by = collisionResult.brick.y + collisionResult.brick.height / 2;
                    this.items.push(new Item(bx, by, itemType));
                }
            }
            
            if (this.levelManager.areAllBricksCleared() && !this.gameWin) {
                this.gameWin = true;
                if (!this.bonusAdded) {
                    this.player.money += this.clearBonus;
                    this.bonusAdded = true;
                    this.player.save(); // クリアボーナス獲得後にセーブ
                }
                this.playWebAudioSE(this.winSEBuffer, 0.5);
                this.stopBGM();
            }
        }

        // アイテムの更新と取得
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.update(this.paddle);

            // 全アイテム共通の磁石拾い判定
            if (item.state === 'NORMAL') {
                const paddleCenterX = this.paddle.x + this.paddle.width / 2;
                const itemCenterX = item.x + item.width / 2;
                const magnetR = MAGNET_RADIUS * (this.activeEffects.magnetBoot > 0 ? 2 : 1);
                if (item.y + item.height > this.paddle.y - magnetR && 
                    Math.abs(itemCenterX - paddleCenterX) < (this.paddle.width / 2) + magnetR) {
                    item.startSuction();
                }
            }
            
            // 実際の取得判定（パドル領域内）
            if (item.active && 
                item.x + item.width/2 > this.paddle.x &&
                item.x + item.width/2 < this.paddle.x + this.paddle.width &&
                item.y + item.height > this.paddle.y &&
                item.y + item.height/2 < this.paddle.y + this.paddle.height) {
                
                this._applyItemEffect(item);
                item.active = false;
            }
            
            if (!item.active) {
                this.items.splice(i, 1);
            }
        }

        // パドルの衝突判定...
        if (this.ball.y + this.ball.radius > this.paddle.y &&
            this.ball.x > this.paddle.x &&
            this.ball.x < this.paddle.x + this.paddle.width) {
            
            // ヒット位置に応じた跳ね返り角度の計算
            const paddleCenter = this.paddle.x + this.paddle.width / 2;
            const relativeHitX = this.ball.x - paddleCenter;
            const normalizedHitX = relativeHitX / (this.paddle.width / 2);
            
            // dxを調整（中心に近いほど垂直に、端に近いほど横に跳ね返る）
            this.ball.dx = normalizedHitX * BALL_INITIAL_SPEED * 1.5 * this.speedMultiplier;
            this.ball.dy = -Math.abs(this.ball.dy);
            
            // スピードアップ（パドルヒット時も少しアップ）
            this.increaseBallSpeed(0.01);

            // ゲージチャージ（パドルヒット時もアップ）
            this.specialGauge = Math.min(SPECIAL_GAUGE_MAX, this.specialGauge + GAUGE_CHARGE_PER_HIT);

            // ボールが下に行き過ぎないように調整
            this.ball.y = this.paddle.y - this.ball.radius;
            
            // コンボシールドがなければコンボリセット
            if (!this.comboShieldActive) {
                this.combo = 0;
            }
        }

        // ミス（底に落ちた場合）
        if (this.ball.y + this.ball.radius > CANVAS_HEIGHT) {
            if (this.nanoShieldActive) {
                // ナノシールド発動: ミス無効化
                this.nanoShieldActive = false;
                this.speedMultiplier = 1.0;
                this.ball.x = CANVAS_WIDTH / 2;
                this.ball.y = CANVAS_HEIGHT - 50;
                this.ball.dx = BALL_INITIAL_SPEED;
                this.ball.dy = -BALL_INITIAL_SPEED;
                this.paddle.x = (CANVAS_WIDTH - this.paddle.width) / 2;
                this.effectManager.createExplosion(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 30);
            } else {
                this.lives--;
                this.combo = 0;
                if (this.lives <= 0 && !this.gameOver) {
                    this.gameOver = true;
                    this.stopBGM();
                    this.playWebAudioSE(this.loseSEBuffer, 0.5);
                } else {
                    this.speedMultiplier = 1.0;
                    this.ball.x = CANVAS_WIDTH / 2;
                    this.ball.y = CANVAS_HEIGHT - 50;
                    this.ball.dx = BALL_INITIAL_SPEED;
                    this.ball.dy = -BALL_INITIAL_SPEED;
                    this.paddle.x = (CANVAS_WIDTH - this.paddle.width) / 2;
                }
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        if (this.gameState === GAME_STATE.TITLE) {
            this.drawTitleScreen();
        } else if (this.gameState === GAME_STATE.CHAR_SELECT) {
            this.drawCharSelectScreen();
        } else if (this.gameState === GAME_STATE.STAGE_SELECT) {
            this.drawStageSelectScreen();
        } else if (this.gameState === GAME_STATE.SHOP) {
            this.drawShopScreen();
        } else {
            // 背景（ベース）
            this.ctx.fillStyle = '#111';
            this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // ステージ背景画像
            const currentStageId = this.levelManager ? this.levelManager.currentStageId : null;
            if (currentStageId && this.stageBgImages[currentStageId] && this.stageBgImages[currentStageId].complete) {
                // 最背面に画像を描画
                this.ctx.drawImage(this.stageBgImages[currentStageId], 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                
                // ゲームプレイの視認性を確保するため、半透明の黒を重ねる
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
                this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            }

            // 8角形グリッドの描画（背面に敷き詰める）
            this.drawBackgroundGrid();

            // 必殺技ゲージ（パドルより先に描画して後支になるように）
            this.drawSpecialGauge();

            this.paddle.draw(this.ctx); // ゲージより前面
            this.ball.draw(this.ctx);
            this.levelManager.draw(this.ctx);
            this.effectManager.draw(this.ctx);
            for (let item of this.items) {
                item.draw(this.ctx);
            }

            // UI描画
            this.drawUI();
        }
    }

    drawBackgroundGrid() {
        const ctx = this.ctx;
        const size = 60; // マスのサイズ
        const offset = size * 0.25; // 8角形の角のカット量
        const color = 'rgba(0, 255, 255, 0.07)'; // 非常に薄いシアン（Gジェネタクティカル風）

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;

        for (let y = -size / 2; y < CANVAS_HEIGHT + size; y += size) {
            for (let x = -size / 2; x < CANVAS_WIDTH + size; x += size) {
                ctx.beginPath();
                ctx.moveTo(x + offset, y);
                ctx.lineTo(x + size - offset, y);
                ctx.lineTo(x + size, y + offset);
                ctx.lineTo(x + size, y + size - offset);
                ctx.lineTo(x + size - offset, y + size);
                ctx.lineTo(x + offset, y + size);
                ctx.lineTo(x, y + size - offset);
                ctx.lineTo(x, y + offset);
                ctx.closePath();
                ctx.stroke();

                // センターにドットを打つとよりタクティカル感が出る
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x + size / 2, y + size / 2, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    formatScore(score) {
        if (score >= 100000000) {
            const oku = Math.floor(score / 100000000);
            const man = Math.floor((score % 100000000) / 10000);
            const rest = score % 10000;
            let str = `${oku}億`;
            if (man > 0) str += `${man}万`;
            if (rest > 0) str += `${rest}点`;
            else str += `点`;
            return str;
        }
        if (score >= 10000) {
            const man = Math.floor(score / 10000);
            const rest = score % 10000;
            return rest > 0 ? `${man}万${rest}点` : `${man}万点`;
        }
        return `${score}点`;
    }

    drawUI() {
        // 1行目: Score（左）と Lives（右）
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 18px "Segoe UI"';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'alphabetic'; // 明示的にベースラインをリセット
        this.ctx.fillText(`Score: ${this.formatScore(this.score)}`, 15, 28);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Lives: ${this.lives}`, CANVAS_WIDTH - 55, 28); // ポーズボタン分左にずらす

        // ポーズボタン（右上）ゲームプレイ中のみ表示
        if (this.gameStarted && !this.gameOver && !this.gameWin) {
            const px = CANVAS_WIDTH - 44;
            const py = 8;
            this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
            this.ctx.beginPath();
            this.ctx.roundRect(px, py, 36, 26, 5);
            this.ctx.fill();
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 14px "Segoe UI"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('⏸', px + 18, py + 19);
        }

        // 2行目: LEVERAGE!（強化版エフェクト）
        const displayCombo = this.combo > 0 ? this.combo : this.lastCombo;
        if (displayCombo > 0 || this.tutorialState === 1.1 || this.tutorialState === 1.2) {
            this.drawLeverageEffect(displayCombo > 0 ? displayCombo : 1);
        }

        // 3行目: EXPバー（左 Lv表示 + ゲージ）
        if (this.gameStarted) {
            const barX = 15;
            const barY = 96;
            const barW = 160;
            const barH = 14; // 大きめ

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 15px "Segoe UI"'; // 大きめ
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`Exp`, barX, barY - 1);

            this.ctx.fillStyle = '#444';
            this.ctx.fillRect(barX + 30, barY - 12, barW, barH);

            this.ctx.fillStyle = '#76ff03';
            this.ctx.fillRect(barX + 30, barY - 12, barW * this.player.expRatio, barH);

            this.ctx.fillStyle = '#ccc';
            this.ctx.font = '13px "Segoe UI"'; // 大きめ
            this.ctx.fillText(`${this.player.exp}/${this.player.expToNextLevel}  Lv.${this.player.level}`, barX + 30 + barW + 4, barY);
        }

        // 必殺技ゲージは draw()内で描画済み（パドルの後本になるためここでは非募務）

        // アクティブアイテムバフインジケーター
        this.drawActiveEffectIndicators();

        // カウントダウン演出
        if (this.gameStarted && Date.now() < this.entranceEndTime) {
            this.drawCountdown();
            return;
        }

        /*
        // コアブロック出現WARNING
        if (this.warningActive) {
            this.drawBossWarning();
            return;
        }
        */

        // チュートリアル画面
        if (this.tutorialState > 0) {
            this.drawTutorialOverlay();
            return;
        }

        // ポーズ画面
        if (this.paused) {
            this.drawPauseScreen();
            return;
        }

        // レベルアップ選択画面
        if (this.levelingUp) {
            this.drawLevelUpScreen();
            return;
        }

        if (this.gameOver) {
            this.drawOverlay('GAME OVER', '#ff5252');
        } else if (this.gameWin) {
            this.drawResultScreen();
        }
    }


    drawLeverageEffect(combo) {
        const ctx = this.ctx;
        const cx = CANVAS_WIDTH / 2;
        const cy = 56;
        const now = Date.now();
        const label = combo >= 2 ? 'LEVERAGES!' : 'LEVERAGE!';
        const text = `${combo} ${label}`;
        let color;
        if (combo >= 11) { color = `hsl(${(now / 20) % 360},100%,60%)`; }
        else if (combo >= 6) { color = '#ff4444'; }
        else if (combo >= 3) { color = '#ff9800'; }
        else { color = '#ffeb3b'; }
        ctx.save();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `italic bold ${Math.min(32, 22 + combo * 1.5)}px "Segoe UI"`;
        if (combo >= 3) {
            const gs = 40 + combo * 8;
            const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, gs);
            rg.addColorStop(0, color + '44'); rg.addColorStop(1, 'transparent');
            ctx.fillStyle = rg;
            ctx.fillRect(cx - gs, cy - gs, gs * 2, gs * 2);
        }
        ctx.shadowColor = color;
        ctx.shadowBlur = Math.min(30, 8 + combo * 3); // 負荷軽減のため上限を下げる
        const sx = combo >= 3 ? (Math.random() - 0.5) * combo * 0.5 : 0;
        const sy = combo >= 3 ? (Math.random() - 0.5) * 2 : 0;
        ctx.fillStyle = color;
        ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3;
        ctx.strokeText(text, cx + sx, cy + sy);
        ctx.fillText(text, cx + sx, cy + sy);
        if (combo >= 6) {
            ctx.globalAlpha = 0.3; ctx.fillStyle = color;
            ctx.fillRect(cx - 150, cy - 20, 300, 2);
            ctx.fillRect(cx - 150, cy + 20, 300, 2);
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    }

    drawActiveEffectIndicators() {
        const ctx = this.ctx;
        const effects = [];
        if (this.activeEffects.powerChip > 0) effects.push({ label: '⚡ATK×2', color: '#ff9800', t: this.activeEffects.powerChip });
        if (this.activeEffects.magnetBoot > 0) effects.push({ label: '🧲MAG×2', color: '#ab47bc', t: this.activeEffects.magnetBoot });
        if (this.activeEffects.speedWire > 0) effects.push({ label: '🔵SPEED↑', color: '#4fc3f7', t: this.activeEffects.speedWire });
        if (this.activeEffects.comboShield > 0) effects.push({ label: '🔒COMBO', color: '#66bb6a', t: this.activeEffects.comboShield });
        if (this.nanoShieldActive) effects.push({ label: '🛡SHIELD', color: '#fff176', t: 1 });
        if (effects.length === 0) return;
        ctx.save();
        ctx.font = 'bold 11px "Segoe UI"';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        let x = 15, y = 120;
        for (const e of effects) {
            ctx.fillStyle = e.color + 'cc';
            ctx.fillRoundRect ? ctx.fillRoundRect(x, y - 8, 70, 16, 4) : ctx.fillRect(x, y - 8, 70, 16);
            ctx.fillStyle = '#000';
            ctx.fillText(e.label, x + 2, y);
            x += 74;
            if (x > CANVAS_WIDTH - 80) { x = 15; y += 20; }
        }
        ctx.restore();
    }

    _applyItemEffect(item) {
        const T = ITEM_TYPES;
        switch (item.type) {
            case T.MONEY:
                this.player.money += 100; this.player.save();
                this._playBeep(880, 1760, 0.1, 0.3); break;
            case T.EXPAND:
                this.paddle.width += 20;
                this.playWebAudioSE(this.paddleStretchSEBuffer, 0.7); break;
            case T.POWER_CHIP:
                this.activeEffects.powerChip = 15000;
                this._playBeep(523, 880, 0.2, 0.5); break;
            case T.NANO_SHIELD:
                this.nanoShieldActive = true;
                this._playBeep(440, 880, 0.2, 0.5); break;
            case T.MAGNET_BOOT:
                this.activeEffects.magnetBoot = 10000;
                this._playBeep(330, 660, 0.2, 0.5); break;
            case T.SPEED_WIRE:
                if (this.activeEffects.speedWire <= 0) this.increaseBallSpeed(0.2);
                this.activeEffects.speedWire = 8000;
                this._playBeep(660, 1320, 0.15, 0.5); break;
            case T.WIDE_PLATE:
                this.paddle.width += 40; this.player.defense += 40;
                this.playWebAudioSE(this.paddleStretchSEBuffer, 1.0); break;
            case T.BOMB: {
                const cnt = this.levelManager.bombDamageAll(20);
                this.effectManager.createExplosion(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 40);
                this.score += cnt * 20;
                this._playBeep(200, 100, 0.3, 0.8); break;
            }
            case T.GAUGE_PACK:
                this.specialGauge = Math.min(SPECIAL_GAUGE_MAX, this.specialGauge + 50);
                this._playBeep(880, 1760, 0.15, 0.4); break;
            case T.REPAIR_KIT:
                if (this.lives < 5) { this.lives++; this._playBeep(523, 1047, 0.2, 0.5); } break;
            case T.COMBO_STONE:
                this.activeEffects.comboShield = 10000;
                this._playBeep(600, 1200, 0.2, 0.5); break;
            case T.EXP_BOOSTER: {
                const lv = this.player.addExp(50);
                if (lv) this.onLevelUp();
                this._playBeep(440, 1760, 0.2, 0.6); break;
            }
        }
    }

    _playBeep(freqStart, freqEnd, duration, volume) {
        if (!this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') { this.audioCtx.resume(); return; }
        if ((this._activeSECount || 0) >= (this._maxSE || 8)) return;
        this._activeSECount = (this._activeSECount || 0) + 1;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqStart, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), this.audioCtx.currentTime + duration);
        gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.masterGain || this.audioCtx.destination);
        osc.onended = () => {
            gain.disconnect();
            osc.disconnect();
            this._activeSECount = Math.max(0, (this._activeSECount || 1) - 1);
        };
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration + 0.01);
    }

    drawCountdown() {
        const ctx = this.ctx;
        const now = Date.now();
        const remaining = this.entranceEndTime - now;

        // 暗いオーバーレイ
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // デジタルグリッド背景
        ctx.strokeStyle = 'rgba(0,200,255,0.06)';
        ctx.lineWidth = 1;
        for (let x = 0; x < CANVAS_WIDTH; x += 30) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
        }
        for (let y = 0; y < CANVAS_HEIGHT; y += 30) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
        }

        let text = '';
        let color = '#fff';
        let localProgress = 0;

        if (remaining > 2500) {
            text = '3'; color = '#ffeb3b';
            localProgress = Math.min(1, (3500 - remaining) / 1000);
        } else if (remaining > 1500) {
            text = '2'; color = '#ff9800';
            localProgress = Math.min(1, (2500 - remaining) / 1000);
        } else if (remaining > 500) {
            text = '1'; color = '#f44336';
            localProgress = Math.min(1, (1500 - remaining) / 1000);
        } else {
            text = 'START!'; color = '#ffffff';
            localProgress = Math.min(1, (500 - remaining) / 500);
        }

        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;

        if (text) {
            // 衝撃波リング
            if (localProgress < 0.5 && text !== 'START!') {
                const ringP = localProgress / 0.5;
                const ringR = ringP * 180;
                ctx.save();
                ctx.globalAlpha = (1 - ringP) * 0.6;
                ctx.strokeStyle = color;
                ctx.lineWidth = 4 * (1 - ringP) + 1;
                ctx.shadowColor = color; ctx.shadowBlur = 20;
                ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
            }

            // START!の全画面フラッシュ
            if (text === 'START!' && localProgress < 0.3) {
                ctx.save();
                ctx.globalAlpha = (0.3 - localProgress) / 0.3 * 0.8;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                ctx.restore();
            }

            ctx.save();
            ctx.translate(cx, cy);
            const scale = text === 'START!' ? 1 + localProgress * 0.5 : 0.3 + localProgress * 1.2;
            const alpha = text === 'START!' ? Math.max(0, 1 - localProgress * 1.5) : Math.max(0, 1 - localProgress * 0.4);
            ctx.globalAlpha = alpha;
            ctx.scale(scale, scale);
            ctx.shadowColor = color; ctx.shadowBlur = 40;
            ctx.fillStyle = color;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = text === 'START!' ? 2 : 4;
            ctx.font = `italic bold ${text === 'START!' ? 70 : 120}px "Segoe UI"`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.strokeText(text, 0, 0);
            ctx.fillText(text, 0, 0);
            // 残像エコー
            if (text !== 'START!' && localProgress > 0.3) {
                ctx.globalAlpha = alpha * 0.2;
                ctx.scale(1.15, 1.15);
                ctx.fillText(text, 0, 0);
            }
            ctx.restore();
        }
    }

    drawBossWarning() {
        const ctx = this.ctx;
        const now = Date.now();
        const elapsedMs = this.warningActive
            ? (now - this.warningStartTime)
            : (1000 - Math.max(0, this.entranceEndTime - now));
        const totalDuration = this.warningDuration || 1000;
        const progress = Math.min(1, elapsedMs / totalDuration);
        
        ctx.save();
        
        // 背景: 黒
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 1. ハニカム背景
        this.drawHoneycomb(progress);

        // 2. デジタルノイズ/グリッチ背景
        if (Math.random() > 0.8) {
            this.drawDigitalGlitch();
        }

        // 3. 上下の警告帯
        this.drawWarningBands(progress);

        // 4. 中央のWARNING文字
        this.drawWarningMainText(progress);

        ctx.restore();
    }

    drawHoneycomb(progress) {
        const ctx = this.ctx;
        const size = 30;
        const hexWidth = size * Math.sqrt(3);
        const hexHeight = size * 2;
        const rows = Math.ceil(CANVAS_HEIGHT / (hexHeight * 0.75)) + 1;
        const cols = Math.ceil(CANVAS_WIDTH / hexWidth) + 1;

        ctx.strokeStyle = 'rgba(255, 0, 0, 0.15)';
        ctx.lineWidth = 1;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let x = c * hexWidth;
                let y = r * hexHeight * 0.75;
                if (r % 2 === 1) x += hexWidth / 2;

                // 少し動かす
                y += (progress * 50) % (hexHeight * 0.75);

                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i + (Math.PI / 6);
                    const px = x + size * Math.cos(angle);
                    const py = y + size * Math.sin(angle);
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();
            }
        }
    }

    drawDigitalGlitch() {
        const ctx = this.ctx;
        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)';
            const x = Math.random() * CANVAS_WIDTH;
            const y = Math.random() * CANVAS_HEIGHT;
            const w = Math.random() * 100 + 50;
            const h = Math.random() * 5 + 1;
            ctx.fillRect(x, y, w, h);
        }
    }

    drawWarningBands(progress) {
        const ctx = this.ctx;
        const bandH = 40;
        const offset = (progress * 500) % 200; // 5000ms / 10 = 500

        // 上下の帯
        [0, CANVAS_HEIGHT - bandH].forEach((y, idx) => {
            ctx.fillStyle = '#f00';
            ctx.fillRect(0, y, CANVAS_WIDTH, bandH);

            ctx.fillStyle = '#000';
            ctx.font = 'bold 20px "Segoe UI"';
            ctx.textAlign = 'left';
            const text = "  WARNING  EMERGENCY  DANGER  ";
            for (let i = -1; i < 3; i++) {
                const tx = i * 400 + (idx === 0 ? -offset : offset);
                ctx.fillText(text, tx, y + 28);
            }
        });
    }

    drawWarningMainText(progress) {
        const ctx = this.ctx;
        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;

        // 点滅効果
        const flash = Math.floor(Date.now() / 200) % 2 === 0;
        if (!flash) return;

        ctx.save();
        ctx.translate(cx, cy);

        // グリッチ的なズレ
        const offX = (Math.random() - 0.5) * 4;
        const offY = (Math.random() - 0.5) * 4;

        // グロー効果
        ctx.shadowColor = '#f00';
        ctx.shadowBlur = 20;

        ctx.fillStyle = '#fff';
        ctx.font = 'italic bold 80px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillText('WARNING', offX, offY);

        // デジタルノイズ（文字に重ねる横線）
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        for (let i = 0; i < 3; i++) {
            const ly = (Math.random() - 0.5) * 80;
            ctx.fillRect(-200, ly, 400, 2);
        }

        ctx.restore();
    }

    // --------- レベルアップ処理 ---------
    onLevelUp() {
        this.levelingUp = true;
        this.selectedStat = null;
        if (this.bgm && !this.bgm.paused) this.bgm.volume = 0.15;
        this.playWebAudioSE(this.levelupSEBuffer, 0.8);
    }

    drawPauseScreen() {
        const ctx = this.ctx;
        const cx = CANVAS_WIDTH / 2, cy = CANVAS_HEIGHT / 2;

        // 半透明オーバーレイ
        ctx.fillStyle = 'rgba(0,0,0,0.78)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // タイトル
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText('⏸ PAUSE', cx, cy - 160);

        // ステータスパネル
        const panelW = 280, panelH = 230;
        const panelX = cx - panelW / 2, panelY = cy - 145;
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 10);
        ctx.fill();

        const p = this.player;
        const rows = [
            { label: 'Lv', value: `${p.level}` },
            { label: 'Exp', value: `${p.exp} / ${p.expToNextLevel}` },
            { label: '攻撃力', value: `${p.attack}`, color: '#ff7043' },
            { label: 'スピード', value: `${p.speed}`, color: '#ffeb3b' },
            { label: '守備力  (パドル幅)', value: `${p.defense}`, color: '#4fc3f7' },
            { label: '資金', value: `¥${p.money}`, color: '#ffdf00' },
        ];
        rows.forEach((row, i) => {
            const ry = panelY + 35 + i * 33;
            ctx.fillStyle = '#aaa';
            ctx.font = '14px "Segoe UI"';
            ctx.textAlign = 'left';
            ctx.fillText(row.label, panelX + 20, ry);
            ctx.fillStyle = row.color || '#fff';
            ctx.font = 'bold 16px "Segoe UI"';
            ctx.textAlign = 'right';
            ctx.fillText(row.value, panelX + panelW - 20, ry);
        });

        // 再開ボタン
        const resumeY = panelY + panelH + 20;
        ctx.fillStyle = '#4caf50';
        ctx.beginPath();
        ctx.roundRect(cx - 90, resumeY, 180, 50, 8);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText('▶ 再開', cx, resumeY + 33);
    }

    handlePauseTouch(canvasX, canvasY) {
        const cy = CANVAS_HEIGHT / 2;
        const panelH = 200;
        const panelY = cy - 130;
        const resumeY = panelY + panelH + 20;
        const cx = CANVAS_WIDTH / 2;
        if (canvasX >= cx - 90 && canvasX <= cx + 90 &&
            canvasY >= resumeY && canvasY <= resumeY + 50) {
            this.paused = false;
        }
    }

    handleLevelUpTouch(canvasX, canvasY) {
        const cx = CANVAS_WIDTH / 2;
        const btnW = 200, btnH = 50;
        const startY = CANVAS_HEIGHT / 2 - 30;
        const gap = 65;

        // 各ステータスボタン
        const stats = ['attack', 'speed', 'defense'];
        stats.forEach((stat, i) => {
            const bx = cx - btnW / 2;
            const by = startY + i * gap;
            if (canvasX >= bx && canvasX <= bx + btnW &&
                canvasY >= by && canvasY <= by + btnH) {
                this.selectedStat = stat;
            }
        });

        // OKボタン（選択済みのときだけ有効）
        if (this.selectedStat) {
            const okX = cx - 80, okY = startY + 3 * gap;
            if (canvasX >= okX && canvasX <= okX + 160 &&
                canvasY >= okY && canvasY <= okY + 50) {
                this.player.upgrade(this.selectedStat);
                // speedはパドルに即反映
                this.paddle.speed = this.player.speed;
                // 守備はパドル幅に反映
                if (this.selectedStat === 'defense') {
                    const oldCenter = this.paddle.x + this.paddle.width / 2;
                    this.paddle.width = this.player.defense;
                    this.paddle.x = oldCenter - this.paddle.width / 2;
                }
                this.levelingUp = false;
                this.selectedStat = null;
                // BGM音量を戻す
                if (this.bgm && !this.bgm.paused) this.bgm.volume = 0.5;
            }
        }
    }

    drawLevelUpScreen() {
        const ctx = this.ctx;
        const cx = CANVAS_WIDTH / 2;
        // 半透明オーバーレイ
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // タイトル
        ctx.fillStyle = '#ffeb3b';
        ctx.font = 'bold 36px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText('LEVEL UP!', cx, CANVAS_HEIGHT / 2 - 120);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px "Segoe UI"';
        ctx.fillText(`→ Lv. ${this.player.level}`, cx, CANVAS_HEIGHT / 2 - 82);

        // ステータスボタン
        const btnW = 200, btnH = 50;
        const startY = CANVAS_HEIGHT / 2 - 30;
        const gap = 65;
        const options = [
            { stat: 'attack',  label: `⚔ 攻撃UP  (+5 ダメージ)` },
            { stat: 'speed',   label: `⚡ スピードUP (+1 速度)` },
            { stat: 'defense', label: `🛡 守備UP   (+18 パドル幅)` },
        ];
        options.forEach(({ stat, label }, i) => {
            const bx = cx - btnW / 2;
            const by = startY + i * gap;
            const selected = this.selectedStat === stat;
            ctx.fillStyle = selected ? '#ffeb3b' : '#333';
            ctx.strokeStyle = selected ? '#ffeb3b' : '#888';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(bx, by, btnW, btnH, 8);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = selected ? '#000' : '#fff';
            ctx.font = 'bold 15px "Segoe UI"';
            ctx.textAlign = 'center';
            ctx.fillText(label, cx, by + 32);
        });

        // OKボタン
        const okY = startY + 3 * gap;
        const okAlpha = this.selectedStat ? 1.0 : 0.4;
        ctx.globalAlpha = okAlpha;
        ctx.fillStyle = '#4caf50';
        ctx.beginPath();
        ctx.roundRect(cx - 80, okY, 160, 50, 8);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px "Segoe UI"';
        ctx.fillText('OK', cx, okY + 33);
        ctx.globalAlpha = 1.0;
    }

    drawOverlay(text, color) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        this.ctx.fillStyle = color;
        // フォントサイズを画面幅に合わせてスケール（スマホではみ出しを防止）
        const fontSize = Math.min(52, Math.floor(CANVAS_WIDTH / 8));
        this.ctx.font = `bold ${fontSize}px "Segoe UI"`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle'; // 中央に配置
        this.ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        
        // ボタンの描画
        if (this.gameOver || this.gameWin) {
            const btnW = 200, btnH = 50, cx = CANVAS_WIDTH / 2;
            const restartY = CANVAS_HEIGHT / 2 + 130;
            const titleY = CANVAS_HEIGHT / 2 + 190;
            
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            // Restart Button
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.roundRect(cx - 100, restartY, btnW, btnH, 10);
            this.ctx.fill();
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 20px "Segoe UI"';
            this.ctx.fillText('Tap to Restart', cx, restartY + 25);

            // Back to Title Button
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            this.ctx.beginPath();
            this.ctx.roundRect(cx - 100, titleY, btnW, btnH, 10);
            this.ctx.fill();
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText('Back to Title', cx, titleY + 25);
            
            this.ctx.textBaseline = 'alphabetic';
        }
    }

    drawSpecialGauge() {
        const width = 140;
        const height = 50;
        const x = 15; // 左側に配置
        const y = CANVAS_HEIGHT - height - 15;

        // ボタンの背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, width, height, 5);
        this.ctx.fill();
        this.ctx.stroke();
        
        // ゲージの中身（水平バー）
        const color = this.specialGauge >= SPECIAL_GAUGE_MAX ? '#00ffff' : '#ff5252';
        if (this.specialGauge > 0) {
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.roundRect(x + 2, y + 2, (width - 4) * (this.specialGauge / SPECIAL_GAUGE_MAX), height - 4, 3);
            this.ctx.fill();
        }

        // ラベル
        this.ctx.fillStyle = this.specialGauge >= SPECIAL_GAUGE_MAX ? '#ff5252' : '#fff'; // 見やすく色を変更
        this.ctx.font = 'bold 16px "Segoe UI"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.specialGauge >= SPECIAL_GAUGE_MAX ? 'FIRE!' : 'SPECIAL', x + width / 2, y + height / 2 + 6);

        if (this.specialGauge >= SPECIAL_GAUGE_MAX) {
            this.ctx.strokeStyle = `rgba(0, 255, 255, ${0.5 + Math.sin(Date.now() * 0.01) * 0.5})`;
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
        }
    }

    fireLaser() {
        if (this.specialGauge < SPECIAL_GAUGE_MAX) return;
        
        this.specialGauge = 0;
        const laserX = this.paddle.x + this.paddle.width / 2;
        const laserWidth = 30;

        // レーザーSE（音量大きめ）
        this.playWebAudioSE(this.laserSEBuffer, 3.0);

        // レーザーエフェクト
        this.effectManager.createLaser(laserX, laserWidth, this.paddle.y);
        
        // ヒット判定
        const hits = this.levelManager.checkLaserCollision(laserX, laserWidth, LASER_DAMAGE);
        
        hits.forEach(hit => {
            this.score += hit.damage;
            this.effectManager.createDamageText(
                hit.brick.x + hit.brick.width / 2,
                hit.brick.y,
                `-${hit.damage}`,
                0 // レーザーはコンボに影響しない
            );

            if (hit.destroyed) {
                this.effectManager.createExplosion(
                    hit.brick.x + hit.brick.width / 2, 
                    hit.brick.y + hit.brick.height / 2,
                    20
                );
            }
        });

        // クリア判定
        if (this.levelManager.areAllBricksCleared()) {
            this.gameWin = true;
            this.playWebAudioSE(this.winSEBuffer, 0.5);
            this.stopBGM();
        }
    }

    playWebAudioSE(buffer, volume = 0.6) {
        if (!this.audioCtx || !buffer) return;
        if (this.audioCtx.state === 'suspended') { this.audioCtx.resume(); return; }
        if ((this._activeSECount || 0) >= (this._maxSE || 8)) return; // 同時再生数制限
        this._activeSECount = (this._activeSECount || 0) + 1;
        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;
        const gain = this.audioCtx.createGain();
        gain.gain.value = volume;
        source.connect(gain);
        gain.connect(this.masterGain || this.audioCtx.destination);
        source.onended = () => {
            gain.disconnect();
            source.disconnect();
            this._activeSECount = Math.max(0, (this._activeSECount || 1) - 1);
        };
        source.start();
    }

    playHitSE() {
        const now = Date.now();
        if (now - this.lastSETime < 50) return; // 50ms以内の連打は無視
        this.lastSETime = now;
        if (!this.audioCtx || !this.hitSEBuffer) return;
        if (this.audioCtx.state === 'suspended') { this.audioCtx.resume(); return; }
        if ((this._activeSECount || 0) >= (this._maxSE || 8)) return;
        this._activeSECount = (this._activeSECount || 0) + 1;
        const source = this.audioCtx.createBufferSource();
        source.buffer = this.hitSEBuffer;
        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = 2.0; // さらに倍音量
        source.connect(gainNode);
        gainNode.connect(this.masterGain || this.audioCtx.destination);
        source.onended = () => {
            gainNode.disconnect();
            source.disconnect();
            this._activeSECount = Math.max(0, (this._activeSECount || 1) - 1);
        };
        source.start();
    }

    increaseBallSpeed(amount) {
        this.speedMultiplier += amount;
        // ベクトルの大きさを調整してスピードを上げる
        const currentSpeed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
        const newSpeed = currentSpeed * (1 + amount);
        
        // 念のため最大速度制限 (初期速度の3倍まで)
        const maxSpeed = BALL_INITIAL_SPEED * 3 * Math.sqrt(2); 
        if (newSpeed > maxSpeed) return;

        const ratio = newSpeed / currentSpeed;
        this.ball.dx *= ratio;
        this.ball.dy *= ratio;
    }

    stopBGM() {
        this.bgm.pause();
        this.bgm.volume = 0;
        this.bgm.currentTime = 0;
        this.isFadingOut = false;
    }

    fadeOutBGM() {
        if (this.isFadingOut) return;
        this.isFadingOut = true;
        
        const fadeInterval = setInterval(() => {
            if (this.bgm.volume > 0.05) {
                this.bgm.volume -= 0.1; // 減少量を増やして速める
            } else {
                this.bgm.volume = 0;
                this.bgm.pause();
                this.bgm.currentTime = 0;
                clearInterval(fadeInterval);
                this.isFadingOut = false;
            }
        }, 50); // インターバルを短くして（100ms→50ms）さらに速める

        // 念のため一定時間後に強制停止
        setTimeout(() => {
            if (this.bgm.paused === false) {
                this.bgm.pause();
                this.bgm.volume = 0;
                clearInterval(fadeInterval);
                this.isFadingOut = false;
            }
        }, 3000);
    }

    loop(timestamp) {
        const raw = timestamp - this.lastTime;
        this.lastTime = timestamp;
        // タブ切り替え後など極端なdeltaTimeを100msにクランプ
        const deltaTime = Math.min(raw, 100);

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    drawTutorialOverlay() {
        if (this.tutorialState === 0) return;

        // 半透明背景
        this.ctx.fillStyle = 'rgba(0,0,0,0.75)';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // ハイライト枠の描画設定
        this.ctx.strokeStyle = '#ffeb3b'; // 黄色
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([10, 5]);

        if (Math.floor(this.tutorialState) === 1) {
            // LEVERAGE
            this.ctx.strokeRect(CANVAS_WIDTH/2 - 100, 30, 200, 40);
            // EXP bar
            this.ctx.strokeRect(10, 80, 250, 35);
            // Special Gauge (左下)
            this.ctx.strokeRect(10, CANVAS_HEIGHT - 60, 140, 50);
        } else if (Math.floor(this.tutorialState) === 2 || Math.floor(this.tutorialState) === 3) {
            if (this.tutorialTargetBrick) {
                const b = this.tutorialTargetBrick;
                this.ctx.strokeRect(b.x - 5, b.y - 5, b.width + 10, b.height + 10);
            }
        }
        this.ctx.setLineDash([]);

        // セリフボックス (中央)
        const boxX = 20;
        const boxH = 180;
        const boxY = (CANVAS_HEIGHT - boxH) / 2;
        const boxW = CANVAS_WIDTH - 40;

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.beginPath();
        this.ctx.roundRect(boxX, boxY, boxW, boxH, 10);
        this.ctx.fill();

        // 親方アイコン (画像があれば画像、なければ絵文字)
        const iconSize = 110;
        const iconX = boxX + 60;
        const iconY = boxY - 80;
        
        // 白背景（フチ）
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(iconX, iconY + iconSize/2 - 5, iconSize/2 + 5, 0, Math.PI * 2);
        this.ctx.fill();
        
        if (this.oyakataImage && this.oyakataImage.complete && this.oyakataImage.naturalWidth > 0) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(iconX, iconY + iconSize/2 - 5, iconSize/2, 0, Math.PI * 2);
            this.ctx.clip();
            this.ctx.drawImage(this.oyakataImage, iconX - iconSize/2, iconY - 5, iconSize, iconSize);
            this.ctx.restore();
        } else {
            this.ctx.font = '70px "Segoe UI"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('👷', iconX, iconY + 30);
        }

        // セリフ描画
        this.ctx.fillStyle = '#111';
        this.ctx.font = 'bold 20px "Segoe UI"'; // テキストを大きく
        this.ctx.textAlign = 'left'; // 左寄せ
        
        let textLines = [];
        if (this.tutorialState === 1.1) {
            textLines = [
                "おう新人！",
                "機械はHPがゼロになれば壊れるぞ！",
                "連続で当て続ければ【LEVERAGE】が効いて",
                "ダメージが1.5倍ずつ倍増だ！"
            ];
        } else if (this.tutorialState === 1.2) {
            textLines = [
                "機械を壊せば【経験値】が貯まる。",
                "満タンになったら、下の【FIRE!】を",
                "タップして必殺技をブチかませ！"
            ];
        } else if (this.tutorialState === 2.1) {
            textLines = [
                "おっと、油断するなよ！",
                "この現場の機械は、壊しても",
                "時間が経てば【復活】しちまうぞ！",
                "早えとこカタをつけねぇとな！"
            ];
        } else if (this.tutorialState === 3.1) {
            textLines = [
                "出たな！あいつが今回のデカブツ…",
                "【コアマシン】だ！",
                "普通の攻撃じゃ1ダメージしか通らねぇし、",
                "必殺技も弾かれちまう！"
            ];
        } else if (this.tutorialState === 3.2) {
            textLines = [
                "だが、あれさえぶっ壊せば",
                "この現場は【クリア】だ！",
                "死ぬ気で狙え！"
            ];
        }

        const lineHeight = 30;
        const startY = boxY + 45;
        for (let i = 0; i < textLines.length; i++) {
            this.ctx.fillText(textLines[i], boxX + 25, startY + i * lineHeight);
        }
        
        // Next/Close indicator
        this.ctx.fillStyle = '#666';
        this.ctx.font = 'bold 14px "Segoe UI"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText("▼ タップして次へ ▼", boxX + boxW / 2, boxY + boxH - 15);
    }

    drawResultScreen() {
        const ctx = this.ctx;
        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;

        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // クリア！の文字
        ctx.fillStyle = '#ffeb3b';
        ctx.font = 'bold 48px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText('STAGE CLEAR!', cx, cy - 180);

        // パネル
        const panelW = 320;
        const panelH = 260;
        const panelX = cx - panelW / 2;
        const panelY = cy - 140;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 15);
        ctx.fill();

        // 項目
        const stats = [
            { label: 'SCORE', value: this.formatScore(this.score) },
            { label: 'MACHINES DESTROYED', value: this.destroyedBricksCount },
            { label: 'CLEAR BONUS', value: `¥${this.clearBonus.toLocaleString()}`, color: '#ffeb3b' },
            { label: 'TOTAL MONEY', value: `¥${this.player.money.toLocaleString()}`, color: '#ffdf00' }
        ];

        stats.forEach((stat, i) => {
            const sy = panelY + 60 + i * 50;
            ctx.fillStyle = '#aaa';
            ctx.font = 'bold 16px "Segoe UI"';
            ctx.textAlign = 'left';
            ctx.fillText(stat.label, panelX + 30, sy);

            ctx.fillStyle = stat.color || '#fff';
            ctx.font = 'bold 22px "Segoe UI"';
            ctx.textAlign = 'right';
            ctx.fillText(stat.value, panelX + panelW - 30, sy);
        });

        // ボタン1: Tap to Restart
        const buttonY = cy + 130;
        ctx.fillStyle = '#4caf50';
        ctx.beginPath();
        ctx.roundRect(cx - 100, buttonY, 200, 50, 10);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Tap to Restart', cx, buttonY + 25);

        // ボタン2: Back to Title
        const titleBtnY = cy + 190;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.roundRect(cx - 100, titleBtnY, 200, 50, 10);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText('Back to Title', cx, titleBtnY + 25);
        ctx.textBaseline = 'alphabetic'; // 元に戻す
    }

    drawTitleScreen() {
        const ctx = this.ctx;
        // 背景画像描写
        if (this.topImage.complete) {
            ctx.drawImage(this.topImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        // オーバーレイでタイトルを少し暗く
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // STARTボタン
        const btnW = 200, btnH = 60;
        const btnX = CANVAS_WIDTH / 2 - btnW / 2;
        const btnY = CANVAS_HEIGHT - 150;

        const grad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
        grad.addColorStop(0, '#ff9800');
        grad.addColorStop(1, '#e65100');

        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff9800';
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 30);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText('Game Start', CANVAS_WIDTH / 2, btnY + 38);
    }

    drawCharSelectScreen() {
        const ctx = this.ctx;
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // タイトル
        ctx.fillStyle = '#4fc3f7';
        ctx.font = 'bold 22px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText('CHARACTER SELECT', CANVAS_WIDTH / 2, 50);

        // 下線
        ctx.strokeStyle = '#4fc3f7';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(CANVAS_WIDTH / 2 - 120, 58); ctx.lineTo(CANVAS_WIDTH / 2 + 120, 58); ctx.stroke();

        const chara = CHARACTERS[this.selectedCharIndex];
        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2 - 20;

        // キャラカード背景
        ctx.save();
        ctx.fillStyle = chara.color + '22';
        ctx.strokeStyle = chara.color + 'aa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) { ctx.roundRect(cx - 110, cy - 100, 220, 200, 12); }
        else { ctx.rect(cx - 110, cy - 100, 220, 200); }
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // バッジ（大きなアイコン）
        ctx.font = '64px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(chara.badge, cx, cy - 30);

        // キャラ名
        ctx.fillStyle = chara.color;
        ctx.font = 'bold 18px "Segoe UI"';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(chara.name, cx, cy + 50, 200); // 枠に収まるようmaxWidth 200 指定

        // 説明（2行に分割表示対応）
        ctx.fillStyle = '#bbb';
        ctx.font = '12px "Segoe UI"';
        const descParts = chara.desc.split('。');
        if (descParts.length > 1 && descParts[1].trim() !== '') {
            ctx.fillText(descParts[0] + '。', cx, cy + 68, 200);
            ctx.fillText(descParts[1].trim(), cx, cy + 82, 200);
        } else {
            ctx.fillText(chara.desc, cx, cy + 72, 200);
        }

        // ステータスバー
        const barY = cy + 90;
        const statLabels = [['ATK', chara.attack, 20, '#ff6b6b'], ['SPD', chara.speed, 15, '#4fc3f7'], ['DEF', chara.defense / 5, 30, '#69f0ae']];
        ctx.textAlign = 'left';
        ctx.font = 'bold 11px "Segoe UI"';
        for (let i = 0; i < statLabels.length; i++) {
            const [label, val, maxVal, barColor] = statLabels[i];
            const bx = cx - 90;
            const by = barY + i * 20;
            ctx.fillStyle = '#888';
            ctx.fillText(label, bx, by + 9);
            ctx.fillStyle = '#333';
            ctx.fillRect(bx + 30, by, 120, 10);
            ctx.fillStyle = barColor;
            ctx.fillRect(bx + 30, by, Math.min(120, 120 * (val / maxVal)), 10);
        }

        // 左矢印ボタン
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath(); ctx.arc(35, cy, 28, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('◀', 35, cy);

        // 右矢印ボタン
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath(); ctx.arc(CANVAS_WIDTH - 35, cy, 28, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText('▶', CANVAS_WIDTH - 35, cy);

        // ドットインジケーター
        for (let i = 0; i < CHARACTERS.length; i++) {
            ctx.fillStyle = i === this.selectedCharIndex ? chara.color : '#444';
            ctx.beginPath(); ctx.arc(cx - (CHARACTERS.length - 1) * 8 + i * 16, cy + 165, 5, 0, Math.PI * 2); ctx.fill();
        }

        // 選択ボタン
        const btnX = cx - 120; const btnY = CANVAS_HEIGHT / 2 + 155;
        const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + 60);
        btnGrad.addColorStop(0, chara.color);
        btnGrad.addColorStop(1, chara.color + '99');
        ctx.fillStyle = btnGrad;
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(btnX, btnY, 240, 60, 12); ctx.fill(); }
        else { ctx.fillRect(btnX, btnY, 240, 60); }
        ctx.fillStyle = '#000';
        ctx.font = 'bold 20px "Segoe UI"';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('このキャラで出撃！', cx, btnY + 30);

        // Proショップボタン
        const shopBtnW = 140, shopBtnH = 40;
        const shopBtnX = CANVAS_WIDTH - shopBtnW - 15;
        const shopBtnY = 10;
        ctx.fillStyle = 'rgba(255, 200, 0, 0.15)';
        ctx.strokeStyle = '#ffca28';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) { ctx.roundRect(shopBtnX, shopBtnY, shopBtnW, shopBtnH, 6); }
        else { ctx.rect(shopBtnX, shopBtnY, shopBtnW, shopBtnH); }
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffca28';
        ctx.font = 'bold 15px "Segoe UI"';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🛠 Pro Shop', shopBtnX + shopBtnW / 2, shopBtnY + shopBtnH / 2);
    }


    drawShopScreen() {
        const ctx = this.ctx;
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText('プロショップ', CANVAS_WIDTH / 2, 60);

        ctx.fillStyle = '#ffdf00';
        ctx.font = 'bold 20px "Segoe UI"';
        ctx.textAlign = 'right';
        ctx.fillText(`所持金: ¥${this.player.money.toLocaleString()}`, CANVAS_WIDTH - 20, 100);

        // アイテムリスト
        EQUIPMENT_DATA.forEach((item, i) => {
            const itemY = 130 + i * 130;
            const itemX = 20;
            const itemW = CANVAS_WIDTH - 40;
            const itemH = 100;

            const isOwned = this.player.ownedEquipment.includes(item.id);
            const isEquipped = this.player.equippedId === item.id;

            ctx.fillStyle = isEquipped ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.05)';
            ctx.strokeStyle = isEquipped ? '#4caf50' : '#444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(itemX, itemY, itemW, itemH, 15);
            ctx.fill();
            ctx.stroke();

            // アイコン描画
            this.drawEquipmentIcon(item.id, itemX + 50, itemY + 50, item.color);

            // テキスト（ボタンと被らないようMaxWidthを設ける）
            ctx.textAlign = 'left';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 18px "Segoe UI"';
            ctx.fillText(item.name, itemX + 90, itemY + 35, 180);

            ctx.fillStyle = '#aaa';
            ctx.font = '12px "Segoe UI"';
            
            // 説明文を。で区切って2行にする
            const itemDescParts = item.description.split('。');
            if (itemDescParts.length > 1 && itemDescParts[1].trim() !== '') {
                ctx.fillText(itemDescParts[0] + '。', itemX + 90, itemY + 58, 190);
                ctx.fillText(itemDescParts[1].trim(), itemX + 90, itemY + 76, 190);
            } else {
                ctx.fillText(item.description, itemX + 90, itemY + 60, 190);
            }

            // 購入・装備ボタン
            const btnW = 100, btnH = 40;
            const btnX = itemX + itemW - 120, btnY = itemY + 30;
            
            if (isEquipped) {
                ctx.fillStyle = '#4caf50';
                ctx.beginPath();
                ctx.roundRect(btnX, btnY, btnW, btnH, 8);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 16px "Segoe UI"';
                ctx.textAlign = 'center';
                ctx.fillText('装備中', btnX + btnW/2, btnY + btnH/2 + 6);
            } else if (isOwned) {
                ctx.fillStyle = '#2196f3';
                ctx.beginPath();
                ctx.roundRect(btnX, btnY, btnW, btnH, 8);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 16px "Segoe UI"';
                ctx.textAlign = 'center';
                ctx.fillText('装備する', btnX + btnW/2, btnY + btnH/2 + 6);
            } else {
                const canBuy = this.player.money >= item.price;
                ctx.fillStyle = canBuy ? '#ff9800' : '#444';
                ctx.beginPath();
                ctx.roundRect(btnX, btnY, btnW, btnH, 8);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 16px "Segoe UI"';
                ctx.textAlign = 'center';
                ctx.fillText(`¥${item.price.toLocaleString()}`, btnX + btnW/2, btnY + btnH/2 + 6);
            }
        });

        // 戻るボタン
        const backW = 140, backH = 45;
        const backX = CANVAS_WIDTH / 2 - backW / 2;
        const backY = CANVAS_HEIGHT - 70;
        
        ctx.fillStyle = '#444';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(backX, backY, backW, backH, 10);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('戻る', CANVAS_WIDTH / 2, backY + backH / 2);
        ctx.textBaseline = 'alphabetic';
    }

    handleShopTouch(canvasX, canvasY) {
        // アイテムボタン判定
        EQUIPMENT_DATA.forEach((item, i) => {
            const itemY = 130 + i * 130;
            const btnX = CANVAS_WIDTH - 140, btnY = itemY + 30;
            const btnW = 100, btnH = 40;

            if (canvasX > btnX && canvasX < btnX + btnW && canvasY > btnY && canvasY < btnY + btnH) {
                const isOwned = this.player.ownedEquipment.includes(item.id);
                if (isOwned) {
                    this.player.equippedId = item.id;
                    this.player.save(); // 装備変更時にセーブ
                } else if (this.player.money >= item.price) {
                    this.player.money -= item.price;
                    this.player.ownedEquipment.push(item.id);
                    this.player.equippedId = item.id;
                    this.player.save(); // 購入時にセーブ
                    // 購入SEがあれば再生
                    if (this.audioCtx) {
                        const osc = this.audioCtx.createOscillator();
                        const gain = this.audioCtx.createGain();
                        osc.frequency.setValueAtTime(523.25, this.audioCtx.currentTime); // C5
                        osc.frequency.exponentialRampToValueAtTime(1046.5, this.audioCtx.currentTime + 0.1); // C6
                        gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.2);
                        osc.connect(gain);
                        gain.connect(this.audioCtx.destination);
                        osc.start();
                        osc.stop(this.audioCtx.currentTime + 0.2);
                    }
                }
            }
        });

        // 戻るボタン
        const backW = 140, backH = 45;
        const backX = CANVAS_WIDTH / 2 - backW / 2;
        const backY = CANVAS_HEIGHT - 70;
        if (canvasX > backX && canvasX < backX + backW && canvasY > backY && canvasY < backY + backH) {
            this.gameState = GAME_STATE.CHAR_SELECT;
        }
    }

    drawEquipmentIcon(id, x, y, color) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (id === 'crowbar') {
            // プラズマトーチ
            ctx.beginPath();
            ctx.fillStyle = '#333';
            ctx.roundRect(-5, -5, 10, 25, 2); // グリップ
            ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = '#666';
            ctx.roundRect(-8, -15, 16, 10, 2); // 射出口のベース
            ctx.fill();
            
            // プラズマの刃
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.moveTo(-4, -15);
            ctx.lineTo(0, -35);
            ctx.lineTo(4, -15);
            ctx.fill();
            ctx.shadowBlur = 0;
        } else if (id === 'hammer') {
            // 重力パイルバンカー
            ctx.beginPath();
            ctx.fillStyle = '#444';
            ctx.roundRect(-15, -5, 30, 20, 4); // ベースシリンダー
            ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = '#777';
            ctx.fillRect(-10, -15, 20, 10); // 上部メカ
            ctx.fill();
            
            // 杭（パイル）
            ctx.beginPath();
            ctx.fillStyle = '#aaa';
            ctx.moveTo(-4, 15);
            ctx.lineTo(0, 35);
            ctx.lineTo(4, 15);
            ctx.fill();
            
            // 重力リングのエフェクト
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.ellipse(0, 5, 20, 6, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (id === 'sabersaw') {
            // 高周波チェーンブレード
            ctx.beginPath();
            ctx.fillStyle = '#222';
            ctx.roundRect(-6, 10, 12, 15, 3); // 持ち手
            ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = '#555';
            ctx.roundRect(-12, 5, 24, 6, 2); // ガード
            ctx.fill();
            
            // ブレード部分
            ctx.beginPath();
            ctx.fillStyle = '#000';
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 15;
            ctx.shadowColor = color;
            ctx.roundRect(-8, -35, 16, 40, 3);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // 内部のギザギザ（高周波波形）
            ctx.beginPath();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.moveTo(-4, -30);
            ctx.lineTo(4, -25);
            ctx.lineTo(-4, -20);
            ctx.lineTo(4, -15);
            ctx.lineTo(-4, -10);
            ctx.lineTo(4, -5);
            ctx.lineTo(-4, 0);
            ctx.stroke();
        } else if (id === 'excavator') {
            // 解体メック『タイタン』 (シルエット風)
            ctx.beginPath();
            ctx.fillStyle = '#333';
            ctx.roundRect(-15, -15, 30, 25, 5); // 胴体
            ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = '#222';
            ctx.arc(0, -5, 8, 0, Math.PI, true); // コックピット（ガラス）
            ctx.fill();
            
            // メインアイ（光）
            ctx.fillStyle = color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.fillRect(-6, -8, 12, 3);
            ctx.shadowBlur = 0;
            
            // 腕（デカいアーム）
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.roundRect(-25, -10, 10, 30, 3); // 左腕
            ctx.roundRect(15, -10, 10, 30, 3); // 右腕
            ctx.fill();
            
            // 足
            ctx.fillStyle = '#444';
            ctx.beginPath();
            ctx.moveTo(-10, 10); ctx.lineTo(-15, 30); ctx.lineTo(-5, 30); ctx.lineTo(-5, 10);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(10, 10); ctx.lineTo(15, 30); ctx.lineTo(5, 30); ctx.lineTo(5, 10);
            ctx.fill();
        }
        ctx.restore();
    }

    drawStageSelectScreen() {
        const ctx = this.ctx;
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText('ステージ選択', CANVAS_WIDTH / 2, 80);

        // Stage 1: 池袋
        const s1X = 50, s1Y = 150, s1W = 350, s1H = 80;
        ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
        ctx.strokeStyle = '#4caf50';
        ctx.beginPath();
        ctx.roundRect(s1X, s1Y, s1W, s1H, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px "Segoe UI"';
        ctx.textAlign = 'left';
        ctx.fillText('Stage 1: 池袋', s1X + 20, s1Y + 35);
        ctx.font = '14px "Segoe UI"';
        ctx.fillStyle = '#aaa';
        ctx.fillText('難易度: ★☆☆☆☆', s1X + 20, s1Y + 60);

        // Stage 2: 渋谷
        const s2Y = 250;
        ctx.fillStyle = 'rgba(33, 150, 243, 0.2)';
        ctx.strokeStyle = '#2196f3';
        ctx.beginPath();
        ctx.roundRect(s1X, s2Y, s1W, s1H, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px "Segoe UI"';
        ctx.fillText('Stage 2: 渋谷', s1X + 20, s2Y + 35);
        ctx.font = '14px "Segoe UI"';
        ctx.fillStyle = '#aaa';
        ctx.fillText('難易度: ★★☆☆☆', s1X + 20, s2Y + 60);

        // Stage 3: 新宿
        const s3Y = 350;
        const s3W = 350, s3H = 80;
        ctx.fillStyle = 'rgba(156, 39, 176, 0.2)'; // 紫系ネオン
        ctx.strokeStyle = '#9c27b0';
        ctx.beginPath();
        ctx.roundRect(s1X, s3Y, s3W, s3H, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px "Segoe UI"';
        ctx.fillText('Stage 3: 新宿', s1X + 20, s3Y + 35);
        ctx.font = '14px "Segoe UI"';
        ctx.fillStyle = '#aaa';
        ctx.fillText('難易度: ★★★☆☆', s1X + 20, s3Y + 60);

        // Coming Soon (Stage 4以降)
        for (let i = 3; i <= 4; i++) {
            const sy = 150 + i * 100;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.strokeStyle = '#444';
            ctx.beginPath();
            ctx.roundRect(s1X, sy, s1W, s1H, 10);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#555';
            ctx.font = 'bold 20px "Segoe UI"';
            ctx.textAlign = 'center';
            ctx.fillText('Coming Soon...', CANVAS_WIDTH / 2, sy + 48);
        }

        // 戻るボタン
        const backW = 140, backH = 45;
        const backX = CANVAS_WIDTH / 2 - backW / 2;
        const backY = CANVAS_HEIGHT - 70;

        ctx.fillStyle = '#444';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(backX, backY, backW, backH, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('戻る', CANVAS_WIDTH / 2, backY + backH / 2);
        ctx.textBaseline = 'alphabetic'; // リセット
    }
}

// ゲーム開始
window.onload = () => {
    new Game();
};
