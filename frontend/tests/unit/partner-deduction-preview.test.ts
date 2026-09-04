import test from "node:test";
import assert from "node:assert/strict";
import { buildRowDeductionPreview } from "../../src/lib/partner-deduction-preview.ts";
import type { PartnerOnsiteDeductionCatalog } from "../../src/lib/api/gadgetpe-client.ts";

const catalog: PartnerOnsiteDeductionCatalog = {
  basePrice: 50000,
  fields: {
    makeReceiveCalls: {
      triggerOn: "no",
      rules: [
        {
          ruleId: "cannot-make-calls",
          label: "Cannot Make Calls",
          answerGroup: "basicFunctionality",
          answerKey: "canMakeCalls",
          answerValue: "no",
          amount: 1500,
        },
      ],
    },
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
    originalBoxWithIMEI: {
      triggerOn: "no",
      rules: [
        {
          ruleId: "original-box-missing",
          label: "Original Box with same IMEI",
          answerGroup: "accessories",
          answerKey: "originalBoxWithIMEI",
          answerValue: null,
          amount: 100,
        },
      ],
    },
    screenDeadPixelsNoSpots: {
      triggerOn: "no",
      rules: [
        {
          ruleId: "screen-no-spots",
          label: "No spots on screen",
          answerGroup: "nestedPhysicalIssueAnswers",
          answerKey: "screenDeadPixels",
          answerValue: "noSpots",
          amount: 500,
        },
      ],
    },
    screenVisibleLinesNoLines: {
      triggerOn: "no",
      rules: [
        {
          ruleId: "screen-no-lines",
          label: "No line(s) on Display",
          answerGroup: "nestedPhysicalIssueAnswers",
          answerKey: "visibleLines",
          answerValue: "line",
          amount: 600,
        },
      ],
    },
    screenDiscolorationMajor: {
      triggerOn: "no",
      rules: [
        {
          ruleId: "major-discoloration",
          label: "Major Discoloration",
          answerGroup: "nestedPhysicalIssueAnswers",
          answerKey: "discoloration",
          answerValue: "major",
          amount: 7000,
        },
      ],
    },
    screenCracksChippedOutsideDisplay: {
      triggerOn: "no",
      rules: [
        {
          ruleId: "outside-display-crack",
          label: "Chipped/cracked outside display area",
          answerGroup: "nestedPhysicalIssueAnswers",
          answerKey: "screenPhysical",
          answerValue: "chippedOutside",
          amount: 800,
        },
      ],
    },
  },
  rules: [
    {
      ruleId: "cannot-make-calls",
      label: "Cannot Make Calls",
      answerGroup: "basicFunctionality",
      answerKey: "canMakeCalls",
      answerValue: "no",
      amount: 1500,
    },
    {
      ruleId: "major-discoloration",
      label: "Major Discoloration",
      answerGroup: "nestedPhysicalIssueAnswers",
      answerKey: "discoloration",
      answerValue: "major",
      amount: 7000,
    },
    {
      ruleId: "minor-discoloration",
      label: "Minor Discoloration",
      answerGroup: "nestedPhysicalIssueAnswers",
      answerKey: "discoloration",
      answerValue: "minor",
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
    {
      ruleId: "original-box-missing",
      label: "Original Box with same IMEI",
      answerGroup: "accessories",
      answerKey: "originalBoxWithIMEI",
      answerValue: null,
      amount: 100,
    },
    {
      ruleId: "screen-no-spots",
      label: "No spots on screen",
      answerGroup: "nestedPhysicalIssueAnswers",
      answerKey: "screenDeadPixels",
      answerValue: "noSpots",
      amount: 500,
    },
    {
      ruleId: "screen-no-lines",
      label: "No line(s) on Display",
      answerGroup: "nestedPhysicalIssueAnswers",
      answerKey: "visibleLines",
      answerValue: "line",
      amount: 600,
    },
    {
      ruleId: "outside-display-crack",
      label: "Chipped/cracked outside display area",
      answerGroup: "nestedPhysicalIssueAnswers",
      answerKey: "screenPhysical",
      answerValue: "chippedOutside",
      amount: 800,
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

test("canonical basic functionality disputes apply admin yes/no deductions", () => {
  const preview = buildRowDeductionPreview([
    {
      key: "basicFunctionality.canMakeCalls",
      label: "Are you able to make and receive calls?",
      userValue: "yes",
    },
  ], {
    "basicFunctionality.canMakeCalls": { decision: "no", comment: "calls failed onsite" },
  }, catalog);

  assert.deepEqual(preview["basicFunctionality.canMakeCalls"], {
    amount: 1500,
    labels: ["Cannot Make Calls"],
  });
});

test("legacy duplicate rows do not double count the same admin rule", () => {
  const preview = buildRowDeductionPreview([
    {
      key: "basicFunctionality.canMakeCalls",
      label: "Are you able to make and receive calls?",
      userValue: "yes",
    },
    {
      key: "canMakeCalls",
      label: "Can Make Calls",
      userValue: "Yes",
    },
  ], {
    "basicFunctionality.canMakeCalls": { decision: "no", comment: "calls failed onsite" },
    canMakeCalls: { decision: "no", comment: "legacy duplicate" },
  }, catalog);

  assert.deepEqual(preview["basicFunctionality.canMakeCalls"], {
    amount: 1500,
    labels: ["Cannot Make Calls"],
  });
  assert.equal(Object.values(preview).reduce((sum, row) => sum + row.amount, 0), 1500);
});

test("original box row uses its own admin rule instead of GST bill mapping", () => {
  const preview = buildRowDeductionPreview([
    {
      key: "accessories.originalBoxWithIMEI",
      label: "Original Box with same IMEI",
      userValue: "yes",
    },
  ], {
    "accessories.originalBoxWithIMEI": { decision: "no", comment: "box IMEI did not match" },
  }, catalog);

  assert.deepEqual(preview["accessories.originalBoxWithIMEI"], {
    amount: 100,
    labels: ["Original Box with same IMEI"],
  });
});

test("nested screen detail rows apply direct admin rules", () => {
  const nestedRows = [
    {
      key: "nestedPhysicalIssueAnswers.screenDeadPixels",
      label: "Nested Physical Issue Answers / Screen Dead Pixels",
      userValue: "noSpots",
    },
    {
      key: "nestedPhysicalIssueAnswers.screenVisibleLines",
      label: "Nested Physical Issue Answers / Screen Visible Lines",
      userValue: "noLines",
    },
    {
      key: "nestedPhysicalIssueAnswers.screenDiscoloration",
      label: "Nested Physical Issue Answers / Screen Discoloration",
      userValue: "majorDiscoloration",
    },
    {
      key: "nestedPhysicalIssueAnswers.screenCracks",
      label: "Nested Physical Issue Answers / Screen Cracks",
      userValue: "chippedOrCrackedOutsideDisplay",
    },
  ];
  const preview = buildRowDeductionPreview(nestedRows, {
    "nestedPhysicalIssueAnswers.screenDeadPixels": { decision: "no", comment: "spots visible" },
    "nestedPhysicalIssueAnswers.screenVisibleLines": { decision: "no", comment: "lines visible" },
    "nestedPhysicalIssueAnswers.screenDiscoloration": { decision: "no", comment: "discoloration confirmed" },
    "nestedPhysicalIssueAnswers.screenCracks": { decision: "no", comment: "crack crosses display" },
  }, catalog);

  assert.deepEqual(preview["nestedPhysicalIssueAnswers.screenDeadPixels"], { amount: 500, labels: ["No spots on screen"] });
  assert.deepEqual(preview["nestedPhysicalIssueAnswers.screenVisibleLines"], { amount: 600, labels: ["No line(s) on Display"] });
  assert.deepEqual(preview["nestedPhysicalIssueAnswers.screenDiscoloration"], { amount: 7000, labels: ["Major Discoloration"] });
  assert.deepEqual(preview["nestedPhysicalIssueAnswers.screenCracks"], { amount: 800, labels: ["Chipped/cracked outside display area"] });
});
