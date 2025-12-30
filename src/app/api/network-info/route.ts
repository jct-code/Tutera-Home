import { NextResponse } from "next/server";
import { networkInterfaces } from "os";

export async function GET() {
  const nets = networkInterfaces();
  const addresses: Array<{
    name: string;
    ip: string;
    url: string;
    type: "vpn" | "lan" | "other";
  }> = [];

  for (const name of Object.keys(nets)) {
    const netGroup = nets[name];
    if (!netGroup) continue;

    for (const net of netGroup) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (net.family === "IPv4" && !net.internal) {
        let type: "vpn" | "lan" | "other" = "other";
        
        // Detect VPN tunnel (192.168.3.x range or VPN-like adapter names)
        if (net.address.startsWith("192.168.3.") || 
            name.toLowerCase().includes("vpn") ||
            name.toLowerCase().includes("wireguard") ||
            name.toLowerCase().includes("wg") ||
            name.toLowerCase().includes("tun")) {
          type = "vpn";
        }
        // Detect .132 LAN
        else if (net.address.startsWith("192.168.132.")) {
          type = "lan";
        }

        addresses.push({
          name,
          ip: net.address,
          url: `http://${net.address}:3000`,
          type,
        });
      }
    }
  }

  // Sort: VPN first, then LAN, then others
  addresses.sort((a, b) => {
    const order = { vpn: 0, lan: 1, other: 2 };
    return order[a.type] - order[b.type];
  });

  const vpnAddress = addresses.find((a) => a.type === "vpn");
  const lanAddress = addresses.find((a) => a.type === "lan");

  return NextResponse.json({
    success: true,
    addresses,
    quickAccess: {
      fromVpnNetwork: vpnAddress?.url || null,
      fromLocalLan: lanAddress?.url || null,
      fromThisMachine: "http://localhost:3000",
    },
    hint: "Use 'fromVpnNetwork' URL when accessing from .20 network, 'fromLocalLan' from .132 network",
  });
}

