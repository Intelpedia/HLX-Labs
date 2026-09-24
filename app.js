// ============================================================
// HLX LABS PRODUCT CATALOG
// Edit the product entries below to update the Shop,
// Product Detail pages, Cart, COA Library, and Order system.
//
// For multiple sizes/concentrations, you can replace `size` and
// `price` with an `options` array. Example:
// options: [
//   { label: "5mg - Single Vial", price: 49.99 },
//   { label: "10mg - Single Vial", price: 79.99 }
// ]
// ============================================================

const products = [
  // PRODUCT 01
  {
    id: 1,
    name: 'HLR-3',
    tier: "Extreme",
    desc: "HLR-3 is an investigational peptide studied in laboratory research involving GLP-1, GIP, and glucagon receptor signaling and associated metabolic pathways..",
    options: [
      { label: "12mg", price: 60.00 },
      { label: "20mg", price: 90.00 }
    ],
    productImage: "assets/RETATRUTIDE.JPG",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 02
  {
    id: 2,
    name: 'HLT-2',
    tier: "Extreme",
    desc: "HLT-2 is a peptide studied in laboratory research involving GIP and GLP-1 receptor activity and associated metabolic signaling pathways.",
    options: [
      { label: "10mg", price: 40.00 },
      { label: "30mg", price: 60.00 }
    ],
    productImage: "assets/TIRZEPATIDE.JPG",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 03
  {
    id: 3,
    name: 'HLS-1 10mg',
    tier: "Extreme",
    desc: "HLS-1 is a GLP-1 receptor agonist studied in research involving GLP-1 receptor signaling and associated metabolic and cellular pathways.",
    price: 40.00,
    size: "Single Vial",
    productImage: "assets/SEMAGLUTIDE.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 04
  {
    id: 4,
    name: 'Cagrilintide 10mg',
    tier: "Extreme",
    desc: "Cagrilintide is a long-acting amylin analog investigated in reseach involving amylin receptor signaling and metabolic regulatory pathways.",
    price: 80.00,
    size: "Single Vial",
    productImage: "assets/CAGRILINTIDE.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 05
  {
    id: 5,
    name: 'Tesamorelin 12mg',
    tier: "High",
    desc: "Tesamorelin is a growth hormone-releasing hormone (GHRH) analog studied in research involving GHRH receptor activity and downstream endocrine signaling pathways.",
    price: 70.00,
    size: "Single Vial",
    productImage: "assets/Tesareal.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 06
  {
    id: 6,
    name: 'Ipamorelin 10mg',
    tier: "High",
    desc: "Ipamorelin is a synthetic peptide studied for its interaction with the growth hormone secretagogue receptor and associated cellular and endocrine signaling pathways.",
    price: 40.00,
    size: "Single Vial",
    productImage: "assets/IPAMORELIN.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 07
  {
    id: 7,
    name: 'CJC-1295 10mg',
    tier: "High",
    desc: "CJC-1295 is a synthetic GHRH analog studied in laboratory research involving growth hormone-releasing hormone receptor activity and related peptide signaling pathways.",
    price: 40.00,
    size: "Single Vial",
    productImage: "assets/CJC-1295.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 08
  {
    id: 8,
    name: 'Sermorelin 10mg',
    tier: "High",
    desc: "Sermorelin is a GHRH-related peptide studied for its interaction with GHRH receptors and associated endocrine signaling mechanisms.",
    price: 40.00,
    size: "Single Vial",
    productImage: "assets/SERMORELIN.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 09
  {
    id: 9,
    name: 'GHRP-2 10mg',
    tier: "High",
    desc: "GHRP-2 is a synthetic growth hormone-releasing peptide studied in research involving growth hormone secretagogue receptors and associated signaling pathways.",
    price: 50.00,
    size: "Single Vial",
    productImage: "assets/GHRP-2.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 10
  {
    id: 10,
    name: 'GHRP-6 10mg',
    tier: "High",
    desc: "GHRP-6 is a synthetic peptide investigated in laboratory models involving growth hormone secretagogue receptor activity and related endocrine signaling pathways.",
    price: 50.00,
    size: "Single Vial",
    productImage: "assets/GHRP-6.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 11
  {
    id: 11,
    name: 'BPC-157 15mg',
    tier: "Extreme",
    desc: "BPC-157 is an experimental peptide investigated in preclinical research involving cellular signaling, tissue-response mechanisms, and biological repair pathways.",
    price: 50.00,
    size: "Single Vial",
    productImage: "assets/BPC-157.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 12
  {
    id: 12,
    name: 'TB-500 15mg',
    tier: "Extreme",
    desc: "TB-500 is a synthetic peptide related to thymosin beta-4 and studied in laboratory research involving cellular migration, actin regulation, and tissue-response pathways.",
    price: 70.00,
    size: "Single Vial",
    productImage: "assets/TB-500.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 13
  {
    id: 13,
    name: 'GHK-Cu 50mg',
    tier: "Low",
    desc: "GHK-Cu is a naturally occurring copper-binding peptide studied in research involving cellular signaling, extracellular matrix activity, and copper-dependent biological processes.",
    price: 40.00,
    size: "Single Vial",
    productImage: "assets/GHK-Cu.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 14
  {
    id: 14,
    name: 'KPV 10mg',
    tier: "Low",
    desc: "KPV is a short peptide fragment derived from alpha-melanocyte-stimulating hormone (alpha-MSH) and studied in laboratory models involving inflammatory signaling and cellular-response pathways.",
    price: 40.00,
    size: "Single Vial",
    productImage: "assets/KPV.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 15
  {
    id: 15,
    name: 'Semax 10mg',
    tier: "Low",
    desc: "Semax is a synthetic peptide investigated in experimental research involving neurological signaling, neurotrophic pathways, and neuroplasticity-related mechanisms.",
    price: 50.00,
    size: "Single Vial",
    productImage: "assets/SEMAX.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 16
  {
    id: 16,
    name: 'Selank 10mg',
    tier: "Low",
    desc: "Selank is a synthetic peptide studied in experimental research involving neurological, neurotransmitter, and immune-signaling pathways.",
    price: 50.00,
    size: "Single Vial",
    productImage: "assets/SELANK.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 17
  {
    id: 17,
    name: 'SNAP-8 10mg',
    tier: "Low",
    desc: "Acetyl Octapeptide-3, commonly known as SNAP-8, is a synthetic octapeptide studied in cosmetic and laboratory research involving peptide signaling and mechanisms associated with facial expression lines.",
    price: 40.00,
    size: "Single Vial",
    productImage: "assets/SNAP-8.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 18
  {
    id: 18,
    name: 'MOTS-C',
    tier: "Low",
    desc: "MOTS-C is a mitochondrial-derived peptide investigated in laboratory research involving mitochondrial signaling, cellular energy regulation, and metabolic pathways.",
    options: [
      { label: "10mg", price: 50.00 },
      { label: "40mg", price: 80.00 }
    ],
    productImage: "assets/Motsreal.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 19
  {
    id: 19,
    name: 'Epithalon 10mg',
    tier: "Low",
    desc: "Epithalon is a synthetic tetrapeptide studied experimentally in research involving cellular aging, circadian biology, and telomere-associated mechanisms.",
    price: 40.00,
    size: "Single Vial",
    productImage: "assets/EPITHALON.png",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 20
  {
    id: 20,
    name: 'NAD+',
    tier: "Low",
    desc: "Nicotinamide adenine dinucleotide (NAD+) is a naturally occurring coenzyme extensively studied for its role in cellular energy metabolism, redox reactions, and NAD-dependent signaling pathways.",
    options: [
      { label: "500mg", price: 50.00 },
      { label: "1000mg", price: 90.00 }
    ],
    productImage: "assets/NAD+.png",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 21
  {
    id: 21,
    name: 'Thymosin Alpha-1 10mg',
    tier: "Low",
    desc: "Thymosin Alpha-1 is a peptide studied in laboratory research involving immune-system signaling, T-cell activity, cytokine regulation, and other immune-response pathways.",
    price: 60.00,
    size: "Single Vial",
    productImage: "assets/THYMOSIN ALPHA-1.png",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 22
  {
    id: 22,
    name: 'PT-141 10mg',
    tier: "High",
    desc: "PT-141, also known as bremelanotide, isa melanocortin receptor agonist studied in research involving melanocortin receptor signaling and associated neurological pathways.",
    price: 40.00,
    size: "Single Vial",
    productImage: "assets/PT-141.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 23
  {
    id: 23,
    name: 'Kisspeptin 5mg',
    tier: "High",
    desc: "Kisspeptin is a naturally occurring peptide studied for its interaction with the KISS 1 receptor and its role in reproductive and neuroendocrine signaling research.",
    price: 50.00,
    size: "Single Vial",
    productImage: "assets/KISSPEPTIN.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 24
  {
    id: 24,
    name: 'Melanotan I 10mg',
    tier: "Extreme",
    desc: "Melanotan I is a synthetic analog of alpha-melanocyte-stimulating hormone studied in research involving melanocortin receptors and pigmentation-related signaling pathways.",
    price: 40.00,
    size: "Single Vial",
    productImage: "assets/MELANOTAN.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 25
  {
    id: 25,
    name: 'Melanotan II 10mg',
    tier: "Extreme",
    desc: "Melanotan II is a synthetic melanocortin peptide investigated in laboratory research involving melanocortin receptor activity and associated cellular signaling pathways.",
    price: 40.00,
    size: "Single Vial",
    productImage: "assets/MELANOTAN.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 26
  {
    id: 26,
    name: 'DSIP 10mg',
    tier: "Low",
    desc: "DSIP is a peptide studied experimentally in research involving neurological signaling, sleep-associated mechanisms, and neuroendocrine pathways.",
    price: 60.00,
    size: "Single Vial",
    productImage: "assets/DSIP.png",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 27
  {
    id: 27,
    name: 'VIP 10mg',
    tier: "High",
    desc: "VIP is a naturally occurring neuropeptide studied for its involvement in cellular communication, immune signaling, vascular biology, and neuroendocrine pathways.",
    price: 60.00,
    size: "Single Vial",
    productImage: "assets/VIP.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 28
  {
    id: 28,
    name: 'Dihexa 10mg',
    tier: "Low",
    desc: "Dihexa is an experimental research compound investigated primarily in preclinical neurological research involving synaptic signaling and neuroplasticity-related pathways.",
    price: 60.00,
    size: "Single Vial",
    productImage: "assets/DIHEXA.png",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 29
  {
    id: 29,
    name: 'GLOW (GHK-Cu / TB-500 / BPC-157) 50/10/10mg',
    tier: "Extreme",
    desc: "GLOW is a three-peptide research blend combining GHK-Cu, TB-500, and BPC-157 for laboratory investigation of cellular signaling, extracellular matrix activity, cellular migration, and related biological response pathways.",
    price: 80.00,
    size: "Single Vial",
    productImage: "assets/GLOW.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 30
  {
    id: 30,
    name: 'Wolverine Stack (BPC-157 / TB-500) 10/10mg',
    tier: "Extreme",
    desc: "Wolverine is a dual-peptide research blend combining BPC-157 and TB-500 for laboratory investigation of cellular signaling, cellular migration, and tissue-response pathways.",
    price: 80.00,
    size: "Single Vial",
    productImage: "assets/Wolverine.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 31
  {
    id: 31,
    name: 'CJC-1295 (no DAC / Ipamorelin) 10/10mg',
    tier: "High",
    desc: "This dual-peptide research blend combines CJC-1295 No DAC, a GHRH analog, with Ipamorelin, a growth hormone secretagogue receptor agonist, for laboratory investigation of complementary peptide-signaling pathways.",
    price: 60.00,
    size: "Single Vial",
    productImage: "assets/CJC-1295 NO DAC.jpg",
    coaImage: "assets/coa-placeholder.svg"
  },

  // PRODUCT 32
  {
    id: 32,
    name: 'KLOW-Cu (GHK-Cu / KPV / TB-500 / BPC-157) 50/10/10/10mg',
    tier: "Extreme",
    desc: "KLOW-Cu is a four-peptide research blend combining GHK-Cu, KPV, TB-500, and BPC-157 for laboratory investigation of cellular signaling, extracellular matrix activity, cellular migration, and biological-response pathways.",
    price: 100.00,
    size: "Single Vial",
    productImage: "assets/KLOW.jpg",
    coaImage: "assets/coa-placeholder.svg"
  }

];
const getCart=()=>JSON.parse(localStorage.getItem('hlxCart')||'[]'); const saveCart=c=>{localStorage.setItem('hlxCart',JSON.stringify(c)); updateCount()};
function updateCount(){document.querySelectorAll('.cart-count').forEach(e=>e.textContent=getCart().reduce((s,x)=>s+x.qty,0))}
function productOptions(p){
  if(Array.isArray(p.options)&&p.options.length){
    return p.options.map((o,i)=>typeof o==='string'?{label:o,price:p.price,key:String(i)}:{label:o.label||o.name||`Option ${i+1}`,price:Number(o.price??p.price),key:String(o.key??i)});
  }
  return [{label:p.size||'Single Vial',price:Number(p.price),key:'default'}];
}
function makeCartKey(id,optionKey){return `${id}::${optionKey||'default'}`}
function addToCart(id){
  const p=products.find(x=>x.id===id); if(!p)return;
  const option=productOptions(p)[0];
  addToCartQty(id,1,option.key);
}

function addToCartQty(id,qty=1,optionKey=null){
  qty=Math.max(1,Number(qty)||1);
  const p=products.find(x=>x.id===id); if(!p)return;
  const options=productOptions(p);
  const option=options.find(o=>String(o.key)===String(optionKey))||options[0];
  const cartKey=makeCartKey(p.id,option.key);
  let c=getCart(),x=c.find(x=>x.cartKey===cartKey || (!x.cartKey && x.id===p.id && option.key==='default'));
  if(x){
    x.qty+=qty;
    x.price=option.price;
    x.selectedOption=option.label;
    x.optionKey=option.key;
    x.cartKey=cartKey;
  }else{
    c.push({...p,price:option.price,selectedOption:option.label,optionKey:option.key,cartKey,qty});
  }
  saveCart(c);
  const note=document.querySelector('#productAddedNote');
  if(note){note.textContent=`${qty} × ${p.name} (${option.label}) added to cart`;setTimeout(()=>note.textContent='',2200)}
}


let currentShopState={tier:'All',search:'',sort:'featured'};
function getStartingPrice(p){const options=productOptions(p);return Number(options[0]?.price??p.price)}
function renderProducts(tier=currentShopState.tier){
  const el=document.querySelector('#products');if(!el)return;
  currentShopState.tier=tier||'All';
  let list=[...products];
  if(currentShopState.tier!=='All') list=list.filter(p=>p.tier===currentShopState.tier);
  if(currentShopState.search){
    const q=currentShopState.search.toLowerCase();
    list=list.filter(p=>`${p.name} ${p.tier} ${p.desc}`.toLowerCase().includes(q));
  }
  if(currentShopState.sort==='price-asc') list.sort((a,b)=>getStartingPrice(a)-getStartingPrice(b));
  if(currentShopState.sort==='price-desc') list.sort((a,b)=>getStartingPrice(b)-getStartingPrice(a));
  if(currentShopState.sort==='name-asc') list.sort((a,b)=>a.name.localeCompare(b.name));

  const count=document.querySelector('#shopCount');if(count)count.textContent=list.length;
  el.innerHTML=list.map(p=>{
    const options=productOptions(p),startingPrice=options[0]?.price??p.price;
    return `<article class="product-card shop-product-card">
      <a class="product-link" href="product.html?id=${p.id}">
        <div class="shop-product-image"><img src="${p.productImage}" alt="${p.name} vial" loading="lazy"></div>
        <div class="product-card-body">
          <h3>${p.name}</h3>
          <div class="product-size-line">${options[0]?.label||p.size||'Single Vial'}</div>
          <span class="shop-tier-badge ${p.tier.toLowerCase()}">${p.tier.toUpperCase()} TIER</span>
          <div class="price">$${Number(startingPrice).toFixed(2)}</div>
        </div>
      </a>
      <button class="btn primary shop-add-btn" onclick="addToCart(${p.id})"><span aria-hidden="true">🛒</span> ADD TO CART</button>
    </article>`
  }).join('');
  if(!list.length)el.innerHTML='<div class="shop-empty">No products match your search or filters.</div>';
}
function filterTier(t,b){currentShopState.tier=t;renderProducts(t)}
function initShopControls(){
  const search=document.querySelector('#shopSearch'),tier=document.querySelector('#tierFilter'),sort=document.querySelector('#sortProducts');
  if(search)search.addEventListener('input',()=>{currentShopState.search=search.value.trim();renderProducts()});
  if(tier)tier.addEventListener('change',()=>{currentShopState.tier=tier.value;renderProducts()});
  if(sort)sort.addEventListener('change',()=>{currentShopState.sort=sort.value;renderProducts()});
}
function renderCart(){
  let el=document.querySelector('#cartItems');if(!el)return;let c=getCart();
  if(!c.length){el.innerHTML='<p>Your cart is currently empty.</p>';document.querySelector('#total').textContent='$0.00';return}
  el.innerHTML=c.map((x,i)=>`<div class="cart-row"><div><strong>${x.name}</strong>${x.selectedOption?`<small class="cart-option">${x.selectedOption}</small>`:''}</div><div class="qty"><button onclick="changeQtyByIndex(${i},-1)">−</button><span>${x.qty}</span><button onclick="changeQtyByIndex(${i},1)">+</button></div><span>$${(x.price*x.qty).toFixed(2)}</span><button class="btn" onclick="removeItemByIndex(${i})">Remove</button></div>`).join('');
  document.querySelector('#total').textContent='$'+c.reduce((s,x)=>s+x.price*x.qty,0).toFixed(2)
}
function changeQtyByIndex(i,d){let c=getCart();if(!c[i])return;c[i].qty+=d;if(c[i].qty<=0)c.splice(i,1);saveCart(c);renderCart()}
function removeItemByIndex(i){let c=getCart();c.splice(i,1);saveCart(c);renderCart()}

// LOCAL ACCOUNT PREVIEW SYSTEM
// Functional for testing in this browser. Replace with hosted authentication before launch.
const HLX_ACCOUNT_KEY='hlxLocalAccounts';
const HLX_SESSION_KEY='hlxCurrentUser';
function authMessage(message,isError=false){const el=document.querySelector('#authMsg');if(!el)return;el.textContent=message;el.classList.toggle('auth-error',!!isError);el.classList.toggle('auth-success',!isError&&!!message)}
function getLocalAccounts(){try{return JSON.parse(localStorage.getItem(HLX_ACCOUNT_KEY)||'[]')}catch(e){return []}}
function bytesToHex(bytes){return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')}
function randomSalt(){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);return bytesToHex(bytes)}
async function hashPassword(password,salt){const data=new TextEncoder().encode(`${salt}:${password}`);const digest=await crypto.subtle.digest('SHA-256',data);return bytesToHex(new Uint8Array(digest))}
function currentUser(){try{return JSON.parse(localStorage.getItem(HLX_SESSION_KEY)||'null')}catch(e){return null}}
function setCurrentUser(email){const user={email,loggedInAt:new Date().toISOString()};localStorage.setItem(HLX_SESSION_KEY,JSON.stringify(user));localStorage.setItem('hlxCustomerEmail',email);return user}
function signOutHLX(){localStorage.removeItem(HLX_SESSION_KEY);location.href='account.html'}
async function createLocalAccount(e){e.preventDefault();authMessage('');const form=e.currentTarget;const email=form.email.value.trim().toLowerCase();const password=form.password.value;const confirm=form.passwordConfirm.value;if(password!==confirm){authMessage('Passwords do not match.',true);return}if(password.length<8){authMessage('Password must be at least 8 characters.',true);return}const accounts=getLocalAccounts();if(accounts.some(a=>a.email===email)){authMessage('An account with that email already exists. Please sign in.',true);return}try{const salt=randomSalt();const passwordHash=await hashPassword(password,salt);accounts.push({email,salt,passwordHash,createdAt:new Date().toISOString()});localStorage.setItem(HLX_ACCOUNT_KEY,JSON.stringify(accounts));setCurrentUser(email);authMessage('Account created successfully. Redirecting to your account…');setTimeout(()=>location.href='account.html',350)}catch(err){authMessage('Account creation could not be completed in this browser.',true)}}
async function loginLocalAccount(e){e.preventDefault();authMessage('');const form=e.currentTarget;const email=form.email.value.trim().toLowerCase();const password=form.password.value;const account=getLocalAccounts().find(a=>a.email===email);if(!account){authMessage('No account was found for that email.',true);return}try{const enteredHash=await hashPassword(password,account.salt);if(enteredHash!==account.passwordHash){authMessage('Incorrect password.',true);return}setCurrentUser(email);renderAccountState();authMessage('Signed in successfully.')}catch(err){authMessage('Sign-in could not be completed in this browser.',true)}}
function renderAccountState(){const loggedOut=document.querySelector('#accountLoggedOut'),loggedIn=document.querySelector('#accountLoggedIn');if(!loggedOut&&!loggedIn)return;const user=currentUser();const title=document.querySelector('#accountTitle');if(user){if(loggedOut)loggedOut.hidden=true;if(loggedIn)loggedIn.hidden=false;if(title)title.textContent='My Account';const email=document.querySelector('#accountEmail');if(email)email.textContent=user.email}else{if(loggedOut)loggedOut.hidden=false;if(loggedIn)loggedIn.hidden=true;if(title)title.textContent='Sign in'}}
function initLocalAuth(){const create=document.querySelector('#createAccountForm');if(create)create.addEventListener('submit',createLocalAccount);const login=document.querySelector('#loginForm');if(login)login.addEventListener('submit',loginLocalAccount);const logout=document.querySelector('#logoutBtn');if(logout)logout.addEventListener('click',signOutHLX);renderAccountState()}
function demoAuth(e,type){if(type==='create')return createLocalAccount(e);return loginLocalAccount(e)}
document.addEventListener('DOMContentLoaded',()=>{updateCount();initShopControls();renderProducts();renderCart();initLocalAuth()});


function initAccessGate(){
  if(sessionStorage.getItem('hlxAccessAccepted')==='true') return;
  const gate=document.createElement('div');
  gate.className='access-gate';
  gate.innerHTML=`<div class="access-modal" role="dialog" aria-modal="true" aria-labelledby="gateTitle">
    <div class="access-logo"><img src="assets/logo.png" alt="HLX Labs logo"><strong><span class="gold-hlx">HLX</span> LABS</strong></div>
    <h2 id="gateTitle">This website is restricted.</h2>
    <p>To continue, please confirm you meet the minimum age requirement and accept the agreement below.</p>
    <label class="gate-check"><input type="checkbox" id="gateAge"><span>I confirm I am 21+ years of age or older.</span></label>
    <label class="gate-check"><input type="checkbox" id="gateTerms"><span>I agree that products and information on this website are provided for laboratory research use only and are not intended for use in or on humans or animals. I will not use any products or information from this website for diagnosis, treatment, cure, or prevention of any condition. I agree to follow applicable laws and regulations, and I agree to the <a href="terms.html">Terms of Service</a> and <a href="privacy.html">Privacy Policy</a>.</span></label>
    <div class="gate-error" id="gateError"></div>
    <div class="gate-actions"><button class="btn primary" id="gateEnter" disabled>I ACKNOWLEDGE AND ENTER</button></div>
    <div class="gate-note">Both confirmations are required to access the site.</div>
  </div>`;
  document.body.appendChild(gate);
  const age=gate.querySelector('#gateAge'), terms=gate.querySelector('#gateTerms'), enter=gate.querySelector('#gateEnter');
  const sync=()=>{enter.disabled=!(age.checked&&terms.checked)};
  age.addEventListener('change',sync); terms.addEventListener('change',sync);
  enter.addEventListener('click',()=>{
    if(!(age.checked&&terms.checked)){gate.querySelector('#gateError').textContent='Please confirm both disclosures before continuing.';return;}
    sessionStorage.setItem('hlxAccessAccepted','true');
    gate.classList.add('hidden');
    setTimeout(()=>gate.remove(),200);
  });
}

document.addEventListener('DOMContentLoaded',initAccessGate);


// Contact form submission is handled by the hosting provider (Netlify Forms).

function renderProductDetail(){
  const el=document.querySelector('#productDetail');
  if(!el)return;
  const id=Number(new URLSearchParams(location.search).get('id')||1),p=products.find(x=>x.id===id)||products[0];
  document.title=p.name+' | HLX Labs';
  const related=products.filter(x=>x.id!==p.id).slice(0,5);
  const options=productOptions(p);
  const initialOption=options[0];
  el.innerHTML=`
    <div class="product-breadcrumbs"><a href="index.html">Home</a><span>›</span><a href="shop.html">Shop</a><span>›</span><strong>${p.name}</strong></div>
    <div class="product-showcase">
      <section class="product-gallery" aria-label="Product images">
        <div class="product-stage">
          <button class="gallery-arrow gallery-prev" type="button" aria-label="Previous image">‹</button>
          <img id="galleryMain" src="${p.productImage}" alt="${p.name} product image placeholder">
          <button class="gallery-arrow gallery-next" type="button" aria-label="Next image">›</button>
          <div class="gallery-counter"><span id="galleryIndex">1</span> / 2</div>
        </div>
        <div class="gallery-thumbs">
          <button class="gallery-thumb active" type="button" data-index="0"><img src="${p.productImage}" alt="${p.name} vial thumbnail"><span>Vial</span></button>
          <button class="gallery-thumb" type="button" data-index="1"><img src="${p.coaImage}" alt="${p.name} COA thumbnail"><span>COA</span></button>
        </div>
      </section>
      <section class="product-purchase">
        <div class="purchase-topline"><span class="research-label">RESEARCH PRODUCT</span><span class="tier-badge">${p.tier.toUpperCase()} TIER</span></div>
        <h1>${p.name}</h1>
        <div class="product-price" id="productPrice">$${initialOption.price.toFixed(2)}</div>
        <p class="product-lede">${p.desc}</p>
        <div class="purchase-rule"></div>
        <div class="purchase-controls">
          <label class="product-select-wrap"><span>SELECT SIZE</span><select id="productSize">${options.map(o=>`<option value="${o.key}">${o.label} - $${o.price.toFixed(2)}</option>`).join('')}</select></label>
          <div class="quantity-wrap"><span>QUANTITY</span><div class="quantity-picker"><button type="button" id="qtyMinus">−</button><strong id="qtyValue">1</strong><button type="button" id="qtyPlus">+</button></div></div>
          <button class="add-cart-large" id="addProductBtn" type="button">🛒 <span>ADD TO CART</span></button>
        </div>
        <div id="productAddedNote" class="product-added-note" aria-live="polite"></div>
        <div class="product-assurances">
          <div><span class="assurance-icon">⚗</span><strong>RESEARCH<br>USE ONLY</strong></div>
          <div><span class="assurance-icon">✓</span><strong>QUALITY<br>TESTED</strong></div>
          <div><span class="assurance-icon">★</span><strong>AMERICAN<br>MADE</strong></div>
          <div><span class="assurance-icon">⌄</span><strong>VETERAN<br>OWNED</strong></div>
        </div>
        <div class="product-tabs">
          <button class="active" data-tab="description">DESCRIPTION</button>
          <button data-tab="additional">ADDITIONAL INFO</button>
          <button data-tab="disclaimer">DISCLAIMER</button>
        </div>
        <div class="product-tab-copy" id="tab-description"><p>${p.desc}</p><p>This product is provided for laboratory research purposes only.</p></div>
        <div class="product-tab-copy hidden" id="tab-additional"><p>Product-specific details, handling information, and documentation can be added here when your final catalog is supplied.</p></div>
        <div class="product-tab-copy hidden" id="tab-disclaimer"><p>For laboratory research use only. Not intended for use in or on humans or animals. Follow applicable laws and regulations.</p></div>
      </section>
    </div>
    <section class="related-products">
      <div class="related-heading"><h2>RELATED PRODUCTS</h2><a href="shop.html">VIEW ALL PRODUCTS →</a></div>
      <div class="related-grid">${related.map(r=>{const rp=productOptions(r)[0]?.price??r.price??0;return `<a class="related-card" href="product.html?id=${r.id}"><img src="${r.productImage}" alt="${r.name} placeholder"><div><strong>${r.name}</strong><span>$${Number(rp).toFixed(2)}</span><em>${r.tier.toUpperCase()}</em></div></a>`}).join('')}</div>
    </section>`;

  const images=[{src:p.productImage,alt:`${p.name} product image placeholder`},{src:p.coaImage,alt:`${p.name} Certificate of Analysis placeholder`}];
  let current=0,qty=1;
  const main=el.querySelector('#galleryMain'),counter=el.querySelector('#galleryIndex'),thumbs=[...el.querySelectorAll('.gallery-thumb')];
  const show=i=>{current=(i+images.length)%images.length;main.src=images[current].src;main.alt=images[current].alt;counter.textContent=current+1;thumbs.forEach((t,n)=>t.classList.toggle('active',n===current));};
  el.querySelector('.gallery-prev').addEventListener('click',()=>show(current-1));
  el.querySelector('.gallery-next').addEventListener('click',()=>show(current+1));
  thumbs.forEach(t=>t.addEventListener('click',()=>show(Number(t.dataset.index))));
  const qv=el.querySelector('#qtyValue');
  el.querySelector('#qtyMinus').addEventListener('click',()=>{qty=Math.max(1,qty-1);qv.textContent=qty});
  el.querySelector('#qtyPlus').addEventListener('click',()=>{qty++;qv.textContent=qty});
  const sizeSelect=el.querySelector('#productSize'), priceEl=el.querySelector('#productPrice');
  sizeSelect.addEventListener('change',()=>{const o=options.find(x=>String(x.key)===String(sizeSelect.value))||options[0];priceEl.textContent='$'+o.price.toFixed(2)});
  el.querySelector('#addProductBtn').addEventListener('click',()=>addToCartQty(p.id,qty,sizeSelect.value));
  el.querySelectorAll('.product-tabs button').forEach(btn=>btn.addEventListener('click',()=>{
    el.querySelectorAll('.product-tabs button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
    el.querySelectorAll('.product-tab-copy').forEach(c=>c.classList.add('hidden'));
    el.querySelector('#tab-'+btn.dataset.tab).classList.remove('hidden');
  }));
}
document.addEventListener('DOMContentLoaded',renderProductDetail);

// COA library — automatically reads each product's coaImage, name, tier, and first option.
let currentCoaState={tier:'All',search:''};
function renderCoas(){
  const grid=document.querySelector('#coaGrid'); if(!grid)return;
  let list=[...products];
  if(currentCoaState.tier!=='All') list=list.filter(p=>p.tier===currentCoaState.tier);
  if(currentCoaState.search){
    const q=currentCoaState.search.toLowerCase();
    list=list.filter(p=>`${p.name} ${p.tier} ${productOptions(p).map(o=>o.label).join(' ')}`.toLowerCase().includes(q));
  }
  const count=document.querySelector('#coaCount'); if(count)count.textContent=list.length;
  grid.innerHTML=list.map(p=>{
    const first=productOptions(p)[0];
    return `<article class="coa-card">
      <button class="coa-image-button" type="button" onclick="openCoa(${p.id})" aria-label="View ${p.name} COA">
        <img src="${p.coaImage}" alt="${p.name} Certificate of Analysis" loading="lazy">
      </button>
      <div class="coa-card-body">
        <h3>${p.name}</h3>
        <div class="coa-option-label">${first?.label||p.size||'Single Vial'}</div>
        <span class="shop-tier-badge ${p.tier.toLowerCase()}">${p.tier.toUpperCase()} TIER</span>
        <button class="btn primary coa-view-btn" type="button" onclick="openCoa(${p.id})">▤ &nbsp; VIEW COA</button>
      </div>
    </article>`;
  }).join('');
  if(!list.length) grid.innerHTML='<div class="shop-empty">No COAs match your search or filter.</div>';
}
function openCoa(id){
  const p=products.find(x=>x.id===id); if(!p)return;
  const box=document.querySelector('#coaLightbox'), img=document.querySelector('#coaLightboxImage'), title=document.querySelector('#coaLightboxTitle');
  if(!box||!img||!title)return;
  img.src=p.coaImage; img.alt=`${p.name} Certificate of Analysis`; title.textContent=`${p.name} — Certificate of Analysis`;
  box.classList.add('open'); box.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
}
function closeCoa(){
  const box=document.querySelector('#coaLightbox'); if(!box)return;
  box.classList.remove('open'); box.setAttribute('aria-hidden','true'); document.body.style.overflow='';
}
function initCoaPage(){
  const grid=document.querySelector('#coaGrid'); if(!grid)return;
  const search=document.querySelector('#coaSearch'), tier=document.querySelector('#coaTierFilter'), close=document.querySelector('#coaLightboxClose'), box=document.querySelector('#coaLightbox');
  if(search) search.addEventListener('input',()=>{currentCoaState.search=search.value.trim();renderCoas()});
  if(tier) tier.addEventListener('change',()=>{currentCoaState.tier=tier.value;renderCoas()});
  if(close) close.addEventListener('click',closeCoa);
  if(box) box.addEventListener('click',e=>{if(e.target===box)closeCoa()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCoa()});
  renderCoas();
}
document.addEventListener('DOMContentLoaded',initCoaPage);

// ORDER CONFIRMATION SYSTEM
// Production flow: your payment processor/backend must securely verify payment first,
// then call HLXOrders.completeOrder(...) with verified:true and a real transactionId.
// The old browser-only preview-success button has been removed.
function generateHLXOrderNumber(){
  const d=new Date();
  const y=String(d.getFullYear()).slice(-2);
  const m=String(d.getMonth()+1).padStart(2,'0');
  const day=String(d.getDate()).padStart(2,'0');
  const rand=Math.floor(1000+Math.random()*9000);
  return `HLX-${y}${m}${day}-${rand}`;
}
function calculateCartTotal(items){return items.reduce((sum,item)=>sum+(Number(item.price)||0)*(Number(item.qty)||0),0)}
function completeHLXOrder(paymentData={}){
  if(paymentData.verified!==true) return {ok:false,error:'Payment has not been verified.'};
  if(!paymentData.transactionId) return {ok:false,error:'A verified payment transaction ID is required.'};
  const items=getCart();
  if(!items.length) return {ok:false,error:'Cart is empty.'};
  const now=new Date();
  const order={
    orderNumber: paymentData.orderNumber || generateHLXOrderNumber(),
    createdAt: now.toISOString(),
    paymentStatus: paymentData.paymentStatus || 'Paid',
    transactionId: paymentData.transactionId,
    customerEmail: paymentData.customerEmail || localStorage.getItem('hlxCustomerEmail') || '',
    currency: paymentData.currency || 'USD',
    items: items.map(item=>({
      id:item.id,
      name:item.name,
      selectedOption:item.selectedOption || item.size || 'Single Vial',
      optionKey:item.optionKey || 'default',
      price:Number(item.price)||0,
      qty:Number(item.qty)||1,
      productImage:item.productImage || ''
    })),
    total: calculateCartTotal(items)
  };
  const orders=JSON.parse(localStorage.getItem('hlxOrders')||'[]');
  orders.unshift(order);
  localStorage.setItem('hlxOrders',JSON.stringify(orders));
  localStorage.setItem('hlxLastOrder',JSON.stringify(order));
  localStorage.removeItem('hlxCart');
  updateCount();
  return {ok:true,order};
}
function renderOrderConfirmation(){
  const root=document.querySelector('#orderConfirmation');
  if(!root)return;
  let order=null;
  try{order=JSON.parse(localStorage.getItem('hlxLastOrder')||'null')}catch(e){}
  if(!order){
    root.innerHTML=`<div class="confirmation-icon muted">!</div><div class="eyebrow">NO CONFIRMED ORDER</div><h1>Order Confirmation Not Available</h1><p class="confirmation-lede">This page only displays after a successful order has been recorded.</p><div class="confirmation-actions"><a class="btn primary" href="shop.html">RETURN TO SHOP</a><a class="btn" href="cart.html">VIEW CART</a></div>`;
    return;
  }
  const orderDate=new Date(order.createdAt);
  const number=document.querySelector('#confirmOrderNumber'); if(number)number.textContent=order.orderNumber||'—';
  const date=document.querySelector('#confirmOrderDate'); if(date)date.textContent=Number.isNaN(orderDate.getTime())?'—':orderDate.toLocaleString([], {year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  const status=document.querySelector('#confirmPaymentStatus'); if(status)status.textContent=(order.paymentStatus||'Paid').toUpperCase();
  const txn=document.querySelector('#confirmTransactionId'); if(txn)txn.textContent=order.transactionId||'—';
  const count=(order.items||[]).reduce((s,x)=>s+(Number(x.qty)||0),0);
  const countEl=document.querySelector('#confirmItemCount'); if(countEl)countEl.textContent=`${count} ITEM${count===1?'':'S'}`;
  const itemsEl=document.querySelector('#confirmItems');
  if(itemsEl)itemsEl.innerHTML=(order.items||[]).map(item=>`<div class="confirmation-item"><div class="confirmation-item-image">${item.productImage?`<img src="${item.productImage}" alt="${item.name}">`:''}</div><div class="confirmation-item-copy"><strong>${item.name}</strong><span>${item.selectedOption||''}</span><small>Quantity: ${item.qty}</small></div><strong class="confirmation-item-price">$${(Number(item.price)*Number(item.qty)).toFixed(2)}</strong></div>`).join('');
  const total=document.querySelector('#confirmTotal'); if(total)total.textContent='$'+Number(order.total||0).toFixed(2);
}
window.HLXOrders={
  completeOrder:completeHLXOrder,
  getLastOrder:()=>JSON.parse(localStorage.getItem('hlxLastOrder')||'null'),
  getOrders:()=>JSON.parse(localStorage.getItem('hlxOrders')||'[]')
};
document.addEventListener('DOMContentLoaded',renderOrderConfirmation);
