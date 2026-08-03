import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { clearRoleSession, getActiveRole } from "../../lib/auth/role-session";
import { listPartnerServiceLeads, type PartnerLead } from "../../lib/api/gadgetpe-client";

export const Route = createFileRoute("/service-Leads/")({
  component: ServiceLeadsPage,
});

const PAGE_SIZE = 5;
const PARTNER_SCOPE_KEY = "gadgetpe_partner_scope";
const PARTNER_TOKEN_KEY = "gadgetpe_partner_access_token";
const LEGACY_PARTNER_TOKEN_KEY = "gadgetpe_access_token";

function canUseStorage() {
  return typeof window !== "undefined";
}

function getStored(key: string) {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(key);
}

function getPartnerToken() {
  return getStored(PARTNER_TOKEN_KEY) || getStored(LEGACY_PARTNER_TOKEN_KEY);
}

function forcePartnerLoginRedirect() {
  if (!canUseStorage()) return;
  clearRoleSession("partner");
  window.localStorage.removeItem(PARTNER_SCOPE_KEY);
  window.location.assign("/partner");
}

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function ServiceLeadsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [leads, setLeads] = useState<PartnerLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [scopePincode, setScopePincode] = useState("");

  useEffect(() => {
    const activeRole = getActiveRole();
    if (activeRole === "user") {
      void navigate({ to: "/user" });
      return;
    }

    if (activeRole === "admin") {
      void navigate({ to: "/admin" });
      return;
    }

    const raw = getStored(PARTNER_SCOPE_KEY);
    const token = getPartnerToken();
    if (!raw) {
      toast.error("Select an ACTIVE pincode on Partner page first.");
      window.location.href = "/partner-page";
      return;
    }

    if (!token) {
      toast.error("Please login as partner first.");
      forcePartnerLoginRedirect();
      return;
    }

    void (async () => {
      try {
        const scope = JSON.parse(raw) as { serviceabilityStatus?: string; pincode?: string };
        if (scope.serviceabilityStatus !== "ACTIVE") {
          toast.error("Current pincode is not ACTIVE. Service Leads are blocked.");
          window.location.href = "/partner-page";
          return;
        }

        setScopePincode(scope.pincode || "");
      } catch {
        toast.error("Invalid tenant scope. Please select pincode again.");
        window.location.href = "/partner-page";
      }
    })();
  }, [navigate]);

  useEffect(() => {
    const token = getPartnerToken();
    if (!token) {
      forcePartnerLoginRedirect();
      return;
    }
    if (!scopePincode) return;
    setLoading(true);
    listPartnerServiceLeads(token, {
      pincode: scopePincode,
      status: "ACCEPTED",
      limit: 100,
    })
      .then((result) => setLeads(result.rows))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Unable to load service leads."))
      .finally(() => setLoading(false));
  }, [scopePincode]);

  const filtered = useMemo(() => leads, [leads]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  return (
    <main className="partner-simple-page service-leads-page">
      <div className="partner-subpage-topbar">
        <Link to="/partner-page" className="partner-subpage-hamburger" aria-label="Open partner navigation">
          ☰
        </Link>
        <Link to="/partner-page" className="partner-subpage-logo" aria-label="Go to partner dashboard">
          <img src="/logo.png" alt="GadgetPe" />
        </Link>
      </div>
      <section className="partner-simple-card partner-lead-card service-leads-card">
        <h1>Service Leads</h1>
        <p>Accepted leads ready for pickup start.</p>

        <p className="lead-hint service-leads-hint">Pincode: {scopePincode || "-"} | Accepted Leads: {filtered.length}</p>

        <div className="lead-table-wrap service-leads-table-wrap">
          <table className="lead-table">
            <thead>
              <tr>
                <th>Phone Name</th>
                <th>Price Listed</th>
                <th>Area</th>
                <th>Pincode</th>
                <th>Pickup Time Zone</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? rows.map((row, idx) => (
                  <tr key={`${row.id}-${idx}`}>
                    <td data-label="Phone Name">{row.selectedModel.modelName}</td>
                    <td data-label="Price Listed">Rs. {formatInr(row.quote?.sellingPrice ?? row.selectedModel.listedPrice ?? 0)}</td>
                    <td data-label="Area">{row.seller.city || row.city || "-"}</td>
                    <td data-label="Pincode">{row.pincode}</td>
                    <td data-label="Pickup Time Zone">{row.pickupSchedule?.primaryTime || "-"}</td>
                    <td data-label="Action" className="service-leads-action-cell">
                      <div className="lead-decision-row service-leads-action-row">
                        <Link to="/service-Leads/transaction" search={{ leadId: row.id }} className="lead-view-btn lead-view-link">Start Pickup</Link>
                      </div>
                    </td>
                  </tr>
              )) : (
                <tr><td colSpan={6}>{loading ? "Loading service leads..." : "No service leads available."}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="lead-pagination service-leads-pagination" aria-label="Service leads pagination">
          <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={safePage === 1}>Prev</button>
          <span>Page {safePage} of {totalPages}</span>
          <button type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={safePage === totalPages}>Next</button>
        </div>

        <Link to="/partner-page" className="partner-simple-link">Back to Partner Page</Link>
      </section>
    </main>
  );
}
