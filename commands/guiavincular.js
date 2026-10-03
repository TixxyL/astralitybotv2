const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePermission } = require('../utils/permissions');
const { baseEmbed } = require('../utils/embeds');

// Publica en el canal la guía para vincular la cuenta de Minecraft con
// Discord (nLogin). El bot de login es otro bot: se menciona con la opción
// "bot" para que los jugadores sepan a quién escribirle por privado.
module.exports = {
  data: new SlashCommandBuilder()
    .setName('guiavincular')
    .setDescription('Envía la guía para vincular la cuenta de Minecraft con Discord')
    .addUserOption((option) => option.setName('bot').setDescription('Bot de login (nLogin) al que se le envía el código').setRequired(false))
    .addChannelOption((option) => option.setName('tickets').setDescription('Canal de tickets para pedir ayuda').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.Administrator))) return;

    const loginBot = interaction.options.getUser('bot');
    const ticketChannel = interaction.options.getChannel('tickets');
    const bot = loginBot ? `${loginBot}` : 'el bot de login';
    const ayuda = ticketChannel ? `abre un ticket en ${ticketChannel}` : 'abre un ticket';

    const embed = baseEmbed(interaction.guild)
      .setTitle('🔗 Vincula tu cuenta de Minecraft con Discord')
      .setDescription(
        'Protege tu cuenta de **Astrality** con la verificación en dos pasos. ' +
        'Con tu Discord vinculado, nadie podrá entrar a tu cuenta desde otro lugar sin que tú lo apruebes.'
      )
      .addFields(
        {
          name: '1️⃣ Activa tus mensajes privados',
          value:
            'Haz clic derecho en el ícono del servidor (en el celular, mantenlo presionado) → **Ajustes de privacidad** → ' +
            `activa **Mensajes directos**. Así ${bot} podrá escribirte.`,
        },
        {
          name: '2️⃣ Pide tu código en el juego',
          value:
            'Entra al servidor y escribe:\n```/discord add```' +
            'En el chat te saldrá **«Haz clic aquí para obtener el comando con el token»**. Haz clic y copia el comando que te da.',
        },
        {
          name: '3️⃣ Envíaselo al bot por privado',
          value:
            `Abre el chat privado con ${bot}, pega el comando y envíalo. ` +
            'Te responderá **«Discord vinculado»** y en el juego verás *«Has sido vinculado con la cuenta…»*. ¡Listo! ✅',
        },
        {
          name: '🛡️ ¿Qué cambia después?',
          value:
            `Si alguien entra a tu cuenta desde una conexión nueva, ${bot} te mandará un mensaje privado con un botón para **aprobar** el acceso.\n` +
            `Si no fuiste tú, **no lo apruebes**: cambia tu contraseña con \`/changepassword\` y ${ayuda}.`,
        },
        {
          name: '📌 Ten en cuenta',
          value:
            '• Puedes vincular hasta **2 cuentas** de Minecraft a un mismo Discord.\n' +
            '• Tu cuenta de Discord debe tener al menos **10 minutos** de creada.\n' +
            '• **Nunca compartas tu código.** El staff jamás te lo va a pedir.',
        },
        {
          name: '📱 ¿Juegas en Bedrock?',
          value:
            'En Bedrock vincular es **opcional**. Si quieres hacerlo, ten en cuenta que ahí no se puede hacer clic en el chat: ' +
            `si no puedes copiar el comando, ${ayuda} y te ayudamos.`,
        }
      );

    await interaction.reply({ embeds: [embed] });
  },
};
