import {createServerClient} from "@supabase/ssr";
import {cookies} from "next/headers";
import {getSupabaseConfig} from "./config";
import {supabaseFetch} from "./fetch";

export async function createClient(){
  const store=await cookies();
  const {url,key}=getSupabaseConfig();
  return createServerClient(url,key,{
    global:{fetch:supabaseFetch},
    cookies:{
      getAll:()=>store.getAll(),
      setAll(items){
        try{
          items.forEach(({name,value,options})=>store.set(name,value,options));
        }catch{
          // Server Components cannot write cookies; middleware refreshes them.
        }
      }
    }
  });
}
