# Stored data

### What kind of data does the bot store about me?

The bot can store two types of data about you: temporary [game data](#game-data) and your [linked accounts](#linked-accounts).

### Game data

Web APIs and/or web scrapers can sometimes be kind of slow.  
If that's the case with the API for the game you're seeing, the bot could cache your search results for a few minutes: this makes it possible to have quick replies after the first search on a profile while keeping the number of requests low, reducing the chances of being ratelimited.

When API responses get cached they don't get saved in any file, so they disappear as long as their timer runs out. After that, any new request for the same account will require a new request (and likely slight longer waiting times).

### Linked accounts

When you link your game account with your Discord profile it gets saved in a private database.

Although this bot is open-source and you can check by yourself how accounts get saved etc. the database does **not** get published on GitHub or any other platform. The file is kept in a private server (no third-party providers involved) along with the bot.  
The database gets periodically backed up so that there are no major losses whatsoever: this backup is also private and accessible only to developers.

If you want to know which accounts you have linked, you can use the `data` command: that will show you the saved account along with other data such as the platform you set.  
Although this command let's you see all your linked games at once, it's possible that they're not a easily understandable format: if you want more detailed info about one account in specific, you can use that game's link command (e.g. for Overwatch use `ow link`).

If you want to remove a single account from your linked ones you can run the game's unlink command (e.g. for Overwatch use `ow unlink`).  
If you want to remove all your saved data at once use the `erase-data` command: you will be shown a prompt to which you can react to confirm the action.