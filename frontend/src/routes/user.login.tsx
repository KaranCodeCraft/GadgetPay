import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { activateRoleSession, getActiveRole } from "../lib/auth/role-session";
import { ApiClientError, sendUserOtp, userDevLogin, verifyUserOtp } from "../lib/api/gadgetpe-client";

export const Route = createFileRoute("/user/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirectTo: typeof search.redirectTo === "string" ? search.redirectTo : undefined,
  }),
  component: UserLoginPage,
});

const USER_TOKEN_KEY = "gadgetpe_user_access_token";
const USER_REFRESH_KEY = "gadgetpe_user_refresh_token";
const USER_NAME_KEY = "gadgetpe_user_name";
const USER_ID_KEY = "gadgetpe_user_id";
const USER_POST_LOGIN_SELL_MODAL_FLAG_KEY = "gadgetpe_user_post_login_sell_modal";
const isDevOtpBypassEnabled = import.meta.env.DEV;

function getSafeRedirectPath(redirectTo: string | undefined): string | null {
  if (!redirectTo || !redirectTo.startsWith("/")) {
    return null;
  }
  if (redirectTo.startsWith("//")) {
    return null;
  }
  return redirectTo;
}

function UserLoginPage() {
  const navigate = useNavigate();
  const { redirectTo } = Route.useSearch();
  const safeRedirectTo = getSafeRedirectPath(redirectTo);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [loginStep, setLoginStep] = useState<"phone" | "otp">("phone");
  const [requiresName, setRequiresName] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const role = getActiveRole();
    if (role === "admin") {
      void navigate({ to: "/admin" });
      return;
    }
    if (role === "partner") {
      void navigate({ to: "/partner-page" });
      return;
    }

    if (typeof window !== "undefined" && window.localStorage.getItem(USER_TOKEN_KEY)) {
      void navigate({ to: safeRedirectTo ?? "/user" });
    }
  }, [navigate, safeRedirectTo]);

  const handleSendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{10}$/.test(phone.trim())) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }

    setError(null);
    setIsSendingOtp(true);
    try {
      const otpResult = await sendUserOtp(phone.trim());
      setRequiresName(otpResult.requiresName);
      if (!otpResult.requiresName) {
        setNameInput("");
      }
      setLoginStep("otp");
      toast.success("OTP sent! Use 6767 in dev.");
    } catch (apiError) {
      const message = apiError instanceof ApiClientError ? apiError.message : "Failed to send OTP.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{4,6}$/.test(otp.trim())) {
      setError("Enter a valid OTP.");
      return;
    }
    if (requiresName && nameInput.trim().length < 2) {
      setError("Enter your name to create a new account.");
      return;
    }

    setError(null);
    setIsVerifyingOtp(true);
    try {
      const result = await verifyUserOtp(phone.trim(), otp.trim(), requiresName ? nameInput.trim() : undefined);
      localStorage.setItem(USER_TOKEN_KEY, result.accessToken);
      localStorage.setItem(USER_REFRESH_KEY, result.refreshToken);
      localStorage.setItem(USER_NAME_KEY, result.user.name);
      localStorage.setItem(USER_ID_KEY, result.user.id);
      if (!safeRedirectTo) {
        localStorage.setItem(USER_POST_LOGIN_SELL_MODAL_FLAG_KEY, "1");
      }
      activateRoleSession("user");
      toast.success(`Welcome, ${result.user.name}!`);
      await navigate({ to: safeRedirectTo ?? "/user" });
    } catch (apiError) {
      const message = apiError instanceof ApiClientError ? apiError.message : "OTP verification failed.";
      setError(message);
      toast.error(message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleDevOtpBypass = async () => {
    const trimmedPhone = phone.trim();
    if (!/^\d{10}$/.test(trimmedPhone)) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }

    setError(null);
    setIsSendingOtp(true);
    try {
      const result = await userDevLogin(trimmedPhone, nameInput.trim() || undefined);
      localStorage.setItem(USER_TOKEN_KEY, result.accessToken);
      localStorage.setItem(USER_REFRESH_KEY, result.refreshToken);
      localStorage.setItem(USER_NAME_KEY, result.user.name);
      localStorage.setItem(USER_ID_KEY, result.user.id);
      if (!safeRedirectTo) {
        localStorage.setItem(USER_POST_LOGIN_SELL_MODAL_FLAG_KEY, "1");
      }
      activateRoleSession("user");
      toast.success(`Dev login successful. Welcome, ${result.user.name}!`);
      await navigate({ to: safeRedirectTo ?? "/user" });
    } catch (apiError) {
      const message = apiError instanceof ApiClientError ? apiError.message : "Failed to use dev OTP bypass.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  return (
    <main className="user-seller-page">
      <div className="user-auth-overlay user-login-overlay user-login-route-overlay" role="dialog" aria-modal="true">
        <section className="user-auth-card user-auth-dialog user-login-dialog user-login-route-dialog">
          <div className="user-auth-brand user-login-brand-center"><img src="/logo.png" alt="GadgetPe" style={{ height: "60px", width: "auto" }} /></div>
          {/* <h1>Seller Login</h1> */}
          <p>Login to manage your listed devices, pickups, and payments.</p>

          {loginStep === "phone" && (
            <form className="user-auth-form" onSubmit={(e) => void handleSendOtp(e)}>
              <label>
                Phone Number
                <input
                  type="tel"
                  placeholder="Enter your 10-digit phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  maxLength={10}
                />
              </label>
              <div className="user-auth-hint">An OTP will be sent to your phone.</div>
              {error && <div className="user-auth-error">{error}</div>}
              <div className="user-auth-actions">
                <button
                  type="button"
                  className="user-auth-cancel"
                  onClick={() => {
                    setError(null);
                    setPhone("");
                    setNameInput("");
                    setRequiresName(false);
                    void navigate({ to: "/user" });
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="user-auth-submit" disabled={isSendingOtp}>
                  {isSendingOtp ? "Sending..." : "Send OTP"}
                </button>
              </div>
              {isDevOtpBypassEnabled ? (
                <button
                  type="button"
                  className="user-auth-bypass-link"
                  onClick={() => void handleDevOtpBypass()}
                  disabled={isSendingOtp}
                >
                  Use dev OTP bypass
                </button>
              ) : null}
            </form>
          )}

          {loginStep === "otp" && (
            <form className="user-auth-form" onSubmit={(e) => void handleVerifyOtp(e)}>
              <label>
                OTP
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter OTP (dev: 6767)"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                />
              </label>
              {requiresName && (
                <label>
                  Your Name
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={nameInput}
                    onChange={(event) => setNameInput(event.target.value)}
                    maxLength={80}
                  />
                </label>
              )}
              <div className="user-auth-hint">
                OTP sent to {phone}.{" "}
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    color: "inherit",
                    textDecoration: "underline",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  onClick={() => {
                    setLoginStep("phone");
                    setOtp("");
                    setNameInput("");
                    setRequiresName(false);
                    setError(null);
                  }}
                >
                  Change number
                </button>
              </div>
              {error && <div className="user-auth-error">{error}</div>}
              <div className="user-auth-actions">
                <button
                  type="button"
                  className="user-auth-cancel"
                  onClick={() => {
                    setLoginStep("phone");
                    setPhone("");
                    setOtp("");
                    setNameInput("");
                    setRequiresName(false);
                    setError(null);
                    void navigate({ to: "/user" });
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="user-auth-submit" disabled={isVerifyingOtp}>
                  {isVerifyingOtp ? "Verifying..." : "Verify & Login"}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
