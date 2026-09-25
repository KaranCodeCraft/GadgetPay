import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { activateRoleSession, clearRoleSession, getActiveRole } from "../lib/auth/role-session";
import { PartnerSharedFooter, SupportFab } from "../components/partner-footer-and-support";
import { getPartnerKycStatus, sendPartnerOtp, submitPartnerKycMetadata, verifyPartnerOtp } from "../lib/api/gadgetpe-client";

export const Route = createFileRoute("/partner")({
  component: PartnerAuthPage,
});

type IdentityProof = "Aadhar" | "Voter ID" | "Driving License" | "PAN Card" | "Passport";

function PartnerAuthPage() {
  const navigate = useNavigate();
  const [blockedForUser, setBlockedForUser] = useState(false);
  const [tab, setTab] = useState<"login" | "signup">("login");

  const [loginPhone, setLoginPhone] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginStep, setLoginStep] = useState<"phone" | "otp">("phone");

  const [signupPhone, setSignupPhone] = useState("");
  const [signupOtp, setSignupOtp] = useState("");
  const [signupStep, setSignupStep] = useState<"phone" | "otp">("phone");
  const [signupFormStep, setSignupFormStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [identityProof, setIdentityProof] = useState<IdentityProof>("Aadhar");
  const [identityFile, setIdentityFile] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [latestKycUrl, setLatestKycUrl] = useState<string | null>(null);

  const hasSignupBasics = fullName.trim().length > 0 && age.trim().length > 0;
  const step1Valid = hasSignupBasics && gender.trim().length > 0;
  const step2Valid = step1Valid && identityFile !== null;
  const canSendSignupOtp = step2Valid && signupPhone.trim().length >= 10;

  const handleStep1Next = () => {
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    if (!age.trim()) { setError("Please enter your age."); return; }
    if (!gender.trim()) { setError("Please select your gender."); return; }
    setError(null); setNotice(null);
    setSignupFormStep(2);
  };

  const handleStep2Next = () => {
    if (!identityFile) { setError("Please upload your government ID."); return; }
    setError(null); setNotice(null);
    setSignupFormStep(3);
  };

  useEffect(() => {
    const activeRole = getActiveRole();
    if (activeRole === "user") {
      setBlockedForUser(true);
      void navigate({ to: "/user" });
      return;
    }

    if (activeRole === "admin") {
      setBlockedForUser(true);
      void navigate({ to: "/admin" });
    }
  }, [navigate]);

  if (blockedForUser) {
    return null;
  }

  const handleSendLoginOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loginPhone.trim().length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }

    setError(null);
    setNotice(null);
    setIsSendingOtp(true);

    try {
      await sendPartnerOtp(loginPhone.trim());
      setLoginStep("otp");
      setNotice("OTP sent. Please enter OTP to login.");
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Failed to send OTP.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loginOtp.trim().length < 4) {
      setError("Please enter OTP.");
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const result = await verifyPartnerOtp(loginPhone.trim(), loginOtp.trim());

      localStorage.setItem("gadgetpe_access_token", result.accessToken);
      localStorage.setItem("gadgetpe_partner_access_token", result.accessToken);
      localStorage.setItem("gadgetpe_refresh_token", result.refreshToken);
      localStorage.setItem("gadgetpe_partner_refresh_token", result.refreshToken);
      localStorage.setItem("gadgetpe_partner_name", result.partner.name);
      activateRoleSession("partner");

      const kyc = await getPartnerKycStatus(result.accessToken);
      setLatestKycUrl(kyc.latestSubmission?.mediaUrl || null);
      if (kyc.latestSubmission?.verificationStatus !== "VERIFIED") {
        clearRoleSession("partner");
        setNotice("KYC verification pending. Please login after Admin approval");
        return;
      }

      setNotice("Login successful.");
      await navigate({ to: "/partner-page" });
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendLoginOtp = async () => {
    if (loginPhone.trim().length < 10) {
      setError("Please enter a valid phone number.");
      setLoginStep("phone");
      return;
    }

    setError(null);
    setNotice(null);
    setIsSendingOtp(true);

    try {
      await sendPartnerOtp(loginPhone.trim());
      setNotice(`OTP sent again to ${loginPhone.trim()}.`);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Failed to resend OTP.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSendSignupOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!age.trim()) {
      setError("Please enter your age.");
      return;
    }
    if (!gender.trim()) {
      setError("Please select your gender.");
      return;
    }
    if (!identityFile) {
      setError("Please upload your government ID.");
      return;
    }
    if (signupPhone.trim().length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }

    setError(null);
    setNotice(null);
    setIsSendingOtp(true);

    try {
      await sendPartnerOtp(signupPhone.trim());
      setSignupStep("otp");
      setNotice("OTP sent. Please enter OTP to complete signup.");
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Failed to send OTP.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (signupOtp.trim().length < 4) {
      setError("Please enter OTP.");
      return;
    }
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!age.trim()) {
      setError("Please enter your age.");
      return;
    }
    if (!gender.trim()) {
      setError("Please select your gender.");
      return;
    }
    if (!identityFile) {
      setError("Please upload your government ID.");
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const result = await verifyPartnerOtp(signupPhone.trim(), signupOtp.trim(), fullName.trim());

      localStorage.setItem("gadgetpe_access_token", result.accessToken);
      localStorage.setItem("gadgetpe_partner_access_token", result.accessToken);
      localStorage.setItem("gadgetpe_refresh_token", result.refreshToken);
      localStorage.setItem("gadgetpe_partner_refresh_token", result.refreshToken);
      localStorage.setItem("gadgetpe_partner_name", result.partner.name);
      activateRoleSession("partner");

      await submitPartnerKycMetadata(result.accessToken, {
        identityProof,
        file: identityFile,
        age,
        address: gender,
        aadharNumber: gstNumber || "",
        gstNumber
      });

      setIsModalOpen(true);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Sign up failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendSignupOtp = async () => {
    if (signupPhone.trim().length < 10) {
      setError("Please enter a valid phone number.");
      setSignupStep("phone");
      return;
    }

    setError(null);
    setNotice(null);
    setIsSendingOtp(true);

    try {
      await sendPartnerOtp(signupPhone.trim());
      setNotice(`OTP sent again to ${signupPhone.trim()}.`);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Failed to resend OTP.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  return (
    <>
      <main className="partner-auth-page">
        <section className="partner-auth-shell">
        <div className="partner-brand"><img src="/logo.png" alt="GadgetPe" style={{ height: "60px", width: "auto" }} /></div>
        <h1>Welcome Partner</h1>
        <p className="partner-auth-subtitle">Login with phone OTP, or register to start your partner journey.</p>

        <div className="partner-auth-tabs" role="tablist" aria-label="Partner auth tabs">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "login"}
            className={`partner-tab-btn${tab === "login" ? " active" : ""}`}
            onClick={() => {
              setTab("login");
              setLoginStep("phone");
              setLoginOtp("");
              setError(null);
              setNotice(null);
            }}
          >
            Login
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "signup"}
            className={`partner-tab-btn${tab === "signup" ? " active" : ""}`}
            onClick={() => {
              setTab("signup");
              setSignupStep("phone");
              setSignupFormStep(1);
              setSignupOtp("");
              setError(null);
              setNotice(null);
            }}
          >
            New Here? Register
          </button>
        </div>

        {tab === "login" ? (
          loginStep === "phone" ? (
            <form className="partner-auth-form" onSubmit={handleSendLoginOtp}>
              <label>
                Phone Number
                <input
                  type="tel"
                  placeholder="Enter your phone"
                  value={loginPhone}
                  maxLength={10}
                  onChange={(event) => setLoginPhone(event.target.value)}
                />
              </label>

              {error && <div className="partner-auth-error">{error}</div>}
              {notice && <div className="partner-otp-hint">{notice}</div>}
              {latestKycUrl ? (
                <a href={latestKycUrl} target="_blank" rel="noreferrer" className="user-inline-link">
                  View latest uploaded KYC
                </a>
              ) : null}

              <button type="submit" className="partner-submit-btn" disabled={isSendingOtp}>
                {isSendingOtp ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          ) : (
            <form className="partner-auth-form" onSubmit={handleLogin}>
              <label>
                OTP
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter OTP"
                  value={loginOtp}
                  maxLength={6}
                  onChange={(event) => setLoginOtp(event.target.value.replace(/\D/g, ""))}
                />
              </label>

              <div className="partner-otp-hint">
                Login for phone {loginPhone}.{" "}
                <button
                  type="button"
                  className="partner-inline-link-btn"
                  onClick={() => {
                    setLoginStep("phone");
                    setLoginOtp("");
                    setError(null);
                    setNotice(null);
                  }}
                >
                  Change number
                </button>
              </div>
              {error && <div className="partner-auth-error">{error}</div>}
              {notice && <div className="partner-otp-hint">{notice}</div>}
              {latestKycUrl ? (
                <a href={latestKycUrl} target="_blank" rel="noreferrer" className="user-inline-link">
                  View latest uploaded KYC
                </a>
              ) : null}

              <button type="button" className="partner-inline-link-btn" onClick={handleResendLoginOtp} disabled={isSendingOtp}>
                {isSendingOtp ? "Sending OTP..." : "Resend OTP"}
              </button>

              <button type="submit" className="partner-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? "Please wait..." : "Login"}
              </button>
            </form>
          )
        ) : (
          <>
            {/* ── Progress bar ── */}
            <div className="partner-signup-steps" role="tablist" aria-label="Registration steps">
              <button
                type="button"
                role="tab"
                aria-selected={signupFormStep === 1}
                className={`partner-step-dot${signupFormStep === 1 ? " current" : ""}${signupFormStep > 1 ? " done" : ""}`}
                onClick={() => setSignupFormStep(1)}
              >
                <span className="partner-step-circle">{signupFormStep > 1 ? "✓" : "1"}</span>
                <span className="partner-step-label">Basic Info</span>
              </button>
              <div className={`partner-step-line${signupFormStep > 1 ? " done" : ""}`} />
              <button
                type="button"
                role="tab"
                aria-selected={signupFormStep === 2}
                className={`partner-step-dot${signupFormStep === 2 ? " current" : ""}${signupFormStep > 2 ? " done" : ""}${!step1Valid ? " disabled" : ""}`}
                onClick={() => { if (step1Valid || signupFormStep > 1) setSignupFormStep(2); }}
              >
                <span className="partner-step-circle">{signupFormStep > 2 ? "✓" : "2"}</span>
                <span className="partner-step-label">Documents</span>
              </button>
              <div className={`partner-step-line${signupFormStep > 2 ? " done" : ""}`} />
              <button
                type="button"
                role="tab"
                aria-selected={signupFormStep === 3}
                className={`partner-step-dot${signupFormStep === 3 ? " current" : ""}${!step2Valid ? " disabled" : ""}`}
                onClick={() => { if (step2Valid || signupFormStep > 2) setSignupFormStep(3); }}
              >
                <span className="partner-step-circle">3</span>
                <span className="partner-step-label">Verify</span>
              </button>
            </div>

            {/* ── Step 1 : Basic Info ── */}
            {signupFormStep === 1 && (
              <div className="partner-signup-card">
                <label>
                  Full Name
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoFocus
                  />
                </label>
                <label>
                  Age
                  <input
                    type="number"
                    placeholder="Enter your age"
                    min="18"
                    max="99"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </label>
                <label>
                  Gender
                  <select value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                {error && <div className="partner-auth-error">{error}</div>}
                <button
                  type="button"
                  className="partner-submit-btn"
                  onClick={handleStep1Next}
                >
                  Next →
                </button>
              </div>
            )}

            {/* ── Step 2 : Documents ── */}
            {signupFormStep === 2 && (
              <div className="partner-signup-card">
                <label>
                  GST Number{" "}
                  <span className="partner-optional-label">(Optional)</span>
                  <input
                    type="text"
                    placeholder="Enter GST number"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                  />
                </label>
                <label>
                  Government ID Type
                  <select
                    value={identityProof}
                    onChange={(e) => setIdentityProof(e.target.value as IdentityProof)}
                  >
                    <option value="Aadhar">Aadhar</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Driving License">Driving License</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="Passport">Passport</option>
                  </select>
                </label>
                <label className="partner-file-label">
                  Upload Government ID
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setIdentityFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {identityFile ? (
                  <p className="partner-file-selected">✓ {identityFile.name}</p>
                ) : null}
                {error && <div className="partner-auth-error">{error}</div>}
                <div className="partner-step-nav-row">
                  <button
                    type="button"
                    className="partner-step-back-btn"
                    onClick={() => { setError(null); setSignupFormStep(1); }}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="partner-submit-btn"
                    onClick={handleStep2Next}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3 : Verify (phone → OTP) ── */}
            {signupFormStep === 3 && (
              signupStep === "phone" ? (
                <form className="partner-signup-card" onSubmit={handleSendSignupOtp}>
                  <label>
                    Mobile Number
                    <input
                      type="tel"
                      placeholder="Enter your mobile number"
                      value={signupPhone}
                      maxLength={10}
                      autoFocus
                      onChange={(e) => setSignupPhone(e.target.value.replace(/\D/g, ""))}
                    />
                  </label>
                  {error && <div className="partner-auth-error">{error}</div>}
                  {notice && <div className="partner-otp-hint">{notice}</div>}
                  <div className="partner-step-nav-row">
                    <button
                      type="button"
                      className="partner-step-back-btn"
                      onClick={() => { setError(null); setSignupFormStep(2); }}
                    >
                      ← Back
                    </button>
                    <button type="submit" className="partner-submit-btn" disabled={isSendingOtp}>
                      {isSendingOtp ? "Sending..." : "Send OTP"}
                    </button>
                  </div>
                </form>
              ) : (
                <form className="partner-signup-card" onSubmit={handleSignup}>
                  <div className="partner-otp-hint">
                    OTP sent to {signupPhone}.{" "}
                    <button
                      type="button"
                      className="partner-inline-link-btn"
                      disabled={isSendingOtp}
                      onClick={() => { void handleResendSignupOtp(); }}
                    >
                      {isSendingOtp ? "Sending..." : "Resend OTP"}
                    </button>{" "}
                    <button
                      type="button"
                      className="partner-inline-link-btn"
                      onClick={() => { setSignupStep("phone"); setSignupOtp(""); setError(null); setNotice(null); }}
                    >
                      Change number
                    </button>
                  </div>
                  <label>
                    Enter OTP
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter OTP"
                      autoFocus
                      value={signupOtp}
                      onChange={(e) => setSignupOtp(e.target.value)}
                    />
                  </label>
                  {error && <div className="partner-auth-error">{error}</div>}
                  {notice && <div className="partner-otp-hint">{notice}</div>}
                  <button type="submit" className="partner-submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? "Please wait..." : "Submit"}
                  </button>
                </form>
              )
            )}
          </>
        )}
      </section>

        {isModalOpen && (
          <div className="partner-modal-backdrop" role="dialog" aria-modal="true">
          <div className="partner-modal-card partner-registration-success-modal">
            <h2>Registration Submitted</h2>
            <p>
              Thank you for registering. Your KYC has been sent for admin review. Once approved,
              you can log in from /partner and access /partner-page.
            </p>
            <div className="partner-modal-actions partner-registration-success-actions">
              <button
                type="button"
                className="partner-submit-btn"
                onClick={() => {
                  setIsModalOpen(false);
                  setTab("login");
                  setLoginStep("phone");
                  setSignupStep("phone");
                  setSignupFormStep(1);
                  setSignupOtp("");
                  setLoginPhone(signupPhone.trim());
                  setLoginOtp("");
                  setNotice("Signup complete. Please login after KYC is approved by admin.");
                }}
              >
                Go To Login
              </button>
            </div>
          </div>
          </div>
        )}
      </main>
      <PartnerSharedFooter />
      <SupportFab />
    </>
  );
}
