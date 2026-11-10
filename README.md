# Joseph Oreva — Art & Athletics

A responsive personal portfolio for **Joseph Oreva**, a Nigerian visual artist and competitive long jumper. Developed for professional use and **CIDM 6303 Tech Foundations, Project 1**, with assistance from **Codex, an AI coding agent**. The original ivory, charcoal, terracotta, and lime design and Arial/Georgia typography are preserved.

## Pages and files

- `index.html`: introduction and links to both portfolios.
- `art.html`: artwork gallery, artist statement area, and exhibitions section.
- `athletics.html`: long-jump profile, career details, and results and achievements area.
- `style.css`: shared responsive layouts, colors, typography, hover effects, keyboard focus styles, and reduced-motion support.
- `README.md`: project documentation and preview instructions.

Every page includes the same Home / Art / Athletics navigation, with the current page identified. The site uses semantic HTML and CSS only: no frameworks, JavaScript, backend, API keys, build step, or external dependencies.

## Preview locally

Open `index.html` directly in a web browser, then use the navigation to visit the other pages. All paths are relative, so this works without a server.

Alternatively, open a terminal in this project directory and run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Visit **http://127.0.0.1:8000**. Stop the server with **Ctrl+C**. If port 8000 is occupied, use 8001 and update the address accordingly.

Resize the browser to check mobile layouts. Navigation remains visible on small screens without requiring a menu toggle or JavaScript.

## Add your real content

The portfolio now includes the details Joseph supplied:

- Nigerian visual artist specializing in painting.
- **Oreva**, solo BFA exhibition at **Dord Fitz Gallery**, **December 2025**.
- **2024 and 2025 NCAA Division II outdoor national runner-up** finishes in long jump.
- **All-American honors** and **WTAMU indoor and outdoor long-jump records**.

These facts are owner-supplied, not independently verified. No competition distances, honor counts, additional awards, record dates, artwork titles, or extra biographical details have been added. No claim is made about whether the school records remain current in later seasons.

The first-person artist statement is an editable draft based on Joseph’s requested themes: overlooked moments in sports, realism and abstraction, vulnerability, and resilience. Joseph should review it before professional publication. It is not presented as a sourced quotation. Artwork headings and descriptions are explicitly marked as fields to replace, not invented works.

All image spaces are labeled **IMAGE PLACEHOLDER**. Their abstract CSS backgrounds are decorative stand-ins, not Joseph’s artwork or photographs.

1. Create an `images` folder and add your original artwork and photographs.
2. Replace the relevant `<div class="placeholder …">…</div>` with an image, for example:

   ```html
   <img class="portfolio-image" src="images/my-artwork.jpg"
        alt="A specific description of the actual artwork" width="900" height="1100">
   ```

3. The `.portfolio-image` class is already styled in `style.css`, including context-specific sizing for galleries, homepage panels, and the athletics feature. Replace only the inner placeholder divs in homepage panels so their links stay intact. Artwork images use `object-fit: contain` to preserve the full work; photographs use `object-fit: cover`, so check cropping.
4. In `art.html`, replace each “Artwork title to be added” heading, metadata line, and description with the actual title, medium, dimensions, year, and description. Review the drafted artist statement. Keep the existing exhibition details accurate.
5. Replace the athletics feature and competition gallery placeholders in `athletics.html` with photographs. Add event context, dates, and photographer credits to captions. Adjust feature framing to leave its overlay readable. Keep the supplied achievements; add distances or further honors only once confirmed.

Use meaningful alternative text for real images. Add only approved contact details if a contact section is needed later.

## Verification and publishing

Local checks verify that all three pages link to one another, the shared stylesheet exists, page titles and active navigation are set, and internal fragment targets resolve. These are structural checks; visual browser review remains pending. Review desktop and mobile layouts, keyboard focus, and photograph cropping before professional publication, especially when adding real images.

The project is kept local. Nothing has been pushed to GitHub or published.
