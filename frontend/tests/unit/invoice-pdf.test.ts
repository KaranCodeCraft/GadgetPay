import test from "node:test";
import assert from "node:assert/strict";
import { generateInvoicePdf } from "../../src/lib/invoice-pdf.ts";
import type { UserDealInvoice } from "../../src/lib/api/gadgetpe-client.ts";

test("generateInvoicePdf creates a valid jsPDF document with invoice metadata", () => {
  const invoice: UserDealInvoice = {
    id: "invoice-lead-1001",
    leadId: "lead-1001",
    userSellFlowId: "flow-1001",
    status: "DEAL_CLOSED",
    modelName: "iPhone 13 128GB",
    listedPrice: 42000,
    quotedAmount: 39000,
    extraPaidAmount: 1000,
    finalAmount: 40000,
    deductions: {
      deductionType: "RUPEES",
      totalDeductionAmount: 3000,
      issues: [
        { description: "Minor scratches on screen", deductRupees: 1500 },
        { description: "Battery health below 80%", deductRupees: 1500 },
      ],
    },
    payment: {
      amountCollected: 40000,
      paymentMode: "UPI_INSTANT",
      submittedAt: "2026-10-22T10:00:00.000Z",
    },
    partner: {
      id: "partner-99",
      name: "GadgetPe Koramangala Hub",
      phone: "9876543210",
    },
    completedAt: "2026-10-22T10:05:00.000Z",
    customer: {
      name: "Rahul Sharma",
      phone: "9123456789",
      addressLine: "123 Indiranagar 100ft Rd",
      city: "Bangalore",
      pincode: "560038",
    },
    serviceNumber: "lead-1001",
  };

  const doc = generateInvoicePdf(invoice);
  assert.ok(doc, "jsPDF instance should be created");
  assert.equal(doc.getNumberOfPages(), 1, "Invoice should be formatted as 1 page");
  const output = doc.output();
  assert.ok(output.startsWith("%PDF"), "Output should be valid PDF binary header");
});

test("generateInvoicePdf handles invoices with zero deductions gracefully", () => {
  const invoice: UserDealInvoice = {
    id: "invoice-lead-1002",
    leadId: "lead-1002",
    status: "DEAL_CLOSED",
    modelName: "Samsung Galaxy S23 Ultra",
    listedPrice: 65000,
    quotedAmount: 65000,
    extraPaidAmount: 0,
    finalAmount: 65000,
    deductions: null,
    payment: {
      amountCollected: 65000,
      paymentMode: "BANK_NEFT",
      submittedAt: "2026-10-22T11:00:00.000Z",
    },
    partner: {
      id: "partner-101",
      name: "TechBuy Electronics",
    },
    completedAt: "2026-10-22T11:15:00.000Z",
  };

  const doc = generateInvoicePdf(invoice);
  assert.ok(doc);
  assert.equal(doc.getNumberOfPages(), 1);
});
