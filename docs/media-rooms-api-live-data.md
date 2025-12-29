# Crestron Home Media Rooms API - Live Data Analysis

**Processor IP:** 192.168.20.201  
**Timestamp:** December 29, 2024  
**Total Media Rooms:** 31

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total Media Rooms | 31 |
| Rooms with Volume Control | 2 |
| Rooms with Mute Control | 2 |
| Rooms with Source Selection | 0 |
| Currently Powered On | 0 |

---

## Room Details by Control Availability

### Rooms WITH Volume & Mute Control

These rooms support discrete volume and mute control:

#### 1. Exercise Room
```json
{
  "id": "52016",
  "name": "Exercise",
  "type": "mediaroom",
  "roomId": "52016",
  "currentVolumeLevel": 29491,
  "currentMuteState": "unmuted",
  "currentPowerState": "on",
  "availableProviders": [],
  "availableVolumeControls": ["relative", "discrete"],
  "availableMuteControls": ["discrete", "toggle"],
  "isPoweredOn": false,
  "isMuted": false,
  "volumePercent": 45
}
```

**Key Observations:**
- Volume Controls: `["relative", "discrete"]` - Supports both relative adjustments and absolute level setting
- Mute Controls: `["discrete", "toggle"]` - Supports both direct mute/unmute and toggle
- Current Volume: 29491 raw (45% after conversion)
- Has NO source providers despite having audio controls

---

### Rooms WITHOUT Volume/Mute Control

These rooms only support power on/off:

#### 2. Kitchen
```json
{
  "id": "52010",
  "name": "Kitchen",
  "type": "mediaroom",
  "roomId": "52010",
  "currentVolumeLevel": 0,
  "currentMuteState": "Unmuted",
  "currentPowerState": "Off",
  "availableProviders": [],
  "availableVolumeControls": ["none"],
  "availableMuteControls": ["none"],
  "isPoweredOn": false,
  "isMuted": false,
  "volumePercent": 0
}
```

#### 3. Living Room
```json
{
  "id": "52179",
  "name": "Living Room",
  "type": "mediaroom",
  "roomId": "52179",
  "currentVolumeLevel": 0,
  "currentMuteState": "Unmuted",
  "currentPowerState": "Off",
  "availableProviders": [],
  "availableVolumeControls": ["none"],
  "availableMuteControls": ["none"],
  "isPoweredOn": false,
  "isMuted": false,
  "volumePercent": 0
}
```

#### 4. Laundry/Mud Room
```json
{
  "id": "52173",
  "name": "Laundry/Mud Room",
  "type": "mediaroom",
  "roomId": "52173",
  "currentVolumeLevel": 0,
  "currentMuteState": "Unmuted",
  "currentPowerState": "Off",
  "availableProviders": [],
  "availableVolumeControls": ["none"],
  "availableMuteControls": ["none"],
  "isPoweredOn": false,
  "isMuted": false,
  "volumePercent": 0
}
```

#### 5. Theater
```json
{
  "id": "52762",
  "name": "Theater",
  "type": "mediaroom",
  "roomId": "52762",
  "currentVolumeLevel": 0,
  "currentMuteState": "Unmuted",
  "currentPowerState": "Off",
  "availableProviders": [],
  "availableVolumeControls": ["none"],
  "availableMuteControls": ["none"],
  "isPoweredOn": false,
  "isMuted": false,
  "volumePercent": 0
}
```

#### 6. Virtual TV
```json
{
  "id": "61167",
  "name": "Virtual TV",
  "type": "mediaroom",
  "roomId": "61167",
  "currentVolumeLevel": 0,
  "currentMuteState": "Unmuted",
  "currentPowerState": "Off",
  "availableProviders": [],
  "availableVolumeControls": ["none"],
  "availableMuteControls": ["none"],
  "isPoweredOn": false,
  "isMuted": false,
  "volumePercent": 0
}
```

---

## Control Availability Matrix

