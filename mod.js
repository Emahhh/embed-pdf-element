// @ts-check

/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

const style = `
:host {
  display: block;
  width: 300px;
  height: 150px;
}
iframe {
  width: 100%;
  height: 100%;
  border: none;
}
`;

/** @type {Record<string, Promise<string>>} */
const viewerHtmlCache = {};

/** @param {HTMLElement} ctx */
async function render(ctx) {
  const iframe = document.createElement("iframe");

  const file = ctx.getAttribute("src");
  if (!file) {
    throw new Error("plese set `src` attribute to <embed-pdf> element.");
  }
  const fileUrl = new URL(file, location.href);

  viewerHtmlCache[EmbedPdf.viewerUrl] ??= (async () => {
    const res = await fetch(EmbedPdf.viewerUrl);
    return await res.text();
  })();
  const text = await viewerHtmlCache[EmbedPdf.viewerUrl];
  // inject script tag
  const html = text
    .replace(
      '<meta charset="utf-8">',
      // Sets the base path for assets loaded with relative paths from within viewer.html.
      `<meta charset="utf-8"><base href="${EmbedPdf.viewerUrl}">`,
    )
    .replace(
      '<script src="viewer.js"></script>',
      // Tells pdf.js which file to load. See also https://github.com/ayame113/embed-pdf-element/issues/1 .
      `<script src="viewer.js"></script>
      <script>PDFViewerApplicationOptions.set("defaultUrl", "${fileUrl}");</script>`,
    );

  const blob = new Blob([html], { type: "text/html" });
  iframe.src = URL.createObjectURL(blob);

  return iframe;
}

/**
 * An HTML element that can embed a pdf file.
 *
 * First, insert a script tag into your HTML. Next, place the `<embed-pdf>` tag.
 * Finally, set the file path in the src attribute of the `<embed-pdf>` tag.
 *
 * ```html
 * <script src="https://deno.land/x/embed_pdf@$MODULE_VERSION/mod.js" type="module"></script>
 * <embed-pdf src="./path/to/file.pdf"></embed-pdf>
 * ```
 *
 * ![screenshot](./_tools/screenshot.png)
 *
 * By default, this library uses pdf.js in the vendor directory to render PDFs.
 * Alternatively, to use the latest version of pdf.js directly from the official
 * site, set it using JavaScript as follows:
 *
 * ```js
 * import { EmbedPdf } from "https://deno.land/x/embed_pdf@$MODULE_VERSION/mod.js";
 *
 * // Specify the path to viewer.html. The default URL is https://deno.land/x/embed_pdf@$MODULE_VERSION/vendor/pdfjs/web/viewer.html .
EmbedPdf.viewerUrl = "https://mozilla.github.io/pdf.js/web/viewer.html";
 * ```
 */
export class EmbedPdf extends HTMLElement {
  static viewerUrl = new URL("./vendor/pdfjs/web/viewer.html", import.meta.url)
    .toString();
  #shadowRoot;
  constructor() {
    super();
    this.#shadowRoot = this.attachShadow({ mode: "closed" });
    const styleSheet = new CSSStyleSheet();
    styleSheet.replace(style);
    this.#shadowRoot.adoptedStyleSheets = [styleSheet];
  }
  async connectedCallback() {
    this.#shadowRoot.append(await render(this));
  }
  disconnectedCallback() {
    this.#shadowRoot.innerHTML = "";
  }
}
customElements.define("embed-pdf", EmbedPdf);
