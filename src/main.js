import { CANVAS_WIDTH, CANVAS_HEIGHT, BALL_INITIAL_SPEED, SPECIAL_GAUGE_MAX, GAUGE_CHARGE_PER_HIT, LASER_DAMAGE } from './Constants.js';
import { Ball } from './Ball.js';
import { Paddle } from './Paddle.js';
import { LevelManager } from './LevelManager.js';
import { EffectManager } from './EffectManager.js';
import { Item, ITEM_TYPES } from './Item.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.lastTime = 0;
        this.init();
    }

    init() {
        this.paddle = new Paddle();
        this.ball = new Ball(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 50, BALL_INITIAL_SPEED, -BALL_INITIAL_SPEED);
        this.levelManager = new LevelManager();
        this.effectManager = new EffectManager();
        this.items = [];
        
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.gameWin = false;
        this.gameStarted = false;
        this.combo = 0;
        this.lastCombo = 0; // 直近のコンボ数を保持
        this.baseDamage = 10;
        this.isFadingOut = false;
        this.speedMultiplier = 1.0; // ボールのスピード倍率
        this.specialGauge = 0; // 必殺技ゲージ
        this.lastLaserTime = 0; // 前回のレーザー発射時刻

        // BGMの設定
        this.bgm = new Audio('/BURNING ADRENALINE.mp3');
        this.bgm.loop = true;
        this.bgm.volume = 0.5;

        // SEの設定
        this.hitSE = new Audio('/soundeffect/cracker_3.mp3');
        this.hitSE.volume = 0.6;
        this.winSE = new Audio('/soundeffect/winse.mp3');
        this.winSE.volume = 0.5;
        this.loseSE = new Audio('/soundeffect/losese.mp3');
        this.loseSE.volume = 0.5;

        this.setupStartListener();
        this.loop(0);
    }

    setupStartListener() {
        const startHandler = (e) => {
            if (!this.gameStarted) {
                this.gameStarted = true;
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
                    
                    // ゲージ付近をタップしたらレーザー発射
                    // 判定を少し広めにする（右端から60px以内かつゲージの高さ付近）
                    if (canvasX > CANVAS_WIDTH - 60 && canvasY > 80 && canvasY < 320) {
                        this.fireLaser();
                    }
                }
            }
        };
        
        this.canvas.addEventListener('click', startHandler);
        this.canvas.addEventListener('touchstart', (e) => {
            startHandler(e);
            // パドル操作と被らないように、上の方のタップならpreventDefaultする
            const rect = this.canvas.getBoundingClientRect();
            const clientY = e.touches[0].clientY;
            const canvasY = (clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
            if (canvasY < CANVAS_HEIGHT - 100) {
                e.preventDefault();
            }
        }, { passive: false });

        // スペースキーで必殺技
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.gameStarted && !this.gameOver && !this.gameWin) {
                this.fireLaser();
            }
        });
    }

    update(deltaTime) {
        if (!this.gameStarted || this.gameOver || this.gameWin) return;

        this.paddle.update();
        this.ball.update();
        this.effectManager.update();
        
        // コンボに応じたダメージ計算
        const currentDamage = Math.floor(this.baseDamage * Math.pow(1.5, Math.max(0, this.combo)));

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
                // アイテムドロップ（確率）
                if (Math.random() < 0.2) {
                    const type = Math.random() < 0.5 ? ITEM_TYPES.EXPAND : ITEM_TYPES.EXTRA_BALL;
                    this.items.push(new Item(collisionResult.brick.x, collisionResult.brick.y, type));
                }
            }
            
            if (this.levelManager.areAllBricksCleared()) {
                this.gameWin = true;
                this.winSE.play().catch(e => console.error("Win SE failed:", e));
                this.fadeOutBGM();
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
            if (this.lives <= 0) {
                this.gameOver = true;
                this.loseSE.play().catch(e => console.error("Lose SE failed:", e));
                this.fadeOutBGM();
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
        
        // 背景の描画
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        this.paddle.draw(this.ctx);
        this.ball.draw(this.ctx);
        this.levelManager.draw(this.ctx);
        this.effectManager.draw(this.ctx);
        for (let item of this.items) {
            item.draw(this.ctx);
        }

        // UI描画
        this.drawUI();
    }

    drawUI() {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px "Segoe UI"';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${this.score.toLocaleString()}`, 20, 30);
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Lives: ${this.lives}`, CANVAS_WIDTH - 20, 30);

        // LEVERAGEの表示（コンボ中または直近の値を表示）
        const displayCombo = this.combo > 0 ? this.combo : this.lastCombo;
        if (displayCombo > 0) {
            const label = displayCombo >= 2 ? 'LEVERAGES!' : 'LEVERAGE!';
            this.ctx.fillStyle = this.combo > 0 ? '#ffeb3b' : '#9e9e9e'; // コンボ継続中は黄色、リセット後はグレー
            this.ctx.font = 'bold 24px "Segoe UI"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${displayCombo} ${label}`, CANVAS_WIDTH / 2, 30);
        }

        // 必殺技ゲージの描画
        this.drawSpecialGauge();

        if (!this.gameStarted) {
            this.drawOverlay('CLICK TO START', '#4fc3f7');
        } else if (this.gameOver) {
            this.drawOverlay('GAME OVER', '#ff5252');
        } else if (this.gameWin) {
            this.drawOverlay('YOU WIN!', '#4caf50');
        }
    }

    drawOverlay(text, color) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 60px "Segoe UI"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px "Segoe UI"';
        this.ctx.fillText('Press F5 to Restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
    }

    drawSpecialGauge() {
        const x = CANVAS_WIDTH - 30;
        const y = 100;
        const width = 15;
        const height = 200;
        const fillHeight = (this.specialGauge / SPECIAL_GAUGE_MAX) * height;

        // 背景
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fillRect(x, y, width, height);
        
        // ゲージの中身
        const color = this.specialGauge >= SPECIAL_GAUGE_MAX ? '#00ffff' : '#ff5252';
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y + (height - fillHeight), width, fillHeight);
        
        // 枠線
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        // ラベル
        this.ctx.save();
        this.ctx.translate(x - 10, y + height / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.textAlign = 'center';
        this.ctx.font = 'bold 14px "Segoe UI"';
        this.ctx.fillStyle = color;
        this.ctx.fillText('SPECIAL', 0, 0);
        this.ctx.restore();

        if (this.specialGauge >= SPECIAL_GAUGE_MAX) {
            this.ctx.fillStyle = '#00ffff';
            this.ctx.font = 'bold 12px "Segoe UI"';
            this.ctx.textAlign = 'right';
            this.ctx.fillText('READY [SPACE]', x - 5, y + height + 20);
        }
    }

    fireLaser() {
        if (this.specialGauge < SPECIAL_GAUGE_MAX) return;
        
        this.specialGauge = 0;
        const laserX = this.paddle.x + this.paddle.width / 2;
        const laserWidth = 30;

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
            this.winSE.play().catch(e => console.error("Win SE failed:", e));
            this.fadeOutBGM();
        }
    }

    playHitSE() {
        // 新しいAudioオブジェクトを作成して再生（確実に重複再生可能にする）
        const se = new Audio('/soundeffect/cracker_3.mp3');
        se.volume = 0.6;
        se.play().catch(e => console.error("SE playback failed:", e));
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

    fadeOutBGM() {
        if (this.isFadingOut) return;
        this.isFadingOut = true;
        
        const fadeInterval = setInterval(() => {
            if (this.bgm.volume > 0.05) {
                this.bgm.volume -= 0.05;
            } else {
                this.bgm.volume = 0;
                this.bgm.pause();
                clearInterval(fadeInterval);
            }
        }, 100);
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
