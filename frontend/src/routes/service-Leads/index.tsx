import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { clearRoleSession, getActiveRole } from "../../lib/auth/role-session";
import { getPartnerCoinBalance, listPartnerServiceLeads, type PartnerLead } from "../../lib/api/gadgetpe-client";

export const Route = createFileRoute("/service-Leads/")({
  component: ServiceLeadsPage,
});

const TIME_SLOTS = [
  "09:00 AM - 12:00 PM",
  "12:00 PM - 03:00 PM",
  "03:00 PM - 06:00 PM",
  "06:00 PM - 09:00 PM",
] as const;

const PAGE_SIZE = 5;
const PARTNER_SCOPE_KEY = "gadgetpe_partner_scope";
const PARTNER_TOKEN_KEY = "gadgetpe_partner_access_token";
const LEGACY_PARTNER_TOKEN_KEY = "gadgetpe_access_token";
const SERVICE_LEADS_DATE_KEY = "gadgetpe_service_leads_date";
const SERVICE_LEADS_TIME_KEY = "gadgetpe_service_leads_time";

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

function isTodayPickup(lead: PartnerLead, selectedDate: string) {
  const primary = lead.pickupSchedule?.primaryDate;
  return Boolean(primary && primary.slice(0, 10) === selectedDate);
}

function ServiceLeadsPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(() => getStored(SERVICE_LEADS_DATE_KEY) || new Date().toISOString().slice(0, 10));
  const [selectedTime, setSelectedTime] = useState(() => getStored(SERVICE_LEADS_TIME_KEY) || "All");
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

        const wallet = await getPartnerCoinBalance(token);
        if (wallet.balance <= 0) {
          toast.error("Wallet recharge is required to access Service Leads.");
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
      date: selectedDate,
      timeSlot: selectedTime,
      limit: 100,
    })
      .then((result) => setLeads(result.rows))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Unable to load service leads."))
      .finally(() => setLoading(false));
  }, [scopePincode, selectedDate, selectedTime]);

  useEffect(() => {
    if (!canUseStorage()) return;
    window.localStorage.setItem(SERVICE_LEADS_DATE_KEY, selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (!canUseStorage()) return;
    window.localStorage.setItem(SERVICE_LEADS_TIME_KEY, selectedTime);
  }, [selectedTime]);

  const filtered = useMemo(() => leads, [leads]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  return (
    <main className="partner-simple-page service-leads-page">
      <section className="partner-simple-card partner-lead-card service-leads-card">
        <h1>Service Leads</h1>
        <p>Start Today's Leads: only selected-date primary pickup leads are shown.</p>

        <div className="lead-booking-box service-leads-filter-box">
          <h3>Filter</h3>
          <div className="lead-booking-calendar service-leads-filter-row">
            <div className="service-leads-filter-field">
              <label htmlFor="service-date">Calendar</label>
              <input id="service-date" type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setPage(1); }} />
            </div>
            <div className="service-leads-filter-field">
              <label htmlFor="service-time">Time</label>
              <select id="service-time" value={selectedTime} onChange={(e) => { setSelectedTime(e.target.value); setPage(1); }} className="lead-select">
                <option value="All">All</option>
                {TIME_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
              </select>
            </div>
          </div>
        </div>

        <p className="lead-hint service-leads-hint">Selected date: {selectedDate} | Pincode: {scopePincode || "-"} | Total: {filtered.length}</p>

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
              {rows.length > 0 ? rows.map((row, idx) => {
                const scheduleEligible = row.status === "ACCEPTED" && isTodayPickup(row, selectedDate);
                const canCall = Boolean(row.seller.phone);
                return (
                  <tr key={`${row.id}-${idx}`}>
                    <td data-label="Phone Name">{row.selectedModel.modelName}</td>
                    <td data-label="Price Listed">Rs. {formatInr(row.quote?.sellingPrice ?? row.selectedModel.listedPrice ?? 0)}</td>
                    <td data-label="Area">{row.seller.city || row.city || "-"}</td>
                    <td data-label="Pincode">{row.pincode}</td>
                    <td data-label="Pickup Time Zone">{row.pickupSchedule?.primaryTime || "-"}</td>
                    <td data-label="Action" className="service-leads-action-cell">
                      <div className="lead-decision-row service-leads-action-row">
                        {scheduleEligible ? (
                          <Link to="/service-Leads/transaction" search={{ leadId: row.id }} className="lead-view-btn lead-view-link">Schedule Pickup</Link>
                        ) : (
                          <span className="lead-view-disabled">{row.status === "ACCEPTED" ? "Not Today" : row.status}</span>
                        )}
                        <Link to="/service-Leads/transaction" search={{ leadId: row.id }} className="lead-view-btn lead-view-btn-details lead-view-link">View Details</Link>
                        {canCall ? (
                          <a className="lead-view-btn lead-view-link" href={`tel:${row.seller.phone}`}>Call Customer</a>
                        ) : (
                          <span className="lead-view-disabled">No Number</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
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
