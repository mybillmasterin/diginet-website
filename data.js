/* =====================================================================
   DIGINET IT SOLUTIONS — site data layer
   =====================================================================
   HOW THE "ADMIN PANEL" WORKS
   ----------------------------------------------------------------------
   You manage your laptop stock from a Google Sheet — no code needed.

   1. Create a Google Sheet with EXACTLY these column headers in row 1:
      id | brand | name | cpu | ram | storage | screen | gpu | battery |
      price | was | grade | status | image | released

      (a ready-made starter file is included: laptops-template.csv —
       just import it into a new Google Sheet: File > Import > Upload)

   2. Fill one row per laptop.
        - status: type "active" to show it on the site, "sold" to hide it
          (no need to delete the row — just change this word)
        - image: paste a direct image URL (optional — leave blank for a
          neutral placeholder)

   3. Publish the sheet: File > Share > Publish to web > select the
      sheet > choose "Comma-separated values (.csv)" > Publish.
      Copy the link it gives you.

   4. Paste that link below as SHEET_CSV_URL. That's it — add a row,
      mark something "sold", refresh the site, done.
   ===================================================================== */

const SITE_CONFIG = {
  whatsappNumber: "919445216987", // country code + number, no plus/spaces
  sheetCsvUrl: "" // <-- paste your published Google Sheet CSV link here
};

/* Shown until SHEET_CSV_URL is set up, or if the sheet can't be reached */
const FALLBACK_LAPTOPS = [
  { id:"DGN-RL-0231", brand:"Dell", name:"Dell Latitude 5490", cpu:"Intel i5-8th Gen", ram:"8GB DDR4", storage:"256GB SSD", screen:'14" FHD IPS', gpu:"Intel UHD 620", battery:"6 Hrs, Li-Ion", price:"16500", was:"21000", grade:"A", status:"active", image:"", released:"Refurbished 2024" },
  { id:"DGN-RL-0244", brand:"HP", name:"HP EliteBook 840 G5", cpu:"Intel i5-8th Gen", ram:"8GB DDR4", storage:"256GB SSD", screen:'14" FHD IPS', gpu:"Intel UHD 620", battery:"6 Hrs, Li-Ion", price:"17500", was:"22500", grade:"A", status:"active", image:"", released:"Refurbished 2024" },
  { id:"DGN-RL-0250", brand:"Lenovo", name:"Lenovo ThinkPad T480", cpu:"Intel i5-8th Gen", ram:"8GB DDR4", storage:"256GB SSD", screen:'14" FHD IPS', gpu:"Intel UHD 620", battery:"7 Hrs, Li-Ion", price:"16000", was:"20500", grade:"A", status:"active", image:"", released:"Refurbished 2024" },
  { id:"DGN-RL-0261", brand:"Dell", name:"Dell Latitude 3410", cpu:"Intel i3-10th Gen", ram:"8GB DDR4", storage:"512GB SSD", screen:'14" HD', gpu:"Intel UHD", battery:"5.5 Hrs, Li-Ion", price:"14500", was:"18500", grade:"B", status:"active", image:"", released:"Refurbished 2024" },
  { id:"DGN-RL-0273", brand:"HP", name:"HP ProBook 450 G6", cpu:"Intel i5-8th Gen", ram:"8GB DDR4", storage:"1TB HDD", screen:'15.6" FHD', gpu:"Intel UHD 620", battery:"6 Hrs, Li-Ion", price:"15500", was:"19500", grade:"B", status:"active", image:"", released:"Refurbished 2024" },
  { id:"DGN-RL-0288", brand:"Lenovo", name:"Lenovo ThinkPad E14", cpu:"Intel i5-10th Gen", ram:"8GB DDR4", storage:"256GB SSD", screen:'14" FHD IPS', gpu:"Intel UHD", battery:"7 Hrs, Li-Ion", price:"19500", was:"25000", grade:"A", status:"active", image:"", released:"Refurbished 2024" }
];

function inr(n){
  const num = Number(n) || 0;
  return "₹" + num.toLocaleString('en-IN');
}

function waLink(laptop){
  const msg = `Hi, I'm interested in the ${laptop.name} (${inr(laptop.price)}, Grade ${laptop.grade || "-"}) listed on your website. Is it still available?`;
  return `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`;
}

/* Minimal CSV parser that handles quoted fields containing commas */
function parseCSV(text){
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++){
    const c = text[i];
    if (inQuotes){
      if (c === '"'){
        if (text[i+1] === '"'){ field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ','){ row.push(field); field = ""; }
      else if (c === '\n' || c === '\r'){
        if (c === '\r' && text[i+1] === '\n') i++;
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else field += c;
    }
  }
  if (field !== "" || row.length){ row.push(field); rows.push(row); }
  return rows;
}

async function loadLaptops(){
  const url = SITE_CONFIG.sheetCsvUrl;
  if (!url) return FALLBACK_LAPTOPS;
  try{
    const sep = url.includes('?') ? '&' : '?';
    const res = await fetch(url + sep + 'cachebust=' + Date.now());
    if (!res.ok) throw new Error("sheet fetch failed");
    const text = await res.text();
    const rows = parseCSV(text).filter(r => r.some(v => v.trim() !== ""));
    if (rows.length < 2) return FALLBACK_LAPTOPS;
    const header = rows[0].map(h => h.trim().toLowerCase());
    const items = rows.slice(1).map(r => {
      const obj = {};
      header.forEach((h, i) => obj[h] = (r[i] || "").trim());
      return obj;
    }).filter(o => o.id && (o.status || "active").toLowerCase() !== "sold");
    return items.length ? items : FALLBACK_LAPTOPS;
  } catch (e){
    console.warn("Could not load live stock, showing sample listings:", e);
    return FALLBACK_LAPTOPS;
  }
}
