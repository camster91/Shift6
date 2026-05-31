#!/usr/bin/env python3
"""Batch generate Shift6 image assets using Imagen 4."""
import urllib.request, json, base64, os, sys, time

# Load API key
env_path = os.path.expanduser("~/.hermes/.env")
key = None
with open(env_path) as f:
    for line in f:
        if line.startswith("GOOGLE_API_KEY=") and not line.startswith("#"):
            key = line.split("=", 1)[1].strip()
            if key.startswith("your_") or len(key) < 10:
                key = None
                continue
            break

if not key:
    print("ERROR: No valid GOOGLE_API_KEY found")
    sys.exit(1)

BASE = "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=" + key
DELAY = 6  # seconds between requests

# Asset definitions: (output_path, prompt, aspect_ratio)
ASSETS = [
    # --- APP ICON ---
    ("store-assets/icon-v1.png",
     "A premium fitness app icon for an app called Shift6. A bold geometric human figure in a dynamic athletic pose (mid-stride running or mid-pushup) rendered as a single continuous neon cyan-teal gradient line on a deep dark navy background (#0B1120). The figure is simple, abstract, and iconic - like a stylized stick figure made of flowing energy lines. No text, no numbers, no letters. Rounded square format with soft inner glow. Clean, minimal, modern sportswear brand aesthetic. High contrast, instantly recognizable at 60x60 pixels.",
     "1:1"),

    # --- FEATURE GRAPHIC ---
    ("store-assets/feature-v1.png",
     "A wide cinematic Google Play feature graphic for a bodyweight fitness app. Deep dark navy background. A strong, athletic silhouette of a person doing a push-up in the center, rendered as a glowing neon cyan-teal wireframe/energy trace. Above the figure, bold clean white sans-serif text reads 'Master Bodyweight Fitness'. Below, smaller text '6-Week Progressive System'. No pagination dots, no UI chrome, no device frames. Dynamic, energetic, motivating. The figure shows motion and strength. Premium dark theme fitness brand feel.",
     "16:9"),

    # --- EXERCISE ILLUSTRATION: PUSH-UPS ---
    ("public/assets/images/pushup-v1.png",
     "Minimalist flat-vector 3D fitness illustration of a gender-neutral stylized geometric athlete performing a push-up in the bottom position. Duotone with warm orange-amber body segments and dark charcoal gray (#1e293b) joints. Pure white background, soft diffuse gray drop shadow beneath figure. Isometric perspective, clean geometric shapes (spheres, cylinders, cuboids). Modern sports-app icon style. No text, no faces, no equipment branding. Abstract humanoid figure made of simple 3D shapes. 1024x1024.",
     "1:1"),

    # --- EXERCISE ILLUSTRATION: SQUATS ---
    ("public/assets/images/squat-v1.png",
     "Minimalist flat-vector 3D fitness illustration of a gender-neutral stylized geometric athlete performing a squat in the bottom position. Duotone with bright cyan body segments and dark charcoal gray (#1e293b) joints. Pure white background, soft diffuse gray drop shadow beneath figure. Isometric perspective, clean geometric shapes. Modern sports-app icon style. No text, no faces. Abstract humanoid figure. 1024x1024.",
     "1:1"),

    # --- EXERCISE ILLUSTRATION: LUNGES ---
    ("public/assets/images/lunge-v1.png",
     "Minimalist flat-vector 3D fitness illustration of a gender-neutral stylized geometric athlete performing a lunge in the mid-movement position. Duotone with emerald green body segments and dark charcoal gray (#1e293b) joints. Pure white background, soft diffuse gray drop shadow. Isometric perspective, clean geometric shapes. Modern sports-app icon style. No text, no faces. Abstract humanoid figure. 1024x1024.",
     "1:1"),

    # --- EXERCISE ILLUSTRATION: GLUTE BRIDGE ---
    ("public/assets/images/glutebridge-v1.png",
     "Minimalist flat-vector 3D fitness illustration of a gender-neutral stylized geometric athlete performing a glute bridge in the top position (hips fully extended). Duotone with magenta-pink body segments and dark charcoal gray (#1e293b) joints. Pure white background, soft diffuse gray drop shadow. Isometric perspective, clean geometric shapes. Modern sports-app icon style. No text, no faces. Abstract humanoid figure. 1024x1024.",
     "1:1"),

    # --- EXERCISE ILLUSTRATION: V-UPS ---
    ("public/assets/images/vup-v1.png",
     "Minimalist flat-vector 3D fitness illustration of a gender-neutral stylized geometric athlete performing a V-up crunch in mid-movement (torso and legs raised toward center). Duotone with indigo-blue body segments and dark charcoal gray (#1e293b) joints. Pure white background, soft diffuse gray drop shadow. Isometric perspective, clean geometric shapes. Modern sports-app icon style. No text, no faces. Abstract humanoid figure. 1024x1024.",
     "1:1"),
]

def generate(path, prompt, aspect):
    """Generate a single image via Imagen 4."""
    body = json.dumps({
        "instances": [{"prompt": prompt}],
        "parameters": {"sampleCount": 1, "aspectRatio": aspect}
    }).encode()

    req = urllib.request.Request(BASE, data=body, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.load(resp)
            if 'predictions' in data and data['predictions']:
                pred = data['predictions'][0]
                img_bytes = base64.b64decode(pred['bytesBase64Encoded'])
                with open(path, 'wb') as f:
                    f.write(img_bytes)
                print(f"  OK  {len(img_bytes):>8,} bytes -> {path}")
                return True
            else:
                print(f"  FAIL {path} — no predictions: {json.dumps(data, indent=2)[:200]}")
                return False
    except urllib.error.HTTPError as e:
        print(f"  FAIL {path} — HTTP {e.code}: {e.read().decode()[:200]}")
        return False
    except Exception as e:
        print(f"  FAIL {path} — {e}")
        return False

def main():
    print(f"Generating {len(ASSETS)} assets with Imagen 4...")
    print(f"Key length: {len(key)}")
    print(f"Delay: {DELAY}s between requests")
    print()

    success = 0
    for i, (path, prompt, aspect) in enumerate(ASSETS, 1):
        full_path = f"/Users/biancabienaime/Shift6/{path}"
        print(f"[{i}/{len(ASSETS)}] {os.path.basename(path)}")
        if generate(full_path, prompt, aspect):
            success += 1
        if i < len(ASSETS):
            time.sleep(DELAY)

    print()
    print(f"Done: {success}/{len(ASSETS)} generated successfully")

if __name__ == "__main__":
    main()
