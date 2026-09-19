const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('status').setDescription('Muestra el estado y latencia del bot'),
  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Calculando estado...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const wsLatency = interaction.client.ws.ping;
    const uptime = Math.floor(interaction.client.uptime / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    const embed = baseEmbed(interaction.guild)
      .setTitle('📡 Estado del bot')
      .addFields(
        { name: 'Estado', value: '🟢 Online', inline: true },
        { name: 'Respuesta', value: `${latency} ms`, inline: true },
        { name: 'Gateway', value: `${wsLatency} ms`, inline: true },
        { name: 'Tiempo activo', value: `${hours}h ${minutes}m ${seconds}s`, inline: true }
      );
    await interaction.editReply({ content: null, embeds: [embed] });
  },
};
