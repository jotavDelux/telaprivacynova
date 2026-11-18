import { describe, expect, it } from 'vitest';
import { mediaForFilter, profileMedia } from '@/lib/profile-media';

describe('Preserved source media rules', () => {
  it('contains 50 source media entries', () => {
    expect(profileMedia).toHaveLength(50);
  });
  it('limits the gallery to three full rows of three', () => {
    expect(mediaForFilter('all')).toHaveLength(9);
  });
  it('shows only videos under the video filter', () => {
    expect(mediaForFilter('videos').map(item => item.index)).toEqual([0, 3, 6, 9, 12, 15, 18, 21, 24]);
  });
  it('shows only paid media under the paid filter', () => {
    expect(mediaForFilter('paid').map(item => item.index)).toEqual([0, 4, 8, 12, 16, 20, 24, 28, 32]);
  });
});