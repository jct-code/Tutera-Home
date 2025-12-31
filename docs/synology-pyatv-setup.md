# Installing pyatv Service on Synology NAS

This guide covers installing the Apple TV control service on your Synology DS423 NAS at `192.168.20.2`.

## Your Network Configuration

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Network 192.168.20.x                             │
│                                                                     │
│   ┌─────────────────┐    ┌─────────────────┐    ┌───────────────┐  │
│   │  Apple TV 1     │    │  Apple TV 2     │    │  Crestron     │  │
│   │  192.168.20.xx  │    │  192.168.20.xx  │    │  192.168.20.x │  │
│   └─────────────────┘    └─────────────────┘    └───────────────┘  │
│           ▲                      ▲                      ▲          │
│           │    mDNS/Bonjour      │                      │          │
│           └──────────────────────┼──────────────────────┘          │
│                                  │                                  │
│                    ┌─────────────────────────┐                     │
│                    │  Synology DS423         │                     │
│                    │  192.168.20.2:8000      │                     │
│                    │  (pyatv service)        │                     │
│                    └─────────────────────────┘                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Option 1: Docker / Container Manager (Recommended)

This is the cleanest, most isolated approach.

### Prerequisites
- Container Manager package installed (you already have it)

### Step 1: Create folder structure

Using File Station or SSH:

```
/volume1/docker/pyatv/
├── main.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── data/           (created automatically for storing pairing credentials)
```

### Step 2: Copy files to Synology

**Option A: Using File Station**
1. Open File Station
2. Navigate to `/volume1/docker/`
3. Create folder `pyatv`
4. Upload these files from your `services/pyatv/` folder:
   - `main.py`
   - `requirements.txt`
   - `Dockerfile`
   - `docker-compose.yml`

**Option B: Using SCP from your development machine**
```powershell
# From your Windows machine (adjust paths as needed)
cd C:\Repos\tutera-home\services\pyatv
scp main.py requirements.txt Dockerfile docker-compose.yml admin@192.168.20.2:/volume1/docker/pyatv/
```

### Step 3: Build and run with Container Manager

**Option A: Using Container Manager UI**
1. Open **Container Manager** on your Synology
2. Go to **Project** → **Create**
3. Name: `pyatv`
4. Path: `/volume1/docker/pyatv`
5. Click **Create**
6. The container will build and start automatically

**Option B: Using SSH**
```bash
# SSH into Synology
ssh admin@192.168.20.2

# Navigate to the folder
cd /volume1/docker/pyatv

# Build and start
sudo docker-compose up -d --build

# Check logs
sudo docker-compose logs -f
```

### Step 4: Verify it's running

Open in browser: `http://192.168.20.2:8000/docs`

You should see the FastAPI Swagger UI with all available endpoints.

### Step 5: Test Apple TV discovery

```bash
curl http://192.168.20.2:8000/devices/scan
```

You should see your Apple TVs listed!

---

## Option 2: Python Virtual Environment (No Docker)

If you prefer not to use Docker, you can run Python directly on the NAS.

### Step 1: Enable SSH

1. Control Panel → Terminal & SNMP
2. Enable SSH service

### Step 2: Install Python 3 package

1. Package Center → Search "Python3"
2. Install **Python 3.11** (or latest available)

### Step 3: Set up the service

```bash
# SSH into Synology
ssh admin@192.168.20.2

# Create service directory
mkdir -p /volume1/apps/pyatv
cd /volume1/apps/pyatv

# Copy your files here (or use scp from your dev machine)
# You need: main.py, requirements.txt

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Test the service
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### Step 4: Create startup script

Create `/volume1/apps/pyatv/start.sh`:
```bash
#!/bin/bash
cd /volume1/apps/pyatv
source venv/bin/activate
exec python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Make it executable:
```bash
chmod +x /volume1/apps/pyatv/start.sh
```

### Step 5: Set up auto-start with Task Scheduler

