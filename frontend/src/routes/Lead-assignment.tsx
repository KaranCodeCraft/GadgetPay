import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getActiveRole } from "../lib/auth/role-session";
import {
  assignAdminLead,
  assignAdminLeadsBulk,
  listAdminEligiblePartnersForPincode,
  listAdminLeadPartnerScopes,
  listAdminLeads,
  listAdminPartnersForLeadAssignment,
  upsertAdminLeadPartnerScope,
  type AdminPartnerSearchRow,
  type PartnerPincodeScope,
  type PartnerLead,
} from "../lib/api/gadgetpe-client";

export const Route = createFileRoute("/Lead-assignment")({
  validateSearch: (search: Record<string, unknown>) => ({
    pincode: typeof search.pincode === "string" ? search.pincode : undefined,
    leadId: typeof search.leadId === "string" ? search.leadId : undefined,
  }),
  component: LeadAssignmentPage,
});

const ADMIN_TOKEN_KEY = "gadgetpe_admin_access_token";

function getLeadDeviceLabel(lead: PartnerLead) {
  const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const snapshot = asRecord(lead.flowSnapshot);
  const model = asRecord(lead.selectedModel);
  const snapshotModel = asRecord(snapshot.selectedModel);
  const schedule = asRecord(lead.pickupSchedule);
  const snapshotSchedule = asRecord(snapshot.pickupSchedule);
  const modelName = [model.modelName, schedule.modelName, snapshotModel.modelName, snapshotSchedule.modelName]
    .find((value): value is string => typeof value === "string" && Boolean(value.trim()) && !/^lead[-_]sell[-_](phone|tablet)(?:[-_]|$)/i.test(value.trim()))
    ?.trim();
  const modelId = [model.modelId, snapshotModel.modelId].find((value): value is string => typeof value === "string");
  const modelParts = modelId?.split("__").filter(Boolean) ?? [];
  const idModelName = modelParts.length >= 4
    ? modelParts.slice(2, -1).join(" ").replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "";
  const deviceName = modelName || idModelName || "Device details unavailable";
  const rawStorage = [model.storage, snapshotModel.storage, modelParts.length >= 4 ? modelParts.at(-1) : null]
    .find((value): value is string => typeof value === "string" && Boolean(value.trim()))
    ?.trim();
  const storage = rawStorage?.replace(/(\d+)\s*(gb|tb)/i, "$1 $2").toUpperCase();
  const deviceNameKey = deviceName.toLowerCase().replace(/\s/g, "");
  const storageKey = storage?.toLowerCase().replace(/\s/g, "");

  return storage && storageKey && !deviceNameKey.includes(storageKey)
    ? `${deviceName} (${storage})`
    : deviceName;
}

function LeadAssignmentPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [pincode, setPincode] = useState(search.pincode ?? "");
  const [mode, setMode] = useState<"AUTO" | "MANUAL">(search.leadId ? "MANUAL" : "AUTO");
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<PartnerLead[]>([]);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [partners, setPartners] = useState<AdminPartnerSearchRow[]>([]);
  const [scopeRows, setScopeRows] = useState<PartnerPincodeScope[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [scopePartnerId, setScopePartnerId] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [selectedBulkLeadIds, setSelectedBulkLeadIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const activeRole = getActiveRole();
    if (activeRole === "user") {
      void navigate({ to: "/user" });
      return;
    }
    if (activeRole === "partner") {
      void navigate({ to: "/partner-page" });
      return;
    }

    if (!adminToken) {
      toast.error("Admin login required.");
      void navigate({ to: "/admin" });
    }
  }, [adminToken, navigate]);

  const unassignedLeads = useMemo(
    () => leads.filter((lead) => lead.status === "AVAILABLE" && !lead.partnerId),
    [leads],
  );
  const assignableLeads = useMemo(
    () => leads.filter((lead) => !["COMPLETED", "REJECTED", "CANCELLED"].includes(lead.status)),
    [leads],
  );
  const activePartners = useMemo(() => partners.filter((partner) => partner.status === "ACTIVE"), [partners]);

  const applyPincodeScope = useCallback(async (scopePincode = pincode) => {
    if (!adminToken) return;
    if (!/^\d{6}$/.test(scopePincode)) {
      toast.error("Enter a valid 6-digit pincode.");
      return;
    }

    setLoading(true);
    try {
      const [leadResult, eligible] = await Promise.all([
        listAdminLeads(adminToken, { pincode: scopePincode, leadType: "SERVICE_LEAD", limit: 200 }),
        listAdminEligiblePartnersForPincode(adminToken, scopePincode),
      ]);
      setLeads(leadResult.rows);
      setEligibleCount(eligible.count);
      const scopeResult = await listAdminLeadPartnerScopes(adminToken, {
        pincode: scopePincode,
        activeOnly: false,
        limit: 200,
      });
      setScopeRows(scopeResult.rows);
      setSelectedLeadId(leadResult.rows.some((lead) => lead.id === search.leadId) ? search.leadId ?? "" : "");
      setSelectedBulkLeadIds([]);
      setSelectedPartnerId("");
      setScopePartnerId("");
      setPartners([]);
      setPartnerSearch("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load lead assignment scope.");
    } finally {
      setLoading(false);
    }
  }, [adminToken, pincode, search.leadId]);

  useEffect(() => {
    if (!search.pincode || !search.leadId) return;
    setPincode(search.pincode);
    setMode("MANUAL");
    void applyPincodeScope(search.pincode);
  }, [adminToken, applyPincodeScope, search.pincode, search.leadId]);

  const searchPartners = async () => {
    if (!adminToken) return;
    if (!/^\d{6}$/.test(pincode)) {
      toast.error("Set pincode scope first.");
      return;
    }

    try {
      const result = await listAdminPartnersForLeadAssignment(adminToken, {
        pincode,
        search: partnerSearch.trim() || undefined,
        includeUnmapped: true,
        limit: 30,
      });
      setPartners(result.rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to search partners.");
    }
  };

  const handleScopeUpsert = async (partnerId: string, isActive: boolean) => {
    if (!adminToken) return;
    if (!/^\d{6}$/.test(pincode)) {
      toast.error("Set pincode scope first.");
      return;
    }
    setSaving(true);
    try {
      await upsertAdminLeadPartnerScope(adminToken, { partnerId, pincode, isActive });
      toast.success(isActive ? "Partner mapped to pincode." : "Partner mapping disabled.");
      await applyPincodeScope();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update partner scope.");
    } finally {
      setSaving(false);
    }
  };

  const handleSingleAssign = async () => {
    if (!adminToken) return;
    if (!selectedLeadId || !selectedPartnerId) {
      toast.error("Select both lead and partner.");
      return;
    }

    setSaving(true);
    try {
      await assignAdminLead(adminToken, selectedLeadId, {
        partnerId: selectedPartnerId,
        mode: "MANUAL",
        note: `Manual assignment for pincode ${pincode}`,
      });
      toast.success("Lead assigned successfully.");
      await applyPincodeScope();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign lead.");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!adminToken) return;
    if (!selectedPartnerId) {
      toast.error("Select a partner first.");
      return;
    }
    if (selectedBulkLeadIds.length === 0) {
      toast.error("Select at least one lead.");
      return;
    }
    if (selectedBulkLeadIds.length > 5) {
      toast.error("Bulk assignment supports at most 5 leads.");
      return;
    }

    setSaving(true);
    try {
      const result = await assignAdminLeadsBulk(adminToken, {
        leadIds: selectedBulkLeadIds,
        partnerId: selectedPartnerId,
        note: `Bulk manual assignment for pincode ${pincode}`,
      });
      const ok = result.rows.filter((row) => row.result === "UPDATED").length;
      toast.success(`Bulk assignment complete: ${ok}/${result.count} updated.`);
      await applyPincodeScope();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to bulk assign leads.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Lead Assignment</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pincode-scoped lead assignment with automatic and manual modes.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Pincode (tenant scope)</span>
            <input
              value={pincode}
              maxLength={6}
              onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Enter 6-digit pincode"
            />
          </label>
          <button
            type="button"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={loading || pincode.length !== 6}
            onClick={() => {
              void applyPincodeScope();
            }}
          >
            {loading ? "Loading..." : "Apply Scope"}
          </button>
          <button
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-medium ${mode === "AUTO" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}
            onClick={() => setMode("AUTO")}
          >
            Automatic
          </button>
          <button
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-medium ${mode === "MANUAL" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
            onClick={() => setMode("MANUAL")}
          >
            Manual
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="text-slate-500">Eligible Partners</p>
            <p className="text-xl font-semibold text-slate-900">{eligibleCount}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="text-slate-500">Unassigned SERVICE_LEAD</p>
            <p className="text-xl font-semibold text-slate-900">{unassignedLeads.length}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="text-slate-500">Mode</p>
            <p className="text-xl font-semibold text-slate-900">{mode === "AUTO" ? "Automatic" : "Manual"}</p>
          </div>
        </div>
      </section>

      {mode === "AUTO" ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Automatic Assignment</h2>
          <p className="mt-2 text-sm text-slate-600">
            Automatic assignment is triggered when a user schedules pickup and creates a SERVICE_LEAD. Partners are selected in round-robin order within this pincode.
          </p>

          <div className="mt-5 overflow-x-auto">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Partner Scope Mapping</h3>
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-2 py-2">Partner</th>
                  <th className="px-2 py-2">Phone</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Last Assigned</th>
                  <th className="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {scopeRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-2 py-2">{row.partnerName} ({row.partnerId})</td>
                    <td className="px-2 py-2">{row.partnerPhone}</td>
                    <td className="px-2 py-2">{row.isActive ? "Active" : "Inactive"}</td>
                    <td className="px-2 py-2">{row.lastAssignedAt ? new Date(row.lastAssignedAt).toLocaleString() : "-"}</td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        className={`rounded-lg px-3 py-1 text-xs font-medium ${row.isActive ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}
                        disabled={saving}
                        onClick={() => {
                          void handleScopeUpsert(row.partnerId, !row.isActive);
                        }}
                      >
                        {row.isActive ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))}
                {scopeRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-3 text-slate-500">
                      No partner mappings found for this pincode.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Manual Assignment</h2>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex min-w-[240px] flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">Search Partner</span>
              <input
                value={partnerSearch}
                onChange={(event) => setPartnerSearch(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="Name, phone, or partner id"
              />
            </label>
            <button
              type="button"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              onClick={() => {
                void searchPartners();
              }}
            >
              Search
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-2 py-2">Select</th>
                  <th className="px-2 py-2">Partner</th>
                  <th className="px-2 py-2">Phone</th>
                  <th className="px-2 py-2">Account</th>
                  <th className="px-2 py-2">Last Assigned</th>
                </tr>
              </thead>
              <tbody>
                {activePartners.map((partner) => (
                  <tr key={partner.id} className="border-b border-slate-100">
                    <td className="px-2 py-2">
                      <input
                        type="radio"
                        name="selected-partner"
                        checked={selectedPartnerId === partner.id}
                        onChange={() => setSelectedPartnerId(partner.id)}
                      />
                    </td>
                    <td className="px-2 py-2">{partner.name} ({partner.id})</td>
                    <td className="px-2 py-2">{partner.phone}</td>
                    <td className="px-2 py-2">Active</td>
                    <td className="px-2 py-2">{partner.lastAssignedAt ? new Date(partner.lastAssignedAt).toLocaleString() : "-"}</td>
                  </tr>
                ))}
                {activePartners.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-3 text-slate-500">
                      No active partners found. Search after applying pincode scope.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-sm font-medium text-slate-800">Scope Management</p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={scopePartnerId}
                onChange={(event) => setScopePartnerId(event.target.value)}
              >
                <option value="">Select partner to map</option>
                {activePartners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name} ({partner.id})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                disabled={!scopePartnerId || saving}
                onClick={() => {
                  void handleScopeUpsert(scopePartnerId, true);
                }}
              >
                Add to Pincode Scope
              </button>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-2 py-2">Pick</th>
                  <th className="px-2 py-2">Device / Storage</th>
                  <th className="px-2 py-2">Customer</th>
                  <th className="px-2 py-2">Phone</th>
                  <th className="px-2 py-2">Pickup Location</th>
                  <th className="px-2 py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {assignableLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-100">
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selectedBulkLeadIds.includes(lead.id)}
                        onChange={(event) => {
                          setSelectedLeadId(lead.id);
                          setSelectedBulkLeadIds((prev) => {
                            if (event.target.checked) {
                              if (prev.length >= 5) return prev;
                              return Array.from(new Set([...prev, lead.id]));
                            }
                            return prev.filter((id) => id !== lead.id);
                          });
                        }}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="font-medium text-slate-900">{getLeadDeviceLabel(lead)}</div>
                      <div className="text-xs text-slate-500">{lead.id}</div>
                    </td>
                    <td className="px-2 py-2">{lead.seller.name || "-"}</td>
                    <td className="px-2 py-2">{lead.seller.phone || "-"}</td>
                    <td className="px-2 py-2">
                      {[lead.seller.addressLine, lead.seller.landmark, lead.seller.city || lead.city]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </td>
                    <td className="px-2 py-2">{new Date(lead.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
                {assignableLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-3 text-slate-500">
                      No open service leads for this pincode.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              disabled={saving || !selectedLeadId || !selectedPartnerId}
              onClick={() => {
                void handleSingleAssign();
              }}
            >
              {saving ? "Assigning..." : "Assign Selected Lead"}
            </button>
            <button
              type="button"
              className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              disabled={saving || selectedBulkLeadIds.length === 0 || !selectedPartnerId}
              onClick={() => {
                void handleBulkAssign();
              }}
            >
              {saving ? "Processing..." : `Bulk Assign (${selectedBulkLeadIds.length}/5)`}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}