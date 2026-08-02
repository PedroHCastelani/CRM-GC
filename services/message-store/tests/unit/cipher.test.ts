import { describe, it, expect } from 'vitest';
import { Cipher } from '../../src/crypto/cipher.js';
import { CHAVE_TESTE } from '../helpers.js';

const c = new Cipher(Buffer.from(CHAVE_TESTE, 'hex'));

describe('Cipher AES-256-GCM (RN-005)', () => {
  it('ida e volta preserva o texto', () => {
    const t = 'Meu filho tem 9 anos e dificuldade de concentracao';
    expect(c.decrypt(c.encrypt(t))).toBe(t);
  });

  it('preserva acentos e emoji', () => {
    const t = 'Ola! Voce atende em Sao Paulo? 🧠';
    expect(c.decrypt(c.encrypt(t))).toBe(t);
  });

  it('gera cifras diferentes para o mesmo texto (IV aleatorio)', () => {
    expect(c.encrypt('igual')).not.toBe(c.encrypt('igual'));
  });

  it('nao vaza o texto claro na cifra', () => {
    expect(c.encrypt('5535999998888')).not.toContain('5535999998888');
  });

  it('trata string vazia', () => {
    expect(c.encrypt('')).toBe('');
    expect(c.decrypt('')).toBe('');
  });

  it('rejeita chave de tamanho invalido', () => {
    expect(() => new Cipher(Buffer.alloc(16))).toThrow(/32 bytes/);
  });

  it('detecta adulteracao do ciphertext', () => {
    const p = c.encrypt('dado sensivel');
    const [v, iv, tag, ct] = p.split('.');
    const alterado = Buffer.from(ct!, 'base64');
    alterado[0] = alterado[0]! ^ 0xff;
    expect(() => c.decrypt(`${v}.${iv}.${tag}.${alterado.toString('base64')}`)).toThrow();
  });

  it('rejeita payload malformado', () => {
    expect(() => c.decrypt('lixo')).toThrow(/malformado/);
  });

  it('rejeita versao desconhecida', () => {
    const p = c.encrypt('x').split('.');
    expect(() => c.decrypt(`v9.${p[1]}.${p[2]}.${p[3]}`)).toThrow(/nao suportada/);
  });

  it('nao descriptografa com outra chave', () => {
    const outra = new Cipher(Buffer.from('b'.repeat(64), 'hex'));
    expect(() => outra.decrypt(c.encrypt('segredo'))).toThrow();
  });

  it('safeEqual compara corretamente', () => {
    expect(Cipher.safeEqual('abc', 'abc')).toBe(true);
    expect(Cipher.safeEqual('abc', 'abd')).toBe(false);
    expect(Cipher.safeEqual('abc', 'abcd')).toBe(false);
  });
});
