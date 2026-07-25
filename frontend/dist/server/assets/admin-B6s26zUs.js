import { n as clearRoleSession, r as getActiveRole, t as activateRoleSession } from "./role-session-C7kgx143.js";
import { B as listServiceabilityPincodes, E as listAdminLeadDispositionEvents, L as listPriceCatalog, O as listAdminLeads, R as listPriceUploadHistory, V as listServiceabilityUploadHistory, W as previewQuoteDeductions, at as updatePriceUploadStatus, c as createServiceabilityPincode, ct as updateServiceabilityUploadStatus, d as deletePriceUpload, f as deleteServiceabilityPincode, ft as validateServiceabilityPincode, g as getAdminOverviewMetrics, h as getAdminDispositionMetrics, j as listKycSubmissions, k as listAdminPartnerCoinRechargeRequests, lt as uploadPricingExcel, m as getAdminAssignmentMetrics, mt as verifyPartnerCoinRechargeRequest, n as adminDevLogin, nt as toggleServiceabilityPincode, ot as updateQuoteDeductionRule, p as deleteServiceabilityUpload, pt as verifyKycSubmission, r as assignAdminLead, s as createQuoteDeductionRule, st as updateServiceabilityPincode, t as ApiClientError, tt as toggleQuoteDeductionRule, ut as uploadServiceabilityExcel, z as listQuoteDeductionRules } from "./gadgetpe-client-Cg3AtJY8.js";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { Activity, AlertCircle, ArrowUpRight, BarChart3, CheckCircle2, ChevronDown, CircleDot, Clock, Coins, FileSpreadsheet, IndianRupee, LayoutDashboard, LogOut, MapPin, Power, PowerOff, Settings, ShieldUser, Sliders, Trash2, TrendingUp, Upload, UserCheck, Users, Zap } from "lucide-react";
import { toast } from "sonner";
//#region src/routes/admin.tsx?tsr-split=component
function isTokenExpiredError(err) {
	if (err instanceof ApiClientError) return err.code === "UNAUTHORIZED" || err.status === 401;
	if (err instanceof Error) return err.message.toLowerCase().includes("invalid or expired access token");
	return false;
}
function formatUploadValidationError(err) {
	if (!(err instanceof ApiClientError)) return err instanceof Error ? err.message : "Upload failed.";
	if (err.code !== "BAD_REQUEST" || !err.details || typeof err.details !== "object") return err.message;
	const details = err.details;
	const first = details.errors?.[0];
	const firstMessage = first?.errors?.[0];
	const filePrefix = details.sourceFileName ? `${details.sourceFileName}: ` : "";
	if (typeof first?.rowNo === "number" && firstMessage) return `${err.message} (${filePrefix}Row ${first.rowNo}: ${firstMessage})`;
	return details.sourceFileName ? `${err.message} (${details.sourceFileName})` : err.message;
}
var STATUSES = [
	"Pending",
	"In Progress",
	"Completed",
	"Cancelled"
];
var WEEKLY_REVENUE = [];
function mapPartnerStatusToLeadStatus(status) {
	if (status === "COMPLETED") return "Completed";
	if (status === "REJECTED" || status === "CANCELLED") return "Cancelled";
	if (status === "ACCEPTED" || status === "IN_PROGRESS") return "In Progress";
	return "Pending";
}
function mapPartnerLeadToLead(lead) {
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
	const formatSlot = (date, time) => {
		if (!date && !time) return "-";
		return `${date ? new Date(date).toLocaleDateString() : "-"} ${time || ""}`.trim();
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
		alternateSlot: formatSlot(lead.pickupSchedule?.alternateDate, lead.pickupSchedule?.alternateTime),
		status,
		rawStatus: lead.status,
		updatedAt: lead.updatedAt,
		createdAt: new Date(lead.updatedAt || lead.createdAt).toLocaleString(),
		disposition,
		assignMode: "Auto"
	};
}
function toInr(value) {
	return new Intl.NumberFormat("en-IN").format(value);
}
var NAV_ICONS = {
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
	Settings
};
var NAV_ITEMS = [
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
	"Settings"
];
function MiniBarChart({ data, color = "var(--green)" }) {
	if (data.length === 0) return /* @__PURE__ */ jsx("p", {
		className: "admin-muted",
		children: "No data available."
	});
	const max = Math.max(...data.map((d) => d.value));
	return /* @__PURE__ */ jsx("div", {
		className: "admin-bar-chart",
		children: data.map((d) => /* @__PURE__ */ jsxs("div", {
			className: "admin-bar-col",
			children: [/* @__PURE__ */ jsx("div", {
				className: "admin-bar",
				style: {
					height: `${Math.round(d.value / max * 100)}%`,
					background: color
				},
				title: `Rs. ${toInr(d.value)}`
			}), /* @__PURE__ */ jsx("span", {
				className: "admin-bar-label",
				children: d.label
			})]
		}, d.label))
	});
}
function DonutChart({ slices }) {
	const total = slices.reduce((s, x) => s + x.value, 0);
	if (total === 0) return /* @__PURE__ */ jsx("p", {
		className: "admin-muted",
		children: "No data available."
	});
	let cumulativeDeg = 0;
	return /* @__PURE__ */ jsxs("div", {
		className: "admin-donut-wrap",
		children: [/* @__PURE__ */ jsx("div", {
			className: "admin-donut",
			style: { background: `conic-gradient(${slices.map((s) => {
				const deg = s.value / total * 360;
				const start = cumulativeDeg;
				cumulativeDeg += deg;
				return {
					...s,
					start,
					deg
				};
			}).map((s) => `${s.color} ${s.start}deg ${s.start + s.deg}deg`).join(", ")})` },
			children: /* @__PURE__ */ jsxs("div", {
				className: "admin-donut-hole",
				children: [/* @__PURE__ */ jsx("span", {
					className: "admin-donut-total",
					children: total
				}), /* @__PURE__ */ jsx("span", {
					className: "admin-donut-sub",
					children: "Total"
				})]
			})
		}), /* @__PURE__ */ jsx("div", {
			className: "admin-donut-legend",
			children: slices.map((s) => /* @__PURE__ */ jsxs("div", {
				className: "admin-legend-row",
				children: [
					/* @__PURE__ */ jsx("span", {
						className: "admin-legend-dot",
						style: { background: s.color }
					}),
					/* @__PURE__ */ jsx("span", {
						className: "admin-legend-label",
						children: s.label
					}),
					/* @__PURE__ */ jsx("span", {
						className: "admin-legend-val",
						children: s.value
					})
				]
			}, s.label))
		})]
	});
}
function StatCard({ label, value, sub, icon: Icon, accent }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "admin-stat-card",
		children: [/* @__PURE__ */ jsx("div", {
			className: "admin-stat-icon",
			style: {
				background: `${accent}18`,
				color: accent
			},
			children: /* @__PURE__ */ jsx(Icon, { size: 20 })
		}), /* @__PURE__ */ jsxs("div", {
			className: "admin-stat-body",
			children: [
				/* @__PURE__ */ jsx("p", {
					className: "admin-stat-label",
					children: label
				}),
				/* @__PURE__ */ jsx("p", {
					className: "admin-stat-value",
					children: value
				}),
				sub && /* @__PURE__ */ jsx("p", {
					className: "admin-stat-sub",
					children: sub
				})
			]
		})]
	});
}
var STATUS_COLORS = {
	Pending: "#f59e0b",
	"In Progress": "#0ea5c9",
	Completed: "#1d9e75",
	Cancelled: "#ef4444"
};
function StatusBadge({ status }) {
	return /* @__PURE__ */ jsx("span", {
		className: "admin-status-badge",
		style: {
			background: `${STATUS_COLORS[status]}18`,
			color: STATUS_COLORS[status]
		},
		children: status
	});
}
function OverviewSection({ leads, overview }) {
	const pending = leads.filter((l) => l.status === "Pending").length;
	const inProgress = leads.filter((l) => l.status === "In Progress").length;
	const completed = leads.filter((l) => l.status === "Completed").length;
	const cancelled = leads.filter((l) => l.status === "Cancelled").length;
	const donutSlices = [
		{
			value: pending,
			color: "#f59e0b",
			label: "Pending"
		},
		{
			value: inProgress,
			color: "#0ea5c9",
			label: "In Progress"
		},
		{
			value: completed,
			color: "#1d9e75",
			label: "Completed"
		},
		{
			value: cancelled,
			color: "#ef4444",
			label: "Cancelled"
		}
	];
	return /* @__PURE__ */ jsxs("div", {
		className: "admin-section",
		children: [
			/* @__PURE__ */ jsx("h2", {
				className: "admin-section-title",
				children: "Overview"
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-stat-grid",
				children: [
					/* @__PURE__ */ jsx(StatCard, {
						label: "Total Leads",
						value: leads.length,
						sub: "No records yet",
						icon: BarChart3,
						accent: "#1d9e75"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Pending",
						value: pending,
						sub: "Awaiting pickup",
						icon: Clock,
						accent: "#f59e0b"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "In Progress",
						value: inProgress,
						sub: "Partner assigned",
						icon: Activity,
						accent: "#0ea5c9"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Completed",
						value: completed,
						sub: "Deals closed",
						icon: CheckCircle2,
						accent: "#1d9e75"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Cancelled",
						value: cancelled,
						sub: "Dropped leads",
						icon: AlertCircle,
						accent: "#ef4444"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Active Partners",
						value: overview?.activePartners ?? 0,
						sub: "Across zones",
						icon: Users,
						accent: "#8b5cf6"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Monthly Payout",
						value: `Rs. ${toInr(overview?.monthlyPayout ?? 0)}`,
						sub: "Completed payouts",
						icon: TrendingUp,
						accent: "#1d9e75"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Conversion",
						value: `${overview?.conversionRate ?? 0}%`,
						sub: "Completed / Total",
						icon: Coins,
						accent: "#f59e0b"
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-overview-lower",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "admin-card admin-donut-card",
						children: [/* @__PURE__ */ jsx("h3", {
							className: "admin-card-title",
							children: "Lead Status Breakdown"
						}), /* @__PURE__ */ jsx(DonutChart, { slices: donutSlices })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "admin-card admin-revenue-card",
						children: [
							/* @__PURE__ */ jsx("h3", {
								className: "admin-card-title",
								children: "Revenue — This Week"
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "admin-revenue-total",
								children: ["Rs. ", toInr((overview?.weeklyTrend || []).reduce((s, d) => s + d.value, 0))]
							}),
							/* @__PURE__ */ jsx(MiniBarChart, { data: overview?.weeklyTrend || WEEKLY_REVENUE })
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "admin-card admin-activity-card",
						children: [/* @__PURE__ */ jsx("h3", {
							className: "admin-card-title",
							children: "Top Partner Activity"
						}), /* @__PURE__ */ jsxs("div", {
							className: "admin-activity-list",
							children: [(overview?.partnerActivity || []).slice(0, 6).map((p) => /* @__PURE__ */ jsxs("div", {
								className: "admin-activity-row",
								children: [
									/* @__PURE__ */ jsx("div", {
										className: "admin-activity-avatar",
										children: p.partnerName.split(" ").map((name) => name[0]).join("").slice(0, 2).toUpperCase()
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "admin-activity-info",
										children: [/* @__PURE__ */ jsx("span", {
											className: "admin-activity-name",
											children: p.partnerName
										}), /* @__PURE__ */ jsxs("span", {
											className: "admin-activity-meta",
											children: [
												p.leadsTouched,
												" touched · ",
												p.completedLeads,
												" completed · ",
												p.activeLeads,
												" active"
											]
										})]
									}),
									/* @__PURE__ */ jsx("span", {
										className: "admin-activity-status",
										style: { color: p.activeLeads > 0 ? "var(--green)" : "var(--muted)" },
										children: p.lastActivityAt ? new Date(p.lastActivityAt).toLocaleDateString("en-IN") : "-"
									})
								]
							}, p.partnerId)), (overview?.partnerActivity || []).length === 0 ? /* @__PURE__ */ jsx("p", {
								className: "admin-muted",
								children: "No partner activity data."
							}) : null]
						})]
					})
				]
			})
		]
	});
}
var PAGE_SIZE = 15;
function LeadBucketSection({ leads, onOpenTimeline }) {
	const [filterStatus, setFilterStatus] = useState("All");
	const [page, setPage] = useState(1);
	const filtered = useMemo(() => filterStatus === "All" ? leads : leads.filter((l) => l.status === filterStatus), [leads, filterStatus]);
	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const safePage = Math.min(page, totalPages);
	const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
	const pending = leads.filter((l) => l.status === "Pending").length;
	const inProg = leads.filter((l) => l.status === "In Progress").length;
	const completed = leads.filter((l) => l.status === "Completed").length;
	const totalLeadCount = leads.length;
	return /* @__PURE__ */ jsxs("div", {
		className: "admin-section",
		children: [
			/* @__PURE__ */ jsx("h2", {
				className: "admin-section-title",
				children: "Lead Bucket"
			}),
			/* @__PURE__ */ jsx("div", {
				className: "admin-bucket-totals",
				children: [
					"All",
					"Pending",
					"In Progress",
					"Completed",
					"Cancelled"
				].map((s) => {
					const count = s === "All" ? leads.length : leads.filter((l) => l.status === s).length;
					return /* @__PURE__ */ jsxs("button", {
						type: "button",
						className: `admin-bucket-pill${filterStatus === s ? " active" : ""}`,
						onClick: () => {
							setFilterStatus(s);
							setPage(1);
						},
						children: [/* @__PURE__ */ jsx("span", { children: s }), /* @__PURE__ */ jsx("span", {
							className: "admin-bucket-count",
							children: count
						})]
					}, s);
				})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-progress-row",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "admin-progress-bar",
					children: [
						/* @__PURE__ */ jsx("div", { style: {
							width: `${totalLeadCount === 0 ? 0 : Math.round(pending / totalLeadCount * 100)}%`,
							background: "#f59e0b"
						} }),
						/* @__PURE__ */ jsx("div", { style: {
							width: `${totalLeadCount === 0 ? 0 : Math.round(inProg / totalLeadCount * 100)}%`,
							background: "#0ea5c9"
						} }),
						/* @__PURE__ */ jsx("div", { style: {
							width: `${totalLeadCount === 0 ? 0 : Math.round(completed / totalLeadCount * 100)}%`,
							background: "#1d9e75"
						} })
					]
				}), /* @__PURE__ */ jsxs("span", {
					className: "admin-progress-meta",
					children: [
						completed,
						" of ",
						leads.length,
						" completed"
					]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-card",
				style: {
					padding: 0,
					overflow: "hidden"
				},
				children: [/* @__PURE__ */ jsx("div", {
					className: "lead-table-wrap",
					style: { margin: 0 },
					children: /* @__PURE__ */ jsxs("table", {
						className: "lead-table admin-lead-table",
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("th", { children: "ID" }),
							/* @__PURE__ */ jsx("th", { children: "Flow" }),
							/* @__PURE__ */ jsx("th", { children: "Type" }),
							/* @__PURE__ */ jsx("th", { children: "Model" }),
							/* @__PURE__ */ jsx("th", { children: "Seller" }),
							/* @__PURE__ */ jsx("th", { children: "Phone" }),
							/* @__PURE__ */ jsx("th", { children: "Address" }),
							/* @__PURE__ */ jsx("th", { children: "Landmark" }),
							/* @__PURE__ */ jsx("th", { children: "City" }),
							/* @__PURE__ */ jsx("th", { children: "Pincode" }),
							/* @__PURE__ */ jsx("th", { children: "List Price" }),
							/* @__PURE__ */ jsx("th", { children: "Quote" }),
							/* @__PURE__ */ jsx("th", { children: "Primary Slot" }),
							/* @__PURE__ */ jsx("th", { children: "Alternate Slot" }),
							/* @__PURE__ */ jsx("th", { children: "Partner" }),
							/* @__PURE__ */ jsx("th", { children: "Status" }),
							/* @__PURE__ */ jsx("th", { children: "Updated" }),
							/* @__PURE__ */ jsx("th", { children: "Timeline" })
						] }) }), /* @__PURE__ */ jsxs("tbody", { children: [rows.map((lead) => /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("code", {
								className: "admin-lead-id",
								children: lead.id
							}) }),
							/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("code", {
								className: "admin-lead-id",
								children: lead.userSellFlowId
							}) }),
							/* @__PURE__ */ jsx("td", { children: lead.leadType }),
							/* @__PURE__ */ jsx("td", { children: lead.modelName }),
							/* @__PURE__ */ jsx("td", { children: lead.seller }),
							/* @__PURE__ */ jsx("td", { children: lead.phone }),
							/* @__PURE__ */ jsx("td", { children: lead.sellerAddress }),
							/* @__PURE__ */ jsx("td", { children: lead.sellerLandmark }),
							/* @__PURE__ */ jsx("td", { children: lead.city }),
							/* @__PURE__ */ jsx("td", { children: lead.pincode }),
							/* @__PURE__ */ jsxs("td", {
								className: "admin-price",
								children: ["Rs. ", toInr(lead.listedPrice)]
							}),
							/* @__PURE__ */ jsxs("td", {
								className: "admin-price",
								children: ["Rs. ", toInr(lead.quotedPrice)]
							}),
							/* @__PURE__ */ jsx("td", { children: lead.primarySlot }),
							/* @__PURE__ */ jsx("td", { children: lead.alternateSlot }),
							/* @__PURE__ */ jsx("td", { children: lead.partner ?? /* @__PURE__ */ jsx("span", {
								className: "admin-unassigned",
								children: "Unassigned"
							}) }),
							/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(StatusBadge, { status: lead.status }) }),
							/* @__PURE__ */ jsx("td", {
								className: "admin-muted",
								children: new Date(lead.updatedAt).toLocaleString()
							}),
							/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "admin-page-btn",
								onClick: () => onOpenTimeline(lead),
								children: "View"
							}) })
						] }, lead.id)), rows.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
							colSpan: 18,
							className: "admin-muted",
							children: "No lead bucket data available."
						}) }) : null] })]
					})
				}), /* @__PURE__ */ jsxs("div", {
					className: "admin-pagination",
					children: [
						/* @__PURE__ */ jsx("button", {
							type: "button",
							className: "admin-page-btn",
							disabled: safePage <= 1,
							onClick: () => setPage((p) => p - 1),
							children: "‹ Prev"
						}),
						/* @__PURE__ */ jsxs("span", {
							className: "admin-page-info",
							children: [
								"Page ",
								safePage,
								" of ",
								totalPages
							]
						}),
						/* @__PURE__ */ jsx("button", {
							type: "button",
							className: "admin-page-btn",
							disabled: safePage >= totalPages,
							onClick: () => setPage((p) => p + 1),
							children: "Next ›"
						})
					]
				})]
			})
		]
	});
}
function LeadDispositionSection({ leads, summary, onOpenTimeline }) {
	const dispositionCounts = useMemo(() => {
		if (summary?.byDisposition?.length) return summary.byDisposition.map((item) => [item.key, item.count]).sort((a, b) => b[1] - a[1]);
		const map = {};
		leads.forEach((l) => {
			map[l.disposition] = (map[l.disposition] ?? 0) + 1;
		});
		return Object.entries(map).sort((a, b) => b[1] - a[1]);
	}, [leads, summary]);
	const statusCounts = useMemo(() => {
		const map = {
			Pending: 0,
			"In Progress": 0,
			Completed: 0,
			Cancelled: 0
		};
		if (summary?.byStatus?.length) {
			summary.byStatus.forEach((item) => {
				if (item.key === "AVAILABLE" || item.key === "CLAIMED") map.Pending += item.count;
				else if (item.key === "ACCEPTED" || item.key === "IN_PROGRESS") map["In Progress"] += item.count;
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
	const DISP_COLORS = [
		"#1d9e75",
		"#0ea5c9",
		"#8b5cf6",
		"#f59e0b",
		"#ef4444",
		"#ec4899"
	];
	return /* @__PURE__ */ jsxs("div", {
		className: "admin-section",
		children: [
			/* @__PURE__ */ jsx("h2", {
				className: "admin-section-title",
				children: "Lead Disposition"
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-two-col",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "admin-card",
					children: [/* @__PURE__ */ jsx("h3", {
						className: "admin-card-title",
						children: "Disposition Breakdown"
					}), /* @__PURE__ */ jsxs("div", {
						className: "admin-disp-list",
						children: [dispositionCounts.map(([label, count], i) => /* @__PURE__ */ jsxs("div", {
							className: "admin-disp-row",
							children: [
								/* @__PURE__ */ jsx("span", {
									className: "admin-disp-label",
									children: label
								}),
								/* @__PURE__ */ jsx("div", {
									className: "admin-disp-bar-wrap",
									children: /* @__PURE__ */ jsx("div", {
										className: "admin-disp-bar",
										style: {
											width: `${Math.round(count / max * 100)}%`,
											background: DISP_COLORS[i % DISP_COLORS.length]
										}
									})
								}),
								/* @__PURE__ */ jsx("span", {
									className: "admin-disp-count",
									children: count
								})
							]
						}, label)), dispositionCounts.length === 0 ? /* @__PURE__ */ jsx("p", {
							className: "admin-muted",
							children: "No disposition data available."
						}) : null]
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "admin-card",
					children: [/* @__PURE__ */ jsx("h3", {
						className: "admin-card-title",
						children: "Status × Disposition Heatmap"
					}), /* @__PURE__ */ jsxs("div", {
						className: "admin-heatmap",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "admin-heatmap-head",
							children: [/* @__PURE__ */ jsx("span", {}), STATUSES.map((s) => /* @__PURE__ */ jsx("span", {
								style: {
									color: STATUS_COLORS[s],
									fontSize: 11
								},
								children: s
							}, s))]
						}), dispositionCounts.map(([disp]) => {
							return /* @__PURE__ */ jsxs("div", {
								className: "admin-heatmap-row",
								children: [/* @__PURE__ */ jsx("span", {
									className: "admin-heatmap-label",
									children: disp
								}), STATUSES.map((s) => {
									const cnt = summary ? Math.round((dispositionCounts.find(([label]) => label === disp)?.[1] || 0) * statusCounts[s] / Math.max(1, leads.length)) : leads.filter((l) => l.disposition === disp && l.status === s).length;
									const hex = Math.round(Math.min(1, cnt / 5) * 200 + 30).toString(16).padStart(2, "0");
									return /* @__PURE__ */ jsx("span", {
										className: "admin-heatmap-cell",
										style: { background: `${STATUS_COLORS[s]}${hex}` },
										title: `${disp} + ${s}: ${cnt}`,
										children: cnt
									}, s);
								})]
							}, disp);
						})]
					})]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-card",
				style: { marginTop: 20 },
				children: [/* @__PURE__ */ jsx("h3", {
					className: "admin-card-title",
					children: "Recent Dispositioned Leads"
				}), /* @__PURE__ */ jsx("div", {
					className: "lead-table-wrap",
					style: { margin: 0 },
					children: /* @__PURE__ */ jsxs("table", {
						className: "lead-table admin-lead-table",
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("th", { children: "ID" }),
							/* @__PURE__ */ jsx("th", { children: "Phone" }),
							/* @__PURE__ */ jsx("th", { children: "Disposition" }),
							/* @__PURE__ */ jsx("th", { children: "Status" }),
							/* @__PURE__ */ jsx("th", { children: "Partner" }),
							/* @__PURE__ */ jsx("th", { children: "Date" })
						] }) }), /* @__PURE__ */ jsxs("tbody", { children: [leads.slice(0, 12).map((l) => /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("code", {
								className: "admin-lead-id",
								children: l.id
							}) }),
							/* @__PURE__ */ jsx("td", { children: l.phone }),
							/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("span", {
								className: "admin-disp-tag",
								children: l.disposition
							}) }),
							/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(StatusBadge, { status: l.status }) }),
							/* @__PURE__ */ jsx("td", { children: l.partner ?? /* @__PURE__ */ jsx("span", {
								className: "admin-unassigned",
								children: "—"
							}) }),
							/* @__PURE__ */ jsx("td", {
								className: "admin-muted",
								children: /* @__PURE__ */ jsx("button", {
									type: "button",
									className: "admin-page-btn",
									onClick: () => onOpenTimeline(l),
									children: "View Timeline"
								})
							})
						] }, l.id)), leads.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
							colSpan: 6,
							className: "admin-muted",
							children: "No dispositioned leads available."
						}) }) : null] })]
					})
				})]
			})
		]
	});
}
function LeadTimelineModal({ lead, rows, loading, error, onClose }) {
	return /* @__PURE__ */ jsx("div", {
		className: "admin-backdrop",
		onClick: onClose,
		role: "presentation",
		children: /* @__PURE__ */ jsxs("div", {
			className: "admin-card",
			style: {
				width: "min(980px, 94vw)",
				maxHeight: "82vh",
				overflow: "auto",
				margin: "48px auto",
				padding: 20
			},
			onClick: (event) => event.stopPropagation(),
			role: "dialog",
			"aria-modal": "true",
			"aria-label": "Lead disposition timeline",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "admin-card-toprow",
					children: [/* @__PURE__ */ jsxs("h3", {
						className: "admin-card-title",
						children: ["Timeline · ", lead.id]
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "admin-page-btn",
						onClick: onClose,
						children: "Close"
					})]
				}),
				/* @__PURE__ */ jsxs("p", {
					className: "admin-muted",
					style: { marginBottom: 12 },
					children: [
						lead.modelName,
						" · ",
						lead.seller,
						" · ",
						lead.pincode
					]
				}),
				loading ? /* @__PURE__ */ jsx("p", {
					className: "admin-muted",
					children: "Loading timeline..."
				}) : null,
				error ? /* @__PURE__ */ jsx("p", {
					className: "admin-muted",
					style: { color: "#ef4444" },
					children: error
				}) : null,
				/* @__PURE__ */ jsx("div", {
					className: "lead-table-wrap",
					style: { margin: 0 },
					children: /* @__PURE__ */ jsxs("table", {
						className: "lead-table admin-lead-table",
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("th", { children: "At" }),
							/* @__PURE__ */ jsx("th", { children: "Disposition" }),
							/* @__PURE__ */ jsx("th", { children: "From" }),
							/* @__PURE__ */ jsx("th", { children: "To" }),
							/* @__PURE__ */ jsx("th", { children: "Actor Role" }),
							/* @__PURE__ */ jsx("th", { children: "Actor" }),
							/* @__PURE__ */ jsx("th", { children: "Note" })
						] }) }), /* @__PURE__ */ jsxs("tbody", { children: [rows.map((event) => /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("td", {
								className: "admin-muted",
								children: new Date(event.createdAt).toLocaleString()
							}),
							/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("span", {
								className: "admin-disp-tag",
								children: event.dispositionKey
							}) }),
							/* @__PURE__ */ jsx("td", { children: event.fromStatus || "-" }),
							/* @__PURE__ */ jsx("td", { children: event.toStatus }),
							/* @__PURE__ */ jsx("td", { children: event.actorRole }),
							/* @__PURE__ */ jsx("td", { children: event.actorId }),
							/* @__PURE__ */ jsx("td", { children: event.note || "-" })
						] }, event.id)), !loading && rows.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
							colSpan: 7,
							className: "admin-muted",
							children: "No timeline events found for this lead."
						}) }) : null] })]
					})
				})
			]
		})
	});
}
function LeadAssignmentSection({ leads, adminToken, metrics, onAssigned }) {
	const [assignMode, setAssignMode] = useState("Auto");
	const [selectedLead, setSelectedLead] = useState(null);
	const [selectedPartner, setSelectedPartner] = useState("");
	const [savingAssign, setSavingAssign] = useState(false);
	const [toastMsg, setToastMsg] = useState(null);
	const unassigned = leads.filter((l) => !l.partner && l.status === "Pending");
	const autoLeads = leads.filter((l) => l.assignMode === "Auto");
	const manualLeads = metrics?.manualAssigned ?? leads.filter((l) => l.assignMode === "Manual").length;
	const handleAssign = async () => {
		if (!selectedLead || !selectedPartner) return;
		setSavingAssign(true);
		try {
			await assignAdminLead(adminToken, selectedLead, {
				partnerId: selectedPartner,
				mode: "MANUAL"
			});
			onAssigned();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to assign lead.");
			setSavingAssign(false);
			return;
		}
		setSavingAssign(false);
		setToastMsg(`Lead ${selectedLead} assigned to ${selectedPartner}`);
		setTimeout(() => setToastMsg(null), 3e3);
		setSelectedLead(null);
		setSelectedPartner("");
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "admin-section",
		children: [
			/* @__PURE__ */ jsx("h2", {
				className: "admin-section-title",
				children: "Lead Assignment"
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-stat-grid",
				style: { gridTemplateColumns: "repeat(3, 1fr)" },
				children: [
					/* @__PURE__ */ jsx(StatCard, {
						label: "Auto Assigned",
						value: metrics?.claimed ?? autoLeads.length,
						sub: "System/claim assigned",
						icon: Zap,
						accent: "#0ea5c9"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Manual Assigned",
						value: manualLeads,
						sub: "Admin assigned",
						icon: Sliders,
						accent: "#8b5cf6"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Unassigned",
						value: metrics?.unassigned ?? unassigned.length,
						sub: "Awaiting partner",
						icon: AlertCircle,
						accent: "#f59e0b"
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-two-col",
				style: { marginTop: 20 },
				children: [/* @__PURE__ */ jsxs("div", {
					className: "admin-card",
					children: [
						/* @__PURE__ */ jsx("h3", {
							className: "admin-card-title",
							children: "Assignment Mode Control"
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "admin-mode-toggle",
							children: [/* @__PURE__ */ jsxs("button", {
								type: "button",
								className: `admin-mode-btn${assignMode === "Auto" ? " active" : ""}`,
								onClick: () => setAssignMode("Auto"),
								children: [/* @__PURE__ */ jsx(Zap, { size: 14 }), " Auto Assign"]
							}), /* @__PURE__ */ jsxs("button", {
								type: "button",
								className: `admin-mode-btn${assignMode === "Manual" ? " active" : ""}`,
								onClick: () => setAssignMode("Manual"),
								children: [/* @__PURE__ */ jsx(Sliders, { size: 14 }), " Manual Assign"]
							})]
						}),
						/* @__PURE__ */ jsx("p", {
							className: "admin-mode-desc",
							children: assignMode === "Auto" ? "System automatically routes new leads to the nearest available partner based on pincode matching and current load." : "Admin manually selects a partner for each unassigned lead. Use this when specific expertise or territory coverage is required."
						}),
						assignMode === "Manual" && /* @__PURE__ */ jsxs("div", {
							className: "admin-manual-form",
							children: [
								/* @__PURE__ */ jsx("label", {
									className: "admin-form-label",
									children: "Select Lead"
								}),
								/* @__PURE__ */ jsxs("select", {
									className: "admin-select",
									value: selectedLead ?? "",
									onChange: (e) => setSelectedLead(e.target.value),
									children: [/* @__PURE__ */ jsx("option", {
										value: "",
										children: "-- Pick a lead --"
									}), unassigned.slice(0, 15).map((l) => /* @__PURE__ */ jsxs("option", {
										value: l.id,
										children: [
											l.id,
											" · ",
											l.phone,
											" · ",
											l.city
										]
									}, l.id))]
								}),
								/* @__PURE__ */ jsx("label", {
									className: "admin-form-label",
									style: { marginTop: 12 },
									children: "Assign To Partner"
								}),
								/* @__PURE__ */ jsxs("select", {
									className: "admin-select",
									value: selectedPartner,
									onChange: (e) => setSelectedPartner(e.target.value),
									children: [/* @__PURE__ */ jsx("option", {
										value: "",
										children: "-- Pick a partner --"
									}), Array.from(new Set(leads.map((l) => l.partner).filter(Boolean))).map((partnerId) => /* @__PURE__ */ jsx("option", {
										value: partnerId || "",
										children: partnerId
									}, partnerId))]
								}),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "admin-assign-btn",
									disabled: !selectedLead || !selectedPartner || savingAssign,
									onClick: () => {
										handleAssign();
									},
									children: savingAssign ? "Assigning..." : "Assign Lead"
								})
							]
						})
					]
				}), /* @__PURE__ */ jsxs("div", {
					className: "admin-card",
					children: [/* @__PURE__ */ jsx("h3", {
						className: "admin-card-title",
						children: "Unassigned Leads Queue"
					}), /* @__PURE__ */ jsxs("div", {
						className: "admin-queue-list",
						children: [unassigned.slice(0, 8).map((l) => /* @__PURE__ */ jsxs("div", {
							className: "admin-queue-row",
							children: [
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
									className: "admin-lead-id",
									children: l.id
								}), /* @__PURE__ */ jsx("span", {
									className: "admin-queue-phone",
									children: l.phone
								})] }),
								/* @__PURE__ */ jsxs("div", {
									className: "admin-queue-meta",
									children: [
										/* @__PURE__ */ jsx(MapPin, { size: 12 }),
										" ",
										l.city,
										" · ",
										l.pincode
									]
								}),
								/* @__PURE__ */ jsx("span", {
									className: "admin-queue-badge",
									children: "Unassigned"
								})
							]
						}, l.id)), unassigned.length === 0 ? /* @__PURE__ */ jsx("p", {
							className: "admin-muted",
							children: "No unassigned leads."
						}) : null]
					})]
				})]
			}),
			toastMsg && /* @__PURE__ */ jsxs("div", {
				className: "admin-toast",
				children: [
					/* @__PURE__ */ jsx(CheckCircle2, { size: 16 }),
					" ",
					toastMsg
				]
			})
		]
	});
}
function LocationSection() {
	const [rows, setRows] = useState([]);
	const [uploadRows, setUploadRows] = useState([]);
	const [filter, setFilter] = useState("All");
	const [search, setSearch] = useState("");
	const [adminToken, setAdminToken] = useState(() => localStorage.getItem("gadgetpe_admin_access_token"));
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [savingPincode, setSavingPincode] = useState(null);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [createPincode, setCreatePincode] = useState("");
	const [createStatus, setCreateStatus] = useState("ACTIVE");
	const [createReason, setCreateReason] = useState("New pincode from admin UI");
	const [validationPreview, setValidationPreview] = useState(null);
	const [validationLoading, setValidationLoading] = useState(false);
	const [validationError, setValidationError] = useState(null);
	const [editingPincode, setEditingPincode] = useState(null);
	const [editStatus, setEditStatus] = useState("ACTIVE");
	const [editReason, setEditReason] = useState("");
	const [uploadingFiles, setUploadingFiles] = useState(false);
	const [uploadError, setUploadError] = useState(null);
	const [fileActionId, setFileActionId] = useState(null);
	const locationUploadHeaders = [
		"Pincode",
		"Status",
		"Reason"
	];
	const filterToStatus = {
		All: void 0,
		Active: "ACTIVE",
		Limited: "LIMITED",
		Inactive: "INACTIVE"
	};
	const fetchRows = async (token) => {
		setLoading(true);
		setError(null);
		try {
			setRows((await listServiceabilityPincodes(token, {
				status: filterToStatus[filter],
				search: search.trim() || void 0
			})).rows);
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
	const fetchUploadRows = async (token) => {
		try {
			setUploadRows((await listServiceabilityUploadHistory(token)).rows);
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
		fetchRows(adminToken);
		fetchUploadRows(adminToken);
	}, [
		adminToken,
		filter,
		search
	]);
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
			validateServiceabilityPincode(adminToken, createPincode.trim()).then((preview) => {
				setValidationPreview(preview);
			}).catch((err) => {
				setValidationPreview(null);
				setValidationError(err instanceof Error ? err.message : "Pincode validation failed.");
			}).finally(() => setValidationLoading(false));
		}, 350);
		return () => clearTimeout(timeout);
	}, [
		adminToken,
		showCreateForm,
		createPincode
	]);
	const handleToggle = async (pincode, enabled) => {
		if (!adminToken) return;
		setSavingPincode(pincode);
		setError(null);
		try {
			await toggleServiceabilityPincode(adminToken, pincode, enabled, enabled ? "Enabled from admin UI" : "Disabled from admin UI");
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
				reason: createReason.trim() || "New pincode from admin UI"
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
	const beginEdit = (row) => {
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
				reason: editReason.trim() || "Updated from admin UI"
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
	const handleDelete = async (pincode) => {
		if (!adminToken) return;
		setSavingPincode(pincode);
		setError(null);
		try {
			await deleteServiceabilityPincode(adminToken, pincode);
			if (editingPincode === pincode) setEditingPincode(null);
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
	const handleUploadFiles = async (event) => {
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
	const handleDeactivateUpload = async (uploadId) => {
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
	const handleDeleteUpload = async (uploadId) => {
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
	const COV_COLORS = {
		Active: "#1d9e75",
		Limited: "#f59e0b",
		Inactive: "#ef4444"
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "admin-section",
		children: [
			/* @__PURE__ */ jsx("h2", {
				className: "admin-section-title",
				children: "Location Management"
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-stat-grid",
				style: { gridTemplateColumns: "repeat(4, 1fr)" },
				children: [
					/* @__PURE__ */ jsx(StatCard, {
						label: "Total Zones",
						value: rows.length,
						sub: "API tracked pincodes",
						icon: MapPin,
						accent: "#1d9e75"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Active Zones",
						value: activeCount,
						sub: "Service enabled",
						icon: CheckCircle2,
						accent: "#1d9e75"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Limited Zones",
						value: limitedCount,
						sub: "Partial coverage",
						icon: AlertCircle,
						accent: "#f59e0b"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Inactive Zones",
						value: inactiveCount,
						sub: "Service disabled",
						icon: AlertCircle,
						accent: "#ef4444"
					})
				]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "admin-bucket-totals",
				style: { marginTop: 20 },
				children: [
					"All",
					"Active",
					"Limited",
					"Inactive"
				].map((f) => /* @__PURE__ */ jsx("button", {
					type: "button",
					className: `admin-bucket-pill${filter === f ? " active" : ""}`,
					onClick: () => setFilter(f),
					children: f
				}, f))
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-card",
				style: { marginTop: 12 },
				children: [/* @__PURE__ */ jsxs("div", {
					className: "admin-card-toprow",
					children: [/* @__PURE__ */ jsx("h3", {
						className: "admin-card-title",
						children: "Search Pincode"
					}), /* @__PURE__ */ jsx("input", {
						type: "search",
						placeholder: "Type pincode",
						className: "admin-search-input",
						value: search,
						onChange: (e) => setSearch(e.target.value)
					})]
				}), error ? /* @__PURE__ */ jsx("p", {
					className: "admin-muted",
					style: { color: "#ef4444" },
					children: error
				}) : null]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-card",
				style: { marginTop: 12 },
				children: [/* @__PURE__ */ jsxs("div", {
					className: "admin-card-toprow",
					children: [/* @__PURE__ */ jsx("h3", {
						className: "admin-card-title",
						children: "Manage Pincodes (CRUD)"
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "admin-save-btn",
						onClick: () => setShowCreateForm((prev) => !prev),
						children: showCreateForm ? "Close" : "+ Add Pincode"
					})]
				}), showCreateForm ? /* @__PURE__ */ jsxs("div", {
					className: "admin-manual-form",
					style: { marginTop: 12 },
					children: [
						/* @__PURE__ */ jsx("label", {
							className: "admin-form-label",
							children: "Pincode"
						}),
						/* @__PURE__ */ jsx("input", {
							className: "admin-input",
							type: "text",
							inputMode: "numeric",
							maxLength: 6,
							value: createPincode,
							onChange: (e) => setCreatePincode(e.target.value.replace(/\D/g, "")),
							placeholder: "Enter Indian pincode"
						}),
						/* @__PURE__ */ jsx("label", {
							className: "admin-form-label",
							style: { marginTop: 10 },
							children: "Status"
						}),
						/* @__PURE__ */ jsxs("select", {
							className: "admin-select",
							value: createStatus,
							onChange: (e) => setCreateStatus(e.target.value),
							children: [
								/* @__PURE__ */ jsx("option", {
									value: "ACTIVE",
									children: "ACTIVE"
								}),
								/* @__PURE__ */ jsx("option", {
									value: "LIMITED",
									children: "LIMITED"
								}),
								/* @__PURE__ */ jsx("option", {
									value: "INACTIVE",
									children: "INACTIVE"
								})
							]
						}),
						/* @__PURE__ */ jsx("label", {
							className: "admin-form-label",
							style: { marginTop: 10 },
							children: "Reason"
						}),
						/* @__PURE__ */ jsx("input", {
							className: "admin-input",
							type: "text",
							value: createReason,
							onChange: (e) => setCreateReason(e.target.value)
						}),
						validationLoading ? /* @__PURE__ */ jsx("p", {
							className: "admin-muted",
							children: "Validating pincode from backend..."
						}) : null,
						validationError ? /* @__PURE__ */ jsx("p", {
							className: "admin-muted",
							style: { color: "#ef4444" },
							children: validationError
						}) : null,
						validationPreview ? /* @__PURE__ */ jsx("div", {
							className: "admin-location-stats",
							style: { marginTop: 10 },
							children: /* @__PURE__ */ jsxs("span", { children: [
								/* @__PURE__ */ jsx(MapPin, { size: 12 }),
								" ",
								validationPreview.district,
								", ",
								validationPreview.state
							] })
						}) : null,
						/* @__PURE__ */ jsx("button", {
							type: "button",
							className: "admin-assign-btn",
							disabled: !adminToken || savingPincode === createPincode || !validationPreview,
							onClick: handleCreate,
							children: savingPincode === createPincode ? "Saving..." : "Create Pincode"
						})
					]
				}) : null]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-card",
				style: { marginTop: 12 },
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "admin-card-toprow",
						children: [/* @__PURE__ */ jsx("h3", {
							className: "admin-card-title",
							children: "Upload Pincodes Excel"
						}), /* @__PURE__ */ jsxs("label", {
							className: "admin-save-btn admin-upload-btn",
							style: {
								marginTop: 0,
								width: "auto",
								cursor: uploadingFiles ? "not-allowed" : "pointer"
							},
							children: [
								/* @__PURE__ */ jsx(Upload, { size: 16 }),
								/* @__PURE__ */ jsx("span", { children: uploadingFiles ? "Uploading..." : "Upload Excel" }),
								/* @__PURE__ */ jsx("input", {
									type: "file",
									accept: ".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
									multiple: true,
									hidden: true,
									disabled: !adminToken || uploadingFiles,
									onChange: handleUploadFiles
								})
							]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "admin-location-upload-rule",
						role: "alert",
						"aria-live": "polite",
						children: ["Only these Excel column names are supported: ", locationUploadHeaders.join(", ")]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "admin-muted",
						style: { marginTop: 10 },
						children: "Supported file types: `.xls`, `.xlsx`. Each row will create or update a pincode record."
					}),
					uploadError ? /* @__PURE__ */ jsx("p", {
						className: "admin-muted",
						style: {
							color: "#ef4444",
							marginTop: 10
						},
						children: uploadError
					}) : null
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-card",
				style: { marginTop: 12 },
				children: [/* @__PURE__ */ jsxs("div", {
					className: "admin-card-toprow",
					children: [/* @__PURE__ */ jsx("h3", {
						className: "admin-card-title",
						children: "Uploaded Files (CRUD)"
					}), /* @__PURE__ */ jsxs("span", {
						className: "admin-muted",
						children: [uploadRows.length, " file(s)"]
					})]
				}), /* @__PURE__ */ jsx("div", {
					className: "admin-location-upload-list",
					children: uploadRows.length === 0 ? /* @__PURE__ */ jsx("p", {
						className: "admin-muted",
						children: "No location excel files uploaded yet."
					}) : uploadRows.map((row) => /* @__PURE__ */ jsxs("div", {
						className: "admin-location-upload-card",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "admin-location-upload-head",
								children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("p", {
									className: "admin-location-area",
									children: [
										/* @__PURE__ */ jsx(FileSpreadsheet, { size: 14 }),
										" ",
										row.fileName
									]
								}), /* @__PURE__ */ jsxs("p", {
									className: "admin-location-city",
									children: [
										"Uploaded by ",
										row.uploadedBy,
										" on ",
										new Date(row.uploadedAt).toLocaleString()
									]
								})] }), /* @__PURE__ */ jsx("span", {
									className: `admin-upload-status-badge${row.status === "DEACTIVATED" ? " off" : ""}`,
									children: row.status
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "admin-location-stats",
								children: [
									/* @__PURE__ */ jsxs("span", { children: [
										/* @__PURE__ */ jsx(BarChart3, { size: 12 }),
										" Processed ",
										row.totalProcessed
									] }),
									/* @__PURE__ */ jsxs("span", { children: [
										/* @__PURE__ */ jsx(CheckCircle2, { size: 12 }),
										" New ",
										row.insertedCount
									] }),
									/* @__PURE__ */ jsxs("span", { children: [
										/* @__PURE__ */ jsx(TrendingUp, { size: 12 }),
										" Updated ",
										row.updatedCount
									] }),
									/* @__PURE__ */ jsxs("span", { children: [
										/* @__PURE__ */ jsx(MapPin, { size: 12 }),
										" Active rows ",
										row.activeRowCount
									] })
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "admin-mode-toggle",
								style: { marginTop: 10 },
								children: [/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "admin-mode-btn",
									disabled: !adminToken || fileActionId === row.id || row.status === "DEACTIVATED",
									onClick: () => handleDeactivateUpload(row.id),
									children: fileActionId === row.id && row.status !== "DEACTIVATED" ? "Working..." : "Deactivate"
								}), /* @__PURE__ */ jsx("button", {
									type: "button",
									className: "admin-mode-btn",
									disabled: !adminToken || fileActionId === row.id,
									onClick: () => handleDeleteUpload(row.id),
									children: fileActionId === row.id ? "Deleting..." : "Delete"
								})]
							})
						]
					}, row.id))
				})]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "admin-location-grid",
				children: rows.map((loc) => {
					const coverage = loc.status === "ACTIVE" ? "Active" : loc.status === "LIMITED" ? "Limited" : "Inactive";
					return /* @__PURE__ */ jsxs("div", {
						className: "admin-location-card",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "admin-location-head",
								children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("p", {
									className: "admin-location-area",
									children: ["Pincode ", loc.pincode]
								}), /* @__PURE__ */ jsxs("p", {
									className: "admin-location-city",
									children: [
										loc.district || "Unknown District",
										", ",
										loc.state || "Unknown State"
									]
								})] }), /* @__PURE__ */ jsx("span", {
									className: "admin-coverage-badge",
									style: {
										background: `${COV_COLORS[coverage]}18`,
										color: COV_COLORS[coverage]
									},
									children: coverage
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "admin-location-stats",
								children: [/* @__PURE__ */ jsxs("span", { children: [
									/* @__PURE__ */ jsx(Users, { size: 12 }),
									" Updated by ",
									loc.updatedBy
								] }), /* @__PURE__ */ jsxs("span", { children: [
									/* @__PURE__ */ jsx(BarChart3, { size: 12 }),
									" ",
									new Date(loc.updatedAt).toLocaleString()
								] })]
							}),
							editingPincode === loc.pincode ? /* @__PURE__ */ jsxs("div", {
								className: "admin-manual-form",
								style: { marginTop: 10 },
								children: [
									/* @__PURE__ */ jsx("label", {
										className: "admin-form-label",
										children: "Status"
									}),
									/* @__PURE__ */ jsxs("select", {
										className: "admin-select",
										value: editStatus,
										onChange: (e) => setEditStatus(e.target.value),
										children: [
											/* @__PURE__ */ jsx("option", {
												value: "ACTIVE",
												children: "ACTIVE"
											}),
											/* @__PURE__ */ jsx("option", {
												value: "LIMITED",
												children: "LIMITED"
											}),
											/* @__PURE__ */ jsx("option", {
												value: "INACTIVE",
												children: "INACTIVE"
											})
										]
									}),
									/* @__PURE__ */ jsx("label", {
										className: "admin-form-label",
										style: { marginTop: 8 },
										children: "Reason"
									}),
									/* @__PURE__ */ jsx("input", {
										className: "admin-input",
										value: editReason,
										onChange: (e) => setEditReason(e.target.value)
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "admin-mode-toggle",
										style: { marginTop: 10 },
										children: [/* @__PURE__ */ jsx("button", {
											type: "button",
											className: "admin-mode-btn active",
											disabled: !adminToken || savingPincode === loc.pincode,
											onClick: handleSaveEdit,
											children: savingPincode === loc.pincode ? "Saving..." : "Save"
										}), /* @__PURE__ */ jsx("button", {
											type: "button",
											className: "admin-mode-btn",
											onClick: () => setEditingPincode(null),
											children: "Cancel"
										})]
									})
								]
							}) : null,
							/* @__PURE__ */ jsxs("div", {
								className: "admin-mode-toggle",
								style: { marginTop: 10 },
								children: [
									/* @__PURE__ */ jsx("button", {
										type: "button",
										className: `admin-mode-btn${loc.status === "ACTIVE" ? " active" : ""}`,
										disabled: !adminToken || savingPincode === loc.pincode,
										onClick: () => handleToggle(loc.pincode, true),
										children: savingPincode === loc.pincode && loc.status !== "ACTIVE" ? "Saving..." : "Turn ON"
									}),
									/* @__PURE__ */ jsx("button", {
										type: "button",
										className: `admin-mode-btn${loc.status === "INACTIVE" ? " active" : ""}`,
										disabled: !adminToken || savingPincode === loc.pincode,
										onClick: () => handleToggle(loc.pincode, false),
										children: savingPincode === loc.pincode && loc.status !== "INACTIVE" ? "Saving..." : "Turn OFF"
									}),
									/* @__PURE__ */ jsx("button", {
										type: "button",
										className: "admin-mode-btn",
										disabled: !adminToken || savingPincode === loc.pincode,
										onClick: () => beginEdit(loc),
										children: "Edit"
									}),
									/* @__PURE__ */ jsx("button", {
										type: "button",
										className: "admin-mode-btn",
										disabled: !adminToken || savingPincode === loc.pincode,
										onClick: () => handleDelete(loc.pincode),
										children: "Delete"
									})
								]
							})
						]
					}, loc.pincode);
				})
			}),
			loading && adminToken ? /* @__PURE__ */ jsx("p", {
				className: "admin-muted",
				children: "Loading serviceability rows..."
			}) : null
		]
	});
}
var emptyDeductionRuleForm = {
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
	isActive: true
};
var defaultPreviewForm = {
	brandSlug: "",
	modelId: "",
	modelName: "",
	listedPrice: "",
	answerGroup: "basicFunctionality",
	answerKey: "",
	answerValue: ""
};
var quoteAnswerGroups = [
	{
		value: "basicFunctionality",
		label: "Basic Functionality"
	},
	{
		value: "physicalIssues",
		label: "Physical Issues"
	},
	{
		value: "nestedPhysicalIssueAnswers",
		label: "Physical Issue Details"
	},
	{
		value: "cameraAndBiometrics",
		label: "Camera & Biometrics"
	},
	{
		value: "sensorsAndConnectivity",
		label: "Sensors & Connectivity"
	},
	{
		value: "batteryAndCharging",
		label: "Battery & Charging"
	},
	{
		value: "accessoriesAndOwnership",
		label: "Accessories & Ownership"
	}
];
function buildPreviewDetails(form) {
	const { answerGroup, answerKey, answerValue } = form;
	const base = {
		basicFunctionality: {},
		physicalIssues: [],
		nestedPhysicalIssueAnswers: {},
		cameraAndBiometrics: {},
		sensorsAndConnectivity: {},
		batteryAndCharging: {},
		accessoriesAndOwnership: {}
	};
	if (!answerKey.trim()) return base;
	if (answerGroup === "physicalIssues") return {
		...base,
		physicalIssues: [answerKey.trim()]
	};
	if (answerGroup === "nestedPhysicalIssueAnswers") return {
		...base,
		nestedPhysicalIssueAnswers: { [answerKey.trim()]: answerValue.trim() }
	};
	return {
		...base,
		[answerGroup]: { [answerKey.trim()]: answerValue.trim() || "yes" }
	};
}
var _YN = ["yes", "no"];
var _YNA = [
	"yes",
	"no",
	"na"
];
var DEVICE_QUESTION_CATALOG = {
	basicFunctionality: [
		{
			key: "canMakeCalls",
			label: "Can make or receive calls?",
			options: [..._YNA]
		},
		{
			key: "touchWorking",
			label: "Touch screen working?",
			options: [..._YNA]
		},
		{
			key: "screenReplaced",
			label: "Screen been replaced?",
			options: [..._YNA]
		},
		{
			key: "displayWorking",
			label: "Display brightness & color OK?",
			options: [..._YNA]
		},
		{
			key: "originalDisplay",
			label: "Display is original?",
			options: [..._YNA]
		}
	],
	physicalIssues: [
		{
			key: "Any Dead spots",
			label: "Any Dead spots",
			options: []
		},
		{
			key: "Broken or Screen Scratches",
			label: "Broken or Screen Scratches",
			options: []
		},
		{
			key: "Dent or Marks on body",
			label: "Dent / Marks on body",
			options: []
		},
		{
			key: "Device Panel Broken / Missing",
			label: "Device Panel Broken / Missing",
			options: []
		}
	],
	nestedPhysicalIssueAnswers: [
		{
			key: "Any Dead spots",
			label: "Dead spots — where?",
			options: [
				"Top",
				"Bottom",
				"Left side",
				"Right side",
				"Multiple areas"
			]
		},
		{
			key: "Broken or Screen Scratches",
			label: "Screen damage — how bad?",
			options: [
				"Minor scratches",
				"Visible scratches",
				"Cracked glass",
				"Display bleeding"
			]
		},
		{
			key: "Dent or Marks on body",
			label: "Body damage — where?",
			options: [
				"Back panel",
				"Side frame",
				"Corners",
				"Multiple sides"
			]
		},
		{
			key: "Device Panel Broken / Missing",
			label: "Panel — what condition?",
			options: [
				"Back panel broken",
				"Back panel missing",
				"Camera glass broken",
				"Buttons missing"
			]
		}
	],
	cameraAndBiometrics: [
		{
			key: "frontCamera",
			label: "Front camera working?",
			options: [..._YNA]
		},
		{
			key: "rearCamera",
			label: "Rear camera working?",
			options: [..._YNA]
		},
		{
			key: "cameraFlash",
			label: "Camera flash working?",
			options: [..._YNA]
		},
		{
			key: "faceUnlock",
			label: "Face ID / Face Unlock working?",
			options: [..._YNA]
		},
		{
			key: "fingerprintSensor",
			label: "Fingerprint sensor working?",
			options: [..._YNA]
		},
		{
			key: "microphone",
			label: "Microphone working?",
			options: [..._YNA]
		},
		{
			key: "speaker",
			label: "Speaker working?",
			options: [..._YNA]
		},
		{
			key: "earSpeaker",
			label: "Ear speaker working?",
			options: [..._YNA]
		}
	],
	sensorsAndConnectivity: [
		{
			key: "proximitySensor",
			label: "Proximity sensor working?",
			options: [..._YN]
		},
		{
			key: "gyroSensor",
			label: "Gyro sensor working?",
			options: [..._YN]
		},
		{
			key: "accelerometer",
			label: "Accelerometer / auto-rotate OK?",
			options: [..._YN]
		},
		{
			key: "wifi",
			label: "WiFi working?",
			options: [..._YN]
		},
		{
			key: "bluetooth",
			label: "Bluetooth working?",
			options: [..._YN]
		},
		{
			key: "gps",
			label: "GPS / Location working?",
			options: [..._YN]
		},
		{
			key: "simNetwork",
			label: "SIM network working?",
			options: [..._YN]
		},
		{
			key: "vibration",
			label: "Vibration working?",
			options: [..._YN]
		}
	],
	batteryAndCharging: [
		{
			key: "charging",
			label: "Phone charging properly?",
			options: [..._YNA]
		},
		{
			key: "chargingPort",
			label: "Charging port loose or damaged?",
			options: [..._YNA]
		},
		{
			key: "batteryDrain",
			label: "Battery drains quickly?",
			options: [..._YNA]
		},
		{
			key: "heating",
			label: "Phone heats abnormally?",
			options: [..._YNA]
		},
		{
			key: "autoRestart",
			label: "Phone restarts automatically?",
			options: [..._YNA]
		},
		{
			key: "volumeButtons",
			label: "Volume buttons working?",
			options: [..._YNA]
		},
		{
			key: "powerButton",
			label: "Power button working?",
			options: [..._YNA]
		},
		{
			key: "alertSlider",
			label: "Silent switch / alert slider working?",
			options: [..._YNA]
		}
	],
	accessoriesAndOwnership: [
		{
			key: "originalBox",
			label: "Has original box?",
			options: [..._YN]
		},
		{
			key: "originalCharger",
			label: "Has original charger?",
			options: [..._YN]
		},
		{
			key: "billInvoice",
			label: "Has bill / invoice?",
			options: [..._YN]
		},
		{
			key: "underWarranty",
			label: "Under warranty?",
			options: [..._YN]
		},
		{
			key: "repairedBefore",
			label: "Repaired before?",
			options: [..._YN]
		},
		{
			key: "accountLocked",
			label: "Locked by iCloud / Google account?",
			options: [..._YN]
		},
		{
			key: "imeiAvailable",
			label: "IMEI available and matching?",
			options: [..._YN]
		},
		{
			key: "waterDamage",
			label: "Water damage present?",
			options: [..._YN]
		}
	]
};
function makeQuestionDraft(answerGroup, question, existingRule) {
	return {
		ruleId: existingRule?.id || null,
		answerValue: existingRule?.answerValue ?? "",
		label: existingRule?.label || question.label,
		deductionType: existingRule?.deductionType || "RUPEES",
		deductionValue: existingRule ? String(existingRule.deductionValue) : "",
		maxDeductionAmount: existingRule?.maxDeductionAmount != null ? String(existingRule.maxDeductionAmount) : "",
		priority: existingRule ? String(existingRule.priority) : "100",
		isActive: existingRule?.isActive ?? true,
		appliesToBrand: existingRule?.appliesToBrand ?? "",
		appliesToModelId: existingRule?.appliesToModelId ?? ""
	};
}
function buildGroupRuleDrafts(rules) {
	const grouped = {};
	quoteAnswerGroups.forEach((group) => {
		const questions = DEVICE_QUESTION_CATALOG[group.value] || [];
		grouped[group.value] = {};
		questions.forEach((question) => {
			const existing = rules.find((rule) => rule.answerGroup === group.value && rule.answerKey === question.key);
			grouped[group.value][question.key] = makeQuestionDraft(group.value, question, existing);
		});
	});
	return grouped;
}
function PriceManagementSection() {
	const [adminToken, setAdminToken] = useState(() => localStorage.getItem("gadgetpe_admin_access_token"));
	const [search, setSearch] = useState("");
	const [rows, setRows] = useState([]);
	const [uploadHistory, setUploadHistory] = useState([]);
	const [expectedHeaders, setExpectedHeaders] = useState([
		"Brand",
		"Series",
		"Model",
		"Variant",
		"Launch Year",
		"GadgetPe Price"
	]);
	const [selectedFiles, setSelectedFiles] = useState([]);
	const [uploadInputKey, setUploadInputKey] = useState(0);
	const [loading, setLoading] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState(null);
	const [lastUploadSummary, setLastUploadSummary] = useState(null);
	const [uploadActionId, setUploadActionId] = useState(null);
	const [uploadActionType, setUploadActionType] = useState(null);
	const [deductionRules, setDeductionRules] = useState([]);
	const [deductionForm, setDeductionForm] = useState(emptyDeductionRuleForm);
	const [editingRuleId, setEditingRuleId] = useState(null);
	const [savingRule, setSavingRule] = useState(false);
	const [ruleActionId, setRuleActionId] = useState(null);
	const [groupRuleDrafts, setGroupRuleDrafts] = useState(() => buildGroupRuleDrafts([]));
	const [savingQuestionKey, setSavingQuestionKey] = useState(null);
	const [previewForm, setPreviewForm] = useState(defaultPreviewForm);
	const [quotePreview, setQuotePreview] = useState(null);
	const [previewingQuote, setPreviewingQuote] = useState(false);
	const [isCatalogExpanded, setIsCatalogExpanded] = useState(false);
	const fetchCatalog = async (token) => {
		setLoading(true);
		setError(null);
		try {
			const result = await listPriceCatalog(token, search.trim() || void 0);
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
	const fetchUploadHistory = async (token) => {
		try {
			setUploadHistory((await listPriceUploadHistory(token)).rows);
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
	const fetchDeductionRules = async (token) => {
		try {
			setDeductionRules((await listQuoteDeductionRules(token)).rows);
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
		fetchCatalog(adminToken);
		fetchUploadHistory(adminToken);
		fetchDeductionRules(adminToken);
	}, [adminToken, search]);
	useEffect(() => {
		setGroupRuleDrafts(buildGroupRuleDrafts(deductionRules));
	}, [deductionRules]);
	const updateQuestionDraft = (group, questionKey, patch) => {
		setGroupRuleDrafts((prev) => ({
			...prev,
			[group]: {
				...prev[group] || {},
				[questionKey]: {
					...prev[group]?.[questionKey] || makeQuestionDraft(group, {
						key: questionKey,
						label: questionKey,
						options: []
					}),
					...patch
				}
			}
		}));
	};
	const saveQuestionRule = async (group, question) => {
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
		const payload = {
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
			appliesToModelId: draft.appliesToModelId.trim() || null
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
	const handleToggleRule = async (rule) => {
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
			setQuotePreview((await previewQuoteDeductions(adminToken, {
				selectedModel: {
					brandSlug: previewForm.brandSlug.trim(),
					modelId: previewForm.modelId.trim(),
					modelName: previewForm.modelName.trim(),
					listedPrice: Math.round(listedPrice)
				},
				deviceDetails: buildPreviewDetails(previewForm)
			})).quote);
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
			setLastUploadSummary(summary.uploads.map((item) => `Uploaded ${item.sourceFileName}: processed ${item.totalProcessed}, inserted ${item.insertedCount}, updated ${item.updatedCount}`));
			toast.success(selectedFiles.length === 1 ? "Price catalog uploaded successfully." : `${selectedFiles.length} price catalogs uploaded successfully.`);
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
	const handleUpdateUploadStatus = async (uploadId, status) => {
		if (!adminToken) return;
		setUploadActionId(uploadId);
		setUploadActionType(status === "ACTIVE" ? "activate" : "deactivate");
		setError(null);
		try {
			const result = await updatePriceUploadStatus(adminToken, uploadId, status);
			if (status === "ACTIVE") toast.success(`Activated ${result.fileName}${typeof result.restoredCatalogRows === "number" ? ` (${result.restoredCatalogRows} rows restored)` : ""}.`);
			else toast.success(`Deactivated ${result.fileName}${typeof result.deactivatedCatalogRows === "number" ? ` (${result.deactivatedCatalogRows} rows removed from active catalog)` : ""}.`);
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
	const handleDeleteUpload = async (uploadId) => {
		if (!adminToken) return;
		setUploadActionId(uploadId);
		setUploadActionType("delete");
		setError(null);
		try {
			const result = await deletePriceUpload(adminToken, uploadId);
			toast.success(`Deleted ${result.fileName} (${result.deletedSnapshotRows} snapshot rows removed).`);
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
	return /* @__PURE__ */ jsxs("div", {
		className: "admin-section",
		children: [
			/* @__PURE__ */ jsx("h2", {
				className: "admin-section-title",
				children: "Price Management"
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-card",
				children: [
					/* @__PURE__ */ jsx("h3", {
						className: "admin-card-title",
						children: "Required Excel Column Labels (Strict)"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "admin-muted",
						children: "Use exact headers and same order:"
					}),
					/* @__PURE__ */ jsx("div", {
						className: "admin-location-stats",
						style: { marginTop: 8 },
						children: expectedHeaders.map((header) => /* @__PURE__ */ jsx("span", { children: header }, header))
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-card",
				style: { marginTop: 12 },
				children: [
					/* @__PURE__ */ jsx("h3", {
						className: "admin-card-title",
						children: "Upload Price Excel"
					}),
					/* @__PURE__ */ jsx("input", {
						type: "file",
						accept: ".xlsx,.xls",
						multiple: true,
						className: "admin-input",
						onChange: (e) => setSelectedFiles(Array.from(e.target.files ?? []))
					}, uploadInputKey),
					/* @__PURE__ */ jsx("div", {
						style: { marginTop: 10 },
						children: /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "admin-save-btn",
							disabled: !adminToken || uploading || selectedFiles.length === 0,
							onClick: uploadFile,
							children: uploading ? "Uploading..." : "Upload and Save"
						})
					}),
					selectedFiles.length > 0 ? /* @__PURE__ */ jsxs("div", {
						className: "admin-muted",
						children: [/* @__PURE__ */ jsxs("p", { children: [
							"Selected ",
							selectedFiles.length,
							" file",
							selectedFiles.length === 1 ? "" : "s",
							":"
						] }), /* @__PURE__ */ jsx("ul", {
							style: {
								margin: "6px 0 0",
								paddingLeft: 18
							},
							children: selectedFiles.map((file) => /* @__PURE__ */ jsx("li", { children: file.name }, `${file.name}-${file.lastModified}`))
						})]
					}) : null,
					lastUploadSummary ? /* @__PURE__ */ jsx("div", {
						className: "admin-muted",
						style: { color: "#1d9e75" },
						children: lastUploadSummary.map((item) => /* @__PURE__ */ jsx("p", {
							style: { margin: "4px 0" },
							children: item
						}, item))
					}) : null,
					error ? /* @__PURE__ */ jsx("p", {
						className: "admin-muted",
						style: { color: "#ef4444" },
						children: error
					}) : null
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-pricing-deduction-grid",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "admin-card",
					children: [
						/* @__PURE__ */ jsx("div", {
							className: "admin-card-toprow",
							children: /* @__PURE__ */ jsx("h3", {
								className: "admin-card-title",
								children: "Quote Deduction Rule Master"
							})
						}),
						/* @__PURE__ */ jsx("p", {
							className: "admin-muted",
							style: { marginBottom: 10 },
							children: "Each question group has a separate master accordion. Configure deduction type (Percent or Rupees), value, and save rule per question."
						}),
						/* @__PURE__ */ jsx("div", {
							style: {
								display: "grid",
								gap: 10
							},
							children: quoteAnswerGroups.map((group) => {
								const questions = DEVICE_QUESTION_CATALOG[group.value] || [];
								const activeCount = deductionRules.filter((rule) => rule.answerGroup === group.value && rule.isActive).length;
								return /* @__PURE__ */ jsxs("details", {
									className: "admin-card",
									style: { margin: 0 },
									children: [/* @__PURE__ */ jsxs("summary", {
										style: {
											cursor: "pointer",
											fontWeight: 700,
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center"
										},
										children: [/* @__PURE__ */ jsx("span", { children: group.label }), /* @__PURE__ */ jsxs("span", {
											className: "admin-muted",
											style: {
												fontWeight: 500,
												display: "inline-flex",
												alignItems: "center",
												gap: 8
											},
											children: [/* @__PURE__ */ jsxs("span", { children: [
												questions.length,
												" questions • ",
												activeCount,
												" active rules"
											] }), /* @__PURE__ */ jsx(ChevronDown, {
												size: 16,
												"aria-hidden": "true"
											})]
										})]
									}), /* @__PURE__ */ jsx("div", {
										style: {
											marginTop: 12,
											display: "grid",
											gap: 10
										},
										children: questions.map((question) => {
											const draft = groupRuleDrafts[group.value]?.[question.key] || makeQuestionDraft(group.value, question);
											const running = savingQuestionKey === `${group.value}:${question.key}`;
											const existingRule = draft.ruleId ? deductionRules.find((rule) => rule.id === draft.ruleId) : null;
											return /* @__PURE__ */ jsxs("div", {
												style: {
													border: "1px solid #1f4d3f2b",
													borderRadius: 10,
													padding: 10
												},
												children: [
													/* @__PURE__ */ jsxs("div", {
														style: {
															display: "flex",
															justifyContent: "space-between",
															alignItems: "center",
															gap: 12,
															flexWrap: "wrap"
														},
														children: [/* @__PURE__ */ jsx("strong", { children: question.label }), /* @__PURE__ */ jsx("span", {
															className: "admin-muted",
															children: existingRule ? existingRule.isActive ? "Rule ACTIVE" : "Rule PAUSED" : "No rule yet"
														})]
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "admin-rule-form-grid compact",
														style: { marginTop: 8 },
														children: [
															group.value === "physicalIssues" ? /* @__PURE__ */ jsxs("label", {
																className: "admin-field-row",
																children: [/* @__PURE__ */ jsx("span", {
																	className: "admin-form-label",
																	children: "Trigger"
																}), /* @__PURE__ */ jsx("span", {
																	className: "admin-rule-trigger-hint",
																	children: "Issue reported"
																})]
															}) : /* @__PURE__ */ jsxs("label", {
																className: "admin-field-row",
																children: [/* @__PURE__ */ jsx("span", {
																	className: "admin-form-label",
																	children: "Answer Value"
																}), /* @__PURE__ */ jsxs("select", {
																	className: "admin-select",
																	value: draft.answerValue,
																	onChange: (e) => updateQuestionDraft(group.value, question.key, { answerValue: e.target.value }),
																	children: [/* @__PURE__ */ jsx("option", {
																		value: "",
																		children: "any answer"
																	}), question.options.map((opt) => /* @__PURE__ */ jsx("option", {
																		value: opt,
																		children: opt
																	}, opt))]
																})]
															}),
															/* @__PURE__ */ jsxs("label", {
																className: "admin-field-row",
																children: [/* @__PURE__ */ jsx("span", {
																	className: "admin-form-label",
																	children: "Label"
																}), /* @__PURE__ */ jsx("input", {
																	className: "admin-input",
																	value: draft.label,
																	onChange: (e) => updateQuestionDraft(group.value, question.key, { label: e.target.value }),
																	placeholder: question.label
																})]
															}),
															/* @__PURE__ */ jsxs("label", {
																className: "admin-field-row",
																children: [/* @__PURE__ */ jsx("span", {
																	className: "admin-form-label",
																	children: "Price Deduction"
																}), /* @__PURE__ */ jsxs("div", {
																	style: {
																		display: "inline-flex",
																		gap: 6
																	},
																	children: [/* @__PURE__ */ jsx("button", {
																		type: "button",
																		className: "admin-mode-btn",
																		style: {
																			borderColor: draft.deductionType === "PERCENT" ? "#0f766e" : void 0,
																			color: draft.deductionType === "PERCENT" ? "#0f766e" : void 0
																		},
																		onClick: () => updateQuestionDraft(group.value, question.key, { deductionType: "PERCENT" }),
																		children: "%"
																	}), /* @__PURE__ */ jsx("button", {
																		type: "button",
																		className: "admin-mode-btn",
																		style: {
																			borderColor: draft.deductionType === "RUPEES" ? "#0f766e" : void 0,
																			color: draft.deductionType === "RUPEES" ? "#0f766e" : void 0
																		},
																		onClick: () => updateQuestionDraft(group.value, question.key, { deductionType: "RUPEES" }),
																		children: "Rs"
																	})]
																})]
															}),
															/* @__PURE__ */ jsxs("label", {
																className: "admin-field-row",
																children: [/* @__PURE__ */ jsx("span", {
																	className: "admin-form-label",
																	children: "Value"
																}), /* @__PURE__ */ jsx("input", {
																	className: "admin-input",
																	type: "number",
																	min: "0",
																	value: draft.deductionValue,
																	onChange: (e) => updateQuestionDraft(group.value, question.key, { deductionValue: e.target.value }),
																	placeholder: draft.deductionType === "PERCENT" ? "10" : "1000"
																})]
															})
														]
													}),
													/* @__PURE__ */ jsxs("div", {
														style: {
															marginTop: 8,
															display: "flex",
															gap: 8,
															flexWrap: "wrap"
														},
														children: [/* @__PURE__ */ jsx("button", {
															type: "button",
															className: "admin-save-btn",
															disabled: !adminToken || running,
															onClick: () => void saveQuestionRule(group.value, question),
															children: running ? "Saving..." : draft.ruleId ? "Update Rule" : "Save Rule"
														}), existingRule ? /* @__PURE__ */ jsx("button", {
															type: "button",
															className: "admin-mode-btn",
															disabled: true,
															onClick: () => void handleToggleRule(existingRule),
															children: "Pause"
														}) : null]
													})
												]
											}, question.key);
										})
									})]
								}, group.value);
							})
						})
					]
				}), /* @__PURE__ */ jsxs("div", {
					className: "admin-card",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "admin-card-toprow",
							children: [/* @__PURE__ */ jsxs("div", {
								style: {
									display: "inline-flex",
									alignItems: "center",
									gap: 8
								},
								children: [/* @__PURE__ */ jsx("h3", {
									className: "admin-card-title",
									style: { margin: 0 },
									children: "Quote Preview"
								}), /* @__PURE__ */ jsx("span", {
									className: "admin-muted",
									style: { fontWeight: 600 },
									children: "Paused now"
								})]
							}), /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "admin-mode-btn",
								disabled: !adminToken || previewingQuote,
								onClick: runQuotePreview,
								children: previewingQuote ? "Calculating..." : "Calculate"
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "admin-rule-form-grid compact",
							children: [
								/* @__PURE__ */ jsx("input", {
									className: "admin-input",
									value: previewForm.brandSlug,
									onChange: (e) => setPreviewForm((prev) => ({
										...prev,
										brandSlug: e.target.value
									})),
									placeholder: "Brand slug"
								}),
								/* @__PURE__ */ jsx("input", {
									className: "admin-input",
									value: previewForm.modelId,
									onChange: (e) => setPreviewForm((prev) => ({
										...prev,
										modelId: e.target.value
									})),
									placeholder: "Model ID"
								}),
								/* @__PURE__ */ jsx("input", {
									className: "admin-input",
									value: previewForm.modelName,
									onChange: (e) => setPreviewForm((prev) => ({
										...prev,
										modelName: e.target.value
									})),
									placeholder: "Model name"
								}),
								/* @__PURE__ */ jsx("input", {
									className: "admin-input",
									type: "number",
									value: previewForm.listedPrice,
									onChange: (e) => setPreviewForm((prev) => ({
										...prev,
										listedPrice: e.target.value
									})),
									placeholder: "Base price"
								}),
								/* @__PURE__ */ jsx("select", {
									className: "admin-select",
									value: previewForm.answerGroup,
									disabled: true,
									children: /* @__PURE__ */ jsx("option", {
										value: previewForm.answerGroup,
										children: "Pause"
									})
								}),
								/* @__PURE__ */ jsx("input", {
									className: "admin-input",
									value: previewForm.answerKey,
									onChange: (e) => setPreviewForm((prev) => ({
										...prev,
										answerKey: e.target.value
									})),
									placeholder: "Answer key"
								}),
								/* @__PURE__ */ jsx("input", {
									className: "admin-input",
									value: previewForm.answerValue,
									onChange: (e) => setPreviewForm((prev) => ({
										...prev,
										answerValue: e.target.value
									})),
									placeholder: "Answer value"
								})
							]
						}),
						quotePreview ? /* @__PURE__ */ jsxs("div", {
							className: "admin-quote-preview-box",
							children: [
								/* @__PURE__ */ jsxs("span", { children: ["Base Rs. ", toInr(Math.round(quotePreview.basePrice || 0))] }),
								/* @__PURE__ */ jsxs("span", { children: ["Deduction Rs. ", toInr(Math.round(quotePreview.totalDeduction || 0))] }),
								/* @__PURE__ */ jsxs("strong", { children: ["Quote Rs. ", toInr(Math.round(quotePreview.sellingPrice))] }),
								/* @__PURE__ */ jsxs("div", {
									className: "admin-quote-deduction-list",
									children: [(quotePreview.deductions || []).map((item) => /* @__PURE__ */ jsxs("span", { children: [
										item.label,
										": -Rs. ",
										toInr(Math.round(item.deductionAmount))
									] }, item.ruleId)), quotePreview.deductions?.length === 0 ? /* @__PURE__ */ jsx("span", { children: "No active deductions matched." }) : null]
								})
							]
						}) : null
					]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-card",
				style: { marginTop: 12 },
				children: [/* @__PURE__ */ jsxs("div", {
					className: "admin-card-toprow",
					children: [/* @__PURE__ */ jsx("h3", {
						className: "admin-card-title",
						children: "Saved Quote Deduction Rules"
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "admin-mode-btn",
						disabled: !adminToken,
						onClick: () => adminToken && fetchDeductionRules(adminToken),
						children: "Refresh"
					})]
				}), /* @__PURE__ */ jsx("div", {
					className: "lead-table-wrap",
					style: { margin: 0 },
					children: /* @__PURE__ */ jsxs("table", {
						className: "lead-table admin-lead-table",
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("th", { children: "Rule" }),
							/* @__PURE__ */ jsx("th", { children: "Condition" }),
							/* @__PURE__ */ jsx("th", { children: "Deduction" }),
							/* @__PURE__ */ jsx("th", { children: "Scope" }),
							/* @__PURE__ */ jsx("th", { children: "Status" }),
							/* @__PURE__ */ jsx("th", { children: "Action" })
						] }) }), /* @__PURE__ */ jsxs("tbody", { children: [deductionRules.map((rule) => /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsxs("td", { children: [
								rule.label,
								/* @__PURE__ */ jsx("br", {}),
								/* @__PURE__ */ jsxs("span", {
									className: "admin-muted",
									children: ["Priority ", rule.priority]
								})
							] }),
							/* @__PURE__ */ jsxs("td", { children: [
								rule.answerGroup,
								".",
								rule.answerKey,
								rule.answerValue ? ` = ${rule.answerValue}` : ""
							] }),
							/* @__PURE__ */ jsx("td", { children: rule.deductionType === "PERCENT" ? `${rule.deductionValue}%` : `Rs. ${toInr(rule.deductionValue)}` }),
							/* @__PURE__ */ jsxs("td", { children: [rule.appliesToBrand || "All brands", rule.appliesToModelId ? ` / ${rule.appliesToModelId}` : ""] }),
							/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("span", {
								className: "admin-location-status",
								style: { color: rule.isActive ? "#15803d" : "#b45309" },
								children: rule.isActive ? "ACTIVE" : "PAUSED"
							}) }),
							/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("div", {
								className: "admin-rule-actions",
								children: /* @__PURE__ */ jsx("button", {
									type: "button",
									className: "admin-mode-btn",
									disabled: true,
									onClick: () => handleToggleRule(rule),
									children: "Pause"
								})
							}) })
						] }, rule.id)), deductionRules.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
							colSpan: 6,
							className: "admin-muted",
							children: "No quote deduction rules found."
						}) }) : null] })]
					})
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-card",
				style: { marginTop: 12 },
				children: [/* @__PURE__ */ jsxs("div", {
					className: "admin-card-toprow",
					children: [/* @__PURE__ */ jsx("h3", {
						className: "admin-card-title",
						children: "Saved Price Catalog"
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "admin-mode-btn",
						onClick: () => setIsCatalogExpanded((prev) => !prev),
						children: isCatalogExpanded ? "Hide Catalog" : "Show Catalog"
					})]
				}), isCatalogExpanded ? /* @__PURE__ */ jsxs(Fragment, { children: [
					/* @__PURE__ */ jsx("div", {
						style: { marginTop: 10 },
						children: /* @__PURE__ */ jsx("input", {
							type: "search",
							placeholder: "Search brand, series, model",
							className: "admin-search-input",
							value: search,
							onChange: (e) => setSearch(e.target.value)
						})
					}),
					/* @__PURE__ */ jsx("div", {
						className: "lead-table-wrap",
						style: { margin: "12px 0 0 0" },
						children: /* @__PURE__ */ jsxs("table", {
							className: "lead-table admin-lead-table",
							children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
								/* @__PURE__ */ jsx("th", { children: "Brand" }),
								/* @__PURE__ */ jsx("th", { children: "Series" }),
								/* @__PURE__ */ jsx("th", { children: "Model" }),
								/* @__PURE__ */ jsx("th", { children: "Storage" }),
								/* @__PURE__ */ jsx("th", { children: "Launch Year" }),
								/* @__PURE__ */ jsx("th", { children: "Listed Price" }),
								/* @__PURE__ */ jsx("th", { children: "Updated" })
							] }) }), /* @__PURE__ */ jsxs("tbody", { children: [rows.map((row) => /* @__PURE__ */ jsxs("tr", { children: [
								/* @__PURE__ */ jsx("td", { children: row.row?.Brand || row.brand }),
								/* @__PURE__ */ jsx("td", { children: row.row?.Series || row.series }),
								/* @__PURE__ */ jsx("td", { children: row.row?.Model || row.model }),
								/* @__PURE__ */ jsx("td", { children: row.row?.Storage || row.storage }),
								/* @__PURE__ */ jsx("td", { children: row.row?.["Launch Year"] || row.launchYear }),
								/* @__PURE__ */ jsxs("td", {
									className: "admin-price",
									children: ["Rs. ", toInr(Math.round(row.cashifyPrice))]
								}),
								/* @__PURE__ */ jsx("td", {
									className: "admin-muted",
									children: new Date(row.updatedAt).toLocaleString()
								})
							] }, row.id)), rows.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
								colSpan: 7,
								className: "admin-muted",
								children: "No price catalog rows found."
							}) }) : null] })]
						})
					}),
					loading ? /* @__PURE__ */ jsx("p", {
						className: "admin-muted",
						children: "Loading catalog..."
					}) : null
				] }) : /* @__PURE__ */ jsx("p", {
					className: "admin-muted",
					style: { marginTop: 10 },
					children: "Click \"Show Catalog\" to view table data."
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-card",
				style: { marginTop: 12 },
				children: [/* @__PURE__ */ jsxs("div", {
					className: "admin-card-toprow",
					children: [/* @__PURE__ */ jsx("h3", {
						className: "admin-card-title",
						children: "Upload History"
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "admin-mode-btn",
						disabled: !adminToken,
						onClick: () => adminToken && fetchUploadHistory(adminToken),
						children: "Refresh"
					})]
				}), /* @__PURE__ */ jsx("div", {
					className: "lead-table-wrap",
					style: { margin: 0 },
					children: /* @__PURE__ */ jsxs("table", {
						className: "lead-table admin-lead-table",
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("th", { children: "File Name" }),
							/* @__PURE__ */ jsx("th", { children: "Status" }),
							/* @__PURE__ */ jsx("th", { children: "Uploaded By" }),
							/* @__PURE__ */ jsx("th", { children: "Uploaded At" }),
							/* @__PURE__ */ jsx("th", { children: "Processed" }),
							/* @__PURE__ */ jsx("th", { children: "Active Rows" }),
							/* @__PURE__ */ jsx("th", { children: "Deactivated Rows" }),
							/* @__PURE__ */ jsx("th", { children: "Actions" })
						] }) }), /* @__PURE__ */ jsxs("tbody", { children: [uploadHistory.map((item) => {
							const busy = uploadActionId === item.id;
							return /* @__PURE__ */ jsxs("tr", { children: [
								/* @__PURE__ */ jsx("td", { children: item.fileName }),
								/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("span", {
									className: "admin-location-status",
									style: { color: item.status === "ACTIVE" ? "#15803d" : "#b45309" },
									children: item.status
								}) }),
								/* @__PURE__ */ jsx("td", { children: item.uploadedBy }),
								/* @__PURE__ */ jsx("td", {
									className: "admin-muted",
									children: new Date(item.uploadedAt).toLocaleString()
								}),
								/* @__PURE__ */ jsxs("td", { children: [
									item.totalProcessed,
									" (",
									item.insertedCount,
									" new, ",
									item.updatedCount,
									" updated)"
								] }),
								/* @__PURE__ */ jsx("td", { children: item.activeRowCount }),
								/* @__PURE__ */ jsx("td", { children: item.deactivatedRowCount }),
								/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsxs("div", {
									className: "admin-rule-actions",
									children: [item.status === "DEACTIVATED" ? /* @__PURE__ */ jsxs("button", {
										type: "button",
										className: "admin-mode-btn",
										disabled: !adminToken || busy,
										onClick: () => handleUpdateUploadStatus(item.id, "ACTIVE"),
										title: "Activate upload",
										children: [/* @__PURE__ */ jsx(Power, { size: 14 }), " Activate"]
									}) : /* @__PURE__ */ jsxs("button", {
										type: "button",
										className: "admin-mode-btn",
										disabled: !adminToken || busy,
										onClick: () => handleUpdateUploadStatus(item.id, "DEACTIVATED"),
										title: "Deactivate upload",
										children: [/* @__PURE__ */ jsx(PowerOff, { size: 14 }), " Deactivate"]
									}), /* @__PURE__ */ jsxs("button", {
										type: "button",
										className: "admin-mode-btn",
										disabled: !adminToken || busy || item.status !== "DEACTIVATED",
										onClick: () => handleDeleteUpload(item.id),
										title: "Delete upload permanently",
										children: [/* @__PURE__ */ jsx(Trash2, { size: 14 }), busy && uploadActionType === "delete" ? " Deleting..." : " Delete"]
									})]
								}) })
							] }, item.id);
						}), uploadHistory.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
							colSpan: 8,
							className: "admin-muted",
							children: "No upload history found."
						}) }) : null] })]
					})
				})]
			})
		]
	});
}
function KycQueueSection() {
	const [rows, setRows] = useState([]);
	const [filter, setFilter] = useState("PENDING_REVIEW");
	const [partnerIdSearch, setPartnerIdSearch] = useState("");
	const [adminToken, setAdminToken] = useState(() => localStorage.getItem("gadgetpe_admin_access_token"));
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [savingKycId, setSavingKycId] = useState(null);
	const fetchRows = async (token) => {
		setLoading(true);
		setError(null);
		try {
			setRows((await listKycSubmissions(token, {
				status: filter === "All" ? void 0 : filter,
				partnerId: partnerIdSearch.trim() || void 0
			})).rows);
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
		fetchRows(adminToken);
	}, [
		adminToken,
		filter,
		partnerIdSearch
	]);
	const handleVerification = async (kycId, action) => {
		if (!adminToken) return;
		setSavingKycId(kycId);
		setError(null);
		try {
			await verifyKycSubmission(adminToken, kycId, action, action === "APPROVE" ? "Approved from admin queue UI" : "Rejected from admin queue UI");
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
	return /* @__PURE__ */ jsxs("div", {
		className: "admin-section",
		children: [
			/* @__PURE__ */ jsx("h2", {
				className: "admin-section-title",
				children: "KYC Queue"
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-stat-grid",
				style: { gridTemplateColumns: "repeat(4, 1fr)" },
				children: [
					/* @__PURE__ */ jsx(StatCard, {
						label: "Total Submissions",
						value: rows.length,
						sub: "Current queue result",
						icon: ShieldUser,
						accent: "#1d9e75"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Pending Review",
						value: pendingCount,
						sub: "Requires admin action",
						icon: Clock,
						accent: "#f59e0b"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Verified",
						value: verifiedCount,
						sub: "Approved KYC",
						icon: CheckCircle2,
						accent: "#1d9e75"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Rejected",
						value: rejectedCount,
						sub: "Rejected KYC",
						icon: AlertCircle,
						accent: "#ef4444"
					})
				]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "admin-bucket-totals",
				style: { marginTop: 20 },
				children: [
					"All",
					"PENDING_REVIEW",
					"VERIFIED",
					"REJECTED"
				].map((f) => /* @__PURE__ */ jsx("button", {
					type: "button",
					className: `admin-bucket-pill${filter === f ? " active" : ""}`,
					onClick: () => setFilter(f),
					children: f
				}, f))
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-card",
				style: { marginTop: 12 },
				children: [/* @__PURE__ */ jsxs("div", {
					className: "admin-card-toprow",
					children: [/* @__PURE__ */ jsx("h3", {
						className: "admin-card-title",
						children: "Search Partner ID"
					}), /* @__PURE__ */ jsx("input", {
						type: "search",
						placeholder: "partner-9876543210",
						className: "admin-search-input",
						value: partnerIdSearch,
						onChange: (e) => setPartnerIdSearch(e.target.value)
					})]
				}), error ? /* @__PURE__ */ jsx("p", {
					className: "admin-muted",
					style: { color: "#ef4444" },
					children: error
				}) : null]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-card",
				style: { marginTop: 12 },
				children: [/* @__PURE__ */ jsx("h3", {
					className: "admin-card-title",
					children: "KYC Review Actions"
				}), /* @__PURE__ */ jsx("div", {
					className: "lead-table-wrap",
					style: { margin: 0 },
					children: /* @__PURE__ */ jsxs("table", {
						className: "lead-table admin-lead-table",
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("th", { children: "KYC ID" }),
							/* @__PURE__ */ jsx("th", { children: "Partner" }),
							/* @__PURE__ */ jsx("th", { children: "Proof" }),
							/* @__PURE__ */ jsx("th", { children: "File" }),
							/* @__PURE__ */ jsx("th", { children: "Preview" }),
							/* @__PURE__ */ jsx("th", { children: "Status" }),
							/* @__PURE__ */ jsx("th", { children: "Updated" }),
							/* @__PURE__ */ jsx("th", { children: "Action" })
						] }) }), /* @__PURE__ */ jsx("tbody", { children: rows.map((row) => /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("code", {
								className: "admin-lead-id",
								children: row.id.slice(0, 8)
							}) }),
							/* @__PURE__ */ jsx("td", { children: row.partnerId }),
							/* @__PURE__ */ jsx("td", { children: row.identityProof }),
							/* @__PURE__ */ jsx("td", { children: row.fileName }),
							/* @__PURE__ */ jsx("td", { children: row.mediaUrl ? /* @__PURE__ */ jsx("a", {
								href: row.mediaUrl,
								target: "_blank",
								rel: "noreferrer",
								className: "user-inline-link",
								children: "Open"
							}) : /* @__PURE__ */ jsx("span", {
								className: "admin-muted",
								children: "N/A"
							}) }),
							/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("span", {
								className: "admin-status-badge",
								children: row.verificationStatus
							}) }),
							/* @__PURE__ */ jsx("td", {
								className: "admin-muted",
								children: new Date(row.updatedAt).toLocaleString()
							}),
							/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsxs("div", {
								className: "admin-mode-toggle",
								children: [/* @__PURE__ */ jsx("button", {
									type: "button",
									className: `admin-mode-btn${row.verificationStatus === "VERIFIED" ? " active" : ""}`,
									disabled: !adminToken || savingKycId === row.id,
									onClick: () => handleVerification(row.id, "APPROVE"),
									children: savingKycId === row.id && row.verificationStatus !== "VERIFIED" ? "Saving..." : "Approve"
								}), /* @__PURE__ */ jsx("button", {
									type: "button",
									className: `admin-mode-btn${row.verificationStatus === "REJECTED" ? " active" : ""}`,
									disabled: !adminToken || savingKycId === row.id,
									onClick: () => handleVerification(row.id, "REJECT"),
									children: savingKycId === row.id && row.verificationStatus !== "REJECTED" ? "Saving..." : "Reject"
								})]
							}) })
						] }, row.id)) })]
					})
				})]
			}),
			loading && adminToken ? /* @__PURE__ */ jsx("p", {
				className: "admin-muted",
				children: "Loading KYC submissions..."
			}) : null
		]
	});
}
function PaymentsVerifySection() {
	const [rows, setRows] = useState([]);
	const [filter, setFilter] = useState("PENDING");
	const [partnerIdSearch, setPartnerIdSearch] = useState("");
	const [adminToken, setAdminToken] = useState(() => localStorage.getItem("gadgetpe_admin_access_token"));
	const [loading, setLoading] = useState(false);
	const [savingId, setSavingId] = useState(null);
	const [error, setError] = useState(null);
	const fetchRows = async (token) => {
		setLoading(true);
		setError(null);
		try {
			setRows((await listAdminPartnerCoinRechargeRequests(token, {
				status: filter === "All" ? void 0 : filter,
				partnerId: partnerIdSearch.trim() || void 0,
				limit: 100
			})).rows);
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
		fetchRows(adminToken);
	}, [
		adminToken,
		filter,
		partnerIdSearch
	]);
	const handleVerification = async (requestId, action) => {
		if (!adminToken) return;
		setSavingId(requestId);
		setError(null);
		try {
			await verifyPartnerCoinRechargeRequest(adminToken, requestId, {
				action,
				note: action === "APPROVE" ? "Wallet recharge approved by admin" : "Wallet recharge rejected by admin"
			});
			toast.success(action === "APPROVE" ? "Recharge approved and wallet credited." : "Recharge request rejected.");
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
	const pendingCount = rows.filter((row) => row.status === "PENDING").length;
	const approvedCount = rows.filter((row) => row.status === "APPROVED").length;
	const rejectedCount = rows.filter((row) => row.status === "REJECTED").length;
	return /* @__PURE__ */ jsxs("div", {
		className: "admin-section",
		children: [
			/* @__PURE__ */ jsx("h2", {
				className: "admin-section-title",
				children: "Payments Verification"
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-stat-grid",
				style: { gridTemplateColumns: "repeat(4, 1fr)" },
				children: [
					/* @__PURE__ */ jsx(StatCard, {
						label: "Total Requests",
						value: rows.length,
						sub: "Current filter result",
						icon: Coins,
						accent: "#0ea5c9"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Pending",
						value: pendingCount,
						sub: "Needs admin action",
						icon: Clock,
						accent: "#f59e0b"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Approved",
						value: approvedCount,
						sub: "Wallet credits issued",
						icon: CheckCircle2,
						accent: "#1d9e75"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Rejected",
						value: rejectedCount,
						sub: "Verification failed",
						icon: AlertCircle,
						accent: "#ef4444"
					})
				]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "admin-bucket-totals",
				style: { marginTop: 20 },
				children: [
					"All",
					"PENDING",
					"APPROVED",
					"REJECTED"
				].map((f) => /* @__PURE__ */ jsx("button", {
					type: "button",
					className: `admin-bucket-pill${filter === f ? " active" : ""}`,
					onClick: () => setFilter(f),
					children: f
				}, f))
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-card",
				style: { marginTop: 12 },
				children: [/* @__PURE__ */ jsxs("div", {
					className: "admin-card-toprow",
					children: [/* @__PURE__ */ jsx("h3", {
						className: "admin-card-title",
						children: "Search Partner ID"
					}), /* @__PURE__ */ jsx("input", {
						type: "search",
						placeholder: "partner-9876543210",
						className: "admin-search-input",
						value: partnerIdSearch,
						onChange: (e) => setPartnerIdSearch(e.target.value)
					})]
				}), error ? /* @__PURE__ */ jsx("p", {
					className: "admin-muted",
					style: { color: "#ef4444" },
					children: error
				}) : null]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-card",
				style: { marginTop: 12 },
				children: [/* @__PURE__ */ jsx("h3", {
					className: "admin-card-title",
					children: "Recharge Verification Queue"
				}), /* @__PURE__ */ jsx("div", {
					className: "lead-table-wrap",
					style: { margin: 0 },
					children: /* @__PURE__ */ jsxs("table", {
						className: "lead-table admin-lead-table",
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("th", { children: "Request ID" }),
							/* @__PURE__ */ jsx("th", { children: "Partner" }),
							/* @__PURE__ */ jsx("th", { children: "Amount" }),
							/* @__PURE__ */ jsx("th", { children: "UPI Ref" }),
							/* @__PURE__ */ jsx("th", { children: "Status" }),
							/* @__PURE__ */ jsx("th", { children: "Requested" }),
							/* @__PURE__ */ jsx("th", { children: "Action" })
						] }) }), /* @__PURE__ */ jsxs("tbody", { children: [rows.map((row) => /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("code", {
								className: "admin-lead-id",
								children: row.id.slice(0, 8)
							}) }),
							/* @__PURE__ */ jsx("td", { children: row.partnerId }),
							/* @__PURE__ */ jsxs("td", {
								className: "admin-price",
								children: ["Rs. ", toInr(row.amount)]
							}),
							/* @__PURE__ */ jsx("td", { children: row.upiTxnRef }),
							/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("span", {
								className: "admin-status-badge",
								children: row.status
							}) }),
							/* @__PURE__ */ jsx("td", {
								className: "admin-muted",
								children: new Date(row.requestedAt).toLocaleString()
							}),
							/* @__PURE__ */ jsx("td", { children: row.status === "PENDING" ? /* @__PURE__ */ jsxs("div", {
								className: "admin-mode-toggle",
								children: [/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "admin-mode-btn",
									disabled: !adminToken || savingId === row.id,
									onClick: () => handleVerification(row.id, "APPROVE"),
									children: savingId === row.id ? "Saving..." : "Approve"
								}), /* @__PURE__ */ jsx("button", {
									type: "button",
									className: "admin-mode-btn",
									disabled: !adminToken || savingId === row.id,
									onClick: () => handleVerification(row.id, "REJECT"),
									children: savingId === row.id ? "Saving..." : "Reject"
								})]
							}) : /* @__PURE__ */ jsx("span", {
								className: "admin-muted",
								children: row.adminNote || "-"
							}) })
						] }, row.id)), rows.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
							colSpan: 7,
							className: "admin-muted",
							children: "No recharge requests found."
						}) }) : null] })]
					})
				})]
			}),
			loading && adminToken ? /* @__PURE__ */ jsx("p", {
				className: "admin-muted",
				children: "Loading recharge requests..."
			}) : null
		]
	});
}
function PartnersSection() {
	const [search, setSearch] = useState("");
	const filtered = DUMMY_PARTNERS.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.area.toLowerCase().includes(search.toLowerCase()));
	return /* @__PURE__ */ jsxs("div", {
		className: "admin-section",
		children: [
			/* @__PURE__ */ jsx("h2", {
				className: "admin-section-title",
				children: "Partners Activity"
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-stat-grid",
				style: { gridTemplateColumns: "repeat(4, 1fr)" },
				children: [
					/* @__PURE__ */ jsx(StatCard, {
						label: "Total Partners",
						value: DUMMY_PARTNERS.length,
						sub: "Onboarded",
						icon: Users,
						accent: "#1d9e75"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Active Today",
						value: DUMMY_PARTNERS.filter((p) => p.status === "Active").length,
						sub: "Online now",
						icon: Activity,
						accent: "#0ea5c9"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Total Leads Done",
						value: DUMMY_PARTNERS.reduce((s, p) => s + p.leadsTotal, 0),
						sub: "All time",
						icon: CheckCircle2,
						accent: "#1d9e75"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Total Earnings",
						value: `Rs. ${toInr(DUMMY_PARTNERS.reduce((s, p) => s + p.earnings, 0))}`,
						sub: "Payouts",
						icon: IndianRupee,
						accent: "#8b5cf6"
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-card",
				style: { marginTop: 20 },
				children: [/* @__PURE__ */ jsxs("div", {
					className: "admin-card-toprow",
					children: [/* @__PURE__ */ jsx("h3", {
						className: "admin-card-title",
						children: "Partner Directory"
					}), /* @__PURE__ */ jsx("input", {
						type: "search",
						placeholder: "Search partner or area…",
						className: "admin-search-input",
						value: search,
						onChange: (e) => setSearch(e.target.value)
					})]
				}), /* @__PURE__ */ jsx("div", {
					className: "lead-table-wrap",
					style: { margin: 0 },
					children: /* @__PURE__ */ jsxs("table", {
						className: "lead-table admin-lead-table",
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("th", { children: "ID" }),
							/* @__PURE__ */ jsx("th", { children: "Name" }),
							/* @__PURE__ */ jsx("th", { children: "Area" }),
							/* @__PURE__ */ jsx("th", { children: "Leads Today" }),
							/* @__PURE__ */ jsx("th", { children: "Total Leads" }),
							/* @__PURE__ */ jsx("th", { children: "Earnings" }),
							/* @__PURE__ */ jsx("th", { children: "Rating" }),
							/* @__PURE__ */ jsx("th", { children: "Status" })
						] }) }), /* @__PURE__ */ jsxs("tbody", { children: [filtered.map((p) => /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("code", {
								className: "admin-lead-id",
								children: p.id
							}) }),
							/* @__PURE__ */ jsxs("td", {
								className: "admin-partner-name",
								children: [/* @__PURE__ */ jsx("div", {
									className: "admin-avatar-sm",
									children: p.name.split(" ").map((n) => n[0]).join("")
								}), p.name]
							}),
							/* @__PURE__ */ jsx("td", { children: p.area }),
							/* @__PURE__ */ jsx("td", {
								className: "admin-center",
								children: p.leadsToday
							}),
							/* @__PURE__ */ jsx("td", {
								className: "admin-center",
								children: p.leadsTotal
							}),
							/* @__PURE__ */ jsxs("td", {
								className: "admin-price",
								children: ["Rs. ", toInr(p.earnings)]
							}),
							/* @__PURE__ */ jsxs("td", {
								className: "admin-center",
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "admin-rating",
										children: "★".repeat(Math.round(p.rating))
									}),
									" ",
									p.rating
								]
							}),
							/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("span", {
								className: "admin-status-badge",
								style: {
									background: p.status === "Active" ? "#1d9e7518" : "#ef444418",
									color: p.status === "Active" ? "#1d9e75" : "#ef4444"
								},
								children: p.status
							}) })
						] }, p.id)), filtered.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
							colSpan: 8,
							className: "admin-muted",
							children: "No partner data available."
						}) }) : null] })]
					})
				})]
			})
		]
	});
}
function RevenueSection() {
	const [period, setPeriod] = useState("Daily");
	const data = period === "Daily" ? DAILY_REVENUE : period === "Weekly" ? WEEKLY_REVENUE : MONTHLY_REVENUE;
	const total = data.reduce((s, d) => s + d.value, 0);
	const peak = data.length ? Math.max(...data.map((d) => d.value)) : 0;
	const avg = data.length ? Math.round(total / data.length) : 0;
	return /* @__PURE__ */ jsxs("div", {
		className: "admin-section",
		children: [
			/* @__PURE__ */ jsx("h2", {
				className: "admin-section-title",
				children: "Revenue Analytics"
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-stat-grid",
				style: { gridTemplateColumns: "repeat(4, 1fr)" },
				children: [
					/* @__PURE__ */ jsx(StatCard, {
						label: "Total (Period)",
						value: `Rs. ${toInr(total)}`,
						sub: `${period} view`,
						icon: IndianRupee,
						accent: "#1d9e75"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Peak",
						value: `Rs. ${toInr(peak)}`,
						sub: "Highest single period",
						icon: TrendingUp,
						accent: "#0ea5c9"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "Average",
						value: `Rs. ${toInr(avg)}`,
						sub: "Per period avg",
						icon: BarChart3,
						accent: "#8b5cf6"
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: "MTD Revenue",
						value: `Rs. ${toInr(MONTHLY_REVENUE.reduce((s, d) => s + d.value, 0))}`,
						sub: "All months",
						icon: ArrowUpRight,
						accent: "#f59e0b"
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-card",
				style: { marginTop: 20 },
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "admin-card-toprow",
						children: [/* @__PURE__ */ jsx("h3", {
							className: "admin-card-title",
							children: "Revenue Chart"
						}), /* @__PURE__ */ jsx("div", {
							className: "admin-period-toggle",
							children: [
								"Daily",
								"Weekly",
								"Monthly"
							].map((p) => /* @__PURE__ */ jsx("button", {
								type: "button",
								className: `admin-period-btn${period === p ? " active" : ""}`,
								onClick: () => setPeriod(p),
								children: p
							}, p))
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "admin-revenue-total",
						style: { marginBottom: 12 },
						children: [
							"Rs. ",
							toInr(total),
							/* @__PURE__ */ jsxs("span", {
								className: "admin-revenue-label",
								children: [
									" total · ",
									data.length,
									" periods"
								]
							})
						]
					}),
					/* @__PURE__ */ jsx(MiniBarChart, {
						data,
						color: "var(--green)"
					}),
					/* @__PURE__ */ jsxs("table", {
						className: "lead-table admin-lead-table",
						style: { marginTop: 20 },
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("th", { children: "Period" }),
							/* @__PURE__ */ jsx("th", { children: "Revenue" }),
							/* @__PURE__ */ jsx("th", { children: "Share" }),
							/* @__PURE__ */ jsx("th", { children: "vs Avg" })
						] }) }), /* @__PURE__ */ jsxs("tbody", { children: [data.map((d) => /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("td", { children: d.label }),
							/* @__PURE__ */ jsxs("td", {
								className: "admin-price",
								children: ["Rs. ", toInr(d.value)]
							}),
							/* @__PURE__ */ jsxs("td", { children: [/* @__PURE__ */ jsx("div", {
								className: "admin-share-bar",
								children: /* @__PURE__ */ jsx("div", { style: {
									width: `${total === 0 ? 0 : Math.round(d.value / total * 100)}%`,
									background: "var(--green)"
								} })
							}), /* @__PURE__ */ jsxs("span", {
								className: "admin-muted",
								style: { fontSize: 11 },
								children: [total === 0 ? 0 : Math.round(d.value / total * 100), "%"]
							})] }),
							/* @__PURE__ */ jsx("td", {
								style: {
									color: d.value >= avg ? "#1d9e75" : "#ef4444",
									fontWeight: 700
								},
								children: avg === 0 ? "-" : `${d.value >= avg ? "↑" : "↓"} ${Math.abs(Math.round((d.value - avg) / avg * 100))}%`
							})
						] }, d.label)), data.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
							colSpan: 4,
							className: "admin-muted",
							children: "No revenue data available."
						}) }) : null] })]
					})
				]
			})
		]
	});
}
function SettingsSection() {
	const [autoAssign, setAutoAssign] = useState(true);
	const [notifications, setNotifications] = useState(true);
	const [twoFactor, setTwoFactor] = useState(false);
	const [saved, setSaved] = useState(false);
	const handleSave = () => {
		setSaved(true);
		setTimeout(() => setSaved(false), 2500);
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "admin-section",
		children: [/* @__PURE__ */ jsx("h2", {
			className: "admin-section-title",
			children: "Settings"
		}), /* @__PURE__ */ jsxs("div", {
			className: "admin-settings-grid",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "admin-card",
				children: [
					/* @__PURE__ */ jsx("h3", {
						className: "admin-card-title",
						children: "System Preferences"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "admin-setting-row",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
							className: "admin-setting-label",
							children: "Auto Lead Assignment"
						}), /* @__PURE__ */ jsx("p", {
							className: "admin-setting-sub",
							children: "Automatically assign leads to nearest partner"
						})] }), /* @__PURE__ */ jsx("button", {
							type: "button",
							className: `admin-toggle${autoAssign ? " on" : ""}`,
							onClick: () => setAutoAssign((v) => !v),
							"aria-pressed": autoAssign,
							children: /* @__PURE__ */ jsx("span", {})
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "admin-setting-row",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
							className: "admin-setting-label",
							children: "Push Notifications"
						}), /* @__PURE__ */ jsx("p", {
							className: "admin-setting-sub",
							children: "Notify on new leads and status changes"
						})] }), /* @__PURE__ */ jsx("button", {
							type: "button",
							className: `admin-toggle${notifications ? " on" : ""}`,
							onClick: () => setNotifications((v) => !v),
							"aria-pressed": notifications,
							children: /* @__PURE__ */ jsx("span", {})
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "admin-setting-row",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
							className: "admin-setting-label",
							children: "Two-Factor Authentication"
						}), /* @__PURE__ */ jsx("p", {
							className: "admin-setting-sub",
							children: "Require OTP for admin login"
						})] }), /* @__PURE__ */ jsx("button", {
							type: "button",
							className: `admin-toggle${twoFactor ? " on" : ""}`,
							onClick: () => setTwoFactor((v) => !v),
							"aria-pressed": twoFactor,
							children: /* @__PURE__ */ jsx("span", {})
						})]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "admin-save-btn",
						onClick: handleSave,
						children: saved ? "✓ Saved" : "Save Settings"
					})
				]
			}), /* @__PURE__ */ jsxs("div", {
				className: "admin-card",
				children: [
					/* @__PURE__ */ jsx("h3", {
						className: "admin-card-title",
						children: "Admin Profile"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "admin-profile-row",
						children: [/* @__PURE__ */ jsx("div", {
							className: "admin-profile-avatar",
							children: "AD"
						}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
							className: "admin-profile-name",
							children: "Admin User"
						}), /* @__PURE__ */ jsx("p", {
							className: "admin-setting-sub",
							children: "admin@gadgetpe.in"
						})] })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "admin-field-row",
						children: [/* @__PURE__ */ jsx("label", {
							className: "admin-form-label",
							children: "Display Name"
						}), /* @__PURE__ */ jsx("input", {
							defaultValue: "Admin User",
							className: "admin-input"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "admin-field-row",
						children: [/* @__PURE__ */ jsx("label", {
							className: "admin-form-label",
							children: "Email"
						}), /* @__PURE__ */ jsx("input", {
							defaultValue: "admin@gadgetpe.in",
							className: "admin-input",
							type: "email"
						})]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "admin-save-btn",
						onClick: handleSave,
						children: saved ? "✓ Updated" : "Update Profile"
					})
				]
			})]
		})]
	});
}
function AdminAuthGate({ onAuthenticated }) {
	const [mode, setMode] = useState("login");
	const [adminId, setAdminId] = useState("admin-ops");
	const [accessKey, setAccessKey] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState(null);
	const submitAdminAuth = async (event) => {
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
			setError(err instanceof Error ? err.message : mode === "login" ? "Admin login failed." : "Admin signup failed.");
		} finally {
			setSubmitting(false);
		}
	};
	return /* @__PURE__ */ jsx("main", {
		className: "admin-auth-page",
		children: /* @__PURE__ */ jsxs("section", {
			className: "admin-auth-card",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "admin-auth-hero",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "admin-auth-brand",
						children: [/* @__PURE__ */ jsx(ShieldUser, { size: 18 }), " GadgetPe Admin"]
					}),
					/* @__PURE__ */ jsx("h1", { children: "Admin Login" }),
					/* @__PURE__ */ jsx("p", { children: "Manage pricing, serviceability, KYC approvals, and partner operations from one protected console." }),
					/* @__PURE__ */ jsxs("div", {
						className: "admin-auth-metrics",
						"aria-label": "Admin console highlights",
						children: [
							/* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx(Activity, { size: 16 }), " Live operations"] }),
							/* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx(UserCheck, { size: 16 }), " KYC controls"] }),
							/* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx(MapPin, { size: 16 }), " Pincode scope"] })
						]
					})
				]
			}), /* @__PURE__ */ jsx("div", {
				className: "admin-auth-panel",
				children: /* @__PURE__ */ jsxs("form", {
					className: "admin-auth-form",
					onSubmit: (event) => void submitAdminAuth(event),
					children: [
						/* @__PURE__ */ jsxs("label", { children: [/* @__PURE__ */ jsx("span", { children: "Admin ID" }), /* @__PURE__ */ jsx("input", {
							value: adminId,
							onChange: (event) => setAdminId(event.target.value),
							placeholder: "admin-ops"
						})] }),
						/* @__PURE__ */ jsxs("label", { children: [/* @__PURE__ */ jsx("span", { children: "Access Key" }), /* @__PURE__ */ jsx("input", {
							type: "password",
							value: accessKey,
							onChange: (event) => setAccessKey(event.target.value),
							placeholder: "Enter admin access key"
						})] }),
						error ? /* @__PURE__ */ jsxs("div", {
							className: "admin-auth-error",
							children: [
								/* @__PURE__ */ jsx(AlertCircle, { size: 16 }),
								" ",
								error
							]
						}) : null,
						/* @__PURE__ */ jsx("button", {
							type: "submit",
							className: "admin-auth-submit",
							disabled: submitting,
							children: submitting ? "Please wait..." : "Login to Admin"
						})
					]
				})
			})]
		})
	});
}
function AdminPage() {
	const navigate = useNavigate();
	const [activeNav, setActiveNav] = useState("Overview");
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [blockedByRole, setBlockedByRole] = useState(false);
	const [adminToken, setAdminToken] = useState(() => localStorage.getItem("gadgetpe_admin_access_token"));
	const [leads, setLeads] = useState([]);
	const [leadSummary, setLeadSummary] = useState(null);
	const [overviewMetrics, setOverviewMetrics] = useState(null);
	const [assignmentMetrics, setAssignmentMetrics] = useState(null);
	const [fromDate, setFromDate] = useState("");
	const [toDate, setToDate] = useState("");
	const [showDateFilter, setShowDateFilter] = useState(false);
	const [timelineLead, setTimelineLead] = useState(null);
	const [timelineRows, setTimelineRows] = useState([]);
	const [timelineLoading, setTimelineLoading] = useState(false);
	const [timelineError, setTimelineError] = useState(null);
	const metricsFilters = useMemo(() => ({
		fromDate: fromDate ? (/* @__PURE__ */ new Date(`${fromDate}T00:00:00.000Z`)).toISOString() : void 0,
		toDate: toDate ? (/* @__PURE__ */ new Date(`${toDate}T23:59:59.999Z`)).toISOString() : void 0
	}), [fromDate, toDate]);
	const fetchAdminAnalytics = async (token) => {
		const [leadResult, summaryResult, overviewResult, assignmentResult] = await Promise.all([
			listAdminLeads(token, {
				limit: 200,
				...metricsFilters
			}),
			getAdminDispositionMetrics(token, metricsFilters),
			getAdminOverviewMetrics(token, metricsFilters),
			getAdminAssignmentMetrics(token, metricsFilters)
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
		(async () => {
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
			(async () => {
				try {
					await fetchAdminAnalytics(adminToken);
				} catch {}
			})();
		}, 3e4);
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
			case "Overview": return /* @__PURE__ */ jsx(OverviewSection, {
				leads,
				overview: overviewMetrics
			});
			case "Lead Bucket": return /* @__PURE__ */ jsx(LeadBucketSection, {
				leads,
				onOpenTimeline: (lead) => void openTimeline(lead)
			});
			case "Lead Disposition": return /* @__PURE__ */ jsx(LeadDispositionSection, {
				leads,
				summary: leadSummary,
				onOpenTimeline: (lead) => void openTimeline(lead)
			});
			case "Lead Assignment": return /* @__PURE__ */ jsxs("div", {
				className: "admin-section",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "admin-section-title",
						children: "Lead Assignment"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "admin-muted",
						style: { marginBottom: 16 },
						children: "Lead assignment has moved to a dedicated page with pincode tenant scoping."
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "admin-assign-btn",
						onClick: () => {
							navigate({ to: "/Lead-assignment" });
						},
						children: "Open Dedicated Lead Assignment"
					}),
					/* @__PURE__ */ jsx("div", {
						style: { marginTop: 20 },
						children: /* @__PURE__ */ jsx(LeadAssignmentSection, {
							leads,
							adminToken,
							metrics: assignmentMetrics,
							onAssigned: () => {
								fetchAdminAnalytics(adminToken);
							}
						})
					})
				]
			});
			case "Location Mgmt": return /* @__PURE__ */ jsx(LocationSection, {});
			case "Price Mgmt": return /* @__PURE__ */ jsx(PriceManagementSection, {});
			case "KYC Queue": return /* @__PURE__ */ jsx(KycQueueSection, {});
			case "Payments Verify": return /* @__PURE__ */ jsx(PaymentsVerifySection, {});
			case "Partners": return /* @__PURE__ */ jsx(PartnersSection, {});
			case "Revenue": return /* @__PURE__ */ jsx(RevenueSection, {});
			case "Settings": return /* @__PURE__ */ jsx(SettingsSection, {});
			default: return null;
		}
	};
	const openTimeline = async (lead) => {
		if (!adminToken) return;
		setTimelineLead(lead);
		setTimelineRows([]);
		setTimelineError(null);
		setTimelineLoading(true);
		try {
			setTimelineRows((await listAdminLeadDispositionEvents(adminToken, lead.id, 200)).rows);
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
	if (blockedByRole) return null;
	if (!adminToken) return /* @__PURE__ */ jsx(AdminAuthGate, { onAuthenticated: () => setAdminToken(localStorage.getItem("gadgetpe_admin_access_token")) });
	const handleLogout = async () => {
		clearRoleSession("admin");
		localStorage.removeItem("gadgetpe_admin_name");
		setAdminToken(null);
		await navigate({ to: "/" });
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "admin-shell",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "admin-topbar",
				children: [
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "admin-hamburger",
						onClick: () => setSidebarOpen((v) => !v),
						"aria-label": "Toggle sidebar",
						children: "☰"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "admin-topbar-brand",
						children: [/* @__PURE__ */ jsx(ShieldUser, { size: 20 }), /* @__PURE__ */ jsx("span", { children: "GadgetPe Admin" })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "admin-topbar-right",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "admin-topbar-meta",
							children: ["Super Admin · ", (/* @__PURE__ */ new Date()).toLocaleDateString("en-IN")]
						}), /* @__PURE__ */ jsxs("button", {
							type: "button",
							className: "admin-topbar-link",
							onClick: () => void handleLogout(),
							"aria-label": "Logout from admin",
							children: [/* @__PURE__ */ jsx(LogOut, { size: 14 }), " Logout"]
						})]
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "admin-body",
				children: [
					sidebarOpen && /* @__PURE__ */ jsx("div", {
						className: "admin-backdrop",
						onClick: () => setSidebarOpen(false),
						"aria-hidden": true
					}),
					/* @__PURE__ */ jsx("aside", {
						className: `admin-sidebar${sidebarOpen ? " open" : ""}`,
						children: /* @__PURE__ */ jsx("nav", {
							className: "admin-sidebar-nav",
							children: NAV_ITEMS.map((item) => {
								const Icon = NAV_ICONS[item];
								return /* @__PURE__ */ jsxs("button", {
									type: "button",
									className: `admin-nav-btn${activeNav === item ? " active" : ""}`,
									onClick: () => {
										setActiveNav(item);
										setSidebarOpen(false);
									},
									children: [/* @__PURE__ */ jsx(Icon, { size: 16 }), /* @__PURE__ */ jsx("span", { children: item })]
								}, item);
							})
						})
					}),
					/* @__PURE__ */ jsxs("main", {
						className: "admin-main",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "admin-date-filter-bar",
								children: [/* @__PURE__ */ jsxs("button", {
									type: "button",
									className: `admin-date-filter-toggle${fromDate || toDate ? " active" : ""}`,
									onClick: () => setShowDateFilter((v) => !v),
									title: "Date range filter",
									children: [
										/* @__PURE__ */ jsx(Sliders, { size: 15 }),
										/* @__PURE__ */ jsx("span", { children: "Filter" }),
										fromDate || toDate ? /* @__PURE__ */ jsx("span", { className: "admin-date-filter-dot" }) : null
									]
								}), fromDate || toDate ? /* @__PURE__ */ jsxs("span", {
									className: "admin-date-filter-summary",
									children: [
										fromDate || "…",
										" → ",
										toDate || "…",
										/* @__PURE__ */ jsx("button", {
											type: "button",
											className: "admin-date-filter-clear",
											onClick: () => {
												setFromDate("");
												setToDate("");
											},
											title: "Clear dates",
											children: "✕"
										})
									]
								}) : null]
							}),
							showDateFilter ? /* @__PURE__ */ jsxs("section", {
								className: "admin-card admin-date-filter-panel",
								style: { marginBottom: 14 },
								children: [/* @__PURE__ */ jsxs("div", {
									className: "admin-card-toprow",
									children: [/* @__PURE__ */ jsx("h3", {
										className: "admin-card-title",
										children: "Date Range"
									}), /* @__PURE__ */ jsx("button", {
										type: "button",
										className: "admin-page-btn",
										onClick: () => {
											setFromDate("");
											setToDate("");
										},
										children: "Clear"
									})]
								}), /* @__PURE__ */ jsxs("div", {
									className: "admin-manual-form",
									style: {
										gridTemplateColumns: "1fr 1fr",
										gap: 12
									},
									children: [/* @__PURE__ */ jsxs("label", {
										className: "admin-form-label",
										children: ["From", /* @__PURE__ */ jsx("input", {
											type: "date",
											value: fromDate,
											onChange: (event) => setFromDate(event.target.value),
											className: "admin-select"
										})]
									}), /* @__PURE__ */ jsxs("label", {
										className: "admin-form-label",
										children: ["To", /* @__PURE__ */ jsx("input", {
											type: "date",
											value: toDate,
											onChange: (event) => setToDate(event.target.value),
											className: "admin-select"
										})]
									})]
								})]
							}) : null,
							renderSection()
						]
					})
				]
			}),
			timelineLead ? /* @__PURE__ */ jsx(LeadTimelineModal, {
				lead: timelineLead,
				rows: timelineRows,
				loading: timelineLoading,
				error: timelineError,
				onClose: () => setTimelineLead(null)
			}) : null
		]
	});
}
//#endregion
export { AdminPage as component };
