// HLX Labs: server-side preparation of a TideCo order from a verified TagadaPay event.
// Safe-by-default: NEVER submits an order until mapping and checkout field formats are reviewed.
// This endpoint is an authenticated administrative readiness check, not a browser API.
import { createClient } from "npm:@supabase/supabase-js@2";
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const hash=async(v:string)=>new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)));
Deno.serve(async(req)=>{
  if(req.method!=="POST")return reply({error:"Method not allowed"},405);
  const secret=Deno.env.get("HLX_FULFILLMENT_SECRET"),url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!secret||!url||!key)return reply({error:"Missing server configuration"},503);
  const provided=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
  const [a,b]=await Promise.all([hash(secret),hash(provided)]);
  let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];
  if(!provided||difference)return reply({error:"Unauthorized"},401);
  let eventId="";
  try{const body=await req.json();eventId=typeof body.event_id==="string"?body.event_id.trim():"";}catch{return reply({error:"Invalid JSON"},400)}
  if(!eventId)return reply({error:"event_id required"},400);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:event,error}=await db.from("tagada_paid_events").select("event_id,order_id,order_payload,processing_status").eq("event_id",eventId).maybeSingle();
  if(error)return reply({error:"Database lookup failed"},500);
  if(!event)return reply({error:"Verified payment event not found"},404);
  const payload=event.order_payload;
  if(!payload||typeof payload!=="object")return reply({error:"Stored Tagada order invalid"},422);
  // The documented TideCo payload requires customer, shipTo, and exact SKU mapping.
  // Tagada's actual order response shape and TideCo partner SKU file must be verified
  // before implementing the transformation or enabling automatic dispatch.
  return reply({ready:false,order_id:event.order_id,status:event.processing_status,
    missing:["Verified Tagada order-to-customer/shipping field mapping","TideCo exact SKU mapping","Approved server-side dispatch and retry policy"],
    message:"Order safely held; no request sent to TideCo."},200);
});
