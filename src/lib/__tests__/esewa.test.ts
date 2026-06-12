import { describe, it, expect } from 'vitest';
import { generateEsewaSignature } from '../esewa';

describe('generateEsewaSignature', () => {
  it('returns a base64 string', () => {
    const sig = generateEsewaSignature('secret', 'total_amount=100,transaction_uuid=abc123,product_code=EPAYTEST');
    expect(sig).toBeTruthy();
    expect(typeof sig).toBe('string');
    expect(sig.length).toBeGreaterThan(10);
  });

  it('produces deterministic output for same inputs', () => {
    const msg = 'total_amount=200,transaction_uuid=xyz789,product_code=EPAYTEST';
    const a = generateEsewaSignature('my-key', msg);
    const b = generateEsewaSignature('my-key', msg);
    expect(a).toBe(b);
  });

  it('produces different output for different secrets', () => {
    const msg = 'total_amount=100,transaction_uuid=test,product_code=EPAYTEST';
    const a = generateEsewaSignature('secret1', msg);
    const b = generateEsewaSignature('secret2', msg);
    expect(a).not.toBe(b);
  });
});
