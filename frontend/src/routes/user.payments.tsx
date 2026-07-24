import { createFileRoute, Link } from "@tanstack/react-router";
import { IndianRupee } from "lucide-react";

export const Route = createFileRoute("/user/payments")({
  component: UserPaymentsPage,
});

function UserPaymentsPage() {
  return (
    <main className="user-seller-page">
      <section className="user-dashboard-shell user-dashboard-shell-pro">
        <div className="user-auth-brand">Seller Action</div>
        <h1>Payments</h1>
        <section className="user-action-route-card">
          <span className="user-action-icon"><IndianRupee size={18} /></span>
          <h2>Payout Overview</h2>
          <p>Review payouts, pending settlements, and payment state from a focused screen.</p>
          <div className="user-action-route-empty">Payment cards and settlement timeline can live here cleanly once backed by API data.</div>
          <div className="user-auth-actions" style={{ marginTop: 18 }}>
            <Link to="/user" className="user-auth-cancel user-inline-link">Back to Dashboard</Link>
          </div>
        </section>
      </section>
    </main>
  );
}
