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
            // GitHub PagesなどのBase URLに対応
            const base = import.meta.env.BASE_URL || './';
            Brick.sprite.src = `${base}spider_robot.png`.replace(/\/+/g, '/');
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
        
        // ダメージ時の揺れ（ジッター）
        let offsetX = 0;
        let offsetY = 0;
        if (hpRatio < 0.4 && hpRatio > 0) {
            offsetX = (Math.random() - 0.5) * 3;
            offsetY = (Math.random() - 0.5) * 3;
        }

        if (Brick.sprite && Brick.sprite.complete) {
            ctx.save();
            ctx.globalAlpha = 0.6 + hpRatio * 0.4;
            
            // タイプ別の色付け（簡易フィルター）
            if (this.isIssue) {
                const hue = (Date.now() / 10) % 360;
                ctx.filter = `hue-rotate(${hue}deg) saturate(2)`;
            } else if (this.maxHp >= 3) { // Hard robot
                ctx.filter = 'hue-rotate(180deg) brightness(1.2)';
            }
            
            ctx.drawImage(Brick.sprite, this.x + offsetX, this.y + offsetY, this.width, this.height);
            ctx.restore();

            // ヒット時のフラッシュ
            if (hpRatio < 1.0 && Math.random() > 0.9) {
                ctx.fillStyle = 'rgba(96, 165, 250, 0.4)';
                ctx.fillRect(this.x + offsetX, this.y + offsetY, this.width, this.height);
            }
        } else {
            // フォールバック
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
            ctx.rect(this.x + offsetX, this.y + offsetY, this.width, this.height);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.strokeRect(this.x + offsetX, this.y + offsetY, this.width, this.height);
            ctx.closePath();
        }
        
        // HPの表示
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.hp, this.x + this.width / 2 + offsetX, this.y + this.height / 2 + offsetY);
    }
}
