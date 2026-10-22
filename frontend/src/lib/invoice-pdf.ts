import { jsPDF } from "jspdf";
import type { UserDealInvoice } from "./api/gadgetpe-client";

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

export function generateInvoicePdf(invoice: UserDealInvoice): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // 1. Top Decorative Brand Bar
  doc.setFillColor(22, 163, 135); // #16a387 GadgetPe Teal
  doc.rect(margin, y, contentWidth, 3.5, "F");
  y += 9;

  // 2. Company Brand & Document Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 31, 48); // #0f1f30
  doc.text("GadgetPe", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Certified Device Buyback & Instant Settlement Platform", margin, y + 4.5);
  doc.text("www.gadgetpe.com  |  support@gadgetpe.com", margin, y + 8.5);

  // Document Type & Meta (Right Aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(22, 163, 135);
  doc.text("PURCHASE INVOICE", pageWidth - margin, y - 1, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Invoice ID: ${invoice.id}`, pageWidth - margin, y + 4, { align: "right" });
  doc.text(`Date: ${formatDate(invoice.completedAt)}`, pageWidth - margin, y + 8, { align: "right" });
  if (invoice.serviceNumber || invoice.leadId) {
    doc.text(`Service Ref: ${invoice.serviceNumber || invoice.leadId}`, pageWidth - margin, y + 12, { align: "right" });
  }

  y += 18;

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  // 3. Two-Column Party Details (Seller & Buyer / Partner)
  const colWidth = (contentWidth - 6) / 2;
  const partyBoxHeight = 36;

  // Left Box: Seller (Customer)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, colWidth, partyBoxHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(22, 163, 135);
  doc.text("SELLER (CUSTOMER)", margin + 4, y + 6);

  const sellerName = invoice.customer?.name || invoice.seller?.name || invoice.purchaser?.name || "Customer";
  const sellerPhone = invoice.customer?.phone || invoice.seller?.phone || "-";
  const sellerAddress = invoice.seller?.addressLine || invoice.purchaser?.addressLine || "";
  const sellerCity = invoice.seller?.city || invoice.purchaser?.city || "";
  const sellerPincode = invoice.seller?.pincode || invoice.purchaser?.pincode || "";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 31, 48);
  doc.text(sellerName, margin + 4, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Phone: ${sellerPhone}`, margin + 4, y + 17);
  const fullAddress = [sellerAddress, sellerCity, sellerPincode].filter(Boolean).join(", ");
  const splitAddress = doc.splitTextToSize(fullAddress || "Address provided at pickup", colWidth - 8);
  doc.text(splitAddress, margin + 4, y + 22);

  // Right Box: Buyer / Authorized Partner
  const rightColX = margin + colWidth + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightColX, y, colWidth, partyBoxHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(22, 163, 135);
  doc.text("BUYER / AUTHORISED PARTNER", rightColX + 4, y + 6);

  const partnerName = invoice.partner?.name || "Authorised Partner";
  const partnerPhone = invoice.partner?.phone ? `Phone: ${invoice.partner.phone}` : "";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 31, 48);
  doc.text(partnerName, rightColX + 4, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  if (partnerPhone) {
    doc.text(partnerPhone, rightColX + 4, y + 17);
  }
  doc.text("Platform: GadgetPe Technologies", rightColX + 4, y + 22);
  doc.text("Status: Verified Deal Partner", rightColX + 4, y + 27);

  y += partyBoxHeight + 8;

  // 4. Device Summary Table
  doc.setFillColor(15, 31, 48); // #0f1f30 dark table header
  doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("DEVICE SPECIFICATION", margin + 4, y + 5.5);
  doc.text("LISTED VALUE", margin + 98, y + 5.5, { align: "right" });
  doc.text("DEDUCTIONS", margin + 138, y + 5.5, { align: "right" });
  doc.text("NET PAYOUT", pageWidth - margin - 4, y + 5.5, { align: "right" });

  y += 8;

  // Table Row
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 14, "FD");

  const totalDeductions =
    typeof invoice.deductions?.totalDeductionAmount === "number"
      ? invoice.deductions.totalDeductionAmount
      : Math.max(0, invoice.listedPrice - (invoice.quotedAmount ?? invoice.finalAmount));

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 31, 48);
  doc.text(invoice.modelName || "Smartphone / Device", margin + 4, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Inspected & Handed over to partner", margin + 4, y + 10.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Rs. ${formatInr(invoice.listedPrice)}`, margin + 98, y + 8, { align: "right" });

  doc.setTextColor(220, 38, 38);
  doc.text(totalDeductions > 0 ? `- Rs. ${formatInr(totalDeductions)}` : "Rs. 0", margin + 138, y + 8, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 163, 135);
  doc.text(`Rs. ${formatInr(invoice.finalAmount)}`, pageWidth - margin - 4, y + 8, { align: "right" });

  y += 18;

  // 5. Itemized Deductions (if any)
  const deductionIssues = invoice.deductions?.issues || [];
  const questionDeductions = invoice.deductions?.questionDeductions || [];
  const hasDeductions = deductionIssues.length > 0 || questionDeductions.length > 0;

  if (hasDeductions) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 31, 48);
    doc.text("Onsite Valuation Adjustments & Diagnostics", margin, y);
    y += 4;

    const allIssues = [
      ...deductionIssues.map((i) => ({ desc: i.description, amount: i.deductRupees ?? i.deductionAmount ?? 0 })),
      ...questionDeductions.map((q) => ({ desc: q.description || "Condition variance", amount: q.deductRupees ?? 0 })),
    ];

    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
    const boxHeight = Math.min(allIssues.length * 5 + 6, 32);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 1.5, 1.5, "FD");

    let subY = y + 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(153, 27, 27);

    for (const item of allIssues.slice(0, 5)) {
      doc.text(`• ${item.desc}`, margin + 4, subY);
      if (item.amount > 0) {
        doc.text(`- Rs. ${formatInr(item.amount)}`, pageWidth - margin - 4, subY, { align: "right" });
      }
      subY += 5;
    }

    y += boxHeight + 6;
  }

  // 6. Settlement & Payment Receipt Card
  doc.setFillColor(240, 253, 244); // soft green #f0fdf4
  doc.setDrawColor(187, 247, 208); // green border
  const settlementHeight = 28;
  doc.roundedRect(margin, y, contentWidth, settlementHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(22, 101, 52); // dark green
  doc.text("PAYMENT SETTLEMENT RECEIPT", margin + 4, y + 6);

  // Settlement Status Badge
  doc.setFillColor(22, 163, 135);
  doc.roundedRect(pageWidth - margin - 38, y + 3.5, 34, 5.5, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("SETTLED & PAID", pageWidth - margin - 21, y + 7.3, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(22, 101, 52);
  doc.text(`Rs. ${formatInr(invoice.finalAmount)}`, margin + 4, y + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const paymentMode = invoice.payment?.paymentMode || "Instant Transfer / UPI";
  const paidTime = invoice.payment?.submittedAt || invoice.completedAt;
  doc.text(`Payment Mode: ${paymentMode}`, margin + 4, y + 22);
  doc.text(`Settled At: ${formatDate(paidTime)}`, margin + 70, y + 22);

  if (invoice.extraPaidAmount && invoice.extraPaidAmount > 0) {
    doc.text(`(Includes Rs. ${formatInr(invoice.extraPaidAmount)} partner bonus/adjustment)`, margin + 130, y + 22);
  }

  y += settlementHeight + 8;

  // 7. Declaration of Ownership & Data Erasure
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  const declarationHeight = 26;
  doc.roundedRect(margin, y, contentWidth, declarationHeight, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 31, 48);
  doc.text("Declaration of Ownership Transfer & Data Safety:", margin + 4, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const disclaimer =
    "1. The Seller affirms that they are the genuine owner of the listed device, free of legal disputes or encumbrances.\n" +
    "2. All personal data, security passcodes, and cloud accounts (e.g. iCloud, Google Account) have been wiped.\n" +
    "3. Full settlement amount has been credited to the seller upon device handover. Ownership transfer is complete.";
  const splitDisclaimer = doc.splitTextToSize(disclaimer, contentWidth - 8);
  doc.text(splitDisclaimer, margin + 4, y + 9.5);

  y += declarationHeight + 8;

  // 8. Signatures / Authorization
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Customer Handover: Verified via OTP", margin + 4, y + 4);
  doc.text("Authorised Buyer Signatory: Certified Partner", pageWidth - margin - 4, y + 4, { align: "right" });

  // 9. Document Footer
  const footerY = pageHeight - 12;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("This is an electronically generated sales memorandum issued via GadgetPe platform. No physical signature required.", margin, footerY + 1);
  doc.text(`Page 1 of 1  •  Ref: ${invoice.id}`, pageWidth - margin, footerY + 1, { align: "right" });

  return doc;
}

export function downloadInvoicePdf(invoice: UserDealInvoice): void {
  const doc = generateInvoicePdf(invoice);
  const filename = `GadgetPe_Invoice_${invoice.id || "deal"}.pdf`;
  doc.save(filename);
}
