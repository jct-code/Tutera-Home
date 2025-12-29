# Crestron Home Media Rooms API Analysis

This document analyzes the Media Rooms API responses and control availability patterns based on the Crestron Home REST API.

> **Note:** The sample data below is from the official Crestron API documentation. To capture your actual system's data, open the browser DevTools Network tab and refresh the Media page, then look for the `/api/crestron/devices` request.

## API Endpoint

```
GET /cws/api/mediarooms
```

Returns all media rooms with their current status and available controls.

## How to Capture Your Actual Data

1. Open the Media page in your browser
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to Network tab
4. Refresh the page
5. Look for requests to `/api/crestron/devices`
6. Click on it and view the Response tab
7. Find the `mediaRooms` array in the response

---

## Sample Room Configurations

Based on the Crestron API documentation, here are 6 different room configuration patterns:

### Room 1: Full Controls (Gym)

```json
{
  "currentVolumeLevel": 0,
  "currentMuteState": "Unmuted",
  "currentPowerState": "Off",
  "availableProviders": [
    "ATC-Audionet Internet Radio",
    "ATC-Audionet SiriusXM",
    "ATC-Audionet Librivox Audiobooks",
    "ATC-Audionet Pandora",
    "TrackFm XM",
    "TrackAmFM AM",
    "TrackAmFM FM",
    "TrackAM AM",
    "TrackAM FM"
  ],
  "availableVolumeControls": ["discrete"],
  "availableMuteControls": ["discrete"],
  "id": 2,
  "name": "Gym",
  "roomId": 2
}
```

**Available Controls:**
| Control | Available | Value |
|---------|-----------|-------|
| Power | ✅ Yes | Off |
| Volume | ✅ Yes (discrete) | 0% |
| Mute | ✅ Yes (discrete) | Unmuted |
| Source Selection | ✅ Yes | 9 providers |

---

### Room 2: Full Controls - Currently Playing (Atrium)

```json
{
  "currentVolumeLevel": 5898,
  "currentMuteState": "Unmuted",
  "currentPowerState": "On",
  "currentProviderId": 1,
  "availableProviders": [
    "ATC-Audionet Internet Radio",
    "ATC-Audionet SiriusXM",
    "ATC-Audionet Librivox Audiobooks",
    "ATC-Audionet Pandora",
    "TrackFm XM",
    "TrackAmFM AM",
    "TrackAmFM FM",
    "TrackAM AM",
    "TrackAM FM"
  ],
  "availableVolumeControls": ["discrete"],
  "availableMuteControls": ["discrete"],
  "id": 1,
  "name": "Atrium",
  "roomId": 1
}
```

**Available Controls:**
| Control | Available | Value |
|---------|-----------|-------|
| Power | ✅ Yes | **On** |
| Volume | ✅ Yes (discrete) | ~9% (5898/65535) |
| Mute | ✅ Yes (discrete) | Unmuted |
| Source Selection | ✅ Yes | Playing: "ATC-Audionet SiriusXM" (index 1) |

**Note:** `currentProviderId: 1` indicates the second source in the `availableProviders` array is selected.

---

### Room 3: No Controls (Whole House)

```json
{
  "currentVolumeLevel": 0,
  "currentMuteState": "Unmuted",
  "currentPowerState": "Off",
  "availableProviders": [],
  "availableVolumeControls": ["none"],
  "availableMuteControls": ["none"],
  "id": 1001,
  "name": "Whole House",
  "roomId": 1001
}
```

**Available Controls:**
| Control | Available | Value |
|---------|-----------|-------|
| Power | ✅ Yes | Off |
| Volume | ❌ No (none) | N/A |
| Mute | ❌ No (none) | N/A |
| Source Selection | ❌ No | Empty array |

**Note:** This is a "group" room that controls multiple physical rooms. It only supports power on/off.

---

### Room 4: Full Controls (Bedroom)

```json
{
  "currentVolumeLevel": 0,
  "currentMuteState": "Unmuted",
  "currentPowerState": "Off",
  "availableProviders": [
    "ATC-Audionet Internet Radio",
    "ATC-Audionet SiriusXM",
    "ATC-Audionet Librivox Audiobooks",
    "ATC-Audionet Pandora",
    "TrackFm XM",
    "TrackAmFM AM",
    "TrackAmFM FM",
    "TrackAM AM",
    "TrackAM FM"
  ],
  "availableVolumeControls": ["discrete"],
  "availableMuteControls": ["discrete"],
  "id": 5,
  "name": "Bedroom",
  "roomId": 5
}
```

**Available Controls:**
| Control | Available | Value |
|---------|-----------|-------|
| Power | ✅ Yes | Off |
| Volume | ✅ Yes (discrete) | 0% |
| Mute | ✅ Yes (discrete) | Unmuted |
| Source Selection | ✅ Yes | 9 providers |

---

### Room 5: Full Controls (Garage)

