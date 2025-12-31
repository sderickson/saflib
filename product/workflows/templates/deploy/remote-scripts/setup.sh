# Install docker if it's not already installed
sudo -i
if ! command -v docker &> /dev/null; then
    echo "Docker could not be found, installing..."

    # Per https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository

    apt-get update
    apt-get install -y ca-certificates curl
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update

    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# If docker service is not running, try to restart it
if ! systemctl is-active --quiet docker; then
    echo "Docker service is not running, trying to restart..."
    service docker start
fi

# If docker is not running anything, start docker-compose base + blue

# Otherwise, run the script to deploy