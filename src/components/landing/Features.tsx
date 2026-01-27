import { 
  Mail, 
  FileText, 
  MessageSquare, 
  Shield, 
  Zap, 
  Brain 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Mail,
    title: "Email Intelligence",
    description: "Connect Gmail or Outlook. AI reads, analyzes, and can draft or send responses on your behalf.",
    color: "bg-red-100 text-red-600",
  },
  {
    icon: FileText,
    title: "Document Analysis",
    description: "Connect Google Drive. Ask questions about your Docs and Sheets—get instant insights.",
    color: "bg-green-100 text-green-600",
  },
  {
    icon: MessageSquare,
    title: "Natural Chat Interface",
    description: "Talk to your data like you'd talk to an assistant. No complex queries needed.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: Shield,
    title: "Action Approval",
    description: "AI suggests actions, but you stay in control. Preview and approve before anything happens.",
    color: "bg-purple-100 text-purple-600",
  },
  {
    icon: Zap,
    title: "Real-Time Sync",
    description: "Your data stays current. AI automatically indexes new emails and documents.",
    color: "bg-yellow-100 text-yellow-600",
  },
  {
    icon: Brain,
    title: "Context-Aware AI",
    description: "AI understands your business context across all connected tools for smarter insights.",
    color: "bg-pink-100 text-pink-600",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 lg:py-32 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Everything You Need to Run Smarter
          </h2>
          <p className="text-lg text-muted-foreground">
            Connect your tools, ask questions, and let AI CEO become your most valuable team member.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={feature.title} 
              className="border-border/50 hover:border-accent/30 transition-all duration-300 hover:shadow-lg group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6">
                <div className={`h-12 w-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
