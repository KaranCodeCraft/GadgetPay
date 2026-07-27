import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock,
  Coins,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  MapPin,
  Power,
  PowerOff,
  Settings,
  ShieldUser,
  Sliders,
  Trash2,
  TrendingUp,
  Upload,
  FileSpreadsheet,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType, type FormEvent } from "react";
import { toast } from "sonner";
import { activateRoleSession, clearRoleSession, getActiveRole } from "../lib/auth/role-session";
import {
  ApiClientError,
  adminDevLogin,
  createQuoteDeductionRule,
  createServiceabilityPincode,
  deleteServiceabilityPincode,
  getAdminAssignmentMetrics,
  getAdminDispositionMetrics,
  getAdminOverviewMetrics,
  assignAdminLead,
  listAdminLeadDispositionEvents,
  listAdminLeadDispositionSummary,
  listAdminLeads,
  listPriceCatalog,
  listPriceUploadHistory,
  listQuoteDeductionRules,
  listKycSubmissions,
  listAdminPartnerCoinRechargeRequests,
  listAdminLeadUnlockIntents,
  verifyAdminLeadUnlockIntent,
  listServiceabilityPincodes,
  listServiceabilityUploadHistory,
  previewQuoteDeductions,
  deleteServiceabilityUpload,
  deletePriceUpload,
  updatePriceUploadStatus,
  updateServiceabilityUploadStatus,
  toggleQuoteDeductionRule,
  uploadPricingExcel,
  uploadServiceabilityExcel,
  verifyPartnerCoinRechargeRequest,
  toggleServiceabilityPincode,
  updateQuoteDeductionRule,
  updateServiceabilityPincode,
  validateServiceabilityPincode,
  verifyKycSubmission,
  type DevicePriceCatalogRow,
  type DevicePriceUploadHistoryRow,
  type AdminLeadDispositionEvent,
  type AdminOverviewMetricsResponse,
  type AdminAssignmentMetricsResponse,
  type KycSubmissionRow,
  type PartnerLead,
  type PincodeValidationPreview,
  type PartnerCoinRechargeRequestRow,
  type AdminLeadUnlockIntentRow,
  type PartnerLeadStatus,
  type QuoteDeductionAnswerGroup,
  type QuoteDeductionRule,
  type QuoteDeductionRuleInput,
  type ServiceabilityUploadHistoryRow,
  type UserSellFlowDeviceDetails,
  type UserSellFlowQuote,
  type ServiceabilityRow,
} from "../lib/api/gadgetpe-client";

function isTokenExpiredError(err: unknown) {
  if (err instanceof ApiClientError) {
    return err.code === "UNAUTHORIZED" || err.status === 401;
  }

  if (err instanceof Error) {
    return err.message.toLowerCase().includes("invalid or expired access token");
  }

  return false;
}

function formatUploadValidationError(err: unknown) {
  if (!(err instanceof ApiClientError)) {
    return err instanceof Error ? err.message : "Upload failed.";
  }

  if (err.code !== "BAD_REQUEST" || !err.details || typeof err.details !== "object") {
    return err.message;
  }

  const details = err.details as {
    sourceFileName?: string;
    errors?: Array<{ rowNo?: number; errors?: string[] }>;
  };
  const first = details.errors?.[0];
  const firstMessage = first?.errors?.[0];
  const filePrefix = details.sourceFileName ? `${details.sourceFileName}: ` : "";

  if (typeof first?.rowNo === "number" && firstMessage) {
    return `${err.message} (${filePrefix}Row ${first.rowNo}: ${firstMessage})`;
  }

  return details.sourceFileName ? `${err.message} (${details.sourceFileName})` : err.message;
}

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

//  Types 

type NavItem =
  | "Overview"
  | "Lead Bucket"
  | "Lead Disposition"
  | "Lead Assignment"
  | "Location Mgmt"
  | "Price Mgmt"
  | "KYC Queue"
  | "Payments Verify"
  | "Partners"
  | "Revenue"
  | "Settings";

type LeadStatus = "Pending" | "In Progress" | "Completed" | "Cancelled";

type Lead = {
  id: string;
  userSellFlowId: string;
  leadType: "LEAD_BUCKET" | "SERVICE_LEAD";
  modelName: string;
  listedPrice: number;
  quotedPrice: number;
  phone: string;
  seller: string;
  sellerAddress: string;
  sellerLandmark: string;
  partner: string | null;
  city: string;
  pincode: string;
  primarySlot: string;
  alternateSlot: string;
  status: LeadStatus;
  rawStatus: PartnerLeadStatus;
  updatedAt: string;
  createdAt: string;
  disposition: string;
  assignMode: "Auto" | "Manual";
};

type Partner = {
  id: string;
  name: string;
  area: string;
  pincode: string;
  leadsToday: number;
  leadsTotal: number;
  earnings: number;
  status: "Active" | "Inactive";
  rating: number;
};

type Location = {
  id: string;
  city: string;
  area: string;
  pincode: string;
  partners: number;
  activeLeads: number;
  coverage: "Active" | "Limited" | "Inactive";
};

type RevenueBar = { label: string; value: number };

const STATUSES: LeadStatus[] = ["Pending", "In Progress", "Completed", "Cancelled"];
const WEEKLY_REVENUE: RevenueBar[] = [];

function mapPartnerStatusToLeadStatus(status: PartnerLeadStatus): LeadStatus {
  if (status === "COMPLETED") return "Completed";
  if (status === "REJECTED" || status === "CANCELLED") return "Cancelled";
  if (status === "ACCEPTED" || status === "IN_PROGRESS") return "In Progress";
  return "Pending";
}

function mapPartnerLeadToLead(lead: PartnerLead): Lead {
  const status = mapPartnerStatusToLeadStatus(lead.status);
  let disposition = "CREATED";
  switch (lead.status) {
    case "AVAILABLE":
      disposition = lead.leadType === "SERVICE_LEAD" ? "SCHEDULED" : "CREATED";
      break;
    case "CLAIMED":
      disposition = "CLAIMED";
      break;
    case "ACCEPTED":
      disposition = "ACCEPTED";
      break;
    case "IN_PROGRESS":
      disposition = "VISIT_STARTED";
      break;
    case "COMPLETED":
      disposition = "COMPLETED";
      break;
    case "REJECTED":
      disposition = "REJECTED";
      break;
    case "CANCELLED":
      disposition = "CANCELLED";
      break;
    default:
      disposition = "UPDATED";
      break;
  }

  const formatSlot = (date?: string, time?: string) => {
    if (!date && !time) return "-";
    const datePart = date ? new Date(date).toLocaleDateString() : "-";
    return `${datePart} ${time || ""}`.trim();
  };

  return {
    id: lead.id,
    userSellFlowId: lead.userSellFlowId,
    leadType: lead.leadType,
    modelName: lead.selectedModel.modelName,
    listedPrice: lead.selectedModel.listedPrice ?? 0,
    quotedPrice: lead.quote?.sellingPrice ?? lead.selectedModel.listedPrice ?? 0,
    phone: lead.seller.phone || "-",
    seller: lead.seller.name || "-",
    sellerAddress: lead.seller.addressLine || "-",
    sellerLandmark: lead.seller.landmark || "-",
    partner: lead.partnerId,
    city: lead.seller.city || lead.city || "-",
    pincode: lead.pincode,
    primarySlot: formatSlot(lead.pickupSchedule?.primaryDate, lead.pickupSchedule?.primaryTime),
    alternateSlot: formatSlot(
      lead.pickupSchedule?.alternateDate,
      lead.pickupSchedule?.alternateTime,
    ),
    status,
    rawStatus: lead.status,
    updatedAt: lead.updatedAt,
    createdAt: new Date(lead.updatedAt || lead.createdAt).toLocaleString(),
    disposition,
    assignMode: "Auto",
  };
}

