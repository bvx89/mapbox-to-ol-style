(function(_g){(function(f){var r=(typeof require==='function'?require:function(name){return {"_":null,"ol/style/style":ol.style.Style,"ol/style/fill":ol.style.Fill,"ol/style/stroke":ol.style.Stroke,"ol/style/circle":ol.style.Circle}[name];});if (typeof exports==='object'&&typeof module!=='undefined'){module.exports=f(r)}else if(typeof define==='function'&&define.amd){define(["_","ol/style/style","ol/style/fill","ol/style/stroke","ol/style/circle"],f.bind(_g,r))}else{f(r)}})(function(require,define,module,exports){var _m=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; /*
                                                                                                                                                                                                                                                                              mapbox-to-ol-style - Create OpenLayers style functions from Mapbox Style objects
                                                                                                                                                                                                                                                                              Copyright 2016-present Boundless Spatial, Inc.
                                                                                                                                                                                                                                                                              License: https://raw.githubusercontent.com/boundlessgeo/mapbox-to-ol-style/master/LICENSE.md
                                                                                                                                                                                                                                                                              */

exports.default = function (olLayer, glStyle, source, resolutions, spriteData, spriteImageUrl, fonts) {
  if (!resolutions) {
    resolutions = [];
    for (var res = 156543.03392804097; resolutions.length < 22; res /= 2) {
      resolutions.push(res);
    }
  }
  if ((typeof glStyle === 'undefined' ? 'undefined' : _typeof(glStyle)) == 'object') {
    // We do not want to modify the original, so we deep-clone it
    glStyle = JSON.stringify(glStyle);
  }
  glStyle = JSON.parse(glStyle);
  if (glStyle.version != 8) {
    throw new Error('glStyle version 8 required.');
  }

  var spriteImage;
  if (spriteImageUrl) {
    var img = new Image();
    img.onload = function () {
      spriteImage = img;
      olLayer.changed();
    };
    img.src = spriteImageUrl;
  }

  var ctx = document.createElement('CANVAS').getContext('2d');
  var measureCache = {};
  function wrapText(text, font, em) {
    var key = em + font + text;
    var wrappedText = measureCache[key];
    if (!wrappedText) {
      ctx.font = font;
      var oneEm = ctx.measureText('M').width;
      var width = oneEm * em;
      var words = text.split(' ');
      var line = '';
      var lines = [];
      for (var i = 0, ii = words.length; i < ii; ++i) {
        var word = words[i];
        if (ctx.measureText(line + word).width <= width) {
          line += (line ? ' ' : '') + word;
        } else {
          if (line) {
            lines.push(line);
          }
          line = word;
        }
      }
      if (line) {
        lines.push(line);
      }
      wrappedText = lines.join('\n');
      measureCache[key] = wrappedText;
    }
    return wrappedText;
  }

  var textCache = {};
  var labelEngine = new _labelgun2.default(voidFn, voidFn);
  function createIconLabelCombo(iconStyle, textStyle, coord, state) {
    var pixelRatio = state.pixelRatio;
    var bottomLeft = [Infinity, Infinity];
    var topRight = [-Infinity, -Infinity];
    var bounds = {
      bottomLeft: bottomLeft,
      topRight: topRight
    };
    var instructions = [];
    if (iconStyle) {
      var img = iconStyle.img;
      var imgData = iconStyle.imgData;
      var scale = iconStyle.scale * pixelRatio;
      var width = imgData.width;
      var height = imgData.height;
      var iconX = coord[0] - width / 2 * scale;
      var iconY = coord[1] - height / 2 * scale;
      bottomLeft[0] = iconX;
      bottomLeft[1] = iconY;
      topRight[0] = coord[0] + width / 2 * scale;
      topRight[1] = coord[1] + height / 2 * scale;
      instructions.push({
        translate: [iconX, iconY],
        rotate: iconStyle.rotation,
        alpha: iconStyle.opacity,
        drawImage: [img, imgData.x, imgData.y, width, height, 0, 0, width * scale, height * scale]
      });
    }
    if (textStyle) {
      var key = [textStyle.font, textStyle.fill, textStyle.stroke, textStyle.lineWidth, textStyle.text].join();
      var canvas = textCache[key];
      if (!canvas) {
        // Draw the label to its own canvas and cache it.
        canvas = textCache[key] = document.createElement('CANVAS');
        ctx.font = textStyle.font;
        var lines = textStyle.text.split('\n');
        var lineHeight = ctx.measureText('M').width * 1.5;
        var textWidth = 0;
        var textHeight = 0;
        var i = 0,
            ii = lines.length;
        for (; i < ii; ++i) {
          textWidth = Math.max(textWidth, ctx.measureText(lines[i]).width);
          textHeight += lineHeight;
        }
        var lineWidth = textStyle.lineWidth;
        canvas.width = Math.ceil((2 * lineWidth + textWidth) * pixelRatio);
        canvas.height = Math.ceil((2 * lineWidth + textHeight) * pixelRatio);
        var context = canvas.getContext('2d');
        context.font = textStyle.font;
        context.textBaseline = 'hanging';
        context.textAlign = 'center';
        context.translate(canvas.width / 2, 0);
        context.scale(pixelRatio, pixelRatio);
        for (i = 0; i < ii; ++i) {
          if (textStyle.stroke) {
            context.strokeStyle = textStyle.stroke;
            context.lineWidth = lineWidth;
            context.strokeText(lines[i], 0, lineWidth + i * lineHeight);
          }
          if (textStyle.fill) {
            context.fillStyle = textStyle.fill;
            context.fillText(lines[i], 0, lineWidth + i * lineHeight);
          }
        }
      }
      var halfWidth = canvas.width / 2;
      var halfHeight = canvas.height / 2;
      var textSize = textStyle.textSize * pixelRatio;
      var anchor = textStyle.anchor;
      var offset = textStyle.offset;
      var labelX = coord[0] - halfWidth + offset[0] * textSize;
      var labelY = coord[1] - halfHeight + offset[1] * textSize;
      if (anchor.indexOf('top') != -1) {
        labelY += halfHeight;
      } else if (anchor.indexOf('bottom') != -1) {
        labelY -= halfHeight;
      }
      if (anchor.indexOf('left') != -1) {
        labelX += halfWidth;
      } else if (anchor.indexOf('right') != -1) {
        labelX -= halfWidth;
      }
      bottomLeft[0] = Math.min(bottomLeft[0], labelX);
      bottomLeft[1] = Math.min(bottomLeft[1], labelY);
      topRight[0] = Math.max(topRight[0], labelX + canvas.width);
      topRight[1] = Math.max(topRight[1], labelY + canvas.height);
      instructions.push({
        translate: [labelX, labelY],
        rotate: textStyle.rotation,
        alpha: textStyle.opacity,
        drawImage: [canvas, 0, 0]
      });
    }
    labelEngine.ingestLabel(bounds, coord.toString(), 1, instructions);
  }

  var allLayers = glStyle.layers;
  var layersBySourceLayer = {};
  for (var i = 0, ii = allLayers.length; i < ii; ++i) {
    var layer = allLayers[i];
    if (!layer.layout) {
      layer.layout = {};
    }
    resolveRef(layer, glStyle);
    if (typeof source == 'string' && layer.source == source || source.indexOf(layer.id) !== -1) {
      var sourceLayer = layer['source-layer'];
      var layers = layersBySourceLayer[sourceLayer];
      if (!layers) {
        layers = layersBySourceLayer[sourceLayer] = [];
      }
      layers.push({
        layer: layer,
        index: i
      });
      preprocess(layer, fonts);
    }
  }

  var iconImageCache = {};

  var styles = [];

  var styleFunction = function styleFunction(feature, resolution) {
    var properties = feature.getProperties();
    var layers = layersBySourceLayer[properties.layer];
    if (!layers) {
      return;
    }
    var zoom = resolutions.indexOf(resolution);
    if (zoom == -1) {
      zoom = getZoomForResolution(resolution, resolutions);
    }
    var type = types[feature.getGeometry().getType()];
    var f = {
      properties: properties,
      type: type
    };
    var stylesLength = -1;
    for (var i = 0, ii = layers.length; i < ii; ++i) {
      var layerData = layers[i];
      var layer = layerData.layer;
      var paint = layer.paint;
      if (paint.visibility === 'none' || 'minzoom' in layer && zoom < layer.minzoom || 'maxzoom' in layer && zoom >= layer.maxzoom) {
        continue;
      }
      if (!layer.filter || layer.filter(f)) {
        var color, opacity, fill, stroke, strokeColor, style;
        var index = layerData.index;
        if (type == 3) {
          if (!('fill-pattern' in paint) && 'fill-color' in paint) {
            opacity = paint['fill-opacity'](zoom, properties);
            color = colorWithOpacity(paint['fill-color'](zoom, properties), opacity);
            if (color) {
              ++stylesLength;
              style = styles[stylesLength];
              if (!style || !style.getFill() || style.getStroke() || style.getText()) {
                style = styles[stylesLength] = new _style2.default({
                  fill: new _fill2.default()
                });
              }
              fill = style.getFill();
              fill.setColor(color);
              style.setZIndex(index);
            }
            if ('fill-outline-color' in paint) {
              strokeColor = colorWithOpacity(paint['fill-outline-color'](zoom, properties), opacity);
            }
            if (strokeColor) {
              ++stylesLength;
              style = styles[stylesLength];
              if (!style || !style.getStroke() || style.getFill() || style.getText()) {
                style = styles[stylesLength] = new _style2.default({
                  stroke: new _stroke2.default()
                });
              }
              stroke = style.getStroke();
              stroke.setLineCap(defaults['line-cap']);
              stroke.setLineJoin(defaults['line-join']);
              stroke.setMiterLimit(defaults['line-miter-limit']);
              stroke.setColor(strokeColor);
              stroke.setWidth(1);
              stroke.setLineDash(null);
              style.setZIndex(index);
            }
          }
        }
        if (type != 1) {
          color = !('line-pattern' in paint) && 'line-color' in paint ? colorWithOpacity(paint['line-color'](zoom, properties), paint['line-opacity'](zoom, properties)) : undefined;
          var width = paint['line-width'](zoom, properties);
          if (color && width > 0) {
            ++stylesLength;
            style = styles[stylesLength];
            if (!style || !style.getStroke() || style.getFill() || style.getText()) {
              style = styles[stylesLength] = new _style2.default({
                stroke: new _stroke2.default()
              });
            }
            stroke = style.getStroke();
            stroke.setLineCap(paint['line-cap'](zoom, properties));
            stroke.setLineJoin(paint['line-join'](zoom, properties));
            stroke.setMiterLimit(paint['line-miter-limit'](zoom, properties));
            stroke.setColor(color);
            stroke.setWidth(width);
            stroke.setLineDash(paint['line-dasharray'] ? paint['line-dasharray'](zoom, properties).map(function (x) {
              return x * width;
            }) : null);
            style.setZIndex(index);
          }
        }

        var iconStyle;
        if (type == 1 && 'icon-image' in paint) {
          var iconImage = paint['icon-image'](zoom, properties);
          if (iconImage) {
            var icon = fromTemplate(iconImage, properties);
            style = iconImageCache[icon];
            if (spriteData && spriteImage) {
              var spriteImageData = spriteData[icon];
              if (spriteImageData) {
                iconStyle = {
                  img: spriteImage,
                  imgData: spriteImageData,
                  scale: paint['icon-size'](zoom, properties) / spriteImageData.pixelRatio,
                  rotation: deg2rad(paint['icon-rotate'](zoom, properties)),
                  opacity: paint['icon-opacity'](zoom, properties)
                };
              }
            }
          }
        }

        if (type == 1 && 'circle-radius' in paint) {
          // TODO Send circles through createIconLabelCombo
          ++stylesLength;
          var cache_key = paint['circle-radius'](zoom, properties) + '.' + paint['circle-stroke-color'](zoom, properties) + '.' + paint['circle-color'](zoom, properties);
          style = iconImageCache[cache_key];
          if (!style) {
            style = new _style2.default({
              image: new _circle2.default({
                radius: paint['circle-radius'](zoom, properties),
                stroke: new _stroke2.default({
                  color: colorWithOpacity(paint['circle-stroke-color'](zoom, properties), opacity)
                }),
                fill: new _fill2.default({
                  color: colorWithOpacity(paint['circle-color'](zoom, properties), opacity)
                })
              })
            });
          }
          style.setZIndex(index);
          styles[stylesLength] = style;
        }

        var label;
        if ('text-field' in paint) {
          var textField = paint['text-field'](zoom, properties);
          label = fromTemplate(textField, properties);
        }
        // TODO Add LineString handling as soon as it's supporte in OpenLayers
        var textStyle;
        if (label && type !== 2) {
          var textSize = paint['text-size'](zoom, properties);
          var font = (0, _mapboxToCssFont2.default)(fontMap[paint['text-font'](zoom, properties)], textSize);
          var textTransform = paint['text-transform'];
          if (textTransform == 'uppercase') {
            label = label.toUpperCase();
          } else if (textTransform == 'lowercase') {
            label = label.toLowerCase();
          }
          var wrappedLabel = wrapText(label, font, paint['text-max-width'](zoom, properties));
          textStyle = {
            text: wrappedLabel,
            font: font,
            textSize: textSize,
            anchor: paint['text-anchor'](zoom, properties),
            offset: paint['text-offset'](zoom, properties),
            rotation: deg2rad(paint['text-rotate'](zoom, properties)),
            opacity: paint['text-opacity'](zoom, properties)
          };
          textStyle.fill = paint['text-color'](zoom, properties);
          if (paint['text-halo-width']) {
            textStyle.lineWidth = paint['text-halo-width'](zoom, properties);
            textStyle.stroke = paint['text-halo-color'](zoom, properties);
          }
        }

        if (iconStyle || textStyle) {
          ++stylesLength;
          style = styles[stylesLength];
          if (!style || !style.getRenderer() || style.getFill() || style.getStroke()) {
            style = styles[stylesLength] = new _style2.default();
          }
          style.setRenderer(function (coords, state) {
            createIconLabelCombo(iconStyle, textStyle, coords, state);
          });
          var geometry = feature.getGeometry();
          if (geometry.getType() == 'Polygon') {
            style.setGeometry(geometry.getInteriorPoint());
          } else if (geometry.getType() == 'MultiPolygon') {
            style.setGeometry(geometry.getPolygons().sort(sortByWidth)[0].getInteriorPoint());
          }
          style.setZIndex(index);
        }
      }
    }

    if (stylesLength > -1) {
      styles.length = stylesLength + 1;
      return styles;
    }
  };
  olLayer.on('change', function () {
    textCache = {};
  });
  olLayer.on('precompose', function () {
    labelEngine.destroy();
  });
  olLayer.on('postcompose', function (e) {
    var context = e.context;
    var items = labelEngine.getShown();
    for (var i = 0, ii = items.length; i < ii; ++i) {
      var item = items[i];
      var instructions = item.labelObject;
      for (var j = 0, jj = instructions.length; j < jj; ++j) {
        var instruction = instructions[j];
        var alpha = context.globalAlpha;
        context.translate.apply(context, instruction.translate);
        if (instruction.rotate) {
          context.rotate(instruction.rotate);
        }
        if (instruction.alpha != 1) {
          context.globalAlpha = alpha * instruction.alpha;
        }
        context.drawImage.apply(context, instruction.drawImage);
        if (instruction.alpha != 1) {
          context.globalAlpha = alpha;
        }
        if (instruction.rotate) {
          context.rotate(-instruction.rotate);
        }
        context.translate.apply(context, instruction.translate.map(function (t) {
          return -t;
        }));
      }
    }
  });
  olLayer.setStyle(styleFunction);
  return styleFunction;
};

var _style = require('ol/style/style');

var _style2 = _interopRequireDefault(_style);

var _fill = require('ol/style/fill');

var _fill2 = _interopRequireDefault(_fill);

var _stroke = require('ol/style/stroke');

var _stroke2 = _interopRequireDefault(_stroke);

var _circle = require('ol/style/circle');

var _circle2 = _interopRequireDefault(_circle);

var _function = require('@mapbox/mapbox-gl-style-spec/function');

var _function2 = _interopRequireDefault(_function);

var _feature_filter = require('@mapbox/mapbox-gl-style-spec/feature_filter');

var _feature_filter2 = _interopRequireDefault(_feature_filter);

var _mapboxToCssFont = require('mapbox-to-css-font');

var _mapboxToCssFont2 = _interopRequireDefault(_mapboxToCssFont);

var _labelgun = require('labelgun');

var _labelgun2 = _interopRequireDefault(_labelgun);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var functions = {
  interpolated: ['line-miter-limit', 'fill-opacity', 'line-opacity', 'line-width', 'text-halo-width', 'text-max-width', 'text-offset', 'text-opacity', 'text-rotate', 'text-size', 'icon-opacity', 'icon-rotate', 'icon-size', 'circle-radius'],
  'piecewise-constant': ['fill-color', 'fill-outline-color', 'icon-image', 'line-cap', 'line-color', 'line-join', 'line-dasharray', 'text-anchor', 'text-color', 'text-field', 'text-font', 'text-halo-color', 'circle-color', 'circle-stroke-color']
};

var defaults = {
  'fill-opacity': 1,
  'line-cap': 'butt',
  'line-join': 'miter',
  'line-miter-limit': 2,
  'line-opacity': 1,
  'line-width': 1,
  'text-anchor': 'center',
  'text-color': '#000000',
  'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
  'text-halo-color': 'rgba(0, 0, 0, 0)',
  'text-halo-width': 0,
  'text-max-width': 10,
  'text-offset': [0, 0],
  'text-opacity': 1,
  'text-rotate': 0,
  'text-size': 16,
  'icon-opacity': 1,
  'icon-rotate': 0,
  'icon-size': 1,
  'circle-color': '#000000',
  'circle-stroke-color': '#000000'
};

var types = {
  'Point': 1,
  'MultiPoint': 1,
  'LineString': 2,
  'MultiLineString': 2,
  'Polygon': 3,
  'MultiPolygon': 3
};

function voidFn() {}

function applyDefaults(properties) {
  for (var property in defaults) {
    if (!(property in properties)) {
      properties[property] = defaults[property];
    }
  }
}

function applyLayoutToPaint(layer) {
  for (var property in layer.layout) {
    if (!layer.paint[property]) {
      layer.paint[property] = layer.layout[property];
    }
  }
}

function convertToFunctions(properties, type) {
  var propertySpec = {
    function: type
  };
  for (var i = 0, ii = functions[type].length; i < ii; ++i) {
    var property = functions[type][i];
    if (property in properties) {
      properties[property] = (0, _function2.default)(properties[property], propertySpec);
    }
  }
}

var fontMap = {};

function chooseFont(fonts, availableFonts) {
  if (availableFonts) {
    var font, i, ii;
    if (!Array.isArray(fonts)) {
      var stops = fonts.stops;
      if (stops) {
        for (i = 0, ii = stops.length; i < ii; ++i) {
          chooseFont(stops[i][1], availableFonts);
        }
      }
      return;
    }
    if (!fontMap[fonts]) {
      for (i = 0, ii = fonts.length; i < ii; ++i) {
        font = fonts[i];
        if (availableFonts.indexOf(font) >= -1) {
          fontMap[fonts] = font;
          break;
        }
      }
    }
  } else {
    fontMap[fonts] = fonts[0];
  }
}

function preprocess(layer, fonts) {
  if (!layer.paint) {
    layer.paint = {};
  }
  if (!layer.ref) {
    applyLayoutToPaint(layer);
  }
  applyDefaults(layer.paint);
  if (layer.paint['text-field']) {
    chooseFont(layer.paint['text-font'], fonts);
  }
  if (Array.isArray(layer.filter)) {
    layer.filter = (0, _feature_filter2.default)(layer.filter);
  }
  convertToFunctions(layer.paint, 'interpolated');
  convertToFunctions(layer.paint, 'piecewise-constant');
}

function resolveRef(layer, glStyleObj) {
  if (layer.ref) {
    var layers = glStyleObj.layers;
    for (var i = 0, ii = layers.length; i < ii; ++i) {
      var refLayer = layers[i];
      if (refLayer.id == layer.ref) {
        layer.type = refLayer.type;
        layer.source = refLayer.source;
        layer['source-layer'] = refLayer['source-layer'];
        layer.minzoom = refLayer.minzoom;
        layer.maxzoom = refLayer.maxzoom;
        layer.filter = refLayer.filter;
        layer.layout = refLayer.layout;
        return;
      }
    }
  }
}

function getZoomForResolution(resolution, resolutions) {
  var candidate;
  var i = 0,
      ii = resolutions.length;
  for (; i < ii; ++i) {
    candidate = resolutions[i];
    if (candidate < resolution && i + 1 < ii) {
      var zoomFactor = resolutions[i] / resolutions[i + 1];
      return i + Math.log(resolutions[i] / resolution) / Math.log(zoomFactor);
    }
  }
  return ii - 1;
}

var colorElement = document.createElement('div');
var colorRegEx = /^rgba?\((.*)\)$/;
var colorCache = {};

function colorWithOpacity(color, opacity) {
  if (color && opacity !== undefined) {
    var colorData = colorCache[color];
    if (!colorData) {
      colorElement.style.color = color;
      document.body.appendChild(colorElement);
      var colorString = getComputedStyle(colorElement).getPropertyValue('color');
      document.body.removeChild(colorElement);
      var colorArray = colorString.match(colorRegEx)[1].split(',').map(Number);
      if (colorArray.length == 3) {
        colorArray.push(1);
      }
      colorCache[color] = colorData = {
        color: colorArray,
        opacity: colorArray[3]
      };
    }
    color = colorData.color;
    color[3] = colorData.opacity * opacity;
    if (color[3] === 0) {
      color = undefined;
    }
  }
  return color;
}

function deg2rad(degrees) {
  return degrees * Math.PI / 180;
}

var templateRegEx = /^(.*)\{(.*)\}(.*)$/;

function fromTemplate(text, properties) {
  var parts = text.match(templateRegEx);
  if (parts) {
    var value = properties[parts[2]] || '';
    return parts[1] + value + parts[3];
  } else {
    return text;
  }
}

function sortByWidth(a, b) {
  var extentA = a.getExtent();
  var extentB = b.getExtent();
  return extentB[2] - extentB[0] - (extentA[2] - extentA[0]);
}

/**
 * Creates a style function from the `glStyle` object for all layers that use
 * the specified `source`, which needs to be a `"type": "vector"` or
 * `"type": "geojson"` source and applies it to the specified OpenLayers layer.
 *
 * @param {ol.layer.Vector|ol.layer.VectorTile} olLayer OpenLayers layer.
 * @param {string|Object} glStyle Mapbox Style object.
 * @param {string|Array<string>} source `source` key or an array of layer `id`s
 * from the Mapbox Style object. When a `source` key is provided, all layers for
 * the specified source will be included in the style function. When layer `id`s
 * are provided, they must be from layers that use the same source.
 * @param {Array<number>} [resolutions=[156543.03392804097,
 * 78271.51696402048, 39135.75848201024, 19567.87924100512, 9783.93962050256,
 * 4891.96981025128, 2445.98490512564, 1222.99245256282, 611.49622628141,
 * 305.748113140705, 152.8740565703525, 76.43702828517625, 38.21851414258813,
 * 19.109257071294063, 9.554628535647032, 4.777314267823516, 2.388657133911758,
 * 1.194328566955879, 0.5971642834779395, 0.29858214173896974,
 * 0.14929107086948487, 0.07464553543474244]]
 * Resolutions for mapping resolution to zoom level.
 * @param {Object} [spriteData=undefined] Sprite data from the url specified in
 * the Mapbox Style object's `sprite` property. Only required if a `sprite`
 * property is specified in the Mapbox Style object.
 * @param {Object} [spriteImageUrl=undefined] Sprite image url for the sprite
 * specified in the Mapbox Style object's `sprite` property. Only required if a
 * `sprite` property is specified in the Mapbox Style object.
 * @param {Array<string>} [fonts=undefined] Array of available fonts, using the
 * same font names as the Mapbox Style object. If not provided, the style
 * function will always use the first font from the font array.
 * @return {ol.style.StyleFunction} Style function for use in
 * `ol.layer.Vector` or `ol.layer.VectorTile`.
 */

},{"@mapbox/mapbox-gl-style-spec/feature_filter":2,"@mapbox/mapbox-gl-style-spec/function":4,"labelgun":9,"mapbox-to-css-font":10,"ol/style/circle":"ol/style/circle","ol/style/fill":"ol/style/fill","ol/style/stroke":"ol/style/stroke","ol/style/style":"ol/style/style"}],2:[function(require,module,exports){
'use strict';

module.exports = createFilter;

var types = ['Unknown', 'Point', 'LineString', 'Polygon'];

/**
 * Given a filter expressed as nested arrays, return a new function
 * that evaluates whether a given feature (with a .properties or .tags property)
 * passes its test.
 *
 * @private
 * @param {Array} filter mapbox gl filter
 * @returns {Function} filter-evaluating function
 */
function createFilter(filter) {
    return new Function('f', 'var p = (f && f.properties || {}); return ' + compile(filter));
}

function compile(filter) {
    if (!filter) return 'true';
    var op = filter[0];
    if (filter.length <= 1) return op === 'any' ? 'false' : 'true';
    var str = op === '==' ? compileComparisonOp(filter[1], filter[2], '===', false) : op === '!=' ? compileComparisonOp(filter[1], filter[2], '!==', false) : op === '<' || op === '>' || op === '<=' || op === '>=' ? compileComparisonOp(filter[1], filter[2], op, true) : op === 'any' ? compileLogicalOp(filter.slice(1), '||') : op === 'all' ? compileLogicalOp(filter.slice(1), '&&') : op === 'none' ? compileNegation(compileLogicalOp(filter.slice(1), '||')) : op === 'in' ? compileInOp(filter[1], filter.slice(2)) : op === '!in' ? compileNegation(compileInOp(filter[1], filter.slice(2))) : op === 'has' ? compileHasOp(filter[1]) : op === '!has' ? compileNegation(compileHasOp(filter[1])) : 'true';
    return '(' + str + ')';
}

function compilePropertyReference(property) {
    return property === '$type' ? 'f.type' : property === '$id' ? 'f.id' : 'p[' + JSON.stringify(property) + ']';
}

function compileComparisonOp(property, value, op, checkType) {
    var left = compilePropertyReference(property);
    var right = property === '$type' ? types.indexOf(value) : JSON.stringify(value);
    return (checkType ? 'typeof ' + left + '=== typeof ' + right + '&&' : '') + left + op + right;
}

function compileLogicalOp(expressions, op) {
    return expressions.map(compile).join(op);
}

function compileInOp(property, values) {
    if (property === '$type') values = values.map(function (value) {
        return types.indexOf(value);
    });
    var left = JSON.stringify(values.sort(compare));
    var right = compilePropertyReference(property);

    if (values.length <= 200) return left + '.indexOf(' + right + ') !== -1';

    return '' + ('function(v, a, i, j) {' + 'while (i <= j) { var m = (i + j) >> 1;' + '    if (a[m] === v) return true; if (a[m] > v) j = m - 1; else i = m + 1;' + '}' + 'return false; }(') + right + ', ' + left + ',0,' + (values.length - 1) + ')';
}

function compileHasOp(property) {
    return property === '$id' ? '"id" in f' : JSON.stringify(property) + ' in p';
}

function compileNegation(expression) {
    return '!(' + expression + ')';
}

// Comparison function to sort numbers and strings
function compare(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

},{}],3:[function(require,module,exports){
'use strict';

// Constants

var Xn = 0.950470,
    // D65 standard referent
Yn = 1,
    Zn = 1.088830,
    t0 = 4 / 29,
    t1 = 6 / 29,
    t2 = 3 * t1 * t1,
    t3 = t1 * t1 * t1,
    deg2rad = Math.PI / 180,
    rad2deg = 180 / Math.PI;

// Utilities
function xyz2lab(t) {
    return t > t3 ? Math.pow(t, 1 / 3) : t / t2 + t0;
}

function lab2xyz(t) {
    return t > t1 ? t * t * t : t2 * (t - t0);
}

function xyz2rgb(x) {
    return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
}

function rgb2xyz(x) {
    x /= 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

// LAB
function rgbToLab(rgbColor) {
    var b = rgb2xyz(rgbColor[0]),
        a = rgb2xyz(rgbColor[1]),
        l = rgb2xyz(rgbColor[2]),
        x = xyz2lab((0.4124564 * b + 0.3575761 * a + 0.1804375 * l) / Xn),
        y = xyz2lab((0.2126729 * b + 0.7151522 * a + 0.0721750 * l) / Yn),
        z = xyz2lab((0.0193339 * b + 0.1191920 * a + 0.9503041 * l) / Zn);

    return [116 * y - 16, 500 * (x - y), 200 * (y - z), rgbColor[3]];
}

function labToRgb(labColor) {
    var y = (labColor[0] + 16) / 116,
        x = isNaN(labColor[1]) ? y : y + labColor[1] / 500,
        z = isNaN(labColor[2]) ? y : y - labColor[2] / 200;
    y = Yn * lab2xyz(y);
    x = Xn * lab2xyz(x);
    z = Zn * lab2xyz(z);
    return [xyz2rgb(3.2404542 * x - 1.5371385 * y - 0.4985314 * z), // D65 -> sRGB
    xyz2rgb(-0.9692660 * x + 1.8760108 * y + 0.0415560 * z), xyz2rgb(0.0556434 * x - 0.2040259 * y + 1.0572252 * z), labColor[3]];
}

// HCL
function rgbToHcl(rgbColor) {
    var labColor = rgbToLab(rgbColor);
    var l = labColor[0],
        a = labColor[1],
        b = labColor[2];
    var h = Math.atan2(b, a) * rad2deg;
    return [h < 0 ? h + 360 : h, Math.sqrt(a * a + b * b), l, rgbColor[3]];
}

function hclToRgb(hclColor) {
    var h = hclColor[0] * deg2rad,
        c = hclColor[1],
        l = hclColor[2];
    return labToRgb([l, Math.cos(h) * c, Math.sin(h) * c, hclColor[3]]);
}

module.exports = {
    lab: {
        forward: rgbToLab,
        reverse: labToRgb
    },
    hcl: {
        forward: rgbToHcl,
        reverse: hclToRgb
    }
};

},{}],4:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var colorSpaces = require('./color_spaces');
var parseColor = require('../util/parse_color');
var extend = require('../util/extend');
var getType = require('../util/get_type');

function identityFunction(x) {
    return x;
}

function createFunction(parameters, propertySpec) {
    var isColor = propertySpec.type === 'color';

    var fun = void 0;

    if (!isFunctionDefinition(parameters)) {
        if (isColor && parameters) {
            parameters = parseColor(parameters);
        }
        fun = function fun() {
            return parameters;
        };
        fun.isFeatureConstant = true;
        fun.isZoomConstant = true;
    } else {
        var zoomAndFeatureDependent = parameters.stops && _typeof(parameters.stops[0][0]) === 'object';
        var featureDependent = zoomAndFeatureDependent || parameters.property !== undefined;
        var zoomDependent = zoomAndFeatureDependent || !featureDependent;
        var type = parameters.type || (propertySpec.function === 'interpolated' ? 'exponential' : 'interval');

        if (isColor) {
            parameters = extend({}, parameters);

            if (parameters.stops) {
                parameters.stops = parameters.stops.map(function (stop) {
                    return [stop[0], parseColor(stop[1])];
                });
            }

            if (parameters.default) {
                parameters.default = parseColor(parameters.default);
            } else {
                parameters.default = parseColor(propertySpec.default);
            }
        }

        var innerFun = void 0;
        var hashedStops = void 0;
        var categoricalKeyType = void 0;
        if (type === 'exponential') {
            innerFun = evaluateExponentialFunction;
        } else if (type === 'interval') {
            innerFun = evaluateIntervalFunction;
        } else if (type === 'categorical') {
            innerFun = evaluateCategoricalFunction;

            // For categorical functions, generate an Object as a hashmap of the stops for fast searching
            hashedStops = Object.create(null);
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = parameters.stops[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var stop = _step.value;

                    hashedStops[stop[0]] = stop[1];
                }

                // Infer key type based on first stop key-- used to encforce strict type checking later
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            categoricalKeyType = _typeof(parameters.stops[0][0]);
        } else if (type === 'identity') {
            innerFun = evaluateIdentityFunction;
        } else {
            throw new Error('Unknown function type "' + type + '"');
        }

        var outputFunction = void 0;

        // If we're interpolating colors in a color system other than RGBA,
        // first translate all stop values to that color system, then interpolate
        // arrays as usual. The `outputFunction` option lets us then translate
        // the result of that interpolation back into RGBA.
        if (parameters.colorSpace && parameters.colorSpace !== 'rgb') {
            if (colorSpaces[parameters.colorSpace]) {
                var colorspace = colorSpaces[parameters.colorSpace];
                // Avoid mutating the parameters value
                parameters = JSON.parse(JSON.stringify(parameters));
                for (var s = 0; s < parameters.stops.length; s++) {
                    parameters.stops[s] = [parameters.stops[s][0], colorspace.forward(parameters.stops[s][1])];
                }
                outputFunction = colorspace.reverse;
            } else {
                throw new Error('Unknown color space: ' + parameters.colorSpace);
            }
        } else {
            outputFunction = identityFunction;
        }

        if (zoomAndFeatureDependent) {
            var featureFunctions = {};
            var zoomStops = [];
            for (var _s = 0; _s < parameters.stops.length; _s++) {
                var _stop = parameters.stops[_s];
                var zoom = _stop[0].zoom;
                if (featureFunctions[zoom] === undefined) {
                    featureFunctions[zoom] = {
                        zoom: zoom,
                        type: parameters.type,
                        property: parameters.property,
                        stops: []
                    };
                    zoomStops.push(zoom);
                }
                featureFunctions[zoom].stops.push([_stop[0].value, _stop[1]]);
            }

            var featureFunctionStops = [];
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = zoomStops[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var z = _step2.value;

                    featureFunctionStops.push([featureFunctions[z].zoom, createFunction(featureFunctions[z], propertySpec)]);
                }
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }

            fun = function fun(zoom, feature) {
                return outputFunction(evaluateExponentialFunction({
                    stops: featureFunctionStops,
                    base: parameters.base
                }, propertySpec, zoom)(zoom, feature));
            };
            fun.isFeatureConstant = false;
            fun.isZoomConstant = false;
        } else if (zoomDependent) {
            fun = function fun(zoom) {
                return outputFunction(innerFun(parameters, propertySpec, zoom, hashedStops, categoricalKeyType));
            };
            fun.isFeatureConstant = true;
            fun.isZoomConstant = false;
        } else {
            fun = function fun(zoom, feature) {
                var value = feature[parameters.property];
                if (value === undefined) {
                    return coalesce(parameters.default, propertySpec.default);
                }
                return outputFunction(innerFun(parameters, propertySpec, value, hashedStops, categoricalKeyType));
            };
            fun.isFeatureConstant = false;
            fun.isZoomConstant = true;
        }
    }

    return fun;
}

function coalesce(a, b, c) {
    if (a !== undefined) return a;
    if (b !== undefined) return b;
    if (c !== undefined) return c;
}

function evaluateCategoricalFunction(parameters, propertySpec, input, hashedStops, keyType) {
    var evaluated = (typeof input === 'undefined' ? 'undefined' : _typeof(input)) === keyType ? hashedStops[input] : undefined; // Enforce strict typing on input
    return coalesce(evaluated, parameters.default, propertySpec.default);
}

function evaluateIntervalFunction(parameters, propertySpec, input) {
    // Edge cases
    if (getType(input) !== 'number') return coalesce(parameters.default, propertySpec.default);
    var n = parameters.stops.length;
    if (n === 1) return parameters.stops[0][1];
    if (input <= parameters.stops[0][0]) return parameters.stops[0][1];
    if (input >= parameters.stops[n - 1][0]) return parameters.stops[n - 1][1];

    var index = findStopLessThanOrEqualTo(parameters.stops, input);

    return parameters.stops[index][1];
}

function evaluateExponentialFunction(parameters, propertySpec, input) {
    var base = parameters.base !== undefined ? parameters.base : 1;

    // Edge cases
    if (getType(input) !== 'number') return coalesce(parameters.default, propertySpec.default);
    var n = parameters.stops.length;
    if (n === 1) return parameters.stops[0][1];
    if (input <= parameters.stops[0][0]) return parameters.stops[0][1];
    if (input >= parameters.stops[n - 1][0]) return parameters.stops[n - 1][1];

    var index = findStopLessThanOrEqualTo(parameters.stops, input);

    return interpolate(input, base, parameters.stops[index][0], parameters.stops[index + 1][0], parameters.stops[index][1], parameters.stops[index + 1][1]);
}

function evaluateIdentityFunction(parameters, propertySpec, input) {
    if (propertySpec.type === 'color') {
        input = parseColor(input);
    } else if (getType(input) !== propertySpec.type) {
        input = undefined;
    }
    return coalesce(input, parameters.default, propertySpec.default);
}

/**
 * Returns the index of the last stop <= input, or 0 if it doesn't exist.
 *
 * @private
 */
function findStopLessThanOrEqualTo(stops, input) {
    var n = stops.length;
    var lowerIndex = 0;
    var upperIndex = n - 1;
    var currentIndex = 0;
    var currentValue = void 0,
        upperValue = void 0;

    while (lowerIndex <= upperIndex) {
        currentIndex = Math.floor((lowerIndex + upperIndex) / 2);
        currentValue = stops[currentIndex][0];
        upperValue = stops[currentIndex + 1][0];
        if (input === currentValue || input > currentValue && input < upperValue) {
            // Search complete
            return currentIndex;
        } else if (currentValue < input) {
            lowerIndex = currentIndex + 1;
        } else if (currentValue > input) {
            upperIndex = currentIndex - 1;
        }
    }

    return Math.max(currentIndex - 1, 0);
}

function interpolate(input, base, inputLower, inputUpper, outputLower, outputUpper) {
    if (typeof outputLower === 'function') {
        return function () {
            var evaluatedLower = outputLower.apply(undefined, arguments);
            var evaluatedUpper = outputUpper.apply(undefined, arguments);
            // Special case for fill-outline-color, which has no spec default.
            if (evaluatedLower === undefined || evaluatedUpper === undefined) {
                return undefined;
            }
            return interpolate(input, base, inputLower, inputUpper, evaluatedLower, evaluatedUpper);
        };
    } else if (outputLower.length) {
        return interpolateArray(input, base, inputLower, inputUpper, outputLower, outputUpper);
    } else {
        return interpolateNumber(input, base, inputLower, inputUpper, outputLower, outputUpper);
    }
}

function interpolateNumber(input, base, inputLower, inputUpper, outputLower, outputUpper) {
    var ratio = interpolationFactor(input, base, inputLower, inputUpper);
    return outputLower + ratio * (outputUpper - outputLower);
}

function interpolateArray(input, base, inputLower, inputUpper, outputLower, outputUpper) {
    var output = [];
    for (var i = 0; i < outputLower.length; i++) {
        output[i] = interpolateNumber(input, base, inputLower, inputUpper, outputLower[i], outputUpper[i]);
    }
    return output;
}

function isFunctionDefinition(value) {
    return (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' && (value.stops || value.type === 'identity');
}

/**
 * Returns a ratio that can be used to interpolate between exponential function
 * stops.
 *
 * How it works:
 * Two consecutive stop values define a (scaled and shifted) exponential
 * function `f(x) = a * base^x + b`, where `base` is the user-specified base,
 * and `a` and `b` are constants affording sufficient degrees of freedom to fit
 * the function to the given stops.
 *
 * Here's a bit of algebra that lets us compute `f(x)` directly from the stop
 * values without explicitly solving for `a` and `b`:
 *
 * First stop value: `f(x0) = y0 = a * base^x0 + b`
 * Second stop value: `f(x1) = y1 = a * base^x1 + b`
 * => `y1 - y0 = a(base^x1 - base^x0)`
 * => `a = (y1 - y0)/(base^x1 - base^x0)`
 *
 * Desired value: `f(x) = y = a * base^x + b`
 * => `f(x) = y0 + a * (base^x - base^x0)`
 *
 * From the above, we can replace the `a` in `a * (base^x - base^x0)` and do a
 * little algebra:
 * ```
 * a * (base^x - base^x0) = (y1 - y0)/(base^x1 - base^x0) * (base^x - base^x0)
 *                     = (y1 - y0) * (base^x - base^x0) / (base^x1 - base^x0)
 * ```
 *
 * If we let `(base^x - base^x0) / (base^x1 base^x0)`, then we have
 * `f(x) = y0 + (y1 - y0) * ratio`.  In other words, `ratio` may be treated as
 * an interpolation factor between the two stops' output values.
 *
 * (Note: a slightly different form for `ratio`,
 * `(base^(x-x0) - 1) / (base^(x1-x0) - 1) `, is equivalent, but requires fewer
 * expensive `Math.pow()` operations.)
 *
 * @private
*/
function interpolationFactor(input, base, lowerValue, upperValue) {
    var difference = upperValue - lowerValue;
    var progress = input - lowerValue;

    if (base === 1) {
        return progress / difference;
    } else {
        return (Math.pow(base, progress) - 1) / (Math.pow(base, difference) - 1);
    }
}

module.exports = createFunction;
module.exports.isFunctionDefinition = isFunctionDefinition;
module.exports.interpolationFactor = interpolationFactor;
module.exports.findStopLessThanOrEqualTo = findStopLessThanOrEqualTo;

},{"../util/extend":6,"../util/get_type":7,"../util/parse_color":8,"./color_spaces":3}],5:[function(require,module,exports){
"use strict";

// (c) Dean McNamee <dean@gmail.com>, 2012.
//
// https://github.com/deanm/css-color-parser-js
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

// http://www.w3.org/TR/css3-color/
var kCSSColorTable = {
  "transparent": [0, 0, 0, 0], "aliceblue": [240, 248, 255, 1],
  "antiquewhite": [250, 235, 215, 1], "aqua": [0, 255, 255, 1],
  "aquamarine": [127, 255, 212, 1], "azure": [240, 255, 255, 1],
  "beige": [245, 245, 220, 1], "bisque": [255, 228, 196, 1],
  "black": [0, 0, 0, 1], "blanchedalmond": [255, 235, 205, 1],
  "blue": [0, 0, 255, 1], "blueviolet": [138, 43, 226, 1],
  "brown": [165, 42, 42, 1], "burlywood": [222, 184, 135, 1],
  "cadetblue": [95, 158, 160, 1], "chartreuse": [127, 255, 0, 1],
  "chocolate": [210, 105, 30, 1], "coral": [255, 127, 80, 1],
  "cornflowerblue": [100, 149, 237, 1], "cornsilk": [255, 248, 220, 1],
  "crimson": [220, 20, 60, 1], "cyan": [0, 255, 255, 1],
  "darkblue": [0, 0, 139, 1], "darkcyan": [0, 139, 139, 1],
  "darkgoldenrod": [184, 134, 11, 1], "darkgray": [169, 169, 169, 1],
  "darkgreen": [0, 100, 0, 1], "darkgrey": [169, 169, 169, 1],
  "darkkhaki": [189, 183, 107, 1], "darkmagenta": [139, 0, 139, 1],
  "darkolivegreen": [85, 107, 47, 1], "darkorange": [255, 140, 0, 1],
  "darkorchid": [153, 50, 204, 1], "darkred": [139, 0, 0, 1],
  "darksalmon": [233, 150, 122, 1], "darkseagreen": [143, 188, 143, 1],
  "darkslateblue": [72, 61, 139, 1], "darkslategray": [47, 79, 79, 1],
  "darkslategrey": [47, 79, 79, 1], "darkturquoise": [0, 206, 209, 1],
  "darkviolet": [148, 0, 211, 1], "deeppink": [255, 20, 147, 1],
  "deepskyblue": [0, 191, 255, 1], "dimgray": [105, 105, 105, 1],
  "dimgrey": [105, 105, 105, 1], "dodgerblue": [30, 144, 255, 1],
  "firebrick": [178, 34, 34, 1], "floralwhite": [255, 250, 240, 1],
  "forestgreen": [34, 139, 34, 1], "fuchsia": [255, 0, 255, 1],
  "gainsboro": [220, 220, 220, 1], "ghostwhite": [248, 248, 255, 1],
  "gold": [255, 215, 0, 1], "goldenrod": [218, 165, 32, 1],
  "gray": [128, 128, 128, 1], "green": [0, 128, 0, 1],
  "greenyellow": [173, 255, 47, 1], "grey": [128, 128, 128, 1],
  "honeydew": [240, 255, 240, 1], "hotpink": [255, 105, 180, 1],
  "indianred": [205, 92, 92, 1], "indigo": [75, 0, 130, 1],
  "ivory": [255, 255, 240, 1], "khaki": [240, 230, 140, 1],
  "lavender": [230, 230, 250, 1], "lavenderblush": [255, 240, 245, 1],
  "lawngreen": [124, 252, 0, 1], "lemonchiffon": [255, 250, 205, 1],
  "lightblue": [173, 216, 230, 1], "lightcoral": [240, 128, 128, 1],
  "lightcyan": [224, 255, 255, 1], "lightgoldenrodyellow": [250, 250, 210, 1],
  "lightgray": [211, 211, 211, 1], "lightgreen": [144, 238, 144, 1],
  "lightgrey": [211, 211, 211, 1], "lightpink": [255, 182, 193, 1],
  "lightsalmon": [255, 160, 122, 1], "lightseagreen": [32, 178, 170, 1],
  "lightskyblue": [135, 206, 250, 1], "lightslategray": [119, 136, 153, 1],
  "lightslategrey": [119, 136, 153, 1], "lightsteelblue": [176, 196, 222, 1],
  "lightyellow": [255, 255, 224, 1], "lime": [0, 255, 0, 1],
  "limegreen": [50, 205, 50, 1], "linen": [250, 240, 230, 1],
  "magenta": [255, 0, 255, 1], "maroon": [128, 0, 0, 1],
  "mediumaquamarine": [102, 205, 170, 1], "mediumblue": [0, 0, 205, 1],
  "mediumorchid": [186, 85, 211, 1], "mediumpurple": [147, 112, 219, 1],
  "mediumseagreen": [60, 179, 113, 1], "mediumslateblue": [123, 104, 238, 1],
  "mediumspringgreen": [0, 250, 154, 1], "mediumturquoise": [72, 209, 204, 1],
  "mediumvioletred": [199, 21, 133, 1], "midnightblue": [25, 25, 112, 1],
  "mintcream": [245, 255, 250, 1], "mistyrose": [255, 228, 225, 1],
  "moccasin": [255, 228, 181, 1], "navajowhite": [255, 222, 173, 1],
  "navy": [0, 0, 128, 1], "oldlace": [253, 245, 230, 1],
  "olive": [128, 128, 0, 1], "olivedrab": [107, 142, 35, 1],
  "orange": [255, 165, 0, 1], "orangered": [255, 69, 0, 1],
  "orchid": [218, 112, 214, 1], "palegoldenrod": [238, 232, 170, 1],
  "palegreen": [152, 251, 152, 1], "paleturquoise": [175, 238, 238, 1],
  "palevioletred": [219, 112, 147, 1], "papayawhip": [255, 239, 213, 1],
  "peachpuff": [255, 218, 185, 1], "peru": [205, 133, 63, 1],
  "pink": [255, 192, 203, 1], "plum": [221, 160, 221, 1],
  "powderblue": [176, 224, 230, 1], "purple": [128, 0, 128, 1],
  "rebeccapurple": [102, 51, 153, 1],
  "red": [255, 0, 0, 1], "rosybrown": [188, 143, 143, 1],
  "royalblue": [65, 105, 225, 1], "saddlebrown": [139, 69, 19, 1],
  "salmon": [250, 128, 114, 1], "sandybrown": [244, 164, 96, 1],
  "seagreen": [46, 139, 87, 1], "seashell": [255, 245, 238, 1],
  "sienna": [160, 82, 45, 1], "silver": [192, 192, 192, 1],
  "skyblue": [135, 206, 235, 1], "slateblue": [106, 90, 205, 1],
  "slategray": [112, 128, 144, 1], "slategrey": [112, 128, 144, 1],
  "snow": [255, 250, 250, 1], "springgreen": [0, 255, 127, 1],
  "steelblue": [70, 130, 180, 1], "tan": [210, 180, 140, 1],
  "teal": [0, 128, 128, 1], "thistle": [216, 191, 216, 1],
  "tomato": [255, 99, 71, 1], "turquoise": [64, 224, 208, 1],
  "violet": [238, 130, 238, 1], "wheat": [245, 222, 179, 1],
  "white": [255, 255, 255, 1], "whitesmoke": [245, 245, 245, 1],
  "yellow": [255, 255, 0, 1], "yellowgreen": [154, 205, 50, 1] };

function clamp_css_byte(i) {
  // Clamp to integer 0 .. 255.
  i = Math.round(i); // Seems to be what Chrome does (vs truncation).
  return i < 0 ? 0 : i > 255 ? 255 : i;
}

function clamp_css_float(f) {
  // Clamp to float 0.0 .. 1.0.
  return f < 0 ? 0 : f > 1 ? 1 : f;
}

function parse_css_int(str) {
  // int or percentage.
  if (str[str.length - 1] === '%') return clamp_css_byte(parseFloat(str) / 100 * 255);
  return clamp_css_byte(parseInt(str));
}

function parse_css_float(str) {
  // float or percentage.
  if (str[str.length - 1] === '%') return clamp_css_float(parseFloat(str) / 100);
  return clamp_css_float(parseFloat(str));
}

function css_hue_to_rgb(m1, m2, h) {
  if (h < 0) h += 1;else if (h > 1) h -= 1;

  if (h * 6 < 1) return m1 + (m2 - m1) * h * 6;
  if (h * 2 < 1) return m2;
  if (h * 3 < 2) return m1 + (m2 - m1) * (2 / 3 - h) * 6;
  return m1;
}

function parseCSSColor(css_str) {
  // Remove all whitespace, not compliant, but should just be more accepting.
  var str = css_str.replace(/ /g, '').toLowerCase();

  // Color keywords (and transparent) lookup.
  if (str in kCSSColorTable) return kCSSColorTable[str].slice(); // dup.

  // #abc and #abc123 syntax.
  if (str[0] === '#') {
    if (str.length === 4) {
      var iv = parseInt(str.substr(1), 16); // TODO(deanm): Stricter parsing.
      if (!(iv >= 0 && iv <= 0xfff)) return null; // Covers NaN.
      return [(iv & 0xf00) >> 4 | (iv & 0xf00) >> 8, iv & 0xf0 | (iv & 0xf0) >> 4, iv & 0xf | (iv & 0xf) << 4, 1];
    } else if (str.length === 7) {
      var iv = parseInt(str.substr(1), 16); // TODO(deanm): Stricter parsing.
      if (!(iv >= 0 && iv <= 0xffffff)) return null; // Covers NaN.
      return [(iv & 0xff0000) >> 16, (iv & 0xff00) >> 8, iv & 0xff, 1];
    }

    return null;
  }

  var op = str.indexOf('('),
      ep = str.indexOf(')');
  if (op !== -1 && ep + 1 === str.length) {
    var fname = str.substr(0, op);
    var params = str.substr(op + 1, ep - (op + 1)).split(',');
    var alpha = 1; // To allow case fallthrough.
    switch (fname) {
      case 'rgba':
        if (params.length !== 4) return null;
        alpha = parse_css_float(params.pop());
      // Fall through.
      case 'rgb':
        if (params.length !== 3) return null;
        return [parse_css_int(params[0]), parse_css_int(params[1]), parse_css_int(params[2]), alpha];
      case 'hsla':
        if (params.length !== 4) return null;
        alpha = parse_css_float(params.pop());
      // Fall through.
      case 'hsl':
        if (params.length !== 3) return null;
        var h = (parseFloat(params[0]) % 360 + 360) % 360 / 360; // 0 .. 1
        // NOTE(deanm): According to the CSS spec s/l should only be
        // percentages, but we don't bother and let float or percentage.
        var s = parse_css_float(params[1]);
        var l = parse_css_float(params[2]);
        var m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
        var m1 = l * 2 - m2;
        return [clamp_css_byte(css_hue_to_rgb(m1, m2, h + 1 / 3) * 255), clamp_css_byte(css_hue_to_rgb(m1, m2, h) * 255), clamp_css_byte(css_hue_to_rgb(m1, m2, h - 1 / 3) * 255), alpha];
      default:
        return null;
    }
  }

  return null;
}

try {
  exports.parseCSSColor = parseCSSColor;
} catch (e) {}

},{}],6:[function(require,module,exports){
'use strict';

module.exports = function (output) {
    for (var i = 1; i < arguments.length; i++) {
        var input = arguments[i];
        for (var k in input) {
            output[k] = input[k];
        }
    }
    return output;
};

},{}],7:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

module.exports = function getType(val) {
    if (val instanceof Number) {
        return 'number';
    } else if (val instanceof String) {
        return 'string';
    } else if (val instanceof Boolean) {
        return 'boolean';
    } else if (Array.isArray(val)) {
        return 'array';
    } else if (val === null) {
        return 'null';
    } else {
        return typeof val === 'undefined' ? 'undefined' : _typeof(val);
    }
};

},{}],8:[function(require,module,exports){
'use strict';

var parseColorString = require('csscolorparser').parseCSSColor;

module.exports = function parseColor(input) {
    if (typeof input === 'string') {
        var rgba = parseColorString(input);
        if (!rgba) {
            return undefined;
        }

        // GL expects all components to be in the range [0, 1] and to be
        // multipled by the alpha value.
        return [rgba[0] / 255 * rgba[3], rgba[1] / 255 * rgba[3], rgba[2] / 255 * rgba[3], rgba[3]];
    } else if (Array.isArray(input)) {
        return input;
    } else {
        return undefined;
    }
};

},{"csscolorparser":5}],9:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

