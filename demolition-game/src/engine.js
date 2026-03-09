import { BLOCK_TYPES } from './data';

export class GameEngine {
    constructor(canvas, onStateChange) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onStateChange = onStateChange;

        this.width = 800;
        this.height = 900;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.ball = { x: 0, y: 0, dx: 0, dy: 0, radius: 7 };
        this.paddle = { x: 0, y: 0, width: 100, height: 16 };
        this.blocks = [];
        this.particles = [];
        this.sprites = {};
        this.screenShake = 0;

        this.gameState = 'menu';
        this.stats = {
            money: 0,
            score: 0,
            lives: 3,
            combo: 0,
            time: 0
        };
        this.isPaused = false;

        this.selectedChar = null;
        this.selectedStage = null;

        this.lastTime = 0;
        this.timerAccumulator = 0;
        this.initInputs();
    }

    initInputs() {
        this.mouse = { x: this.width / 2 };
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.width / rect.width;
            this.mouse.x = (e.clientX - rect.left) * scaleX;
        });

        this.canvas.addEventListener('mousedown', () => {
            if (this.gameState === 'playing' && this.ball.dx === 0 && this.ball.dy === 0) {
                this.launchBall();
            }
        });

        window.addEventListener('keydown', (e) => {
            if (this.gameState === 'playing' && e.code === 'Space' && this.ball.dx === 0 && this.ball.dy === 0) {
                this.launchBall();
            }
        });
    }

    launchBall() {
        const angle = (Math.random() - 0.5) * 0.4;
        const speed = (this.selectedChar?.speed || 5) * 1.6;
        this.ball.dx = Math.sin(angle) * speed;
        this.ball.dy = -Math.cos(angle) * speed;
    }

    startLevel(stage, character) {
        this.selectedStage = stage;
        this.selectedChar = character;
        this.gameState = 'playing';

        this.paddle.width = character.size;
        this.paddle.x = this.width / 2 - this.paddle.width / 2;
        this.paddle.y = this.height - 60;

        this.resetBall();

        const blockW = 50;
        const blockH = 22;
        const padding = 4;
        const offsetLeft = (this.width - (13 * (blockW + padding))) / 2;
        const offsetTop = 100;

        this.blocks = stage.blocks.map(b => {
            const type = BLOCK_TYPES[b.type];
            
            // Preload sprite if not loaded
            if (type.sprite && !this.sprites[type.sprite]) {
                const img = new Image();
                img.onload = () => {
                    console.log(`Sprite loaded: ${type.sprite}`);
                    this.draw(); // Force redraw once loaded
                };
                img.onerror = () => console.error(`Failed to load sprite: ${type.sprite}`);
                img.src = type.sprite;
                this.sprites[type.sprite] = img;
            }

            return {
                ...b,
                x: b.x * (blockW + padding) + offsetLeft,
                y: b.y * (blockH + padding) + offsetTop,
                width: blockW,
                height: blockH,
                hp: type.hp,
                maxHp: type.hp,
                color: type.color,
                score: type.score,
                sprite: type.sprite
            };
        });

        this.particles = [];

        this.stats.time = stage.timeLimit;
        this.stats.combo = 0;
        this.stats.score = 0;
        this.stats.lives = 3;
        this.timerAccumulator = 0;
        this.requestUpdate();

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.update(t));
    }

    resetBall() {
        this.ball.x = this.paddle.x + this.paddle.width / 2;
        this.ball.y = this.paddle.y - this.ball.radius - 2;
        this.ball.dx = 0;
        this.ball.dy = 0;
        this.stats.combo = 0;
        this.requestUpdate();
    }

    update(time) {
        if (this.gameState !== 'playing') return;

        if (this.isPaused) {
            this.lastTime = time;
            this.draw();
            requestAnimationFrame((t) => this.update(t));
            return;
        }

        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;

        // タイマー更新
        this.timerAccumulator += dt;
        if (this.timerAccumulator >= 1) {
            this.stats.time = Math.max(0, this.stats.time - 1);
            this.timerAccumulator -= 1;
            this.requestUpdate();
            if (this.stats.time <= 0) {
                this.gameState = 'gameover';
                this.onStateChange('gameover');
            }
        }

        const targetX = this.mouse.x - this.paddle.width / 2;
        this.paddle.x += (targetX - this.paddle.x) * 0.2;
        this.paddle.x = Math.max(0, Math.min(this.width - this.paddle.width, this.paddle.x));

        if (this.ball.dx !== 0 || this.ball.dy !== 0) {
            const subSteps = 4;
            for (let s = 0; s < subSteps; s++) {
                this.ball.x += this.ball.dx / subSteps;
                this.ball.y += this.ball.dy / subSteps;

                // 壁衝突
                if (this.ball.x - this.ball.radius < 0) {
                    this.ball.x = this.ball.radius;
                    this.ball.dx *= -1;
                } else if (this.ball.x + this.ball.radius > this.width) {
                    this.ball.x = this.width - this.ball.radius;
                    this.ball.dx *= -1;
                }

                if (this.ball.y - this.ball.radius < 0) {
                    this.ball.y = this.ball.radius;
                    this.ball.dy *= -1;
                }

                // パドル衝突
                if (this.ball.dy > 0 &&
                    this.ball.y + this.ball.radius > this.paddle.y &&
                    this.ball.y - this.ball.radius < this.paddle.y + this.paddle.height &&
                    this.ball.x > this.paddle.x && this.ball.x < this.paddle.x + this.paddle.width) {

                    const hitPos = (this.ball.x - (this.paddle.x + this.paddle.width / 2)) / (this.paddle.width / 2);
                    this.ball.dy = -Math.abs(this.ball.dy);
                    const speed = (this.selectedChar?.speed || 5) * 1.6;
                    this.ball.dx = hitPos * speed;
                    this.stats.combo = 0; // パドルに触れたらコンボリセット
                    this.requestUpdate();
                }

                // ブロック衝突
                for (let i = this.blocks.length - 1; i >= 0; i--) {
                    const b = this.blocks[i];
                    if (this.ball.x + this.ball.radius > b.x && this.ball.x - this.ball.radius < b.x + b.width &&
                        this.ball.y + this.ball.radius > b.y && this.ball.y - this.ball.radius < b.y + b.height) {

                        if (Math.abs(this.ball.x - (b.x + b.width / 2)) > b.width / 2) {
                            this.ball.dx *= -1;
                            this.ball.x += this.ball.dx / (subSteps * 2);
                        } else {
                            this.ball.dy *= -1;
                            this.ball.y += this.ball.dy / (subSteps * 2);
                        }

                        // ヒットごとにダメージ計算とコンボ増加
                        const basePower = this.selectedChar?.power || 1;
                        const damage = Math.floor(basePower * Math.pow(1.5, this.stats.combo));
                        b.hp = Math.max(0, b.hp - damage);

                        this.stats.combo++;
                        this.requestUpdate();

                        if (b.hp <= 0) {
                            // 発火・破片エフェクト
                            this.createExplosion(b.x + b.width / 2, b.y + b.height / 2, b.color);
                            
                            this.blocks.splice(i, 1);
                            this.stats.score += b.score;
                            this.requestUpdate();

                            if (this.blocks.length === 0) {
                                this.gameState = 'result';
                                this.onStateChange('win');
                            }
                        }
                        break;
                    }
                }
            }

            // ミス判定
            if (this.ball.y > this.height) {
                this.stats.lives--;
                this.requestUpdate();
                if (this.stats.lives <= 0) {
                    this.gameState = 'gameover';
                    this.onStateChange('gameover');
                } else {
                    this.resetBall();
                }
            }
        } else {
            this.ball.x = this.paddle.x + this.paddle.width / 2;
        }

        this.updateParticles(dt);
        if (this.screenShake > 0) this.screenShake -= dt * 20;

        this.draw();
        requestAnimationFrame((t) => this.update(t));
    }

    createExplosion(x, y, color) {
        this.screenShake = 5; // 小型ロボット破壊時の揺れ
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: x,
                y: y,
                dx: (Math.random() - 0.5) * 12,
                dy: (Math.random() - 0.5) * 12,
                life: 1.0,
                color: Math.random() > 0.3 ? '#60a5fa' : (Math.random() > 0.5 ? '#fbbf24' : color), // Spark colors
                size: Math.random() * 3 + 1
            });
        }
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.dx;
            p.y += p.dy;
            p.life -= dt * 2;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw() {
        this.ctx.save();
        if (this.screenShake > 0) {
            this.ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake);
        }
        this.ctx.clearRect(-10, -10, this.width + 20, this.height + 20);

        // Blocks (Robots)
        this.blocks.forEach(b => {
            const sprite = this.sprites[b.sprite];
            const hpRatio = b.hp / b.maxHp;
            
            // ダメージ時の揺れ（ジッター）
            let offsetX = 0;
            let offsetY = 0;
            if (hpRatio < 0.4) {
                offsetX = (Math.random() - 0.5) * 3;
                offsetY = (Math.random() - 0.5) * 3;
            }

            if (sprite && sprite.complete) {
                this.ctx.save();
                this.ctx.globalAlpha = 0.6 + hpRatio * 0.4;
                
                // タイプ別の色付け（簡易フィルター）
                if (b.color === '#d97706') { // Wood robot -> Yellowish
                    this.ctx.filter = 'sepia(1) saturate(2) hue-rotate(-20deg)';
                } else if (b.color === '#94a3b8') { // Steel robot -> Bright Cyan
                    this.ctx.filter = 'hue-rotate(180deg) brightness(1.2)';
                }
                
                this.ctx.drawImage(sprite, b.x + offsetX, b.y + offsetY, b.width, b.height);
                this.ctx.restore();
                
                // ヒット時のフラッシュ・グリッチ
                if (hpRatio < 1.0 && Math.random() > 0.9) {
                    this.ctx.fillStyle = 'rgba(96, 165, 250, 0.4)';
                    this.ctx.fillRect(b.x + offsetX, b.y + offsetY, b.width, b.height);
                }
            } else {
                this.ctx.fillStyle = b.color;
                this.ctx.globalAlpha = 0.4 + hpRatio * 0.6;
                this.ctx.fillRect(b.x + offsetX, b.y + offsetY, b.width, b.height);
            }

            // HPの表示
            this.ctx.globalAlpha = 1.0;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 12px Outfit';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(Math.ceil(b.hp), b.x + b.width / 2 + offsetX, b.y + b.height / 2 + offsetY);
        });

        // Particles
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        this.ctx.globalAlpha = 1.0;

        const gradient = this.ctx.createLinearGradient(this.paddle.x, 0, this.paddle.x + this.paddle.width, 0);
        gradient.addColorStop(0, this.selectedChar?.color || '#f0ab3d');
        gradient.addColorStop(1, '#f59e0b');

        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = this.selectedChar?.color || '#f0ab3d';
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.roundRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height, 8);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#fff';
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // コンボ倍率の表示
        if (this.stats.combo > 0) {
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = 'black';
            this.ctx.fillStyle = '#f0ab3d';
            this.ctx.font = 'bold 32px Outfit';
            this.ctx.textAlign = 'right';
            const multiplier = Math.pow(1.5, this.stats.combo - 1).toFixed(1);
            this.ctx.fillText(`${this.stats.combo} COMBO`, this.width - 20, 60);
            this.ctx.font = 'bold 20px Outfit';
            this.ctx.fillText(`x${multiplier} DMG`, this.width - 20, 90);
            this.ctx.shadowBlur = 0;
        }
    }

    requestUpdate() {
        this.onStateChange('update', this.stats);
    }
}
