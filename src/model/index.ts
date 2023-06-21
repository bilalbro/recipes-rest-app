import ItemSet from './item-set';
import RecipeList from './recipe-list';

const recipeList = new RecipeList();
const categorySet = new ItemSet('categories');
const ingredientSet = new ItemSet('ingredients');

export {
   categorySet,
   ingredientSet,
   recipeList
}