import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const VERSION = 1;

/**
 * RN-005 - criptografia em repouso.
 * Formato: v1.<iv_b64>.<tag_b64>.<ciphertext_b64>
 * O prefixo de versao permite rotacao de algoritmo sem migracao destrutiva.
 */
export class Cipher {
  private readonly key: Buffer;

  constructor(key: Buffer) {
    if (key.length !== 32) throw new Error('Chave AES-256 deve ter exatamente 32 bytes');
    this.key = key;
  }

  encrypt(plain: string): string {
    if (plain === '') return '';
    const iv = randomBytes(IV_LEN);
    const c = createCipheriv(ALGO, this.key, iv, { authTagLength: TAG_LEN });
    const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
    return [`v${VERSION}`, iv.toString('base64'), c.getAuthTag().toString('base64'), ct.toString('base64')].join('.');
  }

  decrypt(payload: string): string {
    if (payload === '') return '';
    const parts = payload.split('.');
    if (parts.length !== 4) throw new Error('Payload criptografado malformado');
    const [ver, ivB64, tagB64, ctB64] = parts as [string, string, string, string];
    if (ver !== `v${VERSION}`) throw new Error(`Versao de criptografia nao suportada: ${ver}`);

    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    if (iv.length !== IV_LEN || tag.length !== TAG_LEN) throw new Error('IV ou tag com tamanho invalido');

    const d = createDecipheriv(ALGO, this.key, iv, { authTagLength: TAG_LEN });
    d.setAuthTag(tag);
    return Buffer.concat([d.update(Buffer.from(ctB64, 'base64')), d.final()]).toString('utf8');
  }

  /** Comparacao resistente a timing attack, para validacao de tokens. */
  static safeEqual(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  }
}
