import { Link } from "react-router-dom";
import { WorkspaceFooter } from "@/components/database/WorkspaceFooter";

type SubProcessor = {
  name: string;
  purpose: string;
  data: string;
  location: string;
  website: string;
};

const subProcessors: SubProcessor[] = [
  {
    name: "Supabase (Lovable Cloud)",
    purpose: "Database, authentication, file storage, and serverless functions",
    data: "Account data, business DNA, chat history, uploaded files",
    location: "EU / US",
    website: "https://supabase.com",
  },
  {
    name: "Google (Gemini API via Lovable AI Gateway)",
    purpose: "AI model inference for chat, analysis, and content generation",
    data: "Prompts, conversation context, uploaded files for analysis",
    location: "US / EU",
    website: "https://ai.google.dev",
  },
  {
    name: "OpenAI (via Lovable AI Gateway)",
    purpose: "AI model inference for selected reasoning tasks",
    data: "Prompts, conversation context",
    location: "US",
    website: "https://openai.com",
  },
  {
    name: "Browserbase",
    purpose: "Headless browser automation for AI agent web tasks",
    data: "URLs, agent task instructions, captured screenshots",
    location: "US",
    website: "https://browserbase.com",
  },
  {
    name: "Firecrawl",
    purpose: "Web scraping and content extraction for research and onboarding",
    data: "URLs submitted for analysis",
    location: "US",
    website: "https://firecrawl.dev",
  },
  {
    name: "Stripe",
    purpose: "Payment processing and subscription management",
    data: "Billing details, payment metadata, customer email",
    location: "US / EU",
    website: "https://stripe.com",
  },
  {
    name: "Resend",
    purpose: "Transactional email delivery (auth, invitations, receipts)",
    data: "Email address, message content",
    location: "US / EU",
    website: "https://resend.com",
  },
  {
    name: "Lovable",
    purpose: "Application hosting and deployment platform",
    data: "Application code, runtime logs",
    location: "EU",
    website: "https://lovable.dev",
  },
];

export default function SubProcessors() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <Link
          to="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block"
        >
          ← Back to home
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Sub-processors</h1>
        <p className="text-muted-foreground mb-10">
          The third-party services TimeWarp relies on to deliver its product, and the guidelines we
          apply when engaging them.
        </p>

        <div className="space-y-10 text-sm sm:text-base text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">What is a sub-processor?</h2>
            <p className="text-muted-foreground">
              A sub-processor is any third-party company that processes personal or business data on
              TimeWarp's behalf in order to provide part of the service — for example, hosting,
              database storage, AI model inference, payment processing, or email delivery. We remain
              responsible to you for everything our sub-processors do with your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Our guidelines</h2>
            <p className="text-muted-foreground mb-4">
              Before we engage a sub-processor, and on an ongoing basis, we apply the following
              guidelines:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
              <li>
                <span className="text-foreground font-medium">Necessity.</span> The sub-processor
                must perform a function that is essential to delivering the product, and we use the
                minimum data required for that function.
              </li>
              <li>
                <span className="text-foreground font-medium">Security.</span> The sub-processor
                must operate on industry-standard security controls (encryption in transit and at
                rest, access controls, audit logging) and ideally hold recognised certifications
                (e.g. SOC 2, ISO 27001).
              </li>
              <li>
                <span className="text-foreground font-medium">Data protection agreements.</span> A
                Data Processing Agreement (DPA) is in place with each sub-processor, including
                Standard Contractual Clauses where data is transferred outside the EEA.
              </li>
              <li>
                <span className="text-foreground font-medium">Purpose limitation.</span>{" "}
                Sub-processors may only use your data to provide their service to TimeWarp — never
                to train models on your data, profile you, or sell data to third parties.
              </li>
              <li>
                <span className="text-foreground font-medium">Geography.</span> We prefer providers
                with EU data residency where possible, and disclose the processing region for each
                sub-processor below.
              </li>
              <li>
                <span className="text-foreground font-medium">Transparency.</span> The list below is
                kept up to date. Material changes (new sub-processor, new category of data) are
                announced before they take effect.
              </li>
              <li>
                <span className="text-foreground font-medium">Right to object.</span> Customers on a
                paid plan may object to a new sub-processor on legitimate data-protection grounds by
                contacting us at{" "}
                <a
                  href="mailto:vincentackermann@timewarpdev.com"
                  className="text-primary underline hover:text-primary/80"
                >
                  vincentackermann@timewarpdev.com
                </a>
                .
              </li>
              <li>
                <span className="text-foreground font-medium">Off-boarding.</span> When a
                sub-processor is removed, data held on our behalf is deleted or returned in line
                with their contractual obligations.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Current sub-processors</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium text-foreground">Provider</th>
                    <th className="px-4 py-3 font-medium text-foreground">Purpose</th>
                    <th className="px-4 py-3 font-medium text-foreground">Data</th>
                    <th className="px-4 py-3 font-medium text-foreground">Region</th>
                  </tr>
                </thead>
                <tbody>
                  {subProcessors.map((sp) => (
                    <tr key={sp.name} className="border-t border-border align-top">
                      <td className="px-4 py-3">
                        <a
                          href={sp.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline hover:text-primary/80"
                        >
                          {sp.name}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{sp.purpose}</td>
                      <td className="px-4 py-3 text-muted-foreground">{sp.data}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {sp.location}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Updates to this list</h2>
            <p className="text-muted-foreground">
              We review this page whenever we add, remove, or change a sub-processor. Customers can
              subscribe to updates by emailing{" "}
              <a
                href="mailto:vincentackermann@timewarpdev.com"
                className="text-primary underline hover:text-primary/80"
              >
                vincentackermann@timewarpdev.com
              </a>{" "}
              with the subject "Subscribe: sub-processors".
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Questions</h2>
            <p className="text-muted-foreground">
              For questions about how we handle your data, see our{" "}
              <Link to="/privacy" className="text-primary underline hover:text-primary/80">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link to="/data-deletion" className="text-primary underline hover:text-primary/80">
                Data Deletion guide
              </Link>
              , or contact{" "}
              <a
                href="mailto:vincentackermann@timewarpdev.com"
                className="text-primary underline hover:text-primary/80"
              >
                vincentackermann@timewarpdev.com
              </a>
              .
            </p>
            <p className="text-muted-foreground mt-3 text-xs">
              Last updated: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </section>
        </div>
      </div>

      <WorkspaceFooter />
    </div>
  );
}
