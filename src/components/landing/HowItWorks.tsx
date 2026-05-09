import { UserPlus, Link2, MessageCircle, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Sign Up",
    description: "Create your account in seconds. No credit card required for your 14-day free trial.",
  },
  {
    icon: Link2,
    step: "02",
    title: "Connect Your Tools",
    description: "Link your Gmail, Outlook, Google Drive, and more with secure OAuth connections.",
  },
  {
    icon: MessageCircle,
    step: "03",
    title: "Chat with AI",
    description: "Ask questions about your business data. Get instant insights and actionable answers.",
  },
  {
    icon: CheckCircle,
    step: "04",
    title: "Approve Actions",
    description: "AI suggests emails, follow-ups, and more. Review and approve with one click.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Get Started in Minutes
          </h2>
          <p className="text-lg text-muted-foreground">
            From signup to AI-powered productivity in just four simple steps.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div 
              key={step.step} 
              className="relative"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-1/2 w-full h-0.5 bg-border" />
              )}
              
              <div className="relative text-center">
                <div className="inline-flex items-center justify-center h-24 w-24 rounded-2xl bg-secondary border border-border mb-6 relative z-10">
                  <step.icon className="h-10 w-10 text-accent" />
                  <span className="absolute -top-2 -right-2 h-8 w-8 rounded-full gradient-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {step.step}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
