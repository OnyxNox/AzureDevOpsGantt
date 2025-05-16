export { };

declare global {
    interface Array<T> {
        groupBy<K extends keyof any>(key: (item: T) => K): Record<K, T[]>;
    }

    interface Date {
        addBusinessDays(count: number): Date;

        toISODateString(): string;
    }

    interface String {
        encodeSpecialChars(): string;

        titleToCamelCase(): string;
    }

    interface Window {
        mermaid: any;
    }
}