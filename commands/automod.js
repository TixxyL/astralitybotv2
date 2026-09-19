const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermission } = require('../utils/permissions');
const { baseEmbed, errorEmbed, successEmbed } = require('../utils/embeds');
const config = require('../config');
const { getAutomodSettings, saveAutomodSettings, resetAutomodStrikes } = require('../utils/database');

function getSettings(interaction) {
  if (!interaction.client.automodSettings) interaction.client.automodSettings = new Map();
  if (!interaction.client.automodSettings.has(interaction.guild.id)) {
    interaction.client.automodSettings.set(interaction.guild.id, getAutomodSettings(interaction.guild.id, config.automod));
  }
  return interaction.client.automodSettings.get(interaction.guild.id);
}

function normalizeDomain(value) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Administra la moderación automática')
    .addStringOption((option) => option
      .setName('accion')
      .setDescription('Acción que quieres realizar')
      .setRequired(true)
      .addChoices(
        { name: 'Ver configuración', value: 'status' },
        { name: 'Activar', value: 'enable' },
        { name: 'Desactivar', value: 'disable' },
        { name: 'Bloquear enlaces', value: 'links-on' },
        { name: 'Permitir enlaces', value: 'links-off' },
        { name: 'Añadir dominio permitido', value: 'allow-add' },
        { name: 'Quitar dominio permitido', value: 'allow-remove' },
        { name: 'Limpiar infracciones de usuario', value: 'clear-user' }
      ))
    .addStringOption((option) => option.setName('valor').setDescription('Dominio o ID de usuario según la acción').setRequired(false)),

  async execute(interaction, client) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ManageMessages))) return;
    const action = interaction.options.getString('accion');
    const value = interaction.options.getString('valor');
    const settings = getSettings(interaction);

    if (action === 'status') {
      const domains = settings.allowedDomains.length ? settings.allowedDomains.join(', ') : 'ninguno';
      await interaction.reply({ embeds: [baseEmbed(interaction.guild).setTitle('🛡️ Configuración de AutoMod').addFields(
        { name: 'Estado', value: settings.enabled ? '🟢 Activo' : '🔴 Desactivado', inline: true },
        { name: 'Enlaces', value: settings.blockLinks ? '🔒 Bloqueados' : '🔓 Permitidos', inline: true },
        { name: 'Timeout base', value: `${settings.timeoutMinutes} minutos`, inline: true },
        { name: 'Dominios permitidos', value: domains }
      )] });
      return;
    }

    if (action === 'allow-add' || action === 'allow-remove') {
      const domain = value && normalizeDomain(value);
      if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
        await interaction.reply({ embeds: [errorEmbed(interaction.guild, 'Dominio inválido', 'Usa un dominio como `youtube.com` o `play.astrality.net`.')], ephemeral: true });
        return;
      }
      settings.allowedDomains = action === 'allow-add'
        ? [...new Set([...settings.allowedDomains, domain])]
        : settings.allowedDomains.filter((item) => item !== domain);
      saveAutomodSettings(interaction.guild.id, settings);
      await interaction.reply({ embeds: [successEmbed(interaction.guild, action === 'allow-add' ? 'Dominio permitido' : 'Dominio eliminado', `Configuración actualizada para **${domain}**.`)] });
      return;
    }

    if (action === 'clear-user') {
      if (!value || !/^\d{15,21}$/.test(value)) {
        await interaction.reply({ embeds: [errorEmbed(interaction.guild, 'ID inválido', 'Indica el ID numérico del usuario.')], ephemeral: true });
        return;
      }
      resetAutomodStrikes(interaction.guild.id, value);
      await interaction.reply({ embeds: [successEmbed(interaction.guild, 'Infracciones limpiadas', `Se reinició el contador de <@${value}>.`)] });
      return;
    }

    if (action === 'enable' || action === 'disable') settings.enabled = action === 'enable';
    if (action === 'links-on' || action === 'links-off') settings.blockLinks = action === 'links-on';
    saveAutomodSettings(interaction.guild.id, settings);
    await interaction.reply({ embeds: [successEmbed(interaction.guild, 'AutoMod actualizado', 'La configuración se guardó correctamente.')] });
  },
};
