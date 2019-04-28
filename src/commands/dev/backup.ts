import * as Commando from 'discord.js-commando';

import { owner, roles } from '../../core/app';
import * as backup from '../../core/backup';

export default class BackupCMD extends Commando.Command {
  constructor(client: Commando.CommandoClient) {
    super(client, {
      name: 'backup',
      aliases: ['upload'],
      group: 'dev',
      memberName: 'backup',
      description: 'Forces the bot to backup the settings database',
      details: 'One backup is issued after every crash.',
      guildOnly: true,
      hidden: backup.available
    });
  }

  //@ts-ignore
  async run(msg: Commando.CommandoMessage) {
    if (!backup.available) return msg.reply('There is no backup token, please check your .env file.');

    let res = await msg.say('Uploading backup...');
    if (res instanceof Array) res = res[0];
    backup.upload('Manual')
      .then(() => {
        if (res instanceof Array) res = res[0];
        res.edit('Backup uploaded :white_check_mark:');
      })
      .catch(err => {
        if (res instanceof Array) res = res[0];
        res.edit(`Error while uploading backup:\n\`\`\`\n${err}\n\`\`\``);
      });
  }

  hasPermission(msg: Commando.CommandoMessage) {
    if (msg.author == owner) return true;
    const member = msg.member;
    if (member) return member.roles.has(roles.dev.id);
    else return 'Can\'t define your permissions, please contact the owner of the server.';
  }
}
