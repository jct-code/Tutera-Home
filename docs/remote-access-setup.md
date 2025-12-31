# Remote Access Setup Guide

This guide explains how to set up Tutera-Home for remote access without requiring a VPN connection to your home network.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           INTERNET                                   │
│                                                                      │
│   ┌───────────────┐                      ┌───────────────────────┐  │
│   │  Remote User  │                      │   Vercel Cloud        │  │
│   │  (Phone/PC)   │◄────────────────────►│   (Next.js App)       │  │
│   └───────────────┘                      └───────────┬───────────┘  │
│                                                      │              │
│                                                      │ HTTPS        │
│                                                      ▼              │
│                                          ┌───────────────────────┐  │
│                                          │   Cloudflare Tunnel   │  │
│                                          │   (Your Domain)       │  │
│                                          └───────────┬───────────┘  │
│                                                      │              │
└──────────────────────────────────────────────────────┼──────────────┘
                                                       │
┌──────────────────────────────────────────────────────┼──────────────┐
│                       HOME NETWORK                   │              │
│                                                      ▼              │
│   ┌───────────────────────────────────────────────────────────────┐ │
│   │  Always-On Device (Raspberry Pi, NAS, PC)                     │ │
│   │  ┌─────────────────────────────────────────────────────────┐  │ │
│   │  │  cloudflared (Cloudflare Tunnel Client)                 │  │ │
│   │  └─────────────────────────────────────────────────────────┘  │ │
│   └───────────────────────────┬───────────────────────────────────┘ │
│                               │                                     │
│                               │ Local Network                       │
│                               ▼                                     │
│   ┌───────────────────────────────────────────────────────────────┐ │
│   │                      Crestron Processor                       │ │
│   │                      (192.168.x.x:443)                        │ │
│   └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│   ┌───────────────────────────────────────────────────────────────┐ │
│   │  pyatv Service (optional, for Apple TV control)              │ │
│   │  (localhost:8000)                                             │ │
│   └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Step 1: Deploy to Vercel

### 1.1 Push to GitHub

Ensure your code is in a GitHub repository:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/tutera-home.git
git push -u origin main
```

### 1.2 Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel auto-detects Next.js - keep default settings
5. Click "Deploy"

### 1.3 Configure Environment Variables (Optional)

In Vercel Dashboard → Settings → Environment Variables:

- `CRESTRON_TUNNEL_URL`: Your Cloudflare tunnel URL (set up in Step 2)
- `PYATV_SERVICE_URL`: Your Apple TV service tunnel URL (if using)

## Step 2: Set Up Cloudflare Tunnel

### 2.1 Create Cloudflare Account and Add Domain

1. Sign up at [cloudflare.com](https://cloudflare.com)
2. Add your domain and update nameservers at your registrar
3. Wait for DNS propagation (can take up to 24 hours)

### 2.2 Install cloudflared

On your always-on device (Raspberry Pi, NAS, Windows PC):

**Windows:**
```powershell
# Download from: https://github.com/cloudflare/cloudflared/releases
# Or use winget:
winget install Cloudflare.cloudflared
```

**Linux/Raspberry Pi:**
```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared.deb
```

**macOS:**
```bash
brew install cloudflared
```

### 2.3 Authenticate cloudflared

```bash
cloudflared tunnel login
```

This opens a browser to authenticate with Cloudflare.

### 2.4 Create the Tunnel

```bash
cloudflared tunnel create tutera-crestron
```

Note the tunnel ID that's generated.

### 2.5 Configure the Tunnel

Create the config file:

**Windows:** `C:\Users\<username>\.cloudflared\config.yml`
**Linux/macOS:** `~/.cloudflared/config.yml`

```yaml
# Cloudflare Tunnel Configuration for Tutera-Home

tunnel: <your-tunnel-id>
credentials-file: <path-to-credentials-file>

