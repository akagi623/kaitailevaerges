import { CANVAS_HEIGHT } from './Constants.js';

export const ITEM_TYPES = {
    EXPAND: 'EXPAND', // パドルが伸びる
    MONEY: 'MONEY',   // お金（ワンバウンド後パドルに吸い込まれる）
};

const ITEM_STATES = {
    NORMAL: 'NORMAL',
    BOUNCING: 'BOUNCING',
    SUCKED: 'SUCKED',
    AUTO_COLLECT: 'AUTO_COLLECT' // 浮遊してから高速回収
};

export class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = type === ITEM_TYPES.MONEY ? 15 : 20;
        this.height = type === ITEM_TYPES.MONEY ? 15 : 20;
        this.type = type;
        this.speedX = (Math.random() - 0.5) * 2;
        this.speedY = type === ITEM_TYPES.MONEY ? -2 : 2; // お金は最初少し浮く
        this.active = true;
        this.state = type === ITEM_TYPES.MONEY ? ITEM_STATES.AUTO_COLLECT : ITEM_STATES.NORMAL;
        this.collectTimer = 0;
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
        } else if (this.state === ITEM_STATES.AUTO_COLLECT) {
            // フワッと浮いてから高速でパドルへ
            this.collectTimer++;
            if (this.collectTimer < 20) {
                this.y += this.speedY;
                this.x += this.speedX;
                this.speedY *= 0.9; // 減速して浮遊感を出す
                this.speedX *= 0.9;
            } else {
                this.state = ITEM_STATES.SUCKED;
                this.speedX = 0;
                this.speedY = 0;
            }
        } else if (this.state === ITEM_STATES.SUCKED) {
            // パドル中央へ向かって高速加速
            const targetX = paddle.x + paddle.width / 2;
            const targetY = paddle.y + paddle.height / 2;
            const dx = targetX - (this.x + this.width / 2);
            const dy = targetY - (this.y + this.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 5) { // さらに高速化
                const accel = this.type === ITEM_TYPES.MONEY ? 3.0 : 1.5;
                this.speedX += (dx / dist) * accel;
                this.speedY += (dy / dist) * accel;
                
                // 最高速度制限（振れすぎ防止）
                const maxSpeed = 15;
                const currentSpeed = Math.sqrt(this.speedX * this.speedX + this.speedY * this.speedY);
                if (currentSpeed > maxSpeed) {
                    this.speedX = (this.speedX / currentSpeed) * maxSpeed;
                    this.speedY = (this.speedY / currentSpeed) * maxSpeed;
                }
            }
            this.x += this.speedX;
            this.y += this.speedY;
        }

        if (this.y > CANVAS_HEIGHT + 100) { // 回収中にはみ出しても少し許容
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
