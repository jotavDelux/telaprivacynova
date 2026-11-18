export const profileMedia = Array.from({ length: 50 }, (_, index) => ({
  index,
  kind: index % 3 === 0 ? 'videos' : 'photos',
  paid: index % 4 === 0,
}));
export function mediaForFilter(filter: string) {
  const matching = profileMedia.filter(item => filter === 'all' || item.kind === filter || (filter === 'paid' && item.paid));
  return matching.slice(0, Math.min(Math.floor(matching.length / 3), 3) * 3);
}
