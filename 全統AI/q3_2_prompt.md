# 問三⑵ バリエーション展開（i2i）生成用プロンプト案

このYAMLブロックを、⑴で生成した「ソラ」のメインビジュアルを読み込ませた状態（Image-to-Imageモード）で、画像生成AIに入力してください。

---

### 🎨 パターンA：表情差分（キリッとした戦闘顔）
「キャラの性格の多面性」を見せるための1枚です。

```yaml
target_process: Image-to-Image (i2i)
base_image: "q3_1.png (Main Visual)"
parameters:
  denoising_strength: 0.4  # 表情だけ変えるため弱めに設定
  seed: -1 (or use same seed from q3_1)

modification_prompt:
  facial_expression: "Determined and serious facial expression, sharp eyes, focused gaze looking at the camera, mouth slightly open as if shouting or serious breathing"
  lighting: "Dramatic rim lighting highlighting the character's silhouette"
  focus: "Keep original costume, horns, and wings design exactly the same"
```

---

### 🌇 パターンB：時間帯差分（黄昏の空中都市）
「エモーショナルな世界観」を演出するための1枚です。

```yaml
target_process: Image-to-Image (i2i)
base_image: "q3_1.png (Main Visual)"
parameters:
  denoising_strength: 0.55 # 背景とライティングを大きく変えるため中程度に設定

modification_prompt:
  environment: "Beautiful sunset sky, deep orange and purple gradient, twilight clouds"
  lighting: "Golden hour glow, warm light reflecting on character's face and golden armor, long shadows"
  atmosphere: "Melancholic and heroic vibe, cinematic dusk lighting"
  elements: "Maintain the floating city structure but silhouettes in the sunset"
```

---

### 🏹 パターンC：ポーズ・アクション差分（放影の瞬間）
「ゲームの爽快感」を伝える、キャンペーンの目玉となる1枚です。

```yaml
target_process: Image-to-Image (i2i)
base_image: "q3_1.png (Main Visual)"
parameters:
  denoising_strength: 0.5 # 動きとエフェクトを加えるため

modification_prompt:
  pose: "Dynamic action pose, drawing the glowing bow, aiming at the sky"
  effects: "Ethereal cyan energy particles swirling around the bow, glowing arrow manifesting, light trails"
  camera_angle: "Dynamic perspective, low angle looking up to show the vast sky"
  details: "Majestic blue wings flapping with feathers or particles scattering"
```
