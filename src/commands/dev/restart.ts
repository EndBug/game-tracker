import * as Commando from 'discord.js-commando';
import * as fs from 'fs';
import * as path from 'path';

import { owner } from '../../core/app';
import * as backup from '../../core/backup';
export default class RestartCMD extends Commando.Command {
  constructor(client: Commando.CommandoClient) {
    super(client, {
      name: 'restart',
      aliases: ['rs'],
      group: 'dev',
      memberName: 'restart',
      description: 'Makes a backup of the database (if backup is available) and restarts the bot.',
      guildOnly: false,
      args: [{
        key: 'force',
        prompt: 'Whether you want to force the shutdown.',
        type: 'boolean',
        default: false
      }]
    });
  }

  //@ts-ignore
  async run(msg: Commando.CommandoMessage, { force }: { force: boolean }) {
    if (backup.available) {
      let res = await msg.say('Saving a backup...');
      const b = await backup.upload('Restart').catch(console.error);

      if (res instanceof Array) res = res[0];

      if (b instanceof Error) {
        if (!force) return res.edit(`There has been an error during the backup:\n\`\`\`\n${b}\n\`\`\``);
        else await res.edit(`There has been an error during the backup:\n\`\`\`\n${b}\n\`\`\`\nForced restart will happen in moments.`);
      }
      await res.edit('Backup successfully saved :white_check_mark:\nThe bot will restart in moments.');
    } else await msg.say('nThe bot will restart in moments.');

    fs.writeFileSync(path.join(__dirname, '../../utils/reloadme.json'), JSON.stringify({ date: new Date() }));
  }

  hasPermission(msg: Commando.CommandoMessage) {
    if (msg.author.id == owner.id) return true;
    else 'This command can only be executed by the bot owner.';
  }
}
