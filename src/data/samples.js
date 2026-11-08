import art0 from '../assets/art0.jpg';
import art1 from '../assets/art1.jpg';
import art2 from '../assets/art2.jpg';
import art3 from '../assets/art3.jpg';
import art4 from '../assets/art4.jpg';

// These images were already in the repository. Do not invent missing catalog attribution.
export const samples = [art0, art1, art2, art3, art4].map((url, index) => ({
  id: `sample-${index}`, url, title: `Sample artwork ${index + 1}`,
  artist: 'Artist unknown', dated: 'Date unknown', credit: 'Credit not provided',
}));
