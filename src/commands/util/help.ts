import { stripIndents, oneLine } from 'common-tags'
import { Command } from '../../utils/command'
import { Message, Util } from 'discord.js-light'
import {
  findCommands,
  groupName,
  groups,
  loadedCommands,
  parseMessage
} from '../../utils/dispatcher'
import { provider } from '../../utils/provider'
import { client, commandPrefix } from '../../core/app'

function disambiguation(items: object[], label: string, property = 'name') {
  const itemList = items
    .map(
      (item) => `"${(property ? item[property] : item).replace(/ /g, '\xa0')}"`
    )
    .join(',   ')
  return `Multiple ${label} found, please be more specific: ${itemList}`
}

function usage(name: string, guildID?: string, usePref?: boolean) {
  const pref = !usePref
    ? ''
    : guildID
    ? provider.get('p', guildID) || commandPrefix
    : `@${client.user.tag} `
  return '`' + pref + name + '`'
}

export default class HelpCommand extends Command {
  constructor() {
    super({
      name: 'help',
      aliases: ['commands'],
      description:
        'Displays a list of available commands, or detailed information for a specified command.',
      details: oneLine`
				The command may be part of a command name or a whole command name.
				If it isn't specified, all available commands will be listed.
			`,
      examples: ['help', 'help prefix'],

      args: [
        {
          key: 'command',
          prompt: 'Which command would you like to view the help for?',
          default: ''
        }
      ]
    })
  }

  async run(msg: Message) {
    const { rawArgs } = await parseMessage(msg)
    const command = rawArgs.join(' ')

    const commands = findCommands(command, false, msg)
    const showAll = command && command.toLowerCase() === 'all'
    if (command && !showAll) {
      if (commands.length === 1) {
        let help = stripIndents`
					${oneLine`
						__Command **${commands[0].name}**:__ ${commands[0].description}
						${commands[0].guildOnly ? ' (Usable only in servers)' : ''}
					`}

          **Online docs:** <${commands[0].docsLink}>
					**Format:** ${commands[0].format}
				`
        if (commands[0].aliases.length > 0)
          help += `\n**Aliases:** ${commands[0].aliases.join(', ')}`
        help += `\n${oneLine`
					**Group:** ${groupName(commands[0].group)}
					(\`${commands[0].group}:${commands[0].name}\`)
				`}`
        if (commands[0].details) help += `\n**Details:** ${commands[0].details}`
        if (commands[0].examples && commands[0].examples.length > 0)
          help += `\n**Examples:**\n${commands[0].examples.join('\n')}`

        const messages: Message[] = []
        try {
          messages.push(await msg.author.send(help))
          if (msg.channel.type !== 'DM')
            messages.push(await msg.reply('Sent you a DM with information.'))
        } catch (err) {
          messages.push(
            await msg.reply(
              'Unable to send you the help DM. You probably have DMs disabled.'
            )
          )
        }
        return messages
      } else if (commands.length > 15) {
        return msg.reply('Multiple commands found. Please be more specific.')
      } else if (commands.length > 1) {
        return msg.reply(disambiguation(commands, 'commands'))
      } else {
        return msg.reply(
          'Unable to identify command. Use `help` to view the list of all commands.'
        )
      }
    } else {
      const messages: Message[] = []
      try {
        const parts = Util.splitMessage(stripIndents`
					${oneLine`
						To run a command in ${msg.guild?.name || 'any server'},
						use ${usage('command', msg.guild?.id, true)}.
						For example, ${usage('prefix', msg.guild?.id, true)}.
					`}
					To run a command in this DM, simply use ${usage('command')} with no prefix.

					Use ${usage(
            'help <command>'
          )} to view detailed information about a specific command.
					Use ${usage(
            'help all'
          )} to view a list of *all* commands, not just available ones.

					__**${
            showAll
              ? 'All commands'
              : `Available commands in ${msg.guild || 'this DM'}`
          }**__

					${groups
            .filter((grp) =>
              loadedCommands
                .filter((cmd) => cmd.group == grp)
                .some((cmd) => !cmd.hidden && (showAll || cmd.isUsable(msg)))
            )
            .map(
              (grp) => stripIndents`
							__${groupName(grp)}__
							${loadedCommands
                .filter(
                  (cmd) =>
                    cmd.group == grp &&
                    !cmd.hidden &&
                    (showAll || cmd.isUsable(msg))
                )
                .map((cmd) => `**${cmd.name}:** ${cmd.description}`)
                .join('\n')}
						`
            )
            .join('\n\n')}
				`)
        for (const part of parts) {
          const res = await msg.author.send(part)
          messages.push(res)
        }
        if (msg.channel.type !== 'DM')
          messages.push(await msg.reply('Sent you a DM with information.'))
      } catch (err) {
        messages.push(
          await msg.reply(
            'Unable to send you the help DM. You probably have DMs disabled.'
          )
        )
      }
      return messages
    }
  }
}
