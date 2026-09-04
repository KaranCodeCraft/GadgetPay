import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getActiveRole } from "../lib/auth/role-session";
import {
  addPartnerWorkingPincode,
  getPartnerWorkingPincodes,
  removePartnerWorkingPincode,
  type WorkingPincode,
} from "../lib/api/gadgetpe-client";

export const Route = createFileRoute("/partner-page/working-pincodes")({
  component: WorkingPincodesPage,
});

const PARTNER_TOKEN_KEY = "gadgetpe_partner_access_token";
const LEGACY_TOKEN_KEY = "gadgetpe_access_token";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PARTNER_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
}

function WorkingPincodesPage() {
  const navigate = useNavigate();
  const [pincodes, setPincodes] = useState<WorkingPincode[]>([]);
  const [loading, setLoading] = useState(true);
  const [addInput, setAddInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingPincode, setRemovingPincode] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    const activeRole = getActiveRole();
    if (activeRole === "user") {
      void navigate({ to: "/user" });
      return;
    }
    if (activeRole === "admin") {
      void navigate({ to: "/admin" });
      return;
    }

    const token = getToken();
    if (!token) {
      window.location.href = "/partner";
      return;
    }

    void (async () => {
      try {
        const result = await getPartnerWorkingPincodes(token);
        setPincodes(result.pincodes);
      } catch {
        toast.error("Unable to load working pincodes.");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const handleAdd = async () => {
    const pincode = addInput.trim();
    if (!/^\d{6}$/.test(pincode)) {
      setAddError("Enter a valid 6-digit pincode.");
      return;
    }
    const token = getToken();
    if (!token) {
      window.location.href = "/partner";
      return;
    }

    setAdding(true);
    setAddError(null);
    try {
      const result = await addPartnerWorkingPincode(token, pincode);
      setPincodes(result.pincodes);
      setAddInput("");
      toast.success(`Pincode ${pincode} added.`);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Unable to add pincode.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (pincode: string) => {
    const token = getToken();
    if (!token) {
      window.location.href = "/partner";
      return;
    }

    setRemovingPincode(pincode);
    try {
      const result = await removePartnerWorkingPincode(token, pincode);
      setPincodes(result.pincodes);
      toast.success(`Pincode ${pincode} removed.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to remove pincode.");
    } finally {
      setRemovingPincode(null);
    }
  };

  return (
    <main className="partner-simple-page working-pincodes-page">
      <div className="partner-subpage-topbar">
        <Link to="/partner-page" className="partner-subpage-hamburger" aria-label="Back to partner dashboard">
          ☰
        </Link>
        <Link to="/partner-page" className="partner-subpage-logo" aria-label="Go to partner dashboard">
          <img src="/logo.png" alt="GadgetPe" />
        </Link>
      </div>

      <section className="partner-simple-card working-pincodes-card">
        <h1>Working Pincodes</h1>
        <p className="working-pincodes-subtitle">{pincodes.length} pincodes configured</p>

        {loading ? (
          <p className="working-pincodes-loading">Loading...</p>
        ) : (
          <div className="working-pincodes-list">
            {pincodes.length === 0 ? (
              <p className="working-pincodes-empty">No working pincodes added yet.</p>
            ) : (
              pincodes.map((wp) => (
                <div key={wp.pincode} className="working-pincodes-item">
                  <div className="working-pincodes-item-info">
                    <span className="working-pincodes-item-pin">{wp.pincode}</span>
                    {wp.district || wp.state ? (
                      <span className="working-pincodes-item-loc">
                        {[wp.district, wp.state].filter(Boolean).join(", ")}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="working-pincodes-remove-btn"
                    onClick={() => void handleRemove(wp.pincode)}
                    disabled={removingPincode === wp.pincode}
                    aria-label={`Remove pincode ${wp.pincode}`}
                  >
                    {removingPincode === wp.pincode ? "..." : "✕"}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        <div className="working-pincodes-add-form">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter 6-digit pincode"
            value={addInput}
            onChange={(e) => {
              setAddInput(e.target.value);
              setAddError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !adding) void handleAdd();
            }}
            disabled={adding}
            className="working-pincodes-input"
          />
          <button
            type="button"
            className="working-pincodes-add-btn"
            onClick={() => void handleAdd()}
            disabled={adding}
          >
            {adding ? "Adding..." : "Add Pincode"}
          </button>
        </div>
        {addError ? <p className="working-pincodes-error">{addError}</p> : null}

        <Link to="/Lead-bucket" className="partner-simple-link working-pincodes-bucket-link">
          View Lead Bucket →
        </Link>
      </section>
    </main>
  );
}
