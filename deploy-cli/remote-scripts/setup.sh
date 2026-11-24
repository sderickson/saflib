# With SAF_DATA_DIR set (env.remote), the data disk must be mounted there
# first: otherwise the stack's bind mounts would quietly create it on the
# boot disk.
if [ -n "${SAF_DATA_DIR:-}" ] && ! findmnt --mountpoint "$SAF_DATA_DIR" > /dev/null; then
  echo "SAF_DATA_DIR ($SAF_DATA_DIR) is not a mount point. Attach the data disk and mount it there first." >&2
  exit 1
fi

# Install Docker (if missing) and make sure it's running.
if ! command -v docker &> /dev/null; then
  echo "Docker could not be found, installing..."
  # Per https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository
  $SUDO apt-get update
  $SUDO apt-get install -y ca-certificates curl
  $SUDO install -m 0755 -d /etc/apt/keyrings
  $SUDO curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  $SUDO chmod a+r /etc/apt/keyrings/docker.asc
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
    $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null
  $SUDO apt-get update
  $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# Docker daemon settings. A host without /etc/docker/daemon.json gets a
# hardened default; an existing file is left alone, except that
# SAF_USERNS_REMAP=1 adds user-namespace remapping (root in a container is
# then an unprivileged uid on the host). Turning that on for a host that
# already runs containers hides its images, containers and volumes (Docker
# keeps them under a separate root), so it's meant for new hosts.
daemon_json=/etc/docker/daemon.json
restart_docker=
if [ ! -f "$daemon_json" ]; then
  echo "Installing a hardened $daemon_json..."
  userns_line=
  [ "${SAF_USERNS_REMAP:-}" != 1 ] || userns_line='  "userns-remap": "default",'
  $SUDO mkdir -p /etc/docker
  $SUDO tee "$daemon_json" > /dev/null <<EOF
{
$userns_line
  "icc": false,
  "live-restore": true,
  "userland-proxy": false,
  "no-new-privileges": true,
  "log-driver": "json-file",
  "log-opts": { "max-size": "25m", "max-file": "4" }
}
EOF
  restart_docker=1
elif [ "${SAF_USERNS_REMAP:-}" = 1 ] && ! grep -q '"userns-remap"' "$daemon_json"; then
  echo "Adding userns-remap to $daemon_json..."
  $SUDO python3 - "$daemon_json" <<'EOF'
import json, sys
path = sys.argv[1]
with open(path) as f:
    config = json.load(f)
config["userns-remap"] = "default"
with open(path, "w") as f:
    json.dump(config, f, indent=2)
    f.write("\n")
EOF
  restart_docker=1
fi
if [ -n "$restart_docker" ]; then
  $SUDO dockerd --validate --config-file "$daemon_json"
  $SUDO systemctl restart docker
fi

if ! systemctl is-active --quiet docker; then
  echo "Docker service is not running, trying to start it..."
  $SUDO service docker start
fi

# Automatic security updates: unattended-upgrades installs the -security
# pocket daily (Docker's own repo is left out; upgrading it restarts every
# container). The apt timers also keep package lists fresh, which the
# SafHostAptListsStale alert watches.
if ! dpkg -s unattended-upgrades &> /dev/null; then
  echo "Installing unattended-upgrades..."
  $SUDO apt-get update
  $SUDO apt-get install -y unattended-upgrades
fi
$SUDO tee /etc/apt/apt.conf.d/20auto-upgrades > /dev/null <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

# Reboot when an update needs it (kernel, libc) at 08:00 UTC: midnight PST,
# 1am PDT. shutdown(8) reads the time in the host's zone, so convert.
# apt-daily-upgrade runs 06:00-07:00 host time by default, before this.
reboot_time=$(date -d '08:00 UTC' +%H:%M)
$SUDO tee /etc/apt/apt.conf.d/52saf-reboot > /dev/null <<EOF
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-WithUsers "true";
Unattended-Upgrade::Automatic-Reboot-Time "$reboot_time";
EOF
$SUDO systemctl enable --now apt-daily.timer apt-daily-upgrade.timer
echo "Automatic security updates on; reboots when needed at $reboot_time host time."

echo "Done!"
