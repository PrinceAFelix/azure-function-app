import dotenv from 'dotenv';
import { app } from '@azure/functions';
import { CosmosClient } from "@azure/cosmos";
import jwt from 'jsonwebtoken'


dotenv.config();

// Initialzie Cosmos Client
const client = new CosmosClient(process.env.PRIMARY_CONNECTION_STRING);

// Initialize database
const databaseId = process.env.DATABASE_ID;
const containerId = process.env.CONTAINER_ID;
const jwtSecret = Buffer.from(process.env.JWT_SECRET, 'base64');




app.http('RESTFunction1', {
    methods: ['GET', 'PUT', 'DELETE', 'POST'],
    authLevel: 'function',
    route: 'users/{id:int?}',
    handler: async (request, context) => {
        const id = request.params.id;
        context.log(`Http function processed request for URL "${request.url}"`);

        const { method } = request;

        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return context.res = {
                status: 401,
                body: JSON.stringify({ error: "Authorization header missing or invalid" }),
                headers: {
                    "Content-Type": "application/json"
                }
            };
        }

        const token = authHeader.split(' ')[1]; // Get the token part
        try {


            // Verify the JWT token
            const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });

            console.log(decoded.role)

            // Check for specific claims (e.g., user role)
            if (decoded.role[0]['authority'] !== 'ROLE_ADMIN') {
                return context.res = {
                    status: 403,
                    body: JSON.stringify({ error: "Forbidden: Insufficient permissions" }),
                    headers: {
                        "Content-Type": "application/json"
                    }
                };
            }

            switch (method) {

                case 'GET':
                    if (id) {
                        const query = `SELECT c.id, c.name, c.email, c.age FROM c WHERE c.id = '${id}'`;

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
                    } else {
                        const query = `SELECT c.id, c.name, c.email, c.age FROM c`;

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
                    }
                case 'POST':
                // Handle POST request (create a new user)

                case 'PUT':
                    // Handle PUT request (update an existing user)
                    break;
                case 'DELETE':
                    // Handle DELETE request (delete an existing user

                    if (id) {
                        //Check if the id is already in the database
                        var query = `SELECT * FROM c WHERE c.id = '${id}'`;

                        // Execute the query to retrieve data from Cosmos DB
                        var { resources: item } = await client
                            .database(databaseId)
                            .container(containerId)
                            .items
                            .query(query)
                            .fetchNext();
                        console.log(item[0]);
                        // Delete the user with the specified ID
                        await client
                            .database(databaseId)
                            .container(containerId)
                            .item(item[0].id, item[0].name)
                            .delete();
                        return context.res = {
                            status: 200,
                            headers: {
                                "Content-Type": "application/json"
                            }
                        };

                    } else {
                        // Return an error response if the ID is missing
                        return context.res = {
                            status: 400,
                            body: JSON.stringify({ error: "Missing ID" }),
                            headers: {
                                "Content-Type": "application/json"
                            }
                        };
                    } query
                    return context.res = {
                        status: 200,
                        body: JSON.stringify(requestData),
                        headers: {
                            "Content-Type": "application/json"
                        }
                    };

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