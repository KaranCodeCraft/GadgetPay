const templates = {
  finalOfferedPrice: {
    contentIdConfig: "fonadaDltContentIdFinalOfferedPrice",
    render: ({ finalPrice, otp }) =>
      `Dear Customer, The final offered price for your device after inspection is Rs ${finalPrice}. Kindly share the OTP ${otp} to the agent to pay the agreed final amount. - GadgetPe`,
  },
  cxLoginAccount: {
    contentIdConfig: "fonadaDltContentIdCxLoginAccount",
    render: ({ otp }) =>
      `Dear Customer, Please use OTP ${otp} to complete the login process. Kindly ignore this message, if not initiated by you. - GadgetPe`,
  },
  loginAccount: {
    contentIdConfig: "fonadaDltContentIdCxLoginAccount",
    render: ({ otp }) =>
      `Dear Customer, Please use OTP ${otp} to complete the login process. Kindly ignore this message, if not initiated by you. - GadgetPe`,
  },
  amountForPhone: {
    contentIdConfig: "fonadaDltContentIdAmountForPhone",
    render: ({ otp }) => `Dear Customer, OTP to check the exact amount for GadgetPe phone is ${otp}- GadgetPe`,
  },
  createPartner: {
    contentIdConfig: "fonadaDltContentIdCreatePartner",
    render: ({ otp }) => `Dear Partner, OTP to create GadgetPe partner account is ${otp} - GadgetPe`,
  },
  verification: {
    contentIdConfig: "fonadaDltContentIdVerification",
    render: ({ otp }) => `Dear Partner, OTP to create GadgetPe partner account is ${otp} - GadgetPe`,
  },
};

export function getOtpTemplate(templateKey) {
  const template = templates[templateKey];
  if (!template) {
    throw new Error(`Unknown OTP template: ${templateKey}`);
  }
  return template;
}