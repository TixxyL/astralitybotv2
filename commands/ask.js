const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, errorEmbed } = require('../utils/embeds');
const config = require('../config');

const cooldowns = new Map();

async function requestGemini(endpoint, body) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.ok || ![429, 503].includes(response.status) || attempt === maxAttempts) return response;

    const retryAfter = Number(response.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1500 * attempt;
    await new Promise((resolve) => setTimeout(resolve, Math.min(waitMs, 5000)));
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Pregunta algo a la IA de Astrality')
    .addStringOption((option) => option.setName('pregunta').setDescription('Tu pregunta').setMaxLength(2000).setRequired(true)),

  async execute(interaction) {
    if (!config.gemini.apiKey) {
      await interaction.reply({ embeds: [errorEmbed(interaction.guild, 'IA no configurada', 'Falta `GEMINI_API_KEY` en el archivo `.env`.')] });
      return;
    }

    const now = Date.now();
    const lastRequest = cooldowns.get(interaction.user.id) || 0;
    if (now - lastRequest < config.gemini.cooldownMs) {
      const seconds = Math.ceil((config.gemini.cooldownMs - (now - lastRequest)) / 1000);
      await interaction.reply({ embeds: [errorEmbed(interaction.guild, 'Espera un momento', `Puedes volver a preguntar en **${seconds} segundos**.`)], ephemeral: true });
      return;
    }

    const question = interaction.options.getString('pregunta').trim().slice(0, config.gemini.maxPromptLength);
    cooldowns.set(interaction.user.id, now);
    await interaction.deferReply();

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.gemini.model)}:generateContent?key=${encodeURIComponent(config.gemini.apiKey)}`;
      const response = await requestGemini(endpoint, {
          systemInstruction: {
            parts: [{ text: 'Eres Astrality Assistant, un asistente útil para una comunidad de Discord. Responde en español, con claridad y sin inventar información. Si no sabes algo, dilo.' }],
          },
          contents: [{ role: 'user', parts: [{ text: question }] }],
          generationConfig: { maxOutputTokens: config.gemini.maxOutputTokens, temperature: 0.7 },
      });

      if (!response.ok) {
        const details = await response.text();
        console.error(`[GEMINI] ${response.status}: ${details.slice(0, 500)}`);
        const message = response.status === 429
          ? 'Se alcanzó el límite temporal de Gemini. Inténtalo más tarde.'
          : response.status === 503
            ? 'Gemini está saturado en este momento. Inténtalo nuevamente en unos segundos.'
            : 'Gemini no pudo responder. Revisa la clave y el modelo configurado.';
        await interaction.editReply({ embeds: [errorEmbed(interaction.guild, 'Error de IA', message)] });
        return;
      }

      const data = await response.json();
      const answer = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
      if (!answer) throw new Error('Gemini devolvió una respuesta vacía');

      const embed = baseEmbed(interaction.guild)
        .setTitle('✨ Astrality Assistant')
        .setDescription(answer.slice(0, 4096))
        .setFooter({ text: `Pregunta de ${interaction.user.tag}` });
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[GEMINI] Error:', error.message);
      await interaction.editReply({ embeds: [errorEmbed(interaction.guild, 'Error de IA', 'No se pudo conectar con Gemini. Inténtalo nuevamente.')] }).catch(() => {});
    }
  },
};