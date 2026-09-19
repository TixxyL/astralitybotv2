const { SlashCommandBuilder } = require('discord.js');
const { createTicketChannel, findUserTicket } = require('../utils/tickets');

module.exports = {
  data: new SlashCommandBuilder().setName('ticket').setDescription('Crea un ticket de soporte'),
  async execute(interaction) {
    const existing = findUserTicket(interaction.guild, interaction.user.id);
    if (existing) {
      await interaction.reply({ content: `Ya tienes un ticket abierto: ${existing}`, ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    const channel = await createTicketChannel(interaction.guild, interaction.user, null);
    await interaction.editReply({ content: `Tu ticket ha sido creado: ${channel}` });
  },
};
