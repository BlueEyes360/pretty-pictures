export const records = Array.from({ length: 3 }, (_, index) => ({
  objectid: index,
  primaryimageurl: `https://images.example.test/art-${index}.jpg`,
  title: `Artwork ${index}`,
  people: [{ name: `Artist ${index}`, role: 'Artist' }],
  provenance: `Previous owner ${index}`,
  dated: '1900',
  creditline: `Museum ${index}`,
}));
export const response = data => ({ ok: true, json: async () => data });
