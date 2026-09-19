// Lógica compartida de creación de tickets. Antes estaba duplicada entre
// commands/ticket.js y el handler de botones en index.js (con un bug: usaban
// el número mágico 4/0 para el tipo de canal en vez de ChannelType).
const fs = require('fs');
const path = require('path');
const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const { createTicket } = require('./database');
const { getGuildSettings } = require('./database');

function getTicketSettings(guildId) {
  return getGuildSettings(guildId, {
    ticketCategoryName: config.ticketCategoryName,
    ticketPing: config.ticketPing,
    ticketStaffRoleIds: config.ticketStaffRoleIds,
  });
}

function findUserTicket(guild, userId) {
  return guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildText && channel.topic?.includes(`ticket-owner:${userId}`)
  );
}

function getTicketOwnerId(channel) {
  return channel.topic?.match(/ticket-owner:(\d+)/)?.[1] || null;
}

async function fetchAllMessages(channel) {
  const messages = [];
  let before;

  while (true) {
    const batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
    if (!batch.size) break;
    messages.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100) break;
  }

  return messages.reverse();
}

async function saveTranscript(channel, closedBy) {
  const messages = await fetchAllMessages(channel);
  let transcript = '=== TRANSCRIPCION DEL TICKET ===\n';
  transcript += `Canal: ${channel.name}\n`;
  transcript += `Propietario: ${getTicketOwnerId(channel) || 'desconocido'}\n`;
  transcript += `Cerrado por: ${closedBy.tag || closedBy.username}\n`;
  transcript += `Fecha: ${new Date().toLocaleString('es-ES')}\n`;
  transcript += `${'='.repeat(40)}\n\n`;

  for (const message of messages) {
    const time = new Date(message.createdTimestamp).toLocaleString('es-ES');
    transcript += `[${time}] ${message.author.tag}: ${message.content || '[sin texto]'}\n`;
    for (const attachment of message.attachments.values()) transcript += `  Adjunto: ${attachment.url}\n`;
    for (const embed of message.embeds) {
      if (embed.title || embed.description) transcript += `  Embed: ${embed.title || ''} ${embed.description || ''}\n`;
    }
  }

  const directory = path.join(__dirname, '..', 'data', 'transcripciones');
  fs.mkdirSync(directory, { recursive: true });
  const fileName = `${channel.name}-${Date.now()}.txt`;
  const filePath = path.join(directory, fileName);
  fs.writeFileSync(filePath, transcript, 'utf8');
  return { fileName, filePath };
}

async function createTicketChannel(guild, user, motivo) {
  const existing = findUserTicket(guild, user.id);
  if (existing) return existing;

  const settings = getTicketSettings(guild.id);
  let category = guild.channels.cache.find(
    (c) => c.name === settings.ticketCategoryName && c.type === ChannelType.GuildCategory
  );
  if (!category) {
    category = await guild.channels.create({
      name: settings.ticketCategoryName,
      type: ChannelType.GuildCategory,
    });
  }

  const channel = await guild.channels.create({
    name: `ticket-${user.username}`,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `ticket-owner:${user.id};status:open`,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      ...settings.ticketStaffRoleIds
        .filter((roleId) => /^\d{15,21}$/.test(roleId) && guild.roles.cache.has(roleId))
        .map((roleId) => ({
        id: roleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        })),
      { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
    ],
  });

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🎫 Ticket abierto')
    .setDescription(
      `¡Hola ${user}! Un miembro del staff te atenderá pronto.\n\n` +
        (motivo ? `**Motivo:** ${motivo}\n\n` : '') +
        'Describe tu problema con el mayor detalle posible mientras esperas.'
    )
    .setTimestamp();

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('reclamar_ticket').setLabel('Reclamar').setStyle(ButtonStyle.Primary).setEmoji('👤'),
    new ButtonBuilder().setCustomId('cerrar_ticket').setLabel('Cerrar Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
  );

  await channel.send({ content: settings.ticketPing, embeds: [embed], components: [buttons] });
  createTicket({ guildId: guild.id, channelId: channel.id, ownerId: user.id, reason: motivo });
  return channel;
}

module.exports = { createTicketChannel, findUserTicket, getTicketOwnerId, saveTranscript };
