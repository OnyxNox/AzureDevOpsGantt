export { };

declare global {
    interface Array<T> {
        groupBy<K extends keyof any>(key: (item: T) => K): Record<K, T[]>;
    }

    interface DateConstructor {
        tryParse: (date: string) => Date | null;
    }

    interface Date {
        addBusinessDays(count: number): Date;

        getBusinessDayCount(other: Date): number;

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