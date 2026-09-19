const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermission } = require('../utils/permissions');
const { successEmbed } = require('../utils/embeds');
const { logModAction } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Elimina mensajes del canal actual')
    .addIntegerOption((option) => option.setName('cantidad').setDescription('Cantidad de mensajes a eliminar (1-100)').setMinValue(1).setMaxValue(100).setRequired(true))
    .addUserOption((option) => option.setName('usuario').setDescription('Solo borrar mensajes de este usuario').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction, client) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ManageMessages))) return;

    const amount = interaction.options.getInteger('cantidad');
    const user = interaction.options.getUser('usuario');

    await interaction.deferReply({ ephemeral: true });

    let deletedCount;
    if (user) {
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const filtered = messages.filter((m) => m.author.id === user.id).first(amount);
      const deleted = await interaction.channel.bulkDelete(filtered, true);
      deletedCount = deleted.size;
    } else {
      const deleted = await interaction.channel.bulkDelete(amount, true);
      deletedCount = deleted.size;
    }

    await interaction.editReply({ embeds: [successEmbed(interaction.guild, 'Mensajes eliminados', `Se eliminaron **${deletedCount}** mensaje(s)${user ? ` de **${user.tag}**` : ''}.`)] });

    await logModAction({
      guild: interaction.guild,
      action: 'clear',
      moderator: interaction.user,
      target: user || null,
      extra: `${deletedCount} mensaje(s) eliminados en ${interaction.channel}`,
    }, client);
  },
};
