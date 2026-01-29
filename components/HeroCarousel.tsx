
import React, { useState, useEffect } from 'react';

const SLIDES = [
  {
    title: "Creality Falcon2 40W",
    highlight: "Mighty but Precise",
    subtitle: "Pro-tech for Pro-work",
    image: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&q=80&w=1200",
    features: ["40W Power", "Adjustable Light", "Ultra-fast", "0.0125mm Accuracy"]
  },
  {
    title: "V2V Tracking Pro",
    highlight: "Connect the Road",
    subtitle: "Advanced Vehicle-to-Vehicle Mesh Communication",
    image: "https://images.unsplash.com/photo-1558444479-c848512186c0?auto=format&fit=crop&q=80&w=1200",
    features: ["Real-time GPS", "Mesh Networking", "Collision Avoidance"]
  },
  {
    title: "Project Milestone",
    highlight: "1000+ Projects Sold",
    subtitle: "Join thousands of engineers worldwide.",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200",
    features: ["Global Support", "Open Source", "Verified Hardware"]
  }
];

export const HeroCarousel: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[currentSlide];

  return (
    <div className="relative w-full h-[300px] md:h-[450px] bg-[#111] text-white">
      {SLIDES.map((s, idx) => (
        <div 
          key={idx}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            idx === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img 
            src={s.image} 
            alt={s.title} 
            className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-[6000ms] scale-110 group-hover:scale-100"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          
          <div className="relative z-10 h-full flex flex-col justify-center px-12 max-w-2xl animate-fade-in-up">
            <span className="text-blue-400 font-bold uppercase tracking-[0.3em] text-sm mb-4">{s.title}</span>
            <h2 className="text-5xl font-black mb-2 tracking-tighter">{s.highlight}</h2>
            <p className="text-xl font-light opacity-80 mb-8">{s.subtitle}</p>
            
            <div className="flex gap-6 mb-8">
               {s.features && s.features.map(f => (
                 <div key={f} className="flex flex-col items-center gap-1 opacity-70">
                    <span className="text-lg">⚡</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center max-w-[80px] leading-tight">{f}</span>
                 </div>
               ))}
            </div>

            <button className="w-fit px-8 py-3 bg-blue-600 text-white font-black rounded-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 active:scale-95">
              Learn More
            </button>
          </div>
        </div>
      ))}

      {/* Slide Indicators */}
      <div className="absolute bottom-6 right-12 flex gap-3">
        {SLIDES.map((_, idx) => (
          <button 
            key={idx} 
            onClick={() => setCurrentSlide(idx)}
            className={`w-3 h-3 rounded-full border-2 border-white/30 transition-all ${
              idx === currentSlide ? 'bg-blue-500 border-blue-500 w-8' : 'hover:bg-white/50'
            }`}
          />
        ))}
      </div>

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 1s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
};
