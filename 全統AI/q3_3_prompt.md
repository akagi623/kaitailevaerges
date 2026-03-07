# 問三⑶ プロモーション動画（i2v）生成用プロンプト

このYAMLブロックまたはテキストプロンプトを、動画生成AI（Runway Gen-3 Alpha, Kling AI, Luma Dream Machine, Pika Art等）で使用してください。
⑴や⑵で生成した高品質な画像をソースとして読み込ませた状態で実行します。

---

### 🎬 動画演出プロンプト（Image-to-Video）

```yaml
target_process: Image-to-Video (i2v)
source_image: "Input q3_1.png or q3_2_variant_C.png"
motion_style: "Cinematic, slow-motion, epic fantasy promotion"

animation_details:
  - Subject: "Sora (The dragon girl) gently flapping her massive blue translucent wings."
  - Hair_and_Cloth: "Soft wind blowing through her long hair and silk dress, creating elegant ripples."
  - Environment: "Fluffy white clouds in the background slowly drifting (scrolling) to create a sense of high altitude."
  - Special_Effects: "Ethereal cyan light particles and magic sparkles continuously rising from the glowing bow and horns."
  - Camera_Movement: "Slight slow zoom-in towards the character's face or subtle orbit to create 3D depth."

technical_parameters:
  motion_bucket: 30-40 (Low to Medium motion to prevent character distortion)
  fps: 24 or 30
  duration: 5 to 10 seconds (Extend as needed)
  negative_prompt: "morphing, distorted face, messy background, flickering, fast chaotic movement"
```

---

### 💡 生成のコツ（ツール別）

*   **Runway Gen-3 / Luma**: 画像をアップロードし、テキスト欄に上記 `animation_details` の内容を英語で入力してください。
*   **モーションブラシ（Runway）がある場合**:
    *   **ブラシ1**: 背景の雲を横になぞる（水平移動）。
    *   **ブラシ2**: 翼と髪を丁寧になぞる（微細な揺れ）。
    *   **ブラシ3**: 弓の周辺を上になぞる（粒子の昇り）。
*   **一貫性を保つには**: 5秒程度の短い動画をまず生成し、うまくいかなければ `motion` の値を下げてみてください。

これで「ソラ」が空中都市で息づく、最高品質のプロモーション映像が完成します！
