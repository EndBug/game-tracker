import { Message, Snowflake, Client } from 'discord.js'
import { stripIndents } from 'common-tags'
import { isOwner, getDocsLink } from './utils'
import { owner, supportHardLink, client } from '../core/app'

export class Command {
  // #region Properties
  name: string
  group: string
  aliases: string[]
  description: string
  format: string
  details: string
  examples: string[]
  guildOnly: boolean
  ownerOnly: boolean
  hidden: boolean
  throttling: ThrottlingOptions
  args: ArgumentInfo[]
  client: Client

  private onlineDocs: string
  private throttles: Map<Snowflake, Throttle>
  // #endregion

  constructor(options: CommandInfo) {
    this.validateInfo(options)

    this.name = options.name
    this.aliases = options.aliases || []
    this.description = options.description
    this.onlineDocs = options.onlineDocs
    this.details = options.details || ''
    this.examples = options.examples || []
    this.guildOnly = Boolean(options.guildOnly)
    this.ownerOnly = Boolean(options.ownerOnly)
    this.hidden = Boolean(options.hidden)
    this.throttling = options.throttling
    this.args = options.args || []
    this.format = options.format || this.genFormat()

    this.client = client

    this.throttles = new Map()
  }

  get docsLink() {
    if (typeof this.onlineDocs == 'string') return this.onlineDocs

    switch (this.group) {
      case 'ow':
        return getDocsLink('ow/overwatch?id=' + this.name.replace(/ /g, ''))

      case 'r6':
        return getDocsLink('r6/rainbow?id=' + this.name.replace(/ /g, ''))

      default:
        return getDocsLink()
    }
  }

  hasPermission(message: Message, ownerOverride = true): boolean | string {
    if (ownerOverride && isOwner(message.author)) return true

    if (this.ownerOnly && !isOwner(message.author))
      return `The \`${this.name}\` command can only be used by the bot owner.`
  }

  async run(message: Message, args: any[]): Promise<Message | Message[]> { // eslint-disable-line
    throw new Error(`${this.constructor.name} doesn't have a \`run()\` method.`)
  }

  isUsable(message: Message) {
    if (this.guildOnly && message && !message.guild) return false
    const hasPermission = this.hasPermission(message)
    return hasPermission && typeof hasPermission !== 'string'
  }

  // Add data type (use type switch <T>)
  onBlock(message: Message, reason: blockReason, data?: blockData) {
    switch (reason) {
      case 'guildOnly':
        return message.reply(`The \`${this.name}\` command must be used in a server channel.`)
      case 'permission': {
        if (data.response) return message.reply(data.response)
        return message.reply(`You do not have permission to use the \`${this.name}\` command.`)
      }
      case 'throttling': {
        return message.reply(
          `You may not use the \`${this.name}\` command again for another ${data?.remaining.toFixed(1)} seconds.`
        )
      }
      case 'validation': {
        return message.reply(data.response || 'One of your arguments has failed the validation, but there\'s no further info.')
      }
      default:
        return null
    }
  }

  onError(err: Error, message: Message) {
    return message.reply(stripIndents`
			An error occurred while running the command: \`${err.name}: ${err.message}\`
			You shouldn't ever receive an error like this.
			Please contact ${owner.tag} in this server: ${supportHardLink}
		`)
  }

  throttle(userID: Snowflake) {
    if (!this.throttling || isOwner(userID)) return null

    let throttle = this.throttles.get(userID)
    if (!throttle) {
      throttle = {
        start: Date.now(),
        usages: 0,
        timeout: setTimeout(() => {
          this.throttles.delete(userID)
        }, this.throttling.duration * 1000)
      }
      this.throttles.set(userID, throttle)
    }

    return throttle
  }

  genFormat() {
    return this.name + ' ' + this.args.map(arg => typeof arg.default == 'string' ? `[${arg.key}]` : `<${arg.key}>`)
      .join(' ')
  }

  validateInfo(info: CommandInfo) {
    if (typeof info !== 'object') throw new TypeError('Command info must be an Object.')
    if (typeof info.name !== 'string') throw new TypeError('Command name must be a string.')
    if (info.name !== info.name.toLowerCase()) throw new Error('Command name must be lowercase.')
    if (info.aliases && (!Array.isArray(info.aliases) || info.aliases.some(ali => typeof ali !== 'string'))) {
      throw new TypeError('Command aliases must be an Array of strings.')
    }
    if (info.aliases && info.aliases.some(ali => ali !== ali.toLowerCase())) {
      throw new RangeError('Command aliases must be lowercase.')
    }
    if (typeof info.description !== 'string') throw new TypeError('Command description must be a string.')
    if ('format' in info && typeof info.format !== 'string') throw new TypeError('Command format must be a string.')
    if ('details' in info && typeof info.details !== 'string') throw new TypeError('Command details must be a string.')
    if (info.examples && (!Array.isArray(info.examples) || info.examples.some(ex => typeof ex !== 'string'))) {
      throw new TypeError('Command examples must be an Array of strings.')
    }
    if (info.throttling) {
      if (typeof info.throttling !== 'object') throw new TypeError('Command throttling must be an Object.')
      if (typeof info.throttling.usages !== 'number' || isNaN(info.throttling.usages)) {
        throw new TypeError('Command throttling usages must be a number.')
      }
      if (info.throttling.usages < 1) throw new RangeError('Command throttling usages must be at least 1.')
      if (typeof info.throttling.duration !== 'number' || isNaN(info.throttling.duration)) {
        throw new TypeError('Command throttling duration must be a number.')
      }
      if (info.throttling.duration < 1) throw new RangeError('Command throttling duration must be at least 1.')
    }
    if (info.args && !Array.isArray(info.args)) throw new TypeError('Command args must be an Array.')
  }
}

export interface CommandInfo {
  name: string
  aliases?: string[]
  description: string
  onlineDocs?: string
  format?: string
  details?: string
  examples?: string[]
  guildOnly?: boolean
  ownerOnly?: boolean
  hidden?: boolean
  throttling?: ThrottlingOptions
  args?: ArgumentInfo[]
}

interface ArgumentInfo {
  key: string
  prompt: string
  default?: any
  validate?: (val: string, msg: Message) => boolean | string
  parse?: (val: string, msg: Message) => any
}

interface ThrottlingOptions {
  usages: number
  /** In seconds */
  duration: number
}

interface Throttle {
  start: number
  usages: number
  timeout: NodeJS.Timeout
}

type blockReason = 'guildOnly' | 'permission' | 'throttling' | 'validation'

interface blockData {
  throttle?: Throttle,
  remaining?: number
  response?: string
}
