// require("./lib/social");
// require("./lib/ads");
// var track = require("./lib/tracking");

require("component-responsive-frame/child");
require("component-leaflet-map");
var $ = require("./lib/qsa");
var dot = require("./lib/dot");
var geolocation = require("./lib/geolocation.js");
var popupTemplate = dot.compile(require("./_popup.html"));
var popupTemplate2 = dot.compile(require("./_popup2.html"));
var popupTemplate3 = dot.compile(require("./_popup3.html"));

var mapElement = $.one("leaflet-map");
var map = mapElement.map;
var L = mapElement.leaflet;

var markerLayer = L.featureGroup();
//var markerLayerPF = L.featureGroup();
// var markerLayerHigh = L.featureGroup();
var markers = [];

var toggleMarker = function(m, on) {
  if (on) {
    m.addTo(markerLayer);
  } else if (m._map) {
    markerLayer.removeLayer(m);
  }
};

var parks = {};
window.pesticideData.forEach(function(row) {
  if (!parks[row.Location]) {
    parks[row.Location] = {
      lat: row.Latitude,
      lng: row.Longitude,
      address: row.Address,
      pf: row.PF,
      incidents: [],
      byYear: {},
      noSprayings: row.NoSprayings
    };
  }
  var location = parks[row.Location];
  location.incidents.push(row);
  if (!location.byYear[row.Year]) location.byYear[row.Year] = { incidents: [], count: 0, sum: 0, sumGly:0, tierOne:0 };

  var year = location.byYear[row.Year];
  year.incidents.push(row);
  year.sum += row.Gallons * 1;
  year.count++;
  if (row.Glyphosate == "Y") year.sumGly += row.Gallons * 1;
  if (row.Tier1 == "Y") year.tierOne += row.Gallons * 1;
});

for (var p in parks) {
  var park = parks[p];
  var isFree = park.pf > 0;
  var isHigh = park.incidents.length > 100;
  var isPseudoPF = park.noSprayings > 1;
  var marker = L.marker([park.lat, park.lng], {
    icon: L.divIcon({
      className: "park-marker" + (isFree ? " pf" : " toxic") + (isHigh ? " high" : "") + (isPseudoPF ? " pseudoPF" : "")
    })
  });
  var noSpray = park.noSprayings == 1;
  marker.data = park;
  markers.push(marker);
  marker.on("click", e => console.log(e.target.data));
  marker.addTo(markerLayer);
  // if (park.incidents.length > 100) marker.addTo(markerLayerHigh);
  if (park.pf == 0) marker.bindPopup(popupTemplate({ name: p, park }), { className: "park-detail" });
  if (park.pf == 1) marker.bindPopup(popupTemplate2({ name: p, park }), { className: (noSpray ? "park-detail-noSprayings" : "park-detail") });
  if (park.pf == 2) marker.bindPopup(popupTemplate3({ name: p, park }), { className: (noSpray ? "park-detail-noSprayings" : "park-detail") });
}

markerLayer.addTo(map);
// markerLayerPF.addTo(map);
// markerLayerHigh.addTo(map);
map.fitBounds(markerLayer.getBounds());
map.scrollWheelZoom.disable();

window.map = map;
window.markerLayer = markerLayer;

var onToggleLayer = function(e) {

  var params = {};

  $(`.nav input[type="checkbox"]`).forEach(el => params[el.id] = el.checked);

  markers.forEach(function(m) {
    if (m.data.noSprayings == 1) {
      toggleMarker(m, params.free);
    } else {
      if (params.pesticide) {
        if (m.data.noSprayings != 1) {
          toggleMarker(m, true);
        }
      } else {
        toggleMarker(m, false);
      }
    }
  })

};

$(".nav input").forEach(el => el.addEventListener("change", onToggleLayer));

var addressInput = $.one(".address-input");
var addressInputMobile = $.one(".address-input-mobile");
var addressButton = $.one("button.geocode");
var addressButtonMobile = $.one("button.geocode.mobile");

var geocode = function() {
  var address = addressInput.value;
  addressButton.setAttribute("disabled", "");
  geolocation.address(address, function(err, coords) {
    addressButton.removeAttribute("disabled");
    if (err) return console.log(err);
    map.flyTo(coords, 14);
  });
};

var geocodeMobile = function() {
  var addressMobile = addressInputMobile.value;
  addressButtonMobile.setAttribute("disabled", "");
  geolocation.address(addressMobile, function(err, coords) {
    addressButtonMobile.removeAttribute("disabled");
    if (err) return console.log(err);
    map.flyTo(coords, 14);
  });
};

addressButton.addEventListener("click", geocode);
addressButtonMobile.addEventListener("click", geocodeMobile);
addressInput.addEventListener("keyup", function(e) {
  if (e.keyCode == 13) geocode();
});
addressInputMobile.addEventListener("keyup", function(e) {
  if (e.keyCode == 13) geocodeMobile();
});
