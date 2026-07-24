import { createFileRoute, Link } from "@tanstack/react-router";
import { Smartphone } from "lucide-react";

export const Route = createFileRoute("/user/list-device")({
  component: UserListDevicePage,
});

function UserListDevicePage() {
  return (
    <main className="user-seller-page">
      <section className="user-dashboard-shell user-dashboard-shell-pro">
        <div className="user-auth-brand">Seller Action</div>
        <h1>List Device</h1>
        <p>Start a fresh selling journey from here. Choose what you want to sell and continue into the pricing flow.</p>
        <section className="user-action-route-card">
          <span className="user-action-icon"><Smartphone size={18} /></span>
          <h2>Start New Listing</h2>
          <p>Create a new device listing, choose category, and continue into the selling flow.</p>
          <div className="user-auth-actions" style={{ marginTop: 18 }}>
            <Link to="/user/sell-phone" className="user-auth-submit user-inline-link">Sell Mobile</Link>
            <Link to="/user/sell-tablet" className="user-auth-submit user-inline-link">Sell Tablet or iPad</Link>
            <Link to="/user" className="user-auth-cancel user-inline-link">Back to Dashboard</Link>
          </div>
        </section>
      </section>
    </main>
  );
}
