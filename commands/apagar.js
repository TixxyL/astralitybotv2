const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isAdmin } = require('../utils/permissions');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { logModAction } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apagar')
    .setDescription('Apaga el bot (solo admins)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction, client) {
    const hasAccess = isAdmin(interaction.user.id) || (interaction.member && interaction.member.permissions.has('Administrator'));

    await logModAction({ guild: interaction.guild, action: 'shutdown', moderator: interaction.user, extra: hasAccess ? 'Autorizado' : 'Intento sin permisos' }, client);

    if (!hasAccess) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, 'Permisos insuficientes', 'No tienes permisos para apagar el bot. Este intento fue registrado.')], ephemeral: true });
    }

    await interaction.reply({ embeds: [successEmbed(interaction.guild, 'Apagando el bot', 'El bot se apagará en unos segundos...')] });
    setTimeout(() => {
      client.destroy();
      process.exit(0);
    }, 1000);
  },
};
