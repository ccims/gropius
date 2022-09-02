import { Injectable } from "@nestjs/common";

@Injectable()
export class HtmlService {
    /**
     * Generates the html code for a form with specified input fields
     *
     * @param header Text as header for the form
     * @param fields The object of fields with the names of the fields as key
     * @param submitLabel label of the submit button
     * @returns the generated html
     */
    getForm(
        header: string,
        fields: {
            [fieldName: string]: {
                label: string;
                type?: string;
                value?: string;
            };
        },
        action: string,
        method = "get",
        submitLabel = "Submit",
    ): string {
        let html = `<p><form method="${method}" action="${action}">${header}<table><tbody>`;
        for (const fieldName in fields) {
            if (Object.prototype.hasOwnProperty.call(fields, fieldName)) {
                const field = fields[fieldName];
                html += `<tr><td>${field.label}</td><td><input type="${
                    field.type || "text"
                }" name="${fieldName}" value="${field.value || ""}"></td></tr>`;
            }
        }
        html += `</table></tbody><button type="submit">${submitLabel}</button></form></p>`;
        return html;
    }

    linebreaks(input: string): string {
        return input.replace("\n\n", "<p />").replace("\n", "<br>\n");
    }

    stringWrapHtml(input: string, title?: string): string {
        let html = `<html><head><style>body {font-family: sans-serif;}</style>`;
        if (title) {
            html += `<title>${title}</title>`;
        }
        html += `</head><body>${input}</body></html>`;
        return html;
    }
}
