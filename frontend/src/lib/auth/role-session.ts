export type GadgetPeRole = "user" | "partner" | "admin";

const ACTIVE_ROLE_KEY = "gadgetpe_active_role";

const roleStorageKeys: Record<GadgetPeRole, string[]> = {
  user: [
    "gadgetpe_user_access_token",
    "gadgetpe_user_refresh_token",
    "gadgetpe_user_name",
    "gadgetpe_user_id",
  ],
  partner: [
    "gadgetpe_access_token",
    "gadgetpe_refresh_token",
    "gadgetpe_partner_access_token",
    "gadgetpe_partner_refresh_token",
    "gadgetpe_partner_name",
  ],
  admin: ["gadgetpe_admin_access_token"],
};

const tokenKeys: Record<GadgetPeRole, string[]> = {
  user: ["gadgetpe_user_access_token"],
  partner: ["gadgetpe_access_token", "gadgetpe_partner_access_token"],
  admin: ["gadgetpe_admin_access_token"],
};

function canUseStorage() {
  return typeof window !== "undefined";
}

export function hasRoleSession(role: GadgetPeRole) {
  if (!canUseStorage()) return false;
  return tokenKeys[role].some((key) => Boolean(window.localStorage.getItem(key)));
}

export function clearRoleSession(role: GadgetPeRole) {
  if (!canUseStorage()) return;
  roleStorageKeys[role].forEach((key) => window.localStorage.removeItem(key));
  if (window.localStorage.getItem(ACTIVE_ROLE_KEY) === role) {
    window.localStorage.removeItem(ACTIVE_ROLE_KEY);
  }
}

export function activateRoleSession(role: GadgetPeRole) {
  if (!canUseStorage()) return;
  (Object.keys(roleStorageKeys) as GadgetPeRole[]).forEach((candidateRole) => {
    if (candidateRole !== role) clearRoleSession(candidateRole);
  });
  window.localStorage.setItem(ACTIVE_ROLE_KEY, role);
}

export function getActiveRole(): GadgetPeRole | null {
  if (!canUseStorage()) return null;

  const storedRole = window.localStorage.getItem(ACTIVE_ROLE_KEY) as GadgetPeRole | null;
  if (storedRole && hasRoleSession(storedRole)) return storedRole;

  if (storedRole) window.localStorage.removeItem(ACTIVE_ROLE_KEY);

  const detectedRoles = (["user", "partner", "admin"] as GadgetPeRole[]).filter((role) => hasRoleSession(role));
  if (detectedRoles.length === 0) return null;

  const role = detectedRoles[detectedRoles.length - 1];
  window.localStorage.setItem(ACTIVE_ROLE_KEY, role);
  return role;
}