```json
{
  "currentVolumeLevel": 0,
  "currentMuteState": "Unmuted",
  "currentPowerState": "Off",
  "availableProviders": [
    "ATC-Audionet Internet Radio",
    "ATC-Audionet SiriusXM",
    "ATC-Audionet Librivox Audiobooks",
    "ATC-Audionet Pandora",
    "TrackFm XM",
    "TrackAmFM AM",
    "TrackAmFM FM",
    "TrackAM AM",
    "TrackAM FM"
  ],
  "availableVolumeControls": ["discrete"],
  "availableMuteControls": ["discrete"],
  "id": 4,
  "name": "Garage",
  "roomId": 4
}
```

**Available Controls:**
| Control | Available | Value |
|---------|-----------|-------|
| Power | ✅ Yes | Off |
| Volume | ✅ Yes (discrete) | 0% |
| Mute | ✅ Yes (discrete) | Unmuted |
| Source Selection | ✅ Yes | 9 providers |

---

### Room 6: Hypothetical - Volume Only (No Mute)

```json
{
  "currentVolumeLevel": 32768,
  "currentMuteState": "Unmuted",
  "currentPowerState": "On",
  "availableProviders": ["Local Input"],
  "availableVolumeControls": ["discrete"],
  "availableMuteControls": ["none"],
  "id": 100,
  "name": "Patio Speaker",
  "roomId": 100
}
```

**Available Controls:**
| Control | Available | Value |
|---------|-----------|-------|
| Power | ✅ Yes | On |
| Volume | ✅ Yes (discrete) | 50% |
| Mute | ❌ No (none) | N/A |
| Source Selection | ✅ Yes | 1 provider |

---

## Control Availability Matrix

| Room Type | Power | Volume | Mute | Sources | Example |
|-----------|-------|--------|------|---------|---------|
| Full Audio Room | ✅ | ✅ discrete | ✅ discrete | ✅ Multiple | Gym, Bedroom, Garage |
| Group/Zone Room | ✅ | ❌ none | ❌ none | ❌ Empty | Whole House |
| Simple Speaker | ✅ | ✅ discrete | ❌ none | ✅ Limited | Patio Speaker |
| Fixed Volume | ✅ | ❌ none | ✅ discrete | ✅ Multiple | Meeting Room |

---

## Volume Level Conversion

The `currentVolumeLevel` field uses a 16-bit range (0-65535):

| Raw Value | Percentage | Description |
|-----------|------------|-------------|
| 0 | 0% | Minimum |
| 5898 | ~9% | Low |
| 16384 | 25% | Quarter |
| 32768 | 50% | Half |
| 49152 | 75% | Three-quarters |
| 65535 | 100% | Maximum |

**Conversion Formula:**
```javascript
// Raw to Percent
const volumePercent = Math.round((rawVolume / 65535) * 100);

// Percent to Raw
const rawVolume = Math.round((percent / 100) * 65535);
```

---

## API Endpoints Summary

### GET All Media Rooms
```
GET /cws/api/mediarooms
```

### GET Single Media Room
```
GET /cws/api/mediarooms/{id}
```

### Control Endpoints (POST)

| Action | Endpoint | Parameters |
|--------|----------|------------|
| Power On/Off | `/cws/api/mediarooms/{id}/power/{state}` | state: "on" or "off" |
| Set Volume | `/cws/api/mediarooms/{id}/volume/{level}` | level: 0-100 (percent) |
| Mute | `/cws/api/mediarooms/{id}/mute` | none |
| Unmute | `/cws/api/mediarooms/{id}/unmute` | none |
| Select Source | `/cws/api/mediarooms/{id}/selectsource/{sid}` | sid: source index |

---

## Key Observations

1. **Power Control Always Available**: Per the API documentation, power control is available for all media rooms regardless of the `availableVolumeControls` and `availableMuteControls` flags.

2. **Control Type "discrete" vs "none"**:
   - `"discrete"` = Control is available and supports specific values
   - `"none"` = Control is not available for this room

3. **Whole House / Zone Rooms**: These are virtual groupings that may only support power on/off to control multiple physical rooms simultaneously.

4. **Source Selection**: The `availableProviders` array lists all available audio sources. When a room is playing, `currentProviderId` indicates the index of the selected source.

5. **Volume API Uses Percent**: While `currentVolumeLevel` is returned as a raw 16-bit value, the POST endpoint for setting volume accepts a percentage (0-100).

---

## Implementation Notes

The current implementation always shows volume and mute controls when a room is powered on, regardless of the API flags. This decision was made because:

1. The API endpoints for volume and mute may still work even when flags show "none"
2. Group/zone rooms (like "Whole House") may aggregate control for multiple rooms
3. User experience is improved by having consistent controls across all rooms

If stricter API compliance is desired, the control visibility can be gated by checking:
```typescript
const hasVolumeControl = availableVolumeControls.includes("discrete");
const hasMuteControl = availableMuteControls.includes("discrete");
const hasSourceSelection = availableProviders.length > 0;
```
