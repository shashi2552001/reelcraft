# Open-Weight Video Model & Cloud GPU Integration Plan

This document evaluates open-weight video generation models for **ReelCraft Studio** under low-budget personal-use constraints.

---

## 1. Model Comparison Matrix

| Model | License | Min / Rec VRAM | Speed | Quality & Prompt Adherence | Character Consistency Path | Estimated Cloud GPU Cost |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **LTX-Video (0.9.7 / LTX-2)** | LTX-Video Community License | 16 GB / 24 GB (RTX 4090 / L4) | **Fastest** (near real-time 5s clips) | Good motion; responsive prompt following | Image-to-Video (I2V) keyframe conditioning + future LoRA | ~$0.35–$0.65 / hr (RunPod / Vast.ai) |
| **Wan 2.2 (14B / 5B)** | **Apache 2.0** (Permissive) | 24 GB / 48 GB (L40S / A100) | Medium | **Excellent** 3D anime, cinematic, and human motion fidelity | Strong I2V reference conditioning + mature LoRA tooling | ~$0.75–$1.40 / hr (L40S / A100) |
| **HunyuanVideo (13B)** | Tencent Hunyuan Community | 24 GB (quantized) / 48–80 GB | Slower | High photorealism & lighting physics | Heavier VRAM footprint for character LoRAs | ~$0.90–$1.60 / hr (A100) |

---

## 2. Recommended Phased Rollout (Low Budget)

### Phase 1: Pretrained Inference Only (No Custom Training)
- **Primary Engine for Rapid Reels**: Deploy **LTX-Video** on an on-demand 24 GB GPU (RTX 4090 or L4) using serverless scale-to-zero (Modal or RunPod Serverless) so you pay $0 while idle.
- **Primary Engine for High-Quality Episodic Stories**: Deploy **Wan 2.2** (5B on 24 GB or 14B on 48 GB L40S) when rendering final 3D Anime or Cinematic scenes.
- **Character Consistency in Phase 1**: Pass each character's locked prompt block (face, hair, clothing) + primary reference image (`character_reference_images`) into Image-to-Video / Reference conditioning.

### Phase 2: Character Consistency Fine-Tuning (LoRA)
- Once you have 10–20 clean reference frames of a recurring character (e.g., Kaito or Elena), train a lightweight **Character LoRA** (typically $2–$5 per character on rented A100/4090) and register its checkpoint URI in the `model_versions` PostgreSQL table.
- Never train a foundation model from scratch.
