import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="py-20 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl gradient-primary p-8 sm:p-12 lg:p-16">
          {/* Background decorations */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary-foreground/5 rounded-full blur-3xl" />
          </div>

          <div className="max-w-3xl mx-auto text-center text-primary-foreground">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Ready to Meet Your AI Executive Assistant?
            </h2>
            <p className="text-lg sm:text-xl opacity-90 mb-8">
              Join thousands of business owners who are saving hours every week 
              with AI CEO. Start your 14-day free trial today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary" 
                asChild 
                className="text-base"
              >
                <Link to="/auth?mode=signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="ghost" 
                asChild 
                className="text-base text-primary-foreground hover:text-primary-foreground hover:bg-white/10"
              >
                <Link to="/">AI-CEO</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
