#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 server for Docker projects behind one Caddy front door (ADR 0023).
# Safe to run again. Run as root on the server (infra/server/README.md):
#   ssh yeral-vps 'cat > /root/setup.sh' < infra/server/setup.sh && ssh yeral-vps 'bash /root/setup.sh'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo '== packages'
apt-get update -q
apt-get -yq -o Dpkg::Options::=--force-confold upgrade
apt-get -yq install ca-certificates curl gnupg ufw fail2ban unattended-upgrades

echo '== time: UTC (apps keep each business on its own clock)'
timedatectl set-timezone UTC

echo '== swap: 2 GB'
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
fi
grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
echo 'vm.swappiness=10' >/etc/sysctl.d/90-swappiness.conf
sysctl -q --system

echo '== ssh: keys only'
cat >/etc/ssh/sshd_config.d/10-hardening.conf <<'EOF'
PermitRootLogin prohibit-password
PasswordAuthentication no
KbdInteractiveAuthentication no
X11Forwarding no
EOF
sshd -t
systemctl reload ssh

echo '== firewall: ssh and web only (only Caddy publishes ports, so Docker never opens anything else)'
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

echo '== fail2ban and automatic security updates'
systemctl enable --now fail2ban
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

echo '== docker'
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    >/etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get -yq install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
cat >/etc/docker/daemon.json <<'EOF'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
EOF
systemctl restart docker
docker network inspect edge >/dev/null 2>&1 || docker network create edge

echo '== deploy user for automated deploys later (its key is added with the CI deploy)'
id deploy >/dev/null 2>&1 || useradd -m -s /bin/bash -G docker deploy

mkdir -p /srv/edge/sites /srv/yeral
echo '== done'
