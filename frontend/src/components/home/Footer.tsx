import { Instagram, Facebook, MessageCircle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="py-12 px-4 border-t border-white/10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-white/30 text-sm">
        <div className="flex flex-col items-center md:items-start gap-1">
          <span className="font-bold text-amber-400 text-lg">
            The Dream Gift
          </span>
          <p>
            © {new Date().getFullYear()} The Dream Gift. Todos los derechos
            reservados.
          </p>
        </div>
        <div className="flex items-center gap-5 text-white/40">
          <a
            href="https://instagram.com/thedreamgift.mx"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
            aria-label="Instagram"
          >
            <Instagram size={20} />
          </a>
          <a
            href="https://facebook.com/thedreamgift.mx"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
            aria-label="Facebook"
          >
            <Facebook size={20} />
          </a>
          <a
            href="https://wa.me/527551155510"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
            aria-label="WhatsApp"
          >
            <MessageCircle size={20} />
          </a>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white transition-colors">
            Privacidad
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Términos
          </a>
          <a
            href="mailto:hola@thedreamgift.mx"
            className="hover:text-white transition-colors"
          >
            Contacto
          </a>
        </div>
      </div>
    </footer>
  );
}
