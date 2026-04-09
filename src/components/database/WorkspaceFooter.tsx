import { Link } from "react-router-dom";
import futureCity from '@/assets/future-city.jpeg';

export function WorkspaceFooter() {
  return (
    <div className="w-full relative">
      <img src={futureCity} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 w-full mx-auto px-4 sm:px-6 py-8 sm:py-14" style={{ maxWidth: 1900 }}>
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm px-5 sm:px-12 py-8 sm:py-14">
          <div className="flex flex-col gap-8 sm:flex-row sm:gap-14">
            <div className="flex items-start gap-2 shrink-0">
              <img src="/favicon.png" alt="TimeWarp" className="h-10 w-10 rounded-md" />
              <span className="font-semibold text-xl text-white">TimeWarp</span>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-6 sm:gap-14 flex-1">
              <div className="space-y-2">
                <h4 className="font-semibold text-white" style={{ fontSize: 16 }}>Product</h4>
                <ul className="space-y-1.5">
                  <li><Link to="/pricing" className="text-white/60 hover:text-white transition-colors" style={{ fontSize: 14 }}>Pricing</Link></li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-white" style={{ fontSize: 16 }}>Resources</h4>
                <ul className="space-y-1.5">
                  <li><Link to="/support" className="text-white/60 hover:text-white transition-colors" style={{ fontSize: 14 }}>Support</Link></li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-white" style={{ fontSize: 16 }}>Legal</h4>
                <ul className="space-y-1.5">
                  <li><Link to="/terms" className="text-white/60 hover:text-white transition-colors" style={{ fontSize: 14 }}>Terms of Service</Link></li>
                  <li><Link to="/privacy" className="text-white/60 hover:text-white transition-colors" style={{ fontSize: 14 }}>Privacy Policy</Link></li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-white" style={{ fontSize: 16 }}>Community</h4>
                <ul className="space-y-1.5">
                  <li><a href="https://discord.gg" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors" style={{ fontSize: 14 }}>Discord</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-10 pt-5 border-t border-white/10">
            <p className="text-white/60 text-center sm:text-left" style={{ fontSize: 14 }}>© 2026 Vincent Ackermann, All rights reserved</p>
            <p className="text-white/60" style={{ fontSize: 14 }}>🇸🇪 Made in Sweden</p>
          </div>
        </div>
      </div>
    </div>
  );
}
