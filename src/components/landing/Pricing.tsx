import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Aristotle",
    price: "$29",
    period: "/month",
    description: "For growing businesses scaling operations",
    features: [
      "Unlimited team members",
      "10GB connected data",
      "1,000 Actions/month",
      "3 Businesses",
      "10 Employees",
      "Developer Line",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Co Founder",
    price: "$20",
    period: "/month",
    description: "For early-stage founders getting started",
    features: [
      "Unlimited team members",
      "5GB connected data",
      "100 Actions/month",
      "10 Businesses",
      "3 Employees",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "TimeWarp OG",
    price: "$499",
    period: " / 3 months",
    description: "Unlimited power for serious operators",
    features: [
      "Unlimited everything",
      "Unlimited Actions",
      "Unlimited Employees",
      "Unlimited Businesses",
      "Developer Line",
      "Priority Support",
    ],
    cta: "Become an OG",
    popular: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 lg:py-32 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            Start free, upgrade when you're ready. All plans include a 14-day free trial.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative border-2 ${
                plan.popular 
                  ? "border-accent shadow-xl scale-105 z-10" 
                  : "border-border/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="gradient-accent text-accent-foreground px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-accent" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <Link to={plan.cta === "Contact Sales" ? "/contact" : "/auth?mode=signup"}>
                    {plan.cta}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
