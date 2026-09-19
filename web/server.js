const path = require('path');
const express = require('express');
const config = require('../config');
const { getGuildSettings, saveGuildSettings } = require('../utils/database');

const app = express();
const port = Number(process.env.WEB_PORT) || 3000;
const webToken = process.env.WEB_TOKEN;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function authenticated(request, response, next) {
  if (!webToken || request.get('x-api-key') !== webToken) {
    return response.status(401).json({ error: 'No autorizado' });
  }
  next();
}

function defaults() {
  return {
    ...config.defaultGuildSettings,
    minecraft: { ...config.defaultGuildSettings.minecraft },
  };
}

app.get('/api/health', (request, response) => response.json({ online: true, uptime: process.uptime() }));

app.get('/api/guild/:guildId/settings', authenticated, (request, response) => {
  response.json(getGuildSettings(request.params.guildId, defaults()));
});

app.put('/api/guild/:guildId/settings', authenticated, (request, response) => {
  const current = getGuildSettings(request.params.guildId, defaults());
  const incoming = request.body || {};
  const next = {
    ...current,
    logChannelId: typeof incoming.logChannelId === 'string' ? incoming.logChannelId : current.logChannelId,
    ticketCategoryName: typeof incoming.ticketCategoryName === 'string' ? incoming.ticketCategoryName.slice(0, 90) : current.ticketCategoryName,
    ticketPing: typeof incoming.ticketPing === 'string' ? incoming.ticketPing.slice(0, 200) : current.ticketPing,
    ticketStaffRoleIds: Array.isArray(incoming.ticketStaffRoleIds) ? incoming.ticketStaffRoleIds.map(String).slice(0, 10) : current.ticketStaffRoleIds,
    minecraft: {
      host: typeof incoming.minecraft?.host === 'string' ? incoming.minecraft.host.slice(0, 255) : current.minecraft.host,
      port: Number.isInteger(incoming.minecraft?.port) ? incoming.minecraft.port : current.minecraft.port,
    },
  };
  saveGuildSettings(request.params.guildId, next);
  response.json(next);
});

app.listen(port, () => console.log(`Panel web disponible en el puerto ${port}`));
