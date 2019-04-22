import * as Commando from 'discord.js-commando';

import { post } from '../../utils/dbl_stats';

export default class PostStatsCMD extends Commando.Command {
  constructor(client: Commando.CommandoClient) {
    super(client, {
      name: 'poststats',
      aliases: ['postdblstats'],
      group: 'dbl',
      memberName: 'poststats',
      description: 'Manually posts bot stats to Discord Bots List\'s API.',
      guildOnly: false,
      ownerOnly: true
    });
  }

  //@ts-ignore
  async run(msg: Commando.CommandoMessage) {
    var rep = await msg.say('Posting stats...');
    if (rep instanceof Array) rep = rep[0];

    try {
      await post();
    } catch (e) {
      rep.edit('Couldn\'t post stats:\n```\n' + e + '\n```');
    }
  }
}
