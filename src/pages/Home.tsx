import { useState } from "react";
import Header from "../components/Header";
import BentoCanvas from "../components/BentoCanvas";
import { ChevronDown } from "lucide-react";

const Home = () => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Header />
      <div className="px-6 md:px-12 lg:px-16 py-8 max-w-[1600px] mx-auto">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-3 font-['Bebas_Neue'] text-sm tracking-[0.24em] uppercase text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          />
          Project index
        </button>

        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${open ? "max-h-[9999px] opacity-100 mt-6" : "max-h-0 opacity-0"}`}
        >
          <BentoCanvas />
        </div>
      </div>
    </div>
  );
};

export default Home;
