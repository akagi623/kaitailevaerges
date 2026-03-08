import { CANVAS_WIDTH, CANVAS_HEIGHT, BALL_INITIAL_SPEED, SPECIAL_GAUGE_MAX, GAUGE_CHARGE_PER_HIT, LASER_DAMAGE } from './Constants.js';
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
        this.gameOver = false;
        this.gameWin = false;
        this.gameStarted = false;
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

        this.setupStartListener();
        this.loop(0);
    }

    setupStartListener() {
        const startHandler = (e) => {
            if (!this.gameStarted) {
                this.gameStarted = true;
                this.entranceEndTime = Date.now() + 500; // 0.5秒間フラッシュ

                // Web Audio の初期化（ユーザー操作後に必須）
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

                // SE ファイルを全てバッファにロード（デコードは一回だけ）
                const loadSE = (path) => fetch(path)
                    .then(r => r.arrayBuffer())
                    .then(buf => this.audioCtx.decodeAudioData(buf));

                loadSE('soundeffect/cracker_3.mp3').then(b => { this.hitSEBuffer = b; }).catch(e => console.error('Hit SE load failed:', e));
                loadSE('soundeffect/winse.mp3').then(b => { this.winSEBuffer = b; }).catch(e => console.error('Win SE load failed:', e));
                loadSE('soundeffect/losese.mp3').then(b => { this.loseSEBuffer = b; }).catch(e => console.error('Lose SE load failed:', e));
                loadSE('soundeffect/laser.mp3').then(b => { this.laserSEBuffer = b; }).catch(e => console.error('Laser SE load failed:', e));
                loadSE('soundeffect/padolstrech.mp3').then(b => { this.paddleStretchSEBuffer = b; }).catch(e => console.error('Paddle SE load failed:', e));
                loadSE('soundeffect/levelup.mp3').then(b => { this.levelupSEBuffer = b; }).catch(e => console.error('LevelUp SE load failed:', e));

                this.bgm.play().catch(e => console.error("Audio playback failed:", e));
                this.canvas.removeEventListener('click', startHandler);
                this.canvas.removeEventListener('touchstart', startHandler);
            } else if (this.gameStarted && !this.gameOver && !this.gameWin) {
                // ゲーム実行中のクリック/タップ処理
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = CANVAS_WIDTH / rect.width;
                const scaleY = CANVAS_HEIGHT / rect.height;
                
                const clientX = e.clientX || (e.touches && e.touches[0].clientX);
                const clientY = e.clientY || (e.touches && e.touches[0].clientY);
                
                if (clientX !== undefined && clientY !== undefined) {
                    const canvasX = (clientX - rect.left) * scaleX;
                    const canvasY = (clientY - rect.top) * scaleY;
                    
                    // 必殺技ボタン判定（左下：x < 155, y > CANVAS_HEIGHT - 65）
                    if (canvasX < 155 && canvasY > CANVAS_HEIGHT - 65) {
                        this.fireLaser();
                    }
                }
            } else if (this.gameOver || this.gameWin) {
                // リスタートボタン判定
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = CANVAS_WIDTH / rect.width;
                const scaleY = CANVAS_HEIGHT / rect.height;
                const clientX = e.clientX || (e.touches && e.touches[0].clientX);
                const clientY = e.clientY || (e.touches && e.touches[0].clientY);
                
                if (clientX !== undefined && clientY !== undefined) {
                    const canvasX = (clientX - rect.left) * scaleX;
                    const canvasY = (clientY - rect.top) * scaleY;
                    
                    // 中央のリスタートボタン付近
                    if (canvasX > CANVAS_WIDTH / 2 - 100 && canvasX < CANVAS_WIDTH / 2 + 100 &&
                        canvasY > CANVAS_HEIGHT / 2 + 60 && canvasY < CANVAS_HEIGHT / 2 + 110) {
                        location.reload(); // シンプルにリロードしてリスタート
                    }
                }
            }
        };
        
        this.canvas.addEventListener('click', startHandler);
        this.canvas.addEventListener('touchstart', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = CANVAS_WIDTH / rect.width;
            const scaleY = CANVAS_HEIGHT / rect.height;

            // 新しく置かれた指（changedTouches）を全てチェック
            for (const touch of e.changedTouches) {
                const canvasX = (touch.clientX - rect.left) * scaleX;
                const canvasY = (touch.clientY - rect.top) * scaleY;

                if (!this.gameStarted && Date.now() >= this.entranceEndTime) {
                    // ゲーム開始タップ
                    startHandler(e);
                    break;
                } else if (this.gameStarted && !this.gameOver && !this.gameWin) {
                    if (this.paused) {
                        // ポーズ画面のタッチ（再開ボタンなど）
                        this.handlePauseTouch(canvasX, canvasY);
                    } else if (this.levelingUp) {
                        // レベルアップ選択画面のボタン判定
                        this.handleLevelUpTouch(canvasX, canvasY);
                    } else {
                        // ⏸ ポーズボタン判定（右上）
                        if (canvasX > CANVAS_WIDTH - 50 && canvasY < 40) {
                            this.paused = true;
                        // 必殺技ボタン判定（左下：x < 155, y > CANVAS_HEIGHT - 65）
                        } else if (canvasX < 155 && canvasY > CANVAS_HEIGHT - 65) {
                            this.fireLaser();
                        }
                    }
                } else if (this.gameOver || this.gameWin) {
                    // リスタートボタン判定
                    if (canvasX > CANVAS_WIDTH / 2 - 100 && canvasX < CANVAS_WIDTH / 2 + 100 &&
                        canvasY > CANVAS_HEIGHT / 2 + 60 && canvasY < CANVAS_HEIGHT / 2 + 110) {
                        location.reload();
                    }
                }
            }

            // スクロール防止
            const firstY = e.changedTouches[0] ? (e.changedTouches[0].clientY - this.canvas.getBoundingClientRect().top) * scaleY : CANVAS_HEIGHT;
            if (firstY < CANVAS_HEIGHT - 100) {
                e.preventDefault();
            }
        }, { passive: false });

        // スペースキーで必殺技 / ESCでポーズ
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.gameStarted && !this.gameOver && !this.gameWin && !this.paused) {
                this.fireLaser();
            }
            if (e.code === 'Escape' && this.gameStarted && !this.gameOver && !this.gameWin && !this.levelingUp) {
                this.paused = !this.paused;
            }
        });
    }

    update(deltaTime) {
        if (!this.gameStarted || this.gameOver || this.gameWin || Date.now() < this.entranceEndTime) return;
        if (this.levelingUp || this.paused) return; // レベルアップ・ポーズ中は停止

        this.paddle.update();
        this.ball.update();
        this.effectManager.update();
        this.levelManager.update(deltaTime);
        
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
                // EXP獲得
                const leveledUp = this.player.addExp(10);
                if (leveledUp) {
                    this.onLevelUp();
                }
            }
            
            if (this.levelManager.areAllBricksCleared() && !this.gameWin) {
                this.gameWin = true;
                this.playWebAudioSE(this.winSEBuffer, 0.5);
                this.stopBGM();
            }
        }

        // アイテムの更新と取得
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.update();
            
            if (item.active && 
                item.x < this.paddle.x + this.paddle.width &&
                item.x + item.width > this.paddle.x &&
                item.y < this.paddle.y + this.paddle.height &&
                item.y + item.height > this.paddle.y) {
                
                // アイテム効果
                if (item.type === ITEM_TYPES.EXPAND) {
                    this.paddle.width += 20;
                    this.playWebAudioSE(this.paddleStretchSEBuffer, 0.7);
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
        if (displayCombo > 0) {
            const label = displayCombo >= 2 ? 'LEVERAGES!' : 'LEVERAGE!';
            this.ctx.fillStyle = this.combo > 0 ? '#ffeb3b' : '#9e9e9e';
            this.ctx.font = 'bold 28px "Segoe UI"'; // 大きく
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${displayCombo} ${label}`, CANVAS_WIDTH / 2, 60);
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

        if (!this.gameStarted) {
            this.drawOverlay('Tap TO START', '#4fc3f7');
        } else if (this.gameOver) {
            this.drawOverlay('GAME OVER', '#ff5252');
        } else if (this.gameWin) {
            this.drawOverlay('YOU WIN!', '#4caf50');
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
        const panelW = 280, panelH = 200;
        const panelX = cx - panelW / 2, panelY = cy - 130;
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
        
        // リスタートボタンの描画（ゲーム終了時のみ）
        if (this.gameOver || this.gameWin) {
            const btnW = 200;
            const btnH = 50;
            const btnX = CANVAS_WIDTH / 2 - btnW / 2;
            const btnY = CANVAS_HEIGHT / 2 + 60;
            
            this.ctx.fillStyle = color;
            this.ctx.fillRect(btnX, btnY, btnW, btnH);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 20px "Segoe UI"';
            this.ctx.fillText('RESTART', CANVAS_WIDTH / 2, btnY + 33);
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
}

// ゲーム開始
window.onload = () => {
    new Game();
};
