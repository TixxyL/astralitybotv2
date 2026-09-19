const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { requirePermission } = require('../utils/permissions');
const { successEmbed } = require('../utils/embeds');
const { logModAction } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Desbloquea un canal para que @everyone pueda volver a enviar mensajes')
    .addChannelOption((option) => option.setName('canal').setDescription('Canal a desbloquear (por defecto, el actual)').addChannelTypes(ChannelType.GuildText).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction, client) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ManageChannels))) return;

    await interaction.deferReply();

    const channel = interaction.options.getChannel('canal') || interaction.channel;

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });

    await interaction.editReply({ embeds: [successEmbed(interaction.guild, 'Canal desbloqueado', `${channel} fue desbloqueado. @everyone puede volver a enviar mensajes.`)] });

    await logModAction({ guild: interaction.guild, action: 'unlock', moderator: interaction.user, extra: `Canal: ${channel}` }, client);
  },
};
