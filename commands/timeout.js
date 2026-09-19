const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermission } = require('../utils/permissions');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { logModAction } = require('../utils/logger');

const MAX_TIMEOUT_MINUTES = 40320; // 28 días, el máximo que permite Discord

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Silencia temporalmente a un usuario (timeout)')
    .addUserOption((option) => option.setName('usuario').setDescription('Usuario a silenciar').setRequired(true))
    .addIntegerOption((option) => option.setName('minutos').setDescription('Duración en minutos (máx. 40320 = 28 días)').setMinValue(1).setMaxValue(MAX_TIMEOUT_MINUTES).setRequired(true))
    .addStringOption((option) => option.setName('razon').setDescription('Razón del timeout').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction, client) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ModerateMembers))) return;

    await interaction.deferReply();

    const user = interaction.options.getUser('usuario');
    const minutes = interaction.options.getInteger('minutos');
    const reason = interaction.options.getString('razon') || 'Sin razón especificada';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, 'Usuario no encontrado', 'Ese usuario no está en el servidor.')], ephemeral: true });
    }
    if (!member.moderatable) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, 'No se pudo aplicar el timeout', 'No tengo permisos suficientes sobre ese usuario.')], ephemeral: true });
    }

    await member.timeout(minutes * 60 * 1000, reason);

    await interaction.editReply({ embeds: [successEmbed(interaction.guild, 'Timeout aplicado', `**${user.tag}** fue silenciado por **${minutes} minutos**.\n**Razón:** ${reason}`)] });

    await logModAction({ guild: interaction.guild, action: 'timeout', moderator: interaction.user, target: user, reason, extra: `Duración: ${minutes} minutos` }, client);
  },
};
