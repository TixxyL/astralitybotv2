// Registra los comandos slash (/) en Discord. Ejecutar con `node deploy-commands.js`
// cada vez que agregues o cambies un comando.
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('./config');

function loadCommandData(dir) {
  const data = new Map();
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const command of loadCommandData(fullPath)) data.set(command.name, command);
    } else if (entry.name.endsWith('.js')) {
      const command = require(fullPath).data.toJSON();
      data.set(command.name, command);
    }
  }
  return [...data.values()];
}

const commands = loadCommandData(path.join(__dirname, 'commands'));
const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log(`Registrando ${commands.length} comandos (/) ...`);
    const route = config.guildId
      ? Routes.applicationGuildCommands(config.clientId, config.guildId)
      : Routes.applicationCommands(config.clientId);
    await rest.put(route, { body: commands });
    console.log(`Comandos registrados correctamente ${config.guildId ? `en el servidor ${config.guildId}` : 'de forma global'}.`);
  } catch (error) {
    console.error(error);
  }
})();
