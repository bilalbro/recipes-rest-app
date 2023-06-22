const db = require('.');


class RecipesDatabase {
    constructor(tableName) {
        this.tableName = tableName;
    }

    async getAll(forRestoration) {
        if (forRestoration) {
            const [results] = await db.query(
                `SELECT id FROM recipes`
            );
            var detailedResults = [];
            for (var result of results) {
                detailedResults.push(await this.get(result.id));
            }
            return detailedResults;
        }
        else {
            const [results] = await db.query(
                `SELECT
                    id, name, rating,
                    UNIX_TIMESTAMP(date_created) * 1000 as dateCreated,
                    category
                FROM recipes_vw WHERE next IS NULL`
            );
            return results;
        }
    }

    async get(id) {
        var result;
        var [results] = await db.query(
            `SELECT 
                id, name,
                UNIX_TIMESTAMP(date_created) * 1000 as dateCreated,
                category, rating, yield, instructions, review, previous, next
            FROM recipes_detailed_vw
            WHERE id=${id}`
        );
        result = results[0];

        var [results] = await db.query(
            `SELECT names, quantities, ingredient_ids ingredients FROM recipe_groups_vw
            WHERE recipe_id=${id}`
        );
        var groupsInfo = results[0];

        var items = [];
        var groupNames = groupsInfo.names;
        var ingredientGroups = groupsInfo.ingredients;
        var quantitiesGroups = groupsInfo.quantities;
        for (var i = 0; i < groupNames.length; i++) {
            items.push({
                name: groupNames[i],
                ingredients: ingredientGroups[i],
                quantities: quantitiesGroups[i],
            });
        }
        result.items = items;
        return result;
    }

    async iterate(id) {
        const result = await this.get(id);

        const newRecipeId = await this.add(result, null, id, null);
        await db.query(
            `UPDATE recipes SET next=${newRecipeId} WHERE id=${id}`
        );
        return newRecipeId;
    }

    async copy(id) {
        const result = await this.get(id);
        const newId = await this.add(result);
        return newId;
    }

    async add(data, id = null, previous = null, next = null) {
        // First we have to add the recipe to the 'recipes' table.
        const [{ insertId: recipeId }] = await db.execute(
            `INSERT INTO ${this.tableName}
            (name, rating, yield, instructions, review, id, previous, next)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.name, data.rating, data.yield, data.instructions, data.review,
                id, previous, next]
        );

        // If a dateCreated field exists on the given data object, we need to
        // update the table with it.
        if (data.dateCreated) {
            await db.execute(
                `UPDATE ${this.tableName}
                SET date_created = FROM_UNIXTIME(? / 1000)
                WHERE id=${recipeId}`,
                [data.dateCreated]
            );
        }

        // Next we ought to add an entry in the 'recipe_categories' table.
        await db.query(
            `INSERT INTO recipe_categories
            (category_id, recipe_id)
            VALUES
            (${data.category}, ${recipeId})`
        );

        // Next we ought to add entries in the 'recipe_groups' table.
        for (var group of data.items) {
            var [{ insertId: groupId }] = await db.query(
                `INSERT INTO recipe_groups
                (recipe_id, name)
                VALUES
                (${recipeId}, '${group.name}')`
            );

            // For each group, we need to add its corresponding ingredients as well.
            var ingredients = group.ingredients;
            var quantities = group.quantities;
            for (var i = 0; i < ingredients.length; i++) {
                await db.query(
                    `INSERT INTO recipe_ingredients
                    (ingredient_id, group_id, recipe_id, quantity)
                    VALUES
                    (${ingredients[i]}, ${groupId}, ${recipeId}, '${quantities[i]}')`
                );
            }
        }
        return recipeId;
    }

    async update(id, data) {
        const [results] = await db.query(
            `SELECT previous, next FROM recipes WHERE id=${id}`
        );

        await this.delete(id, true);
        await this.add(data, id, results[0].previous, results[0].next);
    }

    async delete(id, preventIterationCorrection) {
        // If the recipe being deleted has a 'previous' iteration and a 'next'
        // iteration, they have to be updated.

        if (!preventIterationCorrection) {
            const result = await this.get(id);
            if (result.next !== null) {
                await db.query(
                    `UPDATE ${this.tableName}
                    SET previous=${result.previous}
                    WHERE id=${result.next}`
                );
            }
            if (result.previous !== null) {
                await db.query(
                    `UPDATE ${this.tableName}
                    SET next=${result.next}
                    WHERE id=${result.previous}`
                );
            }
        }
        await db.query(
            `DELETE FROM ${this.tableName} WHERE id=${id}`
        );
    }

    async deleteAll() {
        await db.query(
            `DELETE FROM ${this.tableName}`
        );
    }

    async exists(id) {
        var [results] = await db.query(
            `SELECT * FROM ${this.tableName} WHERE id=${id}`
        );
        return results.length !== 0;
    }

    async isEmpty() {
        var [results] = await db.query(
            `SELECT COUNT(*) AS count FROM ${this.tableName}`
        );
        return results[0].count === 0;
    }

    async restore(dataSet) {
        for (var data of dataSet) {
            await this.add(data, data.id, data.previous, data.next);
        }
    }
}

exports.recipesDb = new RecipesDatabase('recipes');