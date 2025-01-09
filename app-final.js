// Load a VIIRS surface reflectance image and display on the map.
var dataset = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
    .filterDate('2022-07-01', '2024-12-01')
    .filter(ee.Filter.lt('CLOUD_COVER', 20))

// Create the title label.
var title = ui.Label('Bellingcat Multispectral Imagery Explorer');
title.style().set({'font-size': '24px', 'font-weight': 'bold'});
var description = '';
var tool_summary = ui.Label("The Multispectral Imagery Explorer was designed to demonstrate how satellite imagery can highlight features not visible to the human eye. It uses images from the Landsat 8 dataset, allowing different band combinations to be selected and compared. Each combination in the menu below has different associated points of interest – click on them to navigate, or use the search tool to find other locations. \n\n This tool was designed by Agnes Cameron as part of Bellingcat's Tech Fellowship. Read the accompanying guide (linked below) to learn more about how to use satellite imagery in open-source investigations.");
var landsat_link = ui.Label("more info about Landsat 8 ↗")
var article_link = ui.Label("read the full article on the Bellingcat website ↗")
landsat_link.setUrl("https://gisgeography.com/landsat-8-bands-combinations/")
article_link.setUrl("https://www.bellingcat.com/resources/2025/01/10/satellite-imagery-bands-guide/")

var mapsButton = ui.Button('open in Google Maps');
mapsButton.onClick(function(){
  var win = window.open(url, 'https://maps.google.com/');
  win.focus();
})

var new_layer = ui.Checkbox('add as new layer');
var add_as_new_layer = false;
// Map.add(title);

new_layer.onChange(function(checked) {
  // Shows or hides the first map layer based on the checkbox's value.
  add_as_new_layer = checked;
});

var button_layout = ui.Panel.Layout.flow('horizontal', true);
var buttons = ui.Panel([], button_layout);
var zoomLabel;

function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBand = image.select('ST_B10').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBand, null, true);
}

function calculateMetalBandsLandsat(image) {
  return ee.Image.cat(  // combine all images' bands into bands
    image,
    image.expression('b("SR_B4") / b("SR_B2")').multiply(1.2).rename('ferric1'),
    image.expression('(b("SR_B4") / b("SR_B3"))').multiply(2).rename('ferric2'),
    image.expression('b("SR_B6") / b("SR_B7")').divide(1.3).rename('kaolinite'),    
    image.expression('b("SR_B7") / b("SR_B6")').multiply(1.2).rename('gad1R'),
    image.expression('b("SR_B6") / b("SR_B5")').divide(1.2).rename('gad1G'),
    image.expression('b("SR_B4") / b("SR_B2")').divide(1.8).rename('gad1B'),
    image.expression('(b("SR_B5") - b("SR_B4"))/(b("SR_B5") + b("SR_B4"))').rename('ndvi')
  );
}

var bandVis = dataset.map(function(img) {
  var ndviParams = {min: -0.5, max: 0.5, palette: ['red', 'yellow', 'green']};
  var ndwiParams = {min: -0.5, max: 0.3, palette: ['yellow', 'blue']};

  var b4 = img.select('SR_B4');
  var b3 = img.select('SR_B3');
  var b5 = img.select('SR_B5');

  var ndvi = b4.subtract(b3).divide(b4.add(b3));
  var ndwi = b5.subtract(b4).divide(b5.add(b4));

  return ndvi.visualize(ndviParams)
})

var dataset_scaled = dataset.map(applyScaleFactors);
var dataset_addedbands = dataset_scaled.map(calculateMetalBandsLandsat);


