import * as Commando from 'discord.js-commando';
import { APIUtil } from '../../core/app';

export default class DataCMD extends Commando.Command {
  constructor(client) {
    super(client, {
      name: 'data',
      aliases: ['data-managment', 'data-info'],
      group: 'data',
      memberName: 'data',
      description: 'Shows you all the data the the bot stored about you.',
      details: 'It does not include temporary caching; that data is automatically deleted anyways and doesn\'t get stored in the database.',
      args: [{
        key: 'hide',
        prompt: 'Whether you want to hide your accounts in the message this command shows.',
        type: 'string',
        parse: (str) => {
          return !['0', 'false', 'no'].includes(str);
        },
        default: false
      }],
      guildOnly: false,
      ownerOnly: false
    });
  }

  //@ts-ignore
  run(msg: Commando.CommandoMessage, { hide }: { hide: boolean }) {
    const res = APIUtil.find(msg.author, true);
    let text: string;
    if (Object.keys(res).length > 0) {
      text = 'This is your data:\n```';
      for (const key in res) {
        const str = hide ? '***' : JSON.stringify(res[key]);
        text += `\n${key}: ${str}`;
      }
      text += '\n```If you want to unlink on of these accounts search for the unlink command for that game (you can use `help` to find it).\nTo delete all of your data, run `erase-data`';
    } else text = 'There\'s no data about you in the databse.';
    msg.reply(text);
  }
}
