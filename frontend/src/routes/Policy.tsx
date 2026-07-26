import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/Policy")({
  component: PolicyPage,
});

function PolicyPage() {
  const navigate = useNavigate();

  const handleClose = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }

    void navigate({ to: "/user" });
  };

  return (
    <main className="gp-policy-page">
      <div className="gp-policy-shell">
        <article className="gp-policy-card">
          <h1>TERMS &amp; CONDITIONS</h1>
          <p className="gp-policy-meta">GadgetPe</p>
          <p className="gp-policy-meta">Effective Date: 26th July 2026</p>

          <p>
            Welcome to GadgetPe, a platform owned and operated by GadgetPe Private Limited, a company incorporated
            under the laws of India ("Company", "we", "our", "us"). These Terms &amp; Conditions ("Terms") govern your
            access to and use of the GadgetPe website, mobile applications, and all related services (collectively,
            the "Platform"). By accessing or using the Platform, you agree to be bound by these Terms. If you do not
            agree, please do not use the Platform.
          </p>

          <p>
            These Terms are structured as (a) the main body of clauses below, and (b) the Schedules annexed at the
            end, which set out operational details referred to in the main body. The Schedules form an integral part
            of these Terms and are to be read together with the main body. In the event of any conflict between the
            main body and a Schedule, the main body shall prevail unless the relevant clause expressly states
            otherwise.
          </p>

          <h2>1. Definitions</h2>
          <h3>Customer</h3>
          <p>A person selling a used electronic device through the Platform.</p>
          <h3>Partner</h3>
          <p>An independent buyer registered with GadgetPe to purchase used devices.</p>
          <h3>Device</h3>
          <p>
            Includes smartphones, tablets, iPads, and other supported electronic devices accepted on the Platform, as
            further described in Schedule I.
          </p>
          <h3>Platform</h3>
          <p>The GadgetPe website, mobile application, and related services operated by the Company.</p>
          <h3>Schedule</h3>
          <p>Any of the schedules annexed to these Terms, forming an integral part hereof.</p>

          <h2>2. Eligibility</h2>
          <p>To use the Platform, you must:</p>
          <ul>
            <li>be at least 18 years of age;</li>
            <li>legally own the Device you wish to sell;</li>
            <li>have full authority to sell the Device;</li>
            <li>provide accurate, current, and complete information.</li>
          </ul>

          <h2>3. Platform Role</h2>
          <p>
            GadgetPe provides a technology platform that connects Customers with registered Partners for the sale and
            purchase of used Devices. GadgetPe acts solely as an intermediary and is not a party to any transaction
            between Customers and Partners. Unless expressly stated otherwise for a specific transaction:
          </p>
          <ul>
            <li>GadgetPe is not the seller of the Device;</li>
            <li>GadgetPe is not the purchaser of the Device;</li>
            <li>
              GadgetPe is not responsible for the subsequent resale, refurbishment, or use of any Device by a Partner.
            </li>
          </ul>
          <p>
            Device ownership transfers directly between the Customer and the purchasing Partner at the time of pickup,
            unless GadgetPe expressly agrees to act as purchaser for that transaction.
          </p>

          <h2>4. Device Ownership and Warranties</h2>
          <p>By listing a Device on the Platform, the Customer represents and warrants that:</p>
          <ul>
            <li>they are the lawful owner of the Device;</li>
            <li>the Device is not stolen and is free from any legal dispute or claim;</li>
            <li>no finance, loan, or EMI amount remains unpaid on the Device unless expressly disclosed;</li>
            <li>
              Find My iPhone, Google Factory Reset Protection (FRP), and similar activation locks will be removed prior
              to handover.
            </li>
          </ul>
          <p>
            Customers remain personally liable if any ownership information provided is false, misleading, or
            incomplete. Device inspection and grading parameters are set out in Schedule I, and the Right to Reject is
            set out in Clause 5 below.
          </p>

          <h2>5. Right to Reject</h2>
          <p>A Partner or GadgetPe may refuse to proceed with a transaction where:</p>
          <ul>
            <li>the IMEI number appears tampered or mismatched;</li>
            <li>the Device is suspected to be counterfeit;</li>
            <li>supporting documents appear suspicious or falsified;</li>
            <li>activation locks remain enabled at the time of pickup;</li>
            <li>the Device is suspected to be stolen property;</li>
            <li>the Customer refuses to cooperate with verification requirements under Schedule I.</li>
          </ul>

          <h2>6. Customer Responsibilities</h2>
          <p>By using the Platform, Customers agree that:</p>
          <ul>
            <li>all information provided is accurate and complete;</li>
            <li>photographs submitted are genuine and represent the actual Device;</li>
            <li>identity documents submitted belong to them;</li>
            <li>they will cooperate fully during the inspection process described in Schedule I;</li>
            <li>Device data has been backed up prior to handover;</li>
            <li>the Device has been factory reset prior to handover.</li>
          </ul>

          <h2>7. Data Responsibility</h2>
          <p>
            Customers are solely responsible for backing up their data, deleting personal information, and removing SIM
            cards and memory cards from the Device prior to sale. GadgetPe disclaims all liability for any loss,
            theft, or unauthorized access to Customer data arising from a Customer&apos;s failure to properly erase data
            from the Device. GadgetPe does not access, store, or process data contained on Devices and is not
            responsible for any loss of data arising from a Customer&apos;s failure to do so.
          </p>

          <h2>8. Partner Responsibilities</h2>
          <p>Registered Partners agree to:</p>
          <ul>
            <li>maintain professional conduct at all times;</li>
            <li>comply with GadgetPe&apos;s policies and processes;</li>
            <li>make payments to Customers honestly and promptly, using the methods set out in Schedule III;</li>
            <li>verify Customer identity where required;</li>
            <li>comply with all applicable laws and regulations.</li>
          </ul>

          <h2>9. Cancellation</h2>
          <p>
            Either party may cancel a scheduled transaction at any time prior to pickup. Repeated or abusive
            cancellations may result in suspension of the relevant account.
          </p>

          <h2>10. Fraud Prevention</h2>
          <p>
            GadgetPe reserves the right to suspend accounts, reject transactions, report suspected fraud to the
            appropriate authorities, and cooperate with law enforcement agencies as necessary. Activities constituting
            a breach of this clause are further described in Schedule IV.
          </p>
          <p>
            GadgetPe maintains sole discretion over all fraud prevention measures and is not required to disclose its
            fraud detection methodologies to Users. Any User determined by GadgetPe to have engaged in fraudulent or
            suspicious activity shall forfeit any pending payments and may be permanently banned from the Platform.
            GadgetPe may share information regarding suspected fraud with other platforms, industry associations, and
            law enforcement without notice to the User.
          </p>

          <h2>11. Intellectual Property</h2>
          <p>
            The Platform&apos;s logo, trademarks, trade names, website, software, source code, graphics, user interface,
            and all content belong exclusively to GadgetPe or its licensors and are protected by applicable
            intellectual property laws. No material from the Platform may be copied, reproduced, modified,
            distributed, republished, downloaded, displayed, posted, transmitted, or used in any form without
            GadgetPe&apos;s prior written permission. Unauthorized use may result in civil and criminal penalties.
          </p>

          <h2>12. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by applicable law, GadgetPe shall not be liable for any indirect,
            incidental, or consequential damages, including loss of profits, loss of data, business interruption, or
            disputes between Customers and Partners arising from a transaction facilitated through the Platform.
            GadgetPe&apos;s total aggregate liability under these Terms shall not exceed the fees actually received by
            GadgetPe from the relevant transaction, or INR 5,000, whichever is lower.
          </p>

          <h2>13. Indemnity</h2>
          <p>
            Users agree to indemnify, defend, and hold GadgetPe, its directors, officers, employees, agents, and
            affiliates harmless against any and all claims, losses, damages, or liabilities, costs, and expenses
            (including reasonable legal fees) arising from or related to: (a) false ownership claims or
            misrepresentations; (b) sale of illegal, stolen, counterfeit, or encumbered Devices; (c) fraud or
            attempted fraud; (d) misuse of the Platform; (e) breach of these Terms; (f) violation of any applicable
            law or regulation; or (g) any dispute between a Customer and a Partner. This indemnity shall survive
            termination of the User&apos;s account.
          </p>

          <h2>14. Privacy</h2>
          <p>Your use of the Platform is also governed by our Privacy Policy, which forms part of these Terms by reference.</p>
          <p>
            GadgetPe may collect, process, and share User data with Partners, service providers, and law enforcement
            agencies as necessary to facilitate transactions, prevent fraud, comply with legal obligations, and
            improve Platform services. By using the Platform, Users consent to such collection, processing, and
            sharing of their data in accordance with GadgetPe&apos;s Privacy Policy and applicable law.
          </p>

          <h2>15. Suspension and Termination</h2>
          <p>
            GadgetPe may, in its sole discretion, suspend, restrict, or terminate any account, without prior notice,
            for violation or suspected violation of these Terms, including the Prohibited Activities set out in
            Schedule IV, or for any conduct that GadgetPe reasonably believes may expose it to liability or
            reputational harm. GadgetPe shall not be liable for any loss or damage arising from such suspension or
            termination.
          </p>

          <h2>16. Force Majeure</h2>
          <p>
            GadgetPe shall not be liable for any delay or failure to perform its obligations resulting from events
            beyond its reasonable control, including but not limited to natural disasters, acts of God, internet or
            network outages, telecommunications failures, power outages, government actions or orders, civil unrest,
            war, terrorism, pandemics, epidemics, strikes, labor disputes, or any other cause beyond GadgetPe&apos;s
            reasonable control. During any such event, GadgetPe&apos;s obligations shall be suspended without liability.
          </p>
          <p>
            The Platform is provided on an "as is" and "as available" basis. GadgetPe makes no warranties or
            representations, express or implied, including but not limited to warranties of merchantability, fitness
            for a particular purpose, title, non-infringement, accuracy, reliability, or availability. GadgetPe does
            not warrant that the Platform will be uninterrupted, error-free, secure, or free of viruses or other
            harmful components. Users assume all risk associated with use of the Platform.
          </p>

          <h2>17. Governing Law and Jurisdiction</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of India. The courts having
            jurisdiction at New Delhi, India shall have exclusive jurisdiction over any disputes arising out of or in
            connection with these Terms.
          </p>
          <p>
            Any dispute, controversy, or claim arising out of or relating to these Terms, or the breach, termination,
            or validity thereof, shall first be subject to good faith negotiation between the parties for a period of
            thirty (30) days. If the dispute is not resolved through negotiation, it shall be referred to and finally
            resolved by arbitration in accordance with the Arbitration and Conciliation Act, 1996, as amended. The
            arbitration shall be conducted by a sole arbitrator mutually appointed by the parties, or failing
            agreement, appointed in accordance with the Act. The seat of arbitration shall be New Delhi, India. The
            language of arbitration shall be English. The arbitral award shall be final and binding on the parties.
            Nothing in this clause shall prevent GadgetPe from seeking interim or injunctive relief from any court of
            competent jurisdiction.
          </p>

          <h2>18. Grievance Redressal</h2>
          <p>
            In accordance with the Information Technology Act, 2000 and the rules made thereunder, any grievances or
            complaints regarding the Platform may be addressed to our Grievance Officer, whose details are set out in
            Schedule V. We aim to acknowledge grievances within 24 hours and resolve them within the timeline
            prescribed under applicable law.
          </p>

          <h2>19. Amendment of Terms and Schedules</h2>
          <p>
            GadgetPe may update or modify these Terms, including any Schedule, at any time in its sole discretion.
            Amendments shall take effect immediately upon posting to the Platform. It is the responsibility of Users to
            review these Terms periodically. Continued use of the Platform following any amendment constitutes
            acceptance of the revised Terms. If a User does not agree to any amendment, their sole remedy is to
            discontinue use of the Platform and close their account.
          </p>

          <h2>20. Schedules</h2>
          <p>The following Schedules are annexed to, and form an integral part of, these Terms:</p>
          <ul>
            <li>Schedule I — Device Categories and Inspection Parameters</li>
            <li>Schedule II — Pricing Policy</li>
            <li>Schedule III — Payment Methods</li>
            <li>Schedule IV — Prohibited Activities</li>
            <li>Schedule V — Grievance Officer Details</li>
            <li>Schedule VI — Company Contact Details</li>
          </ul>

          <h2>21. Contact Information</h2>
          <p>GadgetPe Private Limited</p>
          <p>Website: www.gadgetpe.com</p>
          <p>Email: support@gadgetpe.com</p>
          <p>WhatsApp: +91 93111 25745</p>

          <h2>SCHEDULES</h2>

          <h2>SCHEDULE I</h2>
          <p>Device Categories and Inspection Parameters</p>
          <p>(Referred to in Clauses 1, 4, 5, and 6)</p>
          <p>
            Supported Device categories: smartphones, tablets, and iPads, and such other electronic devices as
            GadgetPe may accept from time to time.
          </p>
          <p>The final purchase price is determined after physical inspection and depends on the following parameters:</p>
          <ul>
            <li>physical condition;</li>
            <li>functional testing;</li>
            <li>IMEI verification;</li>
            <li>included accessories;</li>
            <li>battery health;</li>
            <li>originality of parts;</li>
            <li>status of activation locks (including Find My iPhone and Google FRP).</li>
          </ul>
          <p>
            Prices quoted prior to inspection are estimates only and are not binding on GadgetPe or the Partner. The
            final price may increase or decrease based on the outcome of inspection, and Users acknowledge that price
            adjustments are at the sole discretion of the inspecting party. GadgetPe shall not be liable for any
            difference between the estimated and final price.
          </p>

          <h2>SCHEDULE II</h2>
          <p>Pricing Policy</p>
          <p>(Referred to in Clause 4)</p>
          <p>
            Prices displayed on the Platform are indicative only, may change without notice, and are subject to
            confirmation upon physical inspection in accordance with Schedule I. No price is guaranteed until the
            inspection and transaction are complete. GadgetPe reserves the right to modify pricing algorithms,
            methodologies, and displayed prices at any time without notice or liability.
          </p>

          <h2>SCHEDULE III</h2>
          <p>Payment Methods</p>
          <p>(Referred to in Clause 8)</p>
          <p>
            Payment is ordinarily made following successful verification and completion of the transaction. Accepted
            payment methods include:
          </p>
          <ul>
            <li>UPI;</li>
            <li>Bank transfer;</li>
            <li>Other methods approved by GadgetPe from time to time.</li>
          </ul>
          <p>Cash payments are discouraged and permitted only where specifically authorised by GadgetPe.</p>

          <h2>SCHEDULE IV</h2>
          <p>Prohibited Activities</p>
          <p>(Referred to in Clauses 10 and 15)</p>
          <p>Users shall not:</p>
          <ul>
            <li>sell or attempt to sell stolen Devices;</li>
            <li>submit fake or tampered IMEI numbers;</li>
            <li>impersonate any other person or entity;</li>
            <li>upload malware or malicious content to the Platform;</li>
            <li>abuse or harass GadgetPe staff or representatives;</li>
            <li>manipulate or attempt to manipulate pricing on the Platform.</li>
          </ul>

          <h2>SCHEDULE V</h2>
          <p>Grievance Officer Details</p>
          <p>(Referred to in Clause 18)</p>
          <p>Name: [Grievance Officer Name]</p>
          <p>Email: [grievance@gadgetpe.com]</p>
          <p>Address: [Registered Office Address]</p>

          <h2>SCHEDULE VI</h2>
          <p>Company Contact Details</p>
          <p>(Referred to in Clause 21)</p>
          <p>Legal Name: GadgetPe Private Limited</p>
          <p>Trading Name: GadgetPe</p>
          <p>Registered Office: [Registered Office Address]</p>
          <p>CIN: [Corporate Identification Number]</p>
          <p>Website: www.gadgetpe.com</p>
          <p>Email: support@gadgetpe.com</p>
          <p>WhatsApp: +91 93111 25745</p>

          <p>
            If any provision of these Terms is held to be invalid, illegal, or unenforceable by a court or tribunal of
            competent jurisdiction, such provision shall be severed from these Terms and the remaining provisions
            shall continue in full force and effect. The invalid provision shall be modified to the minimum extent
            necessary to make it valid and enforceable while preserving the parties&apos; original intent.
          </p>

          <p>
            These Terms, together with the Privacy Policy and all Schedules, constitute the entire agreement between
            GadgetPe and Users regarding use of the Platform and supersede all prior or contemporaneous
            communications, proposals, and agreements, whether oral or written. No waiver of any provision of these
            Terms shall be effective unless in writing and signed by GadgetPe. GadgetPe&apos;s failure to enforce any
            right or provision shall not constitute a waiver of such right or provision.
          </p>

          <button type="button" className="gp-policy-close" onClick={handleClose}>Close</button>
        </article>
      </div>
    </main>
  );
}