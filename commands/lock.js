const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { requirePermission } = require('../utils/permissions');
const { successEmbed } = require('../utils/embeds');
const { logModAction } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Bloquea un canal para que @everyone no pueda enviar mensajes')
    .addChannelOption((option) => option.setName('canal').setDescription('Canal a bloquear (por defecto, el actual)').addChannelTypes(ChannelType.GuildText).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction, client) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ManageChannels))) return;

    await interaction.deferReply();

    const channel = interaction.options.getChannel('canal') || interaction.channel;

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });

    await interaction.editReply({ embeds: [successEmbed(interaction.guild, 'Canal bloqueado', `${channel} fue bloqueado. @everyone ya no puede enviar mensajes.`)] });

    await logModAction({ guild: interaction.guild, action: 'lock', moderator: interaction.user, extra: `Canal: ${channel}` }, client);
  },
};
