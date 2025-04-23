class IndexedDbClient {
    constructor(dbName, storeName) {
        this.dbName = dbName;
        this.storeName = storeName;
    }

    async delete(key) {
        const database = await this.#openDatabase();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async get(key) {
        const database = await this.#openDatabase();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(this.storeName, "readonly");
            const store = transaction.objectStore(this.storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async upsert(values) {
        const database = await this.#openDatabase();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);

            values.forEach(value => {
                const request = store.put(value);

                request.onerror = (event) =>
                    console.error("Error adding value:", event.target.error);
            });

            transaction.onsuccess = () => resolve(request.result);
            transaction.onerror = (event) =>
                reject("Adding values transaction error:", event.target.error);
        });
    }

    async #openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onupgradeneeded = (event) => {
                const database = event.target.result;

                if (!database.objectStoreNames.contains(this.storeName)) {
                    database.createObjectStore(this.storeName, { keyPath: "id" });
                }
            };

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }
}