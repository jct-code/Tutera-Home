"use client";

import { useState, useEffect } from "react";
import { useDeviceStore, fetchMediaRooms } from "@/stores/deviceStore";
import { useAuthStore } from "@/stores/authStore";

export default function DebugMediaPage() {
  // All hooks must be called before any conditional returns
  const { mediaRooms } = useDeviceStore();
  const { isConnected, processorIp, getAuthHeaders } = useAuthStore();
  const [isSendingCommand, setIsSendingCommand] = useState(false);
  const [commandResult, setCommandResult] = useState<string | null>(null);
  const [isSendingTurnOn, setIsSendingTurnOn] = useState(false);
  const [turnOnResult, setTurnOnResult] = useState<string | null>(null);
  const [kitchenRoomDetails, setKitchenRoomDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isTurningOn, setIsTurningOn] = useState(false);
  const [turnOnSimpleResult, setTurnOnSimpleResult] = useState<string | null>(null);

  // Find Kitchen media room (computed before useEffect)
  const kitchenRoom = mediaRooms?.find(r => 
    r.name.toLowerCase().includes("kitchen") || 
    r.name.toLowerCase().includes("kitchen tv")
  ) || null;

  // Fetch individual media room details if sources are missing
  useEffect(() => {
    const fetchKitchenDetails = async () => {
      if (!kitchenRoom || !isConnected) return;
      
      // If we already have sources, don't fetch
      if (kitchenRoom.availableProviders && kitchenRoom.availableProviders.length > 0) {
        setKitchenRoomDetails(null);
        return;
      }

      setIsLoadingDetails(true);
      try {
        const headers = getAuthHeaders();
        const response = await fetch(`/api/crestron/media?roomId=${kitchenRoom.id}`, {
          headers,
        });
        const data = await response.json();
        console.log("[Debug] Individual room fetch response:", data);
        
        if (data.success && data.data) {
          // Handle both array response (all rooms) and single object response
          const roomData = Array.isArray(data.data) 
            ? data.data.find((r: any) => String(r.id) === String(kitchenRoom.id))
            : data.data;
          
          console.log("[Debug] Parsed room data:", roomData);
          console.log("[Debug] Available providers:", roomData?.availableProviders);
          
          // Update details even if no sources - we want to see what we got
          if (roomData) {
            setKitchenRoomDetails(roomData);
          }
        } else {
          console.error("[Debug] Failed to fetch room details:", data.error || "Unknown error");
        }
      } catch (error) {
        console.error("[Debug] Exception fetching kitchen room details:", error);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchKitchenDetails();
  }, [kitchenRoom?.id, isConnected, getAuthHeaders]);

  // Use detailed data if available, otherwise use basic data
  const kitchenRoomWithSources = kitchenRoomDetails || kitchenRoom;

  // Now safe to do conditional returns after all hooks
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

  const handleTurnOffKitchen = async () => {
    if (!kitchenRoom) {
      setCommandResult("Error: Kitchen media room not found");
      return;
    }

    setIsSendingCommand(true);
    setCommandResult(null);

    try {
      const headers = getAuthHeaders();
      const response = await fetch("/api/crestron/media", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: kitchenRoom.id,
          action: "power",
          powerState: "off"
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setCommandResult(`Success! Sent power OFF command to Kitchen TV (ID: ${kitchenRoom.id})`);
        // Refresh media rooms to get updated state
        setTimeout(async () => {
          await fetchMediaRooms();
          // Clear detailed data so it refetches if needed
          setKitchenRoomDetails(null);
        }, 1000);
      } else {
        setCommandResult(`Error: ${data.error || "Failed to send command"}`);
      }
    } catch (error) {
      setCommandResult(`Error: ${error instanceof Error ? error.message : "Failed to send command"}`);
    } finally {
      setIsSendingCommand(false);
    }
  };

  const handleTurnOnKitchen = async () => {
    if (!kitchenRoom) {
      setTurnOnSimpleResult("Error: Kitchen media room not found");
      return;
    }

    setIsTurningOn(true);
    setTurnOnSimpleResult(null);

    try {
      const headers = getAuthHeaders();
      
      console.log(`[Debug] Attempting to turn on Kitchen TV (ID: ${kitchenRoom.id})`);
      
      // Step 1: Turn on the TV
      const powerResponse = await fetch("/api/crestron/media", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: kitchenRoom.id,
          action: "power",
          powerState: "on"
        }),
      });

      const powerData = await powerResponse.json();
      
      console.log(`[Debug] Power response:`, powerData);
      
      if (powerData.success) {
        setTurnOnSimpleResult(`Success! Turned on Kitchen TV (ID: ${kitchenRoom.id})`);
        // Refresh media rooms to get updated state
        setTimeout(async () => {
          await fetchMediaRooms();
          setKitchenRoomDetails(null);
        }, 1000);
      } else {
        setTurnOnSimpleResult(`Error turning on TV: ${powerData.error || "Failed to turn on"}`);
        console.error(`[Debug] Power command failed:`, powerData);
      }
    } catch (error) {
      console.error(`[Debug] Exception turning on TV:`, error);
      setTurnOnSimpleResult(`Error: ${error instanceof Error ? error.message : "Failed to send command"}`);
    } finally {
      setIsTurningOn(false);
    }
  };

  const handleTurnOnKitchenWithAppleTV = async () => {
    if (!kitchenRoom) {
      setTurnOnResult("Error: Kitchen media room not found");
      return;
    }

    // First, try to fetch individual room details to get sources
    setIsLoadingDetails(true);
    let sources: string[] = [];
    let fetchedRoomData: any = null;
    
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`/api/crestron/media?roomId=${kitchenRoom.id}`, {
        headers,
      });
      const data = await response.json();
      console.log("[Debug] Source fetch response:", JSON.stringify(data, null, 2));
      
      if (data.success && data.data) {
        // Handle both array and single object responses
        fetchedRoomData = Array.isArray(data.data) 
          ? data.data.find((r: any) => String(r.id) === String(kitchenRoom.id))
          : data.data;
        
        console.log("[Debug] Fetched room data:", JSON.stringify(fetchedRoomData, null, 2));
        console.log("[Debug] Available providers:", fetchedRoomData?.availableProviders);
        console.log("[Debug] All keys in room data:", fetchedRoomData ? Object.keys(fetchedRoomData) : []);
        
        // Update details even if empty - we want to see what we got
        if (fetchedRoomData) {
          setKitchenRoomDetails(fetchedRoomData);
          sources = fetchedRoomData.availableProviders || [];
        }
      } else {
        console.error("[Debug] Failed to fetch room details:", data.error || "Unknown error");
      }
    } catch (error) {
      console.error("[Debug] Exception fetching room details:", error);
    } finally {
      setIsLoadingDetails(false);
    }
    
    // If still no sources, use what we have from bulk data
    if (sources.length === 0) {
      sources = kitchenRoomWithSources?.availableProviders || kitchenRoom.availableProviders || [];
    }
    
    // Try to find Apple TV 1, or any Apple TV, or any source at all
    let sourceIndex = -1;
    let sourceName = "";
    
    if (sources.length > 0) {
      // Try exact match for "Apple TV 1"
      sourceIndex = sources.findIndex(provider => provider.toLowerCase() === "apple tv 1");
      if (sourceIndex !== -1) {
        sourceName = sources[sourceIndex];
      } else {
        // Try any Apple TV
        sourceIndex = sources.findIndex(provider => provider.toLowerCase().includes("apple tv"));
        if (sourceIndex !== -1) {
          sourceName = sources[sourceIndex];
        } else {
          // Just use the first available source
          sourceIndex = 0;
          sourceName = sources[0];
        }
      }
    }

    if (sourceIndex === -1 || sources.length === 0) {
      setTurnOnResult(`Error: No sources found. Available: ${sources.length > 0 ? sources.join(", ") : "None"}. Turning on without source selection.`);
      // Still try to turn on without source
      setIsSendingTurnOn(true);
      try {
        const headers = getAuthHeaders();
        const powerResponse = await fetch("/api/crestron/media", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            id: kitchenRoom.id,
            action: "power",
            powerState: "on"
          }),
        });
        const powerData = await powerResponse.json();
        if (powerData.success) {
          setTurnOnResult(`Success! Turned on Kitchen TV (could not set source - none available)`);
          setTimeout(async () => {
            await fetchMediaRooms();
            setKitchenRoomDetails(null);
          }, 1000);
        } else {
          setTurnOnResult(`Failed to turn on: ${powerData.error}`);
        }
      } catch (error) {
        setTurnOnResult(`Error: ${error instanceof Error ? error.message : "Failed to send command"}`);
      } finally {
        setIsSendingTurnOn(false);
      }
      return;
    }

    setIsSendingTurnOn(true);
    setTurnOnResult(null);

    try {
      const headers = getAuthHeaders();

      console.log(`[Debug] Attempting to turn on Kitchen TV and set source (ID: ${kitchenRoom.id}, sourceIndex: ${sourceIndex}, sourceName: ${sourceName})`);

      // Step 1: Turn on the TV
      const powerResponse = await fetch("/api/crestron/media", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: kitchenRoom.id,
          action: "power",
          powerState: "on"
        }),
      });

      const powerData = await powerResponse.json();
      
      console.log(`[Debug] Power response:`, powerData);
      
      if (!powerData.success) {
        setTurnOnResult(`Error turning on TV: ${powerData.error || "Failed to turn on"}`);
        console.error(`[Debug] Power command failed:`, powerData);
        setIsSendingTurnOn(false);
        return;
      }

      // Step 2: Set source (wait a bit for TV to power on)
      await new Promise(resolve => setTimeout(resolve, 800));

      console.log(`[Debug] Attempting to set source to index ${sourceIndex} (${sourceName})`);

      const sourceResponse = await fetch("/api/crestron/media", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: kitchenRoom.id,
          action: "source",
          sourceIndex: sourceIndex
        }),
      });

      const sourceData = await sourceResponse.json();
      
      console.log(`[Debug] Source response:`, sourceData);
      
      if (sourceData.success) {
        setTurnOnResult(`Success! Turned on Kitchen TV and set source to "${sourceName}" (index ${sourceIndex})`);
        // Refresh media rooms to get updated state
        setTimeout(async () => {
          await fetchMediaRooms();
          setKitchenRoomDetails(null);
        }, 1000);
      } else {
        setTurnOnResult(`TV turned on, but failed to set source: ${sourceData.error || "Failed to set source"}`);
        console.error(`[Debug] Source command failed:`, sourceData);
      }
    } catch (error) {
      console.error(`[Debug] Exception in turn on with source:`, error);
      setTurnOnResult(`Error: ${error instanceof Error ? error.message : "Failed to send command"}`);
    } finally {
      setIsSendingTurnOn(false);
    }
  };

  return (
    <div className="p-8 max-w-full overflow-auto bg-[var(--background)] min-h-screen">
      <h1 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">Media Rooms API Data</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Processor: {processorIp} | Total Rooms: {mediaRooms.length}
      </p>

      {/* Kitchen TV Control */}
      {kitchenRoom && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Kitchen TV Control</h2>
            <button
              onClick={async () => {
                await fetchMediaRooms();
                // Also try to fetch individual room details if sources are missing
                if (kitchenRoom && (!kitchenRoom.availableProviders || kitchenRoom.availableProviders.length === 0)) {
                  setIsLoadingDetails(true);
                  try {
                    const headers = getAuthHeaders();
                    const response = await fetch(`/api/crestron/media?roomId=${kitchenRoom.id}`, {
                      headers,
                    });
                    const data = await response.json();
                    if (data.success && data.data) {
                      const roomData = Array.isArray(data.data) 
                        ? data.data.find((r: any) => String(r.id) === String(kitchenRoom.id))
                        : data.data;
                      if (roomData) {
                        setKitchenRoomDetails(roomData);
                      }
                    }
                  } catch (error) {
                    console.error("Failed to fetch details:", error);
                  } finally {
                    setIsLoadingDetails(false);
                  }
                }
              }}
              className="px-3 py-1 text-sm bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] rounded-lg text-[var(--text-secondary)]"
            >
              Refresh State
            </button>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Room Name:</p>
              <p className="font-semibold text-[var(--text-primary)]">{kitchenRoom.name}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Room ID:</p>
              <p className="font-semibold text-[var(--text-primary)]">{kitchenRoom.id}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Current State:</p>
              <p className={`font-semibold ${kitchenRoom.isPoweredOn ? 'text-green-500' : 'text-gray-500'}`}>
                {kitchenRoom.isPoweredOn ? 'ON' : 'OFF'}
              </p>
            </div>
            {isLoadingDetails && (
              <div>
                <p className="text-xs text-blue-500">Loading sources...</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTurnOffKitchen}
              disabled={isSendingCommand || isSendingTurnOn || isTurningOn}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {isSendingCommand ? "Sending Command..." : "Turn OFF Kitchen TV"}
            </button>
            <button
              onClick={handleTurnOnKitchen}
              disabled={isSendingCommand || isSendingTurnOn || isTurningOn}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {isTurningOn ? "Sending Command..." : "Turn ON Kitchen TV"}
            </button>
            <button
              onClick={handleTurnOnKitchenWithAppleTV}
              disabled={isSendingCommand || isSendingTurnOn || isTurningOn}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {isSendingTurnOn ? "Sending Commands..." : "Turn ON & Set Source"}
            </button>
          </div>
          {turnOnSimpleResult && (
            <div className={`mt-4 p-3 rounded-lg ${turnOnSimpleResult.startsWith("Success") ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
              <p className="text-sm font-medium">{turnOnSimpleResult}</p>
            </div>
          )}
          {commandResult && (
            <div className={`mt-4 p-3 rounded-lg ${commandResult.startsWith("Success") ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
              <p className="text-sm font-medium">{commandResult}</p>
            </div>
          )}
          {turnOnResult && (
            <div className={`mt-4 p-3 rounded-lg ${turnOnResult.startsWith("Success") ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
              <p className="text-sm font-medium">{turnOnResult}</p>
            </div>
          )}
          {(kitchenRoomWithSources?.availableProviders || kitchenRoom.availableProviders || []).length > 0 ? (
            <div className="mt-4">
              <p className="text-sm text-[var(--text-secondary)] mb-2">
                Available Sources ({kitchenRoomWithSources?.availableProviders?.length || kitchenRoom.availableProviders?.length || 0}):
              </p>
              <div className="flex flex-wrap gap-2">
                {(kitchenRoomWithSources?.availableProviders || kitchenRoom.availableProviders || []).map((provider: string, index: number) => (
                  <span 
                    key={index}
                    className={`px-3 py-1 rounded text-xs ${
                      provider.toLowerCase().includes("apple tv") 
                        ? "bg-blue-500/20 text-blue-500 border border-blue-500/30 font-semibold" 
                        : "bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {provider} (Index: {index})
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <p className="text-sm text-orange-500 mb-2">
                ⚠️ No sources found. {isLoadingDetails ? "Loading individual room details..." : "Check browser console (F12) for debug logs."}
              </p>
              {kitchenRoomDetails && (
                <details className="mt-2">
                  <summary className="text-xs text-orange-400 cursor-pointer">Show Raw Room Data</summary>
                  <pre className="mt-2 text-xs bg-black/50 p-2 rounded overflow-auto max-h-48">
                    {JSON.stringify(kitchenRoomDetails, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}

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
