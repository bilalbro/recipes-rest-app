import React from 'react';
import { createBrowserRouter, redirect } from 'react-router-dom';

import RootView from '../views/RootView';
import HomeView from '../views/HomeView';
import RecipeView from '../views/RecipeView';
import UpdateRecipeView from '../views/UpdateRecipeView';
import AddRecipeView from '../views/AddRecipeView';
import ItemsView from '../views/ItemsView';
import SearchView from '../views/SearchView';
import BackupView from '../views/BackupView';
import ErrorView from '../views/ErrorView';
import {
   categorySet,
   ingredientSet,
   recipeList
} from '../model';
import processRecipe from '../helpers/process-recipe';


function itemListOptions(title, itemSet)
{
   return {
      element: <ItemsView title={title} key={title} itemSet={itemSet} />,
      loader: async function() {
         return await itemSet.getAll();
      },
      action: function({params, request}) {
         return new Promise(resolve => {
            var resolvingValue = null;
            (async function() {
               var formData = await request.formData();

               // Delete item
               if (formData.has('delete')) {
                  var isItemInUse = await itemSet.isInUse(formData.get('delete'));
                  if (!isItemInUse) {
                     itemSet.remove(formData.get('delete'));
                  }
                  else {
                     resolvingValue = false;
                  }
               }

               // Update item
               else if (formData.has('update')) {
                  itemSet.update(formData.get('update'), formData.get('name'));
               }

               // Add new item
               else if (formData.has('add')) {
                  itemSet.add(formData.get('name'));
               }
            })();
            setTimeout(() => {
               resolve(resolvingValue);
            }, 1000);
         });
      }
   }
}


const router = createBrowserRouter([
   {
      path: '/',
      element: <RootView />,
      errorElement: <ErrorView />,
      children: [
         {
            path: '/',
            element: <HomeView />,
            loader: async function() {
               return await recipeList.getAllRecipes();
            },
            action: async function({params, request}) {
               await recipeList.addRecipe(processRecipe(await request.formData()));
               return null;
            }
         },
         {
            path: '/recipes/:recipeId',
            children: [
               {
                  path: '',
                  element: <RecipeView />,
                  loader: async function({params}) {
                     return await recipeList.getRecipeDetailed(params.recipeId);
                  },
               },
               {
                  path: 'delete',
                  loader: async function({params, request}) {
                     await recipeList.deleteRecipe(params.recipeId);
                     return redirect('/');
                  },
               },
               {
                  path: 'update',
                  element: <UpdateRecipeView />,
                  loader: async function({params, request}) {
                     return await recipeList.getRecipeForUpdate(params.recipeId);
                  },
                  action: async function({params, request}) {
                     var formDataMap = processRecipe(await request.formData());
                     await recipeList.updateRecipe(params.recipeId, formDataMap);
                     return redirect(`/recipe/${params.recipeId}`);
                  }
               },
               {
                  path: 'iterate',
                  loader: async function({params, request}) {
                     var key = await recipeList.makeIteration(params.recipeId);
                     return redirect(`/recipe/${key}/update`);
                  },
               },
               {
                  path: 'copy',
                  loader: async function({params, request}) {
                     var key = await recipeList.cloneRecipe(params.recipeId);
                     return redirect(`/recipe/${key}/update`);
                  },
               }
            ]
         },
         {
            path: '/add',
            element: <AddRecipeView />
         },
         {
            path: '/search',
            element: <SearchView />,
            loader: async function({params, request}) {
               var url = new URL(request.url);
               var query = url.searchParams.get('q');
               var results = await recipeList.searchRecipe(query);
               return {
                  query,
                  results
               };
            }
         },
         {
            path: '/ingredients',
            ...itemListOptions('Ingredients', ingredientSet)
         },
         {
            path: '/categories',
            ...itemListOptions('Categories', categorySet)
         },
         {
            path: '/backup',
            element: <BackupView />
         },
      ]
   }
]);

export default router;