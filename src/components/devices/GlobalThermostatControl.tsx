"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Thermometer,
  ChevronUp,
  ChevronDown,
  Minus,
  Plus,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Thermostat } from "@/lib/crestron/types";
import { setAllThermostatsTemp } from "@/stores/deviceStore";

interface GlobalThermostatControlProps {
  thermostats: Thermostat[];
}

export function GlobalThermostatControl({ thermostats }: GlobalThermostatControlProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Calculate average current temperature and setpoint
  const { avgCurrentTemp, avgSetPoint, activeCount } = useMemo(() => {
    const activeThermostats = thermostats.filter(t => t.mode !== 'off');
    
    if (activeThermostats.length === 0) {
      return { 
        avgCurrentTemp: Math.round(thermostats.reduce((sum, t) => sum + t.currentTemp, 0) / thermostats.length) || 0,
        avgSetPoint: 70, 
        activeCount: 0 
      };
    }
    
    const totalCurrent = thermostats.reduce((sum, t) => sum + t.currentTemp, 0);
    const totalSetPoint = activeThermostats.reduce((sum, t) => {
      return sum + (t.mode === 'heat' ? t.heatSetPoint : t.coolSetPoint);
    }, 0);
    
    return {
      avgCurrentTemp: Math.round(totalCurrent / thermostats.length),
      avgSetPoint: Math.round(totalSetPoint / activeThermostats.length),
      activeCount: activeThermostats.length,
    };
  }, [thermostats]);

  const [targetTemp, setTargetTemp] = useState(avgSetPoint);

  // Track if local target differs from average (user is adjusting)
  const hasUnsavedChanges = targetTemp !== avgSetPoint;

  const handleTempChange = useCallback((delta: number) => {
    setTargetTemp(prev => {
      const newTemp = prev + delta;
      // Clamp between reasonable range
      return Math.max(50, Math.min(90, newTemp));
    });
  }, []);

  const handleApplyToAll = useCallback(async () => {
    setIsUpdating(true);
    const success = await setAllThermostatsTemp(targetTemp);
    if (!success) {
      // Reset to average on failure
      setTargetTemp(avgSetPoint);
    }
    setIsUpdating(false);
  }, [targetTemp, avgSetPoint]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTargetTemp(parseInt(e.target.value, 10));
  }, []);

  // Calculate temperature gradient color
  const getTempColor = (temp: number) => {
    if (temp <= 65) return "#3B82F6"; // Blue - cool
    if (temp <= 72) return "#10B981"; // Green - comfortable
    if (temp <= 78) return "#F59E0B"; // Orange - warm
    return "#EF4444"; // Red - hot
  };

  const tempColor = getTempColor(targetTemp);

  return (
    <Card padding="lg" className="bg-gradient-to-br from-[var(--climate-color)]/10 to-[var(--climate-color)]/5 border-[var(--climate-color)]/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--climate-color)] flex items-center justify-center shadow-lg shadow-[var(--climate-color)]/30">
            <Thermometer className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Whole Home Temperature
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {activeCount > 0 
                ? `${activeCount} of ${thermostats.length} thermostats active`
                : `${thermostats.length} thermostats (all off)`
              }
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-light text-[var(--text-primary)]">
            {avgCurrentTemp}°
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">Avg Current</p>
        </div>
      </div>

      {/* Temperature Slider Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-6">
          {/* Decrease Button */}
          <button
            onClick={() => handleTempChange(-1)}
            disabled={isUpdating || targetTemp <= 50}
            className="w-12 h-12 rounded-full bg-[var(--surface)] hover:bg-[var(--surface-hover)] 
                     flex items-center justify-center transition-colors disabled:opacity-50
                     shadow-sm border border-[var(--border)]"
          >
            <Minus className="w-5 h-5 text-[var(--text-primary)]" />
          </button>

          {/* Target Temperature Display */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <span 
                className="text-6xl font-light transition-colors"
                style={{ color: tempColor }}
              >
                {targetTemp}
              </span>
              <span className="text-3xl text-[var(--text-tertiary)]">°F</span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Set All Thermostats
            </p>
          </div>

          {/* Increase Button */}
          <button
            onClick={() => handleTempChange(1)}
            disabled={isUpdating || targetTemp >= 90}
            className="w-12 h-12 rounded-full bg-[var(--surface)] hover:bg-[var(--surface-hover)] 
                     flex items-center justify-center transition-colors disabled:opacity-50
                     shadow-sm border border-[var(--border)]"
          >
            <Plus className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
        </div>

        {/* Temperature Slider */}
        <div className="px-4">
          <input
            type="range"
            min="50"
            max="90"
            value={targetTemp}
            onChange={handleSliderChange}
            disabled={isUpdating}
            className="w-full h-2 rounded-full appearance-none cursor-pointer
                     bg-gradient-to-r from-blue-500 via-green-500 via-yellow-500 to-red-500
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-6
                     [&::-webkit-slider-thumb]:h-6
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-white
                     [&::-webkit-slider-thumb]:shadow-lg
                     [&::-webkit-slider-thumb]:border-2
                     [&::-webkit-slider-thumb]:border-[var(--border)]
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-moz-range-thumb]:w-6
                     [&::-moz-range-thumb]:h-6
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-white
                     [&::-moz-range-thumb]:shadow-lg
                     [&::-moz-range-thumb]:border-2
                     [&::-moz-range-thumb]:border-[var(--border)]
                     [&::-moz-range-thumb]:cursor-pointer
                     disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-[var(--text-tertiary)] mt-1">
            <span>50°</span>
            <span>70°</span>
            <span>90°</span>
          </div>
        </div>

        {/* Apply Button */}
        {hasUnsavedChanges && (
          <button
            onClick={handleApplyToAll}
            disabled={isUpdating}
            className={`
              w-full py-3 px-4 rounded-xl font-medium text-white
              transition-all duration-200 shadow-lg
              ${isUpdating 
                ? "bg-[var(--text-tertiary)] cursor-not-allowed" 
                : "bg-[var(--climate-color)] hover:bg-[var(--climate-color)]/90 shadow-[var(--climate-color)]/30"
              }
            `}
          >
            {isUpdating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Updating...
              </span>
            ) : (
              `Set All to ${targetTemp}°`
            )}
          </button>
        )}

        {/* Quick Presets */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {[
            { label: "Energy Saver", temp: 68 },
            { label: "Comfort", temp: 72 },
            { label: "Warm", temp: 76 },
          ].map((preset) => (
            <button
              key={preset.temp}
              onClick={() => setTargetTemp(preset.temp)}
              disabled={isUpdating}
              className={`
                py-2 px-3 rounded-xl text-xs font-medium
                transition-all duration-200
                ${targetTemp === preset.temp
                  ? "bg-[var(--climate-color)]/20 text-[var(--climate-color)] border border-[var(--climate-color)]/30"
                  : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                }
              `}
            >
              <span className="block font-semibold">{preset.temp}°</span>
              <span className="block opacity-70">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default GlobalThermostatControl;


