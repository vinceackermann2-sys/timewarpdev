import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Mail, FileSpreadsheet, MessageSquare } from "lucide-react";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left column - Text content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border text-sm font-medium">
              <Bot className="h-4 w-4 text-accent" />
              <span>Your AI-Powered Executive Assistant</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              Connect Your Digital Life.{" "}
              <span className="text-gradient">Let AI Handle the Rest.</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-lg">
              AI CEO connects to your emails, documents, and business tools. Ask questions, 
              get insights, and let AI take actions on your behalf—all from one intelligent chat interface.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild className="text-base">
                <Link to="/auth?mode=signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base">
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </div>

            <div className="flex items-center gap-6 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold">14 days</div>
                <div className="text-sm text-muted-foreground">Free trial</div>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-center">
                <div className="text-2xl font-bold">No CC</div>
                <div className="text-sm text-muted-foreground">Required</div>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-center">
                <div className="text-2xl font-bold">100%</div>
                <div className="text-sm text-muted-foreground">Private</div>
              </div>
            </div>
          </div>

          {/* Right column - Visual */}
          <div className="relative">
            <div className="relative bg-card border border-border rounded-2xl shadow-elegant p-6 animate-fade-in">
              {/* Mock chat interface */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="font-semibold">AI CEO</div>
                    <div className="text-sm text-muted-foreground">Your Executive Assistant</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 max-w-[80%]">
                      Who hasn't responded to my proposals this week?
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3 max-w-[80%]">
                      <p className="text-sm">I found 3 pending responses:</p>
                      <ul className="text-sm mt-2 space-y-1">
                        <li>• John Smith - Q1 Budget Proposal</li>
                        <li>• Sarah Johnson - Marketing Partnership</li>
                        <li>• Mike Chen - Tech Stack Upgrade</li>
                      </ul>
                      <p className="text-sm text-accent mt-2 font-medium">Would you like me to draft follow-ups?</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating cards */}
            <div className="absolute -left-4 top-20 animate-float" style={{ animationDelay: "0s" }}>
              <div className="bg-card border border-border rounded-xl p-3 shadow-md flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-red-600" />
                </div>
                <span className="text-sm font-medium">Gmail Connected</span>
              </div>
            </div>

            <div className="absolute -right-4 top-40 animate-float" style={{ animationDelay: "0.5s" }}>
              <div className="bg-card border border-border rounded-xl p-3 shadow-md flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm font-medium">Sheets Synced</span>
              </div>
            </div>

            <div className="absolute -left-2 bottom-10 animate-float" style={{ animationDelay: "1s" }}>
              <div className="bg-card border border-border rounded-xl p-3 shadow-md flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium">AI Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
