/* =====================================================================
   DIGINET IT SOLUTIONS — Inventory & Site Data Layer
   Persistent IndexedDB & LocalStorage Management for Admin & Website
   ===================================================================== */

const SITE_CONFIG = {
  whatsappNumber: "919445216987", // country code + number, no plus/spaces
  siteName: "Diginet IT Solutions",
  adminPasscodeDefault: "admin123"
};

/* Starter Initial Inventory */
const DEFAULT_LAPTOPS = [
  { id:"DGN-RL-0231", brand:"Dell", name:"Dell Latitude 5490", cpu:"Intel i5-8th Gen", ram:"8GB DDR4", storage:"256GB SSD", screen:'14" FHD IPS', gpu:"Intel UHD 620", battery:"6 Hrs, Li-Ion", price:"16500", was:"21000", grade:"A", status:"active", image:"images/dell-latitude-5490.jpg", released:"Refurbished 2024", addedAt: 1708900000000 },
  { id:"DGN-RL-0244", brand:"HP", name:"HP EliteBook 840 G5", cpu:"Intel i5-8th Gen", ram:"8GB DDR4", storage:"256GB SSD", screen:'14" FHD IPS', gpu:"Intel UHD 620", battery:"6 Hrs, Li-Ion", price:"17500", was:"22500", grade:"A", status:"active", image:"images/hp-elitebook-840g5.jpg", released:"Refurbished 2024", addedAt: 1708900100000 },
  { id:"DGN-RL-0250", brand:"Lenovo", name:"Lenovo ThinkPad T480", cpu:"Intel i5-8th Gen", ram:"8GB DDR4", storage:"256GB SSD", screen:'14" FHD IPS', gpu:"Intel UHD 620", battery:"7 Hrs, Li-Ion", price:"16000", was:"20500", grade:"A", status:"active", image:"images/lenovo-thinkpad-t480.jpg", released:"Refurbished 2024", addedAt: 1708900200000 },
  { id:"DGN-RL-0261", brand:"Dell", name:"Dell Latitude 3410", cpu:"Intel i3-10th Gen", ram:"8GB DDR4", storage:"512GB SSD", screen:'14" HD', gpu:"Intel UHD", battery:"5.5 Hrs, Li-Ion", price:"14500", was:"18500", grade:"B", status:"active", image:"images/dell-latitude-3410.jpg", released:"Refurbished 2024", addedAt: 1708900300000 },
  { id:"DGN-RL-0273", brand:"HP", name:"HP ProBook 450 G6", cpu:"Intel i5-8th Gen", ram:"8GB DDR4", storage:"1TB HDD", screen:'15.6" FHD', gpu:"Intel UHD 620", battery:"6 Hrs, Li-Ion", price:"15500", was:"19500", grade:"B", status:"active", image:"images/hp-probook-450g6.jpg", released:"Refurbished 2024", addedAt: 1708900400000 },
  { id:"DGN-RL-0288", brand:"Lenovo", name:"Lenovo ThinkPad E14", cpu:"Intel i5-10th Gen", ram:"8GB DDR4", storage:"256GB SSD", screen:'14" FHD IPS', gpu:"Intel UHD", battery:"7 Hrs, Li-Ion", price:"19500", was:"25000", grade:"A", status:"active", image:"images/lenovo-thinkpad-e14.jpg", released:"Refurbished 2024", addedAt: 1708900500000 }
];

/* Currency Formatter (INR) */
function inr(n) {
  const num = Number(n) || 0;
  return "₹" + num.toLocaleString('en-IN');
}

/* WhatsApp Enquiry Generator */
function waLink(laptop) {
  const msg = `Hi Diginet IT Solutions, I'm interested in the ${laptop.name} (${inr(laptop.price)}, Grade ${laptop.grade || "A"}, Ref: ${laptop.id}) listed on your website. Is it available for purchase?`;
  return `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`;
}

/* =====================================================================
   INDEXEDDB PERSISTENCE ENGINE (DiginetDB)
   ===================================================================== */
