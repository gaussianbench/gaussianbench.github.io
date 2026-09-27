# GaussianBench project website

Static project page for **GaussianBench: Physics-Fidelity Evaluation for Gaussian Scene Representations**.

## Preview locally

From this folder, run:

```powershell
python -m http.server 8000
```

Then open `http://127.0.0.1:8000/`.

## Publish with GitHub Pages

Create a GitHub repository, push this folder, and enable Pages from the repository's default branch. The `.nojekyll` file keeps the static asset paths unchanged.

Before publishing, update the provisional BibTeX entry and add the final arXiv link to `index.html`.

## Layout

- `index.html`: the page
- `static/css/site.css`: all page styles (light/dark tokens at the top)
- `static/js/site.js`: scroll chrome, reveal animations, results matrix, tolerance slider, BibTeX copy, figure lightbox. Results data are transcribed from Tables 7–9 of the paper.
- `static/js/theme-switcher.js`: light/dark toggle

After editing assets, run `python cache_bust.py --apply` to refresh the `?v=` query strings.

## Credits

The site is derived from the SplatSuRe project page and the Nerfies academic project-page template. It uses Font Awesome, Academicons, and Noto Sans under their respective licenses.
