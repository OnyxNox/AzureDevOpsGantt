Array.prototype.groupBy = function <T, K extends keyof any>(key: (item: T) => K): Record<K, T[]> {
    return this.reduce((groups, item) => {
        (groups[key(item)] ||= []).push(item);

        return groups;
    }, {} as Record<K, T[]>);
}

Date.tryParse = function (date: string): Date | null {
    return isNaN(Date.parse(date)) ? null : new Date(date);
}

Date.prototype.addBusinessDays = function (count: number): Date {
    const newDate = new Date(this);

    const velocity = count > 0 ? 1 : -1;

    let absCount = Math.abs(count);
    while (absCount > 0) {
        newDate.setUTCDate(newDate.getUTCDate() + velocity);

        if (newDate.getUTCDay() % 6 !== 0) { // Skip weekends (6 = Sat; 0 = Sun)
            absCount -= 1;
        }
    }

    return newDate;
}

Date.prototype.getBusinessDayCount = function (other: Date): number {
    const startDate = new Date(this);

    const velocity = startDate < other ? 1 : -1;

    let businessDayCount = 0;
    while ((velocity === 1 && startDate <= other) || (velocity === -1 && startDate >= other)) {
        if (startDate.getUTCDay() % 6 !== 0) {
            businessDayCount += 1;
        }

        startDate.setUTCDate(startDate.getUTCDate() + velocity);
    }

    return businessDayCount;
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