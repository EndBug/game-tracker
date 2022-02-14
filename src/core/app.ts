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
export const isDev = process.env.NODE_ENV == 'dev'

export const ownerID = '218308478580555777'
export const homeguildID = '475792603867119626'
export const commandTestGuildID = '406797621563490315'
export const supportHardLink = 'https://discord.gg/5YrhW4NHfY'
export const docsURL = 'https://game-tracker.js.org/#/'

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
    intents: [Intents.FLAGS.GUILDS]
  })

  client.on('error', console.error)
  client.on('warn', console.warn)
  client.on('debug', console.log)

  commandHandler = new CommandHandler(client)

  client.on('ready', async () => {
    homeguild = await client.guilds.fetch(homeguildID)
    owner = (await homeguild.members.fetch(ownerID)).user
    roles = {
      dev: await homeguild.roles.fetch('498225931299848193')
    }
    links = {
      invite: `<https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=16384&scope=bot%20applications.commands>`,
      support: supportHardLink
    }

    client.emit(
      'debug',
      '[Constants]' +
        Object.entries({ homeguild, owner, roles })
          .map(([key, value]) => `\n    ${key}: ${value ? 'ok' : 'MISSING'}`)
          .join('')
    )

    client.emit('debug', '[Commands] Registering slash commands...')
    await commandHandler.registerCommands()
    client.emit(
      'debug',
      `[Commands] Registered ${commandHandler.commands.size} slash commands.`
    )

    loadModules()

    try {
      console.log('[statcord] Loading Statcord...')
      statcordInit(client)

      statcord.on('autopost-start', () => {
        console.log('[statcord] Auto-posting started.')
      })

      statcord.on('post', (status) => {
        if (status) {
          console.error('[statcord] Unsuccessful stat post:')
          console.error(status)
        } else console.log('[statcord] Stats posted successfully.')
      })

      await statcord.autopost()
      console.log('[statcord] Statcord is running.')
    } catch (e) {
      console.error('[statcord] There has been an issue with Statcord:')
      console.error(e)
    }

    // Starts the stat poster interval
    if (!deactivatePoster && stats_poster.available)
      try {
        client.emit('debug', '[blapi] Starting BLAPI...')
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
