const { ingredientsDb, categoriesDb } = require('../db/items');
const { recipesDb } = require('../db/recipes');
const { composeError } = require('./compose-error');
const {
    ingredientsValidator,
    categoriesValidator
} = require('./items');

class RecipeValidator {
    constructor(db) {
        this.db = db;
    }

    async validateId(id) {
        const exists = await this.db.exists(id);
        if (!exists) {
            return composeError(
                404,
                'NON_EXISTENT_ITEM_ERROR',
                `No recipe with the id '${id}' was found.`
            );
        }
        return false;
    }

    async validateIngredients(groups) {
        for (var group of groups) {
            var ingredients = group.ingredients;
            /**
             * Process each ingredient as follows:
             * 
             * If the ingredient is a string, add it to the database, and then replace
             * the current string with the coresponding key from the database.
             * 
             * Otherwise, if the ingredient is not a string, check whether it's an 
             * existing ingredient in the database.
             */
            for (var i = 0; i < ingredients.length; i++) {
                var ingredient = ingredients[i];
                const error = await ingredientsValidator.validate(ingredient);
                if (error) {
                    return error;
                }
            }
            return false;
        }
    }

    async validateCategory(category) {
        return await categoriesValidator.validate(category);
    }

    async validateRating(rating) {
        if (rating < 0 || rating > 5) {
            return composeError(
                400,
                'INVALID_RANGE_ERROR',
                `The given rating '${rating}' is out of range 0-5.`
            );
        }
        return false;
    }
}

exports.recipeValidator = new RecipeValidator(recipesDb);