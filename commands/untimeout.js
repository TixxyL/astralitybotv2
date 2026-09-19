const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermission } = require('../utils/permissions');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { logModAction } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Quita el timeout a un usuario')
    .addUserOption((option) => option.setName('usuario').setDescription('Usuario a liberar').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction, client) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ModerateMembers))) return;

    await interaction.deferReply();

    const user = interaction.options.getUser('usuario');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, 'Usuario no encontrado', 'Ese usuario no está en el servidor.')], ephemeral: true });
    }
    if (!member.isCommunicationDisabled || !member.isCommunicationDisabled()) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, 'Sin timeout activo', 'Ese usuario no tiene un timeout activo.')], ephemeral: true });
    }

    await member.timeout(null);

    await interaction.editReply({ embeds: [successEmbed(interaction.guild, 'Timeout removido', `Se le quitó el timeout a **${user.tag}**.`)] });

    await logModAction({ guild: interaction.guild, action: 'untimeout', moderator: interaction.user, target: user }, client);
  },
};
