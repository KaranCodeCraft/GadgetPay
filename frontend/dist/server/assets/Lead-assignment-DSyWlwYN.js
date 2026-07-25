import { r as getActiveRole } from "./role-session-C7kgx143.js";
import { A as listAdminPartnersForLeadAssignment, D as listAdminLeadPartnerScopes, O as listAdminLeads, T as listAdminEligiblePartnersForPincode, dt as upsertAdminLeadPartnerScope, i as assignAdminLeadsBulk, r as assignAdminLead } from "./gadgetpe-client-Cg3AtJY8.js";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
//#region src/routes/Lead-assignment.tsx?tsr-split=component
var ADMIN_TOKEN_KEY = "gadgetpe_admin_access_token";
function LeadAssignmentPage() {
	const navigate = useNavigate();
	const [adminToken, setAdminToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY));
	const [pincode, setPincode] = useState("");
	const [mode, setMode] = useState("AUTO");
	const [loading, setLoading] = useState(false);
	const [leads, setLeads] = useState([]);
	const [eligibleCount, setEligibleCount] = useState(0);
	const [partnerSearch, setPartnerSearch] = useState("");
	const [partners, setPartners] = useState([]);
	const [scopeRows, setScopeRows] = useState([]);
	const [selectedPartnerId, setSelectedPartnerId] = useState("");
	const [scopePartnerId, setScopePartnerId] = useState("");
	const [selectedLeadId, setSelectedLeadId] = useState("");
	const [selectedBulkLeadIds, setSelectedBulkLeadIds] = useState([]);
	const [saving, setSaving] = useState(false);
	useEffect(() => {
		const activeRole = getActiveRole();
		if (activeRole === "user") {
			navigate({ to: "/user" });
			return;
		}
		if (activeRole === "partner") {
			navigate({ to: "/partner-page" });
			return;
		}
		if (!adminToken) {
			toast.error("Admin login required.");
			navigate({ to: "/admin" });
		}
	}, [adminToken, navigate]);
	const unassignedLeads = useMemo(() => leads.filter((lead) => lead.status === "AVAILABLE" && !lead.partnerId), [leads]);
	const applyPincodeScope = async () => {
		if (!adminToken) return;
		if (!/^\d{6}$/.test(pincode)) {
			toast.error("Enter a valid 6-digit pincode.");
			return;
		}
		setLoading(true);
		try {
			const [leadResult, eligible] = await Promise.all([listAdminLeads(adminToken, {
				pincode,
				leadType: "SERVICE_LEAD",
				limit: 200
			}), listAdminEligiblePartnersForPincode(adminToken, pincode)]);
			setLeads(leadResult.rows);
			setEligibleCount(eligible.count);
			setScopeRows((await listAdminLeadPartnerScopes(adminToken, {
				pincode,
				activeOnly: false,
				limit: 200
			})).rows);
			setSelectedLeadId("");
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
	};
	const searchPartners = async () => {
		if (!adminToken) return;
		if (!/^\d{6}$/.test(pincode)) {
			toast.error("Set pincode scope first.");
			return;
		}
		try {
			setPartners((await listAdminPartnersForLeadAssignment(adminToken, {
				pincode,
				search: partnerSearch.trim() || void 0,
				includeUnmapped: true,
				limit: 30
			})).rows);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Unable to search partners.");
		}
	};
	const handleScopeUpsert = async (partnerId, isActive) => {
		if (!adminToken) return;
		if (!/^\d{6}$/.test(pincode)) {
			toast.error("Set pincode scope first.");
			return;
		}
		setSaving(true);
		try {
			await upsertAdminLeadPartnerScope(adminToken, {
				partnerId,
				pincode,
				isActive
			});
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
				note: `Manual assignment for pincode ${pincode}`
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
				note: `Bulk manual assignment for pincode ${pincode}`
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
	return /* @__PURE__ */ jsxs("main", {
		className: "mx-auto max-w-6xl px-4 py-8",
		children: [/* @__PURE__ */ jsxs("section", {
			className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "text-2xl font-semibold text-slate-900",
					children: "Lead Assignment"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-1 text-sm text-slate-600",
					children: "Pincode-scoped lead assignment with automatic and manual modes."
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-4 flex flex-wrap items-end gap-3",
					children: [
						/* @__PURE__ */ jsxs("label", {
							className: "flex flex-col gap-1",
							children: [/* @__PURE__ */ jsx("span", {
								className: "text-sm font-medium text-slate-700",
								children: "Pincode (tenant scope)"
							}), /* @__PURE__ */ jsx("input", {
								value: pincode,
								maxLength: 6,
								onChange: (event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6)),
								className: "rounded-xl border border-slate-300 px-3 py-2 text-sm",
								placeholder: "Enter 6-digit pincode"
							})]
						}),
						/* @__PURE__ */ jsx("button", {
							type: "button",
							className: "rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60",
							disabled: loading || pincode.length !== 6,
							onClick: () => {
								applyPincodeScope();
							},
							children: loading ? "Loading..." : "Apply Scope"
						}),
						/* @__PURE__ */ jsx("button", {
							type: "button",
							className: `rounded-xl px-4 py-2 text-sm font-medium ${mode === "AUTO" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`,
							onClick: () => setMode("AUTO"),
							children: "Automatic"
						}),
						/* @__PURE__ */ jsx("button", {
							type: "button",
							className: `rounded-xl px-4 py-2 text-sm font-medium ${mode === "MANUAL" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`,
							onClick: () => setMode("MANUAL"),
							children: "Manual"
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-4 grid gap-3 sm:grid-cols-3",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "rounded-xl bg-slate-50 p-3 text-sm",
							children: [/* @__PURE__ */ jsx("p", {
								className: "text-slate-500",
								children: "Eligible Partners"
							}), /* @__PURE__ */ jsx("p", {
								className: "text-xl font-semibold text-slate-900",
								children: eligibleCount
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "rounded-xl bg-slate-50 p-3 text-sm",
							children: [/* @__PURE__ */ jsx("p", {
								className: "text-slate-500",
								children: "Unassigned SERVICE_LEAD"
							}), /* @__PURE__ */ jsx("p", {
								className: "text-xl font-semibold text-slate-900",
								children: unassignedLeads.length
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "rounded-xl bg-slate-50 p-3 text-sm",
							children: [/* @__PURE__ */ jsx("p", {
								className: "text-slate-500",
								children: "Mode"
							}), /* @__PURE__ */ jsx("p", {
								className: "text-xl font-semibold text-slate-900",
								children: mode === "AUTO" ? "Automatic" : "Manual"
							})]
						})
					]
				})
			]
		}), mode === "AUTO" ? /* @__PURE__ */ jsxs("section", {
			className: "mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
			children: [
				/* @__PURE__ */ jsx("h2", {
					className: "text-lg font-semibold text-slate-900",
					children: "Automatic Assignment"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-2 text-sm text-slate-600",
					children: "Automatic assignment is triggered when a user schedules pickup and creates a SERVICE_LEAD. Partners are selected in round-robin order within this pincode."
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-5 overflow-x-auto",
					children: [/* @__PURE__ */ jsx("h3", {
						className: "mb-2 text-sm font-semibold text-slate-800",
						children: "Partner Scope Mapping"
					}), /* @__PURE__ */ jsxs("table", {
						className: "min-w-full text-left text-sm",
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", {
							className: "border-b border-slate-200 text-slate-500",
							children: [
								/* @__PURE__ */ jsx("th", {
									className: "px-2 py-2",
									children: "Partner"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-2 py-2",
									children: "Phone"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-2 py-2",
									children: "Status"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-2 py-2",
									children: "Last Assigned"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-2 py-2",
									children: "Action"
								})
							]
						}) }), /* @__PURE__ */ jsxs("tbody", { children: [scopeRows.map((row) => /* @__PURE__ */ jsxs("tr", {
							className: "border-b border-slate-100",
							children: [
								/* @__PURE__ */ jsxs("td", {
									className: "px-2 py-2",
									children: [
										row.partnerName,
										" (",
										row.partnerId,
										")"
									]
								}),
								/* @__PURE__ */ jsx("td", {
									className: "px-2 py-2",
									children: row.partnerPhone
								}),
								/* @__PURE__ */ jsx("td", {
									className: "px-2 py-2",
									children: row.isActive ? "Active" : "Inactive"
								}),
								/* @__PURE__ */ jsx("td", {
									className: "px-2 py-2",
									children: row.lastAssignedAt ? new Date(row.lastAssignedAt).toLocaleString() : "-"
								}),
								/* @__PURE__ */ jsx("td", {
									className: "px-2 py-2",
									children: /* @__PURE__ */ jsx("button", {
										type: "button",
										className: `rounded-lg px-3 py-1 text-xs font-medium ${row.isActive ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`,
										disabled: saving,
										onClick: () => {
											handleScopeUpsert(row.partnerId, !row.isActive);
										},
										children: row.isActive ? "Disable" : "Enable"
									})
								})
							]
						}, row.id)), scopeRows.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
							colSpan: 5,
							className: "px-2 py-3 text-slate-500",
							children: "No partner mappings found for this pincode."
						}) }) : null] })]
					})]
				})
			]
		}) : /* @__PURE__ */ jsxs("section", {
			className: "mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
			children: [
				/* @__PURE__ */ jsx("h2", {
					className: "text-lg font-semibold text-slate-900",
					children: "Manual Assignment"
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-4 flex flex-wrap items-end gap-3",
					children: [/* @__PURE__ */ jsxs("label", {
						className: "flex min-w-[240px] flex-col gap-1",
						children: [/* @__PURE__ */ jsx("span", {
							className: "text-sm font-medium text-slate-700",
							children: "Search Partner"
						}), /* @__PURE__ */ jsx("input", {
							value: partnerSearch,
							onChange: (event) => setPartnerSearch(event.target.value),
							className: "rounded-xl border border-slate-300 px-3 py-2 text-sm",
							placeholder: "Name, phone, or partner id"
						})]
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white",
						onClick: () => {
							searchPartners();
						},
						children: "Search"
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "mt-4 overflow-x-auto",
					children: /* @__PURE__ */ jsxs("table", {
						className: "min-w-full text-left text-sm",
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", {
							className: "border-b border-slate-200 text-slate-500",
							children: [
								/* @__PURE__ */ jsx("th", {
									className: "px-2 py-2",
									children: "Select"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-2 py-2",
									children: "Partner"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-2 py-2",
									children: "Phone"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-2 py-2",
									children: "Last Assigned"
								})
							]
						}) }), /* @__PURE__ */ jsxs("tbody", { children: [partners.map((partner) => /* @__PURE__ */ jsxs("tr", {
							className: "border-b border-slate-100",
							children: [
								/* @__PURE__ */ jsx("td", {
									className: "px-2 py-2",
									children: /* @__PURE__ */ jsx("input", {
										type: "radio",
										name: "selected-partner",
										checked: selectedPartnerId === partner.id,
										onChange: () => setSelectedPartnerId(partner.id)
									})
								}),
								/* @__PURE__ */ jsxs("td", {
									className: "px-2 py-2",
									children: [
										partner.name,
										" (",
										partner.id,
										")"
									]
								}),
								/* @__PURE__ */ jsx("td", {
									className: "px-2 py-2",
									children: partner.phone
								}),
								/* @__PURE__ */ jsx("td", {
									className: "px-2 py-2",
									children: partner.lastAssignedAt ? new Date(partner.lastAssignedAt).toLocaleString() : "-"
								})
							]
						}, partner.id)), partners.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
							colSpan: 4,
							className: "px-2 py-3 text-slate-500",
							children: "No partners loaded. Search after applying pincode scope."
						}) }) : null] })]
					})
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3",
					children: [/* @__PURE__ */ jsx("p", {
						className: "mb-2 text-sm font-medium text-slate-800",
						children: "Scope Management"
					}), /* @__PURE__ */ jsxs("div", {
						className: "flex flex-wrap items-center gap-2",
						children: [/* @__PURE__ */ jsxs("select", {
							className: "rounded-xl border border-slate-300 px-3 py-2 text-sm",
							value: scopePartnerId,
							onChange: (event) => setScopePartnerId(event.target.value),
							children: [/* @__PURE__ */ jsx("option", {
								value: "",
								children: "Select partner to map"
							}), partners.map((partner) => /* @__PURE__ */ jsxs("option", {
								value: partner.id,
								children: [
									partner.name,
									" (",
									partner.id,
									")"
								]
							}, partner.id))]
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60",
							disabled: !scopePartnerId || saving,
							onClick: () => {
								handleScopeUpsert(scopePartnerId, true);
							},
							children: "Add to Pincode Scope"
						})]
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "mt-6 overflow-x-auto",
					children: /* @__PURE__ */ jsxs("table", {
						className: "min-w-full text-left text-sm",
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", {
							className: "border-b border-slate-200 text-slate-500",
							children: [
								/* @__PURE__ */ jsx("th", {
									className: "px-2 py-2",
									children: "Pick"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-2 py-2",
									children: "Lead"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-2 py-2",
									children: "Seller"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-2 py-2",
									children: "Phone"
								}),
								/* @__PURE__ */ jsx("th", {
									className: "px-2 py-2",
									children: "Updated"
								})
							]
						}) }), /* @__PURE__ */ jsxs("tbody", { children: [unassignedLeads.map((lead) => /* @__PURE__ */ jsxs("tr", {
							className: "border-b border-slate-100",
							children: [
								/* @__PURE__ */ jsx("td", {
									className: "px-2 py-2",
									children: /* @__PURE__ */ jsx("input", {
										type: "checkbox",
										checked: selectedBulkLeadIds.includes(lead.id),
										onChange: (event) => {
											setSelectedLeadId(lead.id);
											setSelectedBulkLeadIds((prev) => {
												if (event.target.checked) {
													if (prev.length >= 5) return prev;
													return Array.from(/* @__PURE__ */ new Set([...prev, lead.id]));
												}
												return prev.filter((id) => id !== lead.id);
											});
										}
									})
								}),
								/* @__PURE__ */ jsx("td", {
									className: "px-2 py-2",
									children: lead.id
								}),
								/* @__PURE__ */ jsx("td", {
									className: "px-2 py-2",
									children: lead.seller.name || "-"
								}),
								/* @__PURE__ */ jsx("td", {
									className: "px-2 py-2",
									children: lead.seller.phone || "-"
								}),
								/* @__PURE__ */ jsx("td", {
									className: "px-2 py-2",
									children: new Date(lead.updatedAt).toLocaleString()
								})
							]
						}, lead.id)), unassignedLeads.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
							colSpan: 5,
							className: "px-2 py-3 text-slate-500",
							children: "No unassigned SERVICE_LEAD records for this pincode."
						}) }) : null] })]
					})
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-4 flex flex-wrap gap-3",
					children: [/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60",
						disabled: saving || !selectedLeadId || !selectedPartnerId,
						onClick: () => {
							handleSingleAssign();
						},
						children: saving ? "Assigning..." : "Assign Selected Lead"
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "rounded-xl bg-indigo-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60",
						disabled: saving || selectedBulkLeadIds.length === 0 || !selectedPartnerId,
						onClick: () => {
							handleBulkAssign();
						},
						children: saving ? "Processing..." : `Bulk Assign (${selectedBulkLeadIds.length}/5)`
					})]
				})
			]
		})]
	});
}
//#endregion
export { LeadAssignmentPage as component };
