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
          <div className="rounded-xl p-1.5 bg-foreground shadow-xl aspect-[3/4] md:aspect-[4/5] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1000&auto=format&fit=crop"
              alt="AI Agent working"
              className="w-full h-full object-cover rounded-lg"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
