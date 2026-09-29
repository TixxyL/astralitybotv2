const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('Muestra las recompensas por invitaciones'),

  async execute(interaction) {
    const embed = baseEmbed(interaction.guild)
      .setTitle('🎁 Recompensas por invitaciones')
      .setDescription('Invita personas al servidor y reclama la recompensa correspondiente.')
      .addFields(
        { name: '20 invitaciones', value: '• Star 1 mes\n• 200k money\n• 3 llaves raras' },
        { name: '30 invitaciones', value: '• Solar 1 mes\n• 700k money\n• 3 llaves maestras' },
        { name: '50 invitaciones', value: '• Galaxy 1 mes\n• 2M money\n• 3 llaves legendarias' },
      );
    await interaction.reply({ embeds: [embed] });
  },
};