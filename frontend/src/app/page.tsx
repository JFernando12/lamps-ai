import { HeroSection } from '@/components/home/HeroSection';
import { GallerySection } from '@/components/home/GallerySection';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { OccasionsSection } from '@/components/home/OccasionsSection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { ProductSection } from '@/components/home/ProductSection';
import { FaqSection } from '@/components/home/FaqSection';
import { Footer } from '@/components/home/Footer';
import { WhatsAppButton } from '@/components/WhatsAppButton';

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
      <WhatsAppButton />
    </main>
  );
}
