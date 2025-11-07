#!/usr/bin/env bash

# error if there are any git changes

if git status -uall | grep -q "modified:"; then
  echo "There are git changes. Please commit or stash them."
  exit 1
fi

# Checkout a new branch
current_branch=$(git branch --show-current)
git checkout -b test-git

# Run the workflow - this should generate many branches
# Save the status code
npm exec saf-workflow kickoff ./test-all-workflows.ts -- --skip-todos -r mock -v git
status_code=$?

# Print the commits in the branch compared to main
git log --oneline --left-right main...test-git

# Go back, delete the branch
git checkout $current_branch
git branch -D test-git

# Clear any git changes
git reset --hard
git clean -fd

# Exit with the status code
exit $status_code