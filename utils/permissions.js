const config = require('../config');
const { errorEmbed } = require('./embeds');
const { getGuildSettings } = require('./database');

function isAdmin(userId) {
  return config.adminIds.includes(userId);
}

// Un usuario puede usar un comando si tiene el permiso de Discord pedido,
// si es Administrator, o si está en la whitelist de config.adminIds.
function hasPermission(interaction, permission) {
  if (isAdmin(interaction.user.id)) return true;
  if (!interaction.member || !interaction.member.permissions) return false;
  return interaction.member.permissions.has('Administrator') || interaction.member.permissions.has(permission);
}

function isTicketStaff(interaction) {
  if (isAdmin(interaction.user.id)) return true;
  if (interaction.member?.permissions.has('Administrator') || interaction.member?.permissions.has('ManageChannels')) return true;
  const settings = getGuildSettings(interaction.guild.id, config.defaultGuildSettings);
  return settings.ticketStaffRoleIds?.some((roleId) => interaction.member?.roles.cache.has(roleId)) || false;
}

// Responde con un embed de error y devuelve false si el usuario no tiene
// permiso; devuelve true si puede continuar. Úsalo como guard al inicio
// de cada comando: `if (!(await requirePermission(...))) return;`
async function requirePermission(interaction, permission, label) {
  if (hasPermission(interaction, permission)) return true;
  await interaction.reply({
    embeds: [errorEmbed(interaction.guild, 'Permisos insuficientes', `No tienes permiso para usar \`/${label || interaction.commandName}\`.`)],
    ephemeral: true,
  });
  return false;
}

module.exports = { isAdmin, hasPermission, isTicketStaff, requirePermission };
