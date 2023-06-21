const { ingredientsDb, categoriesDb } = require('../db/items');
const { composeError } = require('./compose-error');


class ItemsValidator {
    constructor(db, type) {
        this.db = db;
        this.type = type;
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