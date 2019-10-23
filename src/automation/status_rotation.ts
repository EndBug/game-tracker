import { ActivityType, PresenceStatus } from 'discord.js'; // eslint-disable-line no-unused-vars
import { client } from '../core/app';

const interval = 12500;

/** Class that makes it easier to add custom statuses (add them into the `status` array) */
class Presence {
  status: PresenceStatus
  afk: boolean
  game: {
    name: string
    type: ActivityType
    url?: string
  }

  constructor(name: string, type?: ActivityType, status?: PresenceStatus, stream?: string) {
    this.status = status || 'online';
    this.afk = false;
    this.game = {
      name,
      type: type || 'PLAYING',
      url: stream
    };
  }

  /** Replaces the dynamic variables inside the presence name */
  getName() {
    let result = this.game.name;
    const dictionary: Record<string, () => string> = {
      guildCount: client.guilds.size.toString,
      userCount: client.users.size.toString
    };

    for (const key in dictionary)
      result = result.replace(new RegExp(`/${key}/`, 'g'), dictionary[key]());

    return result;
  }
}

const status = [
  new Presence('for your requests!', 'WATCHING'),
  new Presence('/guildCount/ servers.', 'WATCHING'),
  new Presence('/userCount/ users.', 'LISTENING')
];

var index = 0;

/** Reads a custom `Presence` instance and sets it to the client user
 * @param pres The `Presence` to read
 */
function setPresence(pres: Presence) {
  index++;
  index %= status.length;

  client.user.setStatus(pres.status);
  client.user.setActivity(pres.getName(), {
    type: pres.game.type
  });
}


if (status.length > 0) setPresence(status[0]);
if (status.length > 1) setInterval(setPresence, interval, status[index]);
