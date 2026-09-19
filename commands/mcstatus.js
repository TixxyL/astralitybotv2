const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, errorEmbed } = require('../utils/embeds');
const { getGuildSettings } = require('../utils/database');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder().setName('mcstatus').setDescription('Muestra el estado del servidor de Minecraft'),
  async execute(interaction) {
    await interaction.deferReply();
    const settings = getGuildSettings(interaction.guild.id, config.defaultGuildSettings);
    const host = settings.minecraft?.host || config.serverIp;
    const port = settings.minecraft?.port || Number(config.serverPort);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`https://api.mcstatus.io/v2/status/java/${encodeURIComponent(`${host}:${port}`)}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (!result.online) throw new Error('Servidor offline');
      const players = result.players ?? {};
      const version = result.version?.name_clean || result.version?.name || 'Desconocida';
      const online = players.online ?? 0;
      const max = players.max ?? '?';
      await interaction.editReply({ embeds: [baseEmbed(interaction.guild)
        .setTitle('🟢 Estado de Astrality Network')
        .setDescription(`El servidor está **online**.`)
        .addFields(
          { name: 'Dirección', value: `\`${host}:${port}\``, inline: true },
          { name: 'Jugadores', value: `${online}/${max}`, inline: true },
          { name: 'Versión', value: version, inline: true },
        )] });
    } catch {
      await interaction.editReply({ embeds: [errorEmbed(interaction.guild, 'Servidor offline', `No se pudo conectar a \`${host}:${port}\`.`)] });
    }
  },
};
