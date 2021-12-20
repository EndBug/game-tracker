import path from 'path'
import * as supabase from '@supabase/supabase-js'
import { Snowflake } from 'discord.js'
import { APITable } from './api'

const backupFn = '../../data/settings.json'

export type ProviderTables = keyof Database

export interface Database {
  p: { id: Snowflake; prefix: string; created_at: string }[]
  ow: {
    id: Snowflake
    username: string
    platform: string
    created_at: string
  }[]
  r6: {
    id: Snowflake
    username: string
    platform: string
    created_at: string
  }[]
}
const validTables = ['p', 'ow', 'r6'] as const

class Provider {
  path: string
  ready: boolean
  sbClient: supabase.SupabaseClient

  constructor() {
    const { SupabaseURL, SupabaseToken } = process.env

    if (!(SupabaseURL && SupabaseToken))
      throw new Error('Supabase config missing.')

    this.ready = false
    this.sbClient = supabase.createClient(SupabaseURL, SupabaseToken)
    this.path = path.join(__dirname, backupFn)
  }

  async delete<T extends ProviderTables>(
    table: T,
    id: Database[T][number]['id']
  ) {
    const { error } = await this.sbClient.from(table).delete().match({ id })

    if (error) throw new Error(`[db] Error during delete:\n${error}`)
  }

  async get<T extends ProviderTables>(
    table: T,
    id: Database[T][number]['id']
  ): Promise<Database[T][number]> {
    const { data, error } = await this.sbClient
      .from(table)
      .select()
      .match({ id })
      .single()

    if (error) throw new Error(`[db] Error during get:\n${error}`)

    return data
  }

  async set<T extends ProviderTables>(table: T, value: Database[T][number]) {
    const { error } = await this.sbClient.from(table).upsert(value)

    if (error) throw new Error(`[db] Error during set:\n${error}`)
  }

  async stats() {
    const res = {} as Record<APITable, number>

    for (const table of validTables) {
      const { count } = await this.sbClient
        .from(table)
        .select('*', { count: 'exact' })
      res[table] = count
    }

    return res
  }
}

export const provider = new Provider()
