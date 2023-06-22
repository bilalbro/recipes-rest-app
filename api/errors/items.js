const { ingredientsDb, categoriesDb } = require('../db/items');
const { recipesDb } = require('../db/recipes');
const { composeError } = require('./compose-error');


class ItemsValidator {
    constructor(db, type) {
        this.db = db;
        this.type = type;
    }

    async validateNoRecipes() {
        // Are there any recipes or not?
        const isEmpty = await recipesDb.isEmpty();
        if (!isEmpty) {
            return composeError(
                409,
                'ITEM_IN_USE_ERROR',
                `Can't delete all ${this.type} items because some are in use.`
            )
        }
        return false;
    }

    async validateNoUsage(id) {
        const result = await this.db.get(id);
        if (result.usage !== 0) {
            return composeError(
                409,
                `ITEM_IN_USE_ERROR`,
                `Can't delete ${this.type} with id '${id}' as its in use.`
            )
        }
        return false;
    }

    async validateId(id) {
        const exists = await this.db.exists(Number(id));
        if (!exists) {
            return composeError(
                404,
                'NON_EXISTENT_ITEM_ERROR',
                `Id '${id}' for ${this.type} does not exist.`
            )
        }
        return false;
    }

    async validateName(name) {
        const exists = await this.db.exists(name);
        if (exists) {
            return composeError(
                400,
                'DUPLICATE_NAME_ERROR',
                `Name '${name}' for ${this.type} already exists.`
            )
        }
        return false;
    }

    async validate(idOrName) {
        if (typeof idOrName === 'number') {
            return await this.validateId(idOrName);
        }
        else {
            return await this.validateName(idOrName);
        }
    }
}

exports.ingredientsValidator = new ItemsValidator(ingredientsDb, 'ingredient');
exports.categoriesValidator = new ItemsValidator(categoriesDb, 'category');