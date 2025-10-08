#!/bin/bash
# udm_deploy.sh
# Script untuk deploy UDM Monitor ke UDM device

echo "🚀 UDM Monitor Deployment Script"
echo "=================================="

# Konfigurasi
UDM_IP="${UDM_IP:-192.168.1.1}"
UDM_USER="${UDM_USER:-root}"
UDM_REMOTE_PATH="/data/udm-monitor"

echo "📋 Configuration:"
echo "   UDM IP: $UDM_IP"
echo "   User: $UDM_USER"
echo "   Remote Path: $UDM_REMOTE_PATH"
echo

# Copy file ke UDM
echo "📁 Copying files to UDM..."
scp udm_threshold_monitor.py $UDM_USER@$UDM_IP:$UDM_REMOTE_PATH/

# Create environment file di UDM
echo "⚙️  Creating environment setup..."
ssh $UDM_USER@$UDM_IP << 'EOF'
mkdir -p /data/udm-monitor
cd /data/udm-monitor

# Create .env file
cat > .env << 'ENVEOF'
UDM_HOST=localhost
UDM_USERNAME=root
UDM_PASSWORD=
WEBHOOK_URL=http://your-server:8888/api/webhook/servers/main-server/states
CLIENT_THRESHOLD=30
POLLING_INTERVAL=300
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
ENVEOF

# Make script executable
chmod +x udm_threshold_monitor.py

echo "✅ Files deployed successfully to UDM"
echo "📍 Location: /data/udm-monitor/"
echo
echo "🔧 Next steps:"
echo "1. SSH to UDM: ssh root@$UDM_IP"
echo "2. Edit config: nano /data/udm-monitor/.env"
echo "3. Run monitor: cd /data/udm-monitor && python3 udm_threshold_monitor.py"
EOF

echo "🎉 Deployment completed!"