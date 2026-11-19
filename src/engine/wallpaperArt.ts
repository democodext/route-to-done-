import midnightHorizonImg from '../assets/images/wallpaper_midnight_horizon_1795025105747.jpg';
import solarImg from '../assets/images/wallpaper_solar_1795025181229.jpg';
import obsidianImg from '../assets/images/wallpaper_obsidian_1795025105915.jpg';
import dreamscapeImg from '../assets/images/wallpaper_dreamscape_1795025118013.jpg';
import { WallpaperTheme } from './wallpaper';

export const THEME_ARTWORK_URLS: Record<WallpaperTheme, string> = {
  midnight_horizon: midnightHorizonImg,
  solar: solarImg,
  obsidian: obsidianImg,
  dreamscape: dreamscapeImg,
};

export function loadThemeArtwork(theme: WallpaperTheme): Promise<HTMLImageElement> {
  const src = THEME_ARTWORK_URLS[theme];
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}
