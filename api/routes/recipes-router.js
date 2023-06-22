const express = require('express');

const { recipeValidator } = require('../errors/recipes');
const { ingredientsDb, categoriesDb } = require('../db/items');
const { recipesDb } = require('../db/recipes');


const subapp = express.Router({ strict: true });

subapp.use((req, res, next) => {
    req.data = {
        db: null,
        validator: recipeValidator
    }
    next();
});


async function checkId(req, res, next) {
    const error = await req.data.validator.validateId(req.params.id);
    if (error) {
        next(error);
        return;
    }
    next();
}

async function checkCategory(req, res, next) {
    const error = await req.data.validator.validateCategory(req.body.category);
    if (error) {
        next(error);
        return;
    }
    next();
}

async function checkRating(req, res, next) {
    const error = await req.data.validator.validateRating(req.body.rating);
    if (error) {
        next(error);
        return;
    }
    next();
}

async function checkIngredients(req, res, next) {
    const error = await req.data.validator.validateIngredients(req.body.items);
    if (error) {
        next(error);
        return;
    }
    next();
}

async function normalizeCategory(req, res, next) {
    var category = req.body.category;
    if (typeof category === 'string') {
        const id = await categoriesDb.add(category);
        req.body.category = id;
    }
    next();
}

async function normalizeIngredients(req, res, next) {
    // There is an edge case to note here.
    // 
    // Two different groups of ingredients could have ingredients with
    // the 'exact' same string values. Now because every string
    // ingredient is added to the database individually, adding the 
    // same string ingredient would cause an error since the field in
    // the table is 'unique'.
    // 
    // To solve this problem, we need to first check if the ingredient
    // already exists.
    // If it exists, then we just need its corresponding key from the
    // database table.
    var ingredientNameToKey = {};
    for (var group of req.body.items) {
        var ingredients = group.ingredients;

        for (var i = 0; i < ingredients.length; i++) {
            if (typeof ingredients[i] === 'string') {
                var name = ingredients[i];
                if (ingredientNameToKey[name] !== undefined) {
                    ingredients[i] = ingredientNameToKey[name];
                }
                else {
                    const id = await ingredientsDb.add(ingredients[i]);
                    ingredientNameToKey[name] = id;
                    ingredients[i] = id;
                }
            }
        }
    }
    next();
}


async function getAll(req, res) {
    const results = await recipesDb.getAll();
    res.json(results);
}

async function get(req, res) {
    const results = await recipesDb.get(req.params.id);
    res.json(results);
}

async function iterate(req, res) {
    const id = await recipesDb.iterate(req.params.id);
    res.json({ id });
}

async function copy(req, res) {
    const id = await recipesDb.copy(req.params.id);
    res.json({ id });
}

async function add(req, res) {
    const id = await recipesDb.add(req.body);
    res.status(201).json({ id });
}

async function deleteAll(req, res) {
    await recipesDb.deleteAll();
    res.status(204).send();
}

async function deleteRecipe(req, res) {
    await recipesDb.delete(req.params.id);
    res.status(204).send();
}

async function update(req, res) {
    await recipesDb.update(req.params.id, req.body);
    res.status(204).send();
}


subapp.get('/recipes', getAll);

subapp.get('/recipes/:id', checkId, get);

subapp.get('/recipes/:id/iterate', checkId, iterate);

subapp.get('/recipes/:id/copy', checkId, copy);

subapp.post('/recipes',
    checkCategory,
    checkRating,
    checkIngredients,

    normalizeCategory,
    normalizeIngredients,

    add
);

subapp.delete('/recipes', deleteAll);

subapp.delete('/recipes/:id', checkId, deleteRecipe);

subapp.put('/recipes/:id',
    checkId,
    checkCategory,
    checkRating,
    checkIngredients,

    normalizeCategory,
    normalizeIngredients,

    update
);

module.exports = subapp;