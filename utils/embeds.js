const { EmbedBuilder } = require('discord.js');
const config = require('../config');

function baseEmbed(guild) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTimestamp();
  if (guild) {
    embed.setFooter({
      text: config.brand.name,
      iconURL: guild.iconURL({ size: 64 }) || undefined,
    });
  } else {
    embed.setFooter({ text: config.brand.name });
  }
  return embed;
}

function successEmbed(guild, title, description) {
  return baseEmbed(guild).setColor(config.colors.success).setTitle(`✅ ${title}`).setDescription(description || null);
}

function errorEmbed(guild, title, description) {
  return baseEmbed(guild).setColor(config.colors.danger).setTitle(`❌ ${title}`).setDescription(description || null);
}

function warningEmbed(guild, title, description) {
  return baseEmbed(guild).setColor(config.colors.warning).setTitle(`⚠️ ${title}`).setDescription(description || null);
}

module.exports = { baseEmbed, successEmbed, errorEmbed, warningEmbed };
