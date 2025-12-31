echo "Uninstalling docker versions, old and new..."
sudo -i
apt-get remove --purge --auto-remove -y docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
echo "Done!"
