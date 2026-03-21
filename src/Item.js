import { CANVAS_HEIGHT } from './Constants.js';

export const ITEM_TYPES = {
    EXPAND: 'EXPAND',           // パドルが伸びる（旧来）
    MONEY: 'MONEY',             // お金（旧来）
    POWER_CHIP: 'POWER_CHIP',   // AIコアチップ: 攻撃力一時2倍
    NANO_SHIELD: 'NANO_SHIELD', // ナノシールド: 次の1回ミス無効
    MAGNET_BOOT: 'MAGNET_BOOT', // マグネットブーツ: 引き寄せ範囲2倍
    SPEED_WIRE: 'SPEED_WIRE',   // 加速ケーブル: ボール速度+20%
    WIDE_PLATE: 'WIDE_PLATE',   // 鉄板: パドル幅+40（永続）
    BOMB: 'BOMB',               // 電磁爆弾: 周囲3x3にダメージ
    GAUGE_PACK: 'GAUGE_PACK',   // エナジーパック: ゲージ+50
    REPAIR_KIT: 'REPAIR_KIT',   // 修理キット: ライフ+1
    COMBO_STONE: 'COMBO_STONE', // コンボストーン: コンボ保護（10秒）
    EXP_BOOSTER: 'EXP_BOOSTER', // 経験値ブースター: EXP+50
};

// ドロップ重み（合計は自由。大きいほど出やすい）
export const ITEM_DROP_WEIGHTS = {
    [ITEM_TYPES.MONEY]: 40,
    [ITEM_TYPES.EXP_BOOSTER]: 15,
    [ITEM_TYPES.GAUGE_PACK]: 12,
    [ITEM_TYPES.SPEED_WIRE]: 10,
    [ITEM_TYPES.MAGNET_BOOT]: 8,
    [ITEM_TYPES.WIDE_PLATE]: 8,
    [ITEM_TYPES.POWER_CHIP]: 7,
    [ITEM_TYPES.BOMB]: 7,
    [ITEM_TYPES.REPAIR_KIT]: 5,
    [ITEM_TYPES.NANO_SHIELD]: 5,
    [ITEM_TYPES.COMBO_STONE]: 4,
    [ITEM_TYPES.EXPAND]: 5,
};

// 重み付きランダム選択
export function getRandomItemType() {
    const entries = Object.entries(ITEM_DROP_WEIGHTS);
    const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
    let rand = Math.random() * totalWeight;
    for (const [type, weight] of entries) {
        rand -= weight;
        if (rand < 0) return type;
    }
    return ITEM_TYPES.MONEY;
}

const ITEM_STATES = {
    NORMAL: 'NORMAL',
    BOUNCING: 'BOUNCING',
    SUCKED: 'SUCKED',
    AUTO_COLLECT: 'AUTO_COLLECT'
};

// アイテムサイズ定義
const ITEM_SIZES = {
    [ITEM_TYPES.MONEY]: 16,
    [ITEM_TYPES.EXPAND]: 20,
    [ITEM_TYPES.POWER_CHIP]: 20,
    [ITEM_TYPES.NANO_SHIELD]: 20,
    [ITEM_TYPES.MAGNET_BOOT]: 20,
    [ITEM_TYPES.SPEED_WIRE]: 18,
    [ITEM_TYPES.WIDE_PLATE]: 24,
    [ITEM_TYPES.BOMB]: 20,
    [ITEM_TYPES.GAUGE_PACK]: 20,
    [ITEM_TYPES.REPAIR_KIT]: 20,
    [ITEM_TYPES.COMBO_STONE]: 18,
    [ITEM_TYPES.EXP_BOOSTER]: 20,
};

export class Item {
    constructor(x, y, type) {
        const size = ITEM_SIZES[type] || 20;
        this.x = x - size / 2;
        this.y = y - size / 2;
        this.width = size;
        this.height = size;
        this.type = type;
        this.speedX = (Math.random() - 0.5) * 2;
        this.speedY = -2; // 最初は少し浮く
        this.active = true;
        this.state = ITEM_STATES.AUTO_COLLECT;
        this.collectTimer = 0;
        this.bounceTimer = 0;
        this.glowPhase = Math.random() * Math.PI * 2; // ちらつき用
    }

