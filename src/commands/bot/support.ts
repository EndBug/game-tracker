import * as Commando from 'discord.js-commando';
import { getSupportInvite } from '../../utils/utils';
import { owner } from '../../core/app';

export default class SupportCMD extends Commando.Command {
  constructor(client: Commando.CommandoClient) {
    super(client, {
      name: 'support',
      aliases: ['supportguild', 'supportserver', 'feedback', 'issue'],
      group: 'bot',
      memberName: 'support',
      description: 'Gives you the invite to enter in the official Game Tracker support server.',
      guildOnly: false,
      ownerOnly: false
    });
  }

  //@ts-ignore
  async run(msg: Commando.CommandoMessage) {
    const invite = await getSupportInvite();
    if (!invite) {
      owner.send(`Problem with invite creation: ${invite}`);
      msg.say('Sorry, this command is temporarily unavailable, please retry later.\nIronic, huh?');
    } else msg.say(`Thank you for choosing Game Tracker!\nYou can enter in the support guild through this invite: ${invite}`);
  }
}
