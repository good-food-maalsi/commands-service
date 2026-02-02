import amqp from 'amqplib';
import { env } from './env.js';

class RabbitMQ {
    private connection: amqp.Connection | null = null;
    private channel: amqp.Channel | null = null;
    private readonly exchange = 'good-food-events';

    async connect() {
        if (this.connection) return;

        try {
            // env.RABBITMQ_HOST usually includes port, e.g. localhost:5672
            // amqp protocol needs full url
            const url = `amqp://${env.RABBITMQ_USER}:${env.RABBITMQ_PASSWORD}@${env.RABBITMQ_HOST}`;
            this.connection = await amqp.connect(url);
            this.channel = await this.connection.createChannel();

            await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
            console.log('Connected to RabbitMQ');
        } catch (error) {
            console.error('Failed to connect to RabbitMQ', error);
        }
    }

    async publish(routingKey: string, message: any) {
        if (!this.channel) {
            await this.connect();
        }

        if (this.channel) {
            this.channel.publish(
                this.exchange,
                routingKey,
                Buffer.from(JSON.stringify(message))
            );
            console.log(`Published message to ${routingKey}`);
        }
    }
}

export const rabbitMQ = new RabbitMQ();