    update(paddle) {
        this.glowPhase += 0.1;

        if (this.state === ITEM_STATES.NORMAL) {
            this.y += this.speedY;
            this.x += this.speedX;
        } else if (this.state === ITEM_STATES.BOUNCING) {
            this.bounceTimer++;
            this.y -= 3;
            if (this.bounceTimer > 10) {
                this.state = ITEM_STATES.SUCKED;
            }
        } else if (this.state === ITEM_STATES.AUTO_COLLECT) {
            this.collectTimer++;
            if (this.collectTimer < 20) {
                this.y += this.speedY;
                this.x += this.speedX;
                this.speedY *= 0.9;
                this.speedX *= 0.9;
            } else {
                this.state = ITEM_STATES.SUCKED;
                this.speedX = 0;
                this.speedY = 0;
            }
        } else if (this.state === ITEM_STATES.SUCKED) {
            const targetX = paddle.x + paddle.width / 2;
            const targetY = paddle.y + paddle.height / 2;
            const dx = targetX - (this.x + this.width / 2);
            const dy = targetY - (this.y + this.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 5) {
                const accel = this.type === ITEM_TYPES.MONEY ? 3.0 : 2.0;
                this.speedX += (dx / dist) * accel;
                this.speedY += (dy / dist) * accel;
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

        if (this.y > CANVAS_HEIGHT + 100) {
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
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const r = this.width / 2;
        const glow = 0.6 + Math.sin(this.glowPhase) * 0.4;

        ctx.save();
        switch (this.type) {
            case ITEM_TYPES.MONEY:
                this._drawMoney(ctx, cx, cy, r, glow);
                break;
            case ITEM_TYPES.EXPAND:
                this._drawExpand(ctx, cx, cy, r);
                break;
            case ITEM_TYPES.POWER_CHIP:
                this._drawPowerChip(ctx, cx, cy, r, glow);
                break;
            case ITEM_TYPES.NANO_SHIELD:
                this._drawNanoShield(ctx, cx, cy, r, glow);
                break;
            case ITEM_TYPES.MAGNET_BOOT:
                this._drawMagnetBoot(ctx, cx, cy, r, glow);
                break;
            case ITEM_TYPES.SPEED_WIRE:
                this._drawSpeedWire(ctx, cx, cy, r, glow);
                break;
            case ITEM_TYPES.WIDE_PLATE:
                this._drawWidePlate(ctx, cx, cy, r, glow);
                break;
            case ITEM_TYPES.BOMB:
                this._drawBomb(ctx, cx, cy, r, glow);
                break;
            case ITEM_TYPES.GAUGE_PACK:
                this._drawGaugePack(ctx, cx, cy, r, glow);
                break;
            case ITEM_TYPES.REPAIR_KIT:
                this._drawRepairKit(ctx, cx, cy, r, glow);
                break;
            case ITEM_TYPES.COMBO_STONE:
                this._drawComboStone(ctx, cx, cy, r, glow);
                break;
            case ITEM_TYPES.EXP_BOOSTER:
                this._drawExpBooster(ctx, cx, cy, r, glow);
                break;
        }
        ctx.restore();
    }

    _drawMoney(ctx, cx, cy, r, glow) {
        ctx.shadowColor = '#ffdf00';
        ctx.shadowBlur = 8 * glow;
        ctx.fillStyle = '#ffdf00';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#b8860b';
        ctx.font = `bold ${Math.round(r * 1.2)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('¥', cx, cy + 1);
    }

    _drawExpand(ctx, cx, cy, r) {
        ctx.fillStyle = '#4caf50';
        ctx.beginPath();
        ctx.rect(cx - r, cy - r, r * 2, r * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(r)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('E', cx, cy);
    }

    // ① AIコアチップ（緑の六角形）
    _drawPowerChip(ctx, cx, cy, r, glow) {
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 12 * glow;
        ctx.fillStyle = '#003322';
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        this._hexPath(ctx, cx, cy, r);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#00ff88';
        ctx.font = `bold ${Math.round(r * 0.9)}px "Segoe UI"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('AI', cx, cy);
    }

    // ② ナノシールド（青い盾）
    _drawNanoShield(ctx, cx, cy, r, glow) {
        ctx.shadowColor = '#4fc3f7';
        ctx.shadowBlur = 12 * glow;
        ctx.fillStyle = '#01579b';
        ctx.strokeStyle = '#4fc3f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r * 0.85, cy - r * 0.3);
        ctx.lineTo(cx + r * 0.7, cy + r * 0.7);
        ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r * 0.7, cy + r * 0.7);
        ctx.lineTo(cx - r * 0.85, cy - r * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#b3e5fc';
        ctx.font = `bold ${Math.round(r * 0.9)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⛊', cx, cy + 1);
    }

    // ③ マグネットブーツ
    _drawMagnetBoot(ctx, cx, cy, r, glow) {
        ctx.shadowColor = '#e040fb';
        ctx.shadowBlur = 10 * glow;
        ctx.fillStyle = '#4a0072';
        ctx.strokeStyle = '#e040fb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI, 0);
        ctx.lineTo(cx + r, cy + r * 0.5);
        ctx.lineTo(cx - r, cy + r * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // 磁力線
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ce93d8';
        ctx.lineWidth = 1.5;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * r * 0.5, cy - r * 0.3);
            ctx.lineTo(cx + i * r * 0.5, cy - r * 0.8);
            ctx.stroke();
        }
    }

    // ④ 加速ケーブル（稲妻）
    _drawSpeedWire(ctx, cx, cy, r, glow) {
        ctx.shadowColor = '#ffeb3b';
        ctx.shadowBlur = 14 * glow;
        ctx.fillStyle = '#1a1a00';
        ctx.strokeStyle = '#ffeb3b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffeb3b';
        ctx.strokeStyle = '#ff6f00';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.1, cy - r * 0.8);
        ctx.lineTo(cx - r * 0.25, cy);
        ctx.lineTo(cx + r * 0.2, cy);
        ctx.lineTo(cx - r * 0.1, cy + r * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // ⑤ 鉄板（拡張板）
    _drawWidePlate(ctx, cx, cy, r, glow) {
        ctx.shadowColor = '#90a4ae';
        ctx.shadowBlur = 8 * glow;
        const w = r * 2.2, h = r * 1.2;
        ctx.fillStyle = '#455a64';
        ctx.strokeStyle = '#90a4ae';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#eceff1';
        ctx.font = `bold ${Math.round(r * 0.7)}px "Segoe UI"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('←→', cx, cy);
    }

    // ⑥ 電磁爆弾
    _drawBomb(ctx, cx, cy, r, glow) {
        ctx.shadowColor = '#ff5722';
        ctx.shadowBlur = 12 * glow;
        ctx.fillStyle = '#bf360c';
        ctx.strokeStyle = '#ff8a65';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy + r * 0.1, r * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // 導線
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r * 0.75);
        ctx.quadraticCurveTo(cx + r * 0.5, cy - r * 1.3, cx + r * 0.3, cy - r * 1.0);
        ctx.stroke();
        // 火花
        ctx.shadowBlur = 6 * glow;
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(cx + r * 0.3, cy - r * 1.0, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffccbc';
        ctx.font = `bold ${Math.round(r * 0.7)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💥', cx, cy + r * 0.1);
    }

    // ⑦ エナジーパック（電池）
    _drawGaugePack(ctx, cx, cy, r, glow) {
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 12 * glow;
        const w = r * 1.4, h = r * 2;
        ctx.fillStyle = '#006064';
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 3);
        ctx.fill();
        ctx.stroke();
        // 電池端子
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(cx - w * 0.25, cy - h / 2 - 3, w * 0.5, 4);
        // エネルギーバー
        ctx.fillStyle = `rgba(0,229,255,${0.5 + glow * 0.5})`;
        ctx.fillRect(cx - w / 2 + 3, cy + h / 2 - 6, (w - 6) * 0.7, -h * 0.6);
        ctx.fillStyle = '#e0f7fa';
        ctx.font = `bold ${Math.round(r * 0.7)}px "Segoe UI"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+50', cx, cy);
    }

    // ⑧ 修理キット（赤十字）
    _drawRepairKit(ctx, cx, cy, r, glow) {
        ctx.shadowColor = '#f44336';
        ctx.shadowBlur = 10 * glow;
        ctx.fillStyle = '#b71c1c';
        ctx.strokeStyle = '#ef9a9a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        const arm = r * 0.55, thick = r * 0.28;
        ctx.fillRect(cx - thick, cy - arm, thick * 2, arm * 2);
        ctx.fillRect(cx - arm, cy - thick, arm * 2, thick * 2);
    }

    // ⑨ コンボストーン（虹色宝石）
    _drawComboStone(ctx, cx, cy, r, glow) {
        const hue = (Date.now() / 30) % 360;
        ctx.shadowColor = `hsl(${hue},100%,60%)`;
        ctx.shadowBlur = 14 * glow;
        // ダイヤ形
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r, cy);
        ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r, cy);
        ctx.closePath();
        const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        grad.addColorStop(0, `hsl(${hue},100%,60%)`);
        grad.addColorStop(0.5, `hsl(${(hue + 120) % 360},100%,60%)`);
        grad.addColorStop(1, `hsl(${(hue + 240) % 360},100%,60%)`);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // ⑩ 経験値ブースター（光る星）
    _drawExpBooster(ctx, cx, cy, r, glow) {
        ctx.shadowColor = '#ffe082';
        ctx.shadowBlur = 14 * glow;
        ctx.fillStyle = '#ffe082';
        ctx.strokeStyle = '#ff6f00';
        ctx.lineWidth = 1.5;
        this._starPath(ctx, cx, cy, r * 0.95, r * 0.45, 5);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#5d4037';
        ctx.font = `bold ${Math.round(r * 0.7)}px "Segoe UI"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('EXP', cx, cy + 1);
    }

    // --- ヘルパー ---
    _hexPath(ctx, cx, cy, r) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const px = cx + r * Math.cos(angle);
            const py = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    _starPath(ctx, cx, cy, outerR, innerR, points) {
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const angle = (Math.PI / points) * i - Math.PI / 2;
            const r = i % 2 === 0 ? outerR : innerR;
            const px = cx + r * Math.cos(angle);
            const py = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }
}
