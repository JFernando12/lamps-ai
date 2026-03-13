import Link from 'next/link';
import { WhatsAppContactLink } from '@/components/WhatsAppContactLink';

export const metadata = {
  title: 'Términos y Condiciones — The Dream Gift',
  description: 'Términos y condiciones de uso y compra de The Dream Gift.',
};

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pt-20 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-8 transition-colors"
        >
          ← Volver al inicio
        </Link>

        <h1 className="text-3xl font-extrabold mb-2">Términos y Condiciones</h1>
        <p className="text-white/40 text-sm mb-10">
          Última actualización: marzo 2026
        </p>

        <div className="space-y-8 text-white/70 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-bold text-lg mb-3">
              1. Descripción del servicio
            </h2>
            <p>
              The Dream Gift ofrece lámparas acrílicas LED personalizadas con
              foto grabada con láser. Al realizar un pedido en{' '}
              <strong className="text-white">thedreamgiftmx.com</strong>, usted
              acepta estos Términos y Condiciones en su totalidad.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">
              2. Proceso de compra
            </h2>
            <p className="mb-3">
              El proceso de compra consta de los siguientes pasos:
            </p>
            <ol className="space-y-2 list-decimal list-inside">
              <li>Selección del modelo de lámpara (RGB o base de madera).</li>
              <li>
                Carga de la fotografía y configuración de opciones (texto
                grabado, diseño).
              </li>
              <li>
                Ingreso de datos de envío y creación o inicio de sesión en su
                cuenta.
              </li>
              <li>
                Pago a través de MercadoPago (tarjeta de crédito/débito, OXXO,
                transferencia).
              </li>
              <li>Confirmación del pedido por correo electrónico.</li>
            </ol>
            <p className="mt-3">
              El contrato de compraventa se perfecciona una vez que el pago ha
              sido confirmado por MercadoPago y usted recibe la confirmación de
              su pedido.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">
              3. Precios y pagos
            </h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>
                Todos los precios están expresados en{' '}
                <strong className="text-white">pesos mexicanos (MXN)</strong> e
                incluyen IVA.
              </li>
              <li>
                El envío es <strong className="text-white">gratuito</strong> a
                todo México.
              </li>
              <li>
                Los pagos se procesan de forma segura a través de{' '}
                <strong className="text-white">MercadoPago</strong>. No
                almacenamos datos de tarjeta.
              </li>
              <li>
                Los precios pueden cambiar sin previo aviso, pero el precio
                confirmado en su pedido no se modifica.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">
              4. Producción y tiempos de entrega
            </h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>
                El tiempo de <strong className="text-white">producción</strong>{' '}
                es de <strong className="text-white">3 a 5 días hábiles</strong>{' '}
                posteriores a la confirmación del pago.
              </li>
              <li>
                El tiempo de <strong className="text-white">entrega</strong> una
                vez enviado es de{' '}
                <strong className="text-white">3 a 7 días hábiles</strong>{' '}
                dependiendo del destino dentro de México.
              </li>
              <li>
                Le enviaremos un correo con el número de rastreo cuando su
                pedido sea enviado.
              </li>
              <li>
                Los tiempos son estimados y pueden variar en temporadas de alta
                demanda.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">
              5. Fotografías y diseño
            </h2>
            <p className="mb-3">
              Al cargar una fotografía, usted declara y garantiza que:
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li>
                Es el titular de los derechos de la imagen o cuenta con el
                consentimiento de las personas fotografiadas.
              </li>
              <li>La imagen no infringe derechos de autor de terceros.</li>
              <li>
                La imagen no contiene contenido ilegal, ofensivo o inapropiado.
              </li>
            </ul>
            <p className="mt-3">
              Nos reservamos el derecho de rechazar pedidos cuyas imágenes
              incumplan estas condiciones, con reembolso completo al cliente.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">
              6. Garantía y cambios
            </h2>
            <div className="bg-green-500/8 border border-green-500/20 rounded-xl p-4 mb-4">
              <p className="text-green-300 font-semibold mb-1">
                Garantía de satisfacción con el diseño
              </p>
              <p className="text-white/60">
                Si el diseño grabado no es fiel a su fotografía, lo rehacemos
                sin costo adicional. Contáctenos dentro de los{' '}
                <strong className="text-white">5 días hábiles</strong>{' '}
                posteriores a la recepción del producto.
              </p>
            </div>
            <ul className="space-y-2 list-disc list-inside">
              <li>
                En caso de{' '}
                <strong className="text-white">daño en el transporte</strong>,
                envíe fotos del empaque y producto a{' '}
                <a
                  href="mailto:hola@thedreamgiftmx.com"
                  className="text-amber-400 hover:underline"
                >
                  hola@thedreamgiftmx.com
                </a>{' '}
                en un plazo máximo de 48 horas tras la entrega.
              </li>
              <li>
                Los productos personalizados no son sujetos a cambios o
                devoluciones por arrepentimiento de compra, de conformidad con
                el artículo 92 Bis de la LFPC.
              </li>
              <li>
                No ofrecemos reembolsos por errores en los datos de envío
                proporcionados por el cliente.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">
              7. Cancelaciones
            </h2>
            <p className="mb-3">
              Solo es posible cancelar un pedido si la producción aún no ha
              iniciado:
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li>
                Si solicita la cancelación{' '}
                <strong className="text-white">
                  dentro de las primeras 6 horas
                </strong>{' '}
                posteriores al pago, realizamos el reembolso completo.
              </li>
              <li>
                Una vez iniciada la producción, no es posible cancelar el
                pedido.
              </li>
            </ul>
            <p className="mt-3">
              Para solicitar una cancelación, contáctenos por WhatsApp o correo
              electrónico.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">
              8. Propiedad intelectual
            </h2>
            <p>
              Todo el contenido de este sitio (textos, imágenes, diseños, logos,
              código) es propiedad de The Dream Gift o de sus respectivos
              titulares y está protegido por las leyes de propiedad intelectual.
              Queda prohibida su reproducción total o parcial sin autorización
              expresa.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">
              9. Limitación de responsabilidad
            </h2>
            <p>
              The Dream Gift no será responsable por daños indirectos,
              incidentales o consecuentes derivados del uso del sitio o de los
              productos, en la medida permitida por la legislación mexicana
              aplicable. Nuestra responsabilidad máxima se limita al valor del
              pedido en cuestión.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">
              10. Ley aplicable y jurisdicción
            </h2>
            <p>
              Estos términos se rigen por las leyes de los{' '}
              <strong className="text-white">Estados Unidos Mexicanos</strong>.
              Cualquier controversia se someterá a los tribunales competentes en
              la República Mexicana, renunciando a cualquier otro fuero que
              pudiera corresponder.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">11. Contacto</h2>
            <div className="bg-white/3 border border-white/10 rounded-xl p-4">
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
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-wrap gap-4 text-sm text-white/30">
          <Link href="/" className="hover:text-white transition-colors">
            Inicio
          </Link>
          <Link
            href="/privacidad"
            className="hover:text-white transition-colors"
          >
            Aviso de privacidad
          </Link>
        </div>
      </div>
    </main>
  );
}
