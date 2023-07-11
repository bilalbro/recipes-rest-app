const db = require('.');


class ItemsDatabase {
    constructor(tableName) {
        this.tableName = tableName;
        this.idName = tableName === 'ingredients' ? 'ingredient' : 'category';
    }

    async getAll(forRestoration) {
        if (forRestoration) {
            const [results] = await db.query(
                `SELECT id, name FROM ${this.tableName}_vw`,
            );
            return results;
        }
        else {
            const [results] = await db.query(
                `SELECT id, name, \`usage\` FROM ${this.tableName}_vw`,
            );
            return results;
        }
    }

    async get(id) {
        var [results] = await db.query(
            `SELECT * FROM ${this.tableName}_vw
            WHERE id=${id}`
        );
        return results[0];
    }

    async getUsage(id) {
        var [results] = await db.query(
            `SELECT recipe_id id, name
            FROM recipe_${this.tableName} ri JOIN recipes
            ON ri.recipe_id = recipes.id
            WHERE ${this.idName}_id = ${id}
            ORDER BY name`
        );
        return results;
    }

    async deleteAll() {
        await db.query(`DELETE FROM ${this.tableName}`);
    }

    async add(name, id = null) {
        var [results] = await db.execute(
            `INSERT INTO ${this.tableName} (id, name) VALUES (?, ?)`,
            [id, name]
        );
        return results.insertId;
    }

    async update(id, name) {    
        await db.query(
            `UPDATE ${this.tableName} SET name='${name}' WHERE id=${id}`,
        );
    }

    async delete(id) {        
        await db.query(
            `DELETE FROM ${this.tableName} WHERE id=${id}`
        )
    }

    async exists(idOrName) {
        if (typeof idOrName === 'number') {
            var [results] = await db.query(
                `SELECT * FROM ${this.tableName} WHERE id=${idOrName}`
            );
        }
        else {
            var [results] = await db.query(
                `SELECT * FROM ${this.tableName} WHERE name='${idOrName}'`
            );
        }
        return results.length !== 0;
    }

    async restore(dataSet) {
        for (var data of dataSet) {
            await this.add(data.name, data.id);
        }
    }
}

exports.ingredientsDb = new ItemsDatabase('ingredients');
exports.categoriesDb = new ItemsDatabase('categories');