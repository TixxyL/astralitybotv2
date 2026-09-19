const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermission } = require('../utils/permissions');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { logModAction } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banea a un usuario del servidor')
    .addUserOption((option) => option.setName('usuario').setDescription('Usuario a banear').setRequired(true))
    .addStringOption((option) => option.setName('razon').setDescription('Razón del baneo').setRequired(false))
    .addIntegerOption((option) =>
      option
        .setName('borrar_mensajes')
        .setDescription('Días de mensajes a borrar (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction, client) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.BanMembers))) return;

    await interaction.deferReply();

    const user = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razon') || 'Sin razón especificada';
    const deleteDays = interaction.options.getInteger('borrar_mensajes') || 0;

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member && !member.bannable) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, 'No se pudo banear', 'No tengo permisos suficientes sobre ese usuario (su rol es igual o superior al mío).')], ephemeral: true });
    }

    if (member) {
      await member
        .send({ embeds: [errorEmbed(interaction.guild, `Fuiste baneado de ${interaction.guild.name}`, `**Razón:** ${reason}`)] })
        .catch(() => {});
    }

    await interaction.guild.members.ban(user.id, { reason, deleteMessageSeconds: deleteDays * 86400 });

    await interaction.editReply({ embeds: [successEmbed(interaction.guild, 'Usuario baneado', `**${user.tag}** fue baneado.\n**Razón:** ${reason}`)] });

    await logModAction({ guild: interaction.guild, action: 'ban', moderator: interaction.user, target: user, reason }, client);
  },
};
