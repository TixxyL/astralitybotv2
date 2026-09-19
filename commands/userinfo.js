const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Muestra información de un usuario')
    .addUserOption((option) => option.setName('usuario').setDescription('Usuario a consultar (por defecto, tú)').setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('usuario') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const embed = baseEmbed(interaction.guild)
      .setTitle(`👤 ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'ID', value: user.id, inline: true },
        { name: 'Cuenta creada', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
      );

    if (member) {
      embed.addFields(
        { name: 'Se unió al servidor', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: 'Apodo', value: member.nickname || '*Ninguno*', inline: true },
        {
          name: `Roles (${member.roles.cache.size - 1})`,
          value: member.roles.cache.filter((r) => r.id !== interaction.guild.id).map((r) => `${r}`).join(' ') || '*Sin roles*',
        }
      );
    }

    await interaction.reply({ embeds: [embed] });
  },
};
