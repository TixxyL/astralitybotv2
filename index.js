const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('./config');
const { errorEmbed } = require('./utils/embeds');
const { isTicketStaff } = require('./utils/permissions');
const { createTicketChannel, findUserTicket, getTicketOwnerId, saveTranscript } = require('./utils/tickets');
const { claimTicket, closeTicket, getTicket, setFirstStaff, addTicketRating, getAutomodSettings, saveAutomodSettings, addAutomodStrike, resetAutomodStrikes, getGuildSettings, closeDatabase } = require('./utils/database');
const { logMessageDelete, logMessageEdit, logMemberJoin, logMemberLeave } = require('./utils/logger');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Carga recursiva de comandos: recorre commands/ (y subcarpetas, si las
// agregas en el futuro) y registra cada uno en la Collection.
function loadCommands(dir) {
  const commands = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      commands.push(...loadCommands(fullPath));
    } else if (entry.name.endsWith('.js')) {
      commands.push(require(fullPath));
    }
  }
  return commands;
}

client.commands = new Collection();
for (const command of loadCommands(path.join(__dirname, 'commands'))) {
  client.commands.set(command.data.name, command);
}

const spamTracker = new Map();

function getLogChannelId(guildId) {
  return getGuildSettings(guildId, config.defaultGuildSettings).logChannelId;
}

function getTranscriptChannelId(guildId) {
  const settings = getGuildSettings(guildId, config.defaultGuildSettings);
  return settings.transcriptChannelId || settings.logChannelId;
}

function isStaffMember(member, guildId) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.ManageChannels)) return true;
  const settings = getGuildSettings(guildId, config.defaultGuildSettings);
  return settings.ticketStaffRoleIds?.some((roleId) => member.roles.cache.has(roleId)) || false;
}

function ratingButtons(channelId) {
  return new ActionRowBuilder().addComponents(
    [1, 2, 3, 4, 5].map((rating) => new ButtonBuilder()
      .setCustomId(`ticket_rating:${channelId}:${rating}`)
      .setLabel(`${rating} ⭐`)
      .setStyle(rating >= 4 ? ButtonStyle.Success : rating >= 3 ? ButtonStyle.Primary : ButtonStyle.Danger))
  );
}

function getGuildAutomodSettings(guildId) {
  if (!client.automodSettings) client.automodSettings = new Map();
  if (!client.automodSettings.has(guildId)) {
    client.automodSettings.set(guildId, getAutomodSettings(guildId, config.automod));
  }
  return client.automodSettings.get(guildId);
}

function normalizeText(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[480@]/g, (character) => ({ 4: 'a', '@': 'a', 8: 'b', 0: 'o' })[character] || character);
}

function containsBlockedWord(content, blockedWords, blockedPatterns) {
  const normalized = normalizeText(content);
  if (blockedPatterns.some((pattern) => pattern.test(normalized))) return 'regex';

  return blockedWords.find((word) => {
    const normalizedWord = normalizeText(word).replace(/[^a-z0-9]/g, '');
    if (!normalizedWord) return false;
    const letters = [...normalizedWord].map((character) => `${character}+`).join('[^a-z0-9]*');
    return new RegExp(`(?:^|[^a-z0-9])${letters}(?:$|[^a-z0-9])`, 'i').test(normalized);
  });
}

function getLinkDomain(content) {
  const match = content.match(/(?:https?:\/\/|www\.|discord\.gg\/|discord\.com\/invite\/)[^\s]+/i);
  if (!match) return null;
  try {
    const url = new URL(match[0].startsWith('http') ? match[0] : `https://${match[0]}`);
    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return 'enlace';
  }
}

