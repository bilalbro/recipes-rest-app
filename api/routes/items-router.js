const express = require('express');

const { ingredientsDb, categoriesDb } = require('../db/items');
const { ingredientsValidator, categoriesValidator } = require('../errors/items');


async function checkNoRecipes(req, res, next) {
    const error = await req.data.validator.validateNoRecipes();
    if (error) {
        next(error);
        return
    }
    next();
}

async function checkNoUsage(req, res, next) {
    const error = await req.data.validator.validateNoUsage(req.params.id);
    if (error) {
        next(error);
        return;
    }
    next();
}

async function checkId(req, res, next) {
    const error = await req.data.validator.validateId(req.params.id);
    if (error) {
        next(error);
        return;
    }
    next();
}

async function checkName(req, res, next) {
    const error = await req.data.validator.validateName(req.body.name);
    if (error) {
        next(error);
        return;
    }
    else {
        next();
    }
}


async function getAll(req, res) {
    const results = await req.data.db.getAll();
    res.json(results);
}

async function getUsage(req, res) {
    const results = await req.data.db.getUsage(req.params.id);
    res.json(results);
}

async function deleteAll(req, res) {
    await req.data.db.deleteAll();
    res.status(204).send();
}

async function add(req, res) {
    const id = await req.data.db.add(req.body.name);
    res.status(201).json({ id });
}

async function update(req, res) {
    await req.data.db.update(req.params.id, req.body.name);
    res.status(204).send()
}

async function deleteItem(req, res) {
    await req.data.db.delete(req.params.id);
    res.status(204).send();
}


const tableNameToDb = {
    'ingredients': ingredientsDb,
    'categories': categoriesDb,
};

const tableNameToValidator = {
    'ingredients': ingredientsValidator,
    'categories': categoriesValidator,
};

exports.itemsRouter = (tableName) => {
    const subapp = express.Router({ strict: true });

    subapp.use((req, res, next) => {
        req.data = {
            db: tableNameToDb[tableName],
            validator: tableNameToValidator[tableName]
        };
        next();
    });

    subapp.get(`/${tableName}`, getAll);
    subapp.get(`/${tableName}/:id/usage`, getUsage);
    subapp.delete(`/${tableName}`, checkNoRecipes, deleteAll);
    subapp.post(`/${tableName}`, checkName, add);
    subapp.put(`/${tableName}/:id`, checkId, checkName, update);
    subapp.delete(`/${tableName}/:id`, checkId, checkNoUsage, deleteItem);

    return subapp;
}