const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermission } = require('../utils/permissions');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { logModAction } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Quita el baneo a un usuario')
    .addStringOption((option) => option.setName('usuario_id').setDescription('ID del usuario baneado').setRequired(true))
    .addStringOption((option) => option.setName('razon').setDescription('Razón del desbaneo').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction, client) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.BanMembers))) return;
    await interaction.deferReply();
    const userId = interaction.options.getString('usuario_id');
    const reason = interaction.options.getString('razon') || 'Sin razón especificada';

    try {
      await interaction.guild.members.unban(userId, reason);
      await interaction.editReply({ embeds: [successEmbed(interaction.guild, 'Usuario desbaneado', `Se quitó el baneo a <@${userId}>.\n**Razón:** ${reason}`)] });
      await logModAction({ guild: interaction.guild, action: 'unban', moderator: interaction.user, reason, extra: `Usuario: ${userId}` }, client);
    } catch {
      await interaction.editReply({ embeds: [errorEmbed(interaction.guild, 'No se pudo desbanear', 'No existe un baneo para ese ID o el ID no es válido.')] });
    }
  },
};
