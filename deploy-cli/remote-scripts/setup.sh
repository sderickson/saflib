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
