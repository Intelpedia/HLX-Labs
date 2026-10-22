// Authorized preview of a verified paid TagadaPay order mapped to TideCo intake.
// Does not transmit to TideCo. Never expose HLX_FULFILLMENT_SECRET in the browser.
import { createClient } from "npm:@supabase/supabase-js@2";
const json=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const digest=async(x:string)=>new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(x)));
type Obj=Record<string,unknown>;
const obj=(x:unknown):Obj=>x&&typeof x==="object"&&!Array.isArray(x)?x as Obj:{};
const str=(x:unknown)=>typeof x==="string"?x.trim():"";
Deno.serve(async(req)=>{
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 const secret=Deno.env.get("HLX_FULFILLMENT_SECRET"),url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!secret||!url||!key)return json({error:"Missing server configuration"},503);
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 const [a,b]=await Promise.all([digest(secret),digest(token)]);let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
 if(!token||diff)return json({error:"Unauthorized"},401);
 let id="";try{id=str(obj(await req.json()).event_id)}catch{return json({error:"Invalid JSON"},400)}
 if(!id)return json({error:"event_id required"},400);
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.from("tagada_paid_events").select("order_id,order_payload,processing_status").eq("event_id",id).maybeSingle();
 if(error)return json({error:"Database lookup failed"},500);
 if(!data)return json({error:"Verified event not found"},404);
 const o=obj(data.order_payload),customer=obj(o.customer),ship=obj(o.shippingAddress);
 const lines=Array.isArray(o.items)?o.items:[];
 // Explicit map of Tagada variant IDs to supplier-approved SKUs.
 // Keep empty until TideCo's authoritative SKU list is provided.
 let mapping:Obj={};try{mapping=obj(JSON.parse(Deno.env.get("TIDECO_VARIANT_SKU_MAP")||"{}"))}catch{return json({error:"Invalid SKU map configuration"},503)}
 const missing:string[]=[];
 if(o.status!=="paid"||!str(o.paidAt))missing.push("Tagada order must be paid");
 if(str(o.id)!==data.order_id)missing.push("Order ID mismatch");
 const name=[str(customer.firstName),str(customer.lastName)].filter(Boolean).join(" ");
 const recipient=[str(ship.firstName),str(ship.lastName)].filter(Boolean).join(" ")||name;
 const email=str(customer.email)||str(ship.email);
 if(!recipient||!str(ship.address1)||!str(ship.postal)||!str(ship.city)||!str(ship.state)||str(ship.country)!=="US")missing.push("Complete US shipping address");
 if(!email)missing.push("Customer email");
 if(!lines.length)missing.push("Order items");
 const mapped=lines.map((v:unknown)=>{const l=obj(v),variant=str(l.variantId),sku=str(mapping[variant]),qty=l.quantity;
   if(!sku)missing.push("Missing TideCo SKU mapping for variant "+variant);
   if(!Number.isInteger(qty)||Number(qty)<=0)missing.push("Invalid quantity for "+variant);
   const cents=l.unitAmount;
   if(!Number.isInteger(cents)||Number(cents)<0)missing.push("Invalid unit price for "+variant);
   return {sku,qty,price:Number(cents)/100};
 });
 const order={orderId:data.order_id,paid:true,paidAt:o.paidAt,customer:{name,email,phone:""},
  shipTo:{name:recipient,line1:str(ship.address1),line2:str(ship.address2),city:str(ship.city),state:str(ship.state),zip:str(ship.postal),country:str(ship.country)},
  lines:mapped,note:""};
 // Do not echo customer PII to callers; only a safe diagnostic summary.
 return json({ready:missing.length===0,submitted:false,processing_status:data.processing_status,
  order_id:data.order_id,item_count:mapped.length,missing,
  preview:{orderId:order.orderId,paid:order.paid,paidAt:order.paidAt,lines:order.lines,
   shipToFieldsPresent:!!(recipient&&ship.address1&&ship.city&&ship.state&&ship.postal)},
  message:"Preview only. No TideCo intake request was made."});
});
