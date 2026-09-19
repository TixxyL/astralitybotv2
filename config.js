// Configuración centralizada del bot. Todo lo que antes estaba
// repetido/hardcodeado en cada comando (IDs, whitelist, colores) vive aquí.
require('dotenv').config();
const fs = require('fs');
const path = require('path');

function parseIdList(value, fallback) {
  if (!value) return fallback;
  return value.split(',').map((id) => id.trim()).filter(Boolean);
}

function parseWordList(value, fallback = []) {
  return [...new Set([...fallback, ...parseIdList(value, [])].map((word) => word.toLowerCase()))];
}

function parseRegexPatterns() {
  const fileNames = ['palabras_regex_antievasion.txt', 'palabras_regex_antievasion_set2.txt'];
  const patterns = [];

  for (const fileName of fileNames) {
    const filePath = path.join(__dirname, fileName);
    if (!fs.existsSync(filePath)) continue;

    const filePatterns = fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith('#') && line.includes('=>'))
      .map((line) => line.slice(line.indexOf('=>') + 2).trim());
    patterns.push(...filePatterns);
  }

  return [...new Set(patterns)].map((pattern) => {
    try {
      return new RegExp(`(?:^|[^a-z0-9])(?:${pattern})(?:$|[^a-z0-9])`, 'i');
    } catch (error) {
      console.error('[AUTOMOD] Regex inválida ignorada:', pattern, error.message);
      return null;
    }
  }).filter(Boolean);
}

module.exports = {
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID || '945922802257645630',
  // Si se define GUILD_ID, los comandos se registran solo en ese servidor
  // (se actualizan al instante). Si se deja vacío, se registran de forma
  // global (pueden tardar hasta 1 hora en propagarse).
  guildId: process.env.GUILD_ID || '',

  // Canal donde se publican todos los logs (mensajes borrados/editados,
  // acciones de moderación, entradas/salidas de miembros).
  logChannelId: process.env.LOG_CHANNEL_ID || '1530464190928650291',

  // Usuarios que siempre tienen acceso a comandos de moderación/admin,
  // sin importar sus permisos de rol en el servidor.
  adminIds: parseIdList(process.env.ADMIN_IDS, ['726088024428904499', '1143305402994413739']),

  // Mención que se publica al crear un ticket nuevo (usuario o rol staff).
  ticketPing: process.env.TICKET_PING || '<@1530063998370975888>',
  ticketCategoryName: process.env.TICKET_CATEGORY_NAME || 'TICKETS',
  ticketStaffRoleIds: parseIdList(process.env.TICKET_STAFF_ROLE_IDS, []),
  defaultGuildSettings: {
    logChannelId: process.env.LOG_CHANNEL_ID || '1530464190928650291',
    ticketCategoryName: process.env.TICKET_CATEGORY_NAME || 'TICKETS',
    ticketPing: process.env.TICKET_PING || '<@1530063998370975888>',
    ticketStaffRoleIds: parseIdList(process.env.TICKET_STAFF_ROLE_IDS, []),
    minecraft: {
      host: process.env.SERVER_IP || 'astrality.net',
      port: Number(process.env.SERVER_PORT) || 25565,
    },
  },

  automod: {
    enabled: process.env.AUTOMOD_ENABLED !== 'false',
    blockLinks: process.env.AUTOMOD_BLOCK_LINKS !== 'false',
    maxMessages: Number(process.env.AUTOMOD_MAX_MESSAGES) || 5,
    intervalMs: Number(process.env.AUTOMOD_INTERVAL_MS) || 7000,
    timeoutMinutes: Number(process.env.AUTOMOD_TIMEOUT_MINUTES) || 5,
    allowedDomains: parseIdList(process.env.AUTOMOD_ALLOWED_DOMAINS, []),
    blockedWords: parseWordList(process.env.AUTOMOD_BLOCKED_WORDS, ['puta', 'puto', 'mierda', 'cono', 'cabron', 'pendejo', 'maricon']),
    blockedPatterns: parseRegexPatterns(),
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    maxPromptLength: Number(process.env.GEMINI_MAX_PROMPT_LENGTH) || 2000,
    maxOutputTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS) || 700,
    cooldownMs: Number(process.env.GEMINI_COOLDOWN_MS) || 10000,
  },

  // Datos del servidor de Minecraft para /ip.
  serverIp: process.env.SERVER_IP || 'astrality.net',
  serverPort: process.env.SERVER_PORT || '25565',
  serverVersion: process.env.SERVER_VERSION || '1.20.x - 1.21.x (Java y Bedrock)',

  // Paleta de embeds - un solo lugar para mantener el look consistente.
  colors: {
    primary: 0x8b5cf6,
    success: 0x57f287,
    danger: 0xed4245,
    warning: 0xfee75c,
  },

  brand: {
    name: 'Astrality Network',
  },
};
