# GitHub Actions CI — Auto-build + deploy for Shift6

Three workflows to ship:

1. **armor-web-ci.yml** — On push to `main`, build Shift6 PWA, deploy via SSH to VPS
2. **armor-landing-ci.yml** — On push to `main` in armor-landing, build static, deploy
3. **armor-sync-api-ci.yml** — On push to `main` in armor-sync-api, build Docker, deploy

Each requires the same GitHub Secrets (set in repo Settings → Secrets):
- `VPS_SSH_KEY` — private key matching `coolify_new` on Cam's laptop
- `VPS_HOST` — `187.77.26.99`

---

## armor-web-ci.yml (place in `~/Shift6/.github/workflows/`)

```yaml
name: Build and Deploy Shift6 PWA

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to VPS
        env:
          VPS_SSH_KEY: ${{ secrets.VPS_SSH_KEY }}
          VPS_HOST: ${{ secrets.VPS_HOST }}
        run: |
          # Create a tarball of the dist
          tar -czf /tmp/armor-web.tar.gz -C dist .

          # Push via SSH using ssh-agent
          mkdir -p ~/.ssh
          echo "$VPS_SSH_KEY" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan -H $VPS_HOST >> ~/.ssh/known_hosts 2>/dev/null

          ssh -i ~/.ssh/id_ed25519 root@$VPS_HOST << 'EOF'
            set -e
            CONTAINER=$(docker ps --format '{{.Names}}' | grep toc8kck8g08k8g0co0gg8ggs)
            if [ -z "$CONTAINER" ]; then
              echo "ERROR: existing PWA container not found"
              exit 1
            fi
            WEBROOT=$(docker inspect $CONTAINER --format '{{json .Mounts}}' | python3 -c "import json,sys; ms=json.load(sys.stdin); print([m['Source'] for m in ms if m.get('Destination')=='/app' or 'public' in m.get('Destination','')] or ['/data/coolify/applications/toc8kck8g08k8g0co0gg8ggs/dist'])" | head -1)
            echo "Deploying to $WEBROOT"
            rm -rf $WEBROOT
            mkdir -p $WEBROOT
            tar -xzf /tmp/armor-web.tar.gz -C $WEBROOT
            docker restart $CONTAINER
          EOF
```

---

## armor-landing-ci.yml (place in `~/projects/armor-landing/.github/workflows/`)

```yaml
name: Build and Deploy Shift6 Landing

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy
        env:
          VPS_SSH_KEY: ${{ secrets.VPS_SSH_KEY }}
          VPS_HOST: ${{ secrets.VPS_HOST }}
        run: |
          mkdir -p ~/.ssh
          echo "$VPS_SSH_KEY" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan -H $VPS_HOST >> ~/.ssh/known_hosts 2>/dev/null

          ssh -i ~/.ssh/id_ed25519 root@$VPS_HOST << 'EOF'
            set -e
            rm -rf /root/armor-landing/dist
            mkdir -p /root/armor-landing/dist
          EOF
          scp -i ~/.ssh/id_ed25519 -r dist/* root@$VPS_HOST:/root/armor-landing/dist/
          ssh -i ~/.ssh/id_ed25519 root@$VPS_HOST "docker restart armor-landing"
```

---

## armor-sync-api-ci.yml (place in `~/projects/armor-sync-api/.github/workflows/`)

```yaml
name: Build and Deploy Shift6 Sync API

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t armor-sync-api:latest .

      - name: Save image
        run: docker save armor-sync-api:latest | gzip > /tmp/armor-sync-api.tar.gz

      - name: Deploy
        env:
          VPS_SSH_KEY: ${{ secrets.VPS_SSH_KEY }}
          VPS_HOST: ${{ secrets.VPS_HOST }}
        run: |
          mkdir -p ~/.ssh
          echo "$VPS_SSH_KEY" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan -H $VPS_HOST >> ~/.ssh/known_hosts 2>/dev/null

          # Push image
          scp -i ~/.ssh/id_ed25519 /tmp/armor-sync-api.tar.gz root@$VPS_HOST:/tmp/
          ssh -i ~/.ssh/id_ed25519 root@$VPS_HOST << 'EOF'
            set -e
            cd /root/armor-sync-api
            docker load -i /tmp/armor-sync-api.tar.gz
            docker rm -f armor-sync-api 2>/dev/null || true
            docker run -d \
              --name armor-sync-api \
              --network coolify \
              --restart unless-stopped \
              -p 4001:4001 \
              --env-file .env \
              -l traefik.enable=true \
              -l "traefik.http.routers.armor-sync-api.rule=Host(\`sync.getshift6.com\`)" \
              -l "traefik.http.routers.armor-sync-api.tls=true" \
              -l "traefik.http.routers.armor-sync-api.tls.certresolver=letsencrypt" \
              -l "traefik.http.routers.armor-sync-api.entrypoints=https" \
              -l "traefik.http.services.armor-sync-api.loadbalancer.server.port=4001" \
              -l coolify.managed=true \
              armor-sync-api:latest
            echo "API redeployed. Sleeping 5s for boot..."
            sleep 5
            docker exec armor-sync-api wget -qO- http://127.0.0.1:4001/health || echo "API not yet healthy"
          EOF
```

---

## GitHub Secrets Setup (one-time)

For each repo (`camster91/shift6`, `camster91/armor-landing`, `camster91/armor-sync-api`):

1. Go to Settings → Secrets and variables → Actions → New repository secret
2. Name: `VPS_SSH_KEY`
3. Value: contents of `~/.ssh/coolify_new` (private key)
4. Name: `VPS_HOST`
5. Value: `187.77.26.99`

Cam's local key `coolify_new` should match. If using a different key, use that.

---

## What this gives you

- **Push to main → live in ~3 min**
- Web PWA: `getshift6.com` auto-updates
- Landing: `armor.ashbi.ca` auto-updates
- Sync API: `sync.getshift6.com` auto-rebuilds + restarts

Total: 3 repos, 3 workflows, 3 secrets. ~20 minutes of GitHub UI to set up.
