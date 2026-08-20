#!/bin/bash

source ./deploy/env.remote
echo "Remote host: $SSH_HOSTNAME"
echo "Remote zip path: $REMOTE_ZIP_PATH"
echo "Remote assets folder path: $REMOTE_ASSETS_FOLDER_PATH"

LOCAL_FOLDER="./deploy/remote-assets"
ZIP_NAME="deploy-instance.zip"

# Create zip file with contents of remote-assets (not the directory itself)
echo "Creating zip file..."
(cd "$LOCAL_FOLDER" && zip -r "../../$ZIP_NAME" .)

# Push file via sftp
echo "Transferring zip file..."
sftp "$SSH_HOSTNAME" << EOF
put "$ZIP_NAME" "$REMOTE_ZIP_PATH/$ZIP_NAME"
exit
EOF

# SSH into remote, unzip file and run command
echo "Unzipping and running command on remote..."
ssh "$SSH_HOSTNAME" << EOF
sudo -i
cd "$REMOTE_ZIP_PATH"
# Check if unzip is installed, if not install it
if ! command -v unzip &> /dev/null; then
    echo "unzip not found, installing..."
    apt-get update
    apt-get install -y unzip
fi
mkdir -p "$REMOTE_ASSETS_FOLDER_PATH"
echo "Removing existing files..."
echo "Removing $REMOTE_ASSETS_FOLDER_PATH*"
rm -rf $REMOTE_ASSETS_FOLDER_PATH* -v
unzip -o "$ZIP_NAME" -d "$REMOTE_ASSETS_FOLDER_PATH"
rm "$ZIP_NAME"
echo "Done!"
EOF

# Clean up local zip file
echo "Cleaning up."
rm "$ZIP_NAME"