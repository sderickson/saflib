#!/usr/bin/env bash

# error if there are any git changes
git branch -D test-git &>/dev/null 

if git status -uall | grep -q "modified:"; then
  echo "There are git changes. Please commit or stash them."
  git status -uall
  exit 1
fi

# Checkout a new branch
current_branch=$(git branch --show-current)
echo "Checking out test-git branch from $current_branch"
git checkout -b test-git

# Run the workflow - this should generate many branches
# Save the status code
npm exec saf-workflow kickoff ./workflows-cli/test-all-workflows.ts -- --skip-todos -r mock -v git
status_code=$?

# Print the commits in the branch compared to main
git --no-pager log --oneline --left-right $current_branch...test-git
git reset --hard
git clean -fd

# Go back, delete the branch
git checkout $current_branch

# Exit with the status code
exit $status_code