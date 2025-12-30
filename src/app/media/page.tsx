"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Music, RefreshCw, Power, Play, Layers, Building2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Header } from "@/components/layout/Header";
import { BottomNavigation } from "@/components/layout/Navigation";
import { MediaZoneControl } from "@/components/devices/MediaZoneControl";
import { MediaRoomCard } from "@/components/devices/MediaRoomCard";
import { Card } from "@/components/ui/Card";
import { RefreshedAt } from "@/components/ui/RefreshedAt";
import { useAuthStore } from "@/stores/authStore";
import { 
  useDeviceStore, 
  fetchAllData, 
  getMediaRoomZonesWithData,
  setZoneMediaRoomPower,
} from "@/stores/deviceStore";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

type ViewMode = "zones" | "rooms";

export default function MediaPage() {
  const router = useRouter();
  const { isConnected } = useAuthStore();
  // Use useShallow to prevent re-renders when object references change but values are the same
  const { mediaRooms, rooms, isLoading } = useDeviceStore(useShallow((state) => ({
    mediaRooms: state.mediaRooms,
    rooms: state.rooms,
    isLoading: state.isLoading,
  })));
  
  // View mode: zones (grouped by floor) or rooms (individual)
  const [viewMode, setViewMode] = useState<ViewMode>("zones");
  const [expandedZoneId, setExpandedZoneId] = useState<string | null>("whole-house");
  const [isUpdating, setIsUpdating] = useState(false);

  // Get media room zones with computed data
  const mediaRoomZones = useMemo(() => getMediaRoomZonesWithData(), [mediaRooms]);
  
  // Create room name map for display
  const roomNameMap = useMemo(() => {
    const map = new Map<string, string>();
    rooms.forEach(room => map.set(room.id, room.name));
    return map;
  }, [rooms]);

  useEffect(() => {
    if (!isConnected) {
      router.push("/login");
    }
  }, [isConnected, router]);

  if (!isConnected) return null;

  // Calculate stats
  const totalRooms = mediaRooms.length;
  const playingRooms = mediaRooms.filter(m => m.isPoweredOn);
  const playingCount = playingRooms.length;
  const avgVolume = playingCount > 0
    ? Math.round(playingRooms.reduce((sum, m) => sum + m.volumePercent, 0) / playingCount)
    : 0;
    
  const handleZoneToggle = (zoneId: string) => {
    setExpandedZoneId(prev => prev === zoneId ? null : zoneId);
  };
  
  const handleAllOff = async () => {
    setIsUpdating(true);
    await setZoneMediaRoomPower("whole-house", "off");
    setIsUpdating(false);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20 md:pb-6">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-500 to-zinc-600 flex items-center justify-center">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
                Media
              </h1>
              <RefreshedAt />
            </div>
          </div>
          <button
            onClick={() => fetchAllData()}
            disabled={isLoading}
            className="p-2 rounded-xl hover:bg-[var(--surface-hover)] transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-[var(--text-secondary)] ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Quick Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* Rooms Playing */}
            <Card padding="md" className={`flex items-center gap-3 ${playingCount > 0 ? "bg-gradient-to-br from-slate-500/10 to-transparent" : ""}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                playingCount > 0 ? "bg-slate-600" : "bg-[var(--surface-hover)]"
              }`}>
                <Play className={`w-6 h-6 ${playingCount > 0 ? "text-white" : "text-[var(--text-tertiary)]"}`} />
              </div>
              <div>
                <p className="text-3xl font-semibold">
                  {playingCount}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {playingCount === 1 ? "Room Playing" : "Rooms Playing"}
                </p>
              </div>
            </Card>

            {/* Average Volume (only when playing) */}
            {playingCount > 0 && (
              <Card padding="md" className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-500/20 flex items-center justify-center">
                  <Music className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <p className="text-3xl font-semibold">{avgVolume}%</p>
                  <p className="text-sm text-[var(--text-secondary)]">Avg Volume</p>
                </div>
              </Card>
            )}

            {/* All Off Button (only when something is playing) */}
            {playingCount > 0 && (
              <button
                onClick={handleAllOff}
                disabled={isUpdating}
                className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Power className="w-6 h-6 text-red-500" />
                </div>
                <div className="text-left">
                  <p className="text-lg font-semibold text-red-500">All Off</p>
                  <p className="text-sm text-[var(--text-secondary)]">Stop all audio</p>
                </div>
              </button>
            )}
          </motion.div>

          {/* View Mode Toggle */}
          {mediaRooms.length > 0 && (
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Audio Control
                </h2>
                <div className="flex items-center gap-1 p-1 bg-[var(--surface)] rounded-xl">
                  <button
                    onClick={() => setViewMode("zones")}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                      transition-all duration-200
                      ${viewMode === "zones"
                        ? "bg-slate-600 text-white shadow-sm"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                      }
                    `}
                  >
                    <Layers className="w-4 h-4" />
                    By Zone
                  </button>
                  <button
                    onClick={() => setViewMode("rooms")}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                      transition-all duration-200
                      ${viewMode === "rooms"
                        ? "bg-slate-600 text-white shadow-sm"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                      }
                    `}
                  >
                    <Building2 className="w-4 h-4" />
                    By Room
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Zone Controls */}
          {viewMode === "zones" && mediaRoomZones.length > 0 && (
            <section>
              <div className="space-y-4">
                {mediaRoomZones.map((zoneData, index) => (
                  <motion.div 
                    key={zoneData.zone.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    layout
                  >
                    <MediaZoneControl
                      zoneData={zoneData}
                      expanded={expandedZoneId === zoneData.zone.id}
                      onToggleExpand={() => handleZoneToggle(zoneData.zone.id)}
                    />
                  </motion.div>
                ))}
              </div>
              
              {/* Zone Legend */}
              <div className="mt-6 p-4 bg-[var(--surface)] rounded-xl">
                <p className="text-xs font-medium text-[var(--text-tertiary)] mb-2">
                  About Media Zones
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Zones group audio rooms by floor or area. Adjusting zone volume affects all playing rooms within it. 
                  <strong className="text-[var(--text-primary)]"> Whole House</strong> controls all {totalRooms} media rooms at once.
                </p>
              </div>
            </section>
          )}

          {/* Room-by-Room Controls */}
          {viewMode === "rooms" && (
            <section>
              {mediaRooms.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {mediaRooms.map((mediaRoom, index) => (
                    <motion.div 
                      key={mediaRoom.id} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <MediaRoomCard 
                        mediaRoom={mediaRoom}
                        roomName={mediaRoom.roomId ? roomNameMap.get(mediaRoom.roomId) : undefined}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Music className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                    No Media Rooms Found
                  </h3>
                  <p className="text-[var(--text-secondary)]">
                    Media rooms connected to your Crestron system will appear here.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Empty State */}
          {mediaRooms.length === 0 && (
            <div className="text-center py-12">
              <Music className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                No Media Rooms Found
              </h3>
              <p className="text-[var(--text-secondary)]">
                Media rooms connected to your Crestron system will appear here.
              </p>
            </div>
          )}
        </motion.div>
      </main>

      <BottomNavigation />
    </div>
  );
}
