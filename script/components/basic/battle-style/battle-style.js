export class BATTLE_STYLE extends HTMLElement {
  #shadow;

  #template;
  #templateContent = "";

  #pendingData;

  #controls = {
    maneuvers: [],
    selectedManeuver: null,
  };

  #sheetLongPressTimer = null;
  #addingManeuverTimer = null;
  #isLongTap = false;

  constructor() {
    super();

    this.#shadow = this.attachShadow({ mode: "open" });

    this.#template = this.#initializeTemplateParser()
      .then(this.#render)
      .then(this.#setup)
      .catch(BATTLE_STYLE.logger.error);
  }

  async #initializeTemplateParser() {
    const [cssResponse, htmlResponse] = await Promise.all([
      BATTLE_STYLE.windowProvider.fetch(
        new URL(BATTLE_STYLE.stylePath, new URL(import.meta.url)).href
      ),
      BATTLE_STYLE.windowProvider.fetch(
        new URL(BATTLE_STYLE.templatePath, new URL(import.meta.url)).href
      ),
    ]);
    const [styleContent, templateContent] = await Promise.all([
      cssResponse.text(),
      htmlResponse.text(),
    ]);
    const style = BATTLE_STYLE.documentProvider.createElement("style");
    style.textContent = styleContent;
    this.#shadow.append(style);
    this.#templateContent = templateContent;
    return templateContent;
  }

  #render = (data = {}) => {
    if (typeof data === "string") {
      data = {
        maneuvers: [],
      };
    }

    const template = BATTLE_STYLE.documentProvider.createElement("template");
    const ms = BATTLE_STYLE.jsonProvider.parse(this.getAttribute("data-maneuvers")) || [];
    console.log("4", ms);
    template.innerHTML = BATTLE_STYLE.templateParser?.parse(
      this.#templateContent,
      {
        title: this.getAttribute("data-title"),
        description: this.getAttribute("data-description"),
        requirements: this.getAttribute("data-requirements"),
      }
    );
    this.#shadow.querySelector(".style")?.remove();
    this.#shadow.appendChild(template.content.cloneNode(true));
  };

  #setup = async () => {
    this.#controls = {
      ...this.#controls,
      sheet: this.#shadow.querySelector(".content"),
      infiniteCanvas: this.#shadow.querySelector(".content__grid"),
      longTapIndicator: this.#shadow.querySelector(".indicator"),
      requirements: this.#shadow.querySelector(".requirements__container"),
      maneuverSettings: this.#shadow.querySelector(".maneuver-settings"),
      styleTitle: this.#shadow.querySelector(".header__title"),
      styleDescription: this.#shadow.querySelector(".header__description"),
      toolbar: this.#shadow.querySelector("#toolbar"),
      saveBtn: this.#shadow.querySelector("#saveBtn"),
      loadBtn: this.#shadow.querySelector("#loadBtn"),
      fileInput: this.#shadow.querySelector("#fileInput"),
    };

    this.#controls.styleTitle.addEventListener("change", (e) => {
      this.setAttribute("data-title", e.target.value);
    });

    this.#controls.styleDescription.addEventListener("change", (e) => {
      this.setAttribute("data-description", e.target.value);
    });

    this.#controls.sheet.addEventListener(
      "mousedown",
      this.#sheetMouseDownHandler
    );

    this.#controls.sheet.addEventListener(
      "mousemove",
      this.#sheetMouseMoveHandler
    );

    this.#controls.sheet.addEventListener(
      "contextmenu",
      (e) => {
        e.preventDefault();
      },
      false
    );

    this.#controls.sheet.addEventListener("mouseup", this.#sheetMouseUpHandler);

    this.#controls.sheet.addEventListener(
      "mouseleave",
      this.#sheetMouseLeaveHandler
    );

    BATTLE_STYLE.documentProvider.addEventListener(
      "keydown",
      this.#onKeyDownHandler
    );

    this.#controls.infiniteCanvas.dataset.width =
      this.#controls.sheet.clientWidth;
    this.#controls.infiniteCanvas.dataset.height =
      this.#controls.sheet.clientHeight;

    this.#shadow.querySelectorAll("[editor]").forEach((element) => {
      element.setAttribute("contenteditable", "true");

      element.addEventListener("focus", () => {
        this.#controls.toolbar.classList.remove("hidden");
      });

      element.addEventListener("blur", () => {
        setTimeout(() => {
          this.#controls.toolbar.classList.add("hidden");
        }, 200);
      });
    });

    this.#shadow.querySelectorAll("#toolbar button").forEach((button) => {
      button.addEventListener("click", () => {
        this.#execCommand(button.dataset.command);
      });
    });

    this.#controls.saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const maneuvers = this.#controls.maneuvers.map((m) => {
        return {
          title: m.dataset.title,
          details: m.dataset.details,
          attackModifier: m.dataset.attackModifier,
          defenceModifier: m.dataset.defenceModifier,
          forceDefenceModifier: m.dataset.forceDefenceModifier,
          isMastery: m.dataset.isMastery,
          isBase: m.dataset.isBase,
          isStarter: m.dataset.isStarter,
          startX: m.dataset.startX,
          startY: m.dataset.startY,
        };
      });

      console.log("maneuvers count", maneuvers.length);

      const data = {
        title: this.#controls.styleTitle.innerHTML,
        description: this.#controls.styleDescription.innerHTML,
        maneuvers: maneuvers,
        requirements: this.#controls.requirements.innerHTML,
      };

      const blob = new Blob([BATTLE_STYLE.jsonProvider.stringify(data)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = BATTLE_STYLE.documentProvider.createElement("a");
      a.href = url;
      a.download = `${data.title}.json`;
      this.#shadow.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    this.#controls.loadBtn.addEventListener("click", () => {
      this.#controls.fileInput.click();
    });

    this.#controls.fileInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = BATTLE_STYLE.jsonProvider.parse(e.target.result);
          this.setAttribute("data-title", data.title);
          this.setAttribute("data-description", data.description);
          this.setAttribute("data-requirements", data.requirements);
          console.log("1", data.maneuvers);
          this.setAttribute("data-maneuvers", BATTLE_STYLE.jsonProvider.stringify(data.maneuvers));
          this.#render();
          this.#setup();
        };
        reader.readAsText(file);
      }
    });

    (BATTLE_STYLE.jsonProvider.parse(this.getAttribute("data-maneuvers")) || []).forEach((m) => {
      console.log("2", m);
      this.#addManeuver(m.startX, m.startY, m);
    });

    this.#updateManeuversPosition();
  };

  #onKeyDownHandler = (e) => {
    if (e.key === "Delete") {
      if (this.#controls.selectedManeuver) {
        e.preventDefault();
        this.#controls.selectedManeuver.remove();
        this.#controls.maneuvers = this.#controls.maneuvers.filter(
          (m) => m !== this.#controls.selectedManeuver
        );
        this.#controls.selectedManeuver = null;
      }
    }
  };

  #sheetMouseDownHandler = (e) => {
    e.preventDefault();
    if (e.button !== 0) {
      return;
    }
    this.#sheetLongPressTimer = setTimeout(() => {
      this.#isLongTap = true;

      const x = e.clientX;
      const y = e.clientY;

      const element = this.#findManeuver(x, y);

      if (element) {
        this.#controls.selectedManeuver?.setAttribute("selected", false);
        this.#controls.maneuverSettings.classList.add("hidden");
        this.#controls.maneuverSettings.maneuver = null;
        this.#controls.selectedManeuver = element;
        this.#controls.selectedManeuver?.setAttribute("selected", true);
        this.#controls.maneuverSettings.classList.remove("hidden");
        this.#controls.maneuverSettings.maneuver =
          this.#controls.selectedManeuver;
      } else {
        const sheetCoords = this.#controls.sheet.getBoundingClientRect();
        const x = e.clientX - sheetCoords.left;
        const y = e.clientY - sheetCoords.top;

        this.#controls.longTapIndicator.style.setProperty(
          "--client-x",
          `${x}px`
        );
        this.#controls.longTapIndicator.style.setProperty(
          "--client-y",
          `${y}px`
        );

        this.#controls.longTapIndicator.classList.remove("hidden");
        this.#controls.selectedManeuver?.setAttribute("selected", false);
        this.#controls.maneuverSettings.classList.add("hidden");
        this.#controls.maneuverSettings.maneuver = null;
        this.#controls.selectedManeuver = null;

        this.#addingManeuverTimer = setTimeout(() => {
          this.#controls.longTapIndicator.classList.add("hidden");
          this.#addManeuver(x, y);
        }, 500);
      }
    }, 100);
  };

  #sheetMouseUpHandler = (e) => {
    clearTimeout(this.#sheetLongPressTimer);
    this.#removeBaselines();
    if (!this.#isLongTap) {
      const x = e.clientX;
      const y = e.clientY;

      const element = this.#findManeuver(x, y);

      if (e.button === 2) {
        console.log("right click");
        if (
          element &&
          this.#controls.selectedManeuver &&
          element !== this.#controls.selectedManeuver
        ) {
          this.#drawArrow(this.#controls.selectedManeuver, element);
        }
        return;
      }

      if (element) {
        this.#controls.selectedManeuver?.setAttribute("selected", false);
        this.#controls.maneuverSettings.classList.add("hidden");
        this.#controls.maneuverSettings.maneuver = null;
        if (this.#controls.selectedManeuver === element) {
          this.#controls.selectedManeuver = null;
        } else {
          this.#controls.selectedManeuver = element;
        }
        this.#controls.selectedManeuver?.setAttribute("selected", true);
        this.#controls.maneuverSettings.classList.remove("hidden");
        this.#controls.maneuverSettings.maneuver =
          this.#controls.selectedManeuver;
      } else {
        this.#controls.selectedManeuver?.setAttribute("selected", false);
        this.#controls.maneuverSettings.classList.add("hidden");
        this.#controls.maneuverSettings.maneuver = null;
        this.#controls.selectedManeuver = null;
      }
    } else {
      clearTimeout(this.#addingManeuverTimer);
      this.#controls.longTapIndicator.classList.add("hidden");
    }
    this.#isLongTap = false;
  };

  #sheetMouseLeaveHandler = (e) => {
    clearTimeout(this.#sheetLongPressTimer);
    clearTimeout(this.#addingManeuverTimer);
    this.#removeBaselines();
    this.#controls.longTapIndicator.classList.add("hidden");
    this.#isLongTap = false;
  };

  #sheetMouseMoveHandler = (e) => {
    if (this.#isLongTap && this.#controls.selectedManeuver) {
      const sheetCoords = this.#controls.sheet.getBoundingClientRect();
      const x = e.clientX - sheetCoords.left;
      const y = e.clientY - sheetCoords.top;

      this.#controls.selectedManeuver.dataset.startX = x;
      this.#controls.selectedManeuver.dataset.startY = y;

      this.#updateManeuversPosition();
      this.#checkAlignment(this.#controls.selectedManeuver);
    } else {
      clearTimeout(this.#sheetLongPressTimer);
      clearTimeout(this.#addingManeuverTimer);
      this.#controls.longTapIndicator.classList.add("hidden");
    }
  };

  #findManeuver = (x, y) => {
    const el = this.#shadow.elementFromPoint(x, y);
    if (el && el.classList.contains("maneuver")) {
      return el;
    }
    return null;
  };

  #updateManeuversPosition = () => {
    this.#controls.maneuvers.forEach((m) => {
      const startX = parseFloat(m.dataset.startX);
      const startY = parseFloat(m.dataset.startY);

      m.style.setProperty("--client-x", `${startX}px`);
      m.style.setProperty("--client-y", `${startY}px`);
    });
  };

  #addManeuver = (
    startX,
    startY,
    data = {
      attackModifier: "d2",
      forceDefenceModifier: "d2",
      defenceModifier: "d2",
      isMastery: true,
      title: "Attack",
      details: "This is an attack maneuver.",
      isBase: false,
      isStarter: false,
    }
  ) => {
    const maneuver =
      BATTLE_STYLE.documentProvider.createElement("app-maneuver");

    maneuver.classList.add("maneuver");
    maneuver.style.setProperty("--client-x", `${startX}px`);
    maneuver.style.setProperty("--client-y", `${startY}px`);

    maneuver.dataset.startX = startX;
    maneuver.dataset.startY = startY;
    maneuver.dataset.attackModifier = data.attackModifier;
    maneuver.dataset.defenceModifier = data.defenceModifier;
    maneuver.dataset.forceDefenceModifier = data.forceDefenceModifier;
    maneuver.dataset.isMastery = data.isMastery;
    maneuver.dataset.title = data.title;
    maneuver.dataset.details = data.details;
    maneuver.dataset.isBase = data.isBase;
    maneuver.dataset.isStarter = data.isStarter;

    this.#controls.maneuvers.push(maneuver);

    this.#controls.sheet.appendChild(maneuver);
    //maneuver.value = data;
  };

  #drawArrow(from, to) {
    const arrow = BATTLE_STYLE.documentProvider.createElement("div");
    arrow.classList.add("arrow");
    
    const fromRect = from.getBoundingClientRect();

    const circleRadius = Math.min(fromRect.width, fromRect.height) / 2;

    let startX = parseFloat(from.dataset.startX); 
    let startY = parseFloat(from.dataset.startY);
    let endX = parseFloat(to.dataset.startX);
    let endY = parseFloat(to.dataset.startY);


    if(endX < startX) {
      arrow.style.setProperty('--transform-x', 'scaleX(-1)');
    } else {
      arrow.style.setProperty('--transform-x', 'scaleX(1)');
    }

    if(endY < startY) {
      arrow.style.setProperty('--transform-y', 'scaleY(-1)');
    } else {
      arrow.style.setProperty('--transform-y', 'scaleY(1)');
    }

    const angleRad = Math.atan((endY - startY) / (endX - startX));
    const angleDeg = angleRad * (180 / Math.PI);

    // if(endX < startX) {
    //   [startX, endX] = [endX, startX];
    // }

    // if(endY < startY) {
    //   [startY, endY] = [endY, startY];
    // }

    // Adjust start and end points to lie on the edges of the circles
    const adjustedStartX = startX;// + circleRadius * Math.cos(angleRad);
    const adjustedStartY = startY;// + circleRadius * Math.sin(angleRad);
    const adjustedEndX = endX;// - circleRadius * Math.cos(angleRad);
    const adjustedEndY = endY;// - circleRadius * Math.sin(angleRad);

    const adjustedLength = Math.sqrt(Math.pow(adjustedEndX - adjustedStartX, 2) + Math.pow(adjustedEndY - adjustedStartY, 2));

    if(endX < startX) {
      console.log('endX < startX', adjustedStartX, adjustedEndX, adjustedStartY, adjustedEndY, adjustedEndX - adjustedStartX, adjustedEndY - adjustedStartY);
    }

    console.log(adjustedLength);
    // const adjustedAngleRad = Math.atan((adjustedEndY - adjustedStartY) / (adjustedEndX - adjustedStartX));
    // const adjustedAngleDeg = adjustedAngleRad * (180 / Math.PI);


    
    // Set CSS variables using the computed values
    arrow.style.setProperty('--length', `${adjustedLength}px`);
    arrow.style.setProperty('--start-x', `${adjustedStartX}px`);
    arrow.style.setProperty('--start-y', `${adjustedStartY}px`);
    arrow.style.setProperty('--angle', `${angleDeg}deg`);

    //arrow.style.setProperty('--arrow-angle', `${angle * 180 / Math.PI}deg`);

    this.#controls.sheet.appendChild(arrow);
  }

  #checkAlignment = (activeManeuver) => {
    let activeManeuverBounds = activeManeuver.getBoundingClientRect();
    this.#removeBaselines();

    let snapped = { top: false, left: false };
    const snapThreshold = 5;

    this.#controls.maneuvers.forEach((m) => {
      if (m !== activeManeuver) {
        let bounds = m.getBoundingClientRect();

        if (Math.abs(activeManeuverBounds.left - bounds.left) < snapThreshold) {
          this.#createBaseline("vertical", bounds.left);
          activeManeuver.dataset.startX = m.dataset.startX;
          this.#updateManeuversPosition();
        }

        if (
          Math.abs(activeManeuverBounds.right - bounds.right) < snapThreshold
        ) {
          this.#createBaseline("vertical", bounds.right);
          activeManeuver.dataset.startX = m.dataset.startX;
          this.#updateManeuversPosition();
        }

        if (Math.abs(activeManeuverBounds.top - bounds.top) < snapThreshold) {
          this.#createBaseline("horizontal", bounds.top);
          activeManeuver.dataset.startY = m.dataset.startY;
          this.#updateManeuversPosition();
        }

        if (
          Math.abs(activeManeuverBounds.bottom - bounds.bottom) < snapThreshold
        ) {
          this.#createBaseline("horizontal", bounds.bottom);
          activeManeuver.dataset.startY = m.dataset.startY;
          this.#updateManeuversPosition();
        }
      }
    });
  };

  #createBaseline = (type, position) => {
    let baseline = BATTLE_STYLE.documentProvider.createElement("div");
    baseline.classList.add("baseline");
    if (type === "vertical") {
      baseline.classList.add("vertical-baseline");
      baseline.style.left = position + "px";
      baseline.style.top = "0px";
    } else if (type === "horizontal") {
      baseline.classList.add("horizontal-baseline");
      baseline.style.top = position + "px";
      baseline.style.left = "0px";
    }
    this.#shadow.appendChild(baseline);
  };

  #removeBaselines = () => {
    this.#shadow
      .querySelectorAll(".baseline")
      .forEach((baseline) => baseline.remove());
  };

  connectedCallback() {
    if (this.#pendingData) {
      this.data = this.#pendingData;
      this.#pendingData = null;
    }
  }

  disconnectedCallback() {}

  #execCommand(command) {
    BATTLE_STYLE.documentProvider.execCommand(command, false, null);
  }
}
