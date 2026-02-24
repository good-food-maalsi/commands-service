# Authentication Usage Guide

This service uses un middleware d’auth local (sur le modèle du catalog-service) : `src/Middleware/auth.middleware.ts` — JWT vérifié avec la clé publique (jose + `JWT_PUBLIC_KEY_BASE64`), avec option `allowedRoles` par controller.

---

## API Routes – Authentification par route

Toutes les routes sont préfixées par **`/api/v1`**.

| Méthode | Route | Authentification | Rôle(s) requis | Guard / propriétés utilisées |
|--------|--------|-------------------|----------------|-------------------------------|
| **GET** | `/orders` | **Authentification requise** | **ADMIN** / **STAFF** : toutes les commandes ; **CUSTOMER** (et autres) : uniquement leurs commandes | Guard manuel : si `user` absent → **401**. ADMIN/STAFF → liste complète ; sinon → commandes où `order.userId === user.id`. |
| **GET** | `/orders/:id` | **Authentification + rôle ou ownership** | ADMIN, STAFF **ou** CUSTOMER propriétaire | Guard manuel : si `user` absent → **401** ; si ni rôle autorisé ni `user.id === order.userId` → **403**. |
| **POST** | `/orders` | **Authentification requise** | Tout utilisateur connecté (CUSTOMER, STAFF, ADMIN, FRANCHISE_OWNER) | Guard manuel : si `user` absent → **401**. Le corps est validé par `CreateOrderDTO`. L’ordre est créé avec `user.id` comme `customerId`. |
| **PATCH** | `/orders/:id/status` | **Authentification + rôle** | **ADMIN** ou **STAFF** uniquement | Guard manuel : si `user` absent → **401** ; si rôle ∉ { ADMIN, STAFF } → **403** avec `required` / `actual`. Corps validé par `UpdateOrderStatusDTO`. |

### Détail par route

#### `GET /api/v1/orders`
- **Accès** : Réservé aux utilisateurs authentifiés.
- **Rôle** :  
  - **ADMIN** ou **STAFF** → retourne **toutes** les commandes.  
  - **CUSTOMER** (et autres rôles) → retourne **uniquement les commandes de l’utilisateur** (`order.userId === user.id`).
- **Guard** : Si `user` absent → **401**. Pas de 403 : tout utilisateur connecté peut lister des commandes (filtrées selon le rôle).
- **Réponse** : Liste des commandes (complète pour ADMIN/STAFF, filtrée par `user.id` pour les autres).

#### `GET /api/v1/orders/:id`
- **Accès** : Réservé aux utilisateurs authentifiés.
- **Rôle** :  
  - **ADMIN** ou **STAFF**, ou  
  - **CUSTOMER** qui a créé la commande (ownership : `order.userId === user.id`).  
- **Guard** :  
  - Si `user` absent → **401**.  
  - Si l’utilisateur n’est ni ADMIN/STAFF ni propriétaire (`order.userId !== user.id`) → **403** avec un message indiquant que seul ADMIN, STAFF ou le client propriétaire peuvent accéder à la commande.
- **Réponse** : Détail de la commande si l’utilisateur est autorisé, ou erreur 404 si non trouvée.

#### `POST /api/v1/orders`
- **Accès** : Réservé aux utilisateurs authentifiés.
- **Rôle** : Aucun rôle particulier ; tout utilisateur avec un JWT valide peut créer une commande.
- **Guard** : Vérification explicite de `user` dans le handler ; si absent → **401**.
- **Propriété utilisée** : `user.id` est enregistré comme `customerId` de la commande.
- **Body** : Validé par `CreateOrderDTO` (`shopId`, `items[]` avec `itemId`, `quantity`, `unitPrice`, `selectedOptions` optionnel).

#### `PATCH /api/v1/orders/:id/status`
- **Accès** : Réservé aux utilisateurs authentifiés ayant le rôle **ADMIN** ou **STAFF**.
- **Rôle** : **ADMIN** ou **STAFF** (un des deux suffit).
- **Guard** :  
  - Si `user` absent → **401**.  
  - Si `user.roles` ne contient ni `ADMIN` ni `STAFF` → **403** avec `message`, `required: ["ADMIN", "STAFF"]` et `actual: user.roles`.
