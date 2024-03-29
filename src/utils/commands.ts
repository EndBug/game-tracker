import {
  ApplicationCommand,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Client,
  Collection,
  InteractionType,
  Snowflake
} from 'discord.js'
import {
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandSubcommandGroupBuilder
} from '@discordjs/builders'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'
import requireAll from 'require-all'
import path from 'path'
import { postCommand } from './statcord'
import { commandTestGuildID, isDev } from '../core/app'
import { sendErrorToOwner } from './utils'

export { SlashCommandBuilder } from '@discordjs/builders'

/** Custom interface to be used in command modules */
export interface CommandOptions {
  data:
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | SlashCommandSubcommandGroupBuilder

  guildID?: Snowflake
  hasPermission?: (interaction: ChatInputCommandInteraction) => boolean
  run: (interaction: ChatInputCommandInteraction) => Promise<any>
  onAutocomplete?: (interaction: AutocompleteInteraction) => Promise<any>
}

/** Class that handles interactions with slash commands */
export class CommandHandler {
  /** The Discord client associated with this handler */
  client: Client

  /**
   * A Collection with every command registered, indexed by command ID.
   * Before {@link CommandHandler.registerCommands} is called, the collection is empty.
   */
  commands: Collection<Snowflake, CommandOptions>

  /** The REST client used to register slash commands */
  private rest: REST

  /**
   * @param client The client to associate with the command handler.
   */
  constructor(client: Client) {
    this.client = client
    this.commands = new Collection()

    this.client.on('interactionCreate', async (int) => {
      if (!int.isChatInputCommand()) return

      const command = this.commands.get(int.commandName)

      if (command) {
        if (command.hasPermission ? command.hasPermission(int) : true) {
          const statName = this.getStatCommandName(int)
          client.emit('debug', `> ${statName}`)
          postCommand(statName, int.user.id)

          command.run(int).catch((e) => {
            sendErrorToOwner(
              e,
              `An error happened while running the \`${statName}\` command`
            )
          })
        } else {
          await int.reply({
            content:
              "You don't have access to this command. If you believe it's an error, contact the bot owner.",
            ephemeral: true
          })
          return
        }
      } else
        client.emit(
          'error',
          new Error(
            '[Commands] The bot has received an unknown command interaction.'
          )
        )
    })

    this.client.on('interactionCreate', (int) => {
      if (int.type != InteractionType.ApplicationCommandAutocomplete) return

      const command = this.commands.get(int.commandName)

      if (!command)
        throw new Error(
          '[Commands] The bot has received an unknown command interaction.'
        )

      if (command.onAutocomplete) command.onAutocomplete(int)
    })

    this.rest = new REST({ version: '9' })
  }

  /** Regiters slash commands with the Discord API. Handles both command registration and permissions setting. */
  async registerCommands() {
    if (this.commands.size)
      throw new Error('The commands collection has already been initialized.')

    this.rest.setToken(this.client.token)

    // Require command files
    const commandFiles = requireAll({
      dirname: path.join(__dirname, '..', 'commands'),
      filter: /(.+)\.ts/
    })

    // Group commands by guild
    const commandsByGuild: Record<Snowflake | 'global', CommandOptions[]> = {}
    for (const file in commandFiles) {
      const command: CommandOptions = commandFiles[file]?.command

      if (!command || typeof command != 'object')
        throw new Error(`${file} doesn't have a command property.`)

      const guildID = isDev ? commandTestGuildID : command.guildID || 'global'

      if (commandsByGuild[guildID]) {
        if (
          commandsByGuild[guildID].some((c) => c.data.name == command.data.name)
        )
          throw new Error(`Duplicate ${file} command.`)
        commandsByGuild[guildID].push(command)
      } else {
        commandsByGuild[guildID] = [command]
      }
    }

    const commandsById = new Collection<Snowflake, CommandOptions>()
    // Register commands
    for (const guildID in commandsByGuild) {
      const guildCommands = commandsByGuild[guildID]
      let added: Collection<Snowflake, ApplicationCommand>
      const form = guildCommands.map((c) => c.data.toJSON())

      const registerTo = guildID // which has already been manipulated in the loop above

      if (registerTo == 'global') {
        await this.rest.put(
          Routes.applicationCommands(this.client.application.id),
          { body: form }
        )
        added = await this.client.application.commands.fetch()
      } else {
        const guild = await this.client.guilds.fetch(registerTo)
        if (!guild)
          throw new Error(
            `Commands have been assigned to guild ${registerTo}, but guild can't be fetched.`
          )

        await this.rest.put(
          Routes.applicationGuildCommands(
            this.client.application.id,
            registerTo
          ),
          { body: form }
        )
        added = await guild.commands.fetch()
      }

      // Associate each command with the corresponding Discord ID
      added.forEach((command) => {
        const cmdOptions = guildCommands.find(
          (c) => c.data.name == command.name
        )
        commandsById.set(command.id, cmdOptions)
      })
    }

    const commandsByName = new Collection<string, CommandOptions>()
    commandsById.forEach((c) => commandsByName.set(c.data.name, c))

    this.commands = commandsByName
  }

  /**
   * Gets the "full name" of a command by adding the subcommand group and the subcommand (if they have been used)
   * @param int The command interaction
   */
  getStatCommandName(int: ChatInputCommandInteraction) {
    return [
      int.commandName,
      int.options.getSubcommandGroup(false),
      int.options.getSubcommand(false)
    ]
      .filter((e) => !!e)
      .join(' ')
  }
}
