import { CANVAS_HEIGHT } from './Constants.js';

export const ITEM_TYPES = {
    EXPAND: 'EXPAND', // パドルが伸びる
    MONEY: 'MONEY',   // お金（ワンバウンド後パドルに吸い込まれる）
};

const ITEM_STATES = {
    NORMAL: 'NORMAL',
    BOUNCING: 'BOUNCING',
    SUCKED: 'SUCKED'
};

export class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = type === ITEM_TYPES.MONEY ? 15 : 20;
        this.height = type === ITEM_TYPES.MONEY ? 15 : 20;
        this.type = type;
        this.speedX = 0;
        this.speedY = 2;
        this.active = true;
        this.state = ITEM_STATES.NORMAL;
        this.bounceTimer = 0;
    }

    update(paddle) {
        if (this.state === ITEM_STATES.NORMAL) {
            this.y += this.speedY;
            this.x += this.speedX;
        } else if (this.state === ITEM_STATES.BOUNCING) {
            // 小さく上に跳ねてから吸い込まれるステートへ移行
            this.bounceTimer++;
            this.y -= 3; // 上へバウンド
            if (this.bounceTimer > 10) {
                this.state = ITEM_STATES.SUCKED;
            }
        } else if (this.state === ITEM_STATES.SUCKED) {
            // パドル中央へ向かって加速
            const targetX = paddle.x + paddle.width / 2;
            const targetY = paddle.y + paddle.height / 2;
            const dx = targetX - (this.x + this.width / 2);
            const dy = targetY - (this.y + this.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 5) { // 加速
                this.speedX += (dx / dist) * 1.5;
                this.speedY += (dy / dist) * 1.5;
            }
            this.x += this.speedX;
            this.y += this.speedY;
        }

        if (this.y > CANVAS_HEIGHT) {
            this.active = false;
        }
    }

    startSuction() {
        if (this.state === ITEM_STATES.NORMAL) {
            this.state = ITEM_STATES.BOUNCING;
            this.speedX = 0;
            this.speedY = 0;
        }
    }

    draw(ctx) {
        if (!this.active) return;
        
        if (this.type === ITEM_TYPES.EXPAND) {
            ctx.fillStyle = '#4caf50';
            ctx.beginPath();
            ctx.rect(this.x, this.y, this.width, this.height);
            ctx.fill();
            
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.fillText('E', this.x + 5, this.y + 15);
            ctx.closePath();
        } else if (this.type === ITEM_TYPES.MONEY) {
            // コインの描画
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            const r = this.width / 2;
            ctx.fillStyle = '#ffdf00'; // ゴールド
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.fillStyle = '#b8860b';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('￥', cx, cy + 3);
        }
    }
}
