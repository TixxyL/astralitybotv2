const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Muestra el avatar de un usuario')
    .addUserOption((option) => option.setName('usuario').setDescription('Usuario a consultar (por defecto, tú)').setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('usuario') || interaction.user;
    const embed = baseEmbed(interaction.guild)
      .setTitle(`🖼️ Avatar de ${user.tag}`)
      .setImage(user.displayAvatarURL({ size: 1024 }));

    await interaction.reply({ embeds: [embed] });
  },
};
