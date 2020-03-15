import Command from './command'
import { readdirSync } from 'fs'
import { join as path } from 'path'
import { commandPrefix } from '../core/app'
import { Message } from 'discord.js'
import { provider } from './provider'

const loadedCommands: Command[] = []

export function loadCommands() {
  const commandsPath = path(__dirname, '../commands')
  const groups = readdirSync(commandsPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

  for (const group of groups) {
    const groupPath = path(commandsPath, group)
    const files = readdirSync(groupPath, { withFileTypes: true })
      .filter(dirent => dirent.isFile())
      .map(dirent => dirent.name)

    for (const file of files) {
      const commandClass = require(path(groupPath, file))
      const loadedCommand: Command = new commandClass()

      loadedCommands.push(loadedCommand)
    }
  }
}

async function handleMessage(message: Message) {
  const { command, args } = parseMessage(message)

  let responses
  if (command) {
    responses = await runCommand(command, args, message)
    if (Array.isArray(responses)) responses = await Promise.all(responses)
  }
}

function parseMessage(message: Message) {
  // Find the command to run with default command handling
  const prefix = provider.get('p', message.guild?.id) || commandPrefix
  const command = loadedCommands.find(cmd => [cmd.name, ...cmd.aliases].some(str => message.content.startsWith(prefix + str)))
  const args = message.content.split(' ')
  args.shift()
  return { command, args }
}

function runCommand(command: Command, args: string[], message: Message) {
  return message.reply()
}
