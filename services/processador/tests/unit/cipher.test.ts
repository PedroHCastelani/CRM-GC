import { describe, it, expect } from 'vitest';
import { createCipheriv, randomBytes } from 'node:crypto';
import { Cipher } from '../../src/crypto/cipher.js';

function encryptTest(key: Buffer, text: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  const ct = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return `v1.${iv.toString('base64')}.${tag.toString('base64')}.${ct.toString('base64')}`;
}

const KEY = randomBytes(32);

describe('Cipher.decrypt', () => {
  it('deve descriptografar um valor criptografado corretamente', () => {
    const original = '5535999998888';
    const cipher = new Cipher(KEY);
    expect(cipher.decrypt(encryptTest(KEY, original))).toBe(original);
  });

  it('deve retornar string vazia para payload vazio', () => {
    expect(new Cipher(KEY).decrypt('')).toBe('');
  });

  it('deve lançar erro em payload adulterado', () => {
    const enc = encryptTest(KEY, 'dado');
    const adulterado = enc.slice(0, -4) + 'ZZZZ';
    expect(() => new Cipher(KEY).decrypt(adulterado)).toThrow();
  });

  it('deve lançar erro com chave de tamanho incorreto', () => {
    expect(() => new Cipher(Buffer.alloc(16))).toThrow('32 bytes');
  });

  it('deve lançar erro para payload com formato inválido', () => {
    expect(() => new Cipher(KEY).decrypt('invalido')).toThrow('malformado');
  });

  it('deve lançar erro para versão não suportada', () => {
    const enc = encryptTest(KEY, 'x').replace('v1.', 'v9.');
    expect(() => new Cipher(KEY).decrypt(enc)).toThrow('nao suportada');
  });
});
