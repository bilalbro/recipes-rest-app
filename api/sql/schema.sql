DROP DATABASE recipes_app;
CREATE DATABASE IF NOT EXISTS recipes_app;
USE recipes_app;

CREATE TABLE IF NOT EXISTS recipes (
    id SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100),
    date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rating TINYINT,
    instructions TEXT,
    review TINYTEXT,
    yield VARCHAR(50),
    previous SMALLINT UNSIGNED NULL,
    next SMALLINT UNSIGNED NULL
);

CREATE TABLE IF NOT EXISTS categories (
    id SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS ingredients (
    id SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_categories (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    category_id SMALLINT UNSIGNED NOT NULL,
    recipe_id SMALLINT UNSIGNED NOT NULL,

    CONSTRAINT fk_rc_recipe_id
        FOREIGN KEY (recipe_id)
        REFERENCES recipes (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_rc_category_id
        FOREIGN KEY (category_id)
        REFERENCES categories (id)
);

CREATE TABLE IF NOT EXISTS recipe_groups (
    id SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    recipe_id SMALLINT UNSIGNED,
    name VARCHAR(100),

    CONSTRAINT fk_rg_recipe_id
        FOREIGN KEY (recipe_id)
        REFERENCES recipes (id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    ingredient_id SMALLINT UNSIGNED NOT NULL,
    group_id SMALLINT UNSIGNED,
    recipe_id SMALLINT UNSIGNED NOT NULL,
    quantity VARCHAR(30),

    CONSTRAINT fk_ri_recipe_id
        FOREIGN KEY (recipe_id)
        REFERENCES recipes (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_ri_group_id
        FOREIGN KEY (group_id)
        REFERENCES recipe_groups (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_ri_ingredient_id
        FOREIGN KEY (ingredient_id)
        REFERENCES ingredients (id)
        ON DELETE CASCADE
);


-- -----------------------------------------------------------------------------
-- Views
-- -----------------------------------------------------------------------------
CREATE VIEW ingredients_vw AS (
    SELECT ingredients.id, name, count(recipe_ingredients.ingredient_id) AS `usage`
    FROM ingredients LEFT JOIN recipe_ingredients
    ON ingredients.id = recipe_ingredients.ingredient_id
    GROUP BY ingredients.id
);
CREATE VIEW categories_vw AS (
    SELECT categories.id, name, count(recipe_categories.category_id) AS `usage`
    FROM categories LEFT JOIN recipe_categories
    ON categories.id = recipe_categories.category_id
    GROUP BY categories.id
);

CREATE VIEW recipes_vw AS (
    SELECT r.id, r.name, rating, date_created, previous, next, rc.category_id AS `category`
    FROM recipes AS r JOIN recipe_categories AS rc
    ON r.id = rc.recipe_id
);

CREATE VIEW recipe_groups_vw AS (
    SELECT t1.recipe_id, names, ingredient_names, ingredient_ids, quantities
    FROM (
        SELECT recipe_id, json_arrayagg(name) names
        FROM recipe_groups rg
        GROUP BY rg.recipe_id
    ) t1
    JOIN (
        SELECT
            recipe_id,
            json_arrayagg(name) ingredient_names,
            json_arrayagg(i_id) ingredient_ids,
            json_arrayagg(q) quantities
        FROM (
            SELECT
                ri.recipe_id,
                json_arrayagg(name) name,
                json_arrayagg(i.id) i_id,
                json_arrayagg(quantity) q
            FROM recipe_ingredients ri JOIN ingredients i
            ON ri.ingredient_id = i.id
            GROUP BY ri.recipe_id, ri.group_id
        ) rc
        GROUP BY rc.recipe_id
    ) t2
    ON t1.recipe_id = t2.recipe_id
);

CREATE VIEW recipes_detailed_vw AS (
    SELECT
        r.id, r.name, r.date_created, category, r.rating, yield, instructions,
        review, r.previous, r.next
    FROM recipes r JOIN recipes_vw rv
    ON r.id = rv.id
);