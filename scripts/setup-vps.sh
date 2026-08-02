#!/usr/bin/env bash
set -euo pipefail
# Hardening da VPS - rodar como root em Ubuntu 24.04 LTS
apt update && apt upgrade -y
apt install -y curl git sqlite3 ufw fail2ban unattended-upgrades
timedatectl set-timezone America/Sao_Paulo

id crmgc >/dev/null 2>&1 || adduser --disabled-password --gecos "" crmgc
usermod -aG sudo crmgc
mkdir -p /home/crmgc/.ssh
cp /root/.ssh/authorized_keys /home/crmgc/.ssh/ 2>/dev/null || true
chown -R crmgc:crmgc /home/crmgc/.ssh
chmod 700 /home/crmgc/.ssh; chmod 600 /home/crmgc/.ssh/authorized_keys 2>/dev/null || true

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh

command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
usermod -aG docker crmgc
systemctl enable --now docker

mkdir -p /opt/crm-gc && chown -R crmgc:crmgc /opt/crm-gc

if [[ ! -f /swapfile ]]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "VPS pronta. Reconecte como: ssh crmgc@$(curl -s ifconfig.me)"
