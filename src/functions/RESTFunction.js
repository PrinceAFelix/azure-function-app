import dotenv from 'dotenv';
import { app } from '@azure/functions';
import { CosmosClient } from "@azure/cosmos";

dotenv.config();

// Initialzie Cosmos Client
const client = new CosmosClient(process.env.PRIMARY_CONNECTION_STRING);

// Initialize database
const databaseId = process.env.DATABASE_ID;
const containerId = process.env.CONTAINER_ID;

app.http('RESTFunction', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {

        context.log(`Http function processed request for URL "${request.url}"`);

        try {
            const query = "SELECT c.id, c.name, c.email, c.age FROM c";

            // Execute the query to retrieve data from Cosmos DB
            const { resources: items } = await client
                .database(databaseId)
                .container(containerId)
                .items
                .query(query)
                .fetchAll();

            // Set response for GET
            return context.res = {
                status: 200,
                body: JSON.stringify(items),
                headers: {
                    "Content-Type": "application/json"
                }
            };

        } catch (error) {
            // Log any errors encountered during the query
            context.log("Error retrieving users: ", error.message);

            // Return an error response
            return context.res = {
                status: 500,
                body: JSON.stringify({ error: "Error retrieving users: " + error.message }),
                headers: {
                    "Content-Type": "application/json" // Set the content type to JSON
                }
            };
        }
    }
});