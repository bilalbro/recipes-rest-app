const express = require('express');

// const { restorationValidator } = require('../errors/restoration');
const { ingredientsDb, categoriesDb } = require('../db/items');
const { recipesDb } = require('../db/recipes');


const subapp = express.Router({ strict: true });

// subapp.use((req, res, next) => {
//     req.data = {
//         db: null,
//         validator: recipeValidator
//     }
//     next();
// });


async function backup(req, res, next) {
    const backupObj = {
        'categories': await categoriesDb.getAll(true),
        'ingredients': await ingredientsDb.getAll(true), 
        'recipes': await recipesDb.getAll(true)
    }
    res.json(backupObj);
}


async function restore(req, res, next) {
    // First delete everything already contained in the database.
    await recipesDb.deleteAll();
    await categoriesDb.deleteAll();
    await ingredientsDb.deleteAll();

    // Now, perform the restoration.
    const backupObj = req.body;
    await categoriesDb.restore(backupObj.categories);
    await ingredientsDb.restore(backupObj.ingredients);
    await recipesDb.restore(backupObj.recipes);
    res.send('restored')
}


subapp.get('/', backup);

subapp.post('/', restore);


subapp.use((error, req, res, next) => {
    res.status(error.status).json(error.error);
});

module.exports = subapp;