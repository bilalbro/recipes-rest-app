import {
   categorySet,
   ingredientSet
} from '.';
import {
   getRequest,
   postRequest,
   putRequest,
   deleteRequest
} from './api';
import {
   Recipe,
   RecipeFormData,
   RecipeCompact,
   RecipeDetailed,
   RecipeForUpdate,
   RecipeDetailedIngredientStatus
} from './types';
import deepClone from '../helpers/deepClone';
import diffQuantities from './differ';


class RecipeList
{
   private data: {[key: string]: Recipe} = {};
   private initDone = false;


   async init()
   {
      if (!this.initDone) {
         this.initDone = true;
         await this.refresh();
      }
   }

   async refresh()
   {
      const results = await getRequest('/recipes');
      for (var result of results) {
         result.extended = false;
         this.data[result.id] = result;
      }
   }


   async addRecipe(data: RecipeFormData)
   {
      await this.init();

      const { id } = await postRequest(`/recipes`, data);
      await this._getRecipe(id, true);

      // After adding a new recipe, we might have new ingredients and categories.
      // Likewise, we need to refresh both the item sets in order to have the
      // fresh data with us.
      await categorySet.refresh();
      await ingredientSet.refresh();
   }


   async cloneRecipe(key: string)
   {
      await this.init();

      const { id } = await getRequest(`/recipes/${key}/copy`);
      await this._getRecipe(id);

      // 'Use' the ingredients and the category.
      await this._useCategoryAndIngredients(key);

      return id;
   }


   async getRecipe(key: string)
   {
      await this.init();

      var record = this.data[key];
      var recordProcessed: RecipeCompact = deepClone(record);

      // Process data
      recordProcessed.dateCreated = new Date(record.dateCreated);

      // Process category
      recordProcessed.category = (await categorySet.get(record.category)).name;

      return recordProcessed;
   }


   private async _getRecipe(key: string, force?: true)
   {
      await this.init();

      if (!this.data[key] || this.data[key].extended === false || force) {
         const record = await getRequest(`/recipes/${key}`);
         this.data[key] = record;
         this.data[key].extended = true;
      }
      return this.data[key];
   }


   async getAllRecipes()
   {
      await this.init();
      var records: RecipeCompact[] = [];

      for (var key in this.data) {
         var record = await this.getRecipe(key);
         if (record.extended === false || record.next === null) {
            records.push(record);
         }
      }

      records.sort((a, b) => {
         if (a.category < b.category) return -1;
         if (a.category > b.category) return 1;
         return 0;
      });
      records = records.reduce<any[]>((records, record) => {
         var lastRecord = records[records.length - 1];
         if (!lastRecord || record.category !== lastRecord.name) {
            records.push({
               name: record.category,
               recipes: []
            });
            lastRecord = records[records.length - 1];
         }
         lastRecord.recipes.push(record);
         return records;
      }, []);

      return records;
   }


   private async compareIngredient(
      key: string,
      itemIndex: number,
      ingredientKey: number
   ): Promise<RecipeDetailedIngredientStatus>
   {
      await this.init();

      var record = this.data[key];
      if (record.previous) {
         var previousRecord = await this._getRecipe(record.previous as any);
         var ingredients = record.items[itemIndex].ingredients;
         var previousIngredients = previousRecord.items[itemIndex].ingredients;

         // First, determine if the current ingredient is 'new'.
         if (!previousIngredients.includes(ingredientKey)) {
            return 'new';
         }
         else {
            // Given that the current ingredient is not 'new', further check if
            // it has increased or decreased in quantity.

            var quantity = record.items[itemIndex].quantities[ingredients
               .indexOf(ingredientKey)];
            var previousQuantity = previousRecord.items[itemIndex].quantities[
               previousIngredients.indexOf(ingredientKey)];

            return diffQuantities(quantity, previousQuantity);
         }
      }

      else {
         return 'same';
      }
   }


   async getRecipeDetailed(key: string)
   {
      await this.init();

      await this._getRecipe(key);
      var recordProcessed: RecipeDetailed = await this.getRecipe(key) as any;

      // Process ingredients
      try {
         var itemIndex = 0;
         for (var item of recordProcessed.items) {
            var ingredients = item.ingredients;
            for (var i = 0, len = ingredients.length; i < len; i++) {
               ingredients[i] = {
                  name: (await ingredientSet.get(ingredients[i] as any)).name,
                  status: await this.compareIngredient(key, itemIndex, ingredients[i] as any)
               }
            }
            itemIndex++;
         }
         recordProcessed.iterations = await this.getIterationDetails(key);
      }
      catch (e) {
         console.log('error occurred', e);
      }

      return recordProcessed;
   }


   async getRecipeForUpdate(key: string)
   {
      await this.init();

      var record: RecipeForUpdate = deepClone(await this._getRecipe(key));

      // Process category
      record.category = await categorySet.getForUpdate(record.category as any);

      // Process ingredients
      for (var item of record.items) {
         var ingredients = item.ingredients;
         for (var i = 0, len = ingredients.length; i < len; i++) {
            ingredients[i] = await ingredientSet.getForUpdate(ingredients[i] as any);
         }
      }

      return record;
   }


   async deleteRecipe(key: string)
   {
      await this.init();
      await deleteRequest(`/recipes/${key}`);

      // Below, we could re-fetch data from the API and just use it to populate
      // the category and ingredient sets with the updated usages, but that's
      // totally unnecessary — it would waste bandwidth. We could replicate the
      // entire logic on the client, which is done below.
      // 
      // It's really simple :)

      await this._unUseCategoryAndIngredients(key);

      var record = this.data[key];

      // Restructure the iteration pointers.
      if (record.previous) {
         await this._updateRecipeRecord(record.previous, { next: record.next });
      }
      if (record.next) {
         await this._updateRecipeRecord(record.next, { previous: record.previous });
      }

      delete this.data[key];
   }


