import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_SPEED } from './Constants.js';

export class Paddle {
    constructor() {
        this.width = PADDLE_WIDTH;
        this.height = PADDLE_HEIGHT;
        this.x = (CANVAS_WIDTH - this.width) / 2;
        this.y = CANVAS_HEIGHT - this.height - 20;
        this.color = COLORS.PADDLE;
        
        this.rightPressed = false;
        this.leftPressed = false;
        this.touchStartX = null;  // プニコン式タッチの基点
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

        // ---- プニコン式タッチ操作 ----
        // タッチ開始時：指の位置とパドル位置を基点として記録
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                const rect = canvas.getBoundingClientRect();
                const scaleX = CANVAS_WIDTH / rect.width;
                this.touchStartX = e.touches[0].clientX; // 画面上の絶対ピクセル
                this.paddleStartX = this.x;               // その時のパドル位置
            }
        }, { passive: false });

        // タッチ移動時：最初からの差分をパドルに適用
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0 && this.touchStartX !== null) {
                const rect = canvas.getBoundingClientRect();
                const scaleX = CANVAS_WIDTH / rect.width;
                const deltaX = (e.touches[0].clientX - this.touchStartX) * scaleX;
                this.x = this.paddleStartX + deltaX;
                e.preventDefault();
            }
        }, { passive: false });

        // タッチ終了時：基点をリセット
        document.addEventListener('touchend', () => {
            this.touchStartX = null;
            this.paddleStartX = this.x;
        });
    }

    update() {
        if (this.rightPressed && this.x < CANVAS_WIDTH - this.width) {
            this.x += PADDLE_SPEED;
        } else if (this.leftPressed && this.x > 0) {
            this.x -= PADDLE_SPEED;
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
