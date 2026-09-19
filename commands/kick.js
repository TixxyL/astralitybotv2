const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermission } = require('../utils/permissions');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { logModAction } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsa a un usuario del servidor')
    .addUserOption((option) => option.setName('usuario').setDescription('Usuario a expulsar').setRequired(true))
    .addStringOption((option) => option.setName('razon').setDescription('Razón de la expulsión').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction, client) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.KickMembers))) return;

    await interaction.deferReply();

    const user = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razon') || 'Sin razón especificada';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, 'Usuario no encontrado', 'Ese usuario no está en el servidor.')], ephemeral: true });
    }
    if (!member.kickable) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, 'No se pudo expulsar', 'No tengo permisos suficientes sobre ese usuario.')], ephemeral: true });
    }

    await member.send({ embeds: [errorEmbed(interaction.guild, `Fuiste expulsado de ${interaction.guild.name}`, `**Razón:** ${reason}`)] }).catch(() => {});

    await member.kick(reason);

    await interaction.editReply({ embeds: [successEmbed(interaction.guild, 'Usuario expulsado', `**${user.tag}** fue expulsado.\n**Razón:** ${reason}`)] });

    await logModAction({ guild: interaction.guild, action: 'kick', moderator: interaction.user, target: user, reason }, client);
  },
};
