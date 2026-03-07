import { Particle } from './Particle.js';
import { CANVAS_HEIGHT } from './Constants.js';

class Laser {
    constructor(x, width, startY) {
        this.x = x;
        this.width = width;
        this.startY = startY;
        this.life = 1.0;
        this.decay = 0.04;
        this.active = true;
        this.pulse = 0;
    }

    update() {
        this.life -= this.decay;
        this.pulse += 0.5;
        if (this.life <= 0) {
            this.life = 0;
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        
        // パルスによる幅の変動
        const pulseWidth = this.width * (0.8 + Math.sin(this.pulse) * 0.2);
        
        // 外側の大きな光彩
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#00ffff';
        
        // 1. 最外周の淡い光
        const gradOuter = ctx.createLinearGradient(this.x - pulseWidth, 0, this.x + pulseWidth, 0);
        gradOuter.addColorStop(0, 'rgba(0, 255, 255, 0)');
        gradOuter.addColorStop(0.5, 'rgba(0, 255, 255, 0.3)');
        gradOuter.addColorStop(1, 'rgba(0, 255, 255, 0)');
        ctx.fillStyle = gradOuter;
        ctx.fillRect(this.x - pulseWidth, 0, pulseWidth * 2, this.startY);

        // 2. メインの光線
        const gradMain = ctx.createLinearGradient(this.x - pulseWidth/2, 0, this.x + pulseWidth/2, 0);
        gradMain.addColorStop(0, 'rgba(0, 255, 255, 0.2)');
        gradMain.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
        gradMain.addColorStop(1, 'rgba(0, 255, 255, 0.2)');
        ctx.fillStyle = gradMain;
        ctx.fillRect(this.x - pulseWidth/2, 0, pulseWidth, this.startY);

        // 3. 中心部の鋭い芯（エネルギーの核）
        const coreWidth = pulseWidth * 0.2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffffff';
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - coreWidth/2, 0, coreWidth, this.startY);
        
        // 根元（パドルとの接点）のスパーク
        if (Math.random() > 0.5) {
            ctx.beginPath();
            ctx.arc(this.x, this.startY, pulseWidth, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fill();
        }

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

    createLaser(x, width, startY) {
        this.lasers.push(new Laser(x, width, startY));
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
