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
        
        // ハイライト（立体感）
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // HPの表示
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.hp, this.x + this.width / 2, this.y + this.height / 2);
        
        ctx.closePath();
    }
}
