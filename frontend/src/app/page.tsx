import { MessageCircle } from 'lucide-react';
import { HeroSection } from '@/components/home/HeroSection';
import { GallerySection } from '@/components/home/GallerySection';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { OccasionsSection } from '@/components/home/OccasionsSection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { ProductSection } from '@/components/home/ProductSection';
import { FaqSection } from '@/components/home/FaqSection';
import { Footer } from '@/components/home/Footer';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <HeroSection />
      <GallerySection />
      <HowItWorksSection />
      <OccasionsSection />
      <TestimonialsSection />
      <ProductSection />
      <FaqSection />
      <Footer />

      {/* ── WHATSAPP FLOTANTE ────────────────────────────────────── */}
      <a
        href="https://wa.me/527551155510"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-4 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold pl-4 pr-5 py-3 rounded-full shadow-lg shadow-black/40 transition-all hover:scale-105 touch-manipulation"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle size={22} />
        <span className="text-sm whitespace-nowrap">¿Dudas? Escríbenos</span>
      </a>
    </main>
  );
}
