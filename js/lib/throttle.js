const actionCooldowns = new Map();

const COOLDOWNS = {
  login: 2000,
  register: 5000,
  createDiscussion: 30000,
  addComment: 10000,
  createEvent: 60000,
  changeInfo: 10000,
  resetPassword: 10000,
  submitSurvey: 10000,
};

export function canPerformAction(action) {
  const key = `${action}`;
  const lastTime = actionCooldowns.get(key);
  const now = Date.now();
  const cooldown = COOLDOWNS[action] || 3000;

  if (lastTime && (now - lastTime) < cooldown) {
    const remaining = Math.ceil((cooldown - (now - lastTime)) / 1000);
    return { allowed: false, remaining };
  }

  return { allowed: true, remaining: 0 };
}

export function markActionPerformed(action) {
  const key = `${action}`;
  actionCooldowns.set(key, Date.now());
}

export function resetCooldown(action) {
  actionCooldowns.delete(action);
}

export function getCooldownMs(action) {
  return COOLDOWNS[action] || 3000;
}

const submitLocks = new Set();

export function withSubmitLock(id, fn) {
  if (submitLocks.has(id)) return;
  submitLocks.add(id);
  const unlock = () => submitLocks.delete(id);
  try {
    const result = fn(unlock);
    if (result && typeof result.then === 'function') {
      return result.then(
        (v) => { unlock(); return v; },
        (e) => { unlock(); throw e; }
      );
    }
    unlock();
    return result;
  } catch (e) {
    unlock();
    throw e;
  }
}