1. Control Panel → Task Scheduler
2. Create → Triggered Task → User-defined script
3. Configure:
   - **Task**: pyatv-service
   - **User**: root
   - **Event**: Boot-up
   - **Task Settings** → User-defined script:
     ```
     /volume1/apps/pyatv/start.sh
     ```
4. Click OK

### Step 6: Allow through firewall

If you have Synology firewall enabled:
1. Control Panel → Security → Firewall
2. Edit Rules → Create
3. Port: 8000
4. Allow from: 192.168.20.0/24 (or your network range)

---

## Option 3: Task Scheduler (Simplest, No Docker)

The quickest way if you don't want to manage Docker.

### Step 1: Upload files

Upload `main.py` and `requirements.txt` to `/volume1/apps/pyatv/`

### Step 2: Create Task Scheduler entry

1. Control Panel → Task Scheduler
2. Create → Triggered Task → User-defined script
3. Settings:
   - **Task**: pyatv-service
   - **User**: root
   - **Event**: Boot-up
   - **Run command**:
     ```bash
     cd /volume1/apps/pyatv && \
     python3 -m pip install -r requirements.txt --quiet && \
     python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
     ```
4. Save

---

## Configuring Tutera-Home to Use pyatv

Now update your Next.js app to connect to the pyatv service.

### For Local Development

Add to your `.env.local`:
```env
PYATV_SERVICE_URL=http://192.168.20.2:8000
```

### Update the API Route

The `AppleTVRemote` component communicates via `/api/appletv/[...path]`. Update this route to use the Synology address:

File: `src/app/api/appletv/[...path]/route.ts`

```typescript
const PYATV_SERVICE_URL = process.env.PYATV_SERVICE_URL || "http://192.168.20.2:8000";
```

---

## First-Time Pairing with Apple TVs

After the service is running, you need to pair with each Apple TV:

### Step 1: Scan for devices

```bash
curl http://192.168.20.2:8000/devices/scan
```

Response will show discovered Apple TVs with their IDs.

### Step 2: Start pairing

```bash
curl -X POST http://192.168.20.2:8000/devices/{DEVICE_ID}/pair/start
```

A 4-digit PIN will appear on your Apple TV screen.

### Step 3: Complete pairing

```bash
curl -X POST http://192.168.20.2:8000/devices/{DEVICE_ID}/pair/finish \
  -H "Content-Type: application/json" \
  -d '{"pin": "1234"}'
```

### Step 4: Test control

```bash
# Test D-pad
curl -X POST http://192.168.20.2:8000/devices/{DEVICE_ID}/remote/up
curl -X POST http://192.168.20.2:8000/devices/{DEVICE_ID}/remote/select

# Test play/pause
curl -X POST http://192.168.20.2:8000/devices/{DEVICE_ID}/remote/play_pause
```

---

## Troubleshooting

### Service won't start

Check logs:
```bash
# Docker
sudo docker logs pyatv-service

# Direct Python
cat /volume1/apps/pyatv/logs.txt
```

### Apple TVs not discovered

1. Ensure Bonjour/mDNS is working on your network
2. Make sure Docker is using `network_mode: host`
3. Try running the scan manually:
   ```bash
   sudo docker exec pyatv-service python -c "import pyatv; import asyncio; print(asyncio.run(pyatv.scan(asyncio.get_event_loop())))"
   ```

### Connection refused

1. Check if service is running: `curl http://192.168.20.2:8000/health`
2. Verify firewall settings
3. Ensure port 8000 is not used by another service

### Pairing fails

- Make sure the Apple TV is awake (not in sleep mode)
- Try power cycling the Apple TV
- Ensure no other device is trying to pair simultaneously

---

## Resource Usage

On your DS423 (2GB RAM, 4-core Realtek):
- **Docker container**: ~50-100MB RAM when idle
- **Python process**: ~30-50MB RAM when idle
- CPU usage is minimal unless actively controlling Apple TVs

This is very lightweight and won't impact your NAS performance.
