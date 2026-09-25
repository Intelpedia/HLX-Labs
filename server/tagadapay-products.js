/**
 * HLX Labs -> TagadaPay product catalog sync.
 * Reads the existing product catalog from ../app.js so TagadaPay uses the
 * same names, descriptions, variants, prices, and image filenames as the site.
 *
 * Node 18+.
 * Run from repository root:
 *   node --env-file=.env server/tagadapay-products.js --test
 *   node --env-file=.env server/tagadapay-products.js --all
 *
 * --test creates ONLY the first catalog product.
 * --all creates the complete catalog.
 *
 * IMPORTANT: product creation is not idempotent. Re-running can create duplicates.
 */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const API_URL = "https://api.tagada.io/api/public/v1/products/create";
const RAW_ASSET_BASE =
  "https://raw.githubusercontent.com/Intelpedia/HLX-Labs/main/";

const TOKEN = process.env.TAGADA_API_TOKEN;
const STORE_ID = process.env.TAGADA_STORE_ID;
const DEFAULT_GRAMS = Number(process.env.TAGADA_DEFAULT_GRAMS || 0);

function loadSiteCatalog() {
  const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const start = source.indexOf("const products =");
  const endMarker = "\nconst getCart=";
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error("Could not locate products catalog in app.js.");

  const catalogSource =
    source.slice(start, end) + "\n;globalThis.__HLX_PRODUCTS__ = products;";
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(catalogSource, sandbox, { timeout: 1000 });
  return sandbox.__HLX_PRODUCTS__;
}

function productOptions(product) {
  if (Array.isArray(product.options) && product.options.length) {
    return product.options.map((o) => ({ label: o.label, price: Number(o.price) }));
  }
  return [{ label: product.size || "Single Vial", price: Number(product.price) }];
}

function skuPart(value) {
  return String(value).toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function publicImageUrl(assetPath) {
  return RAW_ASSET_BASE + String(assetPath).split("/").map(encodeURIComponent).join("/");
}

function toTagadaPayload(product) {
  return {
    storeId: STORE_ID,
    name: product.name,
    description: product.desc,
    active: true,
    isShippable: true,
    isTaxable: true,
    variants: productOptions(product).map((option, index) => ({
      name: option.label,
      description: `${product.name} ${option.label}`,
      sku: `HLX-${String(product.id).padStart(2, "0")}-${skuPart(option.label)}`,
      grams: DEFAULT_GRAMS,
      active: true,
      default: index === 0,
      imageUrl: publicImageUrl(product.productImage),
      prices: [{
        currencyOptions: {
          USD: {
            amount: Math.round(option.price * 100),
            currency: "USD"
          }
        },
        recurring: false,
        billingTiming: "usage",
        interval: null,
        intervalCount: 1,
        default: true
      }]
    }))
  };
}

async function createProduct(payload) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }

  if (!response.ok) {
    throw new Error(`${payload.name}: TagadaPay ${response.status} - ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  if (!TOKEN) throw new Error("Missing TAGADA_API_TOKEN.");
  if (!STORE_ID) throw new Error("Missing TAGADA_STORE_ID.");
  if (!Number.isFinite(DEFAULT_GRAMS) || DEFAULT_GRAMS < 0) {
    throw new Error("TAGADA_DEFAULT_GRAMS must be a non-negative number.");
  }

  const mode = process.argv[2];
  if (!["--test", "--all"].includes(mode)) {
    throw new Error("Choose --test (first product only) or --all (complete catalog).");
  }

  if (DEFAULT_GRAMS === 0) {
    console.warn("WARNING: TAGADA_DEFAULT_GRAMS is 0. Set the actual packaged shipping weight before production.");
  }

  const catalog = loadSiteCatalog();
  const selected = mode === "--test" ? catalog.slice(0, 1) : catalog;
  const idMap = [];

  for (const product of selected) {
    const payload = toTagadaPayload(product);
    console.log(`Creating ${product.name}...`);
    const created = await createProduct(payload);
    idMap.push({
      localId: product.id,
      name: product.name,
      tagadaProductId: created?.id ?? null,
      variants: created?.variants?.map(v => ({
        name: v.name,
        tagadaVariantId: v.id,
        tagadaPriceIds: v.prices?.map(p => p.id) || []
      })) || []
    });
  }

  const output = path.join(__dirname, "tagadapay-id-map.json");
  fs.writeFileSync(output, JSON.stringify(idMap, null, 2));
  console.log(`Finished. TagadaPay IDs saved to ${output}`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
