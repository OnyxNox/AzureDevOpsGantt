export { };

declare global {
    interface Array<T> {
        groupBy<K extends keyof any>(key: (item: T) => K): Record<K, T[]>;
    }

    interface Object {
        flattenObject(): Record<string, any>,
    }

    interface String {
        encodeSpecialChars(): string;

        titleToCamelCase(): string;
    }

    interface Window {
        mermaid: any;
    }
}