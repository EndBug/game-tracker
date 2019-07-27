import util from 'util';
import discord from 'discord.js';
import tags from 'common-tags';
import escapeRegex from 'escape-string-regexp';
import { Command } from 'discord.js-commando';

import * as backup from '../../core/backup'; //eslint-disable-line no-unused-vars

const nl = '!!NL!!';
const nlPattern = new RegExp(nl, 'g');

module.exports = class EvalCMD extends Command {
  lastResult: any;
  hrStart: [number, number];
  _sensitivePattern: any;

  constructor(client) {
    super(client, {
      name: 'eval',
      group: 'dev',
      memberName: 'eval',
      description: 'Executes JavaScript code.',
      details: 'Only the bot owner(s) may use this command.',
      ownerOnly: true,

      args: [
        {
          key: 'script',
          prompt: 'What code would you like to evaluate?',
          type: 'string'
        }
      ]
    });

    this.lastResult = null;
  }

  run(msg, args) {
    // Make a bunch of helpers
    /* eslint-disable no-unused-vars */
    const message = msg;
    const client = msg.client;
    const objects = client.registry.evalObjects;
    const lastResult = this.lastResult;
    const doReply = val => {
      if (val instanceof Error) {
        msg.reply(`Callback error: \`${val}\``);
      } else {
        const result = this.makeResultMessages(val, process.hrtime(this.hrStart));
        if (Array.isArray(result)) {
          for (const item of result) {
            msg.reply(item);
          }
        } else {
          msg.reply(result);
        }
      }
    };
    /* eslint-enable no-unused-vars */

    // Run the code and measure its execution time
    let hrDiff;
    try {
      const hrStart = process.hrtime();
      this.lastResult = eval(args.script);
      hrDiff = process.hrtime(hrStart);
    } catch (err) {
      return msg.reply(`Error while evaluating: \`${err}\``);
    }

    // Prepare for callback time and respond
    this.hrStart = process.hrtime();
    let response = this.makeResultMessages(this.lastResult, hrDiff, args.script, msg.editable);
    if (msg.editable) {
      if (response instanceof Array) {
        if (response.length > 0) response = response.slice(1, response.length - 1);
        for (const re of response) msg.say(re);
        return null;
      } else {
        return msg.edit(response);
      }
    } else {
      return msg.reply(response);
    }
  }

  makeResultMessages(result, hrDiff, input = null, editable = false) {
    const inspected = util.inspect(result, { depth: 0 })
      .replace(nlPattern, '\n')
      .replace(this.sensitivePattern, '--snip--');
    const split = inspected.split('\n');
    const last = inspected.length - 1;
    const prependPart = inspected[0] !== '{' && inspected[0] !== '[' && inspected[0] !== '\'' ? split[0] : inspected[0];
    const appendPart = inspected[last] !== '}' && inspected[last] !== ']' && inspected[last] !== '\'' ?
      split[split.length - 1] :
      inspected[last];
    const prepend = `\`\`\`javascript\n${prependPart}\n`;
    const append = `\n${appendPart}\n\`\`\``;
    if (input) {
      return discord.Util.splitMessage(tags.stripIndents`
				${editable ? `
					*Input*
					\`\`\`javascript
					${input}
					\`\`\`` :
          ''}
				*Executed in ${hrDiff[0] > 0 ? `${hrDiff[0]}s ` : ''}${hrDiff[1] / 1000000}ms.*
				\`\`\`javascript
				${inspected}
				\`\`\`
      `, {
          maxLength: 1900,
          char: '\n',
          prepend,
          append
        });
    } else {
      return discord.Util.splitMessage(tags.stripIndents`
				*Callback executed after ${hrDiff[0] > 0 ? `${hrDiff[0]}s ` : ''}${hrDiff[1] / 1000000}ms.*
				\`\`\`javascript
				${inspected}
				\`\`\`
			`, {
          maxLength: 1900,
          char: '\n',
          prepend,
          append
        });
    }
  }

  get sensitivePattern() {
    if (!this._sensitivePattern) {
      const client = this.client;
      let pattern = '';
      if (client.token) pattern += escapeRegex(client.token);
      Object.defineProperty(this, '_sensitivePattern', { value: new RegExp(pattern, 'gi') });
    }
    return this._sensitivePattern;
  }
};