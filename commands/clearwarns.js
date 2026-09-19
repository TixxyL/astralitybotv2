const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermission } = require('../utils/permissions');
const { successEmbed } = require('../utils/embeds');
const { logModAction } = require('../utils/logger');
const { clearWarnings } = require('../utils/warnings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('Elimina todas las advertencias de un usuario')
    .addUserOption((option) => option.setName('usuario').setDescription('Usuario a limpiar').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction, client) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ModerateMembers))) return;

    await interaction.deferReply();

    const user = interaction.options.getUser('usuario');
    const removed = clearWarnings(interaction.guild.id, user.id);

    await interaction.editReply({ embeds: [successEmbed(interaction.guild, 'Advertencias limpiadas', `Se eliminaron **${removed}** advertencia(s) de **${user.tag}**.`)] });

    await logModAction({ guild: interaction.guild, action: 'clearwarns', moderator: interaction.user, target: user, extra: `${removed} advertencia(s) eliminadas` }, client);
  },
};
