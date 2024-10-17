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
    authLevel: 'function',
    handler: async (request, context) => {

        context.log(`Http function processed request for URL "${request.url}"`);

        const { method } = request;

        try {
            switch (method) {
                case 'GET':
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
                case 'POST':
                    // Handle POST request (create a new user)
                    break;
                case 'PUT':
                    // Handle PUT request (update an existing user)
                    break;
                case 'DELETE':
                    // Handle DELETE request (delete an existing user)
                    break;
                default:
                    // Handle unsupported methods
                    context.res = {
                        status: 405,
                        body: JSON.stringify({ error: "Method not allowed" }),
                        headers: {
                            "Content-Type": "application/json"
                        }
                    };
                    return context.res;
            }
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