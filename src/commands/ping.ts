import { Message } from 'discord.js'
import { client } from '../core/app'
import { CommandOptions, SlashCommandBuilder } from '../utils/commands'

export const command: CommandOptions = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Shows the current ws and effective ping.'),

  async run(int) {
    const reply = await int.reply({
      content: '🏓 Pong!',
      ephemeral: true,
      fetchReply: true
    })

    if (!(reply instanceof Message)) return

    await int.editReply({
      content: `🏓 Pong!\nWS ping: ${Math.round(
        client.ws.ping
      )} ms\nEffective: ${Math.round(
        reply.createdTimestamp - int.createdTimestamp
      )}`
    })
  }
}
