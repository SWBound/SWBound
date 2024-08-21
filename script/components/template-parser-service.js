export class TemplateParserService {
    constructor() {}

    parse(template, data = {}) {
        template = this.processFor(template, data);
        template = this.processIf(template, data);
        template = template.replace(/{{\s*([^}\s]+)\s*}}/gi, (_, key) => data[key.split(".").pop()] || "");

        return template;
    }

    processFor(template, data) {
        const regexFor = /{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%}([\s\S]+?){%\s*endfor\s*%}/gi;
        let match;

        let output = template;

        for (match of output.matchAll(regexFor)) {
            const loopVariable = match[1];
            const loopArray = data[match[2]];
            const loopBlock = match[3];

            let renderedLoop = "";
            loopArray.forEach((item) => {
                const loopData = {};
                Object.assign(loopData, item);
                renderedLoop += this.parse(loopBlock, loopData);
            });
            output = output.replace(match[0], renderedLoop);
        }

        // while ((match = regexFor.exec(template)) !== null) {
        //     const loopVariable = match[1];
        //     const loopArray = data[match[2]];
        //     const loopBlock = match[3];

        //     let renderedLoop = "";
        //     console.log(loopArray);
        //     loopArray.forEach((item) => {
        //         const loopData = { ...data, [loopVariable]: item };
        //         renderedLoop += this.parse(loopBlock, loopData);
        //     });

        //     template = template.replace(match[0], renderedLoop);
        // }

        return output;
    }

    processIf(template, data) {
        const regexIf = /{%\s*if\s+(\w+)\s*%}([\s\S]+?){%\s*endif\s*%}/gi;

        template = template.replace(regexIf, (match, condition, ifBlockContent) => {
            const conditionValue = data[condition];
            const isTruthy = conditionValue === "true" || conditionValue === true;

            return isTruthy ? ifBlockContent : '';
        });

        return template;
    }
}
