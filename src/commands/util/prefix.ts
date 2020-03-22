import { stripIndents, oneLine } from 'common-tags'
import { Command } from '../../utils/command'
import { Message } from 'discord.js'
import { provider } from '../../utils/provider'
import { commandPrefix, client } from '../../core/app'
import { isOwner } from '../../utils/utils'

export default class PrefixCommand extends Command {
  constructor() {
    super({
      name: 'prefix',
      description: 'Shows or sets the command prefix.',
      format: '[prefix/"default"/"none"]',
      details: oneLine`
				If no prefix is provided, the current prefix will be shown.
				If the prefix is "default", the prefix will be reset to the bot's default prefix.
				If the prefix is "none", the prefix will be removed entirely, only allowing mentions to run commands.
				Only administrators may change the prefix.
			`,
      examples: ['prefix', 'prefix -', 'prefix omg!', 'prefix default', 'prefix none'],

      args: [
        {
          key: 'prefix',
          prompt: 'What would you like to set the bot\'s prefix to?',
          default: ''
        }
      ]
    })
  }

  async run(msg: Message, [prefix]: string[]) {
    // Just output the prefix
    if (!prefix) {
      const pref = provider.get('p', msg.guild?.id) || commandPrefix
      return msg.reply(stripIndents`
				${pref ? `The command prefix is \`\`${pref}\`\`.` : 'There is no command prefix.'}
				To run commands, use \`${pref || `${client.user.tag} `}command\`.
			`)
    }

    // Check the user's permission before changing anything
    if (msg.guild) {
      if (!msg.member.hasPermission('ADMINISTRATOR') && !isOwner(msg.author)) {
        return msg.reply('Only administrators may change the command prefix.')
      }
    } else if (!isOwner(msg.author)) {
      return msg.reply('Only the bot owner(s) may change the global command prefix.')
    }

    // Save the prefix
    const lowercase = prefix.toLowerCase()
    let pref = lowercase === 'none' ? '' : prefix
    let response
    if (lowercase === 'default') {
      if (msg.guild) provider.delete('p', msg.guild.id)
      response = `Reset the command prefix to the default (currently \`${commandPrefix}\`).`
      pref = commandPrefix
    } else {
      if (msg.guild) provider.set('p', msg.guild.id, pref)
      response = pref ? `Set the command prefix to \`\`${prefix}\`\`.` : 'Removed the command prefix entirely.'
    }

    await msg.reply(`${response} To run commands, use \`${pref || `@${client.user.tag} `}command\`.`)
    return null
  }
}
