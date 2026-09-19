const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermission } = require('../utils/permissions');
const { successEmbed } = require('../utils/embeds');
const { logModAction } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Configura el modo lento del canal actual')
    .addIntegerOption((option) => option.setName('segundos').setDescription('0 para desactivar, máximo 21600').setMinValue(0).setMaxValue(21600).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  async execute(interaction, client) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ManageChannels))) return;
    const seconds = interaction.options.getInteger('segundos');
    await interaction.deferReply();
    await interaction.channel.setRateLimitPerUser(seconds, `Configurado por ${interaction.user.tag}`);
    await interaction.editReply({ embeds: [successEmbed(interaction.guild, seconds ? 'Modo lento activado' : 'Modo lento desactivado', seconds ? `Este canal tiene un intervalo de **${seconds} segundos**.` : 'Este canal ya no tiene intervalo de mensajes.')] });
    await logModAction({ guild: interaction.guild, action: 'slowmode', moderator: interaction.user, extra: `Canal: ${interaction.channel}; segundos: ${seconds}` }, client);
  },
};
