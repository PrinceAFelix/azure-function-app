const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");


// Initialzie Cosmos Client
const client = new CosmosClient(process.env.PRIMARY_CONNECTION_STRING);

// Initialize database
const databaseId = process.env.DATABASE_ID;
const containerId = process.env.CONTAINER_ID;

app.http('RESTFunction', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for URL "${request.url}"`);

        try {
            // Query to get all users
            const query = "SELECT c.id, c.name, c.email, c.age FROM c";

            // Execute the query to retrieve data from Cosmos DB
            const { resources: items } = await client
                .database(databaseId)
                .container(containerId)
                .items
                .query(query)
                .fetchAll();

            // Log the retrieved items
            context.log("Retrieved items: ", items);

            // Return the result
            return {
                status: 200,
                body: items
            };
        } catch (error) {
            // Log any errors encountered during the query
            context.log("Error retrieving users: ", error.message);

            // Return an error response
            return {
                status: 500,
                body: "Error retrieving users: " + error.message
            };
        }
    }
});