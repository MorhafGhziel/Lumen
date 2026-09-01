/**
 * Sets data-theme on <html> before the first paint.
 *
 * This has to be a blocking inline script. If theme resolution waited for
 * React to hydrate, every dark-mode visitor would get a white flash on each
 * navigation, which is the single most noticeable way a site feels unfinished.
 */
const script = `
(function () {
  try {
    var stored = localStorage.getItem('lumen-theme');
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />;
}
