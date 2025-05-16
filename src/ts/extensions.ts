Array.prototype.groupBy = function <T, K extends keyof any>(key: (item: T) => K): Record<K, T[]> {
    return this.reduce((groups, item) => {
        (groups[key(item)] ||= []).push(item);

        return groups;
    }, {} as Record<K, T[]>);
}

Date.prototype.addBusinessDays = function (count: number): Date {
    const newDate = new Date(this);

    while (count > 0) {
        newDate.setDate(newDate.getDate() + 1);

        count -= (newDate.getDay() % 6 !== 0) ? 1 : 0; // Skip weekends (6 = Sat; 0 = Sun)
    }

    return newDate;
}

Date.prototype.toISODateString = function (): string {
    return this.toISOString().split("T")[0];
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