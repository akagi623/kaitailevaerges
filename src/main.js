import { CANVAS_WIDTH, CANVAS_HEIGHT, BALL_INITIAL_SPEED, SPECIAL_GAUGE_MAX, GAUGE_CHARGE_PER_HIT, LASER_DAMAGE, MONEY_DROP_RATE, MAGNET_RADIUS, GAME_STATE } from './Constants.js';
import { Ball } from './Ball.js';
import { Paddle } from './Paddle.js';
import { LevelManager } from './LevelManager.js';
import { EffectManager } from './EffectManager.js';
import { Item, ITEM_TYPES } from './Item.js';
import { Player } from './Player.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.lastTime = 0;
        this.init();
    }

    init() {
        this.player = new Player();
        this.paddle = new Paddle(this.player.defense);
        this.ball = new Ball(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 50, BALL_INITIAL_SPEED, -BALL_INITIAL_SPEED);
        this.levelManager = new LevelManager();
        this.effectManager = new EffectManager();
        this.items = [];
        
        this.score = 0;
        this.lives = 3;
        this.destroyedBricksCount = 0; // 破壊したブロックの数
        this.clearBonus = 5000;      // クリア報酬
        this.bonusAdded = false;     // ボーナス加算済みフラグ
        this.gameOver = false;
        this.gameWin = false;
        this.gameStarted = false;
        this.gameState = GAME_STATE.TITLE; // 初期状態：タイトル画面
        this.entranceEndTime = 0; // 「現場入場！」フラッシュ終了時刻
        this.combo = 0;
        this.lastCombo = 0; // 直近のコンボ数を保持
        this.baseDamage = 10;
        this.isFadingOut = false;
        this.speedMultiplier = 1.0;
        this.specialGauge = 0;
        this.lastSETime = 0;
        this.lastLaserTime = 0;
        this.levelingUp = false;     // レベルアップ中フラグ
        this.selectedStat = null;    // 選択したステータス ('attack'/'speed'/'defense')
        this.paused = false;         // 一時停止フラグ

        // チュートリアル関連
        this.tutorialState = 0;      // 0:なし, 1:初回, 2:初リポップ, 3:初コア
        this.hasShownIntro = false;
        this.hasShownRespawn = false;
        this.hasShownIssue = false;
        this.tutorialTargetBrick = null;

        // 画像の読み込み
        this.topImage = new Image();
        this.topImage.src = 'TOP.png';
        this.yasuImage = new Image();
        this.yasuImage.src = 'chara_1_icon.png';
        this.oyakataImage = new Image();
        this.oyakataImage.src = 'chara_2_icon.png';

        // Web Audio API（SE用）
        this.audioCtx = null;    // ユーザー操作後に初期化
        this.hitSEBuffer = null; // ヒットSE
        this.winSEBuffer = null; // クリアSE
        this.loseSEBuffer = null; // ゲームオーバーSE
        this.laserSEBuffer = null; // 必殺技発射SE
        this.paddleStretchSEBuffer = null; // パドル伸長アイテムSE
        this.levelupSEBuffer = null; // レベルアップSE

        // BGM（長い曲は streaming の HTMLAudio で再生）
        this.bgm = new Audio('BURNING ADRENALINE.mp3');
        this.bgm.loop = true;
        this.bgm.volume = 0.5;
        this.bgm.autoplay = false; // 明示的に無効化

        this.setupStartListener();
        this.loop(0);
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
                // キャラクター選択（ヤス：中央の選択ボタン）
                // 判定を拡大（左右±100px程度余裕を持たせる）
                const btnX = CANVAS_WIDTH / 2 - 120;
                const btnY = CANVAS_HEIGHT / 2 + 140;
                if (canvasX > btnX && canvasX < btnX + 240 && canvasY > btnY && canvasY < btnY + 70) {
                    this.gameState = GAME_STATE.STAGE_SELECT;
                }
            } else if (this.gameState === GAME_STATE.STAGE_SELECT) {
                // ステージ選択（Stage 1：池袋）
                const btnX = 50;
                const btnY = 150;
                if (canvasX > btnX && canvasX < btnX + 350 && canvasY > btnY && canvasY < btnY + 80) {
                    this.startGame();
                }
            } else if (this.gameState === GAME_STATE.PLAYING) {
                // ポーズ中・レベルアップ中・チュートリアル中は常に判定を優先
                if (this.paused) {
                    this.handlePauseTouch(canvasX, canvasY);
                    return;
                }
                if (this.levelingUp) {
                    this.handleLevelUpTouch(canvasX, canvasY);
                    return;
                }
                if (this.tutorialState > 0) {
                    // チュートリアルのページ送り
                    if (this.tutorialState === 1.1) this.tutorialState = 1.2;
                    else if (this.tutorialState === 1.2) this.tutorialState = 0;
                    else if (this.tutorialState === 2.1) this.tutorialState = 0;
                    else if (this.tutorialState === 3.1) this.tutorialState = 3.2;
                    else if (this.tutorialState === 3.2) this.tutorialState = 0;
                    else this.tutorialState = 0;
                    return;
                }

                // ゲームオーバーまたはクリア時のボタン判定
                if (this.gameOver || this.gameWin) {
                    const btnW = 200, btnH = 50, cx = CANVAS_WIDTH / 2;
                    const restartY = CANVAS_HEIGHT / 2 + 130;
                    const titleY = CANVAS_HEIGHT / 2 + 190;

                    // Restart
                    if (canvasX > cx - 100 && canvasX < cx + 100 && canvasY > restartY && canvasY < restartY + btnH) {
                        location.reload();
                    }
                    // Back to Title
                    if (canvasX > cx - 100 && canvasX < cx + 100 && canvasY > titleY && canvasY < titleY + btnH) {
                        this.gameState = GAME_STATE.TITLE;
                        this.gameWin = false;
                        this.gameOver = false;
                        this.gameStarted = false;
                        // 他の状態リセットが必要な場合はここで行う（今回はreloadせずに戻る実装）
                        location.reload(); // 確実にリセットするためreload推奨だが、要望に合わせて調整
                    }
                    return;
                }

                if (!this.gameOver && !this.gameWin) {
                    // 入場フラッシュ時間を過ぎている場合のみ操作を受け付ける
                    if (Date.now() >= this.entranceEndTime) {
                        // ⏸ ポーズボタン判定（右上）
                        if (canvasX > CANVAS_WIDTH - 50 && canvasY < 40) {
                            this.paused = true;
                        // 必殺技ボタン判定（左下）
                        } else if (canvasX < 155 && canvasY > CANVAS_HEIGHT - 65) {
                            this.fireLaser();
                        }
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

            // スクロール防止用のY座標判定
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

        // スペースキーで必殺技 / ESCでポーズ
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.gameStarted && !this.gameOver && !this.gameWin && !this.paused) {
                this.fireLaser();
            }
            if (e.code === 'Escape' && this.gameStarted && !this.gameOver && !this.gameWin && !this.levelingUp) {
                if (this.tutorialState > 0) {
                    this.tutorialState = 0; // ESCでも閉じる
                } else {
                    this.paused = !this.paused;
                }
            }
        });
    }

    initAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const loadSE = (path) => fetch(path)
                .then(r => r.arrayBuffer())
                .then(buf => this.audioCtx.decodeAudioData(buf));
            loadSE('soundeffect/cracker_3.mp3').then(b => { this.hitSEBuffer = b; }).catch(e => console.error('Hit SE load failed:', e));
            loadSE('soundeffect/winse.mp3').then(b => { this.winSEBuffer = b; }).catch(e => console.error('Win SE load failed:', e));
            loadSE('soundeffect/losese.mp3').then(b => { this.loseSEBuffer = b; }).catch(e => console.error('Lose SE load failed:', e));
            loadSE('soundeffect/laser.mp3').then(b => { this.laserSEBuffer = b; }).catch(e => console.error('Laser SE load failed:', e));
            loadSE('soundeffect/padolstrech.mp3').then(b => { this.paddleStretchSEBuffer = b; }).catch(e => console.error('Paddle SE load failed:', e));
            loadSE('soundeffect/levelup.mp3').then(b => { this.levelupSEBuffer = b; }).catch(e => console.error('LevelUp SE load failed:', e));
        }
    }

    startGame() {
        this.gameState = GAME_STATE.PLAYING;
        this.gameStarted = true;
        this.entranceEndTime = Date.now() + 500;
        this.bgm.play().catch(e => console.error("Audio playback failed:", e));
    }

    showTutorial(step, brick = null) {
        this.tutorialState = step;
        this.tutorialTargetBrick = brick;
    }

    update(deltaTime) {
        if (!this.gameStarted || this.gameOver || this.gameWin || Date.now() < this.entranceEndTime) return;
        
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
            },
            (brick) => {
                if (!this.hasShownIssue) {
                    this.hasShownIssue = true;
                    this.showTutorial(3.1, brick);
                }
            }
        );
        
        // コンボとプレイヤー攻撃力に応じたダメージ計算
        const currentDamage = Math.floor(this.player.attack * Math.pow(1.5, Math.max(0, this.combo)));

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
                // EXP獲得
                const leveledUp = this.player.addExp(10);
                if (leveledUp) {
                    this.onLevelUp();
                }

                // アイテム（資金）確率ドロップ
                if (Math.random() < MONEY_DROP_RATE) {
                    this.items.push(new Item(
                        collisionResult.brick.x + collisionResult.brick.width / 2 - 7.5,
                        collisionResult.brick.y + collisionResult.brick.height / 2 - 7.5,
                        ITEM_TYPES.MONEY
                    ));
                }
            }
            
            if (this.levelManager.areAllBricksCleared() && !this.gameWin) {
                this.gameWin = true;
                if (!this.bonusAdded) {
                    this.player.money += this.clearBonus;
                    this.bonusAdded = true;
                }
                this.playWebAudioSE(this.winSEBuffer, 0.5);
                this.stopBGM();
            }
        }

        // アイテムの更新と取得
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.update(this.paddle);

            // お金の吸い込み判定（パドルの当たり判定より少し広い）
            if (item.type === ITEM_TYPES.MONEY && item.state === 'NORMAL') {
                const paddleCenterX = this.paddle.x + this.paddle.width / 2;
                const itemCenterX = item.x + item.width / 2;
                
                // y軸はある程度パドルに近く、x軸がパドル周辺なら吸い込み開始
                if (item.y + item.height > this.paddle.y - MAGNET_RADIUS && 
                    Math.abs(itemCenterX - paddleCenterX) < (this.paddle.width / 2) + MAGNET_RADIUS) {
                    item.startSuction();
                }
            }
            
            // 実際の取得判定（パドル領域内）
            if (item.active && 
                item.x + item.width/2 > this.paddle.x &&
                item.x + item.width/2 < this.paddle.x + this.paddle.width &&
                item.y + item.height > this.paddle.y &&
                item.y + item.height/2 < this.paddle.y + this.paddle.height) {
                
                // アイテム効果
                if (item.type === ITEM_TYPES.EXPAND) {
                    this.paddle.width += 20;
                    this.playWebAudioSE(this.paddleStretchSEBuffer, 0.7);
                } else if (item.type === ITEM_TYPES.MONEY) {
                    this.player.money += 100; // 金額設定
                    // SE（短いビープ）
                    if (this.audioCtx) {
                        const osc = this.audioCtx.createOscillator();
                        const gain = this.audioCtx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // A5
                        osc.frequency.exponentialRampToValueAtTime(1760, this.audioCtx.currentTime + 0.1); // A6
                        gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
                        osc.connect(gain);
                        gain.connect(this.audioCtx.destination);
                        osc.start();
                        osc.stop(this.audioCtx.currentTime + 0.1);
                    }
                }
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
            
            // パドルに当たったらコンボリセット
            this.combo = 0;
        }

        // ミス（底に落ちた場合）
        if (this.ball.y + this.ball.radius > CANVAS_HEIGHT) {
            this.lives--;
            this.combo = 0; // コンボリセット（lastComboは保持される）
            if (this.lives <= 0 && !this.gameOver) {
                this.gameOver = true;
                this.stopBGM();
                this.playWebAudioSE(this.loseSEBuffer, 0.5);
            } else {
                // リセット
                this.speedMultiplier = 1.0; // スピードリセット
                this.ball.x = CANVAS_WIDTH / 2;
                this.ball.y = CANVAS_HEIGHT - 50;
                this.ball.dx = BALL_INITIAL_SPEED;
                this.ball.dy = -BALL_INITIAL_SPEED;
                this.paddle.x = (CANVAS_WIDTH - this.paddle.width) / 2;
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
        } else {
            // 背景
            this.ctx.fillStyle = '#111';
            this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

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

        // 2行目: LEVERAGEの表示
        const displayCombo = this.combo > 0 ? this.combo : this.lastCombo;
        if (displayCombo > 0 || this.tutorialState === 1.1 || this.tutorialState === 1.2) {
            const forceCombo = displayCombo > 0 ? displayCombo : 1;
            const label = forceCombo >= 2 ? 'LEVERAGES!' : 'LEVERAGE!';
            this.ctx.fillStyle = forceCombo > 0 ? '#ffeb3b' : '#9e9e9e';
            this.ctx.font = 'bold 28px "Segoe UI"'; // 大きく
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${forceCombo} ${label}`, CANVAS_WIDTH / 2, 60);
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

        // 現場入場！フラッシュ
        if (this.gameStarted && Date.now() < this.entranceEndTime) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            this.ctx.fillStyle = '#ffeb3b';
            this.ctx.font = 'bold 56px "Segoe UI"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('現場入場！', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
            return;
        }

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
                    hit.brick.y + hit.brick.height / 2
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
        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;
        const gain = this.audioCtx.createGain();
        gain.gain.value = volume;
        source.connect(gain);
        gain.connect(this.audioCtx.destination);
        source.start();
    }

    playHitSE() {
        const now = Date.now();
        if (now - this.lastSETime < 40) return; // 40ms以内の連打は無視
        this.lastSETime = now;

        // Web Audio APIで即時再生（メインスレッドに影響なし）
        if (this.audioCtx && this.hitSEBuffer) {
            const source = this.audioCtx.createBufferSource();
            source.buffer = this.hitSEBuffer;
            const gainNode = this.audioCtx.createGain();
            gainNode.gain.value = 0.6;
            source.connect(gainNode);
            gainNode.connect(this.audioCtx.destination);
            source.start();
        }
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
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

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
                "ブロックはHPがゼロになれば壊れるぞ！",
                "連続で当て続ければ【LEVERAGE】が効いて",
                "ダメージが1.5倍ずつ倍増だ！"
            ];
        } else if (this.tutorialState === 1.2) {
            textLines = [
                "ブロックを壊せば【経験値】が貯まる。",
                "満タンになったら、下の【FIRE!】を",
                "タップして必殺技をブチかませ！"
            ];
        } else if (this.tutorialState === 2.1) {
            textLines = [
                "おっと、油断するなよ！",
                "この現場のブロックは、壊しても",
                "時間が経てば【復活】しちまうぞ！",
                "早えとこカタをつけねぇとな！"
            ];
        } else if (this.tutorialState === 3.1) {
            textLines = [
                "出たな！あいつが今回のデカブツ…",
                "【コアブロック】だ！",
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
            { label: 'BLOCKS DESTROYED', value: this.destroyedBricksCount },
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
        // タイトル画面を背景に少し暗く
        this.drawTitleScreen();
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const modalW = 340, modalH = 500;
        const modalX = CANVAS_WIDTH / 2 - modalW / 2;
        const modalY = CANVAS_HEIGHT / 2 - modalH / 2;

        ctx.fillStyle = '#222';
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(modalX, modalY, modalW, modalH, 20);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText('キャラクター選択', CANVAS_WIDTH / 2, modalY + 40);

        // ヤスのアイコン
        const iconSize = 120;
        const iconX = CANVAS_WIDTH / 2 - iconSize / 2;
        const iconY = modalY + 70;
        if (this.yasuImage.complete) {
            ctx.drawImage(this.yasuImage, iconX, iconY, iconSize, iconSize);
        }
        
        ctx.fillStyle = '#ffeb3b';
        ctx.font = 'bold 20px "Segoe UI"';
        ctx.fillText('熱血ルーキー ヤス', CANVAS_WIDTH / 2, iconY + iconSize + 30);

        // ステータス表示
        const stats = [
            { label: 'Level', value: '1' },
            { label: '攻撃力', value: '10' },
            { label: 'スピード', value: '1.0' },
            { label: '防御力', value: '100' }
        ];

        stats.forEach((stat, i) => {
            const sy = iconY + iconSize + 70 + i * 35;
            ctx.fillStyle = '#aaa';
            ctx.font = '16px "Segoe UI"';
            ctx.textAlign = 'left';
            ctx.fillText(stat.label, modalX + 40, sy);
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'right';
            ctx.fillText(stat.value, modalX + modalW - 40, sy);
        });

        // 選択ボタン
        const btnW = 120, btnH = 45;
        const btnX = CANVAS_WIDTH / 2 - btnW / 2;
        const btnY = modalY + modalH - 70;
        ctx.fillStyle = this.yasuImage.complete ? '#4caf50' : '#888';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 10);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.yasuImage.complete ? '選択' : 'Loading...', CANVAS_WIDTH / 2, btnY + btnH / 2);
        ctx.textBaseline = 'alphabetic';
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

        // Coming Soon
        for (let i = 1; i <= 4; i++) {
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
    }
}

// ゲーム開始
window.onload = () => {
    new Game();
};
