import { Particle } from './Particle.js';
import { CANVAS_HEIGHT } from './Constants.js';

class Laser {
    constructor(x, width) {
        this.x = x;
        this.width = width;
        this.life = 1.0;
        this.decay = 0.05;
        this.active = true;
    }

    update() {
        this.life -= this.decay;
        if (this.life <= 0) {
            this.life = 0;
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        
        // メインの太い線
        const grad = ctx.createLinearGradient(this.x - this.width/2, 0, this.x + this.width/2, 0);
        grad.addColorStop(0, 'rgba(0, 255, 255, 0)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(1, 'rgba(0, 255, 255, 0)');
        
        ctx.fillStyle = grad;
        ctx.fillRect(this.x - this.width/2, 0, this.width, CANVAS_HEIGHT);
        
        // 外側の光彩
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ffff';
        ctx.strokeStyle = '#e0f7fa';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - this.width/4, 0, this.width/2, CANVAS_HEIGHT);
        
        ctx.restore();
    }
}

class DamageText {
    constructor(x, y, text, comboCount = 0) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.speedY = -1;
        this.life = 1.0;
        this.decay = 0.02;
        // 基本サイズ16px, 1コンボにつき4px増加 (最大5コンボ分まで)
        const sizeBonus = Math.min(comboCount, 5) * 4;
        this.fontSize = 16 + sizeBonus;

        // LEVERAGE数に応じて色を変更
        if (comboCount <= 1) this.color = '#ff5252'; // 赤
        else if (comboCount <= 3) this.color = '#ff9800'; // オレンジ
        else this.color = '#ffeb3b'; // 黄色
    }

    update() {
        this.y += this.speedY;
        this.life -= this.decay;
        if (this.life < 0) this.life = 0;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.font = `bold ${this.fontSize}px "Segoe UI"`;
        ctx.textAlign = 'center';

        // 縁取り（視認性向上）
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, this.x, this.y);

        // メインのテキスト
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, this.x, this.y);
        
        ctx.globalAlpha = 1.0;
    }
}

export class EffectManager {
    constructor() {
        this.particles = [];
        this.texts = [];
        this.lasers = [];
    }

    createExplosion(x, y, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y));
        }
    }

    createDamageText(x, y, text, comboCount) {
        this.texts.push(new DamageText(x, y, text, comboCount));
    }

    createLaser(x, width) {
        this.lasers.push(new Laser(x, width));
    }

    update() {
        // パーティクルの更新
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // ダメージテキストの更新
        this.texts = this.texts.filter(t => t.life > 0);
        this.texts.forEach(t => t.update());

        // レーザーの更新
        this.lasers = this.lasers.filter(l => l.active);
        this.lasers.forEach(l => l.update());
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
        this.texts.forEach(t => t.draw(ctx));
        this.lasers.forEach(l => l.draw(ctx));
    }
}
