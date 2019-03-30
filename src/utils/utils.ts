import { TSMap as Map } from 'typescript-map';
import { User, GuildMember } from 'discord.js';

/**
 * Returns str with capital first letter
 * @param str
 */
export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Wheter two items are "equal" (properties and keys are checked for objects and arrays)
 * @param ...items The items to check
 */
export function equals(...items: any[]) {
  for (let i = 0; i < items.length - 1; i++) {
    const a = items[i],
      b = items[i + 1];
    if (typeof a != typeof b) return false;
    if (a instanceof Array) {
      if (b instanceof Array) {
        if (a.length != b.length) return false;
        for (let j = 0; j < a.length; j++)
          if (a[j] != b[j]) return false;
      } else return false;
    } else if (typeof a == 'object') {
      if (Object.keys(a).length != Object.keys(b).length) return false;
      for (const key of Object.keys(a))
        if (a[key] != b[key]) return false;
    } else if (a != b) return false;
  }
  return true;
}

/**
 * Returns a plain full name for a given user
 * @param user 
 */
export function getFullName(user: User | GuildMember) {
  if (user instanceof GuildMember) user = user.user;
  return `${user.username}#${user.discriminator} (${user.id})`;
}

/**
 * Retunes a plain short name for a given user or member
 * @param user 
 */
export function getShortName(user: User | GuildMember) {
  if (user instanceof GuildMember) user = user.user;
  return `${user.username}#${user.discriminator}`;
}

/**
 * Makes a string readable
 * @param str 
 */
export function humanize(str: string) {
  return str
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b[A-Z][a-z]+\b/g, word => word.toLowerCase())
    .replace(/^[a-z]/g, first => first.toUpperCase());
}


/**
 * Checks whether a string is a Discord mention.
 * @param str The string to check
 */
export function isMention(str: string) {
  return (str.startsWith('<@') && str.endsWith('>') && str.length == 18 + 3);
}

/**
 * Converts a map into an object.
 * @param map The map to convert
 */
export function mapToObj(map: Map<any, any>) {
  return [...map.entries()].reduce((obj, [key, value]) => (obj[key] = value, obj), {});
}

/**
 * Converts a Discord mention into a string.
 * @param str The mention to convert
 */
export function mentionToID(str: string) {
  return str.replace(/[\\<>@#&!]/g, '');
}

/**
 * Formats a number
 * @param number 
 * @param decimals The number of decimals to show
 * @param dec_point The character to use to separate decimals (deafult is `.`)
 * @param thousands_sep The character to use to separate thousands (default is `,`)
 */
export function numberFormat(number: number, decimals: number, dec_point?: string, thousands_sep?: string) {
  // *     example 1: number_format(1234.56);
  // *     returns 1: '1,235'
  // *     example 2: number_format(1234.56, 2, ',', ' ');
  // *     returns 2: '1 234,56'
  // *     example 3: number_format(1234.5678, 2, '.', '');
  // *     returns 3: '1234.57'
  // *     example 4: number_format(67, 2, ',', '.');
  // *     returns 4: '67,00'
  // *     example 5: number_format(1000);
  // *     returns 5: '1,000'
  // *     example 6: number_format(67.311, 2);
  // *     returns 6: '67.31'
  // *     example 7: number_format(1000.55, 1);
  // *     returns 7: '1,000.6'
  // *     example 8: number_format(67000, 5, ',', '.');
  // *     returns 8: '67.000,00000'
  // *     example 9: number_format(0.9, 0);
  // *     returns 9: '1'
  // *    example 10: number_format('1.20', 2);
  // *    returns 10: '1.20'
  // *    example 11: number_format('1.20', 4);
  // *    returns 11: '1.2000'
  // *    example 12: number_format('1.2000', 3);
  // *    returns 12: '1.200'
  var n = !isFinite(+number) ? 0 : +number,
    prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
    sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
    dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
    toFixedFix = function (n, prec) {
      // Fix for IE parseFloat(0.55).toFixed(0) = 0;
      var k = Math.pow(10, prec);
      return Math.round(n * k) / k;
    },
    s = (prec ? toFixedFix(n, prec) : Math.round(n)).toString().split('.');
  if (s[0].length > 3) {
    s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
  }
  if ((s[1] || '').length < prec) {
    s[1] = s[1] || '';
    s[1] += new Array(prec - s[1].length + 1).join('0');
  }
  return s.join(dec);
}

/**
 * Converts decimal hours into a readable hh:mm
 * @param hours
 * @param readable Whether to make the minutes readable; if set to `false`, [hh, mm] will be returned
 */
export function readHours(hours: number, readable = true) {
  const hr = Math.floor(hours),
    mn = Math.round(hours * 60 % 60);
  return readable ? `${hr}h ${mn}'` : [hr, mn];
}

/**
 * Converts decimal minutes into a readable mm:ss
 * @param minutes 
 * @param readable Whether to make the minutes readable; if set to `false`, [mm, ss] will be returned
 */
export function readMinutes(minutes: number, readable = true) {
  const mn = Math.floor(minutes),
    ss = Math.round(minutes * 60 % 60);
  return readable ? `${twoDigits(mn)}:${twoDigits(ss)}` : [mn, ss];
}

/**
 * Default use of numberFormat 
 * @param number 
 * @param decimals The number of decimals to show
 */
export function readNumber(number: number, decimals = 2) {
  return numberFormat(number, decimals, '.', '\'');
}

/**
 * Takes a number and takes the last two digits (adds a 0 if needed)
 * @param number 
 */
export function twoDigits(number: number) {
  return `0${number}`.slice(-2);
}