export function titleToCamelCase(title: string) {
    return title
        .split(" ")
        .reduce((camelCase, word, index) =>
            camelCase + (index === 0)
                ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            , "");
}

export function flattenObject(object: any): Record<string, any> {
    let flattenedObject: Record<string, any> = {};

    Object.keys(object).forEach(key => {
        if (object[key] !== null && typeof object[key] === "object") {
            Object.assign(flattenedObject, flattenObject(object[key]));
        } else {
            flattenedObject[key] = object[key];
        }
    });

    return flattenedObject;
}
