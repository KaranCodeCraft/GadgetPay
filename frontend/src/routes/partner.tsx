import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { activateRoleSession, clearRoleSession, getActiveRole } from "../lib/auth/role-session";
import { PartnerSharedFooter, SupportFab } from "../components/partner-footer-and-support";
import { getPartnerKycStatus, partnerDevLogin, sendPartnerOtp, submitPartnerKycMetadata, verifyPartnerOtp } from "../lib/api/gadgetpe-client";

export const Route = createFileRoute("/partner")({
  component: PartnerAuthPage,
});

type IdentityProof = "Aadhar" | "Voter ID" | "Driving License" | "PAN Card" | "Passport";

const isDevOtpBypassEnabled = import.meta.env.DEV;

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
  const [devSignupAuth, setDevSignupAuth] = useState<Awaited<ReturnType<typeof partnerDevLogin>> | null>(null);
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [address, setAddress] = useState("");
  const [aadharNumber, setAadharNumber] = useState("");
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
  const hasSignupAddressProof = hasSignupBasics && address.trim().length > 0 && aadharNumber.trim().length === 12;
  const canSendSignupOtp = hasSignupAddressProof && signupPhone.trim().length >= 10;

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

  const handleDevLoginOtpBypass = async () => {
    const phone = loginPhone.trim();
    if (phone.length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }

    setError(null);
    setNotice(null);
    setIsSendingOtp(true);

    try {
      const result = await partnerDevLogin(phone);

      localStorage.setItem("gadgetpe_access_token", result.accessToken);
      localStorage.setItem("gadgetpe_partner_access_token", result.accessToken);
      localStorage.setItem("gadgetpe_refresh_token", result.refreshToken);
      localStorage.setItem("gadgetpe_partner_refresh_token", result.refreshToken);
      localStorage.setItem("gadgetpe_partner_name", result.partner.name);
      activateRoleSession("partner");

      setNotice("Dev login successful.");
      window.location.assign("/partner-page");
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Failed to use dev OTP bypass.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleDevSignupOtpBypass = async () => {
    if (!fullName.trim()) {
      setError("Please enter full name as per Aadhar.");
      return;
    }
    if (!age.trim()) {
      setError("Please enter your age.");
      return;
    }
    if (!address.trim()) {
      setError("Please enter your address.");
      return;
    }
    if (!aadharNumber.trim() || aadharNumber.trim().length !== 12) {
      setError("Please enter a valid 12-digit Aadhar number.");
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
      const result = await partnerDevLogin(signupPhone.trim(), fullName.trim());

      localStorage.setItem("gadgetpe_access_token", result.accessToken);
      localStorage.setItem("gadgetpe_partner_access_token", result.accessToken);
      localStorage.setItem("gadgetpe_refresh_token", result.refreshToken);
      localStorage.setItem("gadgetpe_partner_refresh_token", result.refreshToken);
      localStorage.setItem("gadgetpe_partner_name", result.partner.name);
      activateRoleSession("partner");

      setDevSignupAuth(result);
      setSignupOtp("6767");
      setSignupStep("otp");
      setNotice("Dev registration bypass enabled. Upload identity image and submit.");
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Failed to use dev registration bypass.");
    } finally {
      setIsSendingOtp(false);
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
      setError("Please enter full name as per Aadhar.");
      return;
    }
    if (!age.trim()) {
      setError("Please enter your age.");
      return;
    }
    if (!address.trim()) {
      setError("Please enter your address.");
      return;
    }
    if (!aadharNumber.trim() || aadharNumber.trim().length !== 12) {
      setError("Please enter a valid 12-digit Aadhar number.");
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
      setDevSignupAuth(null);
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
      setError("Please enter full name as per Aadhar.");
      return;
    }
    if (!age.trim()) {
      setError("Please enter your age.");
      return;
    }
    if (!address.trim()) {
      setError("Please enter your address.");
      return;
    }
    if (!aadharNumber.trim() || aadharNumber.trim().length !== 12) {
      setError("Please enter a valid 12-digit Aadhar number.");
      return;
    }
    // GST is optional in this flow typically but let's just make it required or optional
    // We will keep it optional for now, or just require it based on prompt (it says "Aadhar number, gst, then mobile")
    
    if (!identityFile) {
      setError("Please upload your proof of identity image.");
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const result = devSignupAuth ?? (await verifyPartnerOtp(signupPhone.trim(), signupOtp.trim(), fullName.trim()));

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
        address,
        aadharNumber,
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
      setDevSignupAuth(null);
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
              setSignupOtp("");
                setDevSignupAuth(null);
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
              {isDevOtpBypassEnabled ? (
                <button
                  type="button"
                  className="partner-inline-link-btn"
                  onClick={handleDevLoginOtpBypass}
                  disabled={isSendingOtp}
                >
                  Dev login bypass
                </button>
              ) : null}
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
          signupStep === "phone" ? (
            <form className="partner-auth-form" onSubmit={handleSendSignupOtp}>
              <label>
                Full Name
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </label>

              <label>
                Age
                <input
                  type="number"
                  placeholder="Enter your age"
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                  required
                />
              </label>

              {hasSignupBasics ? (
                <>
                  <label>
                    Address
                    <textarea
                      placeholder="Enter your address"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      required
                      rows={3}
                    />
                  </label>

                  <label>
                    Aadhar Number
                    <input
                      type="text"
                      placeholder="Enter 12-digit Aadhar number"
                      value={aadharNumber}
                      maxLength={12}
                      onChange={(event) => setAadharNumber(event.target.value.replace(/\D/g, ""))}
                      required
                    />
                  </label>
                </>
              ) : null}

              {hasSignupAddressProof ? (
                <>
                  <label>
                    GST Number (Optional)
                    <input
                      type="text"
                      placeholder="Enter GST number"
                      value={gstNumber}
                      onChange={(event) => setGstNumber(event.target.value)}
                    />
                  </label>

                  <label>
                    Phone Number
                    <input
                      type="tel"
                      placeholder="Enter your phone"
                      value={signupPhone}
                      maxLength={10}
                      onChange={(event) => setSignupPhone(event.target.value.replace(/\D/g, ""))}
                      required
                    />
                  </label>
                </>
              ) : null}

              {error && <div className="partner-auth-error">{error}</div>}
              {notice && <div className="partner-otp-hint">{notice}</div>}

              <button type="submit" className="partner-submit-btn" disabled={isSendingOtp || !canSendSignupOtp}>
                {isSendingOtp ? "Sending..." : "Send OTP"}
              </button>
              {isDevOtpBypassEnabled ? (
                <button
                  type="button"
                  className="partner-inline-link-btn"
                  onClick={handleDevSignupOtpBypass}
                  disabled={isSendingOtp || !canSendSignupOtp}
                >
                  Dev registration bypass
                </button>
              ) : null}
            </form>
          ) : (
            <form className="partner-auth-form" onSubmit={handleSignup}>
              <label>
                Enter OTP
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Enter OTP"
                  value={signupOtp}
                  onChange={(event) => setSignupOtp(event.target.value)}
                />
              </label>

              <div className="partner-otp-hint">
                OTP sent to {signupPhone}.{" "}
                <button
                  type="button"
                  className="partner-inline-link-btn"
                  disabled={isSendingOtp}
                  onClick={() => {
                    void handleResendSignupOtp();
                  }}
                >
                  {isSendingOtp ? "Sending..." : "Send OTP again"}
                </button>{" "}
                <button
                  type="button"
                  className="partner-inline-link-btn"
                  onClick={() => {
                    setSignupStep("phone");
                    setSignupOtp("");
                    setDevSignupAuth(null);
                    setError(null);
                    setNotice(null);
                  }}
                >
                  Change number
                </button>
              </div>

              <label>
                Proof of Identity
                <select
                  value={identityProof}
                  onChange={(event) => setIdentityProof(event.target.value as IdentityProof)}
                >
                  <option value="Aadhar">Aadhar</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Driving License">Driving License</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Passport">Passport</option>
                </select>
              </label>

              <label className="partner-file-label">
                Upload Identity Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setIdentityFile(event.target.files?.[0] ?? null)}
                />
              </label>

              <button type="button" className="partner-upload-btn">
                {identityFile ? `Uploaded: ${identityFile.name}` : "Upload"}
              </button>

              {error && <div className="partner-auth-error">{error}</div>}
              {notice && <div className="partner-otp-hint">{notice}</div>}

              <button type="submit" className="partner-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? "Please wait..." : "Submit"}
              </button>
            </form>
          )
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