(function webpackUniversalModuleDefinition(root, factory) {
  if ((typeof exports === 'undefined' ? 'undefined' : _typeof(exports)) === 'object' && (typeof module === 'undefined' ? 'undefined' : _typeof(module)) === 'object') module.exports = factory(require("rbush"));else if (typeof define === 'function' && define.amd) define(["rbush"], factory);else if ((typeof exports === 'undefined' ? 'undefined' : _typeof(exports)) === 'object') exports["labelgun"] = factory(require("rbush"));else root["labelgun"] = factory(root["rbush"]);
})(undefined, function (__WEBPACK_EXTERNAL_MODULE_0__) {
  return (/******/function (modules) {
      // webpackBootstrap
      /******/ // The module cache
      /******/var installedModules = {};

      /******/ // The require function
      /******/function __webpack_require__(moduleId) {

        /******/ // Check if module is in cache
        /******/if (installedModules[moduleId])
          /******/return installedModules[moduleId].exports;

        /******/ // Create a new module (and put it into the cache)
        /******/var module = installedModules[moduleId] = {
          /******/i: moduleId,
          /******/l: false,
          /******/exports: {}
          /******/ };

        /******/ // Execute the module function
        /******/modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

        /******/ // Flag the module as loaded
        /******/module.l = true;

        /******/ // Return the exports of the module
        /******/return module.exports;
        /******/
      }

      /******/ // expose the modules object (__webpack_modules__)
      /******/__webpack_require__.m = modules;

      /******/ // expose the module cache
      /******/__webpack_require__.c = installedModules;

      /******/ // identity function for calling harmony imports with the correct context
      /******/__webpack_require__.i = function (value) {
        return value;
      };

      /******/ // define getter function for harmony exports
      /******/__webpack_require__.d = function (exports, name, getter) {
        /******/if (!__webpack_require__.o(exports, name)) {
          /******/Object.defineProperty(exports, name, {
            /******/configurable: false,
            /******/enumerable: true,
            /******/get: getter
            /******/ });
          /******/
        }
        /******/
      };

      /******/ // getDefaultExport function for compatibility with non-harmony modules
      /******/__webpack_require__.n = function (module) {
        /******/var getter = module && module.__esModule ?
        /******/function getDefault() {
          return module['default'];
        } :
        /******/function getModuleExports() {
          return module;
        };
        /******/__webpack_require__.d(getter, 'a', getter);
        /******/return getter;
        /******/
      };

      /******/ // Object.prototype.hasOwnProperty.call
      /******/__webpack_require__.o = function (object, property) {
        return Object.prototype.hasOwnProperty.call(object, property);
      };

      /******/ // __webpack_public_path__
      /******/__webpack_require__.p = "";

      /******/ // Load entry module and return exports
      /******/return __webpack_require__(__webpack_require__.s = 1);
      /******/
    }(
    /************************************************************************/
    /******/[
    /* 0 */
    /***/function (module, exports) {

      module.exports = __WEBPACK_EXTERNAL_MODULE_0__;

      /***/
    },
    /* 1 */
    /***/function (module, exports, __webpack_require__) {

      "use strict";
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });

      var _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
          }
        }return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
        };
      }();

      var _rbush = __webpack_require__(0);

      var _rbush2 = _interopRequireDefault(_rbush);

      function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      }

      function _toConsumableArray(arr) {
        if (Array.isArray(arr)) {
          for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
            arr2[i] = arr[i];
          }return arr2;
        } else {
          return Array.from(arr);
        }
      }

      function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
          throw new TypeError("Cannot call a class as a function");
        }
      }

      var labelgun = function () {
        function labelgun(hideLabel, showLabel) {
          _classCallCheck(this, labelgun);

          this.tree = (0, _rbush2.default)(6);
          this.allLabels = {};
          this._point = undefined;
          this.hasChanged = new Set();
          this.loaded = false;
          this.allChanged = false;
          this.hideLabel = hideLabel;
          this.showLabel = showLabel;

          var self = this;
        }

        /**
        * @name _total
        * @summary get the total hidden or shown labels in the tree
        * @param {string} state whether to return 'hide' or 'show' state label totals
        * @returns {number} total number of labels of taht state
        */

        _createClass(labelgun, [{
          key: "_total",
          value: function _total(state) {
            var total = 0;
            for (var keys in this.allLabels) {
              if (this.allLabels[keys].state == state) {
                total += 1;
              }
            }
            return total;
          }

          /**
           * @name totalShown
           * @summary return the total number of shown labels
           * @returns {number}
           */

        }, {
          key: "totalShown",
          value: function totalShown() {
            return this._total("show");
          }

          /**
           * @name totalHidden
           * @summary return the total number of hidden labels
           * @returns {number}
           */

        }, {
          key: "totalHidden",
          value: function totalHidden() {
            return this._total("hide");
          }

          /**
          * @name getLabelsByState
          * @summary provided a state get all labels of that state
          * @returns {array}
          * @private
          */

        }, {
          key: "_getLabelsByState",
          value: function _getLabelsByState(state) {
            var labels = [];
            for (var keys in this.allLabels) {
              if (this.allLabels[keys].state == state) {
                labels.push(this.allLabels[keys]);
              }
            }
            return labels;
          }

          /**
          * @name getHidden
          * @summary Return
          * @returns {array}
          */

        }, {
          key: "getHidden",
          value: function getHidden() {
            return this._getLabelsByState("hide");
          }

          /**
           * @name getShown
           * @summary Return an array of all shown labels
           * @returns {array}
           */

        }, {
          key: "getShown",
          value: function getShown() {
            return this._getLabelsByState("show");
          }

          /**
           * @name getCollisions
           * @summary Return a set of collisions (hidden and shown) for a given label
           * @param {string} id the ID of the label to get
           * @returns {array}
           */

        }, {
          key: "getCollisions",
          value: function getCollisions(id) {
            var label = this.allLabels[id];
            var collisions = this.tree.search(label);
            var self = collisions.indexOf(label);
            if (self !== undefined) collisions.splice(self, 1);
            return collisions;
          }

          /**
           * @name getLabel
           * @summary Convience function to return a label by ID
           * @param {string} id the ID of the label to get
           * @returns {object}
           */

        }, {
          key: "getLabel",
          value: function getLabel(id) {
            return this.allLabels[id];
          }

          /**
           * @name destroy
           */

        }, {
          key: "destroy",
          value: function destroy() {
            this._resetTree();
            this.allLabels = {};
          }

          /**
           * @name forceLabelStates
           * @summary Allows you to set a state for all current labels
           * @param {string} forceState the class of which to change the label to
           * @returns {undefined}
           */

        }, {
          key: "forceLabelStates",
          value: function forceLabelStates(forceState) {
            var _this = this;

            this.tree.all().forEach(function (label) {
              _this._labelHasChangedState(label, forceState);
            });
          }

          /**
           * @name _labelHasChangedState
           * @summary Sets the class for a particular label
           * @param {string} label the label to update
           * @param {string} forceState the class of which to change the label to
           * @returns {undefined}
           * @private
           */

        }, {
          key: "_labelHasChangedState",
          value: function _labelHasChangedState(label, forceState) {
            var state = forceState || label.state;
            if (state === "show") this.showLabel(label);
            if (state === "hide") this.hideLabel(label);
          }

          /**
           * @name _setupLabelStates
           * @summary Clears current tree and readds all stations
           * @returns {undefined}
           */

        }, {
          key: "setupLabelStates",
          value: function setupLabelStates() {
            var _this2 = this;

            if (this.allChanged) {
              this.allChanged = false;
              this.hasChanged.clear();
              this._resetTree();

              for (var id in this.allLabels) {

                var label = this.allLabels[id];

                this.ingestLabel({
                  bottomLeft: [label.minX, label.minY],
                  topRight: [label.maxX, label.maxY]
                }, label.id, label.weight, label.labelObject, label.name, label.isDragged);
              }
            } else if (this.hasChanged.size) {
              var changed = [].concat(_toConsumableArray(this.hasChanged));
              this.hasChanged.clear();
              changed.forEach(function (id) {

                var label = _this2.allLabels[id];

                _this2.ingestLabel({
                  bottomLeft: [label.minX, label.minY],
                  topRight: [label.maxX, label.maxY]
                }, label._id, label.weight, label.labelObject, label.name, label.isDragged);
              });
            }
          }

          /**
           * @name _resetTree
           * @summary Clears current tree and redraws projection overlay
           * @returns {undefined}
           */

        }, {
          key: "update",
          value: function update() {

            this.allChanged = true;
            this.setupLabelStates();
            this.handleExCollisions();
            this._hideShownCollisions(); // HACK ALERT: why is this necessary ? :(
            this.forceLabelStates();
          }
        }, {
          key: "handleExCollisions",
          value: function handleExCollisions() {
            var _this3 = this;

            this.getHidden().forEach(function (hidden) {
              _this3._handleExCollisions(hidden);
            });
          }

          /**
           * @name _resetTree
           * @summary Clears current tree and redraws projection overlay
           * @returns {undefined}
           * @private
           */

        }, {
          key: "_resetTree",
          value: function _resetTree() {
            this.tree.clear();
          }

          /**
           * @name _makeLabel
           * @param {object} boundingBox
           * @param {string} id
           * @param {number} weight
           * @param {string} labelName
           * @param {boolean} isDragged
           * @summary Creates a standard label object with a default state
           * @returns {object}
           * @private
           */

        }, {
          key: "_makeLabel",
          value: function _makeLabel(boundingBox, id, weight, labelObject, labelName, isDragged) {
            return {
              minX: boundingBox.bottomLeft[0],
              minY: boundingBox.bottomLeft[1],
              maxX: boundingBox.topRight[0],
              maxY: boundingBox.topRight[1],
              state: "hide",
              id: id,
              weight: weight || 1,
              labelObject: labelObject,
              labelName: labelName,
              isDragged: isDragged
            };
          }

          /**
           * @name _removeFromTree
           * @param {object} label
           * @param {boolean} forceUpdate if true, triggers all labels to be updated
           * @summary Removes label from tree
           * @returns {undefined}
           * @private
           */

        }, {
          key: "removeFromTree",
          value: function removeFromTree(label, forceUpdate) {
            var id = label.id || label;
            var removelLabel = this.allLabels[id];
            this.tree.remove(removelLabel);
            delete this.allLabels[id];
            if (forceUpdate) this.forceLabelStates(true);
          }

          /**
           * @name _addToTree
           * @param {object} label
           * @summary inserts label into tree
           * @returns {undefined}
           * @private
           */

        }, {
          key: "_addToTree",
          value: function _addToTree(label) {
            this.allLabels[label.id] = label;
            this.tree.insert(label);
          }
        }, {
          key: "_hideShownCollisions",
          value: function _hideShownCollisions() {
            var _this4 = this;

            // This method shouldn't have to exist...
            this.getShown().forEach(function (label) {
              _this4.getCollisions(label.id).forEach(function (collision) {
                if (collision.state == "show") {
                  collision.state = "hide";
                }
              });
            });
          }

          /**
           * @name _handleCollisions
           * @param {array} collisions array of labels that have unresolved collisions
           * @param {object} label label to handle collisions for
           * @param {boolean} isDragged if label is currently being dragged
           * @summary Weighted collisions resolution for labels
           * @returns {undefined}
           * @private
           */

        }, {
          key: "_handleCollisions",
          value: function _handleCollisions(collisions, label, isDragged) {
            var originalWeight = void 0;
            if (label.isDragged) label.weight = Infinity;
            var highest = label;

            collisions.forEach(function (collision) {

              if (collision.isDragged) {
                originalWeight = collision.weight;
                highest = collision;
                highest.weight = Infinity;
              }

              if (collision.weight > highest.weight) {
                highest.state = "hide";
                highest = collision;
              } else {
                collision.state = "hide";
              }
            });

            highest.state = "show";
            if (originalWeight) highest.weight = originalWeight;
          }

          /**
           * @name _handleExCollisions
           * @param {object} hidden hidden label
           * @summary Checks to see if a previously hidden/collided label is now able to be shown and then shows
           * @returns {undefined}
           * @private
           */

        }, {
          key: "_handleExCollisions",
          value: function _handleExCollisions(hidden) {

            if (hidden.state === "hide") {
              var stillCollides = false;
              var hiddenLabels = this.tree.search(hidden);
              for (var i = 0; i < hiddenLabels.length; i++) {
                if (hiddenLabels[i].state !== "hide") {
                  stillCollides = true;
                  break;
                }
              }
              if (!stillCollides) {
                hidden.state = "show";
              }
            }
          }

          /**
           * @name _ingestLabel
           * @param {object} boundingBox
           * @param {string} id
           * @param {number} weight
           * @param {object} gmLabel
           * @param {string} labelName
           * @param {boolean} isDragged
           * @summary Creates a label if it does not already exsist, then adds it to the tree, and renders it based on whether it can be shown
           * @returns {object}
           */

        }, {
          key: "ingestLabel",
          value: function ingestLabel(boundingBox, id, weight, labelObject, labelName, isDragged) {
            var label = this._makeLabel(boundingBox, id, weight, labelObject, labelName, isDragged);
            var oldLabel = this.allLabels[id];
            if (oldLabel) this.removeFromTree(oldLabel);
            this._addToTree(label);
            var collisions = this.getCollisions(id);
            if (!collisions.length || isDragged) {
              label.state = "show";
              return;
            }

            this._handleCollisions(collisions, label, isDragged);
          }

          /**
           * @name labelHasChanged
           * @summary let labelgun know the label has changed
           * @returns {undefined}
           */

        }, {
          key: "labelHasChanged",
          value: function labelHasChanged(id) {
            this.hasChanged.add(id);
          }
        }]);

        return labelgun;
      }();

      exports.default = labelgun;

      /***/
    }
    /******/])
  );
});

},{"rbush":12}],10:[function(require,module,exports){
'use strict';

var fontWeights = {
  thin: 100,
  hairline: 100,
  'ultra-light': 100,
  'extra-light': 100,
  light: 200,
  book: 300,
  regular: 400,
  normal: 400,
  plain: 400,
  roman: 400,
  standard: 400,
  medium: 500,
  'semi-bold': 600,
  'demi-bold': 600,
  bold: 700,
  heavy: 800,
  black: 800,
  'extra-bold': 800,
  'ultra-black': 900,
  'extra-black': 900,
  'ultra-bold': 900,
  'heavy-black': 900,
  fat: 900,
  poster: 900
};
var sp = ' ';

var fontCache = {};

module.exports = function (font, size) {
  var cssData = fontCache[font];
  if (!cssData) {
    var parts = font.split(' ');
    var maybeWeight = parts[parts.length - 1].toLowerCase();
    var weight = 'normal';
    var style = 'normal';
    if (maybeWeight == 'normal' || maybeWeight == 'italic' || maybeWeight == 'oblique') {
      style = maybeWeight;
      parts.pop();
      maybeWeight = parts[parts.length - 1].toLowerCase();
    }
    for (var w in fontWeights) {
      if (maybeWeight == w || maybeWeight == w.replace('-', '') || maybeWeight == w.replace('-', ' ')) {
        weight = fontWeights[w];
        parts.pop();
        break;
      }
    }
    if (typeof maybeWeight == 'number') {
      weight = maybeWeight;
    }
    var fontFamily = parts.join(' ');
    // CSS font property: font-style font-weight font-size font-family
    cssData = fontCache[font] = [style, weight, fontFamily];
  }
  return cssData[0] + sp + cssData[1] + sp + size + 'px' + sp + cssData[2];
};

},{}],11:[function(require,module,exports){
'use strict';

module.exports = partialSort;

// Floyd-Rivest selection algorithm:
// Rearrange items so that all items in the [left, k] range are smaller than all items in (k, right];
// The k-th element will have the (k - left + 1)th smallest value in [left, right]

function partialSort(arr, k, left, right, compare) {
    left = left || 0;
    right = right || arr.length - 1;
    compare = compare || defaultCompare;

    while (right > left) {
        if (right - left > 600) {
            var n = right - left + 1;
            var m = k - left + 1;
            var z = Math.log(n);
            var s = 0.5 * Math.exp(2 * z / 3);
            var sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * (m - n / 2 < 0 ? -1 : 1);
            var newLeft = Math.max(left, Math.floor(k - m * s / n + sd));
            var newRight = Math.min(right, Math.floor(k + (n - m) * s / n + sd));
            partialSort(arr, k, newLeft, newRight, compare);
        }

        var t = arr[k];
        var i = left;
        var j = right;

        swap(arr, left, k);
        if (compare(arr[right], t) > 0) swap(arr, left, right);

        while (i < j) {
            swap(arr, i, j);
            i++;
            j--;
            while (compare(arr[i], t) < 0) {
                i++;
            }while (compare(arr[j], t) > 0) {
                j--;
            }
        }

        if (compare(arr[left], t) === 0) swap(arr, left, j);else {
            j++;
            swap(arr, j, right);
        }

        if (j <= k) left = j + 1;
        if (k <= j) right = j - 1;
    }
}

function swap(arr, i, j) {
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
}

function defaultCompare(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

},{}],12:[function(require,module,exports){
'use strict';

module.exports = rbush;

var quickselect = require('quickselect');

function rbush(maxEntries, format) {
    if (!(this instanceof rbush)) return new rbush(maxEntries, format);

    // max entries in a node is 9 by default; min node fill is 40% for best performance
    this._maxEntries = Math.max(4, maxEntries || 9);
    this._minEntries = Math.max(2, Math.ceil(this._maxEntries * 0.4));

    if (format) {
        this._initFormat(format);
    }

    this.clear();
}

rbush.prototype = {

    all: function all() {
        return this._all(this.data, []);
    },

    search: function search(bbox) {

        var node = this.data,
            result = [],
            toBBox = this.toBBox;

        if (!intersects(bbox, node)) return result;

        var nodesToSearch = [],
            i,
            len,
            child,
            childBBox;

        while (node) {
            for (i = 0, len = node.children.length; i < len; i++) {

                child = node.children[i];
                childBBox = node.leaf ? toBBox(child) : child;

                if (intersects(bbox, childBBox)) {
                    if (node.leaf) result.push(child);else if (contains(bbox, childBBox)) this._all(child, result);else nodesToSearch.push(child);
                }
            }
            node = nodesToSearch.pop();
        }

        return result;
    },

    collides: function collides(bbox) {

        var node = this.data,
            toBBox = this.toBBox;

        if (!intersects(bbox, node)) return false;

        var nodesToSearch = [],
            i,
            len,
            child,
            childBBox;

        while (node) {
            for (i = 0, len = node.children.length; i < len; i++) {

                child = node.children[i];
                childBBox = node.leaf ? toBBox(child) : child;

                if (intersects(bbox, childBBox)) {
                    if (node.leaf || contains(bbox, childBBox)) return true;
                    nodesToSearch.push(child);
                }
            }
            node = nodesToSearch.pop();
        }

        return false;
    },

    load: function load(data) {
        if (!(data && data.length)) return this;

        if (data.length < this._minEntries) {
            for (var i = 0, len = data.length; i < len; i++) {
                this.insert(data[i]);
            }
            return this;
        }

        // recursively build the tree with the given data from stratch using OMT algorithm
        var node = this._build(data.slice(), 0, data.length - 1, 0);

        if (!this.data.children.length) {
            // save as is if tree is empty
            this.data = node;
        } else if (this.data.height === node.height) {
            // split root if trees have the same height
            this._splitRoot(this.data, node);
        } else {
            if (this.data.height < node.height) {
                // swap trees if inserted one is bigger
                var tmpNode = this.data;
                this.data = node;
                node = tmpNode;
            }

            // insert the small tree into the large tree at appropriate level
            this._insert(node, this.data.height - node.height - 1, true);
        }

        return this;
    },

    insert: function insert(item) {
        if (item) this._insert(item, this.data.height - 1);
        return this;
    },

    clear: function clear() {
        this.data = createNode([]);
        return this;
    },

    remove: function remove(item, equalsFn) {
        if (!item) return this;

        var node = this.data,
            bbox = this.toBBox(item),
            path = [],
            indexes = [],
            i,
            parent,
            index,
            goingUp;

        // depth-first iterative tree traversal
        while (node || path.length) {

            if (!node) {
                // go up
                node = path.pop();
                parent = path[path.length - 1];
                i = indexes.pop();
                goingUp = true;
            }

            if (node.leaf) {
                // check current node
                index = findItem(item, node.children, equalsFn);

                if (index !== -1) {
                    // item found, remove the item and condense tree upwards
                    node.children.splice(index, 1);
                    path.push(node);
                    this._condense(path);
                    return this;
                }
            }

            if (!goingUp && !node.leaf && contains(node, bbox)) {
                // go down
                path.push(node);
                indexes.push(i);
                i = 0;
                parent = node;
                node = node.children[0];
            } else if (parent) {
                // go right
                i++;
                node = parent.children[i];
                goingUp = false;
            } else node = null; // nothing found
        }

        return this;
    },

    toBBox: function toBBox(item) {
        return item;
    },

    compareMinX: compareNodeMinX,
    compareMinY: compareNodeMinY,

    toJSON: function toJSON() {
        return this.data;
    },

    fromJSON: function fromJSON(data) {
        this.data = data;
        return this;
    },

    _all: function _all(node, result) {
        var nodesToSearch = [];
        while (node) {
            if (node.leaf) result.push.apply(result, node.children);else nodesToSearch.push.apply(nodesToSearch, node.children);

            node = nodesToSearch.pop();
        }
        return result;
    },

    _build: function _build(items, left, right, height) {

        var N = right - left + 1,
            M = this._maxEntries,
            node;

        if (N <= M) {
            // reached leaf level; return leaf
            node = createNode(items.slice(left, right + 1));
            calcBBox(node, this.toBBox);
            return node;
        }

        if (!height) {
            // target height of the bulk-loaded tree
            height = Math.ceil(Math.log(N) / Math.log(M));

            // target number of root entries to maximize storage utilization
            M = Math.ceil(N / Math.pow(M, height - 1));
        }

        node = createNode([]);
        node.leaf = false;
        node.height = height;

        // split the items into M mostly square tiles

        var N2 = Math.ceil(N / M),
            N1 = N2 * Math.ceil(Math.sqrt(M)),
            i,
            j,
            right2,
            right3;

        multiSelect(items, left, right, N1, this.compareMinX);

        for (i = left; i <= right; i += N1) {

            right2 = Math.min(i + N1 - 1, right);

            multiSelect(items, i, right2, N2, this.compareMinY);

            for (j = i; j <= right2; j += N2) {

                right3 = Math.min(j + N2 - 1, right2);

                // pack each entry recursively
                node.children.push(this._build(items, j, right3, height - 1));
            }
        }

        calcBBox(node, this.toBBox);

        return node;
    },

    _chooseSubtree: function _chooseSubtree(bbox, node, level, path) {

        var i, len, child, targetNode, area, enlargement, minArea, minEnlargement;

        while (true) {
            path.push(node);

            if (node.leaf || path.length - 1 === level) break;

            minArea = minEnlargement = Infinity;

            for (i = 0, len = node.children.length; i < len; i++) {
                child = node.children[i];
                area = bboxArea(child);
                enlargement = enlargedArea(bbox, child) - area;

                // choose entry with the least area enlargement
                if (enlargement < minEnlargement) {
                    minEnlargement = enlargement;
                    minArea = area < minArea ? area : minArea;
                    targetNode = child;
                } else if (enlargement === minEnlargement) {
                    // otherwise choose one with the smallest area
                    if (area < minArea) {
                        minArea = area;
                        targetNode = child;
                    }
                }
            }

            node = targetNode || node.children[0];
        }

        return node;
    },

    _insert: function _insert(item, level, isNode) {

        var toBBox = this.toBBox,
            bbox = isNode ? item : toBBox(item),
            insertPath = [];

        // find the best node for accommodating the item, saving all nodes along the path too
        var node = this._chooseSubtree(bbox, this.data, level, insertPath);

        // put the item into the node
        node.children.push(item);
        extend(node, bbox);

        // split on node overflow; propagate upwards if necessary
        while (level >= 0) {
            if (insertPath[level].children.length > this._maxEntries) {
                this._split(insertPath, level);
                level--;
            } else break;
        }

        // adjust bboxes along the insertion path
        this._adjustParentBBoxes(bbox, insertPath, level);
    },

    // split overflowed node into two
    _split: function _split(insertPath, level) {

        var node = insertPath[level],
            M = node.children.length,
            m = this._minEntries;

        this._chooseSplitAxis(node, m, M);

        var splitIndex = this._chooseSplitIndex(node, m, M);

        var newNode = createNode(node.children.splice(splitIndex, node.children.length - splitIndex));
        newNode.height = node.height;
        newNode.leaf = node.leaf;

        calcBBox(node, this.toBBox);
        calcBBox(newNode, this.toBBox);

        if (level) insertPath[level - 1].children.push(newNode);else this._splitRoot(node, newNode);
    },

    _splitRoot: function _splitRoot(node, newNode) {
        // split root node
        this.data = createNode([node, newNode]);
        this.data.height = node.height + 1;
        this.data.leaf = false;
        calcBBox(this.data, this.toBBox);
    },

    _chooseSplitIndex: function _chooseSplitIndex(node, m, M) {

        var i, bbox1, bbox2, overlap, area, minOverlap, minArea, index;

        minOverlap = minArea = Infinity;

        for (i = m; i <= M - m; i++) {
            bbox1 = distBBox(node, 0, i, this.toBBox);
            bbox2 = distBBox(node, i, M, this.toBBox);

            overlap = intersectionArea(bbox1, bbox2);
            area = bboxArea(bbox1) + bboxArea(bbox2);

            // choose distribution with minimum overlap
            if (overlap < minOverlap) {
                minOverlap = overlap;
                index = i;

                minArea = area < minArea ? area : minArea;
            } else if (overlap === minOverlap) {
                // otherwise choose distribution with minimum area
                if (area < minArea) {
                    minArea = area;
                    index = i;
                }
            }
        }

        return index;
    },

    // sorts node children by the best axis for split
    _chooseSplitAxis: function _chooseSplitAxis(node, m, M) {

        var compareMinX = node.leaf ? this.compareMinX : compareNodeMinX,
            compareMinY = node.leaf ? this.compareMinY : compareNodeMinY,
            xMargin = this._allDistMargin(node, m, M, compareMinX),
            yMargin = this._allDistMargin(node, m, M, compareMinY);

        // if total distributions margin value is minimal for x, sort by minX,
        // otherwise it's already sorted by minY
        if (xMargin < yMargin) node.children.sort(compareMinX);
    },

    // total margin of all possible split distributions where each node is at least m full
    _allDistMargin: function _allDistMargin(node, m, M, compare) {

        node.children.sort(compare);

        var toBBox = this.toBBox,
            leftBBox = distBBox(node, 0, m, toBBox),
            rightBBox = distBBox(node, M - m, M, toBBox),
            margin = bboxMargin(leftBBox) + bboxMargin(rightBBox),
            i,
            child;

        for (i = m; i < M - m; i++) {
            child = node.children[i];
            extend(leftBBox, node.leaf ? toBBox(child) : child);
            margin += bboxMargin(leftBBox);
        }

        for (i = M - m - 1; i >= m; i--) {
            child = node.children[i];
            extend(rightBBox, node.leaf ? toBBox(child) : child);
            margin += bboxMargin(rightBBox);
        }

        return margin;
    },

    _adjustParentBBoxes: function _adjustParentBBoxes(bbox, path, level) {
        // adjust bboxes along the given tree path
        for (var i = level; i >= 0; i--) {
            extend(path[i], bbox);
        }
    },

    _condense: function _condense(path) {
        // go through the path, removing empty nodes and updating bboxes
        for (var i = path.length - 1, siblings; i >= 0; i--) {
            if (path[i].children.length === 0) {
                if (i > 0) {
                    siblings = path[i - 1].children;
                    siblings.splice(siblings.indexOf(path[i]), 1);
                } else this.clear();
            } else calcBBox(path[i], this.toBBox);
        }
    },

    _initFormat: function _initFormat(format) {
        // data format (minX, minY, maxX, maxY accessors)

        // uses eval-type function compilation instead of just accepting a toBBox function
        // because the algorithms are very sensitive to sorting functions performance,
        // so they should be dead simple and without inner calls

        var compareArr = ['return a', ' - b', ';'];

        this.compareMinX = new Function('a', 'b', compareArr.join(format[0]));
        this.compareMinY = new Function('a', 'b', compareArr.join(format[1]));

        this.toBBox = new Function('a', 'return {minX: a' + format[0] + ', minY: a' + format[1] + ', maxX: a' + format[2] + ', maxY: a' + format[3] + '};');
    }
};

function findItem(item, items, equalsFn) {
    if (!equalsFn) return items.indexOf(item);

    for (var i = 0; i < items.length; i++) {
        if (equalsFn(item, items[i])) return i;
    }
    return -1;
}

// calculate node's bbox from bboxes of its children
function calcBBox(node, toBBox) {
    distBBox(node, 0, node.children.length, toBBox, node);
}

// min bounding rectangle of node children from k to p-1
function distBBox(node, k, p, toBBox, destNode) {
    if (!destNode) destNode = createNode(null);
    destNode.minX = Infinity;
    destNode.minY = Infinity;
    destNode.maxX = -Infinity;
    destNode.maxY = -Infinity;

    for (var i = k, child; i < p; i++) {
        child = node.children[i];
        extend(destNode, node.leaf ? toBBox(child) : child);
    }

    return destNode;
}

function extend(a, b) {
    a.minX = Math.min(a.minX, b.minX);
    a.minY = Math.min(a.minY, b.minY);
    a.maxX = Math.max(a.maxX, b.maxX);
    a.maxY = Math.max(a.maxY, b.maxY);
    return a;
}

function compareNodeMinX(a, b) {
    return a.minX - b.minX;
}
function compareNodeMinY(a, b) {
    return a.minY - b.minY;
}

function bboxArea(a) {
    return (a.maxX - a.minX) * (a.maxY - a.minY);
}
function bboxMargin(a) {
    return a.maxX - a.minX + (a.maxY - a.minY);
}

function enlargedArea(a, b) {
    return (Math.max(b.maxX, a.maxX) - Math.min(b.minX, a.minX)) * (Math.max(b.maxY, a.maxY) - Math.min(b.minY, a.minY));
}

function intersectionArea(a, b) {
    var minX = Math.max(a.minX, b.minX),
        minY = Math.max(a.minY, b.minY),
        maxX = Math.min(a.maxX, b.maxX),
        maxY = Math.min(a.maxY, b.maxY);

    return Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
}

function contains(a, b) {
    return a.minX <= b.minX && a.minY <= b.minY && b.maxX <= a.maxX && b.maxY <= a.maxY;
}

function intersects(a, b) {
    return b.minX <= a.maxX && b.minY <= a.maxY && b.maxX >= a.minX && b.maxY >= a.minY;
}

function createNode(children) {
    return {
        children: children,
        height: 1,
        leaf: true,
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity
    };
}

// sort an array so that items come in groups of n unsorted items, with groups sorted between each other;
// combines selection algorithm with binary divide & conquer approach

function multiSelect(arr, left, right, n, compare) {
    var stack = [left, right],
        mid;

    while (stack.length) {
        right = stack.pop();
        left = stack.pop();

        if (right - left <= n) continue;

        mid = left + Math.ceil((right - left) / n / 2) * n;
        quickselect(arr, mid, left, right, compare);

        stack.push(left, mid, mid, right);
    }
}

},{"quickselect":11}]},{},[1]);
var _r=_m(1);_g.mb2olstyle=_r;return _r;})})(typeof window!=='undefined'?window:(typeof global!=='undefined'?global:(typeof self!=='undefined'?self:this)));mb2olstyle=mb2olstyle.default
