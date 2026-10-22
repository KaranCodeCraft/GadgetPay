import { CheckCircle2, Download, Printer, ShieldCheck, X } from "lucide-react";
import { useEffect, type FC } from "react";
import type { UserDealInvoice } from "../lib/api/gadgetpe-client";
import { downloadInvoicePdf } from "../lib/invoice-pdf";

type InvoiceModalProps = {
  invoice: UserDealInvoice | null;
  isOpen: boolean;
  onClose: () => void;
};

function formatInr(val: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.round(val));
}

function formatDate(iso?: string): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

export const InvoiceModal: FC<InvoiceModalProps> = ({ invoice, isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !invoice) return null;

  const sellerName = invoice.customer?.name || invoice.seller?.name || invoice.purchaser?.name || "Customer";
  const sellerPhone = invoice.customer?.phone || invoice.seller?.phone;
  const sellerAddress = [
    invoice.seller?.addressLine || invoice.purchaser?.addressLine,
    invoice.seller?.city || invoice.purchaser?.city,
    invoice.seller?.pincode || invoice.purchaser?.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const totalDeduction =
    typeof invoice.deductions?.totalDeductionAmount === "number"
      ? invoice.deductions.totalDeductionAmount
      : Math.max(0, invoice.listedPrice - (invoice.quotedAmount ?? invoice.finalAmount));

  const issues = invoice.deductions?.issues || [];
  const questionDeductions = invoice.deductions?.questionDeductions || [];

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    downloadInvoicePdf(invoice);
  };

  return (
    <div
      className="invoice-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-modal-title"
    >
      <div
        className="invoice-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="invoice-modal-header">
          <div className="invoice-modal-title-wrap">
            <h2 id="invoice-modal-title">Device Sale Invoice</h2>
            <span className="invoice-modal-badge">
              <CheckCircle2 size={13} /> Paid & Completed
            </span>
          </div>
          <div className="invoice-modal-header-actions">
            <button
              type="button"
              onClick={handlePrint}
              className="invoice-action-btn invoice-btn-outline"
              title="Print Invoice"
            >
              <Printer size={15} />
              <span className="invoice-btn-text">Print</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="invoice-action-btn invoice-btn-primary"
              title="Download PDF"
            >
              <Download size={15} />
              <span className="invoice-btn-text">Download PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="invoice-action-btn invoice-btn-close"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Invoice Printable Sheet Paper */}
        <div className="invoice-paper-content printable-area">
          {/* Top Green Accent Ribbon */}
          <div className="invoice-paper-ribbon" />

          {/* Company & Document Header */}
          <div className="invoice-paper-brand-row">
            <div>
              <div className="invoice-paper-logo">GadgetPe</div>
              <div className="invoice-paper-tagline">
                Certified Device Buyback & Settlement Platform
              </div>
              <div className="invoice-paper-subline">
                www.gadgetpe.com • support@gadgetpe.com
              </div>
            </div>
            <div className="invoice-paper-meta-right">
              <div className="invoice-paper-doc-type">PURCHASE MEMORANDUM</div>
              <div className="invoice-meta-item">
                <span className="invoice-meta-label">Invoice No:</span>
                <span className="invoice-meta-val">{invoice.id}</span>
              </div>
              <div className="invoice-meta-item">
                <span className="invoice-meta-label">Date:</span>
                <span className="invoice-meta-val">{formatDate(invoice.completedAt)}</span>
              </div>
              {invoice.serviceNumber || invoice.leadId ? (
                <div className="invoice-meta-item">
                  <span className="invoice-meta-label">Service Ref:</span>
                  <span className="invoice-meta-val">{invoice.serviceNumber || invoice.leadId}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="invoice-divider" />

          {/* Parties Section */}
          <div className="invoice-parties-grid">
            <div className="invoice-party-box">
              <div className="invoice-party-label">SELLER (CUSTOMER)</div>
              <div className="invoice-party-name">{sellerName}</div>
              {sellerPhone ? (
                <div className="invoice-party-detail">Phone: {sellerPhone}</div>
              ) : null}
              <div className="invoice-party-detail">
                {sellerAddress || "Pickup address verified onsite"}
              </div>
            </div>

            <div className="invoice-party-box">
              <div className="invoice-party-label">BUYER / AUTHORISED PARTNER</div>
              <div className="invoice-party-name">
                {invoice.partner.name || "GadgetPe Certified Partner"}
              </div>
              {invoice.partner.phone ? (
                <div className="invoice-party-detail">Phone: {invoice.partner.phone}</div>
              ) : null}
              <div className="invoice-party-detail">Platform: GadgetPe Technologies</div>
              <div className="invoice-party-detail">Status: Verified Inspection Partner</div>
            </div>
          </div>

          {/* Device Table */}
          <div className="invoice-table-wrap">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Item & Specification</th>
                  <th style={{ textAlign: "right" }}>Listed Price</th>
                  <th style={{ textAlign: "right" }}>Deductions</th>
                  <th style={{ textAlign: "right" }}>Final Payout</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="invoice-item-name">{invoice.modelName || "Smartphone"}</div>
                    <div className="invoice-item-desc">Device inspected, tested and handed over to partner</div>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    ₹{formatInr(invoice.listedPrice)}
                  </td>
                  <td style={{ textAlign: "right", color: totalDeduction > 0 ? "#dc2626" : "#64748b" }}>
                    {totalDeduction > 0 ? `- ₹${formatInr(totalDeduction)}` : "₹0"}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "#16a387", fontSize: 16 }}>
                    ₹{formatInr(invoice.finalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Itemized Deductions (if any) */}
          {(issues.length > 0 || questionDeductions.length > 0) && (
            <div className="invoice-deductions-box">
              <div className="invoice-deductions-title">
                Onsite Valuation Adjustments & Diagnostics
              </div>
              <ul className="invoice-deductions-list">
                {issues.map((issue, idx) => (
                  <li key={`issue-${idx}`}>
                    <span>{issue.description}</span>
                    <span className="invoice-deduct-amount">
                      - ₹{formatInr(issue.deductRupees ?? issue.deductionAmount ?? 0)}
                    </span>
                  </li>
                ))}
                {questionDeductions.map((qd, idx) => (
                  <li key={`qd-${idx}`}>
                    <span>{qd.description || "Condition diagnostic"}</span>
                    <span className="invoice-deduct-amount">
                      - ₹{formatInr(qd.deductRupees ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Settlement Receipt Box */}
          <div className="invoice-settlement-card">
            <div className="invoice-settlement-left">
              <div className="invoice-settlement-label">TOTAL SETTLEMENT PAID TO SELLER</div>
              <div className="invoice-settlement-amount">₹{formatInr(invoice.finalAmount)}</div>
              <div className="invoice-settlement-sub">
                Mode: {invoice.payment?.paymentMode || "Instant Transfer / UPI"} • Settled on {formatDate(invoice.payment?.submittedAt || invoice.completedAt)}
              </div>
              {invoice.extraPaidAmount && invoice.extraPaidAmount > 0 ? (
                <div className="invoice-settlement-extra">
                  Includes ₹{formatInr(invoice.extraPaidAmount)} partner bonus / adjustment
                </div>
              ) : null}
            </div>
            <div className="invoice-settlement-right">
              <span className="invoice-settlement-badge">
                <ShieldCheck size={16} /> SETTLED & PAID
              </span>
            </div>
          </div>

          {/* Declaration and Legal terms */}
          <div className="invoice-declaration-card">
            <div className="invoice-declaration-title">Declaration of Ownership & Data Safety:</div>
            <ol className="invoice-declaration-list">
              <li>
                The Seller confirms being the lawful, sole owner of the stated device free of all financial liens, contracts, or disputes.
              </li>
              <li>
                The Seller confirms that all personal data, accounts, passwords, and cloud security locks (e.g. Apple ID / Google Account) have been completely removed.
              </li>
              <li>
                Full payout amount has been acknowledged and received. Ownership and physical custody are unconditionally transferred to the buyer.
              </li>
            </ol>
          </div>

          {/* Signatures */}
          <div className="invoice-signatures-row">
            <div>
              <div className="invoice-sig-label">Customer Handover</div>
              <div className="invoice-sig-val">Verified via OTP confirmation</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="invoice-sig-label">Authorized Signatory</div>
              <div className="invoice-sig-val">GadgetPe Certified Partner</div>
            </div>
          </div>

          {/* Footer note */}
          <div className="invoice-paper-footer">
            <div>
              This is a computer-generated invoice and sales memorandum issued via GadgetPe. No physical signature is required.
            </div>
            <div className="invoice-paper-footer-right">
              GadgetPe Technologies • support@gadgetpe.com
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="invoice-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="invoice-footer-btn invoice-btn-outline"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="invoice-footer-btn invoice-btn-primary"
          >
            <Download size={16} /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};
