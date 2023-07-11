import { deleteRequest, getRequest, postRequest, putRequest } from './api';


class ItemSet
{
   private data: {[key: string]: {
      name: string,
      usage: number,
   }} = {};
   private resourceName: string;
   private initDone = false;

   constructor(resourceName)
   {
      this.resourceName = resourceName;
   }

   async init()
   {
      if (!this.initDone) {
         this.initDone = true;
         await this.refresh();
      }
   }

   async refresh()
   {
      const results = await getRequest(`/${this.resourceName}`);
      for (var result of results) {
         this.data[result.id] = {
            name: result.name,
            usage: result.usage
         };
      }
   }

   async add(name: string)
   {
      await this.init();
      const { id } = await postRequest(`/${this.resourceName}`, { name });

      var record = {
         name,
         usage: 0,
      };
      this.data[id] = record;

      return id;
   }

   async get(key: number)
   {
      await this.init();
      return this.data[key];
   }

   async getForUpdate(key: string)
   {
      await this.init();
      return {
         key,
         name: this.data[key].name
      };
   }

   async getAll()
   {
      await this.init();
      var data: any[] = [];
      for (var [key, value] of Object.entries(this.data)) {
         data.push([key, value]);
      }
      return data;
   }

   async getUsageDetails(id)
   {
      await this.init();
      return await getRequest(`/${this.resourceName}/${id}/usage`);
   }

   async getAllForUpdate()
   {
      await this.init();
      var data: any[] = [];
      for (var [key, value] of Object.entries(this.data)) {
         data.push({
            key,
            name: value.name
         });
      }
      return data;
   }

   async remove(key: string)
   {
      await this.init();
      await deleteRequest(`/${this.resourceName}/${key}`);

      delete this.data[key];
   }

   async update(key: string, newName: string)
   {
      await this.init();
      await putRequest(`/${this.resourceName}/${key}`, { name: newName });
      this.data[key].name = newName;
   }

   async use(key: number)
   {
      await this.init();
      this.data[key].usage++;
   }

   async unUse(key: number)
   {
      await this.init();
      this.data[key].usage--;
   }

   async isInUse(key: number)
   {
      await this.init();
      return this.data[key].usage !== 0;
   }

   async deleteAll()
   {
      await deleteRequest(`/${this.resourceName}`)
      this.data = {};
   }
}

export default ItemSet;