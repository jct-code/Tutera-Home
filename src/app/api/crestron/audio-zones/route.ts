import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Audio Zone type definition
interface AudioZone {
  id: string;
  name: string;
  mediaRoomIds: string[];  // Array of media room IDs in this zone
  isBuiltIn?: boolean;     // True for auto-generated zones (Whole House, areas)
  createdAt?: string;
  updatedAt?: string;
}

interface AudioZonesData {
  zones: AudioZone[];
}

const DATA_FILE = path.join(process.cwd(), "data", "audio-zones.json");

// Read audio zones from file
async function readData(): Promise<AudioZonesData> {
  try {
    const content = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    // File doesn't exist yet, return empty data
    return { zones: [] };
  }
}

// Write audio zones to file
async function writeData(data: AudioZonesData): Promise<void> {
  const dir = path.dirname(DATA_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET - Fetch all custom audio zones
export async function GET() {
  try {
    const data = await readData();
    return NextResponse.json({ success: true, data: data.zones });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to read audio zones" },
      { status: 500 }
    );
  }
}

// POST - Create a new audio zone
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, mediaRoomIds } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Zone name is required" },
        { status: 400 }
      );
    }

    if (!mediaRoomIds || !Array.isArray(mediaRoomIds) || mediaRoomIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one media room ID is required" },
        { status: 400 }
      );
    }

    const data = await readData();

    // Check for duplicate name
    if (data.zones.some(zone => zone.name.toLowerCase() === name.trim().toLowerCase())) {
      return NextResponse.json(
        { success: false, error: "A zone with this name already exists" },
        { status: 400 }
      );
    }

    // Generate a unique ID
    const id = `zone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newZone: AudioZone = {
      id,
      name: name.trim(),
      mediaRoomIds: mediaRoomIds.map(String),
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.zones.push(newZone);
    await writeData(data);

    return NextResponse.json({ success: true, data: newZone });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create audio zone" },
      { status: 500 }
    );
  }
}

// PUT - Update an existing audio zone
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, mediaRoomIds } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Zone ID is required" },
        { status: 400 }
      );
    }

    const data = await readData();
    const zoneIndex = data.zones.findIndex(zone => zone.id === id);

    if (zoneIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Zone not found" },
        { status: 404 }
      );
    }

    const existingZone = data.zones[zoneIndex];

    // Prevent editing built-in zones
    if (existingZone.isBuiltIn) {
      return NextResponse.json(
        { success: false, error: "Cannot edit built-in zones" },
        { status: 400 }
      );
    }

    // Check for duplicate name (excluding current zone)
    if (name && data.zones.some(
      zone => zone.id !== id && zone.name.toLowerCase() === name.trim().toLowerCase()
    )) {
      return NextResponse.json(
        { success: false, error: "A zone with this name already exists" },
        { status: 400 }
      );
    }

    // Update the zone
    const updatedZone: AudioZone = {
      ...existingZone,
      name: name ? name.trim() : existingZone.name,
      mediaRoomIds: mediaRoomIds ? mediaRoomIds.map(String) : existingZone.mediaRoomIds,
      updatedAt: new Date().toISOString(),
    };

    data.zones[zoneIndex] = updatedZone;
    await writeData(data);

    return NextResponse.json({ success: true, data: updatedZone });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update audio zone" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an audio zone
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Zone ID is required" },
        { status: 400 }
      );
    }

    const data = await readData();
    const zoneIndex = data.zones.findIndex(zone => zone.id === id);

    if (zoneIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Zone not found" },
        { status: 404 }
      );
    }

    const zone = data.zones[zoneIndex];

    // Prevent deleting built-in zones
    if (zone.isBuiltIn) {
      return NextResponse.json(
        { success: false, error: "Cannot delete built-in zones" },
        { status: 400 }
      );
    }

    data.zones.splice(zoneIndex, 1);
    await writeData(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to delete audio zone" },
      { status: 500 }
    );
  }
}
