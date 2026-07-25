import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
//#region src/routes/user.login.tsx
var $$splitComponentImporter = () => import("./user.login-COXUIHOV.js");
var Route = createFileRoute("/user/login")({
	validateSearch: (search) => ({ redirectTo: typeof search.redirectTo === "string" ? search.redirectTo : void 0 }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
