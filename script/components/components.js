import {Component} from "./decorators.js";

import { MANEUVER } from "./basic/maneuver/maneuver.js";
import { MANEUVER_SETTINGS } from "./basic/maneuver-settings/maneuver-settings.js";
import { BATTLE_STYLE } from "./basic/battle-style/battle-style.js";
import { BATTLE_STYLE_GRID } from "./basic/battle-style-grid/battle-style-grid.js";

import { APPLICATION } from "./application/application.js";

/**
 * Initializes custom components by defining them in the customElements registry.
 * @param {Window} window - The window object of the page.
 * @param {Document} document - The document object of the page.
 * @param {Console} [logger=console] - The logger object used for logging. Defaults to the console object.
 */
const initializeComponents = (window, document, logger = console) => {
    const componentOptions = {
        templatePath: null,
        stylePath: null,
        windowProvider: window,
        documentProvider: document,
        logger,
    };

    const components = [
        {
            name: "app-maneuver",
            component: MANEUVER,
            templatePath: "./maneuver.html",
            stylePath: "./maneuver.css",
        },
        {
            name: "app-maneuver-settings",
            component: MANEUVER_SETTINGS,
            templatePath: "./maneuver-settings.html",
            stylePath: "./maneuver-settings.css",
        },
        {
            name: "app-battle-style",
            component: BATTLE_STYLE,
            templatePath: "./battle-style.html",
            stylePath: "./battle-style.css",
        },
        {
            name: "app-battle-style-grid",
            component: BATTLE_STYLE_GRID,
            templatePath: "./battle-style-grid.html",
            stylePath: "./battle-style-grid.css",
        },
        {
            name: "app-builder",
            component: APPLICATION,
            templatePath: "./application.html",
            stylePath: "./application.css",
        },
    ];

    components.forEach(({ name, component, templatePath, stylePath }) => {
        if (templatePath && stylePath) {
            componentOptions.templatePath = templatePath;
            componentOptions.stylePath = stylePath;
            window.customElements.define(
                name,
                Component(componentOptions)(component)
            );
        } else {
            window.customElements.define(name, component);
        }
    });
};

export { initializeComponents };
