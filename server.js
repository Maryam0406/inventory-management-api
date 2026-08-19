const { db } = require('./db');
const { items, users } = require('./db/schema');
const { eq, lte } = require('drizzle-orm');
//authentication
const bcrypt = require('bcrypt');

const express = require('express');
const app = express();
//require - a node.js function used to import a pacakge 
//node.js goes to node_modules, finds the cors package and loads it into the program
const cors = require('cors');
app.use(cors()); // Enable CORS for all routes

//process.env.PORT checks if the environment (like a hosting service) has assigned a specific port to run on if not falls back to 5000
const PORT = process.env.PORT || 5000;

//parses incoming requests with JSON body into a javascript object cause express doesnt understand JSON
app.use(express.json());

//app is the express web server
//'/' - the root url 
//when a get request is recived run the below function
app.get('/', (req, res) => {
    //Sends a JSON response to the client.
    res.json({ message: 'Inventory Management API is running'});
});


//signup route
//creates the account and stores the hashed password in the database
app.post('/api/auth/signup', async (req, res) => {
    const { email, password, role } = req.body;

    //if there is no email or password send a 400 error
    if (!email || !password) {
       // ({}) - parenthesis is used to call a function (json function)
       //curly brackets is used to create an object with a key of error and a value of 'email and password are required'
       return res.status(400).json({ error: 'email and password are required'});
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'password must be at least 8 characters long' });
    }

    try {
        const existing = await db
            .select()
            .from(users)
            .where(eq(users.email, email));

        if (existing.length > 0) {
            return res.status(400).json({ error: 'An account with this email already exists' });
        }  
        
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            email,
            password: hashedPassword,
            ...(role && { role }),
        };

        //the database operation takes some time to complete so we use await to wait for it to finish before moving on
        const inserted = await db
            .insert(users)
            //use the values inside the newUser for the new row
            .values(newUser)
            .returning({
                id: users.id,
                email: users.email,
                role: users.role,
            });

        res.status(201).json(inserted[0]);    
    } catch (err) {
        console.error('Error signing up: ', err);
        res.status(500).json({ error: 'Failed to create account'});
    }
});


//login route
//checks the credentials and password when someone logs in, creates a jwt and sends it to the frontend
//route declaration
app.post('/api/auth/login', async (req, res) => {
    //getting the submitted credentials out of req body and assigning it to each variable
    const { email, password } = req.body;

    //required field validation
    if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
    }

    try {
        const result = await db
            .select()
            .from(users)
            .where(eq(users.email, email));

            //database queries always returns arrays regardless of whether it finds a match or not, so we check the length of the array to see if a user was found
        if (result.length === 0) {
            return res.status(400).json({ error: 'Invalid email or password' });
        } 
        
        //gets the first user object
        const user = result[0];

        //verifying the pw
        const passwordMatches = await bcrypt.compare(password, user.password);

        //if password does not match send a 401 error
        if (!passwordMatches) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        //sign - creates a JWT
        const token = jwt.sign(
            //information about the user that will be encoded(stored) in the token
            { id: user.id, email: user.email, role: user.role },
            //This is the secret key used to sign the token.
            process.env.JWT_SECRET,
            { expiresIn: '2h'}

        );

        res.status(200).json({
            token,
            user: { id: user.id, email: user.email, role: user.role }
        });   
    } catch (err) {
        console.error('Error logging in: ', err);
        res.status(500).json({ error: 'Failed to log in' });
    }
});

//Checks that JWT whenever the user tries to access something protected.
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    //getting only the token
    const token = authHeader && authHeader.split(' ')[1];

    //if a token was not provided send a 401 error
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    //checking whether the jwt is valid
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = decoded;
        next();
    });
}


//get the low stock items from the database
app.get('/api/items/low-stock', async (req, res) => {
    try {
        const lowStockItems = await db
            .select()
            .from(items)
            .where(lte(items.quantity, items.lowStockThreshold));

        res.status(200).json({
            count: lowStockItems.length,
            items: lowStockItems
        });      
    } catch (err) {
        console.error('Error fetching low stock items: ', err);
        res.status(500).json({ error: 'Failed to fetch low stock items' });
    }
});


//get all items from database
app.get('/api/items', async (req, res) => {
    try {
        //Drizzle queries PostgreSQL and gives you a JavaScript array of objects:
        const allItems = await db.select().from(items);
        //sending the received data to the frontend in json format
        res.status(200).json(allItems);    
    } catch (err) {
        //500 - internal server error, something went wrong on the server side
        console.error('Error fetching items: ', err);
        res.status(500).json({error: 'Failed to fetch items'});
    }
});


