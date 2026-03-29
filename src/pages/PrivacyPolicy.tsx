export default function PrivacyPolicy() {
  return (
    <div className="min-h-[1300px] bg-background text-foreground">
      <div className="max-w-[1900px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground text-[15px] leading-relaxed">
          <div className="space-y-1 mb-8 text-sm">
            <p><strong className="text-foreground">Effective Date:</strong> March 29, 2026</p>
            <p><strong className="text-foreground">Company:</strong> Vincent Ackermann ("Timewarp", "we", "our", "us")</p>
            <p><strong className="text-foreground">Organization Number:</strong> 081003</p>
            <p><strong className="text-foreground">Registered Address:</strong> Lillvägen 4, 182 49 Stockholm, Sweden</p>
            <p><strong className="text-foreground">Contact Email:</strong> <a href="mailto:vincentackermann@timewarpdev.com" className="text-primary underline">vincentackermann@timewarpdev.com</a></p>
          </div>

          <h2 className="text-xl font-semibold text-foreground mt-8">1. About This Policy</h2>
          <p>Timewarp ("AI CEO") is an AI-powered business assistant designed to help users optimize and automate their business operations. This Privacy Policy explains how we collect, use, store, and protect your personal data when you use our services.</p>
          <p>By using Timewarp, you consent to the practices described in this policy.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8">2. Information We Collect</h2>

          <h3 className="text-lg font-semibold text-foreground mt-6">2.1 From Google (via OAuth)</h3>
          <p>If you choose to connect your Google account, we may access:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Your Google account email</li>
            <li>Your name and basic profile information</li>
            <li>Your Google account ID</li>
          </ul>
          <p>This data is used solely for authentication, personalization, and account identification.</p>

          <h3 className="text-lg font-semibold text-foreground mt-6">2.2 From URLs You Provide</h3>
          <p>When you submit your company URL, we may retrieve publicly available information related to your company.</p>
          <p>We do <strong className="text-foreground">not</strong> access:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Internal systems</li>
            <li>Private databases</li>
            <li>Non-public or unauthorized sources</li>
          </ul>
          <p>Only publicly accessible information is processed.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8">3. How We Use Your Information</h2>
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

          <h2 className="text-xl font-semibold text-foreground mt-8">4. How We Store and Protect Your Data</h2>
          <p>We take data security seriously. Timewarp uses:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Encrypted communication (HTTPS/TLS)</li>
            <li>Secure cloud infrastructure</li>
            <li>Access controls and authentication</li>
            <li>Data minimization and least-access principles</li>
          </ul>

          <h3 className="text-lg font-semibold text-foreground mt-6">Third-Party Services We Use</h3>
          <p>Your data may pass through or be stored by trusted third-party providers:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Google OAuth</strong> – authentication and account security</li>
            <li><strong className="text-foreground">Supabase</strong> – database, authentication, and analytics logging</li>
            <li><strong className="text-foreground">Google Gemini API</strong> – AI-generated decision-making</li>
            <li><strong className="text-foreground">Microsoft</strong> – data processing integrations for "AI brain"</li>
            <li><strong className="text-foreground">Stripe (planned)</strong> – future payment processing</li>
          </ul>
          <p>Each service is bound by contractual and legal privacy obligations.</p>

          <h3 className="text-lg font-semibold text-foreground mt-6">4.1 Temporary Processing</h3>
          <p>Most information is processed temporarily and is not stored permanently unless necessary for a feature you explicitly activate.</p>

          <h3 className="text-lg font-semibold text-foreground mt-6">4.2 No Unauthorized Sharing</h3>
          <p>We do not share your data with:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Advertisers</li>
            <li>Data brokers</li>
            <li>Third-party marketers</li>
          </ul>
          <p>We only share data with essential service providers and only under strict confidentiality and data protection requirements.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8">5. Data Retention and Deletion</h2>
          <p>We retain your data only as long as necessary to provide the Service or to comply with legal obligations.</p>
          <p>You may request deletion of:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Your account</li>
            <li>All stored data</li>
            <li>All analysis outputs</li>
          </ul>
          <p>To delete your data, contact: <a href="mailto:vincentackermann@timewarpdev.com" className="text-primary underline">vincentackermann@timewarpdev.com</a></p>
          <p>You may also revoke Google access anytime at: <a href="https://myaccount.google.com/permissions" className="text-primary underline" target="_blank" rel="noopener noreferrer">myaccount.google.com/permissions</a></p>

          <h2 className="text-xl font-semibold text-foreground mt-8">6. User Control and Consent</h2>
          <p>You remain in full control of your data at all times:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>You choose which URLs or files to analyze</li>
            <li>You choose which integrations to connect</li>
            <li>You can disconnect services at any time</li>
            <li>You can request data deletion at any time</li>
          </ul>
          <p>We never access data or accounts without your explicit consent.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8">7. Children's Privacy</h2>
          <p>Timewarp is not intended for individuals under the age of 18. We do not knowingly collect personal data from minors.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8">8. International Data Transfers</h2>
          <p>Your data may be processed in the EU or other regions where our service providers operate. All transfers are performed in compliance with GDPR, including Standard Contractual Clauses (SCCs) where required.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8">9. Changes to This Policy</h2>
          <p>We may update this Privacy Policy to reflect changes in our practices or legal requirements. Updated policies will be posted on this page with a new effective date.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8">10. Contact Us</h2>
          <p>For questions, requests, or concerns related to privacy or data protection, contact:</p>
          <div className="space-y-1">
            <p><strong className="text-foreground">Vincent Ackermann</strong></p>
            <p>Email: <a href="mailto:vincentackermann@timewarpdev.com" className="text-primary underline">vincentackermann@timewarpdev.com</a></p>
            <p>Address: Lillvägen 4, 182 49 Stockholm, Sweden</p>
          </div>
        </div>
      </div>
    </div>
  );
}
