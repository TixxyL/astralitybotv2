const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');
const { getInviteCount, getInvitedMembers } = require('../utils/invites');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inviteslist')
    .setDescription('Muestra las personas invitadas por un usuario')
    .addUserOption((option) => option
      .setName('usuario')
      .setDescription('Usuario del que quieres consultar las invitaciones')
      .setRequired(false)),

  async execute(interaction) {
    const user = interaction.options.getUser('usuario') || interaction.user;
    const total = getInviteCount(interaction.guild.id, user.id);
    const invitedMembers = getInvitedMembers(interaction.guild.id, user.id, 50);
    const list = invitedMembers.length
      ? invitedMembers.map((entry, index) => `${index + 1}. <@${entry.memberId}>`).join('\n')
      : 'Todavía no tiene invitaciones registradas.';

    const embed = baseEmbed(interaction.guild)
      .setTitle(`📨 Invitaciones de ${user.tag}`)
      .setThumbnail(user.displayAvatarURL())
      .setDescription(`**Total:** ${total} invitación${total === 1 ? '' : 'es'}\n\n${list}`);
    await interaction.reply({ embeds: [embed] });
  },
};