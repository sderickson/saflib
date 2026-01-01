#!/bin/bash
# Helper script to execute remote scripts with env.remote variables available
# Usage: ./exec-remote.sh < script.sh

# Source env.remote from the deploy directory to get SSH_HOSTNAME
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
source "$DEPLOY_DIR/env.remote"

# Read stdin (the script to execute)
SCRIPT_CONTENT=$(cat)

# Extract variable assignments from env.remote (skip comments and empty lines)
ENV_VARS=$(grep -E '^[A-Z_]+=' "$DEPLOY_DIR/env.remote" | grep -v '^#')

# Send env vars and modified script to remote
{
  echo 'sudo -i'
  echo "$ENV_VARS"
  echo "$SCRIPT_CONTENT"
} | ssh "$SSH_HOSTNAME" 'bash -s'

