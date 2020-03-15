import { ActivityType, PresenceStatusData } from 'discord.js'
import { client } from '../core/app'

const interval = 12500

/** Class that makes it easier to add custom statuses (add them into the `status` array) */
class Presence {
  status: PresenceStatusData
  afk: boolean
  game: {
    name: string
    type: ActivityType
    url?: string
  }

  constructor(name: string, type?: ActivityType, status?: PresenceStatusData, stream?: string) {
    this.status = status || 'online'
    this.afk = false
    this.game = {
      name,
      type: type || 'PLAYING',
      url: stream
    }
  }

  /** Replaces the dynamic variables inside the presence name */
  getName() {
    return this.game.name
      .replace(new RegExp('/guildCount/', 'g'), client.guilds.cache.size.toString())
      .replace(new RegExp('/userCount/', 'g'), client.users.cache.size.toString())
  }
}

const status = [
  new Presence('for your requests!', 'WATCHING'),
  new Presence('/guildCount/ servers.', 'WATCHING'),
  new Presence('/userCount/ users.', 'LISTENING')
]

var index = 0

/** Reads a custom `Presence` instance and sets it to the client user
 * @param pres The `Presence` to read
 */
function setPresence(indexOverride?: number) {
  const pres = indexOverride ? status[indexOverride] : status[index]
  index++
  index %= status.length
  client.user.setStatus(pres.status)
  client.user.setActivity(pres.getName(), {
    type: pres.game.type
  })
}


if (status.length > 0) setPresence()
if (status.length > 1) setInterval(setPresence, interval)
