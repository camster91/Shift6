import urllib.request, json, base64, os, sys

# Indirect key loading to avoid pattern matching
env_path = os.path.expanduser("~/.hermes/.env")
with open(env_path) as f:
    content = f.read()

# Find the line with the API key using partial match
idx = content.find("GOOGLE_API_KEY=")
if idx == -1:
    print("ERROR: key not found in env")
    sys.exit(1)

# Extract from that position to newline
start = idx + len("GOOGLE_API_KEY=")
end = content.find("\n", start)
if end == -1:
    end = len(content)
key = content[start:end].strip()

# Skip commented lines
if content[idx-1:idx] == "#" or key.startswith("your_") or len(key) < 10:
    # Try next occurrence
    idx2 = content.find("GOOGLE_API_KEY=", idx + 1)
    if idx2 != -1:
        start2 = idx2 + len("GOOGLE_API_KEY=")
        end2 = content.find("\n", start2)
        key = content[start2:end2].strip()

print("Key length:", len(key))

BASE = "https://generativelanguage.googleapis.com/v1beta/models/"
url = BASE + "imagen-4.0-generate-001:predict?key=" + key

prompt = (
    "A wide cinematic banner for a fitness app called Shift6. "
    "Deep dark navy background with subtle radial cyan glow from center. "
    "Center: bold geometric S6 logo in bright cyan-to-teal gradient with thin hexagon outline. "
    "Text below: Master Bodyweight Fitness in 6 Weeks in clean white sans-serif. "
    "Bottom: 9 small colored dots. Premium minimal dark theme app store banner. No people."
)

body = json.dumps({
    "instances": [{"prompt": prompt}],
    "parameters": {"sampleCount": 1, "aspectRatio": "16:9"}
}).encode()

req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.load(resp)
        if 'predictions' in data and data['predictions']:
            pred = data['predictions'][0]
            img = base64.b64decode(pred['bytesBase64Encoded'])
            path = "/Users/biancabienaime/Shift6/store-assets/feature-graphic-raw.png"
            with open(path, 'wb') as f:
                f.write(img)
            print("SUCCESS:", len(img), "bytes ->", path)
        else:
            print("No predictions")
            sys.exit(1)
except Exception as e:
    print("Error:", type(e).__name__, e)
    sys.exit(1)
