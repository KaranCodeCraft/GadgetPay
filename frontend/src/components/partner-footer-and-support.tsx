import { Instagram, Mail, MapPin, PhoneCall } from "lucide-react";

const SUPPORT_WHATSAPP_URL = "https://wa.me/919311125745";
const INSTAGRAM_URL = "https://www.instagram.com/gadgetpeofficial?igsh=MWt5ZTRwaGtiMnU3bw%3D%3D&utm_source=qr";

export function PartnerSharedFooter() {
  return (
    <footer className="gp-user-footer">
      <div className="gp-wrap gp-user-footer-grid">
        <div className="gp-user-footer-brand">
          <div className="gp-user-footer-logo"><img src="/logo.png" alt="GadgetPe" style={{ height: "40px", width: "auto" }} /></div>
          <h3>Turn Your Device Into Money</h3>
          <p>GadgetPe is a modern device marketplace that makes selling your old smartphones, iPads, and tablets simple, secure, and rewarding.</p>
          <div className="gp-user-footer-social" aria-label="Contact shortcuts">
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram GadgetPe"><Instagram size={18} /></a>
            <a href="mailto:support@gadgetpe.com" aria-label="Email GadgetPe"><Mail size={18} /></a>
            <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp GadgetPe"><PhoneCall size={18} /></a>
          </div>
        </div>
        <div className="gp-user-footer-column">
          <h3>Contact</h3>
          <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer"><PhoneCall size={16} /><span>+91 93111 25745</span></a>
          <a href="mailto:support@gadgetpe.com"><Mail size={16} /><span>support@gadgetpe.com</span></a>
          <a href="https://www.gadgetpe.com" target="_blank" rel="noopener noreferrer"><Instagram size={16} /><span>www.gadgetpe.com</span></a>
        </div>
        <div className="gp-user-footer-column">
          <h3>Currently Serving</h3>
          <div className="gp-user-footer-text-row"><MapPin size={16} /><span>Delhi NCR</span></div>
        </div>
        <div className="gp-user-footer-column gp-user-footer-contact">
          <h3>Legal</h3>
          <div className="gp-user-footer-legal-links">
            <a href="/Policy">Privacy Policy</a>
            <span>|</span>
            <a href="/Policy">Terms &amp; Conditions</a>
            <span>|</span>
            <a href="/Policy">Refund &amp; Cancellation Policy</a>
            <span>|</span>
            <a href="/Policy">Partner Policy</a>
          </div>
        </div>
      </div>
      <div className="gp-wrap gp-user-footer-bottom">
        <span>© 2026 GadgetPe. All Rights Reserved.</span>
      </div>
    </footer>
  );
}

export function PartnerDashboardCompactFooter() {
  return (
    <footer className="gp-user-footer">
      <div className="gp-wrap gp-user-footer-grid">
        <div className="gp-user-footer-column gp-user-footer-contact">
          <h3>Contact</h3>
          <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer"><PhoneCall size={16} /><span>+91 93111 25745</span></a>
          <a href="mailto:support@gadgetpe.com"><Mail size={16} /><span>support@gadgetpe.com</span></a>
        </div>
      </div>
      <div className="gp-wrap gp-user-footer-bottom">
        <span>© 2026 GadgetPe. All rights reserved.</span>
      </div>
    </footer>
  );
}

export function SupportFab() {
  return (
    <a
      href={SUPPORT_WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="gp-support-fab"
      aria-label="Support on WhatsApp"
    >
      <PhoneCall size={16} />
      <span>Support</span>
    </a>
  );
}
