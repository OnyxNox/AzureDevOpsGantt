import { MermaidJsClient } from "../src/ts/mermaid_js_client";

describe("MermaidJsClient", () => {
    it("should create an instance without throwing an exception", () => {
        const getMermaidJsClient = () => new MermaidJsClient(new Date(), [], {}, []);

        expect(getMermaidJsClient).not.toThrow();

        const mermaidJsClient = getMermaidJsClient();
        expect(mermaidJsClient).toBeInstanceOf(MermaidJsClient);
    });
});
