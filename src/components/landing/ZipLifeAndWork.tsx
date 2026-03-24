import { Menu, Search, HelpCircle, Settings, Grid, Pencil, Inbox, Star, Clock, Send, File, ChevronDown, Square, RefreshCw, MoreVertical, Calendar, CheckSquare, Plus, Brain, Bell } from "lucide-react";

export default function ZipLifeAndWork() {
  return (
    <section className="py-24 lg:py-32 bg-background relative z-10 flex justify-center items-center">
      <div className="max-w-6xl w-full mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
        {/* Left Card */}
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground font-medium text-sm text-center md:text-left uppercase tracking-wider">
            WHEN YOU'RE ENJOYING LIFE
          </p>
          <div className="rounded-xl p-1.5 bg-foreground shadow-xl aspect-[3/4] md:aspect-[4/5] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1544367567-0f2fcb046ebf?q=80&w=1000&auto=format&fit=crop"
              alt="CEO with family on vacation"
              className="w-full h-full object-cover rounded-lg"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          </div>
        </div>

        {/* Right Card */}
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground font-medium text-sm text-center md:text-left uppercase tracking-wider">
            YOUR AGENT IS WORKING
          </p>
          <div className="rounded-xl p-1.5 bg-black shadow-xl aspect-[3/4] md:aspect-[4/5] overflow-hidden relative group">
            <div className="w-full h-full bg-gradient-to-b from-[#eef4f9] to-[#d6e4f0] rounded-lg relative overflow-hidden flex flex-col items-center pt-6 md:pt-10">
              {/* Gmail Window Mockup */}
              <div className="w-[92%] bg-white/95 backdrop-blur-sm rounded-lg shadow-xl flex flex-col overflow-hidden border border-white/60" style={{ height: '55%' }}>
                {/* Header */}
                <div className="flex items-center px-2 py-1.5 border-b border-gray-100 gap-2">
                  <Menu size={10} className="text-gray-600" />
                  <div className="flex items-center gap-1">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" alt="Gmail" className="w-2.5 h-2.5" />
                    <span className="text-[9px] font-medium text-gray-700">Gmail</span>
                  </div>
                  <div className="flex-1 bg-[#f1f3f4] rounded-full flex items-center px-2 py-1 gap-1 mx-1">
                    <Search size={8} className="text-gray-500" />
                    <div className="h-1.5 w-12 bg-gray-300 rounded-full"></div>
                  </div>
                  <HelpCircle size={10} className="text-gray-600" />
                  <Settings size={10} className="text-gray-600" />
                  <Grid size={10} className="text-gray-600" />
                  <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                </div>

                {/* Body */}
                <div className="flex flex-1 overflow-hidden">
                  {/* Sidebar */}
                  <div className="w-[28%] border-r border-gray-100 p-1.5 flex flex-col gap-1">
                    <div className="bg-[#c2e7ff] text-gray-800 rounded-md flex items-center gap-1.5 px-2 py-1.5 w-fit mb-1">
                      <Pencil size={8} />
                      <span className="text-[7px] font-medium">Compose</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-[#d3e3fd] rounded-r-full -ml-1.5 pr-3">
                      <Inbox size={8} className="text-gray-800" />
                      <span className="text-[7px] font-medium text-gray-800">Inbox</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1">
                      <Star size={8} className="text-gray-600" />
                      <span className="text-[7px] text-gray-600">Starred</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1">
                      <Clock size={8} className="text-gray-600" />
                      <span className="text-[7px] text-gray-600">Snoozed</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1">
                      <Send size={8} className="text-gray-600" />
                      <span className="text-[7px] text-gray-600">Sent</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1">
                      <File size={8} className="text-gray-600" />
                      <span className="text-[7px] text-gray-600">Drafts</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1">
                      <ChevronDown size={8} className="text-gray-600" />
                      <span className="text-[7px] text-gray-600">More</span>
                    </div>
                  </div>

                  {/* Email List */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-2 px-2 py-1 border-b border-gray-100">
                      <Square size={8} className="text-gray-400" />
                      <RefreshCw size={8} className="text-gray-600" />
                      <MoreVertical size={8} className="text-gray-600" />
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 border-b border-gray-50">
                          <Square size={8} className="text-gray-300" />
                          <Star size={8} className="text-gray-300" />
                          <div className="w-8 h-1.5 bg-gray-300 rounded-full"></div>
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full"></div>
                          <div className="w-4 h-1.5 bg-gray-300 rounded-full"></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Mini Sidebar */}
                  <div className="w-4 border-l border-gray-100 flex flex-col items-center py-2 gap-2">
                    <Calendar size={8} className="text-blue-600" />
                    <CheckSquare size={8} className="text-yellow-600" />
                    <div className="w-2 h-2 rounded-full bg-blue-100 flex items-center justify-center mt-2">
                      <Plus size={6} className="text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Agent Status Panel */}
              <div className="absolute bottom-3 left-3 right-3 bg-white/40 backdrop-blur-2xl border border-white/60 rounded-2xl p-3 shadow-2xl flex flex-col gap-3">
                {/* Glowing Orb */}
                <div className="w-7 h-7 rounded-full relative flex-shrink-0 ml-1"
                  style={{
                    background: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #93c5fd 20%, #3b82f6 60%, #1e3a8a 100%)',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4), inset 0 -2px 6px rgba(0,0,0,0.2)'
                  }}>
                  <div className="absolute inset-0 rounded-full animate-pulse bg-blue-400/20 blur-[2px]"></div>
                </div>

                {/* Status Cards */}
                <div className="flex gap-1.5">
                  {/* Card 1 */}
                  <div className="flex-1 bg-white/70 backdrop-blur-md rounded-lg p-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-white flex flex-col justify-between gap-2.5">
                    <div className="flex items-start gap-2">
                      <Brain size={14} className="text-gray-700 flex-shrink-0 mt-0.5" />
                      <div className="text-[7px] md:text-[8px] leading-tight text-gray-800">
                        <span className="font-medium">Analyzing Context -</span><br />
                        <span className="text-gray-600">Complete (100%)</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-200/80 rounded-full w-full overflow-hidden">
                      <div className="h-full bg-[#5b7ce4] w-full rounded-full"></div>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="flex-1 bg-white/70 backdrop-blur-md rounded-lg p-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-white flex flex-col justify-between gap-2.5">
                    <div className="flex items-start gap-2">
                      <Send size={14} className="text-gray-700 flex-shrink-0 mt-0.5" />
                      <div className="text-[7px] md:text-[8px] leading-tight text-gray-800">
                        <span className="font-medium">Sending Response</span><br />
                        <span className="text-gray-600">- In Progress (65%)</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-200/80 rounded-full w-full overflow-hidden">
                      <div className="h-full bg-[#5b7ce4] w-[65%] rounded-full"></div>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="flex-1 bg-white/40 backdrop-blur-md rounded-lg p-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-white/50 flex flex-col justify-between gap-2.5 relative">
                    <div className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-gray-300"></div>
                    <div className="flex items-start gap-2">
                      <Bell size={14} className="text-gray-500 flex-shrink-0 mt-0.5" />
                      <div className="text-[7px] md:text-[8px] leading-tight text-gray-600">
                        <span className="font-medium">Notifying User</span><br />
                        <span className="text-gray-400">- Queued</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-200/60 rounded-full w-full overflow-hidden">
                      <div className="h-full bg-[#5b7ce4] w-0 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
