const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermission } = require('../utils/permissions');
const { getWarnings } = require('../utils/warnings');
const { getModerationLogs } = require('../utils/database');
const { baseEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modlogs')
    .setDescription('Muestra el historial de moderación de un usuario')
    .addUserOption((option) => option.setName('usuario').setDescription('Usuario a consultar').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ModerateMembers))) return;
    const user = interaction.options.getUser('usuario');
    const logs = getModerationLogs(interaction.guild.id, user.id);
    const warnings = getWarnings(interaction.guild.id, user.id);
    const entries = logs.length ? logs : warnings.map((warning) => ({ action: 'warn', moderatorId: warning.moderatorId, reason: warning.reason, timestamp: warning.timestamp }));
    const description = entries.length
      ? entries.map((entry) => {
        const timestamp = Math.floor(new Date(entry.timestamp).getTime() / 1000);
        return `**${entry.action}** <t:${timestamp}:R>\nRazón: ${entry.reason || 'Sin razón'}\nModerador: <@${entry.moderatorId}>`;
      }).join('\n\n').slice(0, 3900)
      : 'No hay sanciones registradas para este usuario.';
    await interaction.reply({ embeds: [baseEmbed(interaction.guild).setTitle(`🧾 Historial de moderación: ${user.tag}`).setThumbnail(user.displayAvatarURL()).setDescription(description)], ephemeral: true });
  },
};
