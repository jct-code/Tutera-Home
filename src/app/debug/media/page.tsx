"use client";

import { useDeviceStore } from "@/stores/deviceStore";
import { useAuthStore } from "@/stores/authStore";

export default function DebugMediaPage() {
  const { mediaRooms } = useDeviceStore();
  const { isConnected, processorIp } = useAuthStore();

  if (!isConnected) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4 text-red-500">Error</h1>
        <p>Not connected. Please log in first from the home page.</p>
      </div>
    );
  }

  if (!mediaRooms || mediaRooms.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Loading Media Rooms Data...</h1>
        <p>If this persists, try refreshing from the Media page first.</p>
      </div>
    );
  }

  // Group rooms by control availability
  const roomsWithVolume = mediaRooms.filter(r => r.availableVolumeControls?.includes("discrete"));
  const roomsWithMute = mediaRooms.filter(r => r.availableMuteControls?.includes("discrete"));
  const roomsWithSources = mediaRooms.filter(r => r.availableProviders?.length > 0);
  const roomsOff = mediaRooms.filter(r => !r.isPoweredOn);
  const roomsOn = mediaRooms.filter(r => r.isPoweredOn);

  return (
    <div className="p-8 max-w-full overflow-auto bg-[var(--background)] min-h-screen">
      <h1 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">Media Rooms API Data</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Processor: {processorIp} | Total Rooms: {mediaRooms.length}
      </p>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-[var(--surface)] p-4 rounded-lg">
          <p className="text-3xl font-bold text-[var(--text-primary)]">{mediaRooms.length}</p>
          <p className="text-sm text-[var(--text-secondary)]">Total Rooms</p>
        </div>
        <div className="bg-[var(--surface)] p-4 rounded-lg">
          <p className="text-3xl font-bold text-green-500">{roomsWithVolume.length}</p>
          <p className="text-sm text-[var(--text-secondary)]">With Volume Control</p>
        </div>
        <div className="bg-[var(--surface)] p-4 rounded-lg">
          <p className="text-3xl font-bold text-blue-500">{roomsWithMute.length}</p>
          <p className="text-sm text-[var(--text-secondary)]">With Mute Control</p>
        </div>
        <div className="bg-[var(--surface)] p-4 rounded-lg">
          <p className="text-3xl font-bold text-purple-500">{roomsWithSources.length}</p>
          <p className="text-sm text-[var(--text-secondary)]">With Sources</p>
        </div>
        <div className="bg-[var(--surface)] p-4 rounded-lg">
          <p className="text-3xl font-bold text-orange-500">{roomsOn.length}</p>
          <p className="text-sm text-[var(--text-secondary)]">Currently On</p>
        </div>
      </div>

      {/* Individual Room Details */}
      <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">Room Details</h2>
      <div className="space-y-4">
        {mediaRooms.map((room) => (
          <div key={room.id} className="bg-[var(--surface)] p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg text-[var(--text-primary)]">{room.name}</h3>
              <span className={`px-2 py-1 rounded text-xs ${room.isPoweredOn ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'}`}>
                {room.isPoweredOn ? 'ON' : 'OFF'}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">
              <div>
                <span className="text-[var(--text-tertiary)]">ID:</span>{' '}
                <span className="text-[var(--text-primary)]">{room.id}</span>
              </div>
              <div>
                <span className="text-[var(--text-tertiary)]">Room ID:</span>{' '}
                <span className="text-[var(--text-primary)]">{room.roomId || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[var(--text-tertiary)]">Volume:</span>{' '}
                <span className="text-[var(--text-primary)]">{room.volumePercent}%</span>
              </div>
              <div>
                <span className="text-[var(--text-tertiary)]">Muted:</span>{' '}
                <span className="text-[var(--text-primary)]">{room.isMuted ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-[var(--text-tertiary)]">Volume Controls:</span>{' '}
                <code className="bg-[var(--surface-hover)] px-1 rounded text-xs">
                  {JSON.stringify(room.availableVolumeControls)}
                </code>
              </div>
              <div>
                <span className="text-[var(--text-tertiary)]">Mute Controls:</span>{' '}
                <code className="bg-[var(--surface-hover)] px-1 rounded text-xs">
                  {JSON.stringify(room.availableMuteControls)}
                </code>
              </div>
              <div>
                <span className="text-[var(--text-tertiary)]">Sources:</span>{' '}
                <code className="bg-[var(--surface-hover)] px-1 rounded text-xs">
                  {room.availableProviders?.length > 0 ? room.availableProviders.join(', ') : 'None'}
                </code>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Raw JSON */}
      <h2 className="text-xl font-bold mt-8 mb-4 text-[var(--text-primary)]">Raw JSON Data</h2>
      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-xs max-h-96">
        {JSON.stringify(mediaRooms, null, 2)}
      </pre>
    </div>
  );
}