   private async _forEachIngredient(
      key: string,
      callback: (ingredientKey: number) => void
   )
   {
      await this.init();

      var record = this.data[key];
      for (var item of record.items) {
         for (var ingredient of item.ingredients) {
            await callback(ingredient);
         }
      }
   }


   private async _useCategoryAndIngredients(key: string)
   {
      await this.init();
      var record = this.data[key];

      // use() the category.
      await categorySet.use(record.category);

      // Go over all ingredients and use() each one.
      await this._forEachIngredient(key, async (ingredientKey) => {
         await ingredientSet.use(ingredientKey as number);
      });
   }


   private async _unUseCategoryAndIngredients(key: string)
   {
      await this.init();
      var record = this.data[key];

      // unUse() the category.
      await categorySet.unUse(record.category);

      // Go over all ingredients and unUse() each one.
      await this._forEachIngredient(key, async (ingredientKey) => {
         await ingredientSet.unUse(ingredientKey as number);
      });
   }


   async makeIteration(key: string)
   {
      await this.init();
      const result = await getRequest(`/recipes/${key}/iterate`);

      // Re-fetch the current record and the new record.
      await this._getRecipe(key, true);
      await this._getRecipe(result.id, true);

      // 'Use' the ingredients and the category.
      await this._useCategoryAndIngredients(key);

      return result.id;
   }


   async updateRecipe(key: string, data: RecipeFormData)
   {
      await this.init();
      await putRequest(`/recipes/${key}`, data);

      // When a recipe is updated, we need to re-fetch it from the API.
      // 
      // This is necessary because it might be that more ingredients are added to
      // the recipe or maybe even its category is changed, and only the backend
      // database knows of the keys it ultimately assigns to these 'new' things.
      // Hence, by re-fetching the record, we can be sure as to what exactly is
      // the new set of ingredients and categories.
      await this._getRecipe(key, true);

      // This also means that we need to refresh both the category and ingredient
      // sets, with fresh data from the API, so that they remain up-to-date.
      await categorySet.refresh();
      await ingredientSet.refresh();
   }


   private async _updateRecipeRecord(key: number, record: Object)
   {
      this.data[key] = Object.assign(this.data[key], record);
   }


   async getIterationDetails(key: string)
   {
      await this.init();

      var previous = this.data[key].previous;
      var next = this.data[key].next;

      if (previous || next) {
         var previousRecords = 1;
         while (previous !== null) {
            previousRecords++;
            previous = (await this._getRecipe(previous as any)).previous;
         }

         var nextRecords = 0;
         while (next !== null) {
            nextRecords++;
            next = (await this._getRecipe(next as any)).next;
         }

         return {
            current: previousRecords,
            total: previousRecords + nextRecords,
            next: this.data[key].next,
            previous: this.data[key].previous
         }
      }

      return null;
   }


   async searchRecipe(query: string)
   {
      await this.init();
      console.log('searching recipe');

      var results: RecipeCompact[] = [];
      for (var key in this.data) {
         var record = this.data[key];
         if (record.name.toLowerCase().includes(query.toLowerCase())) {
            results.push(await this.getRecipe(key));
         }
      }

      return results;
   }


   async download()
   {
      await this.init();
      const backup = await getRequest('/');

      const anchorElement = document.createElement('a');
      anchorElement.download = 'recipes-app.json';

      const blob = new Blob([JSON.stringify(backup)], {
         type: 'applicaton/json'
      });
      const url = URL.createObjectURL(blob);
      anchorElement.href = url;
      anchorElement.click();
   }


   async normalizeJSON(jsonString: string)
   {
      const obj = JSON.parse(jsonString);
      if (!obj.name) {
         return jsonString;
      }
      else {
         const restoringObj: {
            categories: any[],
            ingredients: any[],
            recipes: any[],
         } = {
            categories: [],
            ingredients: [],
            recipes: [],
         };

         const stores = obj.stores;
         for (var store of stores) {
            if (store.name === 'categories' || store.name === 'ingredients') {
               for (var record of store.records) {
                  restoringObj[store.name].push({
                     id: record[0],
                     name: record[1].name
                  });
               }
            }
            else {
               // We are in the 'recipes' store.

               var i = 0;
               var keyToIntegerMap = {};

               // First we need to go over all the recipes and normalize the
               // awkward string ids (representing timestamps) to integer ids.
               for (var record of store.records) {
                  keyToIntegerMap[record[0]] = ++i;
               }

               for (var record of store.records) {
                  var recipeRecord = record[1];
                  recipeRecord.id = keyToIntegerMap[record[0]];
                  if (recipeRecord.previous) {
                     recipeRecord.previous = keyToIntegerMap[recipeRecord.previous];
                  }
                  if (recipeRecord.next) {
                     recipeRecord.next = keyToIntegerMap[recipeRecord.next];
                  }
                  restoringObj.recipes.push(recipeRecord);
               }
            }
         }
         return JSON.stringify(restoringObj);
      }
   }


   async restore(jsonString: string)
   {
      await this.init();
      await postRequest(`/`, await this.normalizeJSON(jsonString));

      await this.refresh();
      await categorySet.refresh();
      await ingredientSet.refresh();
   }


   async deleteAll()
   {
      await this.init();

      // Delete all recipes on the client and server.
      await deleteRequest(`/recipes`);
      this.data = {};

      await ingredientSet.deleteAll();
      await categorySet.deleteAll();
   }
}

export default RecipeList;