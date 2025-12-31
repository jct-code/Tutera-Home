"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Home,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Tv,
  Menu,
  Loader2,
  RefreshCw,
  Power,
} from "lucide-react";
import { Card } from "@/components/ui/Card";

interface AppleTVDevice {
  id: string;
  name: string;
  address: string;
  model?: string;
  os_version?: string;
  is_connected: boolean;
}

interface NowPlayingInfo {
  device_id: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  media_type?: string;
  device_state: string;
  position?: number;
  total_time?: number;
  app_name?: string;
  app_id?: string;
}

interface AppleTVRemoteProps {
  deviceId?: string;
  deviceName?: string;
  onClose?: () => void;
  compact?: boolean;
}

// Remote control button component
function RemoteButton({
  onClick,
  disabled,
  className = "",
  children,
  title,
  size = "md",
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  title?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        ${sizeClasses[size]}
        flex items-center justify-center rounded-xl
        bg-[var(--surface)] hover:bg-[var(--surface-hover)]
        text-[var(--text-secondary)] hover:text-[var(--text-primary)]
        transition-all duration-150 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </button>
  );
}

export function AppleTVRemote({ 
  deviceId, 
  deviceName, 
  onClose,
  compact = false 
}: AppleTVRemoteProps) {
  const [devices, setDevices] = useState<AppleTVDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(deviceId);
  const [nowPlaying, setNowPlaying] = useState<NowPlayingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<string | null>(null);

  // Fetch available Apple TV devices
  const fetchDevices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/appletv/devices");
      const data = await response.json();
      if (response.ok) {
        setDevices(data);
        // Auto-select first device if none selected
        if (!selectedDeviceId && data.length > 0) {
          setSelectedDeviceId(data[0].id);
        }
      } else {
        setError(data.error || "Failed to fetch devices");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to Apple TV service");
    } finally {
      setIsLoading(false);
    }
  }, [selectedDeviceId]);

  // Scan for new devices
  const scanDevices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/appletv/devices/scan", { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        setDevices(data);
        if (!selectedDeviceId && data.length > 0) {
          setSelectedDeviceId(data[0].id);
        }
      } else {
        setError(data.error || "Scan failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setIsLoading(false);
    }
  }, [selectedDeviceId]);

  // Fetch now playing info
  const fetchNowPlaying = useCallback(async () => {
    if (!selectedDeviceId) return;
    try {
      const response = await fetch(`/api/appletv/devices/${selectedDeviceId}/now_playing`);
      const data = await response.json();
      if (response.ok) {
        setNowPlaying(data);
      }
    } catch {
      // Silently fail - now playing info is optional
    }
  }, [selectedDeviceId]);

  // Send remote command
  const sendCommand = useCallback(async (command: string) => {
    if (!selectedDeviceId) {
      setError("No device selected");
      return;
    }

    setLastCommand(command);
    try {
      const response = await fetch(
        `/api/appletv/devices/${selectedDeviceId}/remote/${command}`,
        { method: "POST" }
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || `Command ${command} failed`);
      } else {
        setError(null);
        // Refresh now playing after command
        setTimeout(fetchNowPlaying, 500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Command failed");
    } finally {
      setTimeout(() => setLastCommand(null), 300);
    }
  }, [selectedDeviceId, fetchNowPlaying]);

  // Connect to device
  const connectDevice = useCallback(async () => {
    if (!selectedDeviceId) return;
    setIsConnecting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/appletv/devices/${selectedDeviceId}/connect`,
        { method: "POST" }
      );
      const data = await response.json();
      if (response.ok) {
        // Refresh device list to update connection status
        await fetchDevices();
        await fetchNowPlaying();
      } else {
        setError(data.error || "Connection failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  }, [selectedDeviceId, fetchDevices, fetchNowPlaying]);

  // Initial load
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Poll now playing info
  useEffect(() => {
    if (!selectedDeviceId) return;
    
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 5000);
    return () => clearInterval(interval);
  }, [selectedDeviceId, fetchNowPlaying]);

  // Format time (seconds to MM:SS)
  const formatTime = (seconds: number | undefined): string => {
    if (seconds === undefined || seconds === null) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const selectedDevice = devices.find(d => d.id === selectedDeviceId);

  if (compact) {
    // Compact inline remote for quick controls
    return (
      <div className="flex items-center gap-2">
        <RemoteButton onClick={() => sendCommand("play_pause")} size="sm" title="Play/Pause">
          {nowPlaying?.device_state === "playing" ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </RemoteButton>
        <RemoteButton onClick={() => sendCommand("menu")} size="sm" title="Menu">
          <Menu className="w-4 h-4" />
        </RemoteButton>
        <RemoteButton onClick={() => sendCommand("select")} size="sm" title="Select">
          <Circle className="w-4 h-4" />
        </RemoteButton>
      </div>
    );
  }

  return (
    <Card padding="lg" className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">
              {deviceName || selectedDevice?.name || "Apple TV Remote"}
            </h3>
            {selectedDevice && (
              <p className="text-xs text-zinc-400">
                {selectedDevice.is_connected ? "Connected" : "Not connected"}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={scanDevices}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="Scan for devices"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Device selector (if multiple devices) */}
      {devices.length > 1 && (
        <div className="mb-4">
          <select
            value={selectedDeviceId || ""}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm"
          >
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name} {device.is_connected ? "●" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* No devices found */}
      {devices.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <Tv className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 mb-4">No Apple TVs found</p>
          <button
            onClick={scanDevices}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm transition-colors"
          >
            Scan Network
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && devices.length === 0 && (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 text-zinc-400 mx-auto mb-3 animate-spin" />
          <p className="text-zinc-400">Searching for Apple TVs...</p>
        </div>
      )}

      {/* Remote controls */}
      {selectedDeviceId && devices.length > 0 && (
        <>
          {/* Connect button if not connected */}
          {selectedDevice && !selectedDevice.is_connected && (
            <div className="text-center mb-4">
              <button
                onClick={connectDevice}
                disabled={isConnecting}
                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors disabled:opacity-50"
              >
                {isConnecting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </span>
                ) : (
                  "Connect"
                )}
              </button>
            </div>
          )}

          {/* Now Playing */}
          {nowPlaying && (nowPlaying.title || nowPlaying.app_name) && (
            <div className="mb-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Now Playing</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  nowPlaying.device_state === "playing" 
                    ? "bg-green-500/20 text-green-400"
                    : "bg-zinc-700 text-zinc-400"
                }`}>
                  {nowPlaying.device_state}
                </span>
              </div>
              {nowPlaying.title && (
                <p className="text-white font-medium truncate">{nowPlaying.title}</p>
              )}
              {nowPlaying.artist && (
                <p className="text-zinc-400 text-sm truncate">{nowPlaying.artist}</p>
              )}
              {nowPlaying.app_name && !nowPlaying.title && (
                <p className="text-white">{nowPlaying.app_name}</p>
              )}
              {nowPlaying.position !== undefined && nowPlaying.total_time !== undefined && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full"
                      style={{ width: `${(nowPlaying.position / nowPlaying.total_time) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500">
                    {formatTime(nowPlaying.position)} / {formatTime(nowPlaying.total_time)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* D-Pad Navigation */}
          <div className="flex justify-center mb-4">
            <div className="grid grid-cols-3 gap-1">
              {/* Top row */}
              <div /> {/* Empty */}
              <RemoteButton 
                onClick={() => sendCommand("up")} 
                title="Up"
                className={lastCommand === "up" ? "bg-zinc-700" : ""}
              >
                <ChevronUp className="w-6 h-6" />
              </RemoteButton>
              <div /> {/* Empty */}

              {/* Middle row */}
              <RemoteButton 
                onClick={() => sendCommand("left")} 
                title="Left"
                className={lastCommand === "left" ? "bg-zinc-700" : ""}
              >
                <ChevronLeft className="w-6 h-6" />
              </RemoteButton>
              <RemoteButton 
                onClick={() => sendCommand("select")} 
                title="Select"
                size="lg"
                className={`bg-zinc-800 hover:bg-zinc-700 ${lastCommand === "select" ? "bg-zinc-600" : ""}`}
              >
                <Circle className="w-8 h-8" />
              </RemoteButton>
              <RemoteButton 
                onClick={() => sendCommand("right")} 
                title="Right"
                className={lastCommand === "right" ? "bg-zinc-700" : ""}
              >
                <ChevronRight className="w-6 h-6" />
              </RemoteButton>

              {/* Bottom row */}
              <div /> {/* Empty */}
              <RemoteButton 
                onClick={() => sendCommand("down")} 
                title="Down"
                className={lastCommand === "down" ? "bg-zinc-700" : ""}
              >
                <ChevronDown className="w-6 h-6" />
              </RemoteButton>
              <div /> {/* Empty */}
            </div>
          </div>

          {/* Menu and Home buttons */}
          <div className="flex justify-center gap-4 mb-4">
            <RemoteButton 
              onClick={() => sendCommand("menu")} 
              title="Menu"
              className={lastCommand === "menu" ? "bg-zinc-700" : ""}
            >
              <Menu className="w-5 h-5" />
            </RemoteButton>
            <RemoteButton 
              onClick={() => sendCommand("home")} 
              title="Home"
              className={lastCommand === "home" ? "bg-zinc-700" : ""}
            >
              <Home className="w-5 h-5" />
            </RemoteButton>
            <RemoteButton 
              onClick={() => sendCommand("turn_off")} 
              title="Power"
              className={lastCommand === "turn_off" ? "bg-zinc-700" : ""}
            >
              <Power className="w-5 h-5" />
            </RemoteButton>
          </div>

          {/* Transport controls */}
          <div className="flex justify-center gap-2 mb-4">
            <RemoteButton 
              onClick={() => sendCommand("previous")} 
              title="Previous"
              size="sm"
              className={lastCommand === "previous" ? "bg-zinc-700" : ""}
            >
              <SkipBack className="w-4 h-4" />
            </RemoteButton>
            <RemoteButton 
              onClick={() => sendCommand("play_pause")} 
              title="Play/Pause"
              className={lastCommand === "play_pause" ? "bg-zinc-700" : ""}
            >
              {nowPlaying?.device_state === "playing" ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </RemoteButton>
            <RemoteButton 
              onClick={() => sendCommand("next")} 
              title="Next"
              size="sm"
              className={lastCommand === "next" ? "bg-zinc-700" : ""}
            >
              <SkipForward className="w-4 h-4" />
            </RemoteButton>
          </div>

          {/* Volume controls */}
          <div className="flex justify-center gap-4">
            <RemoteButton 
              onClick={() => sendCommand("volume_down")} 
              title="Volume Down"
              size="sm"
              className={lastCommand === "volume_down" ? "bg-zinc-700" : ""}
            >
              <VolumeX className="w-4 h-4" />
            </RemoteButton>
            <RemoteButton 
              onClick={() => sendCommand("volume_up")} 
              title="Volume Up"
              size="sm"
              className={lastCommand === "volume_up" ? "bg-zinc-700" : ""}
            >
              <Volume2 className="w-4 h-4" />
            </RemoteButton>
          </div>
        </>
      )}
    </Card>
  );
}

export default AppleTVRemote;
