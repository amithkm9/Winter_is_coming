import { showOpeningFilm } from './opening-film';
import { consumeWinterReset } from './reset';
import './styles/opening-film.css';

// Relative URLs survive itch.io's nested HTML5 upload paths.
let opening: ReturnType<typeof showOpeningFilm> | undefined;
try {
  consumeWinterReset(window);
  opening = showOpeningFilm(document.body, {
    source: `${import.meta.env.BASE_URL}video/opening-subtitled.mp4`,
    poster: `${import.meta.env.BASE_URL}video/opening-poster.jpg`,
    onContinue: () => import('./main'),
  });
} catch {
  const notice = document.createElement('section');
  notice.innerHTML =
    '<h1>Could not reset your adventure</h1><p>Your browser did not allow the saved data to be cleared. Allow site storage, then retry.</p><button type="button">TRY RESET AGAIN</button>';
  notice.querySelector('button')!.onclick = () => location.reload();
  document.body.append(notice);
}
if (import.meta.hot) import.meta.hot.dispose(() => opening?.dispose());
