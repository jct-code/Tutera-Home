"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Thermometer, RefreshCw, Droplets } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { BottomNavigation } from "@/components/layout/Navigation";
import { ThermostatRoomGroup } from "@/components/devices/ThermostatRoomGroup";
import { GlobalThermostatControl } from "@/components/devices/GlobalThermostatControl";
import { SensorCard } from "@/components/devices/SensorCard";
import { Card } from "@/components/ui/Card";
import { RefreshedAt } from "@/components/ui/RefreshedAt";
import { useAuthStore } from "@/stores/authStore";
import { useDeviceStore, fetchAllData, getThermostatPairs } from "@/stores/deviceStore";

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

export default function ClimatePage() {
  const router = useRouter();
  const { isConnected } = useAuthStore();
  const { thermostats, sensors, isLoading } = useDeviceStore();

  // Get thermostat pairs grouped by room
  const thermostatPairs = useMemo(() => getThermostatPairs(), [thermostats]);

  // Filter to climate-related sensors
  const climateSensors = sensors.filter(
    s => s.subType === "temperature" || s.subType === "humidity"
  );

  useEffect(() => {
    if (!isConnected) {
      router.push("/login");
    }
  }, [isConnected, router]);

  if (!isConnected) return null;

  // Calculate averages from sensors
  const tempSensors = sensors.filter(s => s.subType === "temperature");
  const humiditySensors = sensors.filter(s => s.subType === "humidity");
  const avgHumidity = humiditySensors.length > 0
    ? Math.round(humiditySensors.reduce((sum, s) => sum + Number(s.value), 0) / humiditySensors.length)
    : null;

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20 md:pb-6">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Thermometer className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
                Climate
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
          {/* Global Temperature Control */}
          {thermostats.length > 0 && (
            <motion.div variants={itemVariants}>
              <GlobalThermostatControl thermostats={thermostats} />
            </motion.div>
          )}

          {/* Humidity Stats (if available) */}
          {avgHumidity !== null && (
            <motion.div variants={itemVariants}>
              <Card padding="md" className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <Droplets className="w-6 h-6 text-cyan-500" />
                </div>
                <div>
                  <p className="text-3xl font-semibold">{avgHumidity}%</p>
                  <p className="text-sm text-[var(--text-secondary)]">Average Humidity</p>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Thermostats by Room */}
          {thermostatPairs.length > 0 ? (
            <section>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                Thermostats by Room
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {thermostatPairs.map((pair) => (
                  <motion.div key={pair.roomId} variants={itemVariants}>
                    <ThermostatRoomGroup pair={pair} />
                  </motion.div>
                ))}
              </div>
            </section>
          ) : thermostats.length === 0 ? (
            <div className="text-center py-12">
              <Thermometer className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                No Thermostats Found
              </h3>
              <p className="text-[var(--text-secondary)]">
                Thermostats connected to your Crestron system will appear here.
              </p>
            </div>
          ) : null}

          {/* Climate Sensors */}
          {climateSensors.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                Climate Sensors
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {climateSensors.map((sensor) => (
                  <motion.div key={sensor.id} variants={itemVariants}>
                    <SensorCard sensor={sensor} compact />
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </motion.div>
      </main>

      <BottomNavigation />
    </div>
  );
}
