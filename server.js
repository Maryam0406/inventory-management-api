const express = require('express');
const app = express();

//process.env.PORT checks if the environment (like a hosting service) has assigned a specific port to run on if not falls back to 5000
const PORT = process.env.PORT || 5000;

//parses incoming requests with JSON body into a javascript object cause express doesnt understand JSON
app.use(express.json());

//array of objects representing items in the inventory
let items = [
    { id: 1, name: 'Blue T-Shirt', sku: 'TS-BLU-001', category: 'Clothing', quantity: 40, price: 12.99, lowStockThreshold: 10},
    { id: 2, name: 'Wireless Mouse', sku: 'EL-MOU-002', category: 'Electronics', quantity: 15, price: 19.99, lowStockThreshold: 5 },
    { id: 3, name: 'Notebook', sku: 'ST-NOT-003', category: 'Stationery', quantity: 8, price: 2.5, lowStockThreshold: 10 },

];

let nextId = 4;

function findItemIndex(id) {
    //we convert the id to a number because the id in the items array is a number and the id from the request is a string
    return items.findIndex((item) => item.id === Number(id));
}


//app is the express web server
//'/' - the root url 
//when a get request is recived run the below function
app.get('/', (req, res) => {
    //Sends a JSON response to the client.
    res.json({ message: 'Inventory Management API is running'});
});

app.get('/api/items/low-stock', (req, res) => {
    const lowStockItems = items.filter((item) => item.quantity <= item.lowStockThreshold);

    res.status(200).json({
        count: lowStockItems.length,
        items: lowStockItems,
    });
});

//get all items route
app.get('/api/items', (req, res) => {
    res.status(200).json(items);
});

//get one item route
app.get('/api/items/:id', (req, res) => {
    const index = findItemIndex(req.params.id);

    if (index === -1) {
        return res.status(404).json({ error: 'Item not found'});
    }

    res.status(200).json(items[index]);
});

app.post('/api/items', (req, res) => {
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
    const skuExists = items.some((item) => item.sku === sku);
    if (skuExists) {
        return res.status(400).json({
            error: `An item with SKU "${sku}" already exists`,
        });
    }

    //build and save the item
    const newItem = {
        id: nextId++,
        name,
        sku,
        category: category || 'Uncategorized',
        quantity,
        price,
        //Use the left value unless it is null or undefined.
        lowStockThreshold: lowStockThreshold ?? 5,
    };

    items.push(newItem);
    res.status(201).json(newItem);
})


//put routes
app.put('/api/items/:id', (req, res) => {
    const index = findItemIndex(req.params.id);

    if (index === -1) {
        return res.status(404).json({ error: 'Item not found'});
    }

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

    if (sku !== undefined && sku !== items[index].sku) {
        const skuExists = items.some((item) => item.sku === sku);
        if (skuExists) {
            return res.status(400).json({
                error: `An item with SKU "${sku}" already exists`,
            });
        }
    }

    // Merge: keep existing values, overwrite only the fields that were sent
    items[index] = {
        ...items[index],
        ...(name !== undefined && { name }),
        ...(sku !== undefined && { sku }),
        ...(category !== undefined && { category }),
        ...(quantity !== undefined && { quantity }),
        ...(price !== undefined && { price }),
        ...(lowStockThreshold !== undefined && { lowStockThreshold }),
    };

    res.status(200).json(items[index]);
    });

    //delete
    app.delete('/api/items/:id', (req, res) => {
        const index = findItemIndex(req.params.id);

        if (index === -1) {
            return res.status(404).json({ error: 'Item not found'});
        }

        const deletedItem = items.splice(index, 1)[0];

        res.status(200).json({
            message: 'Item deleted sucessfully',
            item: deletedItem,
        });
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