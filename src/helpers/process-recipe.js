function normalizeItem(item) {
   if (isNaN(Number(item))) {
      return item;
   }
   return Number(item);
}

export default function processRecipeForm(formData)
{
   var recipe = {};
   var processingIngredients = false;

   recipe.items = [];

   for (var [key, value] of formData) {
      if (key === 'group') {
         processingIngredients = true;
      }
      else if (key === 'groupend') {
         processingIngredients = false;
         continue;
      }

      if (processingIngredients) {
         if (key === 'group') {
            recipe.items.push({
               name: value,
               ingredients: [],
               quantities: []
            });
         }
         else {
            recipe.items[recipe.items.length - 1][key].push(value);
         }
      }

      else {
         recipe[key] = value;
      }
   }
   
   // Category and ingredient normalization
   recipe.category = normalizeItem(recipe.category);

   for (var group of recipe.items) {
      var ingredients = group.ingredients;
      for (var i = 0; i < ingredients.length; i++) {
         ingredients[i] = normalizeItem(ingredients[i]);
      }
   }

   // Rating type coercion
   recipe.rating = +recipe.rating;
   
   return recipe;
}