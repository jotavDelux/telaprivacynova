import { describe, expect, it } from 'vitest';
import { photoSource } from '@/lib/photo-swap';

const shipped = { url: '/__l5e/assets-v1/abc/FOTODECOSTA.jpeg' };

describe('photoSource', () => {
  it('keeps the shipped photo when the field is empty or blank', () => {
    expect(photoSource('', shipped)).toBe(shipped);
    expect(photoSource('   ', shipped)).toBe(shipped);
  });

  it('uses a typed web address unchanged', () => {
    expect(photoSource('https://exemplo.com/foto.jpg', shipped).url).toBe('https://exemplo.com/foto.jpg');
    expect(photoSource('https://exemplo.com/foto.jpg', shipped).url).not.toBe(shipped.url);
  });

  it('serves a bare file name from the public folder', () => {
    expect(photoSource('minha-foto.jpg', shipped).url).toBe('/minha-foto.jpg');
    expect(photoSource('  minha-foto.png  ', shipped).url).toBe('/minha-foto.png');
  });

  it('leaves an absolute path alone', () => {
    expect(photoSource('/fotos/capa.jpg', shipped).url).toBe('/fotos/capa.jpg');
  });
});
