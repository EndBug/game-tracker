require('dotenv').config()

import { join as path } from 'path'
import * as fs from 'fs'
import { Client, Guild, User, Role } from 'discord.js'

import { isPartialMessage } from '../utils/utils'
import * as stats_poster from '../utils/stats_poster'
import { loadCommands, handleMessage } from '../utils/dispatcher'
import { APIUtil } from '../utils/api'

const { TOKEN } = process.env

export const commandPrefix = '-'
export const ownerID = '218308478580555777'
export const supportHardLink = 'https://discord.gg/ZhnWkqc'

export let client: Client
export let homeguild: Guild
export let links: Record<string, string> = {}
export let owner: User
export let roles: Record<string, Role> = {}

import * as backup from './backup'

/**
 * Creates the client, sets event handlers, registers groups and commands, sets the provider, loads APIs 
 */
async function initClient() {
  client = new Client()

  client.on('error', console.error)
  client.on('warn', console.warn)
  client.on('debug', console.log)

  client.on('message', msg => !isPartialMessage(msg) && handleMessage(msg).catch(err => client.emit('error', err)))

  client.on('ready', () => {
    homeguild = client.guilds.cache.get('475792603867119626')
    owner = homeguild.members.cache.get('218308478580555777').user
    roles = {
      dev: homeguild.roles.cache.get('498225931299848193')
    }
    links = {
      invite: `<https://discordapp.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=93248>`,
      support: 'https://discord.gg/ZhnWkqc'
    }
  })

  client.login(TOKEN)

  // Starts the stat poster interval
  if (stats_poster.available) try {
    await stats_poster.start()
  } catch (e) { console.error(e) }
  else console.log('No optional DBL token found.')

  APIUtil.loadAPIs()

  loadCommands()

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
      loader(`${groupName}/${file}`)
    }
  }
}

(async () => {
  if (backup.available) await backup.init().catch(console.error)
  else console.log('No backup token found.')
  await initClient()
  loadModules()
})().catch(console.error)
