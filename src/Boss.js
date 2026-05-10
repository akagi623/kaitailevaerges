import { BOSS_CONFIG, BRICK_WIDTH, BRICK_HEIGHT, COLORS } from './Constants.js';

export class Boss {
    constructor(x, y, image) {
        this.x = x;
        this.y = y;
        this.width = BOSS_CONFIG.WIDTH;
        this.height = BOSS_CONFIG.HEIGHT;
        this.hp = BOSS_CONFIG.HP;
        this.maxHp = BOSS_CONFIG.HP;
        this.image = image;
        this.active = true;
        
        this.invincibilityTimer = 0;
        this.moveTimer = 0;
        this.blockTimer = 0;
        
        // 当たり判定の調整（画像の中央付近に合わせる）
        this.collisionBox = {
            width: this.width * 0.8,
            height: this.height * 0.9
        };
        
        // 弱点（頭部）の判定エリア (相対座標)
        this.weakPoint = {
            relX: (this.width - this.width * BOSS_CONFIG.HEAD_WIDTH_RATIO) / 2,
            relY: 10,
            width: this.width * BOSS_CONFIG.HEAD_WIDTH_RATIO,
            height: this.height * BOSS_CONFIG.HEAD_HEIGHT_RATIO
        };
    }

    update(deltaTime) {
        if (!this.active) return;

        // 無敵時間の更新
        if (this.invincibilityTimer > 0) {
            this.invincibilityTimer -= deltaTime;
        }

        // 自律移動（左右にゆらゆら動く）
        this.moveTimer += deltaTime * 0.001;
        const moveRange = 100;
        this.x = (450 - this.width) / 2 + Math.sin(this.moveTimer) * moveRange;
        this.y = 80 + Math.cos(this.moveTimer * 0.5) * 20; // 上下にも少し動く
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        
        // 無敵時間中の点滅
        if (this.invincibilityTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.3;
        }

        // ボス本体の描画
        if (this.image && this.image.complete) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            // フォールバック
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        // HPバーの描画
        this.drawHpBar(ctx);

        // デバッグ用: 当たり判定表示 (必要ならコメント解除)
        /*
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.strokeRect(this.x + this.weakPoint.relX, this.y + this.weakPoint.relY, this.weakPoint.width, this.weakPoint.height);
        */

        ctx.restore();
    }

    drawHpBar(ctx) {
        const barW = 300;
        const barH = 10;
        const barX = (450 - barW) / 2;
        const barY = 50;

        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barW, barH);

        // HP
        const hpRatio = this.hp / this.maxHp;
        ctx.fillStyle = hpRatio > 0.3 ? '#ff5252' : '#ff1744';
        ctx.fillRect(barX, barY, barW * hpRatio, barH);

        // 枠
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);

        // テキスト
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText(`ANCIENT AI GUARDIAN: ${Math.ceil(this.hp)} / ${this.maxHp}`, 450 / 2, barY - 10);
    }

    // 当たり判定チェック
    checkCollision(ballX, ballY, ballRadius) {
        if (!this.active) return null;

        // 矩形全体の判定
        const bossCenterX = this.x + this.width / 2;
        const bossCenterY = this.y + this.height / 2;
        
        const closestX = Math.max(this.x, Math.min(ballX, this.x + this.width));
        const closestY = Math.max(this.y, Math.min(ballY, this.y + this.height));
        
        const distanceX = ballX - closestX;
        const distanceY = ballY - closestY;
        const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

        if (distanceSquared < (ballRadius * ballRadius)) {
            // 当たった！
            
            // 弱点（頭部）へのヒット判定
            const hitInWeakPoint = (
                ballX > this.x + this.weakPoint.relX &&
                ballX < this.x + this.weakPoint.relX + this.weakPoint.width &&
                ballY > this.y + this.weakPoint.relY &&
                ballY < this.y + this.weakPoint.relY + this.weakPoint.height
            );

            return {
                hit: true,
                isWeakPoint: hitInWeakPoint,
                invincible: this.invincibilityTimer > 0,
                dx: Math.abs(distanceX) > Math.abs(distanceY) ? -1 : 0,
                dy: Math.abs(distanceY) >= Math.abs(distanceX) ? -1 : 0
            };
        }
        return null;
    }

    hit(damage, isWeakPoint) {
        if (!this.active || this.invincibilityTimer > 0) return false;

        if (isWeakPoint) {
            this.hp -= damage;
            this.invincibilityTimer = BOSS_CONFIG.INVINCIBILITY_DURATION;
            if (this.hp <= 0) {
                this.hp = 0;
                this.active = false;
            }
            return true;
        }
        return false; // 体に当たった場合はダメージなし
    }
}