- **Propriété utilisée** : `params.id` pour la commande, `body.status` pour le nouveau statut.
- **Body** : Validé par `UpdateOrderStatusDTO` (`status: string`).

### Récapitulatif des réponses d’erreur liées à l’auth

| Code | Condition |
|------|-----------|
| **401** | Token absent, invalide ou expiré (ou `user` non présent après vérification). |
| **403** | Token valide mais rôles insuffisants (ex. CUSTOMER sur PATCH status). |

---

## Available Roles

```typescript
import { Role } from './src/Middleware/auth.middleware'

Role.ADMIN
Role.FRANCHISE_OWNER
Role.STAFF
Role.CUSTOMER
```

## Usage Examples

### Basic Authentication (Any authenticated user)

```typescript
import { authMiddleware } from './Middleware/auth.middleware'

.post('/orders', async ({ db, body, user }) => {
    // user.id is available here
    return createOrder(db, body, user.id)
}, {
    isSignIn: true  // Requires authentication
})
```

### Role-Based Access Control

#### Single Role

```typescript
import { createAuthMiddleware, Role } from './Middleware/auth.middleware'

.delete('/orders/:id', async ({ params }) => {
    return deleteOrder(params.id)
}, {
    hasRole: Role.ADMIN  // Only ADMIN can access
})
```

#### Multiple Roles

```typescript
.patch('/orders/:id/status', async ({ params, body }) => {
    return updateOrderStatus(params.id, body.status)
}, {
    hasRole: [Role.ADMIN, Role.STAFF]  // ADMIN or STAFF can access
})
```

### Convenience Macros

#### Admin Only

```typescript
.delete('/orders/:id', async ({ params }) => {
    return deleteOrder(params.id)
}, {
    isAdmin: true
})
```

#### Staff Access (includes ADMIN)

```typescript
.patch('/orders/:id/status', async ({ params, body }) => {
    return updateOrderStatus(params.id, body.status)
}, {
    isStaff: true  // STAFF or ADMIN
})
```

#### Franchise Owner Access (includes ADMIN)

```typescript
.get('/franchise/orders', async ({ user, db }) => {
    return getOrdersByFranchise(db, user.franchiseId)
}, {
    isFranchiseOwner: true  // FRANCHISE_OWNER or ADMIN
})
```

#### Customer Only

```typescript
.get('/my-orders', async ({ user, db }) => {
    return getOrdersByCustomer(db, user.id)
}, {
    isCustomer: true
})
```

## Available User Data

When authenticated, the `user` object contains:

```typescript
interface AuthUser {
    id: string;              // User ID (from JWT 'sub')
    email?: string;          // User email
    roles: Role[];           // User roles
    franchiseId?: string;    // Franchise ID (if applicable)
}
```

## Full Context Available

```typescript
.post('/orders', async (context) => {
    const {
        user,          // AuthUser | null
        userPayload,   // Full JWT payload | null
        db,            // Prisma client
        body,          // Request body
        // ... other Elysia context
    } = context

    return createOrder(db, body, user!.id)
}, {
    isSignIn: true
})
```

## Environment Variables Required

```bash
JWT_PUBLIC_KEY_BASE64=your-base64-encoded-rsa-public-key
```

## Migration from Old Auth

The new auth plugin is **backward compatible** with the old `isSignIn` macro.

**Before:**
```typescript
.post('/orders', async ({ user, db, body }) => {
    return createOrder(db, body, user.id)
}, {
    isSignIn: true
})
```

**After:** (same!)
```typescript
.post('/orders', async ({ user, db, body }) => {
    return createOrder(db, body, user.id)
}, {
    isSignIn: true
})
```

## Error Responses

### 401 Unauthorized
```json
{
  "message": "Unauthorized - Authentication required"
}
```

### 403 Forbidden
```json
{
  "message": "Forbidden - Insufficient permissions",
  "required": ["ADMIN"],
  "actual": ["CUSTOMER"]
}
```
