import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/config/site';
import { Breadcrumbs } from '@/components/article/Breadcrumbs';
import { PageHeader } from '@/components/listing/PageHeader';
import { LegalNotice, Pending, Prose } from '@/components/prose/Prose';
import styles from '../listing.module.css';

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Condiciones de uso de Contraste: contenido, newsletter, publicidad, correcciones y responsabilidades.',
  alternates: { canonical: '/terminos' },
};

export default function TermsPage() {
  const org = site.organization;
  return (
    <div className={`container ${styles.page}`}>
      <Breadcrumbs items={[{ name: 'Inicio', path: '/' }, { name: 'Términos y condiciones', path: '/terminos' }]} />
      <PageHeader title="Términos y condiciones" description="Las reglas para usar el sitio, el newsletter y el contenido de Contraste." />
      <LegalNotice updated="1 de octubre de 2026" />
      <Prose>
        <h2 id="quienes">Quiénes somos</h2>
        <p>
          {site.name} es un diario digital editado por {org.legalName ?? <Pending>razón social</Pending>}
          {org.taxId && `, CUIT ${org.taxId}`}, con domicilio en {org.address ?? <Pending>domicilio legal</Pending>}. Al usar
          el sitio aceptás estos términos. Si no estás de acuerdo, te pedimos que no lo uses.
        </p>

        <h2 id="contenido">Cómo producimos el contenido</h2>
        <p>
          Parte de nuestras notas se redacta con asistencia de sistemas automáticos a partir de fuentes que se indican en cada
          nota. Todo texto generado de esa forma se trata como borrador y pasa por controles editoriales antes de publicarse. El
          detalle está en <Link href="/metodologia">Cómo trabajamos</Link>.
        </p>
        <p>
          Hacemos lo posible por que la información sea exacta y esté actualizada, y señalamos lo que no está confirmado. Aun
          así, el contenido es informativo: no constituye asesoramiento profesional (legal, financiero, médico ni de otro tipo).
        </p>

        <h2 id="correcciones">Errores y correcciones</h2>
        <p>
          Si encontrás un error, escribinos a {org.contactEmail ?? <Pending>email de contacto</Pending>}. Corregimos los errores
          de hecho en la misma nota y dejamos constancia en su historial de cambios.
        </p>

        <h2 id="propiedad">Propiedad intelectual</h2>
        <p>
          Los textos, el diseño y la marca {site.name} pertenecen a {org.legalName ?? <Pending>razón social</Pending>}. Podés
          citar fragmentos breves con mención de la fuente y enlace a la nota original. Para otros usos, pedí autorización.
        </p>
        <p>
          Las fotografías pueden tener otros autores y licencias, indicados en el epígrafe de cada una. Su reutilización se rige
          por esas licencias.
        </p>

        <h2 id="newsletter">Newsletter</h2>
        <p>
          La suscripción es gratuita y voluntaria. Podés darte de baja en cualquier momento desde el enlace incluido en cada
          envío. El tratamiento de tu email se rige por la <Link href="/privacidad">política de privacidad</Link>.
        </p>

        <h2 id="publicidad">Publicidad</h2>
        <p>
          El sitio puede mostrar anuncios de terceros, siempre identificados con la palabra “Publicidad” y separados del
          contenido editorial. Los anunciantes no intervienen en las decisiones editoriales. No somos responsables por los
          productos o servicios anunciados.
        </p>

        <h2 id="enlaces">Enlaces a otros sitios</h2>
        <p>
          Las notas enlazan a fuentes externas para que puedas verificar la información. No controlamos esos sitios ni somos
          responsables por su contenido o sus políticas.
        </p>

        <h2 id="uso">Uso aceptable</h2>
        <p>
          No está permitido usar el sitio para actividades ilegales, intentar acceder a sistemas o datos sin autorización,
          sobrecargar el servicio ni copiar el contenido de forma masiva y automatizada sin permiso.
        </p>

        <h2 id="responsabilidad">Responsabilidad</h2>
        <p>
          El sitio se ofrece tal como está. En la medida en que la ley lo permita, no respondemos por interrupciones del
          servicio ni por decisiones que se tomen exclusivamente a partir del contenido publicado. Nada en estos términos limita
          los derechos que te reconoce la normativa de defensa del consumidor aplicable.
        </p>

        <h2 id="ley">Ley aplicable</h2>
        <p>
          Estos términos se rigen por las leyes de la República Argentina. Cualquier controversia se someterá a los tribunales
          competentes de <Pending>jurisdicción</Pending>, sin perjuicio de los derechos que la ley reconozca a las personas
          consumidoras.
        </p>

        <h2 id="cambios">Cambios</h2>
        <p>Podemos actualizar estos términos. La versión vigente es la publicada en esta página, con su fecha de actualización.</p>
      </Prose>
    </div>
  );
}
