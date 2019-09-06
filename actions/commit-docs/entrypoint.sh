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


# This section only runs if there have been file changes
echo "Checking for uncommitted changes in the git working tree."
if git diff --quiet ./doc
then
    git_setup

    # Switch to branch from current Workflow run
    git checkout "${GITHUB_REF:11}"
    echo "checkout pass"

    # Adds only files in ./doc, so that it doesn't update package files
    git add ./doc

    echo "add pass"
    git commit -m "$INPUT_COMMIT_MESSAGE" --author="$INPUT_COMMIT_AUTHOR_NAME <$INPUT_COMMIT_AUTHOR_EMAIL>"

    echo "commit pass"
    git push --set-upstream origin "${GITHUB_REF:11}"
else
    echo "Working tree clean. Nothing to commit."
fi