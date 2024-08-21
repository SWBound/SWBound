export class BATTLE_STYLE_GRID extends HTMLElement {

    #shadow;

    #template;
    #templateContent = "";

    #pendingData;

    #controls = {};

      #drawParams = {
        startX: 0,
        startY: 0,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      };

      static get observedAttributes() {
        return ["data-width", "data-height"];
      }

    constructor() {
      super();
  
      this.#shadow = this.attachShadow({ mode: "open" });
  
      this.#template = this.#initializeTemplateParser()
        .then(this.#render)
        .then(this.#setup)
        .catch(BATTLE_STYLE_GRID.logger.error);
    }

    async #initializeTemplateParser() {
        const [cssResponse, htmlResponse] = await Promise.all([
            BATTLE_STYLE_GRID.windowProvider.fetch(
                new URL(BATTLE_STYLE_GRID.stylePath, new URL(import.meta.url)).href
            ),
            BATTLE_STYLE_GRID.windowProvider.fetch(
                new URL(BATTLE_STYLE_GRID.templatePath, new URL(import.meta.url)).href
            ),
        ]);
        const [styleContent, templateContent] = await Promise.all([
            cssResponse.text(),
            htmlResponse.text(),
        ]);
        const style = BATTLE_STYLE_GRID.documentProvider.createElement("style");
        style.textContent = styleContent;
        this.#shadow.append(style);
        this.#templateContent = templateContent;
        return templateContent;
    }

    #render = (data = {}) => {
        if (typeof data === "string") {
            data = {};
        }
        const template = BATTLE_STYLE_GRID.documentProvider.createElement("template");
        template.innerHTML = BATTLE_STYLE_GRID.templateParser?.parse(this.#templateContent, {
          ...data
        });
        this.#shadow.querySelector('canvas')?.remove();
        this.#shadow.appendChild(template.content.cloneNode(true));
    };

    #setup = () => {
        this.#controls = {
            canvas: this.#shadow.querySelector("canvas"),
        };

        this.#resizeCanvas();
        BATTLE_STYLE_GRID.windowProvider.addEventListener("resize", this.#resizeCanvas);

        this.#drawGrid();
    };

    #resizeCanvas = () => {
        if (!this.#controls.canvas) {
            return;
        }

        this.#controls.canvas.width = parseFloat(this.getAttribute("data-width"));
        this.#controls.canvas.height = parseFloat(this.getAttribute("data-height"));
    };
    

    #drawGrid = () => {
        if (!this.#controls.canvas) {
            return;
        }

        const gridSize = 20;
        const gridColor = "#ccc";

        const ctx = this.#controls.canvas.getContext("2d");

        ctx.clearRect(
        0,
        0,
        this.#controls.canvas.width,
        this.#controls.canvas.height
        );

        ctx.save();
        ctx.translate(this.#drawParams.offsetX, this.#drawParams.offsetY);
        ctx.scale(this.#drawParams.scale, this.#drawParams.scale);

        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;

        const startX =
        Math.floor(
            -this.#drawParams.offsetX / this.#drawParams.scale / gridSize
        ) * gridSize;
        const startY =
        Math.floor(
            -this.#drawParams.offsetY / this.#drawParams.scale / gridSize
        ) * gridSize;

        for (
        let x = startX;
        x <
        this.#controls.canvas.width / this.#drawParams.scale -
            this.#drawParams.offsetX / this.#drawParams.scale;
        x += gridSize
        ) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(
            x,
            this.#controls.canvas.height / this.#drawParams.scale -
            this.#drawParams.offsetY / this.#drawParams.scale
        );
        ctx.stroke();
        }

        for (
        let y = startY;
        y <
        this.#controls.canvas.height / this.#drawParams.scale -
            this.#drawParams.offsetY / this.#drawParams.scale;
        y += gridSize
        ) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(
            this.#controls.canvas.width / this.#drawParams.scale -
            this.#drawParams.offsetX / this.#drawParams.scale,
            y
        );
        ctx.stroke();
        }

        ctx.restore();
    };

    set value(value) {
      if (!this.isConnected) {
        this.#pendingData = value;
        return;
      }
  
      this.#template
        .then((_) => {
          this.#render(value);
        })
        .catch((err) => {
            BATTLE_STYLE_GRID.logger.error(err);
        });
    }

    connectedCallback() {
        if (this.#pendingData) {
            this.data = this.#pendingData;
            this.#pendingData = null;
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) {
            return;
        }

        if (name === "data-width" || name === "data-height") {
            this.#resizeCanvas();
            this.#drawGrid();
        }
    }
}
