const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('Muestra todos los comandos disponibles'),
  async execute(interaction) {
    const embed = baseEmbed(interaction.guild)
      .setTitle('✨ Comandos de Astrality Bot ✨')
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .addFields(
        {
          name: '🛡️ Moderación',
          value:
            '`/ban` — Banea a un usuario.\n' +
            '`/kick` — Expulsa a un usuario.\n' +
            '`/timeout` — Silencia temporalmente a un usuario.\n' +
            '`/untimeout` — Quita el timeout a un usuario.\n' +
            '`/unban` — Quita el baneo usando el ID.\n' +
            '`/warn` — Advierte a un usuario.\n' +
            '`/history` — Consulta el historial de sanciones.\n' +
            '`/warnings` — Muestra las advertencias de un usuario.\n' +
            '`/clearwarns` — Limpia las advertencias de un usuario.\n' +
            '`/clear` — Elimina mensajes del canal.\n' +
            '`/lock` / `/unlock` — Bloquea o desbloquea un canal.\n' +
            '`/slowmode` — Configura el modo lento del canal.',
        },
        {
          name: '🎫 Tickets',
          value: '`/ticket` — Crea un ticket de soporte privado.\n`/paneltickets` — Publica el panel de tickets (admins).',
        },
        {
          name: 'ℹ️ Utilidad',
          value:
            '`/embed` — Crea un embed personalizado.\n' +
            '`/ip` — Muestra la IP del servidor de Minecraft.\n' +
            '`/userinfo` — Info de un usuario.\n' +
            '`/serverinfo` — Info del servidor de Discord.\n' +
            '`/avatar` — Muestra el avatar de un usuario.\n' +
              '`/status` — Muestra la latencia y estado del bot.\n' +
              '`/automod` — Administra filtros y dominios permitidos.\n' +
            '`/ask` — Pregunta algo a Astrality Assistant.',
        },
        {
          name: '⚙️ Administración',
          value: '`/apagar` — Apaga el bot (solo admins).',
        }
      )
      .setFooter({ text: 'Astrality Network • Todos los comandos son slash (/)' });

    await interaction.reply({ embeds: [embed] });
  },
};
