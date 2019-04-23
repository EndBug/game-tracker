import * as Commando from 'discord.js-commando';

export default class UnknownCMD extends Commando.Command {
  constructor(client: Commando.CommandoClient) {
    super(client, {
      name: 'unknown',
      group: 'util',
      memberName: 'unknown',
      description: '',
      hidden: true,
      guarded: true,
      unknown: true
    });
  }

  //@ts-ignore
  run(msg: Commando.CommandoMessage) {

  }
}