| Room Name | Power | Volume | Mute | Sources |
|-----------|-------|--------|------|---------|
| Exercise | ✅ | ✅ discrete, relative | ✅ discrete, toggle | ❌ |
| Kitchen | ✅ | ❌ none | ❌ none | ❌ |
| Living Room | ✅ | ❌ none | ❌ none | ❌ |
| Laundry/Mud Room | ✅ | ❌ none | ❌ none | ❌ |
| Theater | ✅ | ❌ none | ❌ none | ❌ |
| Virtual TV | ✅ | ❌ none | ❌ none | ❌ |
| ... (25 more rooms) | ✅ | ❌ none | ❌ none | ❌ |

---

## API Response Structure

### GET /cws/api/mediarooms (List All)

Returns an array of media room objects:

```json
[
  {
    "id": 52016,
    "name": "Exercise",
    "roomId": 52016,
    "currentVolumeLevel": 29491,
    "currentMuteState": "unmuted",
    "currentPowerState": "on",
    "currentProviderId": null,
    "availableProviders": [],
    "availableVolumeControls": ["relative", "discrete"],
    "availableMuteControls": ["discrete", "toggle"]
  },
  // ... more rooms
]
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Unique identifier for the media room |
| `name` | string | Display name of the room |
| `roomId` | number | Associated physical room ID |
| `currentVolumeLevel` | number | Raw volume (0-65535) |
| `currentMuteState` | string | "Muted" or "Unmuted" |
| `currentPowerState` | string | "On" or "Off" |
| `currentProviderId` | number/null | Index of current source |
| `availableProviders` | string[] | Array of source names |
| `availableVolumeControls` | string[] | ["none"] or ["discrete"] or ["relative", "discrete"] |
| `availableMuteControls` | string[] | ["none"] or ["discrete"] or ["discrete", "toggle"] |

---

## Volume Conversion

The raw `currentVolumeLevel` value ranges from 0 to 65535. To convert to percentage:

```typescript
const volumePercent = rawVolume > 100
  ? Math.round((rawVolume / 65535) * 100)
  : rawVolume;
```

**Example:**
- Raw: 29491 → Percent: 45%
- Raw: 65535 → Percent: 100%
- Raw: 0 → Percent: 0%

---

## Available Control Types

### Volume Controls
| Value | Description |
|-------|-------------|
| `"none"` | No volume control available |
| `"discrete"` | Can set absolute volume level (0-100) |
| `"relative"` | Can adjust volume up/down incrementally |

### Mute Controls
| Value | Description |
|-------|-------------|
| `"none"` | No mute control available |
| `"discrete"` | Can set mute on/off directly |
| `"toggle"` | Can toggle current mute state |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cws/api/mediarooms` | Get all media rooms |
| GET | `/cws/api/mediarooms/{id}` | Get specific room |
| POST | `/cws/api/mediarooms/{id}/power/on` | Turn room on |
| POST | `/cws/api/mediarooms/{id}/power/off` | Turn room off |
| POST | `/cws/api/mediarooms/{id}/volume/{level}` | Set volume (0-100) |
| POST | `/cws/api/mediarooms/{id}/mute` | Mute the room |
| POST | `/cws/api/mediarooms/{id}/unmute` | Unmute the room |
| POST | `/cws/api/mediarooms/{id}/selectsource/{idx}` | Select source by index |

---

## Key Findings

1. **Most rooms are "virtual/grouped" zones** - Out of 31 media rooms, only 2 have volume/mute control capability. The rest are likely Whole House Audio zones that only support power on/off.

2. **No source selection available** - None of the rooms in this system have `availableProviders` populated, meaning source selection is not available through the API for any room.

3. **Volume controls vary** - Rooms with volume support have both "relative" and "discrete" options, allowing for both percentage-based and incremental control.

4. **Exercise room has audio equipment** - The only room showing actual volume control (45%) is the Exercise room, suggesting it has dedicated audio equipment.

5. **Power state discrepancy** - The Exercise room shows `currentPowerState: "on"` but `isPoweredOn: false` in the transformed data - this may indicate a timing/refresh issue.

---

## Debug Page

A debug page is available at `/debug/media` to view live API data from your Crestron system.
