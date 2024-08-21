export class ManeuverData {
    constructor({attackModifier, defenceModifier, forceDefenceModifier, isMastery, isBase, isStarter} = {
        attackModifier: 0,
        defenceModifier: 0,
        forceDefenceModifier: 0,
        isMastery: false,
        isBase: false,
        isStarter: false
    }) {
        this.attackModifier = attackModifier;
        this.forceDefenceModifier = forceDefenceModifier;
        this.defenceModifier = defenceModifier;
        this.isMastery = isMastery;
        this.isBase = isBase;
        this.isStarter = isStarter;
    }
}

export class MANEUVER extends HTMLElement {

    #shadow;

    #template;
    #templateContent = "";

    #pendingData;


    static get observedAttributes() {
        return ["selected", 
            "data-title", 
            "data-details", 
            "data-attack-modifier", 
            "data-defence-modifier", 
            "data-force-defence-modifier",
            "data-is-mastery", 
            "data-is-starter",
        ];
    }

    constructor() {
      super();
  
      this.#shadow = this.attachShadow({ mode: "open" });
  
      this.#template = this.#initializeTemplateParser()
        .then(this.#render)
        .catch(MANEUVER.logger.error);
    }

    async #initializeTemplateParser() {
        const [cssResponse, htmlResponse] = await Promise.all([
            MANEUVER.windowProvider.fetch(
                new URL(MANEUVER.stylePath, new URL(import.meta.url)).href
            ),
            MANEUVER.windowProvider.fetch(
                new URL(MANEUVER.templatePath, new URL(import.meta.url)).href
            ),
        ]);
        const [styleContent, templateContent] = await Promise.all([
            cssResponse.text(),
            htmlResponse.text(),
        ]);
        const style = MANEUVER.documentProvider.createElement("style");
        style.textContent = styleContent;
        this.#shadow.append(style);
        this.#templateContent = templateContent;
        return templateContent;
    }

    #render = () => {
        const template = MANEUVER.documentProvider.createElement("template");
        template.innerHTML = MANEUVER.templateParser?.parse(this.#templateContent, {
            title: this.getAttribute("data-title"),
            details: this.getAttribute("data-details"),
            attackModifier: this.getAttribute('data-attack-modifier'),
            defenceModifier: this.getAttribute('data-defence-modifier'),
            forceDefenceModifier: this.getAttribute('data-force-defence-modifier'),
            isBase: this.getAttribute('data-is-base'),
            isMastery: this.getAttribute('data-is-mastery'),
            isStarter: this.getAttribute('data-is-starter'),
            isSelected: this.getAttribute('selected'),
          });
        this.#shadow.querySelector('.maneuver')?.remove();
        this.#shadow.appendChild(template.content.cloneNode(true));
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
          MANEUVER.logger.error(err);
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
        if (MANEUVER.observedAttributes?.includes(name)) {
            this.#render();
        }
    }
}
