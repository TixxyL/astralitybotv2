// Sistema central de logs: mensajes borrados/editados, acciones de
// moderación y entradas/salidas de miembros. Todo se publica como embeds
// consistentes en config.logChannelId.
const fs = require('fs');
const https = require('https');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { getGuildSettings, addModerationLog } = require('./database');

const ATTACHMENTS_DIR = path.join(__dirname, '..', 'data', 'deleted-attachments');

function getLogChannel(guild) {
  if (!guild) return null;
  const settings = getGuildSettings(guild.id, config.defaultGuildSettings);
  return guild.channels.cache.get(settings.logChannelId) || null;
}

function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(filePath);
        });
      })
      .on('error', (err) => {
        fs.unlink(filePath, () => {});
        reject(err);
      });
  });
}

async function logMessageDelete(message, client) {
  if (!message.guild || !message.author || message.author.bot) return;
  const logChannel = getLogChannel(message.guild);
  if (!logChannel) return;

  const files = [];
  const savedImages = [];
  fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });

  if (message.attachments.size > 0) {
    for (const attachment of message.attachments.values()) {
      if (attachment.contentType && attachment.contentType.startsWith('image/')) {
        try {
          const ext = attachment.name.split('.').pop();
          const fileName = `${message.id}_${attachment.id}.${ext}`;
          const filePath = path.join(ATTACHMENTS_DIR, fileName);
          await downloadFile(attachment.url, filePath);
          savedImages.push(fileName);
        } catch (err) {
          console.error('[LOG ERROR] No se pudo descargar la imagen adjunta:', err);
        }
      } else {
        files.push(attachment.url);
      }
    }
  }

  const embed = new EmbedBuilder()
    .setColor(config.colors.danger)
    .setAuthor({ name: `${message.author.tag} (${message.author.id})`, iconURL: message.author.displayAvatarURL() })
    .setDescription(
      `🗑️ **Mensaje eliminado** en ${message.channel}\n\n` +
        `**Contenido:**\n${message.content ? message.content.slice(0, 1800) : '*Sin contenido de texto*'}` +
        (savedImages.length ? `\n\n**🖼️ Imágenes guardadas:** ${savedImages.map((f) => `\`${f}\``).join(', ')}` : '') +
        (files.length ? `\n\n**📎 Otros adjuntos:**\n${files.join('\n')}` : '')
    )
    .setFooter({ text: `ID del mensaje: ${message.id}` })
    .setTimestamp();

  await logChannel.send({ embeds: [embed] }).catch((err) => console.error('[LOG ERROR] messageDelete:', err));
}

async function logMessageEdit(oldMessage, newMessage, client) {
  if (!oldMessage.guild || !oldMessage.author || oldMessage.author.bot) return;
  if (oldMessage.content === newMessage.content) return;
  const logChannel = getLogChannel(oldMessage.guild);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setColor(config.colors.warning)
    .setAuthor({ name: `${oldMessage.author.tag} (${oldMessage.author.id})`, iconURL: oldMessage.author.displayAvatarURL() })
    .setDescription(`✏️ **Mensaje editado** en ${oldMessage.channel} — [Ir al mensaje](${newMessage.url})`)
    .addFields(
      { name: 'Antes', value: oldMessage.content ? oldMessage.content.slice(0, 1000) : '*Sin contenido*' },
      { name: 'Después', value: newMessage.content ? newMessage.content.slice(0, 1000) : '*Sin contenido*' }
    )
    .setFooter({ text: `ID del mensaje: ${oldMessage.id}` })
    .setTimestamp();

  await logChannel.send({ embeds: [embed] }).catch((err) => console.error('[LOG ERROR] messageUpdate:', err));
}

const ACTION_LABELS = {
  ban: { emoji: '🔨', label: 'Baneo', color: config.colors.danger },
  unban: { emoji: '🔓', label: 'Desbaneo', color: config.colors.success },
  kick: { emoji: '👢', label: 'Expulsión', color: config.colors.danger },
  timeout: { emoji: '🔇', label: 'Timeout', color: config.colors.warning },
  untimeout: { emoji: '🔊', label: 'Timeout removido', color: config.colors.success },
  warn: { emoji: '⚠️', label: 'Advertencia', color: config.colors.warning },
  clearwarns: { emoji: '🧾', label: 'Advertencias limpiadas', color: config.colors.success },
  clear: { emoji: '🧹', label: 'Limpieza de mensajes', color: config.colors.primary },
  lock: { emoji: '🔒', label: 'Canal bloqueado', color: config.colors.warning },
  unlock: { emoji: '🔓', label: 'Canal desbloqueado', color: config.colors.success },
  slowmode: { emoji: '🐢', label: 'Modo lento', color: config.colors.warning },
  shutdown: { emoji: '🛑', label: 'Apagado del bot', color: config.colors.danger },
};

async function logModAction({ guild, action, moderator, target, reason, extra }, client) {
  addModerationLog({
    guildId: guild.id,
    action,
    moderatorId: moderator.id,
    targetId: target?.id,
    reason,
    extra,
  });
  const logChannel = getLogChannel(guild);
  if (!logChannel) return;
  const meta = ACTION_LABELS[action] || { emoji: '🛡️', label: action, color: config.colors.primary };

  const embed = new EmbedBuilder()
    .setColor(meta.color)
    .setTitle(`${meta.emoji} ${meta.label}`)
    .addFields({ name: 'Moderador', value: `<@${moderator.id}> (${moderator.tag || moderator.id})`, inline: true });

  if (target) {
    embed.addFields({ name: 'Usuario', value: `<@${target.id}> (${target.tag || target.id})`, inline: true });
  }
  if (reason) {
    embed.addFields({ name: 'Razón', value: reason, inline: false });
  }
  if (extra) {
    embed.addFields({ name: 'Detalles', value: extra, inline: false });
  }
  embed.setTimestamp();

  await logChannel.send({ embeds: [embed] }).catch((err) => console.error('[LOG ERROR] modAction:', err));
}

async function logMemberJoin(member, client) {
  const logChannel = getLogChannel(member.guild);
  if (!logChannel) return;
  const accountAgeDays = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);
  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setAuthor({ name: `${member.user.tag} (${member.user.id})`, iconURL: member.user.displayAvatarURL() })
    .setDescription(
      `📥 **Miembro nuevo** — ${member}\n\n` +
        `**Cuenta creada:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R> (hace ${accountAgeDays} días)\n` +
        `**Miembros totales:** ${member.guild.memberCount}`
    )
    .setTimestamp();
  if (accountAgeDays < 3) {
    embed.addFields({ name: '⚠️ Cuenta reciente', value: 'Esta cuenta tiene menos de 3 días de antigüedad.' });
  }
  await logChannel.send({ embeds: [embed] }).catch((err) => console.error('[LOG ERROR] memberJoin:', err));
}

async function logMemberLeave(member, client) {
  const logChannel = getLogChannel(member.guild);
  if (!logChannel) return;
  const embed = new EmbedBuilder()
    .setColor(config.colors.danger)
    .setAuthor({ name: `${member.user.tag} (${member.user.id})`, iconURL: member.user.displayAvatarURL() })
    .setDescription(`📤 **Miembro salió** — ${member.user.tag}\n\n**Miembros totales:** ${member.guild.memberCount}`)
    .setTimestamp();
  await logChannel.send({ embeds: [embed] }).catch((err) => console.error('[LOG ERROR] memberLeave:', err));
}

module.exports = {
  logMessageDelete,
  logMessageEdit,
  logModAction,
  logMemberJoin,
  logMemberLeave,
};
