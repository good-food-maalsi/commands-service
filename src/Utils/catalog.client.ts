export class CatalogClient {
    private baseUrl = "http://catalog-nginx"; // Service name in Docker

    async checkAvailability(
        items: { itemId: string; quantity: number }[],
    ): Promise<boolean> {
        console.log("Checking availability for items:", items);

        try {
            for (const item of items) {
                // 1. Try to fetch as a dish
                let response = await fetch(
                    `${this.baseUrl}/dish/${item.itemId}`,
                );

                if (response.ok) {
                    const data = await response.json();
                    if (!data.data?.availability) {
                        console.log(
                            `[CatalogClient] Dish ${item.itemId} is not available.`,
                        );
                        return false; // Item is a dish but not available
                    }
                    continue; // Dish is available, check next item
                }

                // 2. If it's a 404, try to fetch as a menu
                if (response.status === 404) {
                    response = await fetch(
                        `${this.baseUrl}/menu/${item.itemId}`,
                    );
                    if (response.ok) {
                        const data = await response.json();
                        if (!data.data?.availability) {
                            console.log(
                                `[CatalogClient] Menu ${item.itemId} is not available.`,
                            );
                            return false; // Item is a menu but not available
                        }
                        continue; // Menu is available, check next item
                    }
                }

                // 3. If neither dish nor menu was found or another error occurred
                console.log(
                    `[CatalogClient] Failed to verify availability for item ${item.itemId}. Not found or error.`,
                );
                return false;
            }

            // All items were found and are available
            return true;
        } catch (error) {
            console.error(
                "[CatalogClient] Error checking availability:",
                error,
            );
            return false; // Fail safe
        }
    }
}

export const catalogClient = new CatalogClient();
