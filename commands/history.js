const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermission } = require('../utils/permissions');
const { baseEmbed } = require('../utils/embeds');
const { getWarnings } = require('../utils/warnings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('Consulta el historial de sanciones de un usuario')
    .addUserOption((option) => option.setName('usuario').setDescription('Usuario a consultar').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ModerateMembers))) return;
    const user = interaction.options.getUser('usuario');
    const warnings = getWarnings(interaction.guild.id, user.id);
    const description = warnings.length
      ? warnings.map((warning) => `**#${warning.id}** <t:${Math.floor(new Date(warning.timestamp).getTime() / 1000)}:R>\n${warning.reason}`).join('\n\n').slice(0, 4000)
      : 'No hay advertencias registradas.';
    await interaction.reply({ embeds: [baseEmbed(interaction.guild).setTitle(`📋 Historial de ${user.tag}`).setDescription(description)] });
  },
};
