#!/usr/bin/env python3
"""Regenerate rejected assets with corrected prompts."""
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
DELAY = 6

ASSETS = [
    ("store-assets/icon-v2.png",
     "A premium fitness app icon. A bold, solid silhouette of an athletic human figure in mid-pushup position (body straight, arms extended) rendered as a single solid neon cyan-teal shape. The figure is thick and chunky, not thin line art — more like a bold sports pictogram. Deep dark navy background (#0B1120) with subtle radial teal glow behind the figure. No text, no numbers, no letters. Rounded square app icon format. The silhouette is solid filled with slight inner gradient, not hollow outline. Strong contrast, readable at 60x60 pixels. Modern athletic brand feel like Nike or Strava.",
     "1:1"),

    ("store-assets/feature-v2.png",
     "A wide cinematic Google Play feature graphic for a bodyweight fitness app called Shift6. Deep dark navy background. A strong athletic human figure doing a perfect push-up, shown as a glowing solid silhouette in bright orange-to-yellow gradient (warm, energetic, not cold cyan). Bold white sans-serif text at top: 'Master Bodyweight Fitness'. Below the figure, smaller white text: '6-Week Program · No Equipment'. The figure shows real human strength and motion — muscular, grounded, powerful. The orange glow creates warmth and motivation. No pagination dots, no device frames. Premium fitness brand banner feel.",
     "16:9"),

    ("public/assets/images/squat-v2.png",
     "Minimalist flat-vector 3D fitness illustration of a gender-neutral stylized geometric athlete performing a bodyweight air squat (no barbell, no weights, no equipment at all) in the bottom position with thighs parallel to ground. Duotone with bright cyan body segments and dark charcoal gray (#1e293b) joints. Pure white background, soft diffuse gray drop shadow beneath figure. Isometric perspective, clean geometric shapes (spheres, cylinders, cuboids). Modern sports-app icon style. No text, no faces, no equipment. Abstract humanoid figure made of simple 3D shapes. 1024x1024.",
     "1:1"),

    ("public/assets/images/vup-v2.png",
     "Minimalist flat-vector 3D fitness illustration of a gender-neutral stylized geometric athlete performing a V-up abdominal exercise with straight legs and straight arms extended overhead, body forming a sharp V shape with only the buttocks touching the ground. Duotone with indigo-purple body segments and dark charcoal gray (#1e293b) joints. Pure white background, soft diffuse gray drop shadow. Isometric perspective, clean geometric shapes. Modern sports-app icon style. No text, no faces, no equipment. Abstract humanoid figure. 1024x1024.",
     "1:1"),
]

def generate(path, prompt, aspect):
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
                img = base64.b64decode(pred['bytesBase64Encoded'])
                with open(path, 'wb') as f:
                    f.write(img)
                print(f"  OK  {len(img):>8,} bytes -> {path}")
                return True
            else:
                print(f"  FAIL {path} — no predictions")
                return False
    except Exception as e:
        print(f"  FAIL {path} — {e}")
        return False

print(f"Regenerating {len(ASSETS)} rejected assets...")
ok = 0
for i, (path, prompt, aspect) in enumerate(ASSETS, 1):
    full = f"/Users/biancabienaime/Shift6/{path}"
    print(f"[{i}/{len(ASSETS)}] {os.path.basename(path)}")
    if generate(full, prompt, aspect):
        ok += 1
    if i < len(ASSETS):
        time.sleep(DELAY)

print(f"\nDone: {ok}/{len(ASSETS)} regenerated")
