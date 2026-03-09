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
        
        // ロボット用スプライトの初期化 (クラス変数として一回だけ実行)
        if (Brick.isInitialized === undefined) {
            Brick.isInitialized = true;
            Brick.isSpriteProcessed = false;
            
            const base = import.meta.env.BASE_URL || '/';
            const rawSprite = new Image();
            // Viteの挙動に合わせて、publicフォルダを介さず直接ルートから解決する
            rawSprite.src = (base + 'spider_robot.png').replace(/\/+/g, '/');
            
            rawSprite.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = rawSprite.width;
                canvas.height = rawSprite.height;
                const ctx = canvas.getContext('2d');
                
                // --- 1. 通常版 (背景除去) ---
                ctx.drawImage(rawSprite, 0, 0);
                let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                let data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    // 真っ黒に近い色を透明にする
                    if (data[i] < 35 && data[i+1] < 35 && data[i+2] < 35) data[i+3] = 0;
                }
                ctx.putImageData(imageData, 0, 0);
                Brick.processedSprite = new Image();
                Brick.processedSprite.src = canvas.toDataURL();

                // 全てセットが完了したらフラグを立てる
                Brick.isSpriteProcessed = true;
            };

            rawSprite.onerror = () => {
                console.error("Failed to load spider_robot.png from:", rawSprite.src);
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

        if (Brick.isSpriteProcessed) {
            // スプライトの選択 (カラーバリエーションを廃止し、オリジナルに統一)
            let img = Brick.processedSprite;

            if (img && img.complete) {
                ctx.save();
                ctx.globalAlpha = 0.6 + hpRatio * 0.4;
                
                // アスペクト比を維持して描画
                const spriteW = img.width || 1;
                const spriteH = img.height || 1;
                const aspect = spriteW / spriteH;
                
                const bw = this.width || BRICK_WIDTH;
                const bh = this.height || BRICK_HEIGHT;
                const drawHeight = bh * 2.8;
                const drawWidth = drawHeight * aspect;
                
                const drawX = this.x + (bw - drawWidth) / 2;
                const drawY = this.y + (bh - drawHeight) / 2;
                
                if (!isNaN(drawX) && !isNaN(drawY) && drawWidth > 0 && drawHeight > 0) {
                    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                }
                ctx.restore();
            }
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
        
        // HPの表示 (デザインを邪魔しないよう真ん中より下に配置し、点滅もやめる)
        ctx.save();
        const text = this.isIssue ? `BOSS HP: ${this.hp}` : this.hp.toString();
        ctx.font = this.isIssue ? 'bold 12px "Segoe UI"' : 'bold 15px "Segoe UI"';
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        
        // テキストの背景に半透明の黒丸/角丸を引いて読みやすくする
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        const bgW = Math.max(22, textWidth + 8);
        const bgH = 20;
        const bx = this.x + this.width / 2 - bgW / 2;
        // Y位置を真ん中より下にずらす (姿が見えるように)
        const by = this.y + this.height * 0.75 - bgH / 2;
        
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(bx, by, bgW, bgH, 10);
        } else {
            // roundRect非対応ブラウザ用フォールバック
            ctx.rect(bx, by, bgW, bgH);
        }
        ctx.fill();

        ctx.fillStyle = this.isIssue ? '#ff5252' : '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // テキストも背景に合わせる
        ctx.fillText(text, this.x + this.width / 2, by + bgH / 2 + 1);
        ctx.restore();
    }
}
