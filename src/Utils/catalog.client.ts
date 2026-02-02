export class CatalogClient {
    private baseUrl = 'http://catalog-nginx'; // Service name in Docker

    async checkAvailability(items: { itemId: string, quantity: number }[]): Promise<boolean> {
        console.log('Checking availability for items:', items);

        // Mock Implementation for now as Catalog Service might not be reachable or defined yet
        // In real world:
        // const response = await fetch(`${this.baseUrl}/items/check-availability`, { method: 'POST', body: JSON.stringify(items) });
        // return response.ok;

        // Simulate availability check
        return true;
    }
}

export const catalogClient = new CatalogClient();