//get one item from database
app.get('/api/items/:id', async (req, res) => {
    try {
        const result = await db
        .select()
        .from(items)
        .where(eq(items.id, Number(req.params.id)));

        if (result.length === 0) {
            return res.status(404).json({ error: 'Item not found'});
        } 

        res.status(200).json(result[0]);
    } catch (err) {
        console.error('Error fetching item: ', err);
        res.status(500).json({ error: 'Failed to fetch item' });
    }
});

app.post('/api/items', async (req, res) => {
    const { name, sku, category, quantity, price, lowStockThreshold } = req.body;

    //Required field check
    if (!name || !sku || quantity === undefined || price === undefined) {
        return res.status(400).json({
            error: 'name, sku, quantity, and price are required fields',
        });
    }

    // Type check
    if (typeof quantity !== 'number' || typeof price !== 'number') {
        return res.status(400).json({
            error: 'quantity and price must be numbers',
        });
    }

    //value sanity check
    if (quantity < 0 || price < 0) {
        return res.status(400).json({
            error: 'quantity and price must be non-negative numbers',
        });
    }

    //duplicate sku checks
    try {
        const existing = await db.select().from(items).where(eq(items.sku, sku));

        if (existing.length > 0) {
            return res.status(400).json({
                error: `An item with SKU "${sku}" already exists`,
            });
        }
        
        //build and save the item
        const newItemData = {
            //postgresql will automatically generate the id for us, so we don't need to include it here
            name,
            sku,
            quantity,
            price: price.toString(),
            //add category to the object only if category was provided
            ... (category && { category }),
            ...(lowStockThreshold !== undefined && { lowStockThreshold }),
        };

        const inserted = await db.insert(items).values(newItemData).returning();
        res.status(201).json(inserted[0]);
    } catch (err) {
        console.error('Error creating item: ', err);
        res.status(500).json({ error: 'Failed to create item' });
    }  
});


//put routes
app.put('/api/items/:id', async (req, res) => {
    const { name, sku, category, quantity, price, lowStockThreshold } = req.body;

    if (quantity !== undefined && typeof quantity !== 'number') {
        return res.status(400).json({ error: 'quantity must be a number' });
    }

    if (price !== undefined && typeof price !== 'number') {
        return res.status(400).json({ error: 'price must be a number' });
    }

    if (quantity !== undefined && quantity < 0) {
        return res.status(400).json({ error: 'quantity must be a non-negative number' });
    }

    if (price !== undefined && price < 0) {
        return res.status(400).json({ error: 'price must be a non-negative number' });
    }

    try {
        const existing = await db.select().from(items).where(eq(items.id, Number(req.params.id)));

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Item not found'});
        }

        if (sku !== undefined && sku !== existing[0].sku) {
            const skuTaken = await db.select().from(items).where(eq(items.sku, sku));
            if (skuTaken.length > 0) {
                return res.status(400).json({
                    error: `An item with SKU "${sku}" already exists`,
                });
            }
        }

        const updates = {
            ...(name !== undefined && { name }),
            ...(sku !== undefined && { sku }),
            ...(category !== undefined && { category }),
            ...(quantity !== undefined && { quantity }),
            ...(price !== undefined && { price: price.toString() }),
            ...(lowStockThreshold !== undefined && { lowStockThreshold }),
        };

        const updated = await db
            .update(items)
            .set(updates)
            .where(eq(items.id, Number(req.params.id)))
            .returning();

        res.status(200).json(updated[0]);
    } catch (err) {
        console.error('Error updating item: ', err);
        res.status(500).json({ error: 'Failed to update item' });
    }        
});

    //delete
    app.delete('/api/items/:id', async (req, res) => {
        try {
            const deleted = await db
            .delete(items)
            .where(eq(items.id, Number(req.params.id)))
            .returning();

            if (deleted.length === 0) {
                return res.status(404).json({ error: 'Item not found' });
            }

            res.status(200).json({
                message: "Item deleted successfully",
                item: deleted[0],
            });
            
        } catch (err) {
            console.error('Error deleting item: ', err);
            res.status(500).json({ error: 'Failed to delete item' });
        }
    });

    // Catch-all for routes that don't exist
    app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
    });

    // Global error handler for unexpected/unhandled errors
    app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong on the server' });
    });


app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
})