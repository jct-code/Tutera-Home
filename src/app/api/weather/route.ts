import { NextResponse } from "next/server";

// Kansas City coordinates
const LATITUDE = 39.0997;
const LONGITUDE = -94.5786;

interface OpenMeteoResponse {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
  };
}

interface WeatherResponse {
  success: boolean;
  data?: {
    temperature: number; // in Fahrenheit
    humidity?: number;
    windSpeed?: number;
    timestamp: string;
  };
  error?: string;
}

// GET - Fetch current weather from Open-Meteo API
export async function GET(): Promise<NextResponse<WeatherResponse>> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", LATITUDE.toString());
    url.searchParams.set("longitude", LONGITUDE.toString());
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m,wind_speed_10m");
    url.searchParams.set("temperature_unit", "fahrenheit");
    url.searchParams.set("wind_speed_unit", "mph");

    const response = await fetch(url.toString(), {
      next: { revalidate: 600 }, // Cache for 10 minutes
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Weather API error: ${response.status}` },
        { status: 500 }
      );
    }

    const data: OpenMeteoResponse = await response.json();

    return NextResponse.json({
      success: true,
      data: {
        temperature: Math.round(data.current.temperature_2m),
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        timestamp: data.current.time,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch weather",
      },
      { status: 500 }
    );
  }
}

