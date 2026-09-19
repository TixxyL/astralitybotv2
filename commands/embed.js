const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermission } = require('../utils/permissions');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Crea un embed personalizado')
    .addStringOption((option) => option.setName('titulo').setDescription('Título del embed').setRequired(true))
    .addStringOption((option) => option.setName('descripcion').setDescription('Descripción del embed').setRequired(true))
    .addStringOption((option) => option.setName('color').setDescription('Color HEX del embed (ej: #5865F2)').setRequired(false))
    .addStringOption((option) => option.setName('imagen').setDescription('URL de imagen para el embed').setRequired(false))
    .addStringOption((option) => option.setName('footer').setDescription('Texto del footer').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ManageMessages))) return;

    const titulo = interaction.options.getString('titulo');
    const descripcion = interaction.options.getString('descripcion');
    let color = interaction.options.getString('color');
    const imagen = interaction.options.getString('imagen');
    const footer = interaction.options.getString('footer');

    if (!color || !/^#?[0-9A-Fa-f]{6}$/.test(color)) {
      color = config.colors.primary;
    } else if (!color.startsWith('#')) {
      color = `#${color}`;
    }

    const embed = new EmbedBuilder().setTitle(titulo).setDescription(descripcion).setColor(color).setTimestamp();
    if (imagen) embed.setImage(imagen);
    if (footer) embed.setFooter({ text: footer });

    await interaction.reply({ embeds: [embed] });
  },
};
