import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/config/site';
import { isAdSenseConfigured } from '@/config/ads';
import { Breadcrumbs } from '@/components/article/Breadcrumbs';
import { PageHeader } from '@/components/listing/PageHeader';
import { LegalNotice, Pending, Prose } from '@/components/prose/Prose';
import styles from '../listing.module.css';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Qué datos recopila Contraste, para qué los usa, cuánto tiempo los guarda y cómo ejercer tus derechos.',
  alternates: { canonical: '/privacidad' },
};

export default function PrivacyPage() {
  const org = site.organization;
  return (
    <div className={`container ${styles.page}`}>
      <Breadcrumbs items={[{ name: 'Inicio', path: '/' }, { name: 'Política de privacidad', path: '/privacidad' }]} />
      <PageHeader title="Política de privacidad" description="Qué datos tratamos, para qué y cómo podés controlarlos. Escrita para entenderse sin abogado." />
      <LegalNotice updated="1 de octubre de 2026" />
      <Prose>
        <h2 id="resumen">En pocas palabras</h2>
        <ul>
          <li>Para leer el sitio no hace falta registrarse ni dar ningún dato.</li>
          <li>Si te suscribís al newsletter, guardamos solo tu email y la constancia de tu consentimiento.</li>
          <li>No vendemos ni cedemos datos personales.</li>
          <li>Las herramientas de terceros (publicidad, medición) no se cargan sin tu decisión.</li>
          <li>Podés pedir acceso, corrección o eliminación de tus datos en cualquier momento.</li>
        </ul>

        <h2 id="responsable">Quién es responsable</h2>
        <p>
          El responsable del tratamiento es {org.legalName ?? <Pending>razón social</Pending>}, CUIT{' '}
          {org.taxId ?? <Pending>número de CUIT</Pending>}, con domicilio en {org.address ?? <Pending>domicilio legal</Pending>}.
          Para cualquier consulta sobre privacidad podés escribir a {org.privacyEmail ?? <Pending>email de privacidad</Pending>}.
        </p>

        <h2 id="datos">Qué datos tratamos</h2>
        <h3>Cuando leés el sitio</h3>
        <p>
          Nuestro proveedor de alojamiento procesa datos técnicos necesarios para entregarte las páginas y proteger el sitio
          de abusos: dirección IP, tipo de navegador, página solicitada y fecha. Esos registros se conservan durante{' '}
          <Pending>plazo de retención de registros del proveedor de alojamiento</Pending> y no los usamos para identificarte.
        </p>
        <p>
          Tu navegador guarda dos preferencias de este sitio: el modo claro u oscuro y tu decisión sobre cookies. Quedan en tu
          dispositivo y no se envían a nuestros servidores. El detalle está en la <Link href="/cookies">política de cookies</Link>.
        </p>
        <h3 id="newsletter">Si te suscribís al newsletter</h3>
        <p>
          Guardamos tu email, la fecha y la versión del texto de consentimiento que aceptaste, y el estado de la suscripción
          (pendiente, confirmada o dada de baja). No pedimos nombre, teléfono ni ningún otro dato. Usamos el email únicamente
          para enviarte el newsletter y los mensajes necesarios para administrarlo, como la confirmación de la suscripción.
        </p>
        <p>
          La suscripción se confirma desde un enlace que te llega por correo. Si no la confirmás, la solicitud se elimina a
          los 7 días. Podés darte de baja con el enlace que incluye cada envío; después de la baja conservamos solo el email y
          la fecha de baja, para no volver a escribirte por error.
        </p>
        <h3>Publicidad</h3>
        {isAdSenseConfigured() ? (
          <p>Este sitio muestra anuncios de Google AdSense. Ver el apartado siguiente.</p>
        ) : (
          <p>
            Hoy el sitio no muestra anuncios reales ni carga ningún script publicitario. Si se activa la publicidad, este
            apartado describe qué cambia:
          </p>
        )}
        <blockquote>
          <p>
            Los proveedores de terceros, incluido Google, usan cookies para mostrar anuncios basados en tus visitas anteriores
            a este u otros sitios. Las cookies de publicidad permiten que Google y sus socios muestren anuncios según tus
            visitas a este sitio y a otros sitios de internet. Podés desactivar la publicidad personalizada desde la{' '}
            <a href="https://www.google.com/settings/ads" rel="noopener noreferrer" target="_blank">
              configuración de anuncios de Google
            </a>
            , o la de otros proveedores desde{' '}
            <a href="https://www.aboutads.info/choices/" rel="noopener noreferrer" target="_blank">
              aboutads.info
            </a>
            . Más información en{' '}
            <a href="https://policies.google.com/technologies/partner-sites?hl=es-419" rel="noopener noreferrer" target="_blank">
              cómo usa Google la información de los sitios que usan sus servicios
            </a>
            .
          </p>
        </blockquote>
        <p>Los anuncios personalizados solo se piden si los aceptás en el aviso de cookies; si no, se piden anuncios no personalizados.</p>

        <h2 id="finalidad">Para qué y con qué base</h2>
        <ul>
          <li>Enviarte el newsletter: con tu consentimiento expreso, que podés retirar cuando quieras.</li>
          <li>Que el sitio funcione y sea seguro: por ser necesario para prestarte el servicio que pedís al visitarlo.</li>
          <li>Medición y publicidad personalizada: solo con tu consentimiento.</li>
        </ul>

        <h2 id="terceros">Con quién compartimos datos</h2>
        <p>
          Solo con proveedores que nos prestan servicios y tratan los datos por nuestra cuenta: alojamiento del sitio{' '}
          (<Pending>proveedor de alojamiento</Pending>) y envío de correos (<Pending>proveedor de email</Pending>). Algunos de
          esos proveedores pueden estar fuera de la Argentina; en ese caso, la transferencia se hará con los recaudos que exige
          la normativa de protección de datos aplicable.
        </p>

        <h2 id="derechos">Tus derechos</h2>
        <p>
          Podés pedir acceso a tus datos, su rectificación, actualización o supresión, y retirar tu consentimiento, escribiendo
          a {org.privacyEmail ?? <Pending>email de privacidad</Pending>}. Respondemos dentro de los plazos que fija la Ley
          25.326 de Protección de los Datos Personales.
        </p>
        <p>
          El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a
          intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en
          el artículo 14, inciso 3 de la Ley N° 25.326.
        </p>
        <p>
          La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la
          atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por
          incumplimiento de las normas vigentes en materia de protección de datos personales.
        </p>

        <h2 id="seguridad">Seguridad</h2>
        <p>
          El sitio se sirve solo por conexiones cifradas. Las bases que contienen emails tienen acceso restringido al personal que
          lo necesita. Ningún sistema es infalible: si detectamos un incidente que afecte tus datos, te lo informaremos.
        </p>

        <h2 id="cambios">Cambios en esta política</h2>
        <p>
          Si cambiamos algo importante, lo publicamos en esta página con la fecha de actualización y, si estás suscripto, te
          avisamos por correo antes de que rija.
        </p>
      </Prose>
    </div>
  );
}
