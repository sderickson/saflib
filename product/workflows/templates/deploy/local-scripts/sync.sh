#!/bin/bash

REMOTE_HOST=$SSH_HOSTNAME # e.g. root@<server-domain>
REMOTE_ZIP_PATH=$REMOTE_ZIP_PATH # where to put the zip file, e.g. `/root/`
REMOTE_ASSETS_FOLDER_PATH=$REMOTE_ASSETS_FOLDER_PATH # where to put the extracted files, e.g. `/root/your-project/`
LOCAL_FOLDER="./deploy/remote-assets"
ZIP_NAME="deploy-instance.zip"

# Create zip file
echo "Creating zip file..."
zip -r "$ZIP_NAME" "$LOCAL_FOLDER"

# Push file via sftp
echo "Transferring zip file..."
sftp "$REMOTE_HOST" << EOF
put "$ZIP_NAME" "$REMOTE_PATH/$ZIP_NAME"
exit
EOF

# SSH into remote, unzip file and run command
echo "Unzipping and running command on remote..."
ssh "$REMOTE_HOST" << EOF
sudo -i
cd "$REMOTE_PATH"
# Check if unzip is installed, if not install it
if ! command -v unzip &> /dev/null; then
    echo "unzip not found, installing..."
    apt-get update
    apt-get install -y unzip
fi
mkdir -p "$REMOTE_FOLDER"
echo "Removing existing files..."
echo "Removing $REMOTE_FOLDER*"
rm -rf $REMOTE_FOLDER* -v
unzip -o "$ZIP_NAME" -d "$REMOTE_FOLDER"
rm "$ZIP_NAME"
echo "Done!"
EOF

# Clean up local zip file
echo "Cleaning up."
rm "$ZIP_NAME"