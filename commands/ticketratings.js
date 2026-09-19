const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermission } = require('../utils/permissions');
const { getTicketRatingStats } = require('../utils/database');
const { baseEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketratings')
    .setDescription('Muestra las calificaciones del staff en tickets')
    .addUserOption((option) => option.setName('staff').setDescription('Staff específico (opcional)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ManageChannels))) return;
    const staff = interaction.options.getUser('staff');
    const stats = getTicketRatingStats(interaction.guild.id, staff?.id);
    const description = stats.length
      ? stats.map((entry) => `**<@${entry.staffId}>** · ${entry.average}/5 ⭐ · ${entry.total} valoración(es) · ${entry.fiveStars} de 5 estrellas`).join('\n')
      : 'Todavía no hay calificaciones registradas para staff.';
    await interaction.reply({ embeds: [baseEmbed(interaction.guild).setTitle('⭐ Calificaciones de tickets').setDescription(description)] });
  },
};