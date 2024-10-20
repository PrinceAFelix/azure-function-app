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




app.http('RESTFunction', {
    methods: ['GET', 'PUT', 'DELETE', 'POST'],
    authLevel: 'function',
    route: 'users/{id?}/{partitionKey?}',
    handler: async (request, context) => {
        context.log(`Http function processed request for URL "${request.url}"`);

        //Store the method from request
        const { method } = request;

        //Used to take the bearer token from the request
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) { //Reject the request if somthing is wrong wiht token
            return context.res = {
                status: 401,
                body: JSON.stringify({ error: "Authorization header missing or invalid" }),
                headers: {
                    "Content-Type": "application/json"
                }
            };
        }

        // Get the token part
        const token = authHeader.split(' ')[1];

        try {

            // Verify the JWT token
            const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });


            // Check for specific claims (ROLE)
            if (decoded.role[0]['authority'] !== 'ROLE_ADMIN') { //Return an error if invalid
                return context.res = {
                    status: 403,
                    body: JSON.stringify({ error: "Forbidden: Insufficient permissions" }),
                    headers: {
                        "Content-Type": "application/json"
                    }
                };
            }

            //Request header params
            const id = request.params['id'];
            const partitionKey = request.params['partitionKey'];

            switch (method) {
                case 'GET':

                    if (id) { //Get specific user by id
                        const query = `SELECT c.id, c.name, c.email, c.age, c.role FROM c WHERE c.id = '${id}'`;

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
                    } else { //Else get All
                        const query = `SELECT c.id, c.name, c.email, c.age, c.role FROM c`;

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
                    var requestData = await request.json();

                    //Check if the id is already in the database
                    var query = `SELECT * FROM c WHERE c.id = '${id}'`;

                    // Execute the query to retrieve data from Cosmos DB
                    var { resources: items } = await client
                        .database(databaseId)
                        .container(containerId)
                        .items
                        .query(query)
                        .fetchAll();

                    if (requestData.id && requestData.name && requestData.email && requestData.age && requestData.role && requestData.password && items.length == 0) {
                        var { item } = await client
                            .database(databaseId)
                            .container(containerId)
                            .items.upsert(requestData)

                        return context.res = {
                            status: 200,
                            body: JSON.stringify({ status: "success", messgae: "User created", requestData }),
                            headers: {
                                "Content-Type": "application/json"
                            }
                        };
                    } else {
                        return context.res = {
                            status: 400,
                            headers: {
                                "Content-Type": "application/json"
                            }
                        };
                    }
                case 'PUT':

                    var requestData = await request.json();

                    if (id && partitionKey) {
                        // Retrieve the existing item
                        const { resource: existingItem } = await client
                            .database(databaseId)
                            .container(containerId)
                            .item(id, partitionKey)
                            .read();

                        //Check if all fields are field
                        if (requestData.id && requestData.name && requestData.email && requestData.age && requestData.role && requestData.password) {
                            //Update fiels
                            existingItem.name = requestData.name;
                            existingItem.email = requestData.email;
                            existingItem.age = requestData.age;
                            existingItem.password = requestData.password;

                            // Send the PUT request to update the document
                            const { resource: updatedItem } = await client
                                .database(databaseId)
                                .container(containerId)
                                .item(existingItem.id, partitionKey)
                                .replace(existingItem);

                            return context.res = {
                                status: 200,
                                body: JSON.stringify({ status: "success", messgae: "User created", updatedItem }),
                                headers: {
                                    "Content-Type": "application/json"
                                }
                            };
                        }



                    }
                    break;
                case 'DELETE':
                    // Handle DELETE request (delete an existing user

                    if (id) {
                        // Check if the id is already in the database
                        var query = `SELECT * FROM c WHERE c.id = '${id}'`;

                        // Execute the query to retrieve data from Cosmos DB
                        var { resources: items } = await client
                            .database(databaseId)
                            .container(containerId)
                            .items
                            .query(query)
                            .fetchNext();

                        // Check if any item was found
                        if (items.length > 0) {
                            // Delete the user with the specified ID
                            await client
                                .database(databaseId)
                                .container(containerId)
                                .item(id, id) // Added partion
                                .delete();

                            return context.res = {
                                status: 200,
                                body: JSON.stringify({ status: "success", message: "User deleted", user: items[0] }),
                                headers: {
                                    "Content-Type": "application/json"
                                }
                            };
                        } else {
                            // If no user was found
                            return context.res = {
                                status: 404,
                                body: JSON.stringify({ status: "error", message: "User not found." }),
                                headers: {
                                    "Content-Type": "application/json"
                                }
                            };
                        }
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