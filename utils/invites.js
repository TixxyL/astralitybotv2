const { replaceInviteSnapshots, recordInviteUse, getInviteCount, getInvitedMembers } = require('./database');

const inviteCache = new Map();
const guildLocks = new Map();

function getSnapshot(invite) {
  return {
    code: invite.code,
    uses: invite.uses || 0,
    inviterId: invite.inviter?.id || null,
  };
}

async function fetchGuildInvites(guild) {
  const invites = await guild.invites.fetch();
  return [...invites.values()].map(getSnapshot);
}

async function cacheGuildInvites(guild) {
  const snapshots = await fetchGuildInvites(guild);
  inviteCache.set(guild.id, new Map(snapshots.map((invite) => [invite.code, invite])));
  replaceInviteSnapshots(guild.id, snapshots);
}

async function initializeInviteTracking(client) {
  await Promise.all(client.guilds.cache.map(async (guild) => {
    try {
      await cacheGuildInvites(guild);
    } catch (error) {
      console.error(`[INVITES] No se pudieron cargar las invitaciones de ${guild.name}:`, error.message);
    }
  }));
}

function handleInviteCreate(invite) {
  const current = inviteCache.get(invite.guild.id) || new Map();
  current.set(invite.code, getSnapshot(invite));
  inviteCache.set(invite.guild.id, current);
}

function handleInviteDelete(invite) {
  inviteCache.get(invite.guild.id)?.delete(invite.code);
}

async function detectUsedInvite(guild) {
  const hasPreviousSnapshot = inviteCache.has(guild.id);
  const previous = inviteCache.get(guild.id) || new Map();
  const currentSnapshots = await fetchGuildInvites(guild);
  const current = new Map(currentSnapshots.map((invite) => [invite.code, invite]));
  inviteCache.set(guild.id, current);
  replaceInviteSnapshots(guild.id, currentSnapshots);

  if (!hasPreviousSnapshot) return null;

  return currentSnapshots
    .filter((invite) => invite.uses > (previous.get(invite.code)?.uses || 0))
    .sort((a, b) => b.uses - a.uses)[0] || null;
}

async function processMemberJoin(member) {
  const guildId = member.guild.id;
  const previous = guildLocks.get(guildId) || Promise.resolve();
  const current = previous.then(async () => {
    try {
      const usedInvite = await detectUsedInvite(member.guild);
      if (!usedInvite?.inviterId || usedInvite.inviterId === member.id) return null;
      recordInviteUse({
        guildId,
        memberId: member.id,
        inviterId: usedInvite.inviterId,
        inviteCode: usedInvite.code,
      });
      return { ...usedInvite, total: getInviteCount(guildId, usedInvite.inviterId) };
    } catch (error) {
      console.error(`[INVITES] No se pudo detectar el invitador de ${member.user.tag}:`, error.message);
      return null;
    }
  });
  guildLocks.set(guildId, current.catch(() => {}));
  return current;
}

module.exports = {
  initializeInviteTracking,
  handleInviteCreate,
  handleInviteDelete,
  processMemberJoin,
  getInviteCount,
  getInvitedMembers,
};