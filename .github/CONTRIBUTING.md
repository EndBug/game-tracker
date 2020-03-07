# Contributing
### Requirements
This is the stuff you'll need to know before submitting a PR:

 - A basic knowledge of JavaScript/Node.js.
 - Some experience with [discord.js](https://discord.js.org/#/docs/main/11.4.2/general/welcome) (general structure of the bot) and [Commando](https://discord.js.org/#/docs/commando/v0.10.0/general/welcome)* (framework for the commands) will help you.
 - All files submitted by you should be with the [TypeScript](https://www.typescriptlang.org/) extension (`.ts`): you don't need to explicitly type everything (valid JS is also valid TS), but using types would be appreciated.
 - Add [JSDoc](http://usejsdoc.org/) to your code: whenever you add a new function please add the JSDoc to it, unless it's extremely simple and/or self-explanatory. You can find examples in the existing files.
 - Please keep code formatting and style consistent; if you use ESLint in your IDE please use the rules defined in [`.eslintrc.json`](../.eslintrc.json).
 - For major edits, please test the code you wrote in a private instance before submuttung the PR: you can find a guide in ["How to setup a private instance"](../doc/private_instance.md).
 - Before creating a new utility method/function or adding a new npm package to import it, check if there's any already existing utility function that works for you. Utility function are located in [`src/utils/utils.ts`](../src/utils/utils.ts).
 - Use ES6 features (the ones supported by teh bot's version of TypeScript) such as dynamic imports, shorthands and stuff like that.
 - Do **NOT** build TypeScript code: the bot works using the [`ts-node`](https://www.npmjs.com/package/ts-node) package, if you build the files and try to run them by yourself they could not work.  

\**Please note that the version of Commando used is a slightly modified one, in order to make it compatible with TypeScript: the documentation usually refers to the 0.10.0 version, but you can find the code of the version in use at [EndBug/Commando#djs-v11.4.2](https://github.com/EndBug/Commando/tree/djs-v11.4.2)*

### All-contributors

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!  
To get added to the contributors list in [`README`](../README.md) please ask it the pull request or issue you opened ;)
