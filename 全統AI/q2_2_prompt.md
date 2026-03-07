# 問二⑵ 協調動作と故障時の代替 フロー図生成用プロンプト

このYAMLブロックを画像生成AI（DALL-E 3やMidjourney、ChatGPTなど）に貼り付けてください。

```yaml
target_image:
  layout: sequential_flowchart
  direction: top_to_bottom
  theme: "Robot Intelligence & Failover Logistics"
  style: "Clean professional flowchart, modern flat design, business infographic"
  language: "Japanese"

flowchart_structure:
  section_1_cooperation:
    title: "自律的協調プロセス"
    nodes:
      - id: c1
        label: "ゲストを検知"
        shape: "Diamond"
      - id: c2
        label: "位置情報をメッシュNWで全台共有"
        shape: "Rectangle"
      - id: c3
        label: "動的動線生成 (スティグマジー)"
        shape: "Rectangle"
      - id: c4
        label: "ゲストの死角へ退避し、道を譲る"
        shape: "Rounded Rectangle"
    edges:
      - "c1 -> c2 -> c3 -> c4"

  section_2_failover:
    title: "故障発生時の代替プロセス"
    nodes:
      - id: f1
        label: "1台が異常検知 (Offline)"
        shape: "Cloud/Flash"
        color: "Red"
      - id: f2
        label: "クラウド脳が周辺ロボを特定"
        shape: "Rectangle"
      - id: f3
        label: "マルチロール再配分アルゴリズム"
        shape: "Diamond"
      - id: f4
        label: "他種ロボが緊急タスクを肩代わり"
        shape: "Rounded Rectangle"
        color: "Green"
    edges:
      - "f1 -> f2 -> f3 -> f4"

visual_logic:
  - "Use clear connecting arrows showing the sequence"
  - "Distinct color coding: Blue for Cooperation, Red/Green for Failover"
  - "Icons: Robot silhouettes, Guest silhouette, Warning sign for failure"
  - "White background, high contrast, text in Japanese as written above"
```
