export class MANEUVER_SETTINGS extends HTMLElement {

    #shadow;

    #template;
    #templateContent = "";

    #pendingData;

    #maneuver;


    static get observedAttributes() {
        return ["maneuver"];
    }

    constructor() {
      super();
  
      this.#shadow = this.attachShadow({ mode: "open" });
  
      this.#template = this.#initializeTemplateParser()
        .then(this.#render)
        .then(this.#setup)
        .catch(MANEUVER_SETTINGS.logger.error);
    }

    async #initializeTemplateParser() {
        const [cssResponse, htmlResponse] = await Promise.all([
            MANEUVER_SETTINGS.windowProvider.fetch(
                new URL(MANEUVER_SETTINGS.stylePath, new URL(import.meta.url)).href
            ),
            MANEUVER_SETTINGS.windowProvider.fetch(
                new URL(MANEUVER_SETTINGS.templatePath, new URL(import.meta.url)).href
            ),
        ]);
        const [styleContent, templateContent] = await Promise.all([
            cssResponse.text(),
            htmlResponse.text(),
        ]);
        const style = MANEUVER_SETTINGS.documentProvider.createElement("style");
        style.textContent = styleContent;
        this.#shadow.append(style);
        this.#templateContent = templateContent;
        return templateContent;
    }

    #render = () => {
        const template = MANEUVER_SETTINGS.documentProvider.createElement("template");
        template.innerHTML = MANEUVER_SETTINGS.templateParser?.parse(this.#templateContent, {
            title: this.#maneuver?.dataset.title,
            details: this.#maneuver?.dataset.details,
            attackModifier: this.#maneuver?.dataset.attackModifier,
            defenceModifier: this.#maneuver?.dataset.defenceModifier,
            forceDefenceModifier: this.#maneuver?.dataset.forceDefenceModifier,
            isMastery: this.#maneuver?.dataset.isMastery,
            isStarter: this.#maneuver?.dataset.isStarter,
        });
        this.#shadow.querySelector('.maneuver-settings')?.remove();
        this.#shadow.appendChild(template.content.cloneNode(true));
    };

    #setup = () => {
        this.#shadow.querySelectorAll('.maneuver-settings__input').forEach((input) => {
            input.addEventListener('input', (event) => {

                if (!this.#maneuver) {
                    return;
                }

                switch(event.target.id) {
                    case 'title':
                        this.#maneuver.dataset.title = event.target.value;
                        break;
                    case 'details':
                        this.#maneuver.dataset.details = event.target.value;
                        break;
                    case 'attack-modifier':
                        this.#maneuver.dataset.attackModifier = event.target.value;
                        break;
                    case 'defence-modifier':
                        this.#maneuver.dataset.defenceModifier = event.target.value;
                        break;
                    case 'force-defence-modifier':
                        this.#maneuver.dataset.forceDefenceModifier = event.target.value;
                        break;
                    case 'is-mastery':
                        this.#maneuver.dataset.isMastery = event.target.checked;
                        break;
                    case 'is-starter':
                        this.#maneuver.dataset.isStarter = event.target.checked;
                        break;
                }
            });
        });
    }

    set maneuver(value) {
      if (!this.isConnected) {
        this.#pendingData = value;
        return;
      }

      this.#maneuver = value;
  
      this.#template
        .then((_) => {
          this.#render();
          this.#setup();
        })
        .catch((err) => {
          MANEUVER_SETTINGS.logger.error(err);
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
        this.#render();
    }
}
