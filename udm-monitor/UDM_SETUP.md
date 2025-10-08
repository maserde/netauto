# UDM Monitor - Setup Guide

## 🎯 Cara Deploy ke UDM

### Option 1: Manual Copy via SSH
```bash
# 1. Copy file ke UDM
scp udm_threshold_monitor.py root@192.168.1.1:/data/udm-monitor/

# 2. SSH ke UDM
ssh root@192.168.1.1

# 3. Setup di UDM
mkdir -p /data/udm-monitor
cd /data/udm-monitor

# 4. Create .env file
cat > .env << 'EOF'
UDM_HOST=localhost
UDM_USERNAME=root
UDM_PASSWORD=
WEBHOOK_URL=http://your-server:8888/api/webhook/servers/main-server/states
CLIENT_THRESHOLD=30
POLLING_INTERVAL=300
EOF

# 5. Test run
python3 udm_threshold_monitor.py
```

### Option 2: Auto Deploy Script
```bash
# Set UDM IP dan deploy
export UDM_IP=192.168.1.1
./udm_deploy.sh
```

## 🔧 Konfigurasi di UDM

Edit `/data/udm-monitor/.env`:
- `UDM_HOST=localhost` (karena running di UDM)
- `UDM_USERNAME=root` (default UDM user)
- `WEBHOOK_URL=` (IP server netauto Anda)

## 🚀 Jalankan sebagai Service

```bash
# Create systemd service
cat > /etc/systemd/system/udm-monitor.service << 'EOF'
[Unit]
Description=UDM Threshold Monitor
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/data/udm-monitor
ExecStart=/usr/bin/python3 /data/udm-monitor/udm_threshold_monitor.py
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

# Enable dan start service
systemctl enable udm-monitor
systemctl start udm-monitor
systemctl status udm-monitor
```

## 📊 Monitoring

```bash
# Cek log
tail -f /data/udm-monitor/udm_monitor.log
journalctl -u udm-monitor -f

# Cek status
systemctl status udm-monitor
```