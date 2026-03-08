import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_SPEED } from './Constants.js';

export class Paddle {
    constructor() {
        this.width = PADDLE_WIDTH;
        this.height = PADDLE_HEIGHT;
        this.x = (CANVAS_WIDTH - this.width) / 2;
        this.y = CANVAS_HEIGHT - this.height - 48; // パドルを1ブロック分上に
        this.color = COLORS.PADDLE;
        
        this.rightPressed = false;
        this.leftPressed = false;

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

        // マウス移動（キャンバスのレスポンシブ対応版）
        const handleMove = (clientX) => {
            const rect = canvas.getBoundingClientRect();
            // 画面上の位置をキャンバス内部の座標（0-800）に変換
            const scaleX = CANVAS_WIDTH / rect.width;
            const relativeX = (clientX - rect.left) * scaleX;
            
            if (relativeX > 0 && relativeX < CANVAS_WIDTH) {
                this.x = relativeX - this.width / 2;
            }
        };

        document.addEventListener('mousemove', (e) => {
            handleMove(e.clientX);
        });

        // タッチ操作への対応
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) handleMove(e.touches[0].clientX);
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                handleMove(e.touches[0].clientX);
                e.preventDefault(); // スクロール防止
            }
        }, { passive: false });
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
