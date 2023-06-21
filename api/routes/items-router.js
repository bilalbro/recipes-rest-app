const express = require('express');

const { ingredientsDb, categoriesDb } = require('../db/items');
const { ingredientsValidator, categoriesValidator } = require('../errors/items');


async function getAll(req, res) {
    const results = await req.data.db.getAll();
    res.json(results);
}

async function deleteAll(req, res) {
    await req.data.db.deleteAll();
    res.send('deleted everything');
}

async function add(req, res) {
    const id = await req.data.db.add(req.body.name);
    res.json({ id });
}

async function update(req, res) {
    await req.data.db.update(req.params.id, req.body.name);
    res.send('updated')
}

async function deleteItem(req, res) {
    await req.data.db.delete(req.params.id);
    res.send('deleted');
}

async function checkId(req, res, next) {
    const error = await req.data.validator.validateId(req.params.id);
    if (error) {
        res.status(error.status).json(error.error);
    }
    else {
        next();
    }
}

async function checkName(req, res, next) {
    const error = await req.data.validator.validateName(req.body.name);
    if (error) {
        res.status(error.status).json(error.error);
    }
    else {
        next();
    }
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
    subapp.delete(`/${tableName}`, deleteAll);
    subapp.post(`/${tableName}`, checkName, add);
    subapp.put(`/${tableName}/:id`, checkId, checkName, update);
    subapp.delete(`/${tableName}/:id`, checkId, deleteItem);

    return subapp;
}