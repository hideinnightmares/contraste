/**
 * Envío de correos transaccionales del newsletter.
 *
 * No hay proveedor conectado. Para producción se implementa `Mailer` sobre el
 * servicio elegido (Resend, Amazon SES, Postmark, Mailchimp Transactional…),
 * con las credenciales en variables de entorno, y se elige en `service.ts`.
 * Los envíos deben incluir el encabezado `List-Unsubscribe` con el enlace de baja.
 */
export interface Mailer {
  readonly configured: boolean;
  sendConfirmation(input: { to: string; confirmUrl: string; unsubscribeUrl: string }): Promise<void>;
}

/** Sin proveedor: no envía nada y lo declara, para que la interfaz no prometa un correo que no llega. */
export class UnconfiguredMailer implements Mailer {
  readonly configured = false;
  async sendConfirmation() {
    // Intencionalmente vacío: la API informa que el envío no está disponible.
  }
}
