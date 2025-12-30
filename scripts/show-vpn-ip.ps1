# Show VPN IP Address for WifiMan VPN
# Run this script after connecting to VPN to get the IP address for .20 network access

Write-Host ""
Write-Host "=== Network IP Addresses ===" -ForegroundColor Cyan
Write-Host ""

$adapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*"
}

foreach ($adapter in $adapters) {
    $interface = Get-NetAdapter -InterfaceIndex $adapter.InterfaceIndex -ErrorAction SilentlyContinue
    $name = if ($interface) { $interface.Name } else { "Unknown" }
    
    # Highlight VPN adapter (typically has "VPN", "WireGuard", "wg", or "tun" in name, or 192.168.3.x range)
    if ($name -match "VPN|WireGuard|wg|tun" -or $adapter.IPAddress -like "192.168.3.*") {
        Write-Host "  VPN IP: " -NoNewline -ForegroundColor Yellow
        Write-Host $adapter.IPAddress -ForegroundColor Green
        Write-Host "         Adapter: $name" -ForegroundColor DarkGray
        Write-Host ""
        Write-Host "  Access from .20 network: " -NoNewline
        Write-Host "http://$($adapter.IPAddress):3000" -ForegroundColor Magenta
    } else {
        Write-Host "  $($adapter.IPAddress) ($name)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=== Quick Reference ===" -ForegroundColor Cyan
Write-Host ""

# Find the likely VPN IP
$vpnIp = $adapters | Where-Object { $_.IPAddress -like "192.168.3.*" } | Select-Object -First 1

if ($vpnIp) {
    Write-Host "  From .20 network:  " -NoNewline
    Write-Host "http://$($vpnIp.IPAddress):3000" -ForegroundColor Green
}

# Find the .132 network IP
$lanIp = $adapters | Where-Object { $_.IPAddress -like "192.168.132.*" } | Select-Object -First 1

if ($lanIp) {
    Write-Host "  From .132 network: " -NoNewline
    Write-Host "http://$($lanIp.IPAddress):3000" -ForegroundColor Green
}

Write-Host "  From this machine: " -NoNewline
Write-Host "http://localhost:3000" -ForegroundColor Green

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

