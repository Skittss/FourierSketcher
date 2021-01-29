var startDrawingFunc;

var s1 = function(s) 
{
  var divId = "sketch"
  var div;
  var active = true;
  var drawingBounds = new Complex(1,1);

  var points;
  var t = 0;
  var interpMult = 1;
  var drawnPoints = [];
  var complexitySlider;
  var complexityTag;
  var computeButton;
  var interpolationSlider;
  var canvasExtensionSlider;
  var pointSizeSlider;
  var sinusoidOpacitySlider;
  var sinusoidCullSlider;
  var vectors = [];
  var drawableVectors = [];

  var backgroundColor = s.color('rgba(200,200,200,1)');
  var sinusoidLayer;
  var pointsLayer;
  var pointSize;
  var sAlpha; // in case value is costly, not sure.
  var layersDimensions;
  var layersMidPoint;

  s.setup = function()
  {
    startDrawingFunc = startDrawing;

    div = document.getElementById(divId);
    div.hidden = true;
    s.createCanvas(drawingBounds.re, drawingBounds.im).parent(divId);

    complexitySlider = document.getElementById("fourierAccuracy");
    complexitySlider.onchange = changeComplexity;

    complexityTag = s.createP(`Current complexity (# of coefficients): ${1}`).parent(divId);
    complexityTag.position(10,20);

    computeButton = document.getElementById("computeFourier");
    computeButton.onclick = loadImagePoints;

    interpolationSlider = document.getElementById("interpolationAmount");
    interpolationSlider.onchange = changeInterpMultiplier;

    canvasExtensionSlider = document.getElementById("canvasExtension");
    canvasExtensionSlider.onchange = updateCanvasSize;

    pointSizeSlider = document.getElementById("pointSize");
    pointSizeSlider.onchange = changePointSize;

    sinusoidOpacitySlider = document.getElementById("sinusoidOpacity");
    sinusoidOpacitySlider.onchange = setSinusoidAlpha;

    sinusoidCullSlider = document.getElementById("magnitudeCullAmount");

    changeInterpMultiplier(false);
    changePointSize(false);
    
    loadDefaultPoints();

  };

  s.draw = function()
  {
    if (active)
    {
      s.noFill();
      s.background(backgroundColor);
      doFourierDrawing(t);
      drawLayers();

      t += s.TWO_PI/(interpMult*(points.length));
    }
  };

  function startDrawing()
  {
    console.log("begun")
    div.hidden = false;
    drawingBounds = this.imgSize;
    active = true;
    updateCanvasSize();
  }


  function createLayers(width, height)
  {
    sinusoidLayer = s.createGraphics(width,height);
    sinusoidLayer.noFill();
    setSinusoidAlpha();
    pointsLayer = s.createGraphics(width,height);
    pointsLayer.stroke('red');
    pointsLayer.noFill();
    layersDimensions = new Complex(width, height);
    layersMidPoint = layersDimensions.mult(new Complex(0.5, 0));
    console.log(`Created layers of dimensions: ${width}, ${height}`)
    console.log(`Check 1: ${sinusoidLayer.width}, ${sinusoidLayer.height}`);
    console.log(`Midpoint: ${layersMidPoint.re}, ${layersMidPoint.im}`)
  }

  function colourLerp(overlay, background, alpha)
  {
    return parseInt(alpha * overlay + (1 - alpha) * background);
  }

  function setSinusoidAlpha()
  {
    // Calculate a colour lerp here to avoid having to tint() each frame.
    sAlpha = sinusoidOpacitySlider.value;
    var overlay = 0;
    var blend = 
    {
      r: colourLerp(overlay, s.red(backgroundColor), sAlpha),
      g: colourLerp(overlay, s.green(backgroundColor), sAlpha),
      b: colourLerp(overlay, s.blue(backgroundColor), sAlpha)
    }
    sinusoidLayer.stroke(`rgba(${blend.r},${blend.g},${blend.b},0.6)`);
  }

  function resetLayers()
  {
    sinusoidLayer.clear();
    pointsLayer.clear();
  }

  function drawLayers()
  {
    s.image(sinusoidLayer, 0, 0, layersDimensions.re, layersDimensions.im);
    sinusoidLayer.clear();
    s.image(pointsLayer, 0, 0, layersDimensions.re, layersDimensions.im);
  }

  function doFourierDrawing(t, drawSinusoids = sAlpha > 0)
  {
    // Begin drawing in the middle of the screen
    let origin = layersMidPoint;
    // Sort by magnitude
    for (let i = 0; i < drawableVectors.length; i++) 
    {
      let current = drawableVectors[i];
      let f = current.f;
      let m = current.complex.mag();
      let p = s.atan2(current.complex.im, current.complex.re);
      let transform = new Complex(m * s.cos(f * t + p), m * s.sin(f * t + p))
      let next = origin.add(transform);

      if (drawSinusoids) drawSinusoid(origin, next, m);
      
      origin = next;
    }
    // Origin is now the resulting location
    // Only draw points on the first pass (as the series is periodic)

    // Practically 0 effect on performance
    if (t < s.TWO_PI) 
    {
      drawFourierPt(origin, pointSize);
    }
  }

  function drawSinusoid(origin, next, magnitude, layer = sinusoidLayer)
  {
    if (magnitude > sinusoidCullSlider.value)
    {
      layer.ellipse(origin.re, origin.im, magnitude * 2);
      layer.line(origin.re, origin.im, next.re, next.im);
    }
  }

  function drawFourierPt(origin, size = 2, layer = pointsLayer)
  {
    layer.ellipse(origin.re, origin.im, size);
  }

  function resetDrawing()
  {
    t = 0;
    drawnPoints = [];
    resetLayers();
  }

  function changeInterpMultiplier(doDrawingReset = true)
  {
    if (doDrawingReset) resetDrawing();
    interpMult = parseInt(interpolationSlider.value) + 1;
  }

  function changePointSize(doDrawingReset = true)
  {
    if (doDrawingReset) resetDrawing();
    pointSize = pointSizeSlider.value
  }

  function FourierOutput(complex, f)
  {
    this.complex = complex;
    this.f = f;
  }

  function updateCanvasSize()
  {
    let canvasBounds = drawingBounds.mult(new Complex(1 + parseFloat(canvasExtensionSlider.value), 0))
    s.resizeCanvas(canvasBounds.re, canvasBounds.im);
    createLayers(s.width, s.height);
    div.style.width = `${s.width}px`;
    div.style.height = `${s.height}px`;

    resetDrawing();
  }

  s.windowResized = function()
  {

  }

  function loadDefaultPoints()
  {
    //let pts = [new Complex(400,0), new Complex(0,200), new Complex(0,0), new Complex(-100,0), new Complex(0,0), new Complex(0, -200), new Complex(0,0)];
    let pts = [new Complex(400, 0), new Complex(-400, 0), new Complex(-100, 0), new Complex(400, 100), new Complex(-500, 0),new Complex(-400, 0)]
    setPts(pts);
  }

  function setPts(newPts)
  {
    points = [...newPts];
    updateCanvasSize();

    vectors = generateFourierSeries(points, points.length);
    complexitySlider.max = points.length;
    complexitySlider.value = points.length;
    changeComplexity();

  }

  function loadImagePoints()
  {
    setPts(coords);
  }

  function changeComplexity()
  {
    complexityTag.html(`Current complexity (# of coefficients): ${complexitySlider.value}`)
    resetDrawing();
    drawableVectors = vectors.slice(0, complexitySlider.value);
    drawableVectors.sort((a, b) => b.complex.mag() - a.complex.mag());
  }

  function generateFourierSeries(x, n) 
  {
    //how much a given frequency is present in the sample function
    //truncate to size n, i.e. only an approximation to n epicycles.
    let X = [];

    for (let i = 0; i < n; i++) 
    {
      //calculate the prescence of a frequency in the sequence 0, 1, -1, 2, -2, 3, -3, 4, -4... etc ...
      let f = indexToFrequency(i);
      // use dft equation, push out complex number to the index of the array at i.
      X.push(dftEq(x, f));
    }

    // the output is an array of vectors (complex numbers) which specify the information about a particular epicycle. Formats of frequencies to array index is as above.
    return X;
  }

  function dftEq(x, f) 
  {
    // Get an individual vector using dft summation. dt = 1/N.
    var dt = 1/x.length;
    let t = 0;
    var summation = new Complex(0,0);
    // Make sure we are "integrating" from 0 -> 1.
    for (let i = 0; i < x.length; i++) 
    {
      let pt = x[i];  
      let cmp_exp = complexExp(s.TWO_PI * -f * t);
      // 1/N * x[n] * e^(2pi * i f t), with t being at equal intervals of 1/N
      summation = summation.add(pt.mult(cmp_exp).mult(new Complex(dt,0)));
      t += dt;
    }
    // Keep track of f so we can sort by magnitude later
    return new FourierOutput(summation, f);
  }

  function indexToFrequency(i) 
  {
    // to get the magnitude of the frequency, floor div index by 2, then add the modulo of the index by 2 (odd numbers need +1)
    let m = (i / 2 >> 0) + i % 2;
    // oscillating -ves
    return ((-1) ** (i + 1)) * m
    //results in 0, 1, -1, 2, -2... etc ...
  }
}

new p5(s1);