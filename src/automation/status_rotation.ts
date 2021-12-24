import {
  PresenceStatusData,
  PresenceData,
  ActivitiesOptions
} from 'discord.js-light'
import { client, isDev } from '../core/app'

const interval = 12500

/** Class that makes it easier to add custom statuses (add them into the `status` array) */
class Presence {
  status: PresenceStatusData
  afk: boolean
  activity: ActivitiesOptions

  constructor(
    name: string,
    type?: ActivitiesOptions['type'],
    status?: PresenceStatusData,
    stream?: string
  ) {
    this.status = status || 'online'
    this.afk = false
    this.activity = {
      name,
      type: type || 'PLAYING',
      url: stream
    }
  }

  /** Replaces the dynamic variables inside the presence name */
  getName() {
    return this.activity.name
      .replace(
        new RegExp('/guildCount/', 'g'),
        client.guilds.cache.size.toString()
      )
      .replace(
        new RegExp('/userCount/', 'g'),
        client.users.cache.size.toString()
      )
  }

  get obj(): PresenceData {
    return {
      activities: [
        {
          ...this.activity,
          name: this.getName()
        }
      ],
      afk: this.afk,
      status: this.status
    }
  }
}

const status = isDev
  ? [new Presence('development', 'WATCHING', 'dnd')]
  : [
      new Presence('for your requests!', 'WATCHING'),
      new Presence('/guildCount/ servers.', 'WATCHING')
      // new Presence('/userCount/ users.', 'LISTENING') // User count is now disable in favor of the caching improvements
    ]

var index = 0

/** Reads a custom `Presence` instance and sets it to the client user
 * @param pres The `Presence` to read
 */
function setPresence(indexOverride?: number) {
  const pres = status[indexOverride || index]
  index++
  index %= status.length
  client.user.setPresence(pres.obj)
}

if (status.length > 0) setPresence()
if (status.length > 1) setInterval(setPresence, interval)
