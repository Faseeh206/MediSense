function frames(side, spin, rising) {
  return Array.from({ length: 31 }, (_, index) => {
    const t = index / 30;
    const back = 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;
    const amount = rising ? 1 - back : t ** 3;
    const x = side * 115 * Math.sin(amount * Math.PI / 2), y = 115 * (1 - Math.cos(amount * Math.PI / 2));
    return { offset: t, transform: `translate(${x}%,${y}%) rotate(${side * spin * amount}deg) scale(${rising ? 1 - .28 * amount : 1})`, opacity: rising ? Math.min(1, t / .3) : t < .55 ? 1 : (1 - t) / .45 };
  });
}
export const THEME_ICON_FRAMES = { moonSets: frames(-1, 25, false), moonRises: frames(-1, 25, true), sunSets: frames(1, 120, false), sunRises: frames(1, 120, true) };
