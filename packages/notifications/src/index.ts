// Notifications (Module H, Sprint 5). Email delivery abstraction + pure
// transactional templates. In-app notification ROWS are written in apps/web
// (notification-service) under a DB context; this package owns email + copy only.
export {
  type EmailMessage,
  type EmailSendResult,
  type EmailProvider,
  DevEmailProvider,
  ResendEmailProvider,
  createEmailProvider,
  emailProvider,
} from "./email.js";
export {
  type EmailTemplate,
  welcomeEmail,
  bookingConfirmationEmail,
  payoutReceiptEmail,
  reviewRequestEmail,
} from "./templates.js";
