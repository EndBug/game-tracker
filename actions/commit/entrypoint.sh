#!/bin/sh
set -eu

# Set up .netrc file with GitHub credentials
git_setup ( ) {
  cat <<- EOF > $HOME/.netrc
        machine github.com
        login $GITHUB_ACTOR
        password $GITHUB_TOKEN

        machine api.github.com
        login $GITHUB_ACTOR
        password $GITHUB_TOKEN
EOF
    chmod 600 $HOME/.netrc

    git config --global user.email "actions@github.com"
    git config --global user.name "Game Tracker Actions"
}

echo "Removing changes to package.json and package-lock.json"
git checkout -- package.json

# This section only runs if there have been file changes
echo "Checking for uncommitted changes in the git working tree..."
if ! git diff --cached --exit-code
then
    git_setup

    git fetch 

    # Switch to branch from current Workflow run
    echo "Creating and switching branch..."
    git branch "${GITHUB_REF:11}"
    git checkout "${GITHUB_REF:11}"

    echo "Adding files..."
    git add "${INPUT_COMMIT_PATH}"

    echo "Creating commit..."
    git commit -m "$INPUT_COMMIT_MESSAGE" --author="$INPUT_COMMIT_AUTHOR_NAME <$INPUT_COMMIT_AUTHOR_EMAIL>"

    echo "Pushing to repo..."
    git push --set-upstream origin "${GITHUB_REF:11}"
else
    echo "Working tree clean. Nothing to commit."
fi