var combinations = { 
  'True Colour / RGB': {
    bands: ['SR_B4', 'SR_B3', 'SR_B2'],
    min: 0.0,
    max: 0.2,
    description: "Standard 'natural colour' combination using visible bands of light – red (R), green (G) and blue (B). Features will look similar to how they look to the human eye.",
    features: [
      {
        'name': 'Utah, USA',
        'loc': [ -109.719, 38.246, 8],
        'description': 'Snowy peaks and reddish rocks in the Utah desert.'
      }, 
      {
        'name': 'Tulcea, Romania',
        'loc': [29.5, 45.15, 9],
        'description': 'Lakes in the Danube delta, showing suspended particles as the river meets the ocean.'
      },
      {
        'name': 'Guangzhou, China',
        'loc': [113.265, 23.124, 9],
        'description': 'The city of Guangzhou (plus neighbouring Foshan and Dongguan), showing a combination of urban space, water and vegetation.'
      }
    ]
    
  },
  
  "Colour Infrared / Vegetation Health": {
    bands: ['SR_B5', 'SR_B4', 'SR_B3'],
    min: 0.0,
    max: 0.3,
    description: 'This band combination is useful for spotting healthy vegetation, which contains chlorophyll. Chlorophyll strongly reflects near-infrared light, which has been mapped to the visible red channel in this view. Deep red indicates healthier vegetation, while lighter red is more sparse. Urban areas, meanwhile, appear blue-grey.',
    features: [
      {
        'name': 'London, England',
        'loc': [0, 51.475, 12],
        'description': 'The city of London, showing vegetation in bright red.'
      }, 
      {
        'name': 'Nile Valley, Egypt',
        'loc': [ 32.864, 24.945, 8],
        'description': 'Vegetation appears bright red around the River Nile, and is visible in contrast to the surrounding desert.'
      },
      ]
  },
  
  'Shortwave Infrared': {
    bands: ['SR_B7', 'SR_B6', 'SR_B4'],
    min: 0.0,
    max: 0.4,
    description: 'In this combination of Landsat 8 bands 7, 6, and 4, shortwave infrared bands are combined. This combination is useful for differentiating between different kinds of vegetation, and monitoring soil health. (NB -- this name is sometimes also used to refer to the 7, 5, 4 band combination)',
    features: [
      {
        'name': 'Sandersville, Georgia',
        'loc': [-82.926, 33.015, 12],
        'description': 'Kaolinite mines near the town of Sandersville. The kaolinite clay appears bright cyan, due to high reflectance in bands 5 and 4.'
      }, 
      {
        'name': 'Soda Lake, California',
        'loc': [-119.8, 35.29, 9],
        'description': 'Alkaline lake appears bright blue, while other water appears black. Agricultural land to the right appears in shades of green, while urban areas appear grey.'
      },
    ]
  },
  
  'Bauxite Mining Band Ratio Comparison': {
    bands: ['ferric1', 'ferric2', 'kaolinite'],
    min: 0.6,
    max: 2.8,
    description: 'Custom band ratio comparison developed as part of mining research with Bellingcat. This consists of ratios highlighting Goethite (R), Haematite (G) and Kaolinite (B). Bauxite appears bright yellow-white, tailings lakes appear bright yellow-blue.',
    features: [
      {
        'name': 'Manchester Parish, Jamaica',
        'loc': [-77.429, 17.95, 11],
        'description': 'Bauxite mines and tailings lakes in Manchester Parish, Jamaica.'
      }, 
      {
        'name': 'Kuantan, Malaysia',
        'loc': [103.3, 3.88,  13],
        'description': 'The partially covered Bukit Goh bauxite mine surrounds a village in Kuantan, Malaysia.'
      },
      {
        'name': 'Tayan, Indonesia',
        'loc': [ 110.159, -0.061, 11],
        'description': 'Unremediated bauxite mines near Tayan, Indonesia.'
      },
    ]
  },
  
  'Normalised Difference Vegetation Index (NDVI)': {
    bands: ['ndvi'],
    min: 0.1,
    max: 0.5,
    palette: ['white', 'yellow', 'green'],
    description: 'The NDVI is a popular index for detecting the presence of healthy vegetation, which uses contrasting information from the red and near infrared bands of satellite images (where vegetation absorbs and reflects a lot of light respectively) to specifically highlight vegetated areas.',
    features: [
      {
        'name': 'New Mexico, USA',
        'loc': [-104.428, 33.31, 11],
        'description': 'Farms around Roswell Parish.'
      }, 
      {
        'name': 'New Orleans, USA',
        'loc': [-89.957, 29.849,  10],
        'description': 'Differentiating between city, vegetated land and water in the New Orleans Bayou.'
      }
    ]
  },
  
  'Mineral Zone Contrast Band Ratios': {
    bands: ['gad1R', 'gad1G', 'gad1B'],
    min: 0.6,
    max: 1.2,
    description: 'Geologists Sabreen Gad and Timothy Kusky developed band ratios to differentiate between various rock types. In this view, vegetation appears dark or black, while different minerals and rock types are highlighted as distinct colours in the processed image.',
    features: [
      {
        'name': 'Neyshabur, Iran',
        'loc': [57.924, 36.089, 12],
        'description': "An area that appears quite uniform under RGB reveals many different rocks when visualised through this ratio."
      }, 
      {
        'name': 'Egyptian Sinai Desert',
        'loc': [32.864, 27.882, 12],
        'description': 'Visualising complex mineral zones in the Eastern Sinai.'
      },
      {
        'name': 'Carajas Iron Mine',
        'loc': [ -50.179, -6.064, 12],
        'description': 'The Carajas iron mine, Brazil. Iron oxides are highlighted very strongly under this band comparison.'
      },
    ]
  }
}

function clearLayers() {
  var layers = Map.layers()
  layers.map(function(layer) { Map.remove(layer) })
}

function zoomTo(feature) {
  Map.setCenter(feature.loc[0], feature.loc[1], feature.loc[2])
  buttons.remove(zoomLabel)
  zoomLabel = ui.Label(feature.description, {width: '350px'});
  buttons.add(zoomLabel)
}

var select = ui.Select({
  items: Object.keys(combinations),
  onChange: function(key) {
    if(!add_as_new_layer) clearLayers();
    //populate panel with numberic values
    Map.addLayer(dataset_addedbands.median(), combinations[key], key);
    panel.remove(description)
    panel.remove(buttons)
    description = ui.Label(combinations[key].description);
    panel.add(description)
    var features = combinations[key].features;
    buttons.clear()
    
    features.map( function(feature) {
      var button = ui.Button(feature.name, function() {zoomTo(feature)})
      buttons.add(button)
    })
    
    panel.add(buttons)

  }
});

// Create a panel to hold the chart.
var panel = ui.Panel();
panel.style().set({
  width: '400px',
  height: '650px',
  position: 'bottom-right'
});

panel.add(title);
panel.add(tool_summary);
panel.add(landsat_link);
panel.add(article_link);
panel.add(select);


Map.add(panel);
