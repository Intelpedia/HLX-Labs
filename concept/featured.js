const featured=[
  {
    "id": 1,
    "name": "HLR-3",
    "size": "10mg / 12mg / 20mg / 30mg",
    "price": "$50.00–$120.00",
    "image": "../assets/RETATRUTIDE.JPG"
  },
  {
    "id": 11,
    "name": "BPC-157",
    "size": "10mg",
    "price": "$60.00",
    "image": "../assets/BPC-157.jpg"
  },
  {
    "id": 18,
    "name": "MOTS-C",
    "size": "10mg / 40mg",
    "price": "$70.00–$120.00",
    "image": "../assets/Motsreal.jpg"
  },
  {
    "id": 30,
    "name": "Wolverine Stack (BPC-157 / TB-500)",
    "size": "10/10mg",
    "price": "$75.00",
    "image": "../assets/Wolverine.jpg"
  }
];
document.querySelector('#featuredProducts').innerHTML=featured.map(p=>`<article class="product"><a href="https://hlxlabs.com/product.html?id=${p.id}" class="product-image" style="display:block"><img src="${p.image}" alt="HLX Labs ${p.name}" loading="lazy"><span class="tag">RESEARCH USE ONLY</span></a><div class="product-info"><div class="product-top"><h3>${p.name}</h3><span class="price">${p.price}</span></div><p>${p.size}</p><div class="product-links"><a href="https://hlxlabs.com/product.html?id=${p.id}">VIEW PRODUCT</a><a href="https://hlxlabs.com/coa.html">VIEW COAs</a></div></div></article>`).join('');
