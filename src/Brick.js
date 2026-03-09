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
            // GitHub PagesなどのBase URLに対応
            const base = import.meta.env.BASE_URL || './';
            Brick.sprite.src = `${base}spider_robot.png`.replace(/\/+/g, '/');
            
            Brick.sprite.onload = () => {
                // 背景除去処理（黒背景を透明に）
                const canvas = document.createElement('canvas');
                canvas.width = Brick.sprite.width;
                canvas.height = Brick.sprite.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(Brick.sprite, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    // 真っ黒に近い色を透明にする
                    if (data[i] < 30 && data[i+1] < 30 && data[i+2] < 30) {
                        data[i+3] = 0;
                    }
                }
                ctx.putImageData(imageData, 0, 0);
                
                Brick.processedSprite = new Image();
                Brick.processedSprite.src = canvas.toDataURL();
                Brick.processedSprite.onload = () => {
                    Brick.isSpriteProcessed = true;
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
        
        // ダメージ効果をリクエスト通り削除（揺れ、フラッシュなし）
        const offsetX = 0;
        const offsetY = 0;

        if (Brick.isSpriteProcessed && Brick.processedSprite.complete) {
            ctx.save();
            ctx.globalAlpha = 0.6 + hpRatio * 0.4;
            
            // タイプ別の色付け（フィルター）
            if (this.isIssue) {
                const hue = (Date.now() / 10) % 360;
                ctx.filter = `hue-rotate(${hue}deg) saturate(2) drop-shadow(0 0 5px white)`;
            } else if (this.maxHp >= 3) {
                ctx.filter = 'hue-rotate(180deg) brightness(1.2) saturate(1.5)';
            }
            
            // アスペクト比を維持して描画 (縦幅に対して大きく)
            const img = Brick.processedSprite;
            const aspect = img.width / img.height;
            const drawHeight = this.height * 2.8; // 大幅にスケールアップ
            const drawWidth = drawHeight * aspect;
            
            // 中央揃え
            const drawX = this.x + (this.width - drawWidth) / 2;
            const drawY = this.y + (this.height - drawHeight) / 2;
            
            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
            ctx.restore();
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
        
        // HPの表示 (大きく)
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.font = 'bold 18px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.hp, this.x + this.width / 2, this.y + this.height / 2);
        ctx.shadowBlur = 0;
    }
}
