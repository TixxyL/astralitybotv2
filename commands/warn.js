const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermission } = require('../utils/permissions');
const { successEmbed, warningEmbed } = require('../utils/embeds');
const { logModAction } = require('../utils/logger');
const { addWarning, getWarnings } = require('../utils/warnings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Advierte a un usuario y guarda el registro')
    .addUserOption((option) => option.setName('usuario').setDescription('Usuario a advertir').setRequired(true))
    .addStringOption((option) => option.setName('razon').setDescription('Razón de la advertencia').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction, client) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ModerateMembers))) return;

    await interaction.deferReply();

    const user = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razon');

    const entry = addWarning(interaction.guild.id, user.id, interaction.user.id, reason);
    const total = getWarnings(interaction.guild.id, user.id).length;

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member) {
      await member
        .send({ embeds: [warningEmbed(interaction.guild, `Recibiste una advertencia en ${interaction.guild.name}`, `**Razón:** ${reason}\n**Advertencia N°:** ${entry.id}`)] })
        .catch(() => {});
    }

    await interaction.editReply({ embeds: [successEmbed(interaction.guild, 'Advertencia registrada', `**${user.tag}** ahora tiene **${total}** advertencia(s).\n**Razón:** ${reason}`)] });

    await logModAction({ guild: interaction.guild, action: 'warn', moderator: interaction.user, target: user, reason, extra: `Total de advertencias: ${total}` }, client);
  },
};
