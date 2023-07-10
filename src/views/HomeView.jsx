import React from 'react';
import { Link, useLoaderData } from 'react-router-dom';

import RecipeCardList from '../components/RecipeCardList';


export default function Home()
{
   const categoryGroups = useLoaderData();

   return (
      categoryGroups.length
      ? <>
         <h1>Home <span className="light">({categoryGroups && categoryGroups.length})</span></h1>
         {categoryGroups.map(categoryGroup => (
            <div className="recipe-cards-group">
               <h2>{categoryGroup.name}</h2>
               <RecipeCardList list={categoryGroup.recipes} />
            </div>
         ))}
      </>
      : (
         <div className="centered">
            <h2>No recipes</h2>
            <p>Go to <Link to="/add">Add Recipe</Link> to add a new recipe.</p>
         </div>
      )
   );
}