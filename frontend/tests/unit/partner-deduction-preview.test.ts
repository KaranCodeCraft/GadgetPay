import test from "node:test";
import assert from "node:assert/strict";
import { buildRowDeductionPreview } from "../../src/lib/partner-deduction-preview.ts";
import type { PartnerOnsiteDeductionCatalog } from "../../src/lib/api/gadgetpe-client.ts";

const catalog: PartnerOnsiteDeductionCatalog = {
  basePrice: 50000,
  fields: {
    screenOriginal: {
      triggerOn: "no",
      rules: [
        {
          ruleId: "screen-not-original",
          label: "Screen Not Original",
          answerGroup: "basicFunctionality",
          answerKey: "screenReplaced",
          answerValue: "no",
          amount: 2000,
        },
      ],
    },
  },
  rules: [
    {
      ruleId: "major-discoloration",
      label: "Major Discoloration",
      answerGroup: "nestedPhysicalIssueAnswers",
      answerKey: "screenDiscoloration",
      answerValue: "majorDiscoloration",
      amount: 7000,
    },
    {
      ruleId: "minor-discoloration",
      label: "Minor Discoloration",
      answerGroup: "nestedPhysicalIssueAnswers",
      answerKey: "screenDiscoloration",
      answerValue: "minorDiscoloration",
      amount: 3000,
    },
    {
      ruleId: "screen-not-original",
      label: "Screen Not Original",
      answerGroup: "basicFunctionality",
      answerKey: "screenReplaced",
      answerValue: "no",
      amount: 2000,
    },
  ],
};

const rows = [
  {
    key: "nestedPhysicalIssueAnswers.screenDiscoloration",
    label: "Nested Physical Issue Answers / Screen Discoloration",
    userValue: "majorDiscoloration",
  },
  {
    key: "basicFunctionality.screenReplaced",
    label: "Basic Functionality / Screen Original",
    userValue: "yes",
  },
];

test("confirmed partner checks do not add onsite deductions", () => {
  const preview = buildRowDeductionPreview(rows, {
    "nestedPhysicalIssueAnswers.screenDiscoloration": { decision: "yes", comment: "confirmed" },
    "basicFunctionality.screenReplaced": { decision: "yes", comment: "confirmed" },
  }, catalog);

  assert.deepEqual(preview, {});
});

test("disputed partner checks apply only matching answerValue rules once", () => {
  const preview = buildRowDeductionPreview(rows, {
    "nestedPhysicalIssueAnswers.screenDiscoloration": { decision: "no", comment: "major condition disputed" },
    "basicFunctionality.screenReplaced": { decision: "no", comment: "screen was replaced" },
  }, catalog);

  assert.deepEqual(preview["nestedPhysicalIssueAnswers.screenDiscoloration"], {
    amount: 7000,
    labels: ["Major Discoloration"],
  });
  assert.deepEqual(preview["basicFunctionality.screenReplaced"], {
    amount: 2000,
    labels: ["Screen Not Original"],
  });
});
