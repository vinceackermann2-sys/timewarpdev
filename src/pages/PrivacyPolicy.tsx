import { Link } from "react-router-dom";
import { WorkspaceFooter } from "@/components/database/WorkspaceFooter";
import { TimeWarpLogo } from "@/components/brand/TimeWarpLogo";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <TimeWarpLogo size={34} wordmarkClassName="text-lg" />
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to home
          </Link>
        </div>

        <article className="rounded-lg border border-border bg-card p-6 sm:p-10 shadow-sm">

        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">Effective March 29, 2026</p>

        <div className="space-y-8 text-sm sm:text-base text-foreground/90 leading-relaxed">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Company:</strong> Vincent Ackermann ("Timewarp", "we", "our", "us")</p>
            <p><strong className="text-foreground">Organization Number:</strong> 081003</p>
            <p><strong className="text-foreground">Registered Address:</strong> Lillvägen 4, 182 49 Stockholm, Sweden</p>
            <p><strong className="text-foreground">Contact Email:</strong> <a href="mailto:vincentackermann@timewarpdev.com" className="text-primary underline">vincentackermann@timewarpdev.com</a></p>
          </div>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. About This Policy</h2>
            <div className="text-muted-foreground space-y-2">
              <p>Timewarp ("AI CEO") is an AI-powered business assistant designed to help users optimize and automate their business operations. This Privacy Policy explains how we collect, use, store, and protect your personal data when you use our services.</p>
              <p>By using Timewarp, you consent to the practices described in this policy.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Information We Collect</h2>
            <div className="text-muted-foreground space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">2.1 From Google (via OAuth)</h3>
                <p>If you choose to connect your Google account, we may access:</p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>Your Google account email</li>
                  <li>Your name and basic profile information</li>
                  <li>Your Google account ID</li>
                </ul>
                <p className="mt-2">This data is used solely for authentication, personalization, and account identification.</p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">2.2 From URLs You Provide</h3>
                <p>When you submit your company URL, we may retrieve publicly available information related to your company.</p>
                <p className="mt-2">We do <strong className="text-foreground">not</strong> access:</p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>Internal systems</li>
                  <li>Private databases</li>
                  <li>Non-public or unauthorized sources</li>
                </ul>
                <p className="mt-2">Only publicly accessible information is processed.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
            <div className="text-muted-foreground space-y-2">
              <p>Timewarp processes your information to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Operate and maintain the platform</li>
                <li>Generate AI-driven insights, summaries, and recommendations</li>
                <li>Provide personalized business analysis</li>
                <li>Improve accuracy and performance of the AI CEO</li>
                <li>Authenticate users and ensure platform security</li>
              </ul>
              <p>We do <strong className="text-foreground">not</strong> use your information for:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Advertising</li>
                <li>Profiling unrelated to the service</li>
                <li>Selling data to third parties</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. How We Store and Protect Your Data</h2>
            <div className="text-muted-foreground space-y-3">
              <p>We take data security seriously. Timewarp uses:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Encrypted communication (HTTPS/TLS)</li>
                <li>Secure cloud infrastructure</li>
                <li>Access controls and authentication</li>
                <li>Data minimization and least-access principles</li>
              </ul>

              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">Third-Party Services We Use</h3>
                <p>Your data may pass through or be stored by trusted third-party providers:</p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li><strong className="text-foreground">Google OAuth</strong> – authentication and account security</li>
                  <li><strong className="text-foreground">Supabase</strong> – database, authentication, and analytics logging</li>
                  <li><strong className="text-foreground">Google Gemini API</strong> – AI-generated decision-making</li>
                  <li><strong className="text-foreground">Microsoft</strong> – data processing integrations for "AI brain"</li>
                  <li><strong className="text-foreground">Stripe (planned)</strong> – future payment processing</li>
                </ul>
                <p className="mt-2">Each service is bound by contractual and legal privacy obligations.</p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">4.1 Temporary Processing</h3>
                <p>Most information is processed temporarily and is not stored permanently unless necessary for a feature you explicitly activate.</p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">4.2 No Unauthorized Sharing</h3>
                <p>We do not share your data with:</p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>Advertisers</li>
                  <li>Data brokers</li>
                  <li>Third-party marketers</li>
                </ul>
                <p className="mt-2">We only share data with essential service providers and only under strict confidentiality and data protection requirements.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Retention and Deletion</h2>
            <div className="text-muted-foreground space-y-2">
              <p>We retain your data only as long as necessary to provide the Service or to comply with legal obligations.</p>
              <p>You may request deletion of:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Your account</li>
                <li>All stored data</li>
                <li>All analysis outputs</li>
              </ul>
              <p>To delete your data, contact: <a href="mailto:vincentackermann@timewarpdev.com" className="text-primary underline">vincentackermann@timewarpdev.com</a></p>
              <p>You may also revoke Google access anytime at: <a href="https://myaccount.google.com/permissions" className="text-primary underline" target="_blank" rel="noopener noreferrer">myaccount.google.com/permissions</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. User Control and Consent</h2>
            <div className="text-muted-foreground space-y-2">
              <p>You remain in full control of your data at all times:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>You choose which URLs or files to analyze</li>
                <li>You choose which integrations to connect</li>
                <li>You can disconnect services at any time</li>
                <li>You can request data deletion at any time</li>
              </ul>
              <p>We never access data or accounts without your explicit consent.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Children's Privacy</h2>
            <p className="text-muted-foreground">Timewarp is not intended for individuals under the age of 18. We do not knowingly collect personal data from minors.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. International Data Transfers</h2>
            <p className="text-muted-foreground">Your data may be processed in the EU or other regions where our service providers operate. All transfers are performed in compliance with GDPR, including Standard Contractual Clauses (SCCs) where required.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Changes to This Policy</h2>
            <p className="text-muted-foreground">We may update this Privacy Policy to reflect changes in our practices or legal requirements. Updated policies will be posted on this page with a new effective date.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Contact Us</h2>
            <div className="text-muted-foreground space-y-1">
              <p>For questions, requests, or concerns related to privacy or data protection, contact:</p>
              <p className="pt-2"><strong className="text-foreground">Vincent Ackermann</strong></p>
              <p>Email: <a href="mailto:vincentackermann@timewarpdev.com" className="text-primary underline">vincentackermann@timewarpdev.com</a></p>
              <p>Address: Lillvägen 4, 182 49 Stockholm, Sweden</p>
            </div>
          </section>
        </div>
        </article>
      </div>
      <WorkspaceFooter compact />
    </div>
  );
}
