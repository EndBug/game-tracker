require('dotenv').config()
require('pretty-error').start()

import { join as path } from 'path'
import * as fs from 'fs'
import { Client, Guild, User, Role, Intents } from 'discord.js'

import * as stats_poster from '../utils/stats_poster'
import { APIUtil } from '../utils/api'
import { statcord, init as statcordInit } from '../utils/statcord'
import { CommandHandler } from '../utils/commands'

const { TOKEN } = process.env

export const ownerID = '218308478580555777'
export const homeguildID = '475792603867119626'
export const supportHardLink = 'https://discord.gg/5YrhW4NHfY'
export const baseDocsURL = 'https://game-tracker.js.org/#/'
export const isDev = process.env.NODE_ENV == 'dev'

const deactivatePoster = false || isDev

export let client: Client
export let commandHandler: CommandHandler
export let homeguild: Guild
export let links: Record<string, string> = {}
export let owner: User
export let roles: Record<string, Role> = {}

/**
 * Creates the client, sets event handlers, registers groups and commands, sets the provider, loads APIs
 */
async function initClient() {
  client = new Client({
    intents: [
      Intents.FLAGS.GUILDS,
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.DIRECT_MESSAGES,
      Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
      Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
    ]
  })

  client.on('error', console.error)
  client.on('warn', console.warn)
  client.on('debug', console.log)

  commandHandler = new CommandHandler(client)

  client.on('ready', async () => {
    homeguild = await client.guilds.fetch('475792603867119626')
    owner = (await homeguild.members.fetch(ownerID)).user
    roles = {
      dev: await homeguild.roles.fetch('498225931299848193')
    }
    links = {
      invite: `<https://discordapp.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=93248>`,
      support: supportHardLink
    }

    client.emit(
      'debug',
      Object.entries({ homeguild, owner, roles })
        .map(([key, value]) => `${key}: ${value ? 'ok' : 'MISSING'}`)
        .join('\n')
    )

    client.emit('debug', 'Registering slash commands...')
    await commandHandler.registerCommands()
    client.emit(
      'debug',
      `Registered ${commandHandler.commands.size} slash commands.`
    )

    try {
      statcordInit(client)
      statcord.autopost()
      console.log('[statcord] Statcord is running.')
    } catch (e) {
      console.error('There has been an issue with StatCord:\n', e)
    }

    loadModules()

    // Starts the stat poster interval
    if (!deactivatePoster && stats_poster.available)
      try {
        client.emit('debug', '[dbots] Starting dbots...')
        await stats_poster.start()
      } catch (e) {
        console.error(e)
      }
    else
      client.emit(
        'debug',
        deactivatePoster
          ? '[dbots] dbots not loaded.'
          : '[dbots] No optional DBL token found.'
      )
  })

  client.login(TOKEN)

  APIUtil.loadAPIs()

  return client
}

/**
 * Logs a load statement
 * @param name
 */
export function loader(name: string) {
  client.emit('debug', `Loaded '${name}' API.`)
}

const custom_modules = ['automation']
/**
 * Loads every module group from the `custom_modules` array
 */
function loadModules() {
  for (const groupName of custom_modules) {
    const groupDirectory = path(__dirname, '..', groupName)
    const files = fs.readdirSync(groupDirectory)
    for (const file of files) {
      require(path(groupDirectory, file))
      client.emit('debug', `[Module] Loaded ${groupName}/${file} module.`)
    }
  }
}

;(async () => {
  initClient()
})().catch(console.error)
