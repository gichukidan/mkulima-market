/* Data layer. Empty on purpose: replace each array with a fetch from your database (see docs/schema.sql).
   Shapes (keep these or update the page scripts that read them):
   produce:      { n:{en,sw}, pr:number KSh, u:{en,sw}, q:"120 kg", s:"Seller", r:4.8|null, l:"Location", c:"veg"|"fruit", pos:"x% y%", sz:"320%", low:0|1 }  (pos/sz crop the hero photo; use an image URL later)
   sellers:      home page: { b:"Business", l:"Town", c:"Categories", r:4.8, n:reviewCount, v:0|1, pos:"x% y%" }
                 map page:  [name, town, lat, lon, rating]   (approximate area only, never a home address)
   markets:      [name, town, lat, lon]   (verify coordinates before use)
   transporters: [name, town, lat, lon, vehicle, capacityKg, serviceKm, pricingMethod]
   listings:     { id, c:"Commodity", s:"Seller", w:"Area", a:lat, o:lon, q:kg, p:KSh per kg, r:rating|null }
   priceReports: { c:"Commodity", m:"Market", u:"kg", t:"reported"|"asking"|"confirmed", d:"YYYY-MM-DD", p:number, s:"Source" }
   Note: home uses `sellers` objects and the map page uses arrays. Give them separate keys when you wire a real API. */
window.MKDATA = {
  towns: [['Nairobi', -1.2864, 36.8172],
    ['Thika', -1.0333, 37.0693],
    ['Nyeri', -0.4167, 36.95],
    ['Karatina', -0.4833, 37.1333],
    ['Meru', 0.047, 37.649],
    ['Nakuru', -0.3031, 36.08],
    ['Eldoret', 0.5143, 35.2698],
    ['Kitale', 1.0157, 35.0062],
    ['Kisumu', -0.0917, 34.768],
    ['Mombasa', -4.0435, 39.6682],
    ['Kwale', -4.1737, 39.4521]],
  produce: [],
  sellers: [],
  markets: [],
  transporters: [],
  listings: [],
  priceReports: []
};
