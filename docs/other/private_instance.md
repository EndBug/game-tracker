# How to setup a private instance

### Environment

You'll first need to install Node.js and npm to your local machine:

- Go to Node.js' [download page](https://nodejs.org/en/download/).
- Click and download the LTS installer for your operating system (npm should be included in the bundle).
- Check the installation by opening the terminal and running `node -v` and `npm --version`.

### Bot

- Clone this repository using [git](https://git-scm.com/docs/git-clone) or [GitHub Desktop](https://desktop.github.com/).
- Run `npm i` to install the required packages.
- Create a `.env` file with your tokens (you can find a model in [`.env-model`](https://github.com/EndBug/game-tracker/blob/main/.env-model)). Please note that `BACKUP` and `DBL_TOKEN` are only used by the public bot: those functionalities are built for the bot and its server, if you want to make them work with yours you'll need to edit the code; you can avoid writing them.
- If you want the bot to reload every time you edit a file, run `npm run dev`. If you jsut want the bot to start, run `npm run start`.
