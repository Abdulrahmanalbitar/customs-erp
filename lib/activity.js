import { db } from './db';

export async function logActivity(user, action, entity, entityId, details) {
  try {
    await db.activityLog.create({
      data: { userName: user?.name || null, action, entity: entity || null, entityId: entityId || null, details: details || null },
    });
  } catch {
    // logging must never break the main action
  }
}
