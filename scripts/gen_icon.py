import urllib.request, json, base64

# Load API key from env
API_KEY=*** open('/Users/biancabienaime/.hermes/.env') as f:
    for line in f:
        if line.startswith('GOOGLE_API_KEY=*** and len(line) > 20:
            API_KEY=line[15:].strip()
            break

print("Key length:", len(API_KEY))

base_url = "https://generativelanguage.googleapis.com/v1beta/models/"

# Try imagen-4.0-generate-001
url = base_url + "imagen-4.0-generate-001:predict?key=" + API_KEY

payload = json.dumps({
    "instances": [{"prompt": "A premium dark-themed fitness app icon, geometric S and 6 logo in cyan gradient on deep navy background, hexagon border, minimal, no text, app store quality"}],
    "parameters": {"sampleCount": 1, "aspectRatio": "1:1"}
}).encode()

req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.load(resp)
        if 'predictions' in data and data['predictions']:
            pred = data['predictions'][0]
            img = base64.b64decode(pred['bytesBase64Encoded'])
            path = "/Users/biancabienaime/Shift6/public/pwa-1024x1024.png"
            with open(path, 'wb') as f:
                f.write(img)
            print("SUCCESS:", len(img), "bytes ->", path)
        else:
            print("No predictions:", json.dumps(data, indent=2)[:300])
except urllib.error.HTTPError as e:
    print("HTTP", e.code, ":", e.read().decode()[:300])
except Exception as e:
    print("Error:", e)
