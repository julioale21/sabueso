import { describe, expect, it } from 'vitest';
import { VERSION } from '../src/index.js';

describe('@sabueso/core', () => {
  it('exposes version 0.1.0', () => {
    expect(VERSION).toBe('0.1.0');
  });
});
