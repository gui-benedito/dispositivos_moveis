const { SecurityEvent } = require('../models');

/**
 * Helper simples para registrar eventos de segurança
 */
async function logSecurityEvent({
  userId,
  type,
  severity = 'low',
  title,
  message,
  req,
  metadata,
}) {
  try {
    if (!userId || !type || !title || !message) {
      return;
    }

    await SecurityEvent.create({
      userId,
      type,
      severity,
      title,
      message,
      ipAddress: req?.ip || null,
      deviceInfo: req
        ? {
            userAgent: req.get && req.get('User-Agent'),
            headers: {
              'x-forwarded-for': req.headers?.['x-forwarded-for'],
            },
          }
        : null,
      metadata: metadata || null,
    });
  } catch (error) {
    // Nunca deixar o log de segurança quebrar o fluxo principal
    console.error('Erro ao registrar SecurityEvent:', error?.message || error);
  }
}

module.exports = {
  logSecurityEvent,
};
