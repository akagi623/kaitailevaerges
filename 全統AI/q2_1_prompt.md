# 問二⑴ 役割定義とタスク割り当て 生成用プロンプト

画像生成AIに以下のYAMLブロックを貼り付けて、システム構成図を作成してください。

```yaml
target_image:
  layout: high_quality_system_architecture_diagram
  theme: "Hotel Robot Swarm Intelligence Management"
  style: "Clean, professional, vector-style business infographic"
  language: "Japanese"

components:
  central_system:
    label: "クラウド・ブレイン (全体最適化)"
    role: "メッシュネットワーク経由で全ロボットの負荷とゲスト位置を管理"
  robots:
    - id: 1
      type: "コンシェルジュロボ (2台)"
      functions: ["館内・観光案内", "多言語対応", "閑散期の指揮官モード"]
    - id: 2
      type: "デリバリーロボ (5台)"
      functions: ["ルームサービス配送", "アメニティ補充", "移動中のセンサー検知"]
    - id: 3
      type: "清掃ロボ (3台)"
      functions: ["自動清掃/ゴミ回収", "繁忙期の配送補助"]
    - id: 4
      type: "セキュリティロボ (2台)"
      functions: ["館内巡回/不審者検知", "ロビーでの簡易誘導"]

logic_protocols:
  busy_hour:
    title: "繁忙期優先制御プロトコル (15:00-18:00)"
    rules: 
      - "デリバリーの優先度：最上位"
      - "清掃リソースの50%を配送支援へ転換"
      - "セキュリティロボがフロントの混雑緩和を補助"

visual_elements:
  - "Connectivity lines showing swarm communication (Mesh Network)"
  - "Gantt-style or Gauge charts showing resource reallocation"
  - "Icons representing the 4 types of robots"
  - "White background, blue and grey accents, clear Japanese text"
```
