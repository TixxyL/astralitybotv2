const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { requirePermission } = require('../utils/permissions');
const { getGuildSettings, saveGuildSettings } = require('../utils/database');
const { baseEmbed, successEmbed, errorEmbed } = require('../utils/embeds');
const config = require('../config');

function defaults() {
  return {
    ...config.defaultGuildSettings,
    minecraft: { ...config.defaultGuildSettings.minecraft },
  };
}

function getSettings(guildId) {
  return getGuildSettings(guildId, defaults());
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configura el bot para este servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) => option
      .setName('accion')
      .setDescription('Configuración que quieres consultar o cambiar')
      .setRequired(true)
      .addChoices(
        { name: 'Ver configuración', value: 'view' },
        { name: 'Canal de logs', value: 'log-channel' },
        { name: 'Canal de transcripciones', value: 'transcript-channel' },
        { name: 'Categoría de tickets', value: 'ticket-category' },
        { name: 'Mención de tickets', value: 'ticket-ping' },
        { name: 'Rol de staff de tickets', value: 'staff-role' },
        { name: 'Servidor de Minecraft', value: 'mc-host' },
        { name: 'Puerto de Minecraft', value: 'mc-port' },
      ))
    .addChannelOption((option) => option
      .setName('canal')
      .setDescription('Canal que quieres configurar')
      .addChannelTypes(ChannelType.GuildText))
    .addRoleOption((option) => option.setName('rol').setDescription('Rol de staff de tickets'))
    .addStringOption((option) => option.setName('valor').setDescription('Texto, dirección o puerto')),

  async execute(interaction) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.Administrator))) return;
    const action = interaction.options.getString('accion');
    const settings = getSettings(interaction.guild.id);
    const channel = interaction.options.getChannel('canal');
    const role = interaction.options.getRole('rol');
    const value = interaction.options.getString('valor')?.trim();

    if (action === 'view') {
      const staff = settings.ticketStaffRoleIds.length
        ? settings.ticketStaffRoleIds.map((id) => `<@&${id}>`).join(', ')
        : 'No configurado';
      await interaction.reply({ embeds: [baseEmbed(interaction.guild).setTitle('⚙️ Configuración del servidor').addFields(
        { name: 'Canal de logs', value: `<#${settings.logChannelId}>`, inline: true },
        { name: 'Canal de transcripciones', value: settings.transcriptChannelId ? `<#${settings.transcriptChannelId}>` : 'No configurado', inline: true },
        { name: 'Categoría de tickets', value: settings.ticketCategoryName, inline: true },
        { name: 'Mención de tickets', value: settings.ticketPing, inline: true },
        { name: 'Staff de tickets', value: staff, inline: true },
        { name: 'Minecraft', value: `${settings.minecraft.host}:${settings.minecraft.port}`, inline: true },
      )] });
      return;
    }

    if (action === 'log-channel') {
      if (!channel) return interaction.reply({ embeds: [errorEmbed(interaction.guild, 'Falta el canal', 'Selecciona un canal de texto.')], ephemeral: true });
      settings.logChannelId = channel.id;
    } else if (action === 'transcript-channel') {
      if (!channel) return interaction.reply({ embeds: [errorEmbed(interaction.guild, 'Falta el canal', 'Selecciona el canal exclusivo de transcripciones.')], ephemeral: true });
      settings.transcriptChannelId = channel.id;
    } else if (action === 'ticket-category') {
      if (!value || value.length > 90) return interaction.reply({ embeds: [errorEmbed(interaction.guild, 'Nombre inválido', 'Indica un nombre de categoría de hasta 90 caracteres.')], ephemeral: true });
      settings.ticketCategoryName = value;
    } else if (action === 'ticket-ping') {
      if (!value || value.length > 200) return interaction.reply({ embeds: [errorEmbed(interaction.guild, 'Mención inválida', 'Indica una mención o texto de hasta 200 caracteres.')], ephemeral: true });
      settings.ticketPing = value;
    } else if (action === 'staff-role') {
      if (!role) return interaction.reply({ embeds: [errorEmbed(interaction.guild, 'Falta el rol', 'Selecciona el rol que atenderá los tickets.')], ephemeral: true });
      settings.ticketStaffRoleIds = [role.id];
    } else if (action === 'mc-host') {
      if (!value || !/^[a-z0-9.-]+$/i.test(value)) return interaction.reply({ embeds: [errorEmbed(interaction.guild, 'Dirección inválida', 'Indica un dominio o una dirección IP válida.')], ephemeral: true });
      settings.minecraft.host = value;
    } else if (action === 'mc-port') {
      const port = Number(value);
      if (!Number.isInteger(port) || port < 1 || port > 65535) return interaction.reply({ embeds: [errorEmbed(interaction.guild, 'Puerto inválido', 'Usa un puerto entre 1 y 65535.')], ephemeral: true });
      settings.minecraft.port = port;
    }

    saveGuildSettings(interaction.guild.id, settings);
    await interaction.reply({ embeds: [successEmbed(interaction.guild, 'Configuración actualizada', 'El cambio se guardó correctamente para este servidor.')] });
  },
};
