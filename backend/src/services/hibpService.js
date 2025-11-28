const crypto = require('crypto');

// Serviço simples para consulta ao Have I Been Pwned (Pwned Passwords) usando k-anonymity
// Documentação: https://haveibeenpwned.com/API/v3#PwnedPasswords

// Cache em memória por prefixo+suffix SHA-1 para reduzir chamadas e respeitar limites
// Chave: hash SHA-1 completo (hex uppercase). Valor: { count, checkedAt }
const cache = new Map();

// Tempo máximo no cache (ms) - por exemplo, 24h
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function sha1HexUpper(text) {
  return crypto.createHash('sha1').update(text, 'utf8').digest('hex').toUpperCase();
}

/**
 * Consulta se uma senha foi exposta no HIBP.
 * NUNCA registra a senha em logs. Usa k-anonymity (prefixo de 5 chars do SHA-1).
 *
 * @param {string} password Senha em texto puro
 * @returns {Promise<{ found: boolean, count: number }>} Resultado da consulta
 */
async function checkPasswordPwned(password) {
  if (!password) {
    return { found: false, count: 0 };
  }

  try {
    const fullHash = sha1HexUpper(password);

    // Verificar cache
    const cached = cache.get(fullHash);
    const now = Date.now();
    if (cached && (now - cached.checkedAt) < CACHE_TTL_MS) {
      return { found: cached.count > 0, count: cached.count };
    }

    const prefix = fullHash.substring(0, 5);
    const suffix = fullHash.substring(5);

    // Node 18+ possui fetch global
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'PasswordManagerBackend/1.0 (HIBP integration)',
        'Add-Padding': 'true', // ajuda a mitigar ataques de tamanho de resposta
      },
    });

    if (!response.ok) {
      // Em caso de erro na API, não queremos quebrar o fluxo principal
      console.error('HIBP: resposta não OK', response.status, response.statusText);
      return { found: false, count: 0 };
    }

    const body = await response.text();
    let count = 0;

    const lines = body.split('\n');
    for (const line of lines) {
      const [hashSuffix, cnt] = line.trim().split(':');
      if (!hashSuffix || !cnt) continue;
      if (hashSuffix.toUpperCase() === suffix) {
        count = parseInt(cnt, 10) || 0;
        break;
      }
    }

    cache.set(fullHash, { count, checkedAt: now });

    return { found: count > 0, count };
  } catch (error) {
    // Nunca logar a senha, apenas o erro genérico
    console.error('Erro ao consultar HIBP:', error.message || error);
    return { found: false, count: 0 };
  }
}

module.exports = {
  checkPasswordPwned,
};
