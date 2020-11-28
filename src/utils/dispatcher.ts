import { Command } from './command'
import { readdirSync } from 'fs'
import { join as path } from 'path'
import { commandPrefix, client } from '../core/app'
import { Message } from 'discord.js'
import { provider } from './provider'
import { isMention, mentionToID, capitalize } from './utils'
import { postCommand } from './statcord'

const ignoredDirs = []
const groupDict = {
  'dbl': 'Discord Bots Lists',
  'dev': 'Developer',
  'ow': 'Overwatch',
  'r6': 'Rainbow Six Siege',
  'util': 'Utility'
}

export const loadedCommands: Command[] = []

export const groups: string[] = []

const statcordIgnoreGroups = ['ow', 'r6']

export function loadCommands() {
  const commandsPath = path(__dirname, '../commands')
  const groupNames = readdirSync(commandsPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !ignoredDirs.includes(dirent.name))
    .map(dirent => dirent.name)

  for (const group of groupNames) {
    groups.push(group)
    const groupPath = path(commandsPath, group)
    const files = readdirSync(groupPath, { withFileTypes: true })
      .filter(dirent => dirent.isFile())
      .map(dirent => dirent.name)

    for (const file of files) {
      const commandClass = require(path(groupPath, file)).default
      const loadedCommand: Command = new commandClass()
      loadedCommand.group = group

      loadedCommands.push(loadedCommand)
      client.emit('debug', `[Command] Loaded ${group}:${loadedCommand.name} command.`)
    }
  }
}

export async function handleMessage(message: Message) {
  if (message.author.bot) return
  const { command, rawArgs, ignore } = parseMessage(message)

  if (ignore) return

  if (command) {
    const responses = await runCommand(command, rawArgs, message)
    if (Array.isArray(responses)) await Promise.all(responses)
  }
}

export function parseMessage(message: Message) {
  // Find the command to run with default command handling
  const rawArgs = message.content.split(' '),
    isDM = message.channel.type == 'dm'
  const prefix = isDM ? '' : provider.get('p', message.guild?.id) || commandPrefix

  let fromMention = false

  if (isMention(rawArgs[0])) {
    if (mentionToID(rawArgs[0]) != client.user.id) return {}
    rawArgs.shift()
    fromMention = true
  } else {
    if (!rawArgs[0].startsWith(prefix)) return {}
    rawArgs[0] = rawArgs[0].substr(prefix.length)
  }

  if (!rawArgs[0]) return { ignore: true }

  const command = loadedCommands
    .find(cmd => [cmd.name, ...cmd.aliases].some(str => str == rawArgs[0]))

  rawArgs.shift()
  return { command, fromMention, rawArgs }
}

async function runCommand(command: Command, rawArgs: string[], message: Message) {
  if (command.guildOnly && !message.guild)
    return command.onBlock(message, 'guildOnly')

  const hasPermission = command.hasPermission(message)
  if (!hasPermission || typeof hasPermission === 'string') {
    const data = { response: typeof hasPermission === 'string' ? hasPermission : undefined }
    return command.onBlock(message, 'permission', data)
  }

  const throttle = command.throttle(message.author.id)
  if (throttle && throttle.usages + 1 > command.throttling.usages) {
    const remaining = (throttle.start + (command.throttling.duration * 1000) - Date.now()) / 1000
    const data = { throttle, remaining }
    return command.onBlock(message, 'throttling', data)
  }

  const args: string[] = []
  for (let i = 0; i < command.args.length; i++) {
    const info = command.args[i],
      arg = rawArgs[i]
    let processed = arg

    const promptStr = ' ' + (info.prompt ? `\`${info.key}\`: ${info.prompt}` : '')

    if (info.validate) {
      const validation = info.validate(arg, message)
      if (typeof validation == 'string') return command.onBlock(message, 'validation', { response: validation })
      if (!validation) return command.onBlock(message, 'validation', {
        response: `\`${arg}\` is not valid for the \`${info.key}\` argument, please try again.` + promptStr
      })
    }

    if (!!arg && info.parse) processed = info.parse(arg, message)

    if (!arg && info.default === undefined) return command.onBlock(message, 'validation', {
      response: `\`${info.key}\` is not an optional argument, please provide a value.` + promptStr
    })

    args.push(processed ?? info.default)
  }

  if (throttle) throttle.usages++
  const typingCount = message.channel.typingCount
  try {
    client.emit('debug', `Running command ${command.group}:${command.name}.`)
    if (!statcordIgnoreGroups.includes(command.group))
      postCommand(command.name, message.author.id)
    return command.run(message, args, rawArgs)
  } catch (err) {
    if (message.channel.typingCount > typingCount) message.channel.stopTyping()
    return command.onError(err, message)
  }
}

/**
 * Finds all commands that match the search string
 * @param [searchString] - The string to search for
 * @param [exact=false] - Whether the search should be exact
 * @param [message] - The message to check usability against
 * @return All commands that are found
 */
export function findCommands(searchString: string = null, exact: boolean = false, message: Message = null) {
  if (!searchString) {
    return message ?
      loadedCommands.filter(cmd => cmd.isUsable(message)) :
      loadedCommands
  }

  // Find all matches
  const lcSearch = searchString.toLowerCase()
  const matchedCommands = loadedCommands.filter(
    exact ? commandFilterExact(lcSearch) : commandFilterInexact(lcSearch)
  )
  if (exact) return matchedCommands

  // See if there's an exact match
  for (const command of matchedCommands) {
    if (command.name === lcSearch || (command.aliases && command.aliases.some(ali => ali === lcSearch))) {
      return [command]
    }
  }

  return matchedCommands
}

function commandFilterExact(search: string) {
  return (cmd: Command) => cmd.name === search ||
    (cmd.aliases && cmd.aliases.some(ali => ali === search)) ||
    `${cmd.group}:${cmd.name}` === search
}

function commandFilterInexact(search: string) {
  return (cmd: Command) => cmd.name.includes(search) ||
    `${cmd.group}:${cmd.name}` === search ||
    (cmd.aliases && cmd.aliases.some(ali => ali.includes(search)))
}

export function groupName(group: string) {
  return groupDict[group] ?? capitalize(group)
}
