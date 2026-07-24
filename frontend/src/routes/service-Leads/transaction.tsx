import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/service-Leads/transaction")({
  component: ServiceLeadTransactionLayout,
});

function ServiceLeadTransactionLayout() {
  return <Outlet />;
}