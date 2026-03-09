import { COLORS, BRICK_WIDTH, BRICK_HEIGHT, RESPAWN_TIME_NORMAL, RESPAWN_TIME_EDGE } from './Constants.js';

export class Brick {
    constructor(x, y, hp, isIssue = false, isEdge = false) {
        this.x = x;
        this.y = y;
        this.width = BRICK_WIDTH;
        this.height = BRICK_HEIGHT;
        this.hp = hp;
        this.maxHp = hp;
        this.active = true;
        this.isIssue = isIssue;
        this.isEdge = isEdge;
        this.respawnTimer = 0;
        
        // ロボット用スプライトの初期化
        if (!Brick.sprite) {
            Brick.sprite = new Image();
            Brick.isSpriteProcessed = false;
            const base = import.meta.env.BASE_URL || './';
            Brick.sprite.src = `${base}spider_robot.png`.replace(/\/+/g, '/');
            
            Brick.sprite.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = Brick.sprite.width;
                canvas.height = Brick.sprite.height;
                const ctx = canvas.getContext('2d');
                
                // 1. 通常版 (背景除去のみ)
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(Brick.sprite, 0, 0);
                let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                let data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i] < 30 && data[i+1] < 30 && data[i+2] < 30) data[i+3] = 0;
                }
                ctx.putImageData(imageData, 0, 0);
                Brick.processedSprite = new Image();
                Brick.processedSprite.src = canvas.toDataURL();

                // 2. 赤色版 (ボス用: 赤を強調)
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i+3] > 0) {
                        data[i] = Math.min(255, data[i] * 1.5 + 50); // Red
                        data[i+1] *= 0.5; // Green
                        data[i+2] *= 0.5; // Blue
                    }
                }
                ctx.putImageData(imageData, 0, 0);
                Brick.bossProcessedSprite = new Image();
                Brick.bossProcessedSprite.src = canvas.toDataURL();

                // 3. 青色版 (重機用: 青を強調)
                // まずデータを再取得（通常版から作るため）
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(Brick.sprite, 0, 0);
                imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i] < 30 && data[i+1] < 30 && data[i+2] < 30) {
                        data[i+3] = 0;
                    } else {
                        data[i] *= 0.4; // Red
                        data[i+1] *= 0.8; // Green
                        data[i+2] = Math.min(255, data[i+2] * 1.5 + 80); // Blue
                    }
                }
                ctx.putImageData(imageData, 0, 0);
                Brick.heavyProcessedSprite = new Image();
                Brick.heavyProcessedSprite.src = canvas.toDataURL();

                Brick.bossProcessedSprite.onload = () => {
                    Brick.heavyProcessedSprite.onload = () => {
                        Brick.processedSprite.onload = () => {
                            Brick.isSpriteProcessed = true;
                        };
                    };
                };
            };
        }
    }

    hit(amount = 1) {
        if (this.isIssue && amount > 0) {
            amount = 1; // コアブロックはコンボのダメージに関わらず1ダメージ
        }
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.active = false;
            // 復活タイマーのセット（コアブロック以外）
            if (!this.isIssue) {
                this.respawnTimer = this.isEdge ? RESPAWN_TIME_EDGE : RESPAWN_TIME_NORMAL;
            }
        }
    }

    update(deltaTime, onRespawn) {
        if (!this.active && !this.isIssue) {
            this.respawnTimer -= deltaTime;
            if (this.respawnTimer <= 0) {
                this.active = true;
                this.hp = this.maxHp;
                if (onRespawn) {
                    onRespawn(this);
                }
            }
        }
    }

    draw(ctx) {
        if (!this.active) return;

        const hpRatio = this.hp / this.maxHp;

        if (Brick.isSpriteProcessed) {
            // スプライトの選択
            let img = Brick.processedSprite;
            if (this.isIssue) img = Brick.bossProcessedSprite;
            else if (this.maxHp >= 3) img = Brick.heavyProcessedSprite;

            if (img && img.complete) {
                ctx.save();
                ctx.globalAlpha = 0.6 + hpRatio * 0.4;
                
                // アスペクト比を維持して描画
                const spriteW = img.width || 1;
                const spriteH = img.height || 1;
                const aspect = spriteW / spriteH;
                
                const bw = this.width || BRICK_WIDTH;
                const bh = this.height || BRICK_HEIGHT;
                const drawHeight = bh * 2.8;
                const drawWidth = drawHeight * aspect;
                
                const drawX = this.x + (bw - drawWidth) / 2;
                const drawY = this.y + (bh - drawHeight) / 2;
                
                if (!isNaN(drawX) && !isNaN(drawY) && drawWidth > 0 && drawHeight > 0) {
                    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                }
                ctx.restore();
            }
        } else {
            // フォールバック（画像読み込み前）
            let color;
            if (this.isIssue) {
                const hue = (Date.now() / 10) % 360;
                color = `hsl(${hue}, 100%, 50%)`;
            } else if (this.hp >= 3) {
                color = COLORS.BRICK_HP3;
            } else if (this.hp === 2) {
                color = COLORS.BRICK_HP2;
            } else {
                color = COLORS.BRICK_HP1;
            }

            ctx.beginPath();
            ctx.rect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.strokeRect(this.x, this.y, this.width, this.height);
            ctx.closePath();
        }
        
        // HPの表示 (読みやすさ重視 + 点滅でロボットのデザインも見せる)
        const blink = Math.sin(Date.now() / 150) > 0;
        if (blink) {
            ctx.save();
            const text = this.isIssue ? `BOSS HP: ${this.hp}` : this.hp.toString();
            ctx.font = this.isIssue ? 'bold 12px "Segoe UI"' : 'bold 15px "Segoe UI"';
            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;
            
            // テキストの背景に半透明の黒丸/角丸を引いて読みやすくする
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            const bgW = Math.max(22, textWidth + 8);
            const bgH = 20;
            const bx = this.x + this.width / 2 - bgW / 2;
            const by = this.y + this.height / 2 - bgH / 2;
            
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(bx, by, bgW, bgH, 10);
            } else {
                // roundRect非対応ブラウザ用フォールバック
                ctx.rect(bx, by, bgW, bgH);
            }
            ctx.fill();

            ctx.fillStyle = this.isIssue ? '#ff5252' : '#ffffff'; // ボスは数字も赤っぽく
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, this.x + this.width / 2, this.y + this.height / 2 + 1);
            ctx.restore();
        }
    }
}
