import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_SPEED } from './Constants.js';

export class Paddle {
    constructor(initialWidth = 80) {
        this.width = initialWidth;
        this.height = PADDLE_HEIGHT;
        this.x = (CANVAS_WIDTH - this.width) / 2;
        this.y = CANVAS_HEIGHT - this.height - 20;
        this.color = COLORS.PADDLE;
        this.speed = PADDLE_SPEED; // player.speedで後から上書き可能
        
        this.rightPressed = false;
        this.leftPressed = false;
        this.trackingTouchId = null; // 追跡中の指のID
        this.touchStartX = null;
        this.paddleStartX = this.x;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const canvas = document.getElementById('gameCanvas');

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Right' || e.key === 'ArrowRight') this.rightPressed = true;
            if (e.key === 'Left' || e.key === 'ArrowLeft') this.leftPressed = true;
        });
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Right' || e.key === 'ArrowRight') this.rightPressed = false;
            if (e.key === 'Left' || e.key === 'ArrowLeft') this.leftPressed = false;
        });

        // マウス移動（PC用：絶対位置方式）
        document.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = CANVAS_WIDTH / rect.width;
            const relativeX = (e.clientX - rect.left) * scaleX;
            if (relativeX > 0 && relativeX < CANVAS_WIDTH) {
                this.x = relativeX - this.width / 2;
            }
        });

        // ---- プニコン式タッチ操作（指IDで追跡してスナップなし） ----
        document.addEventListener('touchstart', (e) => {
            // まだ追跡していない場合のみ、新しく触れた指を基点として記録
            if (this.trackingTouchId === null) {
                const touch = e.changedTouches[0]; // 新しく置かれた指だけ見る
                this.trackingTouchId = touch.identifier;
                this.touchStartX = touch.clientX;
                this.paddleStartX = this.x; // 今のパドル位置が起点
            }
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            // 追跡中の指を探して移動量を適用
            const touch = Array.from(e.touches).find(t => t.identifier === this.trackingTouchId);
            if (touch) {
                const rect = canvas.getBoundingClientRect();
                const scaleX = CANVAS_WIDTH / rect.width;
                const deltaX = (touch.clientX - this.touchStartX) * scaleX;
                this.x = this.paddleStartX + deltaX;
                e.preventDefault();
            }
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            // 追跡中の指が離れたらリセット
            const released = Array.from(e.changedTouches).find(t => t.identifier === this.trackingTouchId);
            if (released) {
                this.trackingTouchId = null;
                this.touchStartX = null;
                this.paddleStartX = this.x;
            }
        });
    }

    update() {
        if (this.rightPressed && this.x < CANVAS_WIDTH - this.width) {
            this.x += this.speed;
        } else if (this.leftPressed && this.x > 0) {
            this.x -= this.speed;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}
