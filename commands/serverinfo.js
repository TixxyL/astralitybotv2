const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('serverinfo').setDescription('Muestra información del servidor'),
  async execute(interaction) {
    const guild = interaction.guild;
    const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;

    const embed = baseEmbed(guild)
      .setTitle(`🏰 ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 256 }) || null)
      .addFields(
        { name: 'Miembros', value: `${guild.memberCount}`, inline: true },
        { name: 'Creado', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Nivel de boost', value: `${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} boosts)`, inline: true },
        { name: 'Canales de texto', value: `${textChannels}`, inline: true },
        { name: 'Canales de voz', value: `${voiceChannels}`, inline: true },
        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  },
};
