//#region src/lib/auth/role-session.ts
var ACTIVE_ROLE_KEY = "gadgetpe_active_role";
var roleStorageKeys = {
	user: [
		"gadgetpe_user_access_token",
		"gadgetpe_user_refresh_token",
		"gadgetpe_user_name",
		"gadgetpe_user_id"
	],
	partner: [
		"gadgetpe_access_token",
		"gadgetpe_refresh_token",
		"gadgetpe_partner_access_token",
		"gadgetpe_partner_refresh_token",
		"gadgetpe_partner_name"
	],
	admin: ["gadgetpe_admin_access_token"]
};
var tokenKeys = {
	user: ["gadgetpe_user_access_token"],
	partner: ["gadgetpe_access_token", "gadgetpe_partner_access_token"],
	admin: ["gadgetpe_admin_access_token"]
};
function canUseStorage() {
	return typeof window !== "undefined";
}
function hasRoleSession(role) {
	if (!canUseStorage()) return false;
	return tokenKeys[role].some((key) => Boolean(window.localStorage.getItem(key)));
}
function clearRoleSession(role) {
	if (!canUseStorage()) return;
	roleStorageKeys[role].forEach((key) => window.localStorage.removeItem(key));
	if (window.localStorage.getItem(ACTIVE_ROLE_KEY) === role) window.localStorage.removeItem(ACTIVE_ROLE_KEY);
}
function activateRoleSession(role) {
	if (!canUseStorage()) return;
	Object.keys(roleStorageKeys).forEach((candidateRole) => {
		if (candidateRole !== role) clearRoleSession(candidateRole);
	});
	window.localStorage.setItem(ACTIVE_ROLE_KEY, role);
}
function getActiveRole() {
	if (!canUseStorage()) return null;
	const storedRole = window.localStorage.getItem(ACTIVE_ROLE_KEY);
	if (storedRole && hasRoleSession(storedRole)) return storedRole;
	if (storedRole) window.localStorage.removeItem(ACTIVE_ROLE_KEY);
	const detectedRoles = [
		"user",
		"partner",
		"admin"
	].filter((role) => hasRoleSession(role));
	if (detectedRoles.length === 0) return null;
	const role = detectedRoles[detectedRoles.length - 1];
	window.localStorage.setItem(ACTIVE_ROLE_KEY, role);
	return role;
}
//#endregion
export { clearRoleSession as n, getActiveRole as r, activateRoleSession as t };
