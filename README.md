# Commands Service

A robust microservice responsible for handling customer orders, managing order lifecycle, and command processing within the Good Food ecosystem.

## 🚀 Technologies

This service is built with a modern and efficient stack:

- **Runtime:** [Bun](https://bun.sh) - A fast all-in-one JavaScript runtime.
- **Framework:** [ElysiaJS](https://elysiajs.com) - A high-performance web framework for Bun.
- **ORM:** [Prisma](https://www.prisma.io) - Next-generation Node.js and TypeScript ORM.
- **Database:** PostgreSQL.
- **Validation:** Type-safety and validation using Elysia's `t` module and Zod (via environment utils).

## 🛠️ Getting Started

### Prerequisites

- [Bun](https://bun.sh/docs/installation)
- [Docker](https://www.docker.com/) (for database)

### Installation

1.  Clone the repository and install dependencies:
    ```bash
    bun install
    ```

2.  Configure your environment variables:
    Copies `.env` to the root directory. Ensure `DATABASE_URL` matches your postgres configuration.

### Running Locally

1.  **Start the Database:**
    You can use the provided docker-compose file to start a PostgreSQL instance.
    ```bash
    docker compose up -d commands-postgres
    ```

2.  **Run Migrations:**
    Initialize the database schema.
    ```bash
    bunx prisma migrate dev
    ```

3.  **Start the Server:**
    ```bash
    bun run dev
    ```
    The server will start at `http://localhost:8080`.

## 📂 Project Structure

- `src/Order`: Contains the Order domain logic (Controller, Service, DTOs).
- `src/Plugin`: Elysia plugins (e.g., Prisma integration).
- `src/Utils`: Utility functions and environment configuration.
- `prisma/`: Database schema and migration files.

## 🔗 API Endpoints

- `GET /api/v1/orders`: List all orders.
- `GET /api/v1/orders/:id`: Get a specific order by ID.
- `POST /api/v1/orders`: Create a new order.
- `PATCH /api/v1/orders/:id/status`: Update the status of an order.

## 🐳 Docker Deployment

To run the entire service stack using Docker:

```bash
docker compose up -d --build
```