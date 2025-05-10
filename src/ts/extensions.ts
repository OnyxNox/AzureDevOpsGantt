Array.prototype.groupBy = function <T, K extends keyof any>(key: (item: T) => K): Record<K, T[]> {
    return this.reduce((groups, item) => {
        (groups[key(item)] ||= []).push(item);

        return groups;
    }, {} as Record<K, T[]>);
}

Object.prototype.flattenObject = function (this: Record<string, any>): Record<string, any> {
    let flattenedObject: Record<string, any> = {};

    Object.keys(this).forEach(key => {
        if (this[key] !== null && typeof this[key] === "object") {
            Object.assign(flattenedObject, this[key].flattenObject());
        } else {
            flattenedObject[key] = this[key];
        }
    });

    return flattenedObject;
}

String.prototype.encodeSpecialChars = function (): string {
    return this.replace(/[^a-zA-Z0-9 ]/g, (char) => `#${char.charCodeAt(0)};`);
}

String.prototype.titleToCamelCase = function (): string {
    return this
        .split(" ")
        .reduce((camelCase, word, index) =>
            camelCase + (index === 0)
                ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            , "");
}