function toInr(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

//  Nav Icon Map 

const NAV_ICONS: Record<NavItem, ComponentType<{ size?: number; className?: string }>> = {
  Overview: LayoutDashboard,
  "Lead Bucket": BarChart3,
  "Lead Disposition": CircleDot,
  "Lead Assignment": UserCheck,
  "Location Mgmt": MapPin,
  "Price Mgmt": Upload,
  "KYC Queue": ShieldUser,
  "Payments Verify": Coins,
  Partners: Users,
  Revenue: IndianRupee,
  Settings: Settings,
};

const NAV_ITEMS: NavItem[] = [
  "Overview",
  "Lead Bucket",
  "Lead Disposition",
  "Lead Assignment",
  "Location Mgmt",
  "Price Mgmt",
  "KYC Queue",
  "Payments Verify",
  "Partners",
  "Revenue",
  "Settings",
];

//  Mini Bar Chart 

function MiniBarChart({ data, color = "var(--green)" }: { data: RevenueBar[]; color?: string }) {
  if (data.length === 0) {
    return <p className="admin-muted">No data available.</p>;
  }

  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="admin-bar-chart">
      {data.map((d) => (
        <div key={d.label} className="admin-bar-col">
          <div
            className="admin-bar"
            style={{ height: `${Math.round((d.value / max) * 100)}%`, background: color }}
            title={`Rs. ${toInr(d.value)}`}
          />
          <span className="admin-bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

//  Donut Chart 

function DonutChart({ slices }: { slices: { value: number; color: string; label: string }[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) {
    return <p className="admin-muted">No data available.</p>;
  }

  let cumulativeDeg = 0;
  const segments = slices.map((s) => {
    const deg = (s.value / total) * 360;
    const start = cumulativeDeg;
    cumulativeDeg += deg;
    return { ...s, start, deg };
  });

  const gradient = segments.map((s) => `${s.color} ${s.start}deg ${s.start + s.deg}deg`).join(", ");

  return (
    <div className="admin-donut-wrap">
      <div className="admin-donut" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="admin-donut-hole">
          <span className="admin-donut-total">{total}</span>
          <span className="admin-donut-sub">Total</span>
        </div>
      </div>
      <div className="admin-donut-legend">
        {slices.map((s) => (
          <div key={s.label} className="admin-legend-row">
            <span className="admin-legend-dot" style={{ background: s.color }} />
            <span className="admin-legend-label">{s.label}</span>
            <span className="admin-legend-val">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

//  Stat Card 

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: ComponentType<{ size?: number }>;
  accent: string;
}) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-icon" style={{ background: `${accent}18`, color: accent }}>
        <Icon size={20} />
      </div>
      <div className="admin-stat-body">
        <p className="admin-stat-label">{label}</p>
        <p className="admin-stat-value">{value}</p>
        {sub && <p className="admin-stat-sub">{sub}</p>}
      </div>
    </div>
  );
}

//  Status Badge 

const STATUS_COLORS: Record<LeadStatus, string> = {
  Pending: "#f59e0b",
  "In Progress": "#0ea5c9",
  Completed: "#1d9e75",
  Cancelled: "#ef4444",
};

function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className="admin-status-badge"
      style={{ background: `${STATUS_COLORS[status]}18`, color: STATUS_COLORS[status] }}
    >
      {status}
    </span>
  );
}

//  Section: Overview 

function OverviewSection({
  leads,
  overview,
}: {
  leads: Lead[];
  overview: AdminOverviewMetricsResponse | null;
}) {
  const pending = leads.filter((l) => l.status === "Pending").length;
  const inProgress = leads.filter((l) => l.status === "In Progress").length;
  const completed = leads.filter((l) => l.status === "Completed").length;
  const cancelled = leads.filter((l) => l.status === "Cancelled").length;

  const donutSlices = [
    { value: pending, color: "#f59e0b", label: "Pending" },
    { value: inProgress, color: "#0ea5c9", label: "In Progress" },
    { value: completed, color: "#1d9e75", label: "Completed" },
    { value: cancelled, color: "#ef4444", label: "Cancelled" },
  ];

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">Overview</h2>

      <div className="admin-stat-grid">
        <StatCard
          label="Total Leads"
          value={leads.length}
          sub="No records yet"
          icon={BarChart3}
          accent="#1d9e75"
        />
        <StatCard
          label="Pending"
          value={pending}
          sub="Awaiting pickup"
          icon={Clock}
          accent="#f59e0b"
        />
        <StatCard
          label="In Progress"
          value={inProgress}
          sub="Partner assigned"
          icon={Activity}
          accent="#0ea5c9"
        />
        <StatCard
          label="Completed"
          value={completed}
          sub="Deals closed"
          icon={CheckCircle2}
          accent="#1d9e75"
        />
        <StatCard
          label="Cancelled"
          value={cancelled}
          sub="Dropped leads"
          icon={AlertCircle}
          accent="#ef4444"
        />
        <StatCard
          label="Active Partners"
          value={overview?.activePartners ?? 0}
          sub="Across zones"
          icon={Users}
          accent="#8b5cf6"
        />
        <StatCard
          label="Monthly Payout"
          value={`Rs. ${toInr(overview?.monthlyPayout ?? 0)}`}
          sub="Completed payouts"
          icon={TrendingUp}
          accent="#1d9e75"
        />
        <StatCard
          label="Conversion"
          value={`${overview?.conversionRate ?? 0}%`}
          sub="Completed / Total"
          icon={Coins}
          accent="#f59e0b"
        />
      </div>

      <div className="admin-overview-lower">
        <div className="admin-card admin-donut-card">
          <h3 className="admin-card-title">Lead Status Breakdown</h3>
          <DonutChart slices={donutSlices} />
        </div>

        <div className="admin-card admin-revenue-card">
          <h3 className="admin-card-title">Revenue  This Week</h3>
          <div className="admin-revenue-total">
            Rs. {toInr((overview?.weeklyTrend || []).reduce((s, d) => s + d.value, 0))}
          </div>
          <MiniBarChart data={overview?.weeklyTrend || WEEKLY_REVENUE} />
        </div>

        <div className="admin-card admin-activity-card">
          <h3 className="admin-card-title">Top Partner Activity</h3>
          <div className="admin-activity-list">
            {(overview?.partnerActivity || []).slice(0, 6).map((p) => (
              <div key={p.partnerId} className="admin-activity-row">
                <div className="admin-activity-avatar">
                  {p.partnerName
                    .split(" ")
                    .map((name) => name[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="admin-activity-info">
                  <span className="admin-activity-name">{p.partnerName}</span>
                  <span className="admin-activity-meta">
                    {p.leadsTouched} touched  {p.completedLeads} completed  {p.activeLeads} active
                  </span>
                </div>
                <span
                  className="admin-activity-status"
                  style={{ color: p.activeLeads > 0 ? "var(--green)" : "var(--muted)" }}
                >
                  {p.lastActivityAt ? new Date(p.lastActivityAt).toLocaleDateString("en-IN") : "-"}
                </span>
              </div>
            ))}
            {(overview?.partnerActivity || []).length === 0 ? (
              <p className="admin-muted">No partner activity data.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

//  Section: Lead Bucket 

const PAGE_SIZE = 15;

function LeadBucketSection({
  leads,
  onOpenTimeline,
}: {
  leads: Lead[];
  onOpenTimeline: (lead: Lead) => void;
}) {
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "All">("All");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => (filterStatus === "All" ? leads : leads.filter((l) => l.status === filterStatus)),
    [leads, filterStatus],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const pending = leads.filter((l) => l.status === "Pending").length;
  const inProg = leads.filter((l) => l.status === "In Progress").length;
  const completed = leads.filter((l) => l.status === "Completed").length;
  const totalLeadCount = leads.length;

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">Lead Bucket</h2>

      <div className="admin-bucket-totals">
        {(["All", "Pending", "In Progress", "Completed", "Cancelled"] as const).map((s) => {
          const count = s === "All" ? leads.length : leads.filter((l) => l.status === s).length;
          return (
            <button
              key={s}
              type="button"
              className={`admin-bucket-pill${filterStatus === s ? " active" : ""}`}
              onClick={() => {
                setFilterStatus(s);
                setPage(1);
              }}
            >
              <span>{s}</span>
              <span className="admin-bucket-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="admin-progress-row">
        <div className="admin-progress-bar">
          <div
            style={{
              width: `${totalLeadCount === 0 ? 0 : Math.round((pending / totalLeadCount) * 100)}%`,
              background: "#f59e0b",
            }}
          />
          <div
            style={{
              width: `${totalLeadCount === 0 ? 0 : Math.round((inProg / totalLeadCount) * 100)}%`,
              background: "#0ea5c9",
            }}
          />
          <div
            style={{
              width: `${totalLeadCount === 0 ? 0 : Math.round((completed / totalLeadCount) * 100)}%`,
              background: "#1d9e75",
            }}
          />
        </div>
        <span className="admin-progress-meta">
          {completed} of {leads.length} completed
        </span>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="lead-table-wrap" style={{ margin: 0 }}>
          <table className="lead-table admin-lead-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Flow</th>
                <th>Type</th>
                <th>Model</th>
                <th>Seller</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Landmark</th>
                <th>City</th>
                <th>Pincode</th>
                <th>List Price</th>
                <th>Quote</th>
                <th>Primary Slot</th>
                <th>Alternate Slot</th>
                <th>Partner</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Timeline</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <code className="admin-lead-id">{lead.id}</code>
                  </td>
                  <td>
                    <code className="admin-lead-id">{lead.userSellFlowId}</code>
                  </td>
                  <td>{lead.leadType}</td>
                  <td>{lead.modelName}</td>
                  <td>{lead.seller}</td>
                  <td>{lead.phone}</td>
                  <td>{lead.sellerAddress}</td>
                  <td>{lead.sellerLandmark}</td>
                  <td>{lead.city}</td>
                  <td>{lead.pincode}</td>
                  <td className="admin-price">Rs. {toInr(lead.listedPrice)}</td>
                  <td className="admin-price">Rs. {toInr(lead.quotedPrice)}</td>
                  <td>{lead.primarySlot}</td>
                  <td>{lead.alternateSlot}</td>
                  <td>{lead.partner ?? <span className="admin-unassigned">Unassigned</span>}</td>
                  <td>
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="admin-muted">{new Date(lead.updatedAt).toLocaleString()}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-page-btn"
                      onClick={() => onOpenTimeline(lead)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={18} className="admin-muted">
                    No lead bucket data available.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="admin-pagination">
          <button
            type="button"
            className="admin-page-btn"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
             Prev
          </button>
          <span className="admin-page-info">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            className="admin-page-btn"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next 
          </button>
        </div>
      </div>
    </div>
  );
}

//  Section: Lead Disposition 

function LeadDispositionSection({
  leads,
  summary,
  onOpenTimeline,
}: {
  leads: Lead[];
  summary: {
    byStatus: Array<{ key: string; count: number }>;
    byDisposition: Array<{ key: string; count: number }>;
  } | null;
  onOpenTimeline: (lead: Lead) => void;
}) {
  const dispositionCounts = useMemo(() => {
    if (summary?.byDisposition?.length) {
      return summary.byDisposition
        .map((item) => [item.key, item.count] as const)
        .sort((a, b) => b[1] - a[1]);
    }

    const map: Record<string, number> = {};
    leads.forEach((l) => {
      map[l.disposition] = (map[l.disposition] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [leads, summary]);

  const statusCounts = useMemo(() => {
    const map: Record<LeadStatus, number> = {
      Pending: 0,
      "In Progress": 0,
      Completed: 0,
      Cancelled: 0,
    };

    if (summary?.byStatus?.length) {
      summary.byStatus.forEach((item) => {
        if (item.key === "AVAILABLE" || item.key === "CLAIMED") map.Pending += item.count;
        else if (item.key === "ACCEPTED" || item.key === "IN_PROGRESS")
          map["In Progress"] += item.count;
        else if (item.key === "COMPLETED") map.Completed += item.count;
        else if (item.key === "REJECTED" || item.key === "CANCELLED") map.Cancelled += item.count;
      });
      return map;
    }

    leads.forEach((lead) => {
      map[lead.status] += 1;
    });
    return map;
  }, [leads, summary]);

  const max = Math.max(1, ...dispositionCounts.map(([, v]) => v));
  const DISP_COLORS = ["#1d9e75", "#0ea5c9", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899"];

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">Lead Disposition</h2>

      <div className="admin-two-col">
        <div className="admin-card">
          <h3 className="admin-card-title">Disposition Breakdown</h3>
          <div className="admin-disp-list">
            {dispositionCounts.map(([label, count], i) => (
              <div key={label} className="admin-disp-row">
                <span className="admin-disp-label">{label}</span>
                <div className="admin-disp-bar-wrap">
                  <div
                    className="admin-disp-bar"
                    style={{
                      width: `${Math.round((count / max) * 100)}%`,
                      background: DISP_COLORS[i % DISP_COLORS.length],
                    }}
                  />
                </div>
                <span className="admin-disp-count">{count}</span>
              </div>
            ))}
            {dispositionCounts.length === 0 ? (
              <p className="admin-muted">No disposition data available.</p>
            ) : null}
          </div>
        </div>

        <div className="admin-card">
          <h3 className="admin-card-title">Status  Disposition Heatmap</h3>
          <div className="admin-heatmap">
            <div className="admin-heatmap-head">
              <span />
              {STATUSES.map((s) => (
                <span key={s} style={{ color: STATUS_COLORS[s], fontSize: 11 }}>
                  {s}
                </span>
              ))}
            </div>
            {dispositionCounts.map(([disp]) => {
              return (
                <div key={disp} className="admin-heatmap-row">
                  <span className="admin-heatmap-label">{disp}</span>
                  {STATUSES.map((s) => {
                    const cnt = summary
                      ? Math.round(
                          ((dispositionCounts.find(([label]) => label === disp)?.[1] || 0) *
                            statusCounts[s]) /
                            Math.max(1, leads.length),
                        )
                      : leads.filter((l) => l.disposition === disp && l.status === s).length;
                    const hex = Math.round(Math.min(1, cnt / 5) * 200 + 30)
                      .toString(16)
                      .padStart(2, "0");
                    return (
                      <span
                        key={s}
                        className="admin-heatmap-cell"
                        style={{ background: `${STATUS_COLORS[s]}${hex}` }}
                        title={`${disp} + ${s}: ${cnt}`}
                      >
                        {cnt}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 20 }}>
        <h3 className="admin-card-title">Recent Dispositioned Leads</h3>
        <div className="lead-table-wrap" style={{ margin: 0 }}>
          <table className="lead-table admin-lead-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Phone</th>
                <th>Disposition</th>
                <th>Status</th>
                <th>Partner</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 12).map((l) => (
                <tr key={l.id}>
                  <td>
                    <code className="admin-lead-id">{l.id}</code>
                  </td>
                  <td>{l.phone}</td>
                  <td>
                    <span className="admin-disp-tag">{l.disposition}</span>
                  </td>
                  <td>
                    <StatusBadge status={l.status} />
                  </td>
                  <td>{l.partner ?? <span className="admin-unassigned"></span>}</td>
                  <td className="admin-muted">
                    <button
                      type="button"
                      className="admin-page-btn"
                      onClick={() => onOpenTimeline(l)}
                    >
                      View Timeline
                    </button>
                  </td>
                </tr>
              ))}
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-muted">
                    No dispositioned leads available.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LeadTimelineModal({
  lead,
  rows,
  loading,
  error,
  onClose,
}: {
  lead: Lead;
  rows: AdminLeadDispositionEvent[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  return (
    <div className="admin-backdrop" onClick={onClose} role="presentation">
      <div
        className="admin-card"
        style={{
          width: "min(980px, 94vw)",
          maxHeight: "82vh",
          overflow: "auto",
          margin: "48px auto",
          padding: 20,
        }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Lead disposition timeline"
      >
        <div className="admin-card-toprow">
          <h3 className="admin-card-title">Timeline  {lead.id}</h3>
          <button type="button" className="admin-page-btn" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="admin-muted" style={{ marginBottom: 12 }}>
          {lead.modelName}  {lead.seller}  {lead.pincode}
        </p>

        {loading ? <p className="admin-muted">Loading timeline...</p> : null}
        {error ? (
          <p className="admin-muted" style={{ color: "#ef4444" }}>
            {error}
          </p>
        ) : null}

        <div className="lead-table-wrap" style={{ margin: 0 }}>
          <table className="lead-table admin-lead-table">
            <thead>
              <tr>
                <th>At</th>
                <th>Disposition</th>
                <th>From</th>
                <th>To</th>
                <th>Actor Role</th>
                <th>Actor</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((event) => (
                <tr key={event.id}>
                  <td className="admin-muted">{new Date(event.createdAt).toLocaleString()}</td>
                  <td>
                    <span className="admin-disp-tag">{event.dispositionKey}</span>
                  </td>
                  <td>{event.fromStatus || "-"}</td>
                  <td>{event.toStatus}</td>
                  <td>{event.actorRole}</td>
                  <td>{event.actorId}</td>
                  <td>{event.note || "-"}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-muted">
                    No timeline events found for this lead.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

//  Section: Lead Assignment 

function LeadAssignmentSection({
  leads,
  adminToken,
  metrics,
  onAssigned,
}: {
  leads: Lead[];
  adminToken: string;
  metrics: AdminAssignmentMetricsResponse | null;
  onAssigned: () => void;
}) {
  const [assignMode, setAssignMode] = useState<"Auto" | "Manual">("Auto");
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<string>("");
  const [savingAssign, setSavingAssign] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const unassigned = leads.filter((l) => !l.partner && l.status === "Pending");
  const autoLeads = leads.filter((l) => l.assignMode === "Auto");
  const manualLeads =
    metrics?.manualAssigned ?? leads.filter((l) => l.assignMode === "Manual").length;

  const handleAssign = async () => {
    if (!selectedLead || !selectedPartner) return;
    setSavingAssign(true);
    try {
      await assignAdminLead(adminToken, selectedLead, {
        partnerId: selectedPartner,
        mode: "MANUAL",
      });
      onAssigned();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign lead.");
      setSavingAssign(false);
      return;
    }
    setSavingAssign(false);
    setToastMsg(`Lead ${selectedLead} assigned to ${selectedPartner}`);
    setTimeout(() => setToastMsg(null), 3000);
    setSelectedLead(null);
    setSelectedPartner("");
  };

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">Lead Assignment</h2>

      <div className="admin-stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <StatCard
          label="Auto Assigned"
          value={metrics?.claimed ?? autoLeads.length}
          sub="System/claim assigned"
          icon={Zap}
          accent="#0ea5c9"
        />
        <StatCard
          label="Manual Assigned"
          value={manualLeads}
          sub="Admin assigned"
          icon={Sliders}
          accent="#8b5cf6"
        />
        <StatCard
          label="Unassigned"
          value={metrics?.unassigned ?? unassigned.length}
          sub="Awaiting partner"
          icon={AlertCircle}
          accent="#f59e0b"
        />
      </div>

      <div className="admin-two-col" style={{ marginTop: 20 }}>
        <div className="admin-card">
          <h3 className="admin-card-title">Assignment Mode Control</h3>
          <div className="admin-mode-toggle">
            <button
              type="button"
              className={`admin-mode-btn${assignMode === "Auto" ? " active" : ""}`}
              onClick={() => setAssignMode("Auto")}
            >
              <Zap size={14} /> Auto Assign
            </button>
            <button
              type="button"
              className={`admin-mode-btn${assignMode === "Manual" ? " active" : ""}`}
              onClick={() => setAssignMode("Manual")}
            >
              <Sliders size={14} /> Manual Assign
            </button>
          </div>
          <p className="admin-mode-desc">
            {assignMode === "Auto"
              ? "System automatically routes new leads to the nearest available partner based on pincode matching and current load."
              : "Admin manually selects a partner for each unassigned lead. Use this when specific expertise or territory coverage is required."}
          </p>

          {assignMode === "Manual" && (
            <div className="admin-manual-form">
              <label className="admin-form-label">Select Lead</label>
              <select
                className="admin-select"
                value={selectedLead ?? ""}
                onChange={(e) => setSelectedLead(e.target.value)}
              >
                <option value="">-- Pick a lead --</option>
                {unassigned.slice(0, 15).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.id}  {l.phone}  {l.city}
                  </option>
                ))}
              </select>

              <label className="admin-form-label" style={{ marginTop: 12 }}>
                Assign To Partner
              </label>
              <select
                className="admin-select"
                value={selectedPartner}
                onChange={(e) => setSelectedPartner(e.target.value)}
              >
                <option value="">-- Pick a partner --</option>
                {Array.from(new Set(leads.map((l) => l.partner).filter(Boolean))).map(
                  (partnerId) => (
                    <option key={partnerId} value={partnerId || ""}>
                      {partnerId}
                    </option>
                  ),
                )}
              </select>

              <button
                type="button"
                className="admin-assign-btn"
                disabled={!selectedLead || !selectedPartner || savingAssign}
                onClick={() => {
                  void handleAssign();
                }}
              >
                {savingAssign ? "Assigning..." : "Assign Lead"}
              </button>
            </div>
          )}
        </div>

        <div className="admin-card">
          <h3 className="admin-card-title">Unassigned Leads Queue</h3>
          <div className="admin-queue-list">
            {unassigned.slice(0, 8).map((l) => (
              <div key={l.id} className="admin-queue-row">
                <div>
                  <span className="admin-lead-id">{l.id}</span>
                  <span className="admin-queue-phone">{l.phone}</span>
                </div>
                <div className="admin-queue-meta">
                  <MapPin size={12} /> {l.city}  {l.pincode}
                </div>
                <span className="admin-queue-badge">Unassigned</span>
              </div>
            ))}
            {unassigned.length === 0 ? <p className="admin-muted">No unassigned leads.</p> : null}
          </div>
        </div>
      </div>

      {toastMsg && (
        <div className="admin-toast">
          <CheckCircle2 size={16} /> {toastMsg}
        </div>
      )}
    </div>
  );
}

//  Section: Location Management 

function LocationSection() {
  const [rows, setRows] = useState<ServiceabilityRow[]>([]);
  const [uploadRows, setUploadRows] = useState<ServiceabilityUploadHistoryRow[]>([]);
  const [filter, setFilter] = useState<"All" | "Active" | "Limited" | "Inactive">("All");
  const [search, setSearch] = useState("");
  const [adminToken, setAdminToken] = useState<string | null>(() =>
    localStorage.getItem("gadgetpe_admin_access_token"),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingPincode, setSavingPincode] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createPincode, setCreatePincode] = useState("");
  const [createStatus, setCreateStatus] = useState<"ACTIVE" | "INACTIVE" | "LIMITED">("ACTIVE");
  const [createReason, setCreateReason] = useState("New pincode from admin UI");
  const [validationPreview, setValidationPreview] = useState<PincodeValidationPreview | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [editingPincode, setEditingPincode] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "INACTIVE" | "LIMITED">("ACTIVE");
  const [editReason, setEditReason] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileActionId, setFileActionId] = useState<string | null>(null);

  const locationUploadHeaders = ["Pincode", "Status", "Reason"];

  const filterToStatus: Record<typeof filter, "ACTIVE" | "INACTIVE" | "LIMITED" | undefined> = {
    All: undefined,
    Active: "ACTIVE",
    Limited: "LIMITED",
    Inactive: "INACTIVE",
  };

  const fetchRows = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listServiceabilityPincodes(token, {
        status: filterToStatus[filter],
        search: search.trim() || undefined,
      });
      setRows(result.rows);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setError("Session expired. Please login again.");
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to fetch serviceability rows.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUploadRows = async (token: string) => {
    try {
      const result = await listServiceabilityUploadHistory(token);
      setUploadRows(result.rows);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setError("Session expired. Please login again.");
        return;
      }
      setUploadError(err instanceof Error ? err.message : "Unable to fetch uploaded files.");
    }
  };

  useEffect(() => {
    if (!adminToken) return;
    void fetchRows(adminToken);
    void fetchUploadRows(adminToken);
  }, [adminToken, filter, search]);

  useEffect(() => {
    if (!adminToken) return;
    if (!showCreateForm || createPincode.trim().length !== 6) {
      setValidationPreview(null);
      setValidationError(null);
      setValidationLoading(false);
      return;
    }

    const timeout = setTimeout(() => {
      setValidationLoading(true);
      setValidationError(null);
      validateServiceabilityPincode(adminToken, createPincode.trim())
        .then((preview) => {
          setValidationPreview(preview);
        })
        .catch((err) => {
          setValidationPreview(null);
          setValidationError(err instanceof Error ? err.message : "Pincode validation failed.");
        })
        .finally(() => setValidationLoading(false));
    }, 350);

    return () => clearTimeout(timeout);
  }, [adminToken, showCreateForm, createPincode]);

  const handleToggle = async (pincode: string, enabled: boolean) => {
    if (!adminToken) return;

    setSavingPincode(pincode);
    setError(null);
    try {
      await toggleServiceabilityPincode(
        adminToken,
        pincode,
        enabled,
        enabled ? "Enabled from admin UI" : "Disabled from admin UI",
      );
      await fetchRows(adminToken);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setError("Session expired. Please login again.");
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to update pincode status.");
    } finally {
      setSavingPincode(null);
    }
  };

  const handleCreate = async () => {
    if (!adminToken) return;
    if (createPincode.trim().length !== 6) {
      setError("Pincode must be 6 digits.");
      return;
    }

    setSavingPincode(createPincode.trim());
    setError(null);
    try {
      await createServiceabilityPincode(adminToken, {
        pincode: createPincode.trim(),
        status: createStatus,
        reason: createReason.trim() || "New pincode from admin UI",
      });
      setCreatePincode("");
      setCreateReason("New pincode from admin UI");
      setValidationPreview(null);
      await fetchRows(adminToken);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setError("Session expired. Please login again.");
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to create pincode.");
    } finally {
      setSavingPincode(null);
    }
  };

  const beginEdit = (row: ServiceabilityRow) => {
    setEditingPincode(row.pincode);
    setEditStatus(row.status);
    setEditReason(row.reason || "");
  };

  const handleSaveEdit = async () => {
    if (!adminToken || !editingPincode) return;

    setSavingPincode(editingPincode);
    setError(null);
    try {
      await updateServiceabilityPincode(adminToken, editingPincode, {
        status: editStatus,
        reason: editReason.trim() || "Updated from admin UI",
      });
      setEditingPincode(null);
      await fetchRows(adminToken);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setError("Session expired. Please login again.");
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to update pincode.");
    } finally {
      setSavingPincode(null);
    }
  };

  const handleDelete = async (pincode: string) => {
    if (!adminToken) return;

    setSavingPincode(pincode);
    setError(null);
    try {
      await deleteServiceabilityPincode(adminToken, pincode);
      if (editingPincode === pincode) {
        setEditingPincode(null);
      }
      await fetchRows(adminToken);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setError("Session expired. Please login again.");
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to delete pincode.");
    } finally {
      setSavingPincode(null);
    }
  };

  const handleUploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (!adminToken || files.length === 0) return;

    setUploadingFiles(true);
    setUploadError(null);
    setError(null);
    try {
      const result = await uploadServiceabilityExcel(adminToken, files);
      toast.success(`Uploaded ${result.totalProcessed} pincode rows from ${result.uploads.length} file(s).`);
      await fetchRows(adminToken);
      await fetchUploadRows(adminToken);
      event.target.value = "";
    } catch (err) {
      const message = formatUploadValidationError(err);
      setUploadError(message);
      toast.error(message);
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDeactivateUpload = async (uploadId: string) => {
    if (!adminToken) return;
    setFileActionId(uploadId);
    setUploadError(null);
    try {
      const result = await updateServiceabilityUploadStatus(adminToken, uploadId, "DEACTIVATED");
      toast.success(`Deactivated ${result.fileName}.`);
      await fetchRows(adminToken);
      await fetchUploadRows(adminToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to deactivate uploaded file.";
      setUploadError(message);
      toast.error(message);
    } finally {
      setFileActionId(null);
    }
  };

  const handleDeleteUpload = async (uploadId: string) => {
    if (!adminToken) return;
    setFileActionId(uploadId);
    setUploadError(null);
    try {
      const result = await deleteServiceabilityUpload(adminToken, uploadId);
      toast.success(`Deleted ${result.fileName}.`);
      await fetchRows(adminToken);
      await fetchUploadRows(adminToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete uploaded file.";
      setUploadError(message);
      toast.error(message);
    } finally {
      setFileActionId(null);
    }
  };

  const activeCount = rows.filter((r) => r.status === "ACTIVE").length;
  const limitedCount = rows.filter((r) => r.status === "LIMITED").length;
  const inactiveCount = rows.filter((r) => r.status === "INACTIVE").length;

  const COV_COLORS: Record<string, string> = {
    Active: "#1d9e75",
    Limited: "#f59e0b",
    Inactive: "#ef4444",
  };

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">Location Management</h2>

      <div className="admin-stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <StatCard
          label="Total Zones"
          value={rows.length}
          sub="API tracked pincodes"
          icon={MapPin}
          accent="#1d9e75"
        />
        <StatCard
          label="Active Zones"
          value={activeCount}
          sub="Service enabled"
          icon={CheckCircle2}
          accent="#1d9e75"
        />
        <StatCard
          label="Limited Zones"
          value={limitedCount}
          sub="Partial coverage"
          icon={AlertCircle}
          accent="#f59e0b"
        />
        <StatCard
          label="Inactive Zones"
          value={inactiveCount}
          sub="Service disabled"
          icon={AlertCircle}
          accent="#ef4444"
        />
      </div>

      <div className="admin-bucket-totals" style={{ marginTop: 20 }}>
        {(["All", "Active", "Limited", "Inactive"] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`admin-bucket-pill${filter === f ? " active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="admin-card" style={{ marginTop: 12 }}>
        <div className="admin-card-toprow">
          <h3 className="admin-card-title">Search Pincode</h3>
          <input
            type="search"
            placeholder="Type pincode"
            className="admin-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {error ? (
          <p className="admin-muted" style={{ color: "#ef4444" }}>
            {error}
          </p>
        ) : null}
      </div>

      <div className="admin-card" style={{ marginTop: 12 }}>
        <div className="admin-card-toprow">
          <h3 className="admin-card-title">Manage Pincodes (CRUD)</h3>
          <button
            type="button"
            className="admin-save-btn"
            onClick={() => setShowCreateForm((prev) => !prev)}
          >
            {showCreateForm ? "Close" : "+ Add Pincode"}
          </button>
        </div>

        {showCreateForm ? (
          <div className="admin-manual-form" style={{ marginTop: 12 }}>
            <label className="admin-form-label">Pincode</label>
            <input
              className="admin-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={createPincode}
              onChange={(e) => setCreatePincode(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter Indian pincode"
            />

            <label className="admin-form-label" style={{ marginTop: 10 }}>
              Status
            </label>
            <select
              className="admin-select"
              value={createStatus}
              onChange={(e) => setCreateStatus(e.target.value as "ACTIVE" | "INACTIVE" | "LIMITED")}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="LIMITED">LIMITED</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>

            <label className="admin-form-label" style={{ marginTop: 10 }}>
              Reason
            </label>
            <input
              className="admin-input"
              type="text"
              value={createReason}
              onChange={(e) => setCreateReason(e.target.value)}
            />

            {validationLoading ? (
              <p className="admin-muted">Validating pincode from backend...</p>
            ) : null}
            {validationError ? (
              <p className="admin-muted" style={{ color: "#ef4444" }}>
                {validationError}
              </p>
            ) : null}

            {validationPreview ? (
              <div className="admin-location-stats" style={{ marginTop: 10 }}>
                <span>
                  <MapPin size={12} /> {validationPreview.district}, {validationPreview.state}
                </span>
              </div>
            ) : null}

            <button
              type="button"
              className="admin-assign-btn"
              disabled={!adminToken || savingPincode === createPincode || !validationPreview}
              onClick={handleCreate}
            >
              {savingPincode === createPincode ? "Saving..." : "Create Pincode"}
            </button>
          </div>
        ) : null}
      </div>

      <div className="admin-card" style={{ marginTop: 12 }}>
        <div className="admin-card-toprow">
          <h3 className="admin-card-title">Upload Pincodes Excel</h3>
          <label className="admin-save-btn admin-upload-btn" style={{ marginTop: 0, width: "auto", cursor: uploadingFiles ? "not-allowed" : "pointer" }}>
            <Upload size={16} />
            <span>{uploadingFiles ? "Uploading..." : "Upload Excel"}</span>
            <input
              type="file"
              accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              multiple
              hidden
              disabled={!adminToken || uploadingFiles}
              onChange={handleUploadFiles}
            />
          </label>
        </div>

        <div className="admin-location-upload-rule" role="alert" aria-live="polite">
          Only these Excel column names are supported: {locationUploadHeaders.join(", ")}
        </div>

        <p className="admin-muted" style={{ marginTop: 10 }}>
          Supported file types: `.xls`, `.xlsx`. Each row will create or update a pincode record.
        </p>

        {uploadError ? (
          <p className="admin-muted" style={{ color: "#ef4444", marginTop: 10 }}>
            {uploadError}
          </p>
        ) : null}
      </div>

      <div className="admin-card" style={{ marginTop: 12 }}>
        <div className="admin-card-toprow">
          <h3 className="admin-card-title">Uploaded Files (CRUD)</h3>
          <span className="admin-muted">{uploadRows.length} file(s)</span>
        </div>

        <div className="admin-location-upload-list">
          {uploadRows.length === 0 ? (
            <p className="admin-muted">No location excel files uploaded yet.</p>
          ) : (
            uploadRows.map((row) => (
              <div key={row.id} className="admin-location-upload-card">
                <div className="admin-location-upload-head">
                  <div>
                    <p className="admin-location-area"><FileSpreadsheet size={14} /> {row.fileName}</p>
                    <p className="admin-location-city">Uploaded by {row.uploadedBy} on {new Date(row.uploadedAt).toLocaleString()}</p>
                  </div>
                  <span className={`admin-upload-status-badge${row.status === "DEACTIVATED" ? " off" : ""}`}>
                    {row.status}
                  </span>
                </div>
                <div className="admin-location-stats">
                  <span><BarChart3 size={12} /> Processed {row.totalProcessed}</span>
                  <span><CheckCircle2 size={12} /> New {row.insertedCount}</span>
                  <span><TrendingUp size={12} /> Updated {row.updatedCount}</span>
                  <span><MapPin size={12} /> Active rows {row.activeRowCount}</span>
                </div>
                <div className="admin-mode-toggle" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="admin-mode-btn"
                    disabled={!adminToken || fileActionId === row.id || row.status === "DEACTIVATED"}
                    onClick={() => handleDeactivateUpload(row.id)}
                  >
                    {fileActionId === row.id && row.status !== "DEACTIVATED" ? "Working..." : "Deactivate"}
                  </button>
                  <button
                    type="button"
                    className="admin-mode-btn"
                    disabled={!adminToken || fileActionId === row.id}
                    onClick={() => handleDeleteUpload(row.id)}
                  >
                    {fileActionId === row.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="admin-location-grid">
        {rows.map((loc) => {
          const coverage =
            loc.status === "ACTIVE" ? "Active" : loc.status === "LIMITED" ? "Limited" : "Inactive";
          return (
            <div key={loc.pincode} className="admin-location-card">
              <div className="admin-location-head">
                <div>
                  <p className="admin-location-area">Pincode {loc.pincode}</p>
                  <p className="admin-location-city">
                    {loc.district || "Unknown District"}, {loc.state || "Unknown State"}
                  </p>
                </div>
                <span
                  className="admin-coverage-badge"
                  style={{ background: `${COV_COLORS[coverage]}18`, color: COV_COLORS[coverage] }}
                >
                  {coverage}
                </span>
              </div>
              <div className="admin-location-stats">
                <span>
                  <Users size={12} /> Updated by {loc.updatedBy}
                </span>
                <span>
                  <BarChart3 size={12} /> {new Date(loc.updatedAt).toLocaleString()}
                </span>
              </div>

              {editingPincode === loc.pincode ? (
                <div className="admin-manual-form" style={{ marginTop: 10 }}>
                  <label className="admin-form-label">Status</label>
                  <select
                    className="admin-select"
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(e.target.value as "ACTIVE" | "INACTIVE" | "LIMITED")
                    }
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="LIMITED">LIMITED</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                  <label className="admin-form-label" style={{ marginTop: 8 }}>
                    Reason
                  </label>
                  <input
                    className="admin-input"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                  />
                  <div className="admin-mode-toggle" style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="admin-mode-btn active"
                      disabled={!adminToken || savingPincode === loc.pincode}
                      onClick={handleSaveEdit}
                    >
                      {savingPincode === loc.pincode ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      className="admin-mode-btn"
                      onClick={() => setEditingPincode(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="admin-mode-toggle" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className={`admin-mode-btn${loc.status === "ACTIVE" ? " active" : ""}`}
                  disabled={!adminToken || savingPincode === loc.pincode}
                  onClick={() => handleToggle(loc.pincode, true)}
                >
                  {savingPincode === loc.pincode && loc.status !== "ACTIVE"
                    ? "Saving..."
                    : "Turn ON"}
                </button>
                <button
                  type="button"
                  className={`admin-mode-btn${loc.status === "INACTIVE" ? " active" : ""}`}
                  disabled={!adminToken || savingPincode === loc.pincode}
                  onClick={() => handleToggle(loc.pincode, false)}
                >
                  {savingPincode === loc.pincode && loc.status !== "INACTIVE"
                    ? "Saving..."
                    : "Turn OFF"}
                </button>
                <button
                  type="button"
                  className="admin-mode-btn"
                  disabled={!adminToken || savingPincode === loc.pincode}
                  onClick={() => beginEdit(loc)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="admin-mode-btn"
                  disabled={!adminToken || savingPincode === loc.pincode}
                  onClick={() => handleDelete(loc.pincode)}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {loading && adminToken ? <p className="admin-muted">Loading serviceability rows...</p> : null}
    </div>
  );
}

type QuoteDeductionRuleForm = {
  answerGroup: QuoteDeductionAnswerGroup;
  answerKey: string;
  answerValue: string;
  label: string;
  deductionType: "RUPEES" | "PERCENT";
  deductionValue: string;
  maxDeductionAmount: string;
  priority: string;
  appliesToBrand: string;
  appliesToModelId: string;
  isActive: boolean;
};

const emptyDeductionRuleForm: QuoteDeductionRuleForm = {
  answerGroup: "basicFunctionality",
  answerKey: "",
  answerValue: "",
  label: "",
  deductionType: "RUPEES",
  deductionValue: "",
  maxDeductionAmount: "",
  priority: "100",
  appliesToBrand: "",
  appliesToModelId: "",
  isActive: true,
};

type QuotePreviewForm = {
  brandSlug: string;
  modelId: string;
  modelName: string;
  listedPrice: string;
  answerGroup: QuoteDeductionAnswerGroup;
  answerKey: string;
  answerValue: string;
};

const defaultPreviewForm: QuotePreviewForm = {
  brandSlug: "",
  modelId: "",
  modelName: "",
  listedPrice: "",
  answerGroup: "basicFunctionality",
  answerKey: "",
  answerValue: "",
};

function parseRuleForm(form: QuoteDeductionRuleForm): QuoteDeductionRuleInput {
  const deductionValue = Number(form.deductionValue);
  if (!Number.isFinite(deductionValue) || deductionValue < 0)
    throw new Error("Deduction value must be a valid non-negative number.");
  const maxDeductionAmount = form.maxDeductionAmount.trim()
    ? Number(form.maxDeductionAmount)
    : null;
  if (
    maxDeductionAmount !== null &&
    (!Number.isFinite(maxDeductionAmount) || maxDeductionAmount < 0)
  )
    throw new Error("Max deduction amount must be a valid non-negative number.");
  const priority = form.priority.trim() ? Number(form.priority) : 100;
  if (!Number.isInteger(priority) || priority < 0)
    throw new Error("Priority must be a non-negative integer.");
  if (!form.label.trim()) throw new Error("Label is required.");
  if (!form.answerKey.trim()) throw new Error("Answer key is required.");
  return {
    answerGroup: form.answerGroup,
    answerKey: form.answerKey.trim(),
    answerValue: form.answerValue.trim() || null,
    label: form.label.trim(),
    deductionType: form.deductionType,
    deductionValue,
    maxDeductionAmount,
    priority,
    isActive: form.isActive,
    appliesToBrand: form.appliesToBrand.trim() || null,
    appliesToModelId: form.appliesToModelId.trim() || null,
  };
}

const quoteAnswerGroups: { value: QuoteDeductionAnswerGroup; label: string }[] = [
  { value: "basicFunctionality", label: "Basic Functionality" },
  { value: "physicalIssues", label: "Physical Issues" },
  { value: "nestedPhysicalIssueAnswers", label: "Physical Issue Details" },
  { value: "cameraAndBiometrics", label: "Camera & Biometrics" },
  { value: "sensorsAndConnectivity", label: "Sensors & Connectivity" },
  { value: "batteryAndCharging", label: "Battery & Charging" },
  { value: "accessoriesAndOwnership", label: "Accessories & Ownership" },
];

function buildPreviewDetails(form: QuotePreviewForm): UserSellFlowDeviceDetails {
  const { answerGroup, answerKey, answerValue } = form;
  const base: UserSellFlowDeviceDetails = {
    basicFunctionality: {},
    physicalIssues: [],
    nestedPhysicalIssueAnswers: {},
    cameraAndBiometrics: {},
    sensorsAndConnectivity: {},
    batteryAndCharging: {},
    accessoriesAndOwnership: {},
  };
  if (!answerKey.trim()) return base;
  if (answerGroup === "physicalIssues") {
    return { ...base, physicalIssues: [answerKey.trim()] };
  }
  if (answerGroup === "nestedPhysicalIssueAnswers") {
    return { ...base, nestedPhysicalIssueAnswers: { [answerKey.trim()]: answerValue.trim() } };
  }
  return { ...base, [answerGroup]: { [answerKey.trim()]: answerValue.trim() || "yes" } };
}

function ruleToForm(rule: QuoteDeductionRule): QuoteDeductionRuleForm {
  return {
    answerGroup: rule.answerGroup,
    answerKey: rule.answerKey,
    answerValue: rule.answerValue ?? "",
    label: rule.label,
    deductionType: rule.deductionType,
    deductionValue: String(rule.deductionValue),
    maxDeductionAmount: rule.maxDeductionAmount != null ? String(rule.maxDeductionAmount) : "",
    priority: String(rule.priority),
    appliesToBrand: rule.appliesToBrand ?? "",
    appliesToModelId: rule.appliesToModelId ?? "",
    isActive: rule.isActive,
  };
}

type CatalogQuestion = { key: string; label: string; options: string[] };
const _YN = ["yes", "no"] as const;
const _YNA = ["yes", "no", "na"] as const;

type QuestionRuleDraft = {
  ruleId: string | null;
  answerValue: string;
  label: string;
  deductionType: "RUPEES" | "PERCENT";
  deductionValue: string;
  maxDeductionAmount: string;
  priority: string;
  isActive: boolean;
  appliesToBrand: string;
  appliesToModelId: string;
};

const DEVICE_QUESTION_CATALOG: Record<QuoteDeductionAnswerGroup, CatalogQuestion[]> = {
  basicFunctionality: [
    { key: "canMakeCalls", label: "Can make or receive calls?", options: [..._YNA] },
    { key: "touchWorking", label: "Touch screen working?", options: [..._YNA] },
    { key: "screenReplaced", label: "Screen been replaced?", options: [..._YNA] },
    { key: "displayWorking", label: "Display brightness & color OK?", options: [..._YNA] },
    { key: "originalDisplay", label: "Display is original?", options: [..._YNA] },
  ],
  physicalIssues: [
    { key: "Any Dead spots", label: "Any Dead spots", options: [] },
    { key: "Broken or Screen Scratches", label: "Broken or Screen Scratches", options: [] },
    { key: "Dent or Marks on body", label: "Dent / Marks on body", options: [] },
    { key: "Device Panel Broken / Missing", label: "Device Panel Broken / Missing", options: [] },
  ],
  nestedPhysicalIssueAnswers: [
    {
      key: "Any Dead spots",
      label: "Dead spots  where?",
      options: ["Top", "Bottom", "Left side", "Right side", "Multiple areas"],
    },
    {
      key: "Broken or Screen Scratches",
      label: "Screen damage  how bad?",
      options: ["Minor scratches", "Visible scratches", "Cracked glass", "Display bleeding"],
    },
    {
      key: "Dent or Marks on body",
      label: "Body damage  where?",
      options: ["Back panel", "Side frame", "Corners", "Multiple sides"],
    },
    {
      key: "Device Panel Broken / Missing",
      label: "Panel  what condition?",
      options: [
        "Back panel broken",
        "Back panel missing",
        "Camera glass broken",
        "Buttons missing",
      ],
    },
  ],
  cameraAndBiometrics: [
    { key: "frontCamera", label: "Front camera working?", options: [..._YNA] },
    { key: "rearCamera", label: "Rear camera working?", options: [..._YNA] },
    { key: "cameraFlash", label: "Camera flash working?", options: [..._YNA] },
    { key: "faceUnlock", label: "Face ID / Face Unlock working?", options: [..._YNA] },
    { key: "fingerprintSensor", label: "Fingerprint sensor working?", options: [..._YNA] },
    { key: "microphone", label: "Microphone working?", options: [..._YNA] },
    { key: "speaker", label: "Speaker working?", options: [..._YNA] },
    { key: "earSpeaker", label: "Ear speaker working?", options: [..._YNA] },
  ],
  sensorsAndConnectivity: [
    { key: "proximitySensor", label: "Proximity sensor working?", options: [..._YN] },
    { key: "gyroSensor", label: "Gyro sensor working?", options: [..._YN] },
    { key: "accelerometer", label: "Accelerometer / auto-rotate OK?", options: [..._YN] },
    { key: "wifi", label: "WiFi working?", options: [..._YN] },
    { key: "bluetooth", label: "Bluetooth working?", options: [..._YN] },
    { key: "gps", label: "GPS / Location working?", options: [..._YN] },
    { key: "simNetwork", label: "SIM network working?", options: [..._YN] },
    { key: "vibration", label: "Vibration working?", options: [..._YN] },
  ],
  batteryAndCharging: [
    { key: "charging", label: "Phone charging properly?", options: [..._YNA] },
    { key: "chargingPort", label: "Charging port loose or damaged?", options: [..._YNA] },
    { key: "batteryDrain", label: "Battery drains quickly?", options: [..._YNA] },
    { key: "heating", label: "Phone heats abnormally?", options: [..._YNA] },
    { key: "autoRestart", label: "Phone restarts automatically?", options: [..._YNA] },
    { key: "volumeButtons", label: "Volume buttons working?", options: [..._YNA] },
    { key: "powerButton", label: "Power button working?", options: [..._YNA] },
    { key: "alertSlider", label: "Silent switch / alert slider working?", options: [..._YNA] },
  ],
  accessoriesAndOwnership: [
    { key: "originalBox", label: "Has original box?", options: [..._YN] },
    { key: "originalCharger", label: "Has original charger?", options: [..._YN] },
    { key: "billInvoice", label: "Has bill / invoice?", options: [..._YN] },
    { key: "underWarranty", label: "Under warranty?", options: [..._YN] },
    { key: "repairedBefore", label: "Repaired before?", options: [..._YN] },
    { key: "accountLocked", label: "Locked by iCloud / Google account?", options: [..._YN] },
    { key: "imeiAvailable", label: "IMEI available and matching?", options: [..._YN] },
    { key: "waterDamage", label: "Water damage present?", options: [..._YN] },
  ],
};

function makeQuestionDraft(
  answerGroup: QuoteDeductionAnswerGroup,
  question: CatalogQuestion,
  existingRule?: QuoteDeductionRule,
): QuestionRuleDraft {
  return {
    ruleId: existingRule?.id || null,
    answerValue: existingRule?.answerValue ?? "",
    label: existingRule?.label || question.label,
    deductionType: existingRule?.deductionType || "RUPEES",
    deductionValue: existingRule ? String(existingRule.deductionValue) : "",
    maxDeductionAmount:
      existingRule?.maxDeductionAmount != null ? String(existingRule.maxDeductionAmount) : "",
    priority: existingRule ? String(existingRule.priority) : "100",
    isActive: existingRule?.isActive ?? true,
    appliesToBrand: existingRule?.appliesToBrand ?? "",
    appliesToModelId: existingRule?.appliesToModelId ?? "",
  };
}

function buildGroupRuleDrafts(rules: QuoteDeductionRule[]) {
  const grouped = {} as Record<
    QuoteDeductionAnswerGroup,
    Record<string, QuestionRuleDraft>
  >;

  quoteAnswerGroups.forEach((group) => {
    const questions = DEVICE_QUESTION_CATALOG[group.value] || [];
    grouped[group.value] = {};
    questions.forEach((question) => {
      const existing = rules.find(
        (rule) => rule.answerGroup === group.value && rule.answerKey === question.key,
      );
      grouped[group.value][question.key] = makeQuestionDraft(group.value, question, existing);
    });
  });

  return grouped;
}

function buildRuleSummary(form: QuoteDeductionRuleForm): string {
  const questions = DEVICE_QUESTION_CATALOG[form.answerGroup];
  const question = questions?.find((q) => q.key === form.answerKey);
  if (!question || !form.answerKey) return "";
  const isPhysical = form.answerGroup === "physicalIssues";
  const condition = isPhysical
    ? `user reports "${question.label}"`
    : form.answerValue
      ? `user answers "${form.answerValue}" to "${question.label}"`
      : `user answers anything to "${question.label}"`;
  const deductionAmt = form.deductionValue
    ? form.deductionType === "PERCENT"
      ? `${form.deductionValue}%`
      : `Rs.\u00a0${Number(form.deductionValue).toLocaleString("en-IN")}`
    : "[amount not set]";
  const cap = form.maxDeductionAmount
    ? `, capped at Rs.\u00a0${Number(form.maxDeductionAmount).toLocaleString("en-IN")}`
    : "";
  return `When ${condition}  deduct ${deductionAmt}${cap}`;
}

function PriceManagementSection() {
  const [adminToken, setAdminToken] = useState<string | null>(() =>
    localStorage.getItem("gadgetpe_admin_access_token"),
  );
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<DevicePriceCatalogRow[]>([]);
  const [uploadHistory, setUploadHistory] = useState<DevicePriceUploadHistoryRow[]>([]);
  const [expectedHeaders, setExpectedHeaders] = useState<string[]>([
    "Brand",
    "Series",
    "Model",
    "Variant",
    "Launch Year",
    "GadgetPe Price",
  ]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadInputKey, setUploadInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUploadSummary, setLastUploadSummary] = useState<string[] | null>(null);
  const [uploadActionId, setUploadActionId] = useState<string | null>(null);
  const [uploadActionType, setUploadActionType] = useState<
    "activate" | "deactivate" | "delete" | null
  >(null);
  const [deductionRules, setDeductionRules] = useState<QuoteDeductionRule[]>([]);
  const [deductionForm, setDeductionForm] =
    useState<QuoteDeductionRuleForm>(emptyDeductionRuleForm);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [savingRule, setSavingRule] = useState(false);
  const [ruleActionId, setRuleActionId] = useState<string | null>(null);
  const [groupRuleDrafts, setGroupRuleDrafts] = useState<
    Record<QuoteDeductionAnswerGroup, Record<string, QuestionRuleDraft>>
  >(() => buildGroupRuleDrafts([]));
  const [savingQuestionKey, setSavingQuestionKey] = useState<string | null>(null);
  const [previewForm, setPreviewForm] = useState<QuotePreviewForm>(defaultPreviewForm);
  const [quotePreview, setQuotePreview] = useState<UserSellFlowQuote | null>(null);
  const [previewingQuote, setPreviewingQuote] = useState(false);
  const [isCatalogExpanded, setIsCatalogExpanded] = useState(false);

  const fetchCatalog = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listPriceCatalog(token, search.trim() || undefined);
      setRows(result.rows);
      setExpectedHeaders(result.expectedHeaders);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setError("Session expired. Please login again.");
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to fetch price catalog.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUploadHistory = async (token: string) => {
    try {
      const result = await listPriceUploadHistory(token);
      setUploadHistory(result.rows);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setError("Session expired. Please login again.");
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to fetch upload history.");
    }
  };

  const fetchDeductionRules = async (token: string) => {
    try {
      const result = await listQuoteDeductionRules(token);
      setDeductionRules(result.rows);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setError("Session expired. Please login again.");
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to fetch quote deduction rules.");
    }
  };

  useEffect(() => {
    if (!adminToken) return;
    void fetchCatalog(adminToken);
    void fetchUploadHistory(adminToken);
    void fetchDeductionRules(adminToken);
  }, [adminToken, search]);

  useEffect(() => {
    setGroupRuleDrafts(buildGroupRuleDrafts(deductionRules));
  }, [deductionRules]);

  const updateQuestionDraft = (
    group: QuoteDeductionAnswerGroup,
    questionKey: string,
    patch: Partial<QuestionRuleDraft>,
  ) => {
    setGroupRuleDrafts((prev) => ({
      ...prev,
      [group]: {
        ...(prev[group] || {}),
        [questionKey]: {
          ...(prev[group]?.[questionKey] ||
            makeQuestionDraft(group, { key: questionKey, label: questionKey, options: [] })),
          ...patch,
        },
      },
    }));
  };

  const saveQuestionRule = async (group: QuoteDeductionAnswerGroup, question: CatalogQuestion) => {
    if (!adminToken) return;

    const draft = groupRuleDrafts[group]?.[question.key] || makeQuestionDraft(group, question);
    const saveKey = `${group}:${question.key}`;

    const deductionValue = Number(draft.deductionValue);
    if (!Number.isFinite(deductionValue) || deductionValue < 0) {
      toast.error("Deduction value must be a valid non-negative number.");
      return;
    }

    const priority = draft.priority.trim() ? Number(draft.priority) : 100;
    if (!Number.isInteger(priority) || priority < 0) {
      toast.error("Priority must be a non-negative integer.");
      return;
    }

    const maxCap = draft.maxDeductionAmount.trim() ? Number(draft.maxDeductionAmount) : null;
    if (maxCap !== null && (!Number.isFinite(maxCap) || maxCap < 0)) {
      toast.error("Max deduction amount must be a valid non-negative number.");
      return;
    }

    const payload: QuoteDeductionRuleInput = {
      answerGroup: group,
      answerKey: question.key,
      answerValue: group === "physicalIssues" ? null : draft.answerValue.trim() || null,
      label: draft.label.trim() || question.label,
      deductionType: draft.deductionType,
      deductionValue,
      maxDeductionAmount: maxCap,
      priority,
      isActive: draft.isActive,
      appliesToBrand: draft.appliesToBrand.trim() || null,
      appliesToModelId: draft.appliesToModelId.trim() || null,
    };

    setSavingQuestionKey(saveKey);
    setError(null);
    try {
      if (draft.ruleId) {
        await updateQuoteDeductionRule(adminToken, draft.ruleId, payload);
        toast.success("Rule updated.");
      } else {
        await createQuoteDeductionRule(adminToken, payload);
        toast.success("Rule created.");
      }
      await fetchDeductionRules(adminToken);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setError("Session expired. Please login again.");
        toast.error("Session expired. Please connect again.");
        return;
      }
      const message = err instanceof Error ? err.message : "Unable to save deduction rule.";
      setError(message);
      toast.error(message);
    } finally {
      setSavingQuestionKey(null);
    }
  };

  const resetRuleForm = () => {
    setDeductionForm(emptyDeductionRuleForm);
    setEditingRuleId(null);
  };

  const saveDeductionRule = async () => {
    if (!adminToken) return;

    setSavingRule(true);
    setError(null);

    try {
      const input = parseRuleForm(deductionForm);
      if (editingRuleId) {
        await updateQuoteDeductionRule(adminToken, editingRuleId, input);
        toast.success("Deduction rule updated.");
      } else {
        await createQuoteDeductionRule(adminToken, input);
        toast.success("Deduction rule created.");
      }
      resetRuleForm();
      await fetchDeductionRules(adminToken);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setError("Session expired. Please login again.");
        toast.error("Session expired. Please connect again.");
        return;
      }

      const message = err instanceof Error ? err.message : "Unable to save deduction rule.";
      setError(message);
      toast.error(message);
    } finally {
      setSavingRule(false);
    }
  };

  const handleToggleRule = async (rule: QuoteDeductionRule) => {
    if (!adminToken) return;

    setRuleActionId(rule.id);
    setError(null);
    try {
      await toggleQuoteDeductionRule(adminToken, rule.id, !rule.isActive);
      await fetchDeductionRules(adminToken);
      toast.success(!rule.isActive ? "Deduction rule activated." : "Deduction rule paused.");
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setError("Session expired. Please login again.");
        toast.error("Session expired. Please connect again.");
        return;
      }
      const message = err instanceof Error ? err.message : "Unable to update deduction rule.";
      setError(message);
      toast.error(message);
    } finally {
      setRuleActionId(null);
    }
  };

  const runQuotePreview = async () => {
    if (!adminToken) return;
    if (!previewForm.answerKey.trim()) {
      setError("Preview answer key is required.");
      return;
    }

    const listedPrice = Number(previewForm.listedPrice);
    if (!Number.isFinite(listedPrice) || listedPrice < 0) {
      setError("Preview base price must be a valid number.");
      return;
    }

    setPreviewingQuote(true);
    setError(null);
    try {
      const result = await previewQuoteDeductions(adminToken, {
        selectedModel: {
          brandSlug: previewForm.brandSlug.trim(),
          modelId: previewForm.modelId.trim(),
          modelName: previewForm.modelName.trim(),
          listedPrice: Math.round(listedPrice),
        },
        deviceDetails: buildPreviewDetails(previewForm),
      });
      setQuotePreview(result.quote);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setError("Session expired. Please login again.");
        toast.error("Session expired. Please connect again.");
        return;
      }
      const message = err instanceof Error ? err.message : "Unable to preview quote.";
      setError(message);
      toast.error(message);
    } finally {
      setPreviewingQuote(false);
    }
  };

  const uploadFile = async () => {
    if (!adminToken) return;
    if (selectedFiles.length === 0) {
      setError("Please choose at least one Excel file before upload.");
      toast.error("Please choose at least one Excel file before upload.");
      return;
    }

    setUploading(true);
    setError(null);
    setLastUploadSummary(null);

    try {
      const summary = await uploadPricingExcel(adminToken, selectedFiles);
      setLastUploadSummary(
        summary.uploads.map(
          (item) =>
            `Uploaded ${item.sourceFileName}: processed ${item.totalProcessed}, inserted ${item.insertedCount}, updated ${item.updatedCount}`,
        ),
      );
      toast.success(
        selectedFiles.length === 1
          ? "Price catalog uploaded successfully."
          : `${selectedFiles.length} price catalogs uploaded successfully.`,
      );
      setExpectedHeaders(summary.expectedHeaders);
      setSelectedFiles([]);
      setUploadInputKey((value) => value + 1);
      await fetchCatalog(adminToken);
      await fetchUploadHistory(adminToken);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setError("Session expired. Please login again.");
        toast.error("Session expired. Please connect again.");
        return;
      }

      const message = formatUploadValidationError(err);
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateUploadStatus = async (
    uploadId: string,
    status: "ACTIVE" | "DEACTIVATED",
  ) => {
    if (!adminToken) return;

    setUploadActionId(uploadId);
    setUploadActionType(status === "ACTIVE" ? "activate" : "deactivate");
    setError(null);
    try {
      const result = await updatePriceUploadStatus(adminToken, uploadId, status);
      if (status === "ACTIVE") {
        toast.success(
          `Activated ${result.fileName}${
            typeof result.restoredCatalogRows === "number"
              ? ` (${result.restoredCatalogRows} rows restored)`
              : ""
          }.`,
        );
      } else {
        toast.success(
          `Deactivated ${result.fileName}${
            typeof result.deactivatedCatalogRows === "number"
              ? ` (${result.deactivatedCatalogRows} rows removed from active catalog)`
              : ""
          }.`,
        );
      }
      await fetchCatalog(adminToken);
      await fetchUploadHistory(adminToken);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setError("Session expired. Please login again.");
        toast.error("Session expired. Please connect again.");
        return;
      }
      const message = err instanceof Error ? err.message : "Unable to remove upload.";
      setError(message);
      toast.error(message);
    } finally {
      setUploadActionId(null);
      setUploadActionType(null);
    }
  };

  const handleDeleteUpload = async (uploadId: string) => {
    if (!adminToken) return;

    setUploadActionId(uploadId);
    setUploadActionType("delete");
    setError(null);
    try {
      const result = await deletePriceUpload(adminToken, uploadId);
      toast.success(
        `Deleted ${result.fileName} (${result.deletedSnapshotRows} snapshot rows removed).`,
      );
      await fetchCatalog(adminToken);
      await fetchUploadHistory(adminToken);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setError("Session expired. Please login again.");
        toast.error("Session expired. Please connect again.");
        return;
      }

      const message = err instanceof Error ? err.message : "Unable to delete upload.";
      setError(message);
      toast.error(message);
    } finally {
      setUploadActionId(null);
      setUploadActionType(null);
    }
  };

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">Price Management</h2>

      <div className="admin-card">
        <h3 className="admin-card-title">Required Excel Column Labels (Strict)</h3>
        <p className="admin-muted">Use exact headers and same order:</p>
        <div className="admin-location-stats" style={{ marginTop: 8 }}>
          {expectedHeaders.map((header) => (
            <span key={header}>{header}</span>
          ))}
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 12 }}>
        <h3 className="admin-card-title">Upload Price Excel</h3>

        <input
          key={uploadInputKey}
          type="file"
          accept=".xlsx,.xls"
          multiple
          className="admin-input"
          onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
        />

        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            className="admin-save-btn"
            disabled={!adminToken || uploading || selectedFiles.length === 0}
            onClick={uploadFile}
          >
            {uploading ? "Uploading..." : "Upload and Save"}
          </button>
        </div>

        {selectedFiles.length > 0 ? (
          <div className="admin-muted">
            <p>
              Selected {selectedFiles.length} file{selectedFiles.length === 1 ? "" : "s"}:
            </p>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              {selectedFiles.map((file) => (
                <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {lastUploadSummary ? (
          <div className="admin-muted" style={{ color: "#1d9e75" }}>
            {lastUploadSummary.map((item) => (
              <p key={item} style={{ margin: "4px 0" }}>
                {item}
              </p>
            ))}
          </div>
        ) : null}
        {error ? (
          <p className="admin-muted" style={{ color: "#ef4444" }}>
            {error}
          </p>
        ) : null}
      </div>

      <div className="admin-pricing-deduction-grid">
        <div className="admin-card">
          <div className="admin-card-toprow">
            <h3 className="admin-card-title">Quote Deduction Rule Master</h3>
          </div>

          <p className="admin-muted" style={{ marginBottom: 10 }}>
            Each question group has a separate master accordion. Configure deduction type
            (Percent or Rupees), value, and save rule per question.
          </p>

          <div style={{ display: "grid", gap: 10 }}>
            {quoteAnswerGroups.map((group) => {
              const questions = DEVICE_QUESTION_CATALOG[group.value] || [];
              const activeCount = deductionRules.filter(
                (rule) => rule.answerGroup === group.value && rule.isActive,
              ).length;

              return (
                <details key={group.value} className="admin-card" style={{ margin: 0 }}>
                  <summary
                    style={{
                      cursor: "pointer",
                      fontWeight: 700,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>{group.label}</span>
                    <span
                      className="admin-muted"
                      style={{ fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 8 }}
                    >
                      <span>
                        {questions.length} questions  {activeCount} active rules
                      </span>
                      <ChevronDown size={16} aria-hidden="true" />
                    </span>
                  </summary>

                  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    {questions.map((question) => {
                      const draft =
                        groupRuleDrafts[group.value]?.[question.key] ||
                        makeQuestionDraft(group.value, question);
                      const saveKey = `${group.value}:${question.key}`;
                      const running = savingQuestionKey === saveKey;
                      const existingRule = draft.ruleId
                        ? deductionRules.find((rule) => rule.id === draft.ruleId)
                        : null;

                      return (
                        <div
                          key={question.key}
                          style={{ border: "1px solid #1f4d3f2b", borderRadius: 10, padding: 10 }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 12,
                              flexWrap: "wrap",
                            }}
                          >
                            <strong>{question.label}</strong>
                            <span className="admin-muted">
                              {existingRule
                                ? existingRule.isActive
                                  ? "Rule ACTIVE"
                                  : "Rule PAUSED"
                                : "No rule yet"}
                            </span>
                          </div>

                          <div className="admin-rule-form-grid compact" style={{ marginTop: 8 }}>
                            {group.value === "physicalIssues" ? (
                              <label className="admin-field-row">
                                <span className="admin-form-label">Trigger</span>
                                <span className="admin-rule-trigger-hint">Issue reported</span>
                              </label>
                            ) : (
                              <label className="admin-field-row">
                                <span className="admin-form-label">Answer Value</span>
                                <select
                                  className="admin-select"
                                  value={draft.answerValue}
                                  onChange={(e) =>
                                    updateQuestionDraft(group.value, question.key, {
                                      answerValue: e.target.value,
                                    })
                                  }
                                >
                                  <option value="">any answer</option>
                                  {question.options.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            )}

                            <label className="admin-field-row">
                              <span className="admin-form-label">Label</span>
                              <input
                                className="admin-input"
                                value={draft.label}
                                onChange={(e) =>
                                  updateQuestionDraft(group.value, question.key, {
                                    label: e.target.value,
                                  })
                                }
                                placeholder={question.label}
                              />
                            </label>

                            <label className="admin-field-row">
                              <span className="admin-form-label">Price Deduction</span>
                              <div style={{ display: "inline-flex", gap: 6 }}>
                                <button
                                  type="button"
                                  className="admin-mode-btn"
                                  style={{
                                    borderColor:
                                      draft.deductionType === "PERCENT" ? "#0f766e" : undefined,
                                    color:
                                      draft.deductionType === "PERCENT" ? "#0f766e" : undefined,
                                  }}
                                  onClick={() =>
                                    updateQuestionDraft(group.value, question.key, {
                                      deductionType: "PERCENT",
                                    })
                                  }
                                >
                                  %
                                </button>
                                <button
                                  type="button"
                                  className="admin-mode-btn"
                                  style={{
                                    borderColor:
                                      draft.deductionType === "RUPEES" ? "#0f766e" : undefined,
                                    color:
                                      draft.deductionType === "RUPEES" ? "#0f766e" : undefined,
                                  }}
                                  onClick={() =>
                                    updateQuestionDraft(group.value, question.key, {
                                      deductionType: "RUPEES",
                                    })
                                  }
                                >
                                  Rs
                                </button>
                              </div>
                            </label>

                            <label className="admin-field-row">
                              <span className="admin-form-label">Value</span>
                              <input
                                className="admin-input"
                                type="number"
                                min="0"
                                value={draft.deductionValue}
                                onChange={(e) =>
                                  updateQuestionDraft(group.value, question.key, {
                                    deductionValue: e.target.value,
                                  })
                                }
                                placeholder={draft.deductionType === "PERCENT" ? "10" : "1000"}
                              />
                            </label>
                          </div>

                          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="admin-save-btn"
                              disabled={!adminToken || running}
                              onClick={() => void saveQuestionRule(group.value, question)}
                            >
                              {running ? "Saving..." : draft.ruleId ? "Update Rule" : "Save Rule"}
                            </button>
                            {existingRule ? (
                              <button
                                type="button"
                                className="admin-mode-btn"
                                disabled
                                onClick={() => void handleToggleRule(existingRule)}
                              >
                                Pause
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-toprow">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <h3 className="admin-card-title" style={{ margin: 0 }}>
                Quote Preview
              </h3>
              <span className="admin-muted" style={{ fontWeight: 600 }}>
                Paused now
              </span>
            </div>
            <button
              type="button"
              className="admin-mode-btn"
              disabled={!adminToken || previewingQuote}
              onClick={runQuotePreview}
            >
              {previewingQuote ? "Calculating..." : "Calculate"}
            </button>
          </div>
          <div className="admin-rule-form-grid compact">
            <input
              className="admin-input"
              value={previewForm.brandSlug}
              onChange={(e) => setPreviewForm((prev) => ({ ...prev, brandSlug: e.target.value }))}
              placeholder="Brand slug"
            />
            <input
              className="admin-input"
              value={previewForm.modelId}
              onChange={(e) => setPreviewForm((prev) => ({ ...prev, modelId: e.target.value }))}
              placeholder="Model ID"
            />
            <input
              className="admin-input"
              value={previewForm.modelName}
              onChange={(e) => setPreviewForm((prev) => ({ ...prev, modelName: e.target.value }))}
              placeholder="Model name"
            />
            <input
              className="admin-input"
              type="number"
              value={previewForm.listedPrice}
              onChange={(e) => setPreviewForm((prev) => ({ ...prev, listedPrice: e.target.value }))}
              placeholder="Base price"
            />
            <select className="admin-select" value={previewForm.answerGroup} disabled>
              <option value={previewForm.answerGroup}>Pause</option>
            </select>
            <input
              className="admin-input"
              value={previewForm.answerKey}
              onChange={(e) => setPreviewForm((prev) => ({ ...prev, answerKey: e.target.value }))}
              placeholder="Answer key"
            />
            <input
              className="admin-input"
              value={previewForm.answerValue}
              onChange={(e) => setPreviewForm((prev) => ({ ...prev, answerValue: e.target.value }))}
              placeholder="Answer value"
            />
          </div>

          {quotePreview ? (
            <div className="admin-quote-preview-box">
              <span>Base Rs. {toInr(Math.round(quotePreview.basePrice || 0))}</span>
              <span>Deduction Rs. {toInr(Math.round(quotePreview.totalDeduction || 0))}</span>
              <strong>Quote Rs. {toInr(Math.round(quotePreview.sellingPrice))}</strong>
              <div className="admin-quote-deduction-list">
                {(quotePreview.deductions || []).map((item) => (
                  <span key={item.ruleId}>
                    {item.label}: -Rs. {toInr(Math.round(item.deductionAmount))}
                  </span>
                ))}
                {quotePreview.deductions?.length === 0 ? (
                  <span>No active deductions matched.</span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 12 }}>
        <div className="admin-card-toprow">
          <h3 className="admin-card-title">Saved Quote Deduction Rules</h3>
          <button
            type="button"
            className="admin-mode-btn"
            disabled={!adminToken}
            onClick={() => adminToken && fetchDeductionRules(adminToken)}
          >
            Refresh
          </button>
        </div>
        <div className="lead-table-wrap" style={{ margin: 0 }}>
          <table className="lead-table admin-lead-table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Condition</th>
                <th>Deduction</th>
                <th>Scope</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {deductionRules.map((rule) => (
                <tr key={rule.id}>
                  <td>
                    {rule.label}
                    <br />
                    <span className="admin-muted">Priority {rule.priority}</span>
                  </td>
                  <td>
                    {rule.answerGroup}.{rule.answerKey}
                    {rule.answerValue ? ` = ${rule.answerValue}` : ""}
                  </td>
                  <td>
                    {rule.deductionType === "PERCENT"
                      ? `${rule.deductionValue}%`
                      : `Rs. ${toInr(rule.deductionValue)}`}
                  </td>
                  <td>
                    {rule.appliesToBrand || "All brands"}
                    {rule.appliesToModelId ? ` / ${rule.appliesToModelId}` : ""}
                  </td>
                  <td>
                    <span
                      className="admin-location-status"
                      style={{ color: rule.isActive ? "#15803d" : "#b45309" }}
                    >
                      {rule.isActive ? "ACTIVE" : "PAUSED"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-rule-actions">
                      <button
                        type="button"
                        className="admin-mode-btn"
                        disabled
                        onClick={() => handleToggleRule(rule)}
                      >
                        Pause
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {deductionRules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-muted">
                    No quote deduction rules found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 12 }}>
        <div className="admin-card-toprow">
          <h3 className="admin-card-title">Saved Price Catalog</h3>
          <button
            type="button"
            className="admin-mode-btn"
            onClick={() => setIsCatalogExpanded((prev) => !prev)}
          >
            {isCatalogExpanded ? "Hide Catalog" : "Show Catalog"}
          </button>
        </div>

        {isCatalogExpanded ? (
          <>
            <div style={{ marginTop: 10 }}>
              <input
                type="search"
                placeholder="Search brand, series, model"
                className="admin-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="lead-table-wrap" style={{ margin: "12px 0 0 0" }}>
              <table className="lead-table admin-lead-table">
                <thead>
                  <tr>
                    <th>Brand</th>
                    <th>Series</th>
                    <th>Model</th>
                    <th>Storage</th>
                    <th>Launch Year</th>
                    <th>Listed Price</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.row?.Brand || row.brand}</td>
                      <td>{row.row?.Series || row.series}</td>
                      <td>{row.row?.Model || row.model}</td>
                      <td>{row.row?.Storage || row.storage}</td>
                      <td>{row.row?.["Launch Year"] || row.launchYear}</td>
                      <td className="admin-price">Rs. {toInr(Math.round(row.cashifyPrice))}</td>
                      <td className="admin-muted">{new Date(row.updatedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="admin-muted">
                        No price catalog rows found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {loading ? <p className="admin-muted">Loading catalog...</p> : null}
          </>
        ) : (
          <p className="admin-muted" style={{ marginTop: 10 }}>
            Click "Show Catalog" to view table data.
          </p>
        )}
      </div>

      <div className="admin-card" style={{ marginTop: 12 }}>
        <div className="admin-card-toprow">
          <h3 className="admin-card-title">Upload History</h3>
          <button
            type="button"
            className="admin-mode-btn"
            disabled={!adminToken}
            onClick={() => adminToken && fetchUploadHistory(adminToken)}
          >
            Refresh
          </button>
        </div>

        <div className="lead-table-wrap" style={{ margin: 0 }}>
          <table className="lead-table admin-lead-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Status</th>
                <th>Uploaded By</th>
                <th>Uploaded At</th>
                <th>Processed</th>
                <th>Active Rows</th>
                <th>Deactivated Rows</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {uploadHistory.map((item) => {
                const busy = uploadActionId === item.id;
                return (
                  <tr key={item.id}>
                    <td>{item.fileName}</td>
                    <td>
                      <span
                        className="admin-location-status"
                        style={{ color: item.status === "ACTIVE" ? "#15803d" : "#b45309" }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>{item.uploadedBy}</td>
                    <td className="admin-muted">{new Date(item.uploadedAt).toLocaleString()}</td>
                    <td>
                      {item.totalProcessed} ({item.insertedCount} new, {item.updatedCount} updated)
                    </td>
                    <td>{item.activeRowCount}</td>
                    <td>{item.deactivatedRowCount}</td>
                    <td>
                      <div className="admin-rule-actions">
                        {item.status === "DEACTIVATED" ? (
                          <button
                            type="button"
                            className="admin-mode-btn"
                            disabled={!adminToken || busy}
                            onClick={() => handleUpdateUploadStatus(item.id, "ACTIVE")}
                            title="Activate upload"
                          >
                            <Power size={14} /> Activate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="admin-mode-btn"
                            disabled={!adminToken || busy}
                            onClick={() => handleUpdateUploadStatus(item.id, "DEACTIVATED")}
                            title="Deactivate upload"
                          >
                            <PowerOff size={14} /> Deactivate
                          </button>
                        )}

                        <button
                          type="button"
                          className="admin-mode-btn"
                          disabled={!adminToken || busy || item.status !== "DEACTIVATED"}
                          onClick={() => handleDeleteUpload(item.id)}
                          title="Delete upload permanently"
                        >
                          <Trash2 size={14} />
                          {busy && uploadActionType === "delete" ? " Deleting..." : " Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {uploadHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="admin-muted">
                    No upload history found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

//  Section: KYC Queue 

function KycQueueSection() {
  const [rows, setRows] = useState<KycSubmissionRow[]>([]);
  const [filter, setFilter] = useState<"All" | "PENDING_REVIEW" | "VERIFIED" | "REJECTED">(
    "PENDING_REVIEW",
  );
  const [partnerIdSearch, setPartnerIdSearch] = useState("");
  const [adminToken, setAdminToken] = useState<string | null>(() =>
    localStorage.getItem("gadgetpe_admin_access_token"),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingKycId, setSavingKycId] = useState<string | null>(null);

  const fetchRows = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listKycSubmissions(token, {
        status: filter === "All" ? undefined : filter,
        partnerId: partnerIdSearch.trim() || undefined,
      });
      setRows(result.rows);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setError("Session expired. Please login again.");
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to fetch KYC queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!adminToken) return;
    void fetchRows(adminToken);
  }, [adminToken, filter, partnerIdSearch]);

  const handleVerification = async (kycId: string, action: "APPROVE" | "REJECT") => {
    if (!adminToken) return;

    setSavingKycId(kycId);
    setError(null);
    try {
      await verifyKycSubmission(
        adminToken,
        kycId,
        action,
        action === "APPROVE" ? "Approved from admin queue UI" : "Rejected from admin queue UI",
      );
      await fetchRows(adminToken);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setError("Session expired. Please login again.");
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to update KYC status.");
    } finally {
      setSavingKycId(null);
    }
  };

  const pendingCount = rows.filter((r) => r.verificationStatus === "PENDING_REVIEW").length;
  const verifiedCount = rows.filter((r) => r.verificationStatus === "VERIFIED").length;
  const rejectedCount = rows.filter((r) => r.verificationStatus === "REJECTED").length;

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">KYC Queue</h2>

      <div className="admin-stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <StatCard
          label="Total Submissions"
          value={rows.length}
          sub="Current queue result"
          icon={ShieldUser}
          accent="#1d9e75"
        />
        <StatCard
          label="Pending Review"
          value={pendingCount}
          sub="Requires admin action"
          icon={Clock}
          accent="#f59e0b"
        />
        <StatCard
          label="Verified"
          value={verifiedCount}
          sub="Approved KYC"
          icon={CheckCircle2}
          accent="#1d9e75"
        />
        <StatCard
          label="Rejected"
          value={rejectedCount}
          sub="Rejected KYC"
          icon={AlertCircle}
          accent="#ef4444"
        />
      </div>

      <div className="admin-bucket-totals" style={{ marginTop: 20 }}>
        {(["All", "PENDING_REVIEW", "VERIFIED", "REJECTED"] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`admin-bucket-pill${filter === f ? " active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="admin-card" style={{ marginTop: 12 }}>
        <div className="admin-card-toprow">
          <h3 className="admin-card-title">Search Partner ID</h3>
          <input
            type="search"
            placeholder="partner-9876543210"
            className="admin-search-input"
            value={partnerIdSearch}
            onChange={(e) => setPartnerIdSearch(e.target.value)}
          />
        </div>
        {error ? (
          <p className="admin-muted" style={{ color: "#ef4444" }}>
            {error}
          </p>
        ) : null}
      </div>

      <div className="admin-card" style={{ marginTop: 12 }}>
        <h3 className="admin-card-title">KYC Review Actions</h3>
        <div className="lead-table-wrap" style={{ margin: 0 }}>
          <table className="lead-table admin-lead-table">
            <thead>
              <tr>
                <th>KYC ID</th>
                <th>Partner</th>
                <th>Proof</th>
                <th>File</th>
                <th>Preview</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <code className="admin-lead-id">{row.id.slice(0, 8)}</code>
                  </td>
                  <td>{row.partnerId}</td>
                  <td>{row.identityProof}</td>
                  <td>{row.fileName}</td>
                  <td>
                    {row.mediaUrl ? (
                      <a
                        href={row.mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="user-inline-link"
                      >
                        Open
                      </a>
                    ) : (
                      <span className="admin-muted">N/A</span>
                    )}
                  </td>
                  <td>
                    <span className="admin-status-badge">{row.verificationStatus}</span>
                  </td>
                  <td className="admin-muted">{new Date(row.updatedAt).toLocaleString()}</td>
                  <td>
                    <div className="admin-mode-toggle">
                      <button
                        type="button"
                        className={`admin-mode-btn${row.verificationStatus === "VERIFIED" ? " active" : ""}`}
                        disabled={!adminToken || savingKycId === row.id}
                        onClick={() => handleVerification(row.id, "APPROVE")}
                      >
                        {savingKycId === row.id && row.verificationStatus !== "VERIFIED"
                          ? "Saving..."
                          : "Approve"}
                      </button>
                      <button
                        type="button"
                        className={`admin-mode-btn${row.verificationStatus === "REJECTED" ? " active" : ""}`}
                        disabled={!adminToken || savingKycId === row.id}
                        onClick={() => handleVerification(row.id, "REJECT")}
                      >
                        {savingKycId === row.id && row.verificationStatus !== "REJECTED"
                          ? "Saving..."
                          : "Reject"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {loading && adminToken ? <p className="admin-muted">Loading KYC submissions...</p> : null}
    </div>
  );
}

//  Section: Payments Verification 

function PaymentsVerifySection() {
  const [rows, setRows] = useState<PartnerCoinRechargeRequestRow[]>([]);
  const [unlockRows, setUnlockRows] = useState<AdminLeadUnlockIntentRow[]>([]);
  const [filter, setFilter] = useState<"All" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [unlockFilter, setUnlockFilter] = useState<"All" | AdminLeadUnlockIntentRow["status"]>("SCREENSHOT_SENT");
  const [partnerIdSearch, setPartnerIdSearch] = useState("");
  const [adminToken, setAdminToken] = useState<string | null>(() =>
    localStorage.getItem("gadgetpe_admin_access_token"),
  );
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingUnlockId, setSavingUnlockId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const partnerId = partnerIdSearch.trim() || undefined;
      const [rechargeResult, unlockResult] = await Promise.all([
        listAdminPartnerCoinRechargeRequests(token, {
          status: filter === "All" ? undefined : filter,
          partnerId,
          limit: 100,
        }),
        listAdminLeadUnlockIntents(token, {
          status: unlockFilter === "All" ? undefined : unlockFilter,
          partnerId,
          limit: 100,
        }),
      ]);
      setRows(rechargeResult.rows);
      setUnlockRows(unlockResult.rows);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setError("Session expired. Please login again.");
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to fetch recharge requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!adminToken) return;
    void fetchRows(adminToken);
  }, [adminToken, filter, unlockFilter, partnerIdSearch]);

  const handleVerification = async (requestId: string, action: "APPROVE" | "REJECT") => {
    if (!adminToken) return;
    setSavingId(requestId);
    setError(null);
    try {
      await verifyPartnerCoinRechargeRequest(adminToken, requestId, {
        action,
        note:
          action === "APPROVE"
            ? "Wallet recharge approved by admin"
            : "Wallet recharge rejected by admin",
      });
      toast.success(
        action === "APPROVE"
          ? "Recharge approved and wallet credited."
          : "Recharge request rejected.",
      );
      await fetchRows(adminToken);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setError("Session expired. Please login again.");
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to update payment status.");
    } finally {
      setSavingId(null);
    }
  };

  const handleUnlockVerification = async (intentId: string, action: "APPROVE" | "REJECT") => {
    if (!adminToken) return;
    setSavingUnlockId(intentId);
    setError(null);
    try {
      await verifyAdminLeadUnlockIntent(adminToken, intentId, {
        action,
        note:
          action === "APPROVE"
            ? "Lead unlock payment approved by admin"
            : "Lead unlock payment rejected by admin",
      });
      toast.success(
        action === "APPROVE"
          ? "Lead unlock approved. Partner can view details."
          : "Lead unlock request rejected.",
      );
      await fetchRows(adminToken);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setError("Session expired. Please login again.");
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to update lead unlock payment.");
    } finally {
      setSavingUnlockId(null);
    }
  };

  const pendingCount = rows.filter((row) => row.status === "PENDING").length;
  const approvedCount = rows.filter((row) => row.status === "APPROVED").length;
  const rejectedCount = rows.filter((row) => row.status === "REJECTED").length;
  const pendingUnlockCount = unlockRows.filter((row) => row.status === "SCREENSHOT_SENT" || row.status === "PENDING_PAYMENT").length;

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">Payments Verification</h2>

      <div className="admin-stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <StatCard
          label="Total Requests"
          value={rows.length}
          sub="Current filter result"
          icon={Coins}
          accent="#0ea5c9"
        />
        <StatCard
          label="Pending"
          value={pendingCount + pendingUnlockCount}
          sub="Needs admin action"
          icon={Clock}
          accent="#f59e0b"
        />
        <StatCard
          label="Approved"
          value={approvedCount}
          sub="Wallet credits issued"
          icon={CheckCircle2}
          accent="#1d9e75"
        />
        <StatCard
          label="Rejected"
          value={rejectedCount}
          sub="Verification failed"
          icon={AlertCircle}
          accent="#ef4444"
        />
      </div>

      <div className="admin-bucket-totals" style={{ marginTop: 20 }}>
        {(["All", "PENDING", "APPROVED", "REJECTED"] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`admin-bucket-pill${filter === f ? " active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="admin-card" style={{ marginTop: 12 }}>
        <div className="admin-card-toprow">
          <h3 className="admin-card-title">Search Partner ID</h3>
          <input
            type="search"
            placeholder="partner-9876543210"
            className="admin-search-input"
            value={partnerIdSearch}
            onChange={(e) => setPartnerIdSearch(e.target.value)}
          />
        </div>
        {error ? (
          <p className="admin-muted" style={{ color: "#ef4444" }}>
            {error}
          </p>
        ) : null}
      </div>

      <div className="admin-card" style={{ marginTop: 12 }}>
        <h3 className="admin-card-title">Recharge Verification Queue</h3>
        <div className="lead-table-wrap" style={{ margin: 0 }}>
          <table className="lead-table admin-lead-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Partner</th>
                <th>Amount</th>
                <th>UPI Ref</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <code className="admin-lead-id">{row.id.slice(0, 8)}</code>
                  </td>
                  <td>{row.partnerId}</td>
                  <td className="admin-price">Rs. {toInr(row.amount)}</td>
                  <td>{row.upiTxnRef}</td>
                  <td>
                    <span className="admin-status-badge">{row.status}</span>
                  </td>
                  <td className="admin-muted">{new Date(row.requestedAt).toLocaleString()}</td>
                  <td>
                    {row.status === "PENDING" ? (
                      <div className="admin-mode-toggle">
                        <button
                          type="button"
                          className="admin-mode-btn"
                          disabled={!adminToken || savingId === row.id}
                          onClick={() => handleVerification(row.id, "APPROVE")}
                        >
                          {savingId === row.id ? "Saving..." : "Approve"}
                        </button>
                        <button
                          type="button"
                          className="admin-mode-btn"
                          disabled={!adminToken || savingId === row.id}
                          onClick={() => handleVerification(row.id, "REJECT")}
                        >
                          {savingId === row.id ? "Saving..." : "Reject"}
                        </button>
                      </div>
                    ) : (
                      <span className="admin-muted">{row.adminNote || "-"}</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-muted">
                    No recharge requests found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-bucket-totals" style={{ marginTop: 20 }}>
        {(["All", "PENDING_PAYMENT", "SCREENSHOT_SENT", "APPROVED", "REJECTED", "EXPIRED", "CLOSED"] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`admin-bucket-pill${unlockFilter === f ? " active" : ""}`}
            onClick={() => setUnlockFilter(f)}
          >
            {f === "SCREENSHOT_SENT" ? "ADMIN REVIEW" : f}
          </button>
        ))}
      </div>

      <div className="admin-card" style={{ marginTop: 12 }}>
        <h3 className="admin-card-title">Lead Unlock Payment Queue</h3>
        <div className="lead-table-wrap" style={{ margin: 0 }}>
          <table className="lead-table admin-lead-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Partner</th>
                <th>Lead</th>
                <th>City/Pincode</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {unlockRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <code className="admin-lead-id">{row.id.slice(0, 8)}</code>
                  </td>
                  <td>{row.partnerId}</td>
                  <td>{row.lead?.selectedModel.modelName || row.leadId.slice(0, 8)}</td>
                  <td>{row.lead?.city || row.lead?.seller.city || "-"} / {row.lead?.pincode || "-"}</td>
                  <td className="admin-price">Rs. {toInr(row.unlockPrice)}</td>
                  <td>
                    <span className="admin-status-badge">{row.status === "SCREENSHOT_SENT" ? "ADMIN_REVIEW" : row.status}</span>
                  </td>
                  <td className="admin-muted">{new Date(row.createdAt).toLocaleString()}</td>
                  <td>
                    {["PENDING_PAYMENT", "SCREENSHOT_SENT"].includes(row.status) ? (
                      <div className="admin-mode-toggle">
                        <button
                          type="button"
                          className="admin-mode-btn"
                          disabled={!adminToken || savingUnlockId === row.id}
                          onClick={() => handleUnlockVerification(row.id, "APPROVE")}
                        >
                          {savingUnlockId === row.id ? "Saving..." : "Approve"}
                        </button>
                        <button
                          type="button"
                          className="admin-mode-btn"
                          disabled={!adminToken || savingUnlockId === row.id}
                          onClick={() => handleUnlockVerification(row.id, "REJECT")}
                        >
                          {savingUnlockId === row.id ? "Saving..." : "Reject"}
                        </button>
                      </div>
                    ) : (
                      <span className="admin-muted">{row.adminNote || "-"}</span>
                    )}
                  </td>
                </tr>
              ))}
              {unlockRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="admin-muted">
                    No lead unlock payment requests found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {loading && adminToken ? <p className="admin-muted">Loading recharge requests...</p> : null}
    </div>
  );
}

//  Section: Partners Activity 

function PartnersSection() {
  const [search, setSearch] = useState("");

  const filtered = DUMMY_PARTNERS.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.area.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">Partners Activity</h2>

      <div className="admin-stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <StatCard
          label="Total Partners"
          value={DUMMY_PARTNERS.length}
          sub="Onboarded"
          icon={Users}
          accent="#1d9e75"
        />
        <StatCard
          label="Active Today"
          value={DUMMY_PARTNERS.filter((p) => p.status === "Active").length}
          sub="Online now"
          icon={Activity}
          accent="#0ea5c9"
        />
        <StatCard
          label="Total Leads Done"
          value={DUMMY_PARTNERS.reduce((s, p) => s + p.leadsTotal, 0)}
          sub="All time"
          icon={CheckCircle2}
          accent="#1d9e75"
        />
        <StatCard
          label="Total Earnings"
          value={`Rs. ${toInr(DUMMY_PARTNERS.reduce((s, p) => s + p.earnings, 0))}`}
          sub="Payouts"
          icon={IndianRupee}
          accent="#8b5cf6"
        />
      </div>

      <div className="admin-card" style={{ marginTop: 20 }}>
        <div className="admin-card-toprow">
          <h3 className="admin-card-title">Partner Directory</h3>
          <input
            type="search"
            placeholder="Search partner or area"
            className="admin-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="lead-table-wrap" style={{ margin: 0 }}>
          <table className="lead-table admin-lead-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Area</th>
                <th>Leads Today</th>
                <th>Total Leads</th>
                <th>Earnings</th>
                <th>Rating</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <code className="admin-lead-id">{p.id}</code>
                  </td>
                  <td className="admin-partner-name">
                    <div className="admin-avatar-sm">
                      {p.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    {p.name}
                  </td>
                  <td>{p.area}</td>
                  <td className="admin-center">{p.leadsToday}</td>
                  <td className="admin-center">{p.leadsTotal}</td>
                  <td className="admin-price">Rs. {toInr(p.earnings)}</td>
                  <td className="admin-center">
                    <span className="admin-rating">{"".repeat(Math.round(p.rating))}</span>{" "}
                    {p.rating}
                  </td>
                  <td>
                    <span
                      className="admin-status-badge"
                      style={{
                        background: p.status === "Active" ? "#1d9e7518" : "#ef444418",
                        color: p.status === "Active" ? "#1d9e75" : "#ef4444",
                      }}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="admin-muted">
                    No partner data available.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

//  Section: Revenue 

function RevenueSection() {
  const [period, setPeriod] = useState<"Daily" | "Weekly" | "Monthly">("Daily");

  const data =
    period === "Daily" ? DAILY_REVENUE : period === "Weekly" ? WEEKLY_REVENUE : MONTHLY_REVENUE;
  const total = data.reduce((s, d) => s + d.value, 0);
  const peak = data.length ? Math.max(...data.map((d) => d.value)) : 0;
  const avg = data.length ? Math.round(total / data.length) : 0;

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">Revenue Analytics</h2>

      <div className="admin-stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <StatCard
          label="Total (Period)"
          value={`Rs. ${toInr(total)}`}
          sub={`${period} view`}
          icon={IndianRupee}
          accent="#1d9e75"
        />
        <StatCard
          label="Peak"
          value={`Rs. ${toInr(peak)}`}
          sub="Highest single period"
          icon={TrendingUp}
          accent="#0ea5c9"
        />
        <StatCard
          label="Average"
          value={`Rs. ${toInr(avg)}`}
          sub="Per period avg"
          icon={BarChart3}
          accent="#8b5cf6"
        />
        <StatCard
          label="MTD Revenue"
          value={`Rs. ${toInr(MONTHLY_REVENUE.reduce((s, d) => s + d.value, 0))}`}
          sub="All months"
          icon={ArrowUpRight}
          accent="#f59e0b"
        />
      </div>

      <div className="admin-card" style={{ marginTop: 20 }}>
        <div className="admin-card-toprow">
          <h3 className="admin-card-title">Revenue Chart</h3>
          <div className="admin-period-toggle">
            {(["Daily", "Weekly", "Monthly"] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={`admin-period-btn${period === p ? " active" : ""}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="admin-revenue-total" style={{ marginBottom: 12 }}>
          Rs. {toInr(total)}
          <span className="admin-revenue-label"> total  {data.length} periods</span>
        </div>
        <MiniBarChart data={data} color="var(--green)" />

        <table className="lead-table admin-lead-table" style={{ marginTop: 20 }}>
          <thead>
            <tr>
              <th>Period</th>
              <th>Revenue</th>
              <th>Share</th>
              <th>vs Avg</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label}>
                <td>{d.label}</td>
                <td className="admin-price">Rs. {toInr(d.value)}</td>
                <td>
                  <div className="admin-share-bar">
                    <div
                      style={{
                        width: `${total === 0 ? 0 : Math.round((d.value / total) * 100)}%`,
                        background: "var(--green)",
                      }}
                    />
                  </div>
                  <span className="admin-muted" style={{ fontSize: 11 }}>
                    {total === 0 ? 0 : Math.round((d.value / total) * 100)}%
                  </span>
                </td>
                <td style={{ color: d.value >= avg ? "#1d9e75" : "#ef4444", fontWeight: 700 }}>
                  {avg === 0
                    ? "-"
                    : `${d.value >= avg ? "" : ""} ${Math.abs(Math.round(((d.value - avg) / avg) * 100))}%`}
                </td>
              </tr>
            ))}
            {data.length === 0 ? (
              <tr>
                <td colSpan={4} className="admin-muted">
                  No revenue data available.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

//  Section: Settings 

function SettingsSection() {
  const [autoAssign, setAutoAssign] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">Settings</h2>
      <div className="admin-settings-grid">
        <div className="admin-card">
          <h3 className="admin-card-title">System Preferences</h3>
          <div className="admin-setting-row">
            <div>
              <p className="admin-setting-label">Auto Lead Assignment</p>
              <p className="admin-setting-sub">Automatically assign leads to nearest partner</p>
            </div>
            <button
              type="button"
              className={`admin-toggle${autoAssign ? " on" : ""}`}
              onClick={() => setAutoAssign((v) => !v)}
              aria-pressed={autoAssign}
            >
              <span />
            </button>
          </div>
          <div className="admin-setting-row">
            <div>
              <p className="admin-setting-label">Push Notifications</p>
              <p className="admin-setting-sub">Notify on new leads and status changes</p>
            </div>
            <button
              type="button"
              className={`admin-toggle${notifications ? " on" : ""}`}
              onClick={() => setNotifications((v) => !v)}
              aria-pressed={notifications}
            >
              <span />
            </button>
          </div>
          <div className="admin-setting-row">
            <div>
              <p className="admin-setting-label">Two-Factor Authentication</p>
              <p className="admin-setting-sub">Require OTP for admin login</p>
            </div>
            <button
              type="button"
              className={`admin-toggle${twoFactor ? " on" : ""}`}
              onClick={() => setTwoFactor((v) => !v)}
              aria-pressed={twoFactor}
            >
              <span />
            </button>
          </div>
          <button type="button" className="admin-save-btn" onClick={handleSave}>
            {saved ? " Saved" : "Save Settings"}
          </button>
        </div>

        <div className="admin-card">
          <h3 className="admin-card-title">Admin Profile</h3>
          <div className="admin-profile-row">
            <div className="admin-profile-avatar">AD</div>
            <div>
              <p className="admin-profile-name">Admin User</p>
              <p className="admin-setting-sub">admin@gadgetpe.in</p>
            </div>
          </div>
          <div className="admin-field-row">
            <label className="admin-form-label">Display Name</label>
            <input defaultValue="Admin User" className="admin-input" />
          </div>
          <div className="admin-field-row">
            <label className="admin-form-label">Email</label>
            <input defaultValue="admin@gadgetpe.in" className="admin-input" type="email" />
          </div>
          <button type="button" className="admin-save-btn" onClick={handleSave}>
            {saved ? " Updated" : "Update Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

//  Root Admin Page 

type AdminAuthMode = "login" | "signup";

function AdminAuthGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<AdminAuthMode>("login");
  const [adminId, setAdminId] = useState("admin-ops");
  const [accessKey, setAccessKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitAdminAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adminId.trim()) {
      setError("Admin ID is required.");
      return;
    }
    if (!accessKey.trim()) {
      setError("Access key is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const session = await adminDevLogin(accessKey.trim(), adminId.trim());
      localStorage.setItem("gadgetpe_admin_access_token", session.accessToken);
      if (displayName.trim()) localStorage.setItem("gadgetpe_admin_name", displayName.trim());
      activateRoleSession("admin");
      toast.success(mode === "login" ? "Admin login successful." : "Admin signup completed.");
      onAuthenticated();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : mode === "login"
            ? "Admin login failed."
            : "Admin signup failed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card">
        <div className="admin-auth-hero">
          <div className="admin-auth-brand">
            <ShieldUser size={18} /> <img src="/logo.png" alt="GadgetPe Admin" style={{ height: "45px", width: "auto", verticalAlign: "middle" }} />
          </div>
          <h1>Admin Login</h1>
          <p>
            Manage pricing, serviceability, KYC approvals, and partner operations from one protected
            console.
          </p>
          <div className="admin-auth-metrics" aria-label="Admin console highlights">
            <span>
              <Activity size={16} /> Live operations
            </span>
            <span>
              <UserCheck size={16} /> KYC controls
            </span>
            <span>
              <MapPin size={16} /> Pincode scope
            </span>
          </div>
        </div>

        <div className="admin-auth-panel">
          <form className="admin-auth-form" onSubmit={(event) => void submitAdminAuth(event)}>
            <label>
              <span>Admin ID</span>
              <input
                value={adminId}
                onChange={(event) => setAdminId(event.target.value)}
                placeholder="admin-ops"
              />
            </label>
            <label>
              <span>Access Key</span>
              <input
                type="password"
                value={accessKey}
                onChange={(event) => setAccessKey(event.target.value)}
                placeholder="Enter admin access key"
              />
            </label>
            {error ? (
              <div className="admin-auth-error">
                <AlertCircle size={16} /> {error}
              </div>
            ) : null}
            <button type="submit" className="admin-auth-submit" disabled={submitting}>
              {submitting ? "Please wait..." : "Login to Admin"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function AdminPage() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState<NavItem>("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [blockedByRole, setBlockedByRole] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(() =>
    localStorage.getItem("gadgetpe_admin_access_token"),
  );
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadSummary, setLeadSummary] = useState<{
    byStatus: Array<{ key: string; count: number }>;
    byDisposition: Array<{ key: string; count: number }>;
  } | null>(null);
  const [overviewMetrics, setOverviewMetrics] = useState<AdminOverviewMetricsResponse | null>(null);
  const [assignmentMetrics, setAssignmentMetrics] = useState<AdminAssignmentMetricsResponse | null>(
    null,
  );
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [timelineLead, setTimelineLead] = useState<Lead | null>(null);
  const [timelineRows, setTimelineRows] = useState<AdminLeadDispositionEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  const metricsFilters = useMemo(
    () => ({
      fromDate: fromDate ? new Date(`${fromDate}T00:00:00.000Z`).toISOString() : undefined,
      toDate: toDate ? new Date(`${toDate}T23:59:59.999Z`).toISOString() : undefined,
    }),
    [fromDate, toDate],
  );

  const fetchAdminAnalytics = async (token: string) => {
    const [leadResult, summaryResult, overviewResult, assignmentResult] = await Promise.all([
      listAdminLeads(token, { limit: 200, ...metricsFilters }),
      getAdminDispositionMetrics(token, metricsFilters),
      getAdminOverviewMetrics(token, metricsFilters),
      getAdminAssignmentMetrics(token, metricsFilters),
    ]);
    setLeads(leadResult.rows.map(mapPartnerLeadToLead));
    setLeadSummary(summaryResult);
    setOverviewMetrics(overviewResult);
    setAssignmentMetrics(assignmentResult);
  };

  useEffect(() => {
    if (!adminToken) {
      setLeads([]);
      setLeadSummary(null);
      setOverviewMetrics(null);
      setAssignmentMetrics(null);
      return;
    }

    void (async () => {
      try {
        await fetchAdminAnalytics(adminToken);
      } catch (err) {
        if (isTokenExpiredError(err)) {
          localStorage.removeItem("gadgetpe_admin_access_token");
          setAdminToken(null);
          return;
        }
        toast.error(err instanceof Error ? err.message : "Unable to load lead analytics.");
      }
    })();

    const poller = setInterval(() => {
      void (async () => {
        try {
          await fetchAdminAnalytics(adminToken);
        } catch {
          // Polling errors are surfaced on next interaction.
        }
      })();
    }, 30000);

    return () => clearInterval(poller);
  }, [adminToken, metricsFilters]);

  useEffect(() => {
    const activeRole = getActiveRole();
    if (activeRole === "user") {
      clearRoleSession("user");
      setBlockedByRole(false);
      return;
    }

    if (activeRole === "partner") {
      clearRoleSession("partner");
      setBlockedByRole(false);
      return;
    }

    setBlockedByRole(false);
  }, []);

  const renderSection = () => {
    switch (activeNav) {
      case "Overview":
        return <OverviewSection leads={leads} overview={overviewMetrics} />;
      case "Lead Bucket":
        return (
          <LeadBucketSection leads={leads} onOpenTimeline={(lead) => void openTimeline(lead)} />
        );
      case "Lead Disposition":
        return (
          <LeadDispositionSection
            leads={leads}
            summary={leadSummary}
            onOpenTimeline={(lead) => void openTimeline(lead)}
          />
        );
      case "Lead Assignment":
        return (
          <div className="admin-section">
            <h2 className="admin-section-title">Lead Assignment</h2>
            <p className="admin-muted" style={{ marginBottom: 16 }}>
              Lead assignment has moved to a dedicated page with pincode tenant scoping.
            </p>
            <button
              type="button"
              className="admin-assign-btn"
              onClick={() => {
                void navigate({ to: "/Lead-assignment" });
              }}
            >
              Open Dedicated Lead Assignment
            </button>
            <div style={{ marginTop: 20 }}>
              <LeadAssignmentSection
                leads={leads}
                adminToken={adminToken}
                metrics={assignmentMetrics}
                onAssigned={() => {
                  void fetchAdminAnalytics(adminToken);
                }}
              />
            </div>
          </div>
        );
      case "Location Mgmt":
        return <LocationSection />;
      case "Price Mgmt":
        return <PriceManagementSection />;
      case "KYC Queue":
        return <KycQueueSection />;
      case "Payments Verify":
        return <PaymentsVerifySection />;
      case "Partners":
        return <PartnersSection />;
      case "Revenue":
        return <RevenueSection />;
      case "Settings":
        return <SettingsSection />;
      default:
        return null;
    }
  };

  const openTimeline = async (lead: Lead) => {
    if (!adminToken) return;
    setTimelineLead(lead);
    setTimelineRows([]);
    setTimelineError(null);
    setTimelineLoading(true);
    try {
      const result = await listAdminLeadDispositionEvents(adminToken, lead.id, 200);
      setTimelineRows(result.rows);
    } catch (err) {
      if (isTokenExpiredError(err)) {
        localStorage.removeItem("gadgetpe_admin_access_token");
        setAdminToken(null);
        setTimelineLead(null);
        return;
      }
      setTimelineError(err instanceof Error ? err.message : "Unable to load timeline.");
    } finally {
      setTimelineLoading(false);
    }
  };

  if (blockedByRole) {
    return null;
  }

  if (!adminToken) {
    return (
      <AdminAuthGate
        onAuthenticated={() => setAdminToken(localStorage.getItem("gadgetpe_admin_access_token"))}
      />
    );
  }

  const handleLogout = async () => {
    clearRoleSession("admin");
    localStorage.removeItem("gadgetpe_admin_name");
    setAdminToken(null);
    await navigate({ to: "/" });
  };

  return (
    <div className="admin-shell">
      {/* Topbar */}
      <header className="admin-topbar">
        <button
          type="button"
          className="admin-hamburger"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="Toggle sidebar"
        >
          
        </button>
        <div className="admin-topbar-brand">
          <ShieldUser size={20} />
          <span><img src="/logo.png" alt="GadgetPe Admin" style={{ height: "45px", width: "auto", verticalAlign: "middle" }} /></span>
        </div>
        <div className="admin-topbar-right">
          <span className="admin-topbar-meta">
            Super Admin  {new Date().toLocaleDateString("en-IN")}
          </span>
          <button
            type="button"
            className="admin-topbar-link"
            onClick={() => void handleLogout()}
            aria-label="Logout from admin"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      <div className="admin-body">
        {sidebarOpen && (
          <div className="admin-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden />
        )}

        {/* Sidebar */}
        <aside className={`admin-sidebar${sidebarOpen ? " open" : ""}`}>
          <nav className="admin-sidebar-nav">
            {NAV_ITEMS.map((item) => {
              const Icon = NAV_ICONS[item];
              return (
                <button
                  key={item}
                  type="button"
                  className={`admin-nav-btn${activeNav === item ? " active" : ""}`}
                  onClick={() => {
                    setActiveNav(item);
                    setSidebarOpen(false);
                  }}
                >
                  <Icon size={16} />
                  <span>{item}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="admin-main">
          <div className="admin-date-filter-bar">
            <button
              type="button"
              className={`admin-date-filter-toggle${fromDate || toDate ? " active" : ""}`}
              onClick={() => setShowDateFilter((v) => !v)}
              title="Date range filter"
            >
              <Sliders size={15} />
              <span>Filter</span>
              {fromDate || toDate ? <span className="admin-date-filter-dot" /> : null}
            </button>
            {fromDate || toDate ? (
              <span className="admin-date-filter-summary">
                {fromDate || ""}  {toDate || ""}
                <button
                  type="button"
                  className="admin-date-filter-clear"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                  }}
                  title="Clear dates"
                >
                  
                </button>
              </span>
            ) : null}
          </div>

          {showDateFilter ? (
            <section className="admin-card admin-date-filter-panel" style={{ marginBottom: 14 }}>
              <div className="admin-card-toprow">
                <h3 className="admin-card-title">Date Range</h3>
                <button
                  type="button"
                  className="admin-page-btn"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                  }}
                >
                  Clear
                </button>
              </div>
              <div
                className="admin-manual-form"
                style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}
              >
                <label className="admin-form-label">
                  From
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(event) => setFromDate(event.target.value)}
                    className="admin-select"
                  />
                </label>
                <label className="admin-form-label">
                  To
                  <input
                    type="date"
                    value={toDate}
                    onChange={(event) => setToDate(event.target.value)}
                    className="admin-select"
                  />
                </label>
              </div>
            </section>
          ) : null}
          {renderSection()}
        </main>
      </div>
      {timelineLead ? (
        <LeadTimelineModal
          lead={timelineLead}
          rows={timelineRows}
          loading={timelineLoading}
          error={timelineError}
          onClose={() => setTimelineLead(null)}
        />
      ) : null}
    </div>
  );
}
