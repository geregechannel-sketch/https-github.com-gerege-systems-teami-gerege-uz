# Toshi Theme

TEAMI Enterprise / EMCOS EC3-ийн **бүх дэлгэцийн дизайн систем**-ийг гаргаж авсан,
дахин ашиглах боломжтой theme. Амьд аппаас (computed CSS token) олборлож,
**`toshi-theme`** нэрээр багцалсан.

## Файлууд
| Файл | Агуулга |
|------|---------|
| `toshi-theme.css` | Theme өөрөө: design token (light-dark) + компонентын класс (`.toshi-*`) |
| `toshi-theme-preview.html` | Бүх компонентыг харуулсан preview (light/dark toggle-той) |
| `README.md` | Энэ баримт |

## Онцлог
- **Нэг theme, хоёр горим:** токен бүр CSS `light-dark(гэрэл, харанхуй)` — browser
  `color-scheme`-ээр автоматаар сонгоно. Гар аргаар: `<html data-theme="dark|light">`.
- **Фонт:** Roboto (300/400/500/700 + italic), суурь **12px**.
- **Хэлбэр:** өнцөг radius **4px**, товч өндөр **30px**, header **70px**, sidebar **220px**.
- **Өнгө:** HSL суурьтай. Товчлуурын **11 өнгийн** хувилбар (default/green/blue/lightblue/
  red/orange/yellow/purple/crimson/emerald), тус бүр hover/active/disabled төлөвтэй.
- Sidebar бараан нүүрсэн (`hsl(240,6%,17%)`), header цагаан + зөөлөн сүүдэр, KPI карт ногоон.

## Хэрэглэх
```html
<link rel="stylesheet" href="toshi-theme.css">
<body class="toshi">
  <button class="toshi-btn toshi-btn--green">Сохранить</button>
  <input class="toshi-input" placeholder="Код точки">
  <table class="toshi-grid">…</table>
</body>
```
Theme сэлгэх:
```js
document.documentElement.setAttribute('data-theme', 'dark'); // эсвэл 'light'
```

## Компонентын класс
| Класс | Юу |
|-------|-----|
| `.toshi-btn` + `--{color}` | Товчлуур (11 өнгө) |
| `.toshi-header`, `.toshi-header__btn` | Дээд самбар |
| `.toshi-menu`, `.toshi-menu__item` | Хажуугийн цэс (бараан) |
| `.toshi-card`, `.toshi-well`, `.toshi-infobox` | Карт / хайрцаг |
| `.toshi-stat`, `.toshi-stat__value` | KPI хайрцаг (dashboard) |
| `.toshi-input`, `.toshi-select`, `.toshi-checkbox`, `.toshi-radio` | Форм |
| `.toshi-grid` (+ `tr.is-selected`, `.toshi-grid__filter-row`) | Хүснэгт |
| `.toshi-popup`, `.toshi-window` | Popup / цонх |
| `.toshi-tabs`, `.toshi-tab` (+`.is-active`) | Таб |
| `.toshi-panel__head`, `.toshi-accordion__head` | Панел / аккордеон |
| `.toshi-tree`, `.toshi-tree__item` (+`.is-active`) | Цэгийн мод |
| `.toshi-loader` | Спиннер |

## Токен ангилал (`toshi-theme.css` доторх `:root`)
Суурь өнгө/гадаргуу · хүрээ/сүүдэр · текст · header · sidebar · товчлуурын палитр ·
input · checkbox/radio · select · grid/мөр · popup/window · tab · panel · tree ·
calendar · loader · хэмжээ (`--toshi-*`).

## Тэмдэглэл
- Эх аппын GIS хэсэг (ArcGIS/Esri Calcite) өөрийн токентой (`--calcite-*`, `--esri-*`);
  тэдгээрийг Toshi theme-д оруулаагүй (гуравдагч сан). Зөвхөн TOSH-ийн өөрийн токенуудыг авав.
- Preview-г нээхэд `toshi-theme.css` нэг фолдерт байх ёстой.
