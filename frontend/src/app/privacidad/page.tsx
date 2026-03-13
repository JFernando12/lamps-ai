import Link from 'next/link';
import { WhatsAppContactLink } from '@/components/WhatsAppContactLink';

export const metadata = {
  title: 'Aviso de Privacidad — The Dream Gift',
  description:
    'Aviso de privacidad y política de protección de datos personales de The Dream Gift.',
};

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pt-20 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-8 transition-colors"
        >
          ← Volver al inicio
        </Link>

        <h1 className="text-3xl font-extrabold mb-2">Aviso de Privacidad</h1>
        <p className="text-white/40 text-sm mb-10">
          Última actualización: marzo 2026
        </p>

        <div className="space-y-8 text-white/70 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-bold text-lg mb-3">
              1. Responsable del tratamiento
            </h2>
            <p>
              <strong className="text-white">The Dream Gift</strong> (en
              adelante, "nosotros" o "la empresa") es responsable del
              tratamiento de sus datos personales. Para cualquier consulta
              relacionada con este aviso puede contactarnos en:
            </p>
            <div className="bg-white/3 border border-white/10 rounded-xl p-4 mt-3">
              <p>
                Correo:{' '}
                <a
                  href="mailto:hola@thedreamgiftmx.com"
                  className="text-amber-400 hover:underline"
                >
                  hola@thedreamgiftmx.com
                </a>
              </p>
              <p>
                WhatsApp:{' '}
                <WhatsAppContactLink className="text-amber-400 hover:underline">
                  +52 755 115 5510
                </WhatsAppContactLink>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">
              2. Datos personales que recopilamos
            </h2>
            <p className="mb-3">
              Recopilamos los siguientes datos cuando usted realiza un pedido o
              crea una cuenta:
            </p>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-white">Datos de identificación:</strong>{' '}
                nombre completo, correo electrónico.
              </li>
              <li>
                <strong className="text-white">Datos de contacto:</strong>{' '}
                número de teléfono, dirección de envío (calle, ciudad, estado,
                código postal, país).
              </li>
              <li>
                <strong className="text-white">Datos de pago:</strong> los
                procesa de forma exclusiva MercadoPago; nosotros no almacenamos
                datos bancarios ni de tarjeta.
              </li>
              <li>
                <strong className="text-white">Fotografías e imágenes:</strong>{' '}
                las imágenes que usted sube para personalizar su lámpara. Se
                almacenan de forma segura en servidores de Amazon Web Services
                (AWS S3).
              </li>
              <li>
                <strong className="text-white">Datos de navegación:</strong>{' '}
                dirección IP, tipo de navegador, páginas visitadas y parámetros
                de campaña (UTM), a través de cookies y el Meta Pixel (ver
                sección 5).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">
              3. Finalidades del tratamiento
            </h2>
            <p className="mb-3">Sus datos se utilizan para:</p>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Procesar, producir y enviar su pedido.</li>
              <li>Gestionar su cuenta de cliente y su historial de pedidos.</li>
              <li>Comunicarle el estado de su pedido y número de rastreo.</li>
              <li>Brindarle atención al cliente.</li>
              <li>
                Medir la efectividad de nuestras campañas publicitarias (de
                manera agregada y/o seudonimizada).
              </li>
              <li>Cumplir con obligaciones legales y fiscales.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">
              4. Transferencia de datos
            </h2>
            <p className="mb-3">Sus datos podrán ser compartidos con:</p>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-white">MercadoPago:</strong> para el
                procesamiento seguro de pagos.
              </li>
              <li>
                <strong className="text-white">
                  Amazon Web Services (AWS):
                </strong>{' '}
                para el almacenamiento seguro de fotografías y datos de la
                aplicación.
              </li>
              <li>
                <strong className="text-white">Empresa de mensajería:</strong>{' '}
                nombre y dirección de envío para la entrega de su pedido.
              </li>
            </ul>
            <p className="mt-3">
              No vendemos, rentamos ni compartimos sus datos personales con
              terceros para fines de mercadotecnia sin su consentimiento.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">
              5. Cookies y tecnologías de rastreo
            </h2>
            <p className="mb-3">
              Nuestro sitio utiliza el{' '}
              <strong className="text-white">Meta Pixel</strong> (Facebook
              Pixel) para medir el resultado de nuestras campañas publicitarias
              en Facebook e Instagram. Esta tecnología puede almacenar cookies
              en su dispositivo y recopilar información de comportamiento de
              navegación de forma seudonimizada.
            </p>
            <p>
              Adicionalmente, utilizamos la{' '}
              <strong className="text-white">Conversions API de Meta</strong>{' '}
              (CAPI) para enviar eventos de conversión directamente desde
              nuestros servidores, con datos de usuario hasheados de forma
              irreversible (SHA-256) antes de su transmisión.
            </p>
            <p className="mt-3">
              Puede gestionar o deshabilitar las cookies desde la configuración
              de su navegador. Tenga en cuenta que deshabilitar ciertos tipos de
              cookies puede afectar la funcionalidad del sitio.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">
              6. Derechos ARCO
            </h2>
            <p className="mb-3">
              De conformidad con la{' '}
              <em>
                Ley Federal de Protección de Datos Personales en Posesión de los
                Particulares
              </em>{' '}
              (LFPDPPP), usted tiene derecho a:
            </p>
            <ul className="space-y-1.5 list-disc list-inside mb-3">
              <li>
                <strong className="text-white">Acceso:</strong> conocer qué
                datos personales tenemos suyos.
              </li>
              <li>
                <strong className="text-white">Rectificación:</strong> corregir
                datos inexactos o incompletos.
              </li>
              <li>
                <strong className="text-white">Cancelación:</strong> solicitar
                la eliminación de sus datos.
              </li>
              <li>
                <strong className="text-white">Oposición:</strong> oponerse al
                tratamiento de sus datos para fines específicos.
              </li>
            </ul>
            <p>
              Para ejercer cualquiera de estos derechos, envíe su solicitud a{' '}
              <a
                href="mailto:hola@thedreamgiftmx.com"
                className="text-amber-400 hover:underline"
              >
                hola@thedreamgiftmx.com
              </a>{' '}
              con su nombre completo, correo registrado y descripción de la
              solicitud. Responderemos en un plazo máximo de 20 días hábiles.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">
              7. Seguridad de los datos
            </h2>
            <p>
              Implementamos medidas de seguridad técnicas y organizativas para
              proteger sus datos personales, incluyendo cifrado en tránsito
              (HTTPS/TLS), almacenamiento en infraestructura de AWS con
              controles de acceso, y hashing irreversible de datos sensibles
              antes de cualquier transmisión a terceros.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">
              8. Cambios a este aviso
            </h2>
            <p>
              Nos reservamos el derecho de actualizar este Aviso de Privacidad
              en cualquier momento. Los cambios se publicarán en esta página con
              la fecha de actualización. Le recomendamos revisarlo
              periódicamente.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-wrap gap-4 text-sm text-white/30">
          <Link href="/" className="hover:text-white transition-colors">
            Inicio
          </Link>
          <Link href="/terminos" className="hover:text-white transition-colors">
            Términos y condiciones
          </Link>
        </div>
      </div>
    </main>
  );
}
