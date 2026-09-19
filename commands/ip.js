const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder().setName('ip').setDescription('Muestra la IP del servidor de Minecraft'),
  async execute(interaction) {
    const embed = baseEmbed(interaction.guild)
      .setTitle('🌐 Conéctate a Astrality Network')
      .setDescription(`¡Hola ${interaction.user}! Aquí tienes los datos de conexión:`)
      .addFields(
        { name: 'IP', value: `\`${config.serverIp}\``, inline: true },
        { name: 'Puerto', value: `\`${config.serverPort}\``, inline: true },
        { name: 'Versión', value: config.serverVersion, inline: false }
      );

    await interaction.reply({ embeds: [embed] });
  },
};
