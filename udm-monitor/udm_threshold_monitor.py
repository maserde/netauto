#!/usr/bin/env python3
"""
udm_threshold_monitor.py
Simple UDM Client Monitor dengan Redis Logging

Fungsi:
- Monitor jumlah klien UDM setiap 5 menit  
- Threshold: 30 klien
- >30 klien = webhook UP (bonding ON)
- <30 klien = webhook DOWN (bonding OFF)
- Log ke Redis untuk tracking

Author: Generated for netauto project
Date: October 8, 2025
"""

import os
import time
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

# Import modules dengan error handling
try:
    import requests
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
except ImportError:
    print("❌ Error: requests tidak ditemukan. Install dengan: pip install requests")
    exit(1)

try:
    import redis
except ImportError:
    print("⚠️ Warning: redis tidak ditemukan. Install dengan: pip install redis")
    print("Redis logging akan dinonaktifkan")
    redis = None

# Load .env file from parent directory
def load_env_file():
    """Load .env file dari parent directory"""
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip().strip('"\'')
                    os.environ[key] = value
        print(f"✓ Loaded .env from: {env_path}")
    else:
        print(f"⚠️ .env file not found at: {env_path}")

# Load environment variables
load_env_file()

class UDMMonitor:
    """
    Simple UDM Monitor dengan Redis logging
    """
    
    def __init__(self):
        """
        Inisialisasi monitor dengan config dari environment variables
        """
        # Auto-detect jika running di UDM
        self.running_on_udm = self.detect_udm_environment()
        
        # Konfigurasi UDM
        if self.running_on_udm:
            self.udm_host = os.getenv('UDM_HOST', 'localhost')
            self.udm_username = os.getenv('UDM_USERNAME', 'root')
            self.udm_password = os.getenv('UDM_PASSWORD', '')
        else:
            self.udm_host = os.getenv('UDM_HOST', '192.168.1.1')
            self.udm_username = os.getenv('UDM_USERNAME', 'admin')
            self.udm_password = os.getenv('UDM_PASSWORD', '')
        
        # Konfigurasi Webhook
        self.webhook_url = os.getenv('WEBHOOK_URL', 'http://localhost:3000/api/webhook/servers/main-server/states')
        self.webhook_method = os.getenv('WEBHOOK_METHOD', 'PUT')
        
        # Konfigurasi Monitoring
        self.threshold = int(os.getenv('CLIENT_THRESHOLD', '30'))  # Changed to 30
        self.polling_interval = int(os.getenv('POLLING_INTERVAL', '300'))  # 5 menit default
        
        # Redis config
        self.redis_host = os.getenv('REDIS_HOST', 'localhost')
        self.redis_port = int(os.getenv('REDIS_PORT', '6379'))
        self.redis_db = int(os.getenv('REDIS_DB', '0'))
        self.redis_client = None
        
        # Status tracking
        self.last_state = None
        self.bonding_disabled = False
        
        # Setup logging dan Redis
        self.setup_logging()
        self.setup_redis()
        
        # Session untuk UDM API
        self.udm_session = requests.Session()
        self.udm_session.verify = False  # UDM menggunakan self-signed certificate
        
        self.logger.info("UDM Threshold Monitor diinisialisasi")
        self.logger.info(f"Running on UDM: {'Yes' if self.running_on_udm else 'No'}")
        self.logger.info(f"UDM Host: {self.udm_host}")
        self.logger.info(f"Threshold: {self.threshold} klien")
        self.logger.info(f"Polling interval: {self.polling_interval} detik")
        self.logger.info(f"Webhook URL: {self.webhook_url}")

    def setup_logging(self):
        """
        Setup logging configuration
        """
        log_level = os.getenv('LOG_LEVEL', 'INFO')
        log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        
        # Windows-compatible log path
        log_dir = Path.home() / 'AppData' / 'Local' / 'UDMMonitor'
        log_dir.mkdir(exist_ok=True)
        log_file = log_dir / 'udm_monitor.log'
        
        logging.basicConfig(
            level=getattr(logging, log_level.upper()),
            format=log_format,
            handlers=[
                logging.StreamHandler(),
                logging.FileHandler(str(log_file))
            ]
        )
        
        self.logger = logging.getLogger('UDMMonitor')

    def detect_udm_environment(self) -> bool:
        """Detect jika script running di UDM device"""
        try:
            # Check beberapa indikator UDM environment
            udm_indicators = [
                os.path.exists('/usr/bin/ubnt-device-info'),
                os.path.exists('/mnt/data'),
                os.path.exists('/data/unifi'),
                'ubnt' in os.uname().nodename.lower() if hasattr(os, 'uname') else False
            ]
            return any(udm_indicators)
        except:
            return False

    def setup_redis(self):
        """Setup Redis connection jika tersedia"""
        if redis:
            try:
                self.redis_client = redis.Redis(
                    host=self.redis_host,
                    port=self.redis_port,
                    db=self.redis_db,
                    decode_responses=True
                )
                # Test connection
                self.redis_client.ping()
                self.logger.info("Redis connection berhasil")
            except Exception as e:
                self.logger.warning(f"Redis connection gagal: {e}")
                self.redis_client = None
        else:
            self.logger.info("Redis tidak tersedia, logging ke file saja")

    def log_threshold_event(self, client_count, action):
        """Log threshold event ke Redis dan file"""
        timestamp = datetime.now().isoformat()
        event_data = {
            'timestamp': timestamp,
            'client_count': client_count,
            'threshold': self.threshold,
            'action': action
        }
        
        # Log ke Redis jika tersedia
        if self.redis_client:
            try:
                key = f"udm_monitor:{timestamp}"
                self.redis_client.hset(key, mapping=event_data)
                self.redis_client.expire(key, 86400 * 7)  # Keep 7 days
                self.logger.info(f"Event logged to Redis: {event_data}")
            except Exception as e:
                self.logger.error(f"Redis logging error: {e}")
        
        # Log ke file
        self.logger.info(f"Threshold event: {action} - Clients: {client_count}/{self.threshold}")

    def authenticate_udm(self) -> bool:
        """
        Authenticate ke UDM Controller API
        
        Returns:
            bool: True jika authentication berhasil
        """
        try:
            login_url = f"https://{self.udm_host}/api/auth/login"
            login_data = {
                "username": self.udm_username,
                "password": self.udm_password,
                "remember": False
            }
            
            response = self.udm_session.post(
                login_url,
                json=login_data,
                timeout=10
            )
            
            if response.status_code == 200:
                self.logger.info("Berhasil authenticate ke UDM")
                return True
            else:
                self.logger.error(f"Gagal authenticate ke UDM: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error saat authenticate ke UDM: {str(e)}")
            return False

    def get_connected_clients(self) -> Optional[int]:
        """
        Mendapatkan jumlah klien yang terhubung dari UDM
        
        Returns:
            Optional[int]: Jumlah klien yang terhubung, None jika error
        """
        try:
            # Endpoint untuk mendapatkan active clients
            clients_url = f"https://{self.udm_host}/proxy/network/api/s/default/stat/sta"
            
            response = self.udm_session.get(clients_url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Filter hanya klien yang aktif (connected)
                active_clients = [
                    client for client in data.get('data', [])
                    if client.get('_is_guest_by_uap', False) == False and
                       client.get('is_wired', False) == True or client.get('is_wireless', False) == True
                ]
                
                client_count = len(active_clients)
                self.logger.debug(f"Ditemukan {client_count} klien aktif")
                
                # Log detail klien untuk debugging
                for client in active_clients[:5]:  # Log hanya 5 klien pertama
                    self.logger.debug(f"Klien: {client.get('hostname', 'Unknown')} - "
                                    f"MAC: {client.get('mac', 'Unknown')} - "
                                    f"IP: {client.get('ip', 'Unknown')}")
                
                return client_count
                
            else:
                self.logger.error(f"Gagal mendapatkan data klien: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.logger.error(f"Error saat mendapatkan data klien: {str(e)}")
            return None

    def trigger_disable_bonding_webhook(self) -> bool:
        """
        Trigger webhook untuk disable bonding
        
        Returns:
            bool: True jika webhook berhasil dipanggil
        """
        try:
            # Payload sesuai dengan format yang diharapkan oleh netauto webhook
            payload = {
                "state": "DOWN"  # DOWN state untuk disable bonding
            }
            
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'UDM-Threshold-Monitor/1.0'
            }
            
            self.logger.info(f"Mengirim webhook {self.webhook_method} ke {self.webhook_url}")
            self.logger.debug(f"Payload: {json.dumps(payload, indent=2)}")
            
            if self.webhook_method.upper() == 'PUT':
                response = requests.put(
                    self.webhook_url,
                    json=payload,
                    headers=headers,
                    timeout=30
                )
            else:
                response = requests.post(
                    self.webhook_url,
                    json=payload,
                    headers=headers,
                    timeout=30
                )
            
            if response.status_code in [200, 201, 202]:
                self.logger.info(f"Webhook berhasil dipanggil - Status: {response.status_code}")
                self.logger.debug(f"Response: {response.text}")
                return True
            else:
                self.logger.error(f"Webhook gagal - Status: {response.status_code} - Response: {response.text}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error saat memanggil webhook: {str(e)}")
            return False

    def trigger_enable_bonding_webhook(self) -> bool:
        """
        Trigger webhook untuk enable bonding
        
        Returns:
            bool: True jika webhook berhasil dipanggil
        """
        try:
            # Payload untuk enable bonding
            payload = {
                "state": "UP"  # UP state untuk enable bonding
            }
            
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'UDM-Threshold-Monitor/1.0'
            }
            
            self.logger.info(f"Mengirim webhook {self.webhook_method} ke {self.webhook_url}")
            self.logger.debug(f"Payload: {json.dumps(payload, indent=2)}")
            
            if self.webhook_method.upper() == 'PUT':
                response = requests.put(
                    self.webhook_url,
                    json=payload,
                    headers=headers,
                    timeout=30
                )
            else:
                response = requests.post(
                    self.webhook_url,
                    json=payload,
                    headers=headers,
                    timeout=30
                )
            
            if response.status_code in [200, 201, 202]:
                self.logger.info(f"Webhook berhasil dipanggil - Status: {response.status_code}")
                self.logger.debug(f"Response: {response.text}")
                return True
            else:
                self.logger.error(f"Webhook gagal - Status: {response.status_code} - Response: {response.text}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error saat memanggil webhook: {str(e)}")
            return False

    def check_threshold_and_act(self, client_count: int) -> None:
        """
        Cek threshold dan lakukan aksi sesuai dengan aturan:
        >30 = on bonding, <30 = off bonding
        """
        # Threshold logic: <30 = OFF, >=30 = ON
        if client_count < self.threshold:  # <30 = disable bonding
            if not self.bonding_disabled:
                self.log_threshold_event(client_count, "DISABLE_BONDING")
                
                if self.trigger_disable_bonding_webhook():
                    self.bonding_disabled = True
                    self.logger.info(f"Bonding DISABLED - Clients: {client_count} < {self.threshold}")
                else:
                    self.logger.error("Gagal disable bonding via webhook")
            else:
                self.logger.debug(f"Bonding sudah disabled - Clients: {client_count} < {self.threshold}")
                
        else:  # >=30 = enable bonding
            if self.bonding_disabled:
                self.log_threshold_event(client_count, "ENABLE_BONDING")
                
                if self.trigger_enable_bonding_webhook():
                    self.bonding_disabled = False
                    self.logger.info(f"Bonding ENABLED - Clients: {client_count} >= {self.threshold}")
                else:
                    self.logger.error("Gagal enable bonding via webhook")
            else:
                self.logger.debug(f"Bonding sudah enabled - Clients: {client_count} >= {self.threshold}")

    def run_monitoring_loop(self) -> None:
        """
        Menjalankan loop monitoring utama
        """
        self.logger.info("Memulai monitoring loop...")
        
        while True:
            try:
                # Authenticate jika diperlukan
                if not self.authenticate_udm():
                    self.logger.error("Gagal authenticate, akan coba lagi dalam 60 detik...")
                    time.sleep(60)
                    continue
                
                # Dapatkan jumlah klien yang terhubung
                client_count = self.get_connected_clients()
                
                if client_count is not None:
                    self.logger.info(f"Klien terhubung: {client_count}")
                    self.check_threshold_and_act(client_count)
                else:
                    self.logger.warning("Gagal mendapatkan jumlah klien, akan coba lagi...")
                
                # Tunggu sebelum polling berikutnya
                self.logger.debug(f"Menunggu {self.polling_interval} detik untuk polling berikutnya...")
                time.sleep(self.polling_interval)
                
            except KeyboardInterrupt:
                self.logger.info("Monitoring dihentikan oleh user")
                break
                
            except Exception as e:
                self.logger.error(f"Error dalam monitoring loop: {str(e)}")
                self.logger.info("Akan coba lagi dalam 60 detik...")
                time.sleep(60)

def main():
    """
    Main function untuk menjalankan UDM Threshold Monitor
    """
    print("UDM Threshold Monitor v1.0")
    print("==========================")
    
    # Validasi environment variables yang diperlukan
    required_env_vars = ['UDM_PASSWORD']
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"Error: Environment variables berikut diperlukan: {', '.join(missing_vars)}")
        print("\nContoh konfigurasi:")
        print("export UDM_HOST='192.168.1.1'")
        print("export UDM_USERNAME='admin'")
        print("export UDM_PASSWORD='your_password'")
        print("export WEBHOOK_URL='http://your-server:3000/api/webhook/servers/main-server/states'")
        print("export CLIENT_THRESHOLD='30'")
        print("export POLLING_INTERVAL='300'")
        return 1
    
    try:
        monitor = UDMMonitor()
        monitor.run_monitoring_loop()
        return 0
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return 1

if __name__ == "__main__":
    exit(main())