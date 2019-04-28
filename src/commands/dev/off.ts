import * as Commando from 'discord.js-commando';

import { owner } from '../../core/app';
import * as backup from '../../core/backup';

export default class OffCMD extends Commando.Command {
  constructor(client: Commando.CommandoClient) {
    super(client, {
      name: 'off',
      aliases: ['shutdown'],
      group: 'dev',
      memberName: 'off',
      description: 'Makes a backup of the database (if backup is available) and turns off the bot.',
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
      const b = await backup.upload('Shutdown').catch(console.error);

      if (res instanceof Array) res = res[0];

      if (b instanceof Error) {
        if (!force) return res.edit(`There has been an error during the backup:\n\`\`\`\n${b}\n\`\`\``);
        else await res.edit(`There has been an error during the backup:\n\`\`\`\n${b}\n\`\`\`\nForced shutdown will happen in moments.`);
      }
      await res.edit('Backup successfully saved :white_check_mark:\nThe bot will shut down in moments.');
    } else await msg.say('The bot will shut down in moments.');

    await this.client.destroy();
    process.exit();
  }

  hasPermission(msg: Commando.CommandoMessage) {
    if (msg.author.id == owner.id) return true;
    else 'This command can only be executed by the bot owner.';
  }
}
