import { client, owner } from '../core/app';
import { getSupportInvite } from '../utils/utils';

client.on('guildCreate', async guild => {
  const invite = await getSupportInvite();
  if (!invite) return owner.send(`Problem with invite creation: ${invite}`);

  const msg = `Hi, thanks for choosing Game Tracker! Let me introduce you to the basics:
  
  - You can run commands by typing \`<@mention> command\` or \`<prefix>command\` (the default prefix is \`${client.commandPrefix}\`).
  - Some commands can be even executed from this DM (such as \`help\`, \`data\` and many more...).
  - To know more about commands you can use \`help\`: it'll tell you which commands you can use. Please note that it will only show the commands you can use in the guild/DM; to see all of them, please use the \`help all\` command.
  - If you want to change the prefix for this bot, go to your guild and use the \`prefix\` command; you can find how to use it with \`help prefix\`.
  
  Please note that the bot is meant to work with some permissions (the ones in the invite link) and removing some of them can result in errors.
  If you need some help or you have suggestions, please join the support guild: ${invite}
  
  If you want to share this bot, please use the \`invite\` command and use that link ;)
  `;

  guild.owner.send(msg);
});