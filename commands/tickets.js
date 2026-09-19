const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermission } = require('../utils/permissions');
const { getOpenTickets } = require('../utils/database');
const { baseEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tickets')
    .setDescription('Muestra los tickets abiertos del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ManageChannels))) return;
    const tickets = getOpenTickets(interaction.guild.id);
    const description = tickets.length
      ? tickets.slice(0, 20).map((ticket) => {
        const age = Math.floor(new Date(ticket.createdAt).getTime() / 1000);
        return `<#${ticket.channelId}> · <@${ticket.ownerId}> · abierto <t:${age}:R>${ticket.claimedBy ? ` · asignado a <@${ticket.claimedBy}>` : ''}`;
      }).join('\n')
      : 'No hay tickets abiertos.';
    await interaction.reply({ embeds: [baseEmbed(interaction.guild).setTitle(`🎫 Tickets abiertos (${tickets.length})`).setDescription(description)] });
  },
};