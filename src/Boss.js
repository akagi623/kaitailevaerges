import { BOSS_CONFIG } from './Constants.js';

export class Boss {
    constructor(x, y, image) {
        this.x = x;
        this.y = y;
        this.width = BOSS_CONFIG.WIDTH;
        this.height = BOSS_CONFIG.HEIGHT;
        this.hp = BOSS_CONFIG.HP;
        this.maxHp = BOSS_CONFIG.HP;
        this.rawImage = image;
        this.processedImage = null;
        this.active = true;
        this.isSpriteProcessed = false;

        this.invincibilityTimer = 0;
        this.moveTimer = 0;
        this.blockTimer = 0;

        // 背景透過処理
        if (image) {
            if (image.complete && image.naturalWidth > 0) {
                this.processSprite();
            } else {
                image.onload = () => this.processSprite();
            }
        }
    }

    processSprite() {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = this.rawImage.width;
            canvas.height = this.rawImage.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(this.rawImage, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                // 暗い色（背景の黒）を透明にする
                if (data[i] < 45 && data[i+1] < 45 && data[i+2] < 45) {
                    data[i+3] = 0;
                }
            }
            ctx.putImageData(imageData, 0, 0);
            this.processedImage = new Image();
            this.processedImage.src = canvas.toDataURL();
            this.isSpriteProcessed = true;
        } catch(e) {
            console.warn('Boss sprite processing failed:', e);
        }
    }

    update(deltaTime) {
        if (!this.active) return;

        // 無敵時間の更新（ミリ秒単位で減算）
        if (this.invincibilityTimer > 0) {
            this.invincibilityTimer = Math.max(0, this.invincibilityTimer - deltaTime);
        }

        // 自律移動（左右にゆらゆら）
        this.moveTimer += deltaTime * 0.001;
        const moveRange = 90;
        this.x = (450 - this.width) / 2 + Math.sin(this.moveTimer) * moveRange;
        this.y = 90 + Math.cos(this.moveTimer * 0.5) * 15;
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.save();

        // 無敵時間中の点滅（100msごとに切り替え）
        if (this.invincibilityTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.3;
        }

        // ボス本体の描画
        const img = this.isSpriteProcessed ? this.processedImage : this.rawImage;
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, this.x, this.y, this.width, this.height);
        } else {
            // フォールバック（赤い四角）
            ctx.fillStyle = '#880000';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        ctx.restore();

        // HPバーをボス画像の真上に描画（invincibility点滅の影響を受けないよう別途save/restore）
        this.drawHpBar(ctx);
    }

    drawHpBar(ctx) {
        const barW = this.width;
        const barH = 8;
        const barX = this.x;
        const barY = this.y - 30; // ボス画像の20px上

        const hpRatio = this.hp / this.maxHp;

        ctx.save();

        // 背景バー
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

        // HPバー（HP残量に応じて色変化）
        if (hpRatio > 0.5) {
            ctx.fillStyle = '#ff5252';
        } else if (hpRatio > 0.25) {
            ctx.fillStyle = '#ff9800';
        } else {
            ctx.fillStyle = '#ff1744';
        }
        ctx.fillRect(barX, barY, barW * hpRatio, barH);

        // 枠線
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);

        // HP数値テキスト（バーの下に表示）
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.ceil(this.hp)} / ${this.maxHp}`, this.x + this.width / 2, barY - 4);

        // ボス名（最上部）
        ctx.font = 'bold 12px "Segoe UI"';
        ctx.fillStyle = '#ffcccc';
        ctx.fillText('ANCIENT AI GUARDIAN', this.x + this.width / 2, barY - 16);

        ctx.restore();
    }

    // ボールとの当たり判定チェック
    checkCollision(ballX, ballY, ballRadius) {
        if (!this.active) return null;

        const closestX = Math.max(this.x, Math.min(ballX, this.x + this.width));
        const closestY = Math.max(this.y, Math.min(ballY, this.y + this.height));

        const distanceX = ballX - closestX;
        const distanceY = ballY - closestY;
        const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

        if (distanceSquared < (ballRadius * ballRadius)) {
            return {
                hit: true,
                invincible: this.invincibilityTimer > 0,
                dx: Math.abs(distanceX) > Math.abs(distanceY) ? -1 : 0,
                dy: Math.abs(distanceY) >= Math.abs(distanceX) ? -1 : 0
            };
        }
        return null;
    }

    // ダメージ処理
    // 戻り値: true=ダメージを与えた / false=無敵中でダメージなし
    hit(damage) {
        if (!this.active) return false;

        // 無敵時間中はダメージなし
        // （LEVERAGEのリセットは呼び出し元main.jsで invincible フラグを見て行う）
        if (this.invincibilityTimer > 0) return false;

        // ダメージを与え、2秒の無敵時間を付与
        this.hp = Math.max(0, this.hp - damage);
        this.invincibilityTimer = BOSS_CONFIG.INVINCIBILITY_DURATION;

        if (this.hp <= 0) {
            this.active = false;
        }

        return true;
    }
}