ingress:
  # Route for Crestron processor (HTTPS with self-signed cert)
  - hostname: crestron.yourdomain.com
    service: https://192.168.20.201
    originRequest:
      noTLSVerify: true  # Crestron uses self-signed certs
      
  # Route for Apple TV service (if running pyatv)
  - hostname: appletv.yourdomain.com
    service: http://localhost:8000
    
  # Catch-all (required)
  - service: http_status:404
```

### 2.6 Create DNS Records

```bash
cloudflared tunnel route dns tutera-crestron crestron.yourdomain.com
cloudflared tunnel route dns tutera-crestron appletv.yourdomain.com
```

### 2.7 Run the Tunnel

**Test manually:**
```bash
cloudflared tunnel run tutera-crestron
```

**Install as a service (recommended for always-on operation):**

**Windows:**
```powershell
cloudflared service install
```

**Linux:**
```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

**macOS:**
```bash
sudo cloudflared service install
```

## Step 3: Configure the App for Remote Access

When accessing the app remotely:

1. Go to your Vercel deployment URL (e.g., `https://tutera-home.vercel.app`)
2. On the login page, enter:
   - **Processor IP:** `crestron.yourdomain.com` (your tunnel hostname)
   - **Auth Token:** Your Crestron auth key

The app will route all Crestron API calls through your Cloudflare tunnel.

## Step 4: Set Up Apple TV Service (Optional)

If you want Apple TV remote control to work remotely:

### 4.1 Install Python Dependencies

On your always-on device:

```bash
cd services/pyatv
pip install -r requirements.txt
```

### 4.2 Run as a Service

**Using systemd (Linux):**

Create `/etc/systemd/system/pyatv.service`:

```ini
[Unit]
Description=Apple TV Control Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/path/to/tutera-home/services/pyatv
ExecStart=/usr/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable pyatv
sudo systemctl start pyatv
```

**Using NSSM (Windows):**

```powershell
# Download NSSM from https://nssm.cc/
nssm install pyatv "C:\Python311\python.exe" "-m uvicorn main:app --host 0.0.0.0 --port 8000"
nssm set pyatv AppDirectory "C:\path\to\tutera-home\services\pyatv"
nssm start pyatv
```

## Security Considerations

### Cloudflare Access (Recommended)

Add an extra layer of security with Cloudflare Access:

1. Go to Cloudflare Dashboard → Zero Trust → Access → Applications
2. Create a new application for your tunnel hostnames
3. Add authentication (email OTP, Google, etc.)

This requires users to authenticate before accessing your Crestron system.

### Firewall Rules

Your Crestron processor and local services never need to be exposed directly to the internet. Only the cloudflared process makes outbound connections to Cloudflare.

### Auth Key Protection

Never commit your Crestron auth key to version control. It's stored in browser localStorage and transmitted via HTTPS headers.

## Troubleshooting

### Tunnel Not Connecting

```bash
# Check tunnel status
cloudflared tunnel info tutera-crestron

# Test connectivity
curl -k https://crestron.yourdomain.com/cws/api/rooms
```

### Crestron Connection Timeout

- Verify the Crestron processor IP is correct
- Check that the processor is reachable from the tunnel host
- Ensure `noTLSVerify: true` is set (Crestron uses self-signed certs)

### Apple TV Service Not Working

```bash
# Check if service is running
curl http://localhost:8000/health

# Check for Apple TVs
curl http://localhost:8000/devices
```

## Alternative Hosting Options

### Cloudflare Pages

If you prefer everything on Cloudflare:

```bash
npm run build
npx wrangler pages deploy out
```

### Self-Hosted with Nginx

For full control, host on a VPS with Nginx reverse proxy:

```nginx
server {
    listen 443 ssl;
    server_name tutera.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Cost Summary

| Service | Cost |
|---------|------|
| Vercel (Hobby) | Free |
| Cloudflare (Free tier) | Free |
| Domain | ~$10-15/year |
| **Total** | **~$10-15/year** |

For higher usage, Vercel Pro is $20/month and Cloudflare Pro is $20/month.
