export class Player {
    constructor() {
        this.level = 1;
        this.exp = 0;
        this.expToNextLevel = 100; // Lv1→2は100EXP
        this.money = 0; // 所持金

        // ステータス初期値
        this.attack = 10;   // ダメージ
        this.speed = 8;     // パドル移動速度 (表示上1.0相当とする)
        this.defense = 100; // パドル幅 (初期値100)

        // 装備品
        this.ownedEquipment = []; // 所持している装備のID
        this.equippedId = null;   // 装備中のID
    }

    // 装備を含む合計攻撃力を取得
    getTotalAttack(equipmentDataList) {
        let boost = 0;
        if (this.equippedId) {
            const eq = equipmentDataList.find(e => e.id === this.equippedId);
            if (eq) boost = eq.attackBoost;
        }
        return this.attack + boost;
    }

    // EXPを追加してレベルアップ判定。レベルアップしたらtrueを返す
    addExp(amount) {
        this.exp += amount;
        if (this.exp >= this.expToNextLevel) {
            this.exp -= this.expToNextLevel;
            this.level++;
            this.expToNextLevel = 100 * this.level; // 次のレベルはさらに多く必要
            return true; // レベルアップ！
        }
        return false;
    }

    // 選択されたステータスを1段階アップ
    upgrade(stat) {
        if (stat === 'attack')  this.attack  += 5;
        if (stat === 'speed')   this.speed   += 1;
        if (stat === 'defense') this.defense += 18;
    }

    // EXP進捗（0.0 〜 1.0）
    get expRatio() {
        return this.exp / this.expToNextLevel;
    }
}
