import * as Commando from 'discord.js-commando';

import { owner, roles } from '../../core/app';

export default class SampleCMD extends Commando.Command {
  constructor(client: Commando.CommandoClient) {
    super(client, {
      name: 'sample',
      aliases: ['insert', 'alias'],
      group: 'group',
      memberName: 'sample',
      description: 'description',
      details: 'notes',
      args: [{
        key: 'arg',
        prompt: 'prompt',
        type: 'string',
        validate: (str) => {
          if (str == null) return 'This_is_an_error';
          return true;
        }
      }],
      guildOnly: true,
      ownerOnly: false
    });
  }

  //@ts-ignore
  run(msg: Commando.CommandoMessage) {

  }

  hasPermission(msg: Commando.CommandoMessage) {
    if ([owner, msg.guild.owner.user].includes(msg.author)) return true;
    const member = msg.member;
    if (member) return (member.roles.has(roles.dev.id) || msg.guild.settings.get('botperm', {
      members: []
    }).members.includes(member.id));
    else return 'Can\'t define your permissions, please contact the owner of the server.';
  }
}
