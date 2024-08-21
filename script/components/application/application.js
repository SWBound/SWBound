export class APPLICATION extends HTMLElement {
  #shadow;

  #template;

  #pendingData;

  #controls = {};

  #drawParams = {
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    scale: 1,

    longTapTimeout: null,
    isLongTap: false,

    movableEvent: null,
  };

  constructor() {
    super();

    this.#shadow = this.attachShadow({ mode: "open" });

    this.#template = this.#initializeTemplateParser()
      .then(this.#render)
      .then(this.#setup)
      .catch(APPLICATION.logger.error);
  }

  async #initializeTemplateParser() {
    const [cssResponse, htmlResponse] = await Promise.all([
      APPLICATION.windowProvider.fetch(
        new URL(APPLICATION.stylePath, new URL(import.meta.url)).href
      ),
      APPLICATION.windowProvider.fetch(
        new URL(APPLICATION.templatePath, new URL(import.meta.url)).href
      ),
    ]);
    const [styleContent, templateContent] = await Promise.all([
      cssResponse.text(),
      htmlResponse.text(),
    ]);
    const style = APPLICATION.documentProvider.createElement("style");
    style.textContent = styleContent;
    this.#shadow.append(style);
    return templateContent;
  }

  #render = (templateContent) => {
    const template = APPLICATION.documentProvider.createElement("template");
    template.innerHTML = APPLICATION.templateParser?.parse(templateContent, {
      title: this.getAttribute("data-title"),
      brainSlotAvailable: false,
      chartSlotAvailable: !!APPLICATION.windowProvider.Chart,
      gameSlotAvailable: true,
    });
    this.#shadow.appendChild(template.content.cloneNode(true));
  };

  #setup = async () => {
    this.#controls = {
      styleSheets: this.#shadow.querySelector(".style"),
    };
  };

  connectedCallback() {
    if (this.#pendingData) {
      this.data = this.#pendingData;
      this.#pendingData = null;
    }
  }

  disconnectedCallback() {
  }
}
