import { client, owner } from '../core/app';
import DBL from 'dblapi.js';

const token = process.env.DBL_TOKEN;
export const available = !!token;

const dbl = available ? new DBL(token, client) : undefined;

/**
 * Posts bot stats to Discord Bots List's API
 * @param log Whether to log when the stats are posted
 */
export async function post(log = true) {
  if (!available) throw new Error('There is no loaded DBL client: please check that you\'ve added the DBL_TOKEN to your .env file.');

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
export var postStatsInterval = available ? setInterval(post, 1800000) : undefined;

/**
 * Gets the current votes for the bot
 */
export async function getVotes() {
  if (!available) throw new Error('There is no loaded DBL client: please check that you\'ve added the DBL_TOKEN to your .env file.');

  try {
    const votes = await dbl.getVotes();
    return votes;
  } catch (e) {
    const msg = `Can't post bot stats:\n${e}`;
    if (owner) owner.send(msg);
    else throw new Error('(Owner not available)\n' + msg);
  }
}