const DiginetDB = {
  dbName: "DiginetInventoryDB",
  storeName: "laptops",
  version: 1,

  async open() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn("IndexedDB not supported, falling back to LocalStorage.");
        resolve(null);
        return;
      }
      const req = indexedDB.open(this.dbName, this.version);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: "id" });
          store.createIndex("brand", "brand", { unique: false });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("addedAt", "addedAt", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        console.error("IndexedDB error:", req.error);
        resolve(null);
      };
    });
  },

  async getAll() {
    const db = await this.open();
    if (!db) {
      // LocalStorage Fallback
      const raw = localStorage.getItem("diginet_laptops");
      if (raw) {
        try { return JSON.parse(raw); } catch (e) {}
      }
      localStorage.setItem("diginet_laptops", JSON.stringify(DEFAULT_LAPTOPS));
      return DEFAULT_LAPTOPS;
    }

    return new Promise((resolve) => {
      const tx = db.transaction(this.storeName, "readonly");
      const store = tx.objectStore(this.storeName);
      const req = store.getAll();
      req.onsuccess = async () => {
        let items = req.result || [];
        if (items.length === 0) {
          // Seed defaults
          await this.seedDefaults();
          items = DEFAULT_LAPTOPS;
        }
        // Sort descending by addedAt
        items.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
        resolve(items);
      };
      req.onerror = () => {
        resolve(DEFAULT_LAPTOPS);
      };
    });
  },

  async get(id) {
    const all = await this.getAll();
    return all.find(l => l.id === id) || null;
  },

  async put(laptop) {
    if (!laptop.id) {
      laptop.id = "DGN-RL-" + Math.floor(1000 + Math.random() * 9000);
    }
    if (!laptop.addedAt) {
      laptop.addedAt = Date.now();
    }
    laptop.status = laptop.status || "active";

    const db = await this.open();
    if (!db) {
      const all = await this.getAll();
      const idx = all.findIndex(l => l.id === laptop.id);
      if (idx >= 0) all[idx] = laptop;
      else all.unshift(laptop);
      localStorage.setItem("diginet_laptops", JSON.stringify(all));
      return laptop;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      const req = store.put(laptop);
      req.onsuccess = () => resolve(laptop);
      req.onerror = () => reject(req.error);
    });
  },

  async delete(id) {
    const db = await this.open();
    if (!db) {
      let all = await this.getAll();
      all = all.filter(l => l.id !== id);
      localStorage.setItem("diginet_laptops", JSON.stringify(all));
      return true;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  async toggleStatus(id) {
    const item = await this.get(id);
    if (!item) return null;
    item.status = item.status === "sold" ? "active" : "sold";
    await this.put(item);
    return item;
  },

  async seedDefaults() {
    const db = await this.open();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      DEFAULT_LAPTOPS.forEach(item => store.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  },

  async reset() {
    const db = await this.open();
    if (!db) {
      localStorage.setItem("diginet_laptops", JSON.stringify(DEFAULT_LAPTOPS));
      return DEFAULT_LAPTOPS;
    }
    return new Promise((resolve) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      store.clear();
      DEFAULT_LAPTOPS.forEach(item => store.put(item));
      tx.oncomplete = () => resolve(DEFAULT_LAPTOPS);
    });
  },

  async exportJSON() {
    const all = await this.getAll();
    return JSON.stringify(all, null, 2);
  },

  async importJSON(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) throw new Error("Invalid format");
      for (const item of parsed) {
        if (item.id && item.name) {
          await this.put(item);
        }
      }
      return true;
    } catch (e) {
      console.error("Import failed:", e);
      return false;
    }
  }
};

/* Image Compression Helper for File Uploads */
function compressImage(file, maxWidth = 1000, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file) { resolve(""); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP if supported, fallback to JPEG
        try {
          const dataUrl = canvas.toDataURL("image/webp", quality);
          if (dataUrl.startsWith("data:image/webp")) {
            resolve(dataUrl);
            return;
          }
        } catch (err) {}
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/* Main Loader Function for Website & Detail pages */
async function loadLaptops(activeOnly = true) {
  try {
    const list = await DiginetDB.getAll();
    if (activeOnly) {
      return list.filter(l => (l.status || "active").toLowerCase() !== "sold");
    }
    return list;
  } catch (err) {
    console.warn("Could not load inventory:", err);
    return activeOnly ? DEFAULT_LAPTOPS.filter(l => l.status !== "sold") : DEFAULT_LAPTOPS;
  }
}

/* =====================================================================
   ADMIN AUTHENTICATION HELPERS
   ===================================================================== */
const AdminAuth = {
  isLoggedIn() {
    return sessionStorage.getItem("diginet_admin_auth") === "true";
  },
  login(passcode) {
    const saved = localStorage.getItem("diginet_admin_pass") || SITE_CONFIG.adminPasscodeDefault;
    if (passcode.trim() === saved) {
      sessionStorage.setItem("diginet_admin_auth", "true");
      return true;
    }
    return false;
  },
  logout() {
    sessionStorage.removeItem("diginet_admin_auth");
  },
  changePassword(oldPass, newPass) {
    if (this.login(oldPass)) {
      localStorage.setItem("diginet_admin_pass", newPass.trim());
      return true;
    }
    return false;
  }
};
