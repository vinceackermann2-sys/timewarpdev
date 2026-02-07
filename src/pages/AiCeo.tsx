import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AiCeo = () => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      {/* Phone mockup */}
      <div className="w-[260px] sm:w-[290px]">
        {/* Phone outer frame */}
        <div
          className="rounded-[1.8rem] overflow-hidden"
          style={{
            background: "#181d2a",
            padding: "10px",
            boxShadow: "0 30px 80px -15px rgba(0,0,0,0.3)",
          }}
        >
          {/* Top area with notch */}
          <div className="relative h-14 flex items-start justify-center">
            {/* Notch */}
            <div
              className="w-[70px] h-[22px] rounded-b-xl mt-0"
              style={{ background: "#101420" }}
            />
          </div>

          {/* Screen area with blue border */}
          <div
            className="rounded-lg mx-0 mb-4"
            style={{
              border: "1.5px solid rgba(59, 130, 246, 0.45)",
              background: "#1b2236",
              minHeight: "280px",
            }}
          />

          {/* CTA Button */}
          <div className="px-2 pb-3">
            <Button
              asChild
              className="w-full rounded-lg h-10 text-sm font-semibold bg-[#3b82f6] hover:bg-[#2563eb] text-white border-0"
            >
              <Link to="/auth?mode=signup">Run AI CEO</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiCeo;
