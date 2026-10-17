# Ikony mapy

Styl „płaski kontrast” (wariant 3 z rundy naklejek) wybrał Paweł 17.10 około 16:00. Generator: fal `flux-2-pro`, 768×768, paleta: Głębia `#17706F`, mięta `#8ED1B5`, koral `#F2755F`. Galeria zestawu: https://claude.ai/artifact/LzTXCk53xHXhSTbTMbG7w8

Tramwaj (`10`) wygenerowany jeszcze raz o 17:05 z pantografem i szynami, bo pierwsza wersja wyglądała jak przód autobusu.

Szablon promptu:

> 2D flat icon of {obiekt}, bold flat saturated color shapes, high contrast, no border, no outline, no shadow, deep teal #17706F, mint #8ED1B5 and coral #F2755F accent. Single object centered on a plain off-white background, no text, no letters, simple, minimal detail, readable at small size, object fills about 80% of the frame.

## Pliki

- `00-kamienica.png` … `17-powietrze.png`: oryginały z kremowym tłem.
- `web/*.webp`: podglądy 384 px.
- W aplikacji: `apps/web/public/map-icons/{kind}.png`, 96 px, przezroczyste tło i biała obwódka, rejestrowane w MapLibre z `pixelRatio: 2`.

| Plik | Na mapie |
| --- | --- |
| 00 kamienica | `building` |
| 01 pomnik | `monument` |
| 02 tablica | `plaque` |
| 03 ulica | `street` |
| 04 pinezka | `site` (i zapas dla nieznanego rodzaju) |
| 05 mural | `mural` |
| 06 wydarzenie | `event` |
| 07 kościół | `church` |
| 08 cmentarz | `cemetery` |
| 09 przystanek | `stop`: wsiadanie i przesiadki na trasie |
| 10 tramwaj, 11 autobus | `tram`, `bus`: do pojazdów na żywo |
| 12–17 | parking, roboty, AED, boisko, zajęcia, powietrze: na razie nieużywane |

Wycinanie tła: `cut_icons.py` (zalewanie od krawędzi kolorem tła, miękka krawędź alfa, biała obwódka). Nową ikonę wygeneruj tym samym promptem, a potem:

```sh
python3 docs/ui/ikony-mapy/cut_icons.py docs/ui/ikony-mapy apps/web/public/map-icons building=00-kamienica.png
```
