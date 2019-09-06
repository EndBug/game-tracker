FROM alpine/git:1.0.7

LABEL "com.github.actions.name"="Commit docs"
LABEL "com.github.actions.description"="Commit modified docs file to the repo"
LABEL "com.github.actions.icon"="git-commit"
LABEL "com.github.actions.color"="black"

LABEL "repository"="http://github.com/EndBug/game-tracker"
LABEL "maintainer"="EndBug <fgrandi30@gmail.com>"

ADD entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]