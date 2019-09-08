FROM alpine/git:1.0.7

LABEL "com.github.actions.name"="Commit documentation files"
LABEL "com.github.actions.description"="Action to commit files modified by npm run doc:add from the dedicated workflow"
LABEL "com.github.actions.icon"="git-commit"
LABEL "com.github.actions.color"="black"

LABEL "repository"="http://github.com/EndBug/game-tracker"
LABEL "homepage"="http://github.com/EndBug/game-tracker"
# Original author: Stefan Zweifel <hello@stefanzweifel.io>
LABEL "maintainer"="Federico Grandi <fgrandi30@gmail.com>"

COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["sh", "/entrypoint.sh"]