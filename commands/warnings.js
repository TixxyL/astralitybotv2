const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermission } = require('../utils/permissions');
const { baseEmbed } = require('../utils/embeds');
const { getWarnings } = require('../utils/warnings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Muestra las advertencias de un usuario')
    .addUserOption((option) => option.setName('usuario').setDescription('Usuario a consultar').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ModerateMembers))) return;

    const user = interaction.options.getUser('usuario');
    const warns = getWarnings(interaction.guild.id, user.id);

    const embed = baseEmbed(interaction.guild)
      .setTitle(`📋 Advertencias de ${user.tag}`)
      .setThumbnail(user.displayAvatarURL());

    if (warns.length === 0) {
      embed.setDescription('Este usuario no tiene advertencias registradas.');
    } else {
      embed.setDescription(
        warns
          .map((w) => `**#${w.id}** — <t:${Math.floor(new Date(w.timestamp).getTime() / 1000)}:R>\n**Razón:** ${w.reason}\n**Moderador:** <@${w.moderatorId}>`)
          .join('\n\n')
      );
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
