import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { TimeWarpLogo } from "@/components/brand/TimeWarpLogo";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-slate-200">
      <div className="w-full px-4 sm:px-6 lg:px-8 bg-[#FAFBFF]">
        <div className="flex h-16 items-center justify-between bg-[#FAFBFF]">
          <Link to="/" className="flex items-center">
            <TimeWarpLogo size={32} />
          </Link>

          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/auth">Log in</Link>
            </Button>
            <Link to="/auth?mode=signup" className="rounded-full bg-gradient-to-r from-[#2b7de9] to-[#59b3ff] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
              Start Free
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
