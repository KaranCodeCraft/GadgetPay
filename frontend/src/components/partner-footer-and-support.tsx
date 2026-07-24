import { Coins, IndianRupee, ListChecks, Mail, MapPin, PackageCheck, PhoneCall, Send, ShieldCheck, Smartphone, Truck, UserRound } from "lucide-react";

const SUPPORT_WHATSAPP_URL = "https://wa.me/919311125745";

const footerQuickLinks = [
  { label: "Sell Phone", href: "/user#sell", icon: Smartphone },
  { label: "How It Works", href: "/user#how", icon: PackageCheck },
  { label: "Top Brands", href: "/user#top-brands", icon: ShieldCheck },
  { label: "FAQ", href: "/user#faq", icon: ListChecks },
];

const footerServiceLinks = [
  { label: "Free Pickup", href: "/user#how", icon: Truck },
  { label: "Instant Quote", href: "/user#sell", icon: IndianRupee },
  { label: "Seller Login", href: "/user/login", icon: UserRound },
  { label: "Partner Support", href: SUPPORT_WHATSAPP_URL, icon: Coins, external: true },
];

export function PartnerSharedFooter() {
  return (
    <footer className="gp-user-footer">
      <div className="gp-wrap gp-user-footer-grid">
        <div className="gp-user-footer-brand">
          <div className="gp-user-footer-logo">GadgetPe</div>
          <p>Sell phones and tablets with instant quotes, doorstep pickup, and fast payouts across supported pincodes.</p>
          <div className="gp-user-footer-social" aria-label="Contact shortcuts">
            <a href="/user#sell" aria-label="Message GadgetPe"><Send size={18} /></a>
            <a href="mailto:support@gadgetpe.com" aria-label="Email GadgetPe"><Mail size={18} /></a>
            <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp GadgetPe"><PhoneCall size={18} /></a>
          </div>
        </div>
        <div className="gp-user-footer-column">
          <h3>Quick Links</h3>
          {footerQuickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <a href={item.href} key={item.label}>
                <Icon size={16} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </div>
        <div className="gp-user-footer-column">
          <h3>Services</h3>
          {footerServiceLinks.map((item) => {
            const Icon = item.icon;
            return (
              <a
                href={item.href}
                key={item.label}
                {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </div>
        <div className="gp-user-footer-column gp-user-footer-contact">
          <h3>Contact</h3>
          <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer"><PhoneCall size={16} /><span>+91 93111 25745</span></a>
          <a href="mailto:support@gadgetpe.com"><Mail size={16} /><span>support@gadgetpe.com</span></a>
          <a href="/user#sell"><MapPin size={16} /><span>Serviceable pincodes across India</span></a>
        </div>
      </div>
      <div className="gp-wrap gp-user-footer-bottom">
        <span>© 2026 GadgetPe. All rights reserved.</span>
        <span>Privacy Policy · Terms · Support</span>
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
