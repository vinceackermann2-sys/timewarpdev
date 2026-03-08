export default function PrivacyPolicy() {
  return (
    <div className="min-h-[1300px] bg-background text-foreground">
      <div className="max-w-[1900px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground text-[15px] leading-relaxed">
          <div className="space-y-1 mb-8 text-sm">
            <p><strong className="text-foreground">Effective Date:</strong> February 10, 2026</p>
            <p><strong className="text-foreground">Company:</strong> Vincent Ackermann ("Timewarp", "we", "our", "us")</p>
            <p><strong className="text-foreground">Organization Number:</strong> 081003</p>
            <p><strong className="text-foreground">Registered Address:</strong> Lillvägen 4, 182 49 Stockholm, Sweden</p>
            <p><strong className="text-foreground">Contact Email:</strong> <a href="mailto:vincentackermann@timewarpdev.com" className="text-primary underline">vincentackermann@timewarpdev.com</a></p>
          </div>

          <h2 className="text-xl font-semibold text-foreground mt-8">1. Introduction</h2>
          <p>Timewarp ("AI CEO") is an AI‑powered business analysis platform that helps users understand, organize, and optimize their business operations by analyzing data stored in their Google Workspace account. This Privacy Policy explains how we collect, use, store, and protect your information when you use our services.</p>
          <p>By using Timewarp, you consent to the practices described in this Privacy Policy.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8">2. Information We Collect</h2>
          <p>We collect the following categories of information when you connect your Google account:</p>

          <h3 className="text-lg font-semibold text-foreground mt-6">2.1 Google Account Information</h3>
          <p>Through Google OAuth, we may access:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Your Google account email</li>
            <li>Your name and profile information</li>
            <li>Your Google account ID</li>
          </ul>
          <p>These are used solely for authentication, personalization, and account identification.</p>

          <h3 className="text-lg font-semibold text-foreground mt-6">2.2 Google Drive Data (Limited Access)</h3>
          <p>With your permission, Timewarp may access files you explicitly select or create through the app using the scope:</p>
          <p className="font-mono text-sm text-foreground/80">https://www.googleapis.com/auth/drive.file</p>
          <p>This allows the AI CEO to analyze:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Documents</li>
            <li>Spreadsheets</li>
            <li>Presentations</li>
            <li>PDFs</li>
            <li>Images</li>
            <li>Videos</li>
            <li>Other business files you choose to use with the app</li>
          </ul>
          <p>We do <strong className="text-foreground">NOT</strong> access or read your entire Google Drive. We only access files you directly interact with through Timewarp.</p>

          <h3 className="text-lg font-semibold text-foreground mt-6">2.3 Gmail Data (Read‑Only)</h3>
          <p>If you grant permission, Timewarp may access:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Email metadata (labels, headers)</li>
            <li>Email content (read‑only)</li>
          </ul>
          <p>Using the scopes:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li className="font-mono text-sm text-foreground/80">https://www.googleapis.com/auth/gmail.readonly</li>
            <li className="font-mono text-sm text-foreground/80">https://www.googleapis.com/auth/gmail.metadata</li>
          </ul>
          <p>This allows the AI CEO to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Analyze communication patterns</li>
            <li>Summarize conversations</li>
            <li>Extract business insights</li>
          </ul>
          <p>We do <strong className="text-foreground">NOT</strong> send, delete, or modify your emails.</p>

          <h3 className="text-lg font-semibold text-foreground mt-6">2.4 Google Calendar Data</h3>
          <p>If you grant permission, Timewarp may access:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Your calendar list</li>
            <li>Event details</li>
            <li>Availability information</li>
          </ul>
          <p>Using scopes such as:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li className="font-mono text-sm text-foreground/80">https://www.googleapis.com/auth/calendar.events.readonly</li>
            <li className="font-mono text-sm text-foreground/80">https://www.googleapis.com/auth/calendar.calendarlist.readonly</li>
            <li className="font-mono text-sm text-foreground/80">https://www.googleapis.com/auth/calendar.events.freebusy</li>
          </ul>
          <p>This allows the AI CEO to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Analyze your schedule</li>
            <li>Identify meeting patterns</li>
            <li>Provide operational insights</li>
          </ul>
          <p>We do <strong className="text-foreground">NOT</strong> create, modify, or delete events unless you explicitly request it.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8">3. How We Use Your Information</h2>
          <p>Timewarp uses your data to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Analyze business operations</li>
            <li>Generate insights, summaries, and recommendations</li>
            <li>Provide personalized AI‑driven business analysis</li>
            <li>Improve the accuracy and performance of the AI CEO</li>
            <li>Authenticate your account and maintain security</li>
          </ul>
          <p>We do not use your data for advertising, profiling, or selling to third parties.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8">4. How We Store and Protect Your Data</h2>
          <p>We take data security seriously. Timewarp uses:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Encrypted communication (HTTPS/TLS)</li>
            <li>Secure cloud infrastructure</li>
            <li>Access controls and authentication</li>
            <li>Strict data minimization practices</li>
          </ul>

          <h3 className="text-lg font-semibold text-foreground mt-6">4.1 Temporary Processing</h3>
          <p>Most data is processed temporarily and is not stored permanently unless required for functionality you explicitly enable.</p>

          <h3 className="text-lg font-semibold text-foreground mt-6">4.2 No Unauthorized Sharing</h3>
          <p>We do not share your Google data with:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Advertisers</li>
            <li>Data brokers</li>
            <li>Third‑party marketers</li>
          </ul>
          <p>We only share data with service providers necessary to operate the platform (e.g., cloud hosting), and only under strict confidentiality agreements.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8">5. Data Retention and Deletion</h2>
          <p>We retain your data only as long as necessary to provide the service.</p>
          <p>You may request deletion of:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Your account</li>
            <li>All stored data</li>
            <li>All analysis outputs</li>
          </ul>
          <p>by contacting us at <a href="mailto:vincentackermann@timewarpdev.com" className="text-primary underline">vincentackermann@timewarpdev.com</a>.</p>
          <p>You may also revoke Google access at any time via: <a href="https://myaccount.google.com/permissions" className="text-primary underline" target="_blank" rel="noopener noreferrer">myaccount.google.com/permissions</a></p>

          <h2 className="text-xl font-semibold text-foreground mt-8">6. User Control and Consent</h2>
          <p>You remain in full control of your data:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>You choose which files to analyze</li>
            <li>You choose which Google services to connect</li>
            <li>You can disconnect at any time</li>
            <li>You can request deletion at any time</li>
          </ul>
          <p>We never access data without your explicit permission.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8">7. Children's Privacy</h2>
          <p>Timewarp is not intended for individuals under 18. We do not knowingly collect data from minors.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8">8. International Data Transfers</h2>
          <p>Your data may be processed in the EU or other regions where our service providers operate. All transfers comply with GDPR and applicable laws.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8">9. Changes to This Policy</h2>
          <p>We may update this Privacy Policy to reflect changes in our practices or legal requirements. Updates will be posted on this page with a new effective date.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8">10. Contact Us</h2>
          <p>For questions, concerns, or data requests, contact:</p>
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
