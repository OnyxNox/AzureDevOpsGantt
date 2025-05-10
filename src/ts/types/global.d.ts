export { };

declare global {
    interface Array<T> {
        groupBy<K extends keyof any>(key: (item: T) => K): Record<K, T[]>;
    }

    interface Window {
        mermaid: any
    }
}