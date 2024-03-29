/* eslint-disable no-redeclare */

import { TSMap as Map } from 'typescript-map'
import { User, GuildMember } from 'discord.js'
import { owner } from '../core/app'
import PrettyError from 'pretty-error'

export { v4 as uuid } from 'uuid'

// #region Constants
/** The API limit when sending option choices. */
export const CHOICES_MAX = 25
// #endregion

// #region Types
export type WithOptional<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>
// #endregion

// #region Classes
/** Temporarily stores data that gets fecthed through OverwatchAPI.getRaw, in order to avoid too many requests */
export class Cache {
  name: string
  store: Map<string, any>

  constructor(name: string) {
    this.name = name
    this.store = new Map()
  }

  /**
   * Adds an entry to the cache
   * @param id The key of the entry
   * @param value The value of the entry
   */
  add(id: string, value) {
    this.store.set(id, value)
    setTimeout(() => {
      this.store.delete(id)
    }, 60 * 1000)
    return this.store
  }

  /**
   * Gets a value from the cache
   * @param id The id of the entry
   */
  get(id: string) {
    return this.store.get(id)
  }
}
// #endregion

// #region Functions
/**
 * Converts a camelCase string into a more readable format
 * @example 'thisIsAnExample' => 'This is an example'
 * @param joinWith The string to join the others (by default is a space)
 */
export function camelToReadable(str: string, joinWith = ' ') {
  const arr = str.split(/(?=[A-Z])/)
  for (let i = 0; i < arr.length; i++) {
    if (i == 0) arr[i] = capitalize(arr[i])
    else arr[i] = arr[i].toLowerCase()
  }
  return arr.join(joinWith)
}

/** Returns str with capital first letter */
export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/** Makes sure that there is only one value; when an array is passed as argument, return only the firts element */
export function ensureOne<T>(value: T | T[]): T {
  if (value instanceof Array) return value[0]
  else return value
}

/** Wheter two items are "equal" (properties and keys are checked for objects and arrays) */
export function equals(...items: any[]) {
  for (let i = 0; i < items.length - 1; i++) {
    const a = items[i],
      b = items[i + 1]
    if (typeof a != typeof b || !!a != !!b) return false
    if (a instanceof Array) {
      if (b instanceof Array) {
        if (a.length != b.length) return false
        for (let j = 0; j < a.length; j++) if (a[j] != b[j]) return false
      } else return false
    } else if (typeof a == 'object') {
      if (Object.keys(a).length != Object.keys(b).length) return false
      for (const key of Object.keys(a)) if (a[key] != b[key]) return false
    } else if (a != b) return false
  }
  return true
}

/** Retunes a plain short name for a given user or member */
export function getShortName(user: User | GuildMember) {
  if (user instanceof GuildMember) user = user.user
  return `${user.username}#${user.discriminator}`
}

/** Makes a string readable */
export function humanize(str: string) {
  return str
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b[A-Z][a-z]+\b/g, (word) => word.toLowerCase())
    .replace(/^[a-z]/g, (first) => first.toUpperCase())
}

/**
 * Takes some objects and creates a new object with all the properties of the original ones
 *
 * If a property is present in more objects, the resulting will be the sum of the values of the others
 * @param objects The objects you want to merge
 */
export function mergeAndSum<T>(...objects: T[]): T {
  const actuallyDoIt = (obj1: T, obj2: T | T[]) => {
    if (obj2 instanceof Array) return actuallyDoIt(obj1, internalCheck(...obj2))

    const result = obj1
    for (const key in obj2) {
      // @ts-expect-error
      if (typeof result[key] == 'number') result[key] += obj2[key]
      else result[key] = obj2[key]
    }
    return result
  }

  const internalCheck = (...objects: T[]) => {
    if (objects.length < 2) return objects[0]
    if (objects.length > 2) return actuallyDoIt(objects[0], objects.slice(1))
    if (objects.length == 2) return actuallyDoIt(objects[0], objects[1])
  }

  return internalCheck(...objects)
}

/** Formats a number
 * @param decimals The number of decimals to show
 * @param dec_point The character to use to separate decimals (deafult is `.`)
 * @param thousands_sep The character to use to separate thousands (default is `,`)
 */
export function numberFormat(
  number: number,
  decimals: number,
  dec_point?: string,
  thousands_sep?: string
) {
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
    sep = typeof thousands_sep === 'undefined' ? ',' : thousands_sep,
    dec = typeof dec_point === 'undefined' ? '.' : dec_point,
    toFixedFix = function (n, prec) {
      // Fix for IE parseFloat(0.55).toFixed(0) = 0;
      var k = Math.pow(10, prec)
      return Math.round(n * k) / k
    },
    s = (prec ? toFixedFix(n, prec) : Math.round(n)).toString().split('.')
  if (s[0].length > 3) {
    s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep)
  }
  if ((s[1] || '').length < prec) {
    s[1] = s[1] || ''
    s[1] += new Array(prec - s[1].length + 1).join('0')
  }
  return s.join(dec)
}

/** Converts decimal hours into a readable hh:mm
 * @param readable Whether to make the minutes readable; if set to `false`, [hh, mm] will be returned
 */
export function readHours(hours: number, readable?: true): string
export function readHours(hours: number, readable: false): number[]
export function readHours(hours: number, readable = true) {
  const hr = Math.floor(hours),
    mn = Math.round((hours * 60) % 60)
  return readable ? `${hr}h ${mn}'` : [hr, mn]
}

/** Converts decimal minutes into a readable mm:ss
 * @param readable Whether to make the minutes readable; if set to `false`, [mm, ss] will be returned
 */
export function readMinutes(hours: number, readable?: true): string
export function readMinutes(hours: number, readable: false): number[]
export function readMinutes(minutes: number, readable = true) {
  const mn = Math.floor(minutes),
    ss = Math.round((minutes * 60) % 60)
  return readable ? `${twoDigits(mn)}:${twoDigits(ss)}` : [mn, ss]
}

/** Default use of numberFormat
 * @param decimals The number of decimals to show
 */
export function readNumber(number: number, decimals = 2) {
  return numberFormat(number, decimals, '.', "'")
}

/**
 * Takes a number and takes the last two digits (adds a 0 if needed)
 * @param number
 */
export function twoDigits(number: number) {
  return `0${number}`.slice(-2)
}

/**
 * Logs an error to the console using pretty-error and sends it to the owner via DM
 * @param err The error to log
 * @param note An additional note to send to the owner
 */
export function sendErrorToOwner(err: any, note?: string) {
  const actualErr = err instanceof Error ? err : new Error(err + '')
  const customPE = new PrettyError()
  console.error(actualErr)
  return owner.send(
    (note ? note + '\n' : '') +
      '```\n' +
      customPE.withoutColors().render(actualErr) +
      '\n```'
  )
}

/** Converts a HH:MM:SS string into the number of seconds (MM:SS strings are also supported) */
export function stringToSeconds(str: string) {
  if (!str) return
  const arr = str.split(':')

  if (arr.length == 2) arr.unshift('0')
  if (arr.length != 3) return

  return +arr[0] * 60 * 60 + +arr[1] * 60 + +arr[2]
}
// #endregion
