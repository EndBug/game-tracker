import * as Commando from 'discord.js-commando';
import { links } from '../../core/app';

export default class InviteCMD extends Commando.Command {
  constructor(client: Commando.CommandoClient) {
    super(client, {
      name: 'invite',
      aliases: ['inviteme', 'add', 'addme', 'invitelink'],
      group: 'bot',
      memberName: 'invite',
      description: 'Gives you the link to add the bot to your guild.',
      guildOnly: false,
      ownerOnly: false
    });
  }

  // @ts-ignore
  run(msg: Commando.CommandoMessage) {
    msg.say(`Thank you for choosing Game Tracker!\nPlease note that the permissions required in the invite are important, and that without them the bot could not work properly.\nClick here to invite the bot: ${links.invite}`);
  }
}
