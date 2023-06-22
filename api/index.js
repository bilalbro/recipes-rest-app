const express = require('express');

const recipesRouter = require('./routes/recipes-router');
const restorationRouter = require('./routes/restoration-router');
const { itemsRouter } = require('./routes/items-router');
// const ItemsRouter = require('./routes/ItemsRouter');


const app = express();
const port = 3001;

app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', '*');
    res.set('Access-Control-Allow-Headers', '*');
    next();
});

// Since we'll be sending in JSON payloads, we need to use Express's json()
// middleware to parse those payloads and convert them into JSON.
app.use(express.json());

app.use(restorationRouter);
app.use(recipesRouter);
app.use(itemsRouter('ingredients'));
app.use(itemsRouter('categories'));


// If the thrown error is one of our custom errors, we'll handle it.
// Otherwise, we'll just relay it to Express's default error handler.
app.use((error, req, res, next) => {
    if (error.status && error.error) {
        res.status(error.status).json(error.error);
    }
    else {
        next(error);
    }
});

app.listen(port, () => {
    console.log(`Started listening on port ${port}.`);
});