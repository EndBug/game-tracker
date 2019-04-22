import { client, owner } from '../core/app';
import DBL from 'dblapi.js';

const dbl = new DBL(process.env.DBL_TOKEN, client);

/**
 * Posts bot stats to Discord Bots List's API
 * @param log Whether to log when the stats are posted
 */
export async function post(log = true) {
  try {
    const stats = await dbl.postStats(client.guilds.size);
    if (log) console.log(`[DBL] Posted server count to DBL: ${client.guilds.size} guilds.`);
    return stats;
  }
  catch (e) {
    const msg = `Can't post bot stats:\n${e}`;
    if (owner) owner.send(msg);
    else throw new Error('(Owner not available)\n' + msg);
  }
}

/**
 * The interval that periodically post bot stats to Discord Bots List's API
 */
export var postStatsInterval = setInterval(post, 1800000);