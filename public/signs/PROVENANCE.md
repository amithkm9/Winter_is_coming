# Local ASL handshape illustrations

These six files are bundled locally so the guide works without a third-party
video player or network connection. They depict ASL handshapes; they do not
establish that the game's supplied recognition model was trained on ASL.

## Letters

The following SVGs are unchanged downloads from Wikimedia Commons. Each file's
description identifies WPClipart as its author and records the author's worldwide
public-domain release (or unconditional permission where that release is not
legally possible).

| Local file | File description and license | Download |
| --- | --- | --- |
| `asl-a.svg` | https://commons.wikimedia.org/wiki/File:Sign_language_A.svg | https://upload.wikimedia.org/wikipedia/commons/2/27/Sign_language_A.svg |
| `asl-b.svg` | https://commons.wikimedia.org/wiki/File:Sign_language_B.svg | https://upload.wikimedia.org/wikipedia/commons/1/18/Sign_language_B.svg |
| `asl-c.svg` | https://commons.wikimedia.org/wiki/File:Sign_language_C.svg | https://upload.wikimedia.org/wikipedia/commons/e/e3/Sign_language_C.svg |

Original collection credited by Commons:
http://www.wpclipart.com/sign_language/American_ABCs/index.html

## Numbers

`asl-1.png`, `asl-2.png`, and `asl-3.png` are lossless crops from the WPClipart
“ASL alphabet and numbers chart” reproduced on **page 9** of the University of
California Agriculture and Natural Resources' 14-page American Sign Language
handout: https://ucanr.edu/media/256252

The page explicitly credits **“wpclipart.com - public domain images”** and gives
the original image address:
http://www.wpclipart.com/sign_language/ASL_alphabet.png

The original WPClipart site timed out when checked; the university-hosted chart
preserves both the source URL and the public-domain statement. The PDF was also
retrieved through the legacy URL
https://ucanr.edu/?legacy-file=282521.pdf&legacy-file-path=sites%2FSoCo%2Ffiles%2F
which currently resolves to the same 14-page handout. No other material from that
handout is included, and this note does not claim its other pages are public domain.

The embedded page image is 2544 × 3296 pixels. Extraction used `pdfimages -png`;
crop rectangles below are `(x, y, width, height)` in the original page image.
Only white margins and other chart entries were removed; the hand anatomy,
orientation, linework, and proportions were not changed.

| Local file | Crop rectangle | Depicted shape |
| --- | --- | --- |
| `asl-1.png` | `(310, 1490, 200, 250)` | Index finger extended |
| `asl-2.png` | `(510, 1490, 200, 250)` | Index and middle fingers extended and separated |
| `asl-3.png` | `(700, 1490, 230, 250)` | Thumb, index, and middle fingers extended; ring and little fingers folded |

## Orientation and reference notes

The number drawings show the **palm toward the viewer** so the shape is visible.
For casually signed, isolated ASL numbers 1–5, the usual orientation is **palm
toward the signer**. Number sequences and other contexts can use palm-out forms.
The guide must explain this distinction rather than instructing the player to
copy the drawing's orientation without context.

ASL University reference for number orientation:
https://www.lifeprint.com/asl101/pages-signs/n/numbers1-10.htm

ASL University reference confirming that 3 uses thumb, index, and middle fingers:
https://www.lifeprint.com/asl101/pages-signs/t/three.htm

The letter B illustration shows a folded-thumb variant; thumb placement varies
in natural fingerspelling. See:
https://www.lifeprint.com/asl101/pages-signs/b/b.htm

Checked 2026-09-26: all six local images were rendered and visually inspected.
The SVGs contain no scripts, foreignObject elements, href references, or CSS
url() references. SVG metadata contains namespace/credit URLs, which do not load
external resources. No AI-generated hand imagery is used.
