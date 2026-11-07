# Smart Whiteboard

A WebSocket-based whiteboard application that allows you to draw on your mobile device and see the results on your PC screen in real-time.

## Network Requirements

- The PC and mobile device must be on the same local network.
- Ports 80 (HTTP) and 8080 (WebSocket) must be open on the host machine.

## Installation Instructions

1. **Install PHP**: Make sure you have PHP 7.4+ installed and added to your system PATH.
2. **Install Composer**: Download and install Composer from [getcomposer.org](https://getcomposer.org/download/).
3. **Install Dependencies**: Open a terminal in the project root directory and run:

   ```bash
   composer install
   ```

## Starting the Server

1. Run the included batch file `start.bat` by double-clicking it, or from the terminal:

   ```bash
   start.bat
   ```

2. Alternatively, you can start the WebSocket server manually:

   ```bash
   php server.php
   ```

## Usage

- **PC**: Open `public/pc.html` in your web browser (preferably through a local web server, e.g., `http://localhost/Smart-whiteboard/public/pc.html`).
- **Mobile**: Scan the QR code displayed on the PC screen or navigate to `public/mobile.html` using the PC's local IP address.

### Keyboard shortcuts (PC)

| Shortcut | Action |
| --- | --- |
| `Ctrl` + `Z` | Undo |
| `Ctrl` + `Y` / `Ctrl` + `Shift` + `Z` | Redo |
| `Escape` | Close the settings / debug panel |

---

## Interface & design system

The UI is deliberately **flat**: solid surfaces, 1 px separators, a single accent colour, no gradients, no backdrop blur and no drop shadows. Every icon is a stroke SVG — there is no emoji and no icon font in the interface.

### Files

| File | Role |
| --- | --- |
| `assets/css/common.css` | Design tokens + shared components (buttons, segmented controls, tooltips, status dots). Loaded by every page. |
| `assets/css/pc.css` | PC layout: top bar, tool rail, settings panel, status bar. |
| `assets/css/mobile.css` | Mobile layout: join screen, drawing screen, bottom sheet. |
| `assets/js/common/Icons.js` | SVG icon library, injected once as a `<symbol>` sprite. |

### Design tokens

All colours, radii and metrics live in `:root` in `common.css`. Restyling the application means editing that block only:

```css
--bg-app, --bg-bar, --bg-panel     /* surfaces            */
--surface-1 … --surface-3          /* controls            */
--border, --border-strong          /* 1 px separators     */
--text, --text-muted, --text-faint /* typographic scale   */
--accent, --accent-soft            /* single accent colour */
--radius, --radius-lg              /* 6 px / 10 px        */
```

### Using an icon

`Icons.js` must be the first script in `<body>` so the sprite exists before any markup is parsed.

```html
<svg class="icon" aria-hidden="true"><use href="#i-pen"></use></svg>
```

From JavaScript:

```js
element.innerHTML = Icons.html('check');   // markup string
Icons.set(element, 'trash');               // replaces the content
```

Icon size is controlled by `icon`, `icon-sm` and `icon-xs` classes; colour and stroke weight follow `currentColor` (`stroke-width: 1.75` by default).

### Adding an icon

Add one entry to the `PATHS` map at the top of `Icons.js` — a 24 × 24 `viewBox` body using `path` / `rect` / `circle` primitives:

```js
myIcon: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17"/>',
```

It is then available as `#i-myIcon`.

### Conventions

- Toolbars use icon-only buttons with `data-tip="…"` (desktop) and an `aria-label`; the mobile UI uses `aria-label` only.
- `<button class="icon-btn">` = icon-only control, `class="btn btn-primary"` = filled action.
- Text labels use sentence case; section headings are 11 px uppercase with `letter-spacing: .07em`.
- Transitions are limited to `background-color`, `border-color` and `color` (120 ms) and are disabled by `prefers-reduced-motion`.
