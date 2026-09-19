const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { requirePermission } = require('../utils/permissions');
const { baseEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('paneltickets')
    .setDescription('Envía el panel de tickets con menú y botón')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.Administrator))) return;

    const embed = baseEmbed(interaction.guild)
      .setTitle('🎫 Centro de Soporte - Astrality Network')
      .setDescription('¡Bienvenido al sistema de tickets! Elige una opción del menú y luego pulsa "Crear Ticket".')
      .addFields({
        name: '📋 Tipos de soporte disponibles',
        value:
          '🟢 **Soporte General** — Ayuda general y preguntas\n' +
          '⚙️ **Soporte Técnico** — Problemas técnicos y bugs\n' +
          '💳 **Facturación** — Consultas sobre pagos\n' +
          '🚨 **Reportar Usuario** — Reportar comportamiento inadecuado',
      });

    const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket_motivo')
      .setPlaceholder('🔽 Selecciona el tipo de ticket que necesitas')
      .addOptions([
        { label: 'Soporte General', value: 'soporte-general', emoji: '🟢', description: 'Ayuda general y preguntas' },
        { label: 'Soporte Técnico', value: 'soporte-tecnico', emoji: '⚙️', description: 'Problemas técnicos y errores' },
        { label: 'Facturación', value: 'facturacion', emoji: '💳', description: 'Consultas sobre pagos' },
        { label: 'Reportar Usuario', value: 'reportar-usuario', emoji: '🚨', description: 'Reportar comportamiento inadecuado' },
      ]);

    const boton = new ButtonBuilder().setCustomId('crear_ticket').setLabel('Crear Ticket').setStyle(ButtonStyle.Success).setEmoji('🎟️');

    const row1 = new ActionRowBuilder().addComponents(menu);
    const row2 = new ActionRowBuilder().addComponents(boton);

    await interaction.reply({ embeds: [embed], components: [row1, row2] });
  },
};