client.once('clientReady', () => {
  console.log(`✅ Bot listo como ${client.user.tag}`);
  client.automodSettings = new Map();

  function updatePresence() {
    const guild = client.guilds.cache.first();
    let userCount = 0;
    let ticketCount = 0;
    if (guild) {
      userCount = guild.memberCount;
      ticketCount = guild.channels.cache.filter((c) => c.name && c.name.startsWith('ticket-')).size;
    }
    const presences = [
      { name: `Viendo a ${userCount} usuarios`, type: 3 },
      { name: `tickets (${ticketCount})`, type: 2 },
      { name: 'Astrality Network', type: 0 },
    ];
    let i = 0;
    setInterval(() => {
      client.user.setPresence({ activities: [presences[i % presences.length]], status: 'online' });
      i++;
    }, 15000);
  }
  updatePresence();
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(error);
      const payload = { embeds: [errorEmbed(interaction.guild, 'Error', 'Hubo un error al ejecutar este comando.')], ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
    return;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_motivo') {
    if (!client.ticketMotivos) client.ticketMotivos = {};
    client.ticketMotivos[interaction.user.id] = interaction.values[0];
    await interaction.reply({ content: `Motivo seleccionado: **${interaction.values[0]}**. Ahora pulsa "Crear Ticket".`, ephemeral: true });
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith('ticket_rating:')) {
    const [, channelId, ratingValue] = interaction.customId.split(':');
    const ticket = getTicket(channelId);
    const rating = Number(ratingValue);
    if (!ticket || ticket.ownerId !== interaction.user.id || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      await interaction.reply({ content: '❌ Esta encuesta no está disponible para ti.', ephemeral: true });
      return;
    }

    const saved = addTicketRating({
      ticketId: ticket.id,
      guildId: ticket.guildId,
      channelId: ticket.channelId,
      ownerId: ticket.ownerId,
      staffId: ticket.firstStaffId,
      rating,
    });
    if (!saved) {
      await interaction.reply({ content: 'Esta encuesta ya fue respondida. Gracias.', ephemeral: true });
      return;
    }

    const guild = await client.guilds.fetch(ticket.guildId).catch(() => null);
    const transcriptChannel = guild ? await guild.channels.fetch(getTranscriptChannelId(ticket.guildId)).catch(() => null) : null;
    if (transcriptChannel) {
      await transcriptChannel.send({ embeds: [new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('⭐ Calificación de ticket')
        .setDescription(`El usuario <@${ticket.ownerId}> calificó el ticket <#${ticket.channelId}>.`)
        .addFields(
          { name: 'Calificación', value: `${'⭐'.repeat(rating)} (${rating}/5)`, inline: true },
          { name: 'Staff evaluado', value: ticket.firstStaffId ? `<@${ticket.firstStaffId}>` : 'No identificado', inline: true },
        )
        .setTimestamp()] }).catch(() => {});
    }
    await interaction.update({ content: `Gracias por tu valoración: ${'⭐'.repeat(rating)}`, components: [] });
    return;
  }

  if (interaction.isButton() && interaction.customId === 'crear_ticket') {
    const motivo = client.ticketMotivos?.[interaction.user.id] || null;
    const existing = findUserTicket(interaction.guild, interaction.user.id);
    if (existing) {
      await interaction.reply({ content: `Ya tienes un ticket abierto: ${existing}`, ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    const channel = await createTicketChannel(interaction.guild, interaction.user, motivo);
    await interaction.editReply({ content: `Tu ticket ha sido creado: ${channel}` });
  }

  if (interaction.isButton() && interaction.customId === 'reclamar_ticket') {
    if (!isTicketStaff(interaction)) {
      return interaction.reply({ content: '❌ Solo staff puede reclamar tickets.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.channel;

    await channel.setTopic(`${channel.topic || ''};claimed-by:${interaction.user.id}`);
    claimTicket(channel.id, interaction.user.id);

    const claimEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🛠️ Ticket reclamado')
      .setDescription(`**${interaction.user}** ha reclamado este ticket.`);

    await channel.send({ embeds: [claimEmbed] });
    await interaction.editReply({ content: '✅ Ticket reclamado correctamente.' });
    return;
  }

  if (interaction.isButton() && interaction.customId === 'cerrar_ticket') {
    if (!isTicketStaff(interaction)) {
      return interaction.reply({ content: '❌ Solo staff puede cerrar tickets.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.channel;

    const { fileName, filePath } = await saveTranscript(channel, interaction.user);

    const transcriptChannel = await interaction.guild.channels.fetch(getTranscriptChannelId(interaction.guild.id)).catch(() => null);
    if (transcriptChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor('#ffa500')
        .setTitle('🔒 Ticket cerrado')
        .setDescription(`**Canal:** ${channel}\n**Cerrado por:** ${interaction.user}\n**Archivo:** \`${fileName}\``)
        .setTimestamp();

      await transcriptChannel.send({ embeds: [logEmbed], files: [filePath] }).catch(() => {});
    }

    const ownerId = getTicketOwnerId(channel);
    if (ownerId) {
      await channel.permissionOverwrites.edit(ownerId, {
        ViewChannel: false,
        SendMessages: false,
      });
    }

    await channel.setTopic(`${channel.topic || ''};status:closed`);
    closeTicket(channel.id, interaction.user.id);

    if (ownerId) {
      const owner = await client.users.fetch(ownerId).catch(() => null);
      if (owner) {
        await owner.send({ embeds: [new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle('⭐ ¿Cómo fue tu atención?')
          .setDescription('Tu ticket fue cerrado. Califica la atención recibida seleccionando de 1 a 5 estrellas.')
          .setFooter({ text: 'Solo puedes responder esta encuesta una vez.' })], components: [ratingButtons(channel.id)] }).catch(() => {});
      }
    }

    // Mostrar botón de eliminar permanente
    const deleteBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('eliminar_ticket').setLabel('Eliminar Permanente').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
    );

    const closeEmbed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('🔒 Ticket cerrado')
      .setDescription(`Ticket cerrado por **${interaction.user}**.\n\n✅ Transcripción guardada y enviada a logs.\n\n⚠️ El usuario ya no puede ver este canal.`);

    await channel.send({ embeds: [closeEmbed], components: [deleteBtn] });
    await interaction.editReply({ content: '✅ Ticket cerrado. Transcripción enviada a logs.' });
  }

  if (interaction.isButton() && interaction.customId === 'eliminar_ticket') {
    if (!isTicketStaff(interaction)) {
      return interaction.reply({ content: '❌ Solo staff puede eliminar tickets.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.channel;

    setTimeout(() => {
      channel.delete().catch(() => {});
    }, 2000);

    await interaction.editReply({ content: '✅ Ticket eliminado.' });
  }
});

client.on('messageDelete', (message) => logMessageDelete(message, client));
client.on('messageUpdate', (oldMessage, newMessage) => logMessageEdit(oldMessage, newMessage, client));
client.on('guildMemberAdd', (member) => logMemberJoin(member, client));
client.on('guildMemberRemove', (member) => logMemberLeave(member, client));
client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;
  if (message.channel.topic?.includes('ticket-owner:') && isStaffMember(message.member, message.guild.id)) {
    setFirstStaff(message.channel.id, message.author.id);
  }
  if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return;

  const automod = getGuildAutomodSettings(message.guild.id);
  if (!automod.enabled) return;

  const blockedWord = containsBlockedWord(message.content, config.automod.blockedWords, config.automod.blockedPatterns);
  const linkDomain = getLinkDomain(message.content);
  const hasLink = automod.blockLinks && linkDomain && !automod.allowedDomains.some((domain) => linkDomain === domain || linkDomain.endsWith(`.${domain}`));
  const now = Date.now();
  const recent = (spamTracker.get(message.author.id) || []).filter((time) => now - time < config.automod.intervalMs);
  recent.push(now);
  spamTracker.set(message.author.id, recent);

  if (!blockedWord && !hasLink && recent.length < config.automod.maxMessages) return;

  const strikes = addAutomodStrike(message.guild.id, message.author.id);
  await message.delete().catch(() => {});
  const reason = hasLink ? `Enlace no permitido (${linkDomain})` : blockedWord ? 'Contenido obsceno' : 'Anti-spam';
  const timeoutMinutes = strikes === 1 ? 0 : Math.min(automod.timeoutMinutes * (strikes >= 3 ? 3 : 1), 1440);
  if (timeoutMinutes > 0 && message.member?.moderatable) {
    await message.member.timeout(timeoutMinutes * 60 * 1000, reason).catch(() => {});
  }
  const logChannel = message.guild.channels.cache.get(getLogChannelId(message.guild.id));
  if (logChannel) {
    await logChannel.send({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('🛡️ AutoModeración')
        .setDescription(`Se eliminó un mensaje de ${message.author} en ${message.channel}.`)
        .addFields(
          { name: 'Motivo', value: reason },
          { name: 'Infracción', value: `#${strikes}` },
          { name: 'Acción', value: timeoutMinutes ? `Timeout de ${timeoutMinutes} minutos` : 'Advertencia' },
          { name: 'Contenido', value: message.content.slice(0, 1000) || '[sin texto]' }
        )
        .setTimestamp()],
    }).catch(() => {});
  }
  spamTracker.delete(message.author.id);
});

setInterval(() => {
  const cutoff = Date.now() - config.automod.intervalMs;
  for (const [userId, times] of spamTracker) {
    const active = times.filter((time) => time > cutoff);
    if (active.length) spamTracker.set(userId, active);
    else spamTracker.delete(userId);
  }
}, 60000).unref();

client.on('error', (error) => {
  console.error('Discord client error:', error);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`🛑 Cerrando bot por ${signal}...`);
  client.destroy();
  closeDatabase();
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (error) => console.error('Unhandled promise rejection:', error));
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  shutdown('uncaughtException');
});

client.login(config.token).catch((error) => {
  console.error('No se pudo conectar al cliente de Discord:', error?.message || error);
});

if (process.env.WEB_ENABLED === 'true') {
  require('./web/server');
}
