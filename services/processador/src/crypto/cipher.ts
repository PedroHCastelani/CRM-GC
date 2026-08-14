import { createDecipheriv } from 'node:crypto';
const ALGO = 'aes-256-gcm';
const VERSION = 1;
export class Cipher {
  private readonly key: Buffer;
  constructor(key: Buffer) {
    if (key.length !== 32) throw new Error('Chave AES-256 deve ter exatamente 32 bytes');
    this.key = key;
  }
  decrypt(payload: string): string {
    if (payload === '') return '';
    const parts = payload.split('.');
    if (parts.length !== 4) throw new Error('Payload malformado');
    const [ver, ivB64, tagB64, ctB64] = parts as [string, string, string, string];
    if (ver !== `v${VERSION}`) throw new Error(`Versao nao suportada: ${ver}`);
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const d = createDecipheriv(ALGO, this.key, iv, { authTagLength: 16 });
    d.setAuthTag(tag);
    return Buffer.concat([d.update(Buffer.from(ctB64, 'base64')), d.final()]).toString('utf8');
  }
}
