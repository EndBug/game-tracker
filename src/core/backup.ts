require('dotenv').load()

import * as Discord from 'discord.js'
import * as fs from 'fs'
import request from 'request-promise'
import * as path from 'path'

const token = process.env.BACKUP
export const available = !!token

const client = new Discord.Client()
let guild: Discord.Guild, channel: Discord.TextChannel

const settingsPath = path.join(__dirname, '../../data/settings.sqlite3')

/**
 * Returns whether the database already exists.
 */
function exists() {
  try {
    fs.accessSync(settingsPath)
    return true
  } catch {
    return false
  }
}

/**
 * Fecthes the last backup.
 */
async function getLast(): Promise<any> {
  const attachment = channel.lastMessageID ? (await channel.fetchMessage(channel.lastMessageID)).attachments.first() : undefined
  if (attachment && attachment.url) {
    const { url } = attachment
    return request(url)
  }
}

const guildID = '475792603867119626'
const IDs = {
  'backups': '475799682023686154',
  'notifications': '487686182155583509',
  'bot': '488408689103863838'
}
const channels: { [key: string]: Discord.TextChannel } = {}

/**
 * Loads 'channels'
 * @param check Whether to check if the channels exist (default is true)
 */
function loadChannels(check = true) {
  for (const key in IDs) {
    const channel = IDs[key]
    const tempC = guild.channels.get(channel)
    if (!((tempC): tempC is Discord.TextChannel => tempC.type === 'text')(tempC)) return
    channels[key] = tempC
  }

  if (check)
    for (const c of (Object.values(channels)))
      if (!c) return false

  return true
}

/**
 * Creates client for backups
 * @param doRestore Whether to restore a previous backup (default is true)
 */
export function init(doRestore = true) {
  return new Promise((resolve, reject) => {
    if (!available) reject('There is no backup token, please check your .env file.')

    client.on('error', reject)
    client.login(process.env.BACKUP).catch(reject)
    client.on('ready', async () => {
      guild = client.guilds.get(guildID)
      if (!guild || !guild.available)
        return reject(`Guild '${guildID}' is ${guild ? 'unavailable' : 'undefined'}`)
      loadChannels()
      channel = channels.backups
      if (!channel) return reject(`Channel '${IDs.backups}' does not exist in this guild`)
      if (doRestore) await restore()
      resolve(client)
    })
  })
}

/**
 * Restores last backup
 * @param force Whether to ignore an existing databse (default is false)
 */
export function restore(force = false) {
  if (exists() && !force) console.log('Trying to load database...')
  // @ts-ignore
  else return getLast().then(fs.createWriteStream(settingsPath))
    .catch(err => console.log(`Unable to restore SQL database, creating a new one. Error: \`\`\`\n${err}\n\`\`\``))
}

/**
 * Uploads a new backup
 * @param note The message you want to leave
 */
export function upload(note = '') {
  if (!exists()) console.log('Can\'t find database file')
  else return channel.send(`${note}${note ? ' - ' : ''}${new Date()}`, {
    files: [settingsPath]
  }).catch(console.error)
}

/**
 * Saves a backup and sends a message if the bot crashes
 */
export async function crash() {
  const ready = await init(false).catch(console.error)
  if (ready) {
    const notify = channels.notifications
    if (notify) {
      let msg = await notify.send('Bot crashed, saving backup...')
      const back = await upload('**CRASH**')
      if (msg instanceof Array) msg = msg[0]
      if (back) {
        msg.edit('Bot crashed, backup saved.')
        return true
      } else {
        msg.edit('Bot crashed, couldn\'t save backup')
        return new Error('Can\'t save backup.')
      }
    } else {
      await upload('**CRASH**').then(() => {
        channels.backups.send('Couldn\'t send notification message, check channel ID.')
      })
    }
  } else return new Error('Can\'t build client.')
}
