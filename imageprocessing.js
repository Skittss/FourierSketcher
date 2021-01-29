var coords = [];

var s2 = function(s) {
    var divId = "processingSketch"
    var div;

    var fileInput;
    var raw;
    var filtered;
    var sampled;
    var gradientMags;
    var gradientAngles;
    var displayWidth = 512;
    var displayHeight = 0;
    var imgScale;
    var processingOrder = [toRaw, toGray, toBlur, toSobel, toNMS, toThreshold, toHysteresis, toCoords, tspSort];
    var displayRows = 3;
    var displayCols = 3;
    var oneTimeRender = false;
    var rangeStretch;

    // NMS
    var imgMax;

    // Double Threshold
    var strongValue = 255;
    var weakValue = 50;

    var blurSlider;
    var hiThresholdSlider;
    var loThresholdSlider;
    var hysteresisPassSlider;
    var processingCheckbox;
    var processButton;
    var sampleCheckbox;
    var interactiveRenderCheckbox;
    var resizeFileInputsCheckbox;
    var sampleFrequencySlider;
    
    s.setup = function ()
    {
        div = document.getElementById(divId);
        div.hidden = true;
        processingCanvas = s.createCanvas(div.offsetWidth,100).parent(divId);
        fileInput = document.getElementById("img");
        fileInput.oninput = loadFile;

        blurSlider = document.getElementById("gaussianblurAmt");
        blurSlider.onchange = interactiveRenderOnce;
        loThresholdSlider = document.getElementById("loThreshold");
        loThresholdSlider.onchange = interactiveRenderOnce;
        hiThresholdSlider = document.getElementById("hiThreshold");
        hiThresholdSlider.onchange = interactiveRenderOnce;
        hysteresisPassSlider = document.getElementById("hysteresisPasses")
        hysteresisPassSlider.onchange = interactiveRenderOnce;
        processingCheckbox = document.getElementById("continuallyProcess");

        processButton = document.getElementById("processOnce");
        processButton.onclick = renderOnce;

        sampleCheckbox = document.getElementById("doSample");

        interactiveRenderCheckbox = document.getElementById("processOnParamChange");
        resizeFileInputsCheckbox = document.getElementById("resizeInputs");

        sampleFrequencySlider = document.getElementById("sampleFrequency");
        sampleFrequencySlider.onchange = interactiveRenderOnce;
    }


    function loadFile()
    {
        document.getElementById("loadingIndicator").innerHTML = "Loading..."
        let img = fileInput.files[0];
        let url = URL.createObjectURL(img);
        raw = s.loadImage(url, updateDisplayWindowSize);
    }

    function updateDisplayWindowSize()
    {

        imgScale = displayWidth/raw.width;
        displayHeight = raw.height*imgScale;

        //upscale small images so detail is preserved
        if (imgScale > 1 || resizeFileInputsCheckbox.checked)
        {
            raw.resize(displayWidth, displayHeight);
        }

        div.hidden = false;
        s.resizeCanvas(displayWidth*displayCols, displayHeight*displayRows);

        div.style.width = `${displayWidth*displayCols}px`;
        div.style.height = `${displayHeight*displayRows}px`;


        //reset the indicator
        document.getElementById("loadingIndicator").innerHTML = "Input File:"

        //render the image once
        renderOnce();
    }

    s.draw = function() 
    {
        if (processingCheckbox.checked || oneTimeRender)
        {
            s.background(0);
            drawProcessPreviews();
            if (oneTimeRender) 
            {
                oneTimeRender = false;
                processButton.value = "Process Once";
            }
        }
    }

    s.windowResized = function()
    {
        width = document.getElementById(divId).offsetWidth;
    }

    function renderOnce()
    {
        oneTimeRender = true;
        processButton.value = "Processing..."
    }

    function interactiveRenderOnce()
    {
        if (interactiveRenderCheckbox.checked)
        {
            renderOnce();
        }
    }

    function drawProcessPreviews()
    {
        if (raw != null)
        {
            filtered = s.createImage(raw.width, raw.height);
            filtered.copy(raw, 0, 0, raw.width, raw.height, 0, 0, raw.width, raw.height);

            let t0, tf;
            t0 = tf = performance.now();
            for (let i = 0; i < displayRows; i++)
            {
                for (let j = 0; j < displayCols; j++)
                {
                    if (i * displayCols + j < processingOrder.length)
                    {
                        let x = j * displayWidth;
                        let y = i * displayHeight;
                        tf = filteredDisplay(x, y, processingOrder[i*displayCols + j]);
                    }
                }
            }
            startDrawingFunc.call({imgSize: new Complex(filtered.width, filtered.height)});
        }

    }

    function filteredDisplay(x, y, func)
    {
        let ts = performance.now();
        let processName = func.call();
        s.image(filtered, x, y, displayWidth, displayHeight);
        s.fill(255);
        let elapsed = performance.now() - ts;
        s.text(`${processName}: ${elapsed} ms`, x+ 5, y + 17);
        
        return performance.now();
    }

    function toRaw()
    {
        return "Raw"
    }

    function toGray()
    {
        filtered.filter(s.GRAY);
        return "Grayscale"
    }

    function toBlur()
    {
        let r = blurSlider.value;
        filtered.filter(s.BLUR, r);
        return `Gaussian Blur (r = ${r})`
    }

    function toNMS()
    {

        // TODO, 
        // DONE (IRRELEVANT): FIX UNDEFINED GRADIENT ANGLES. 
        // DONE (FIXED) CHECK COMPARISON IS BETWEEN CORRECT PIXELS
        // FIX INTERPOLATION BETWEEN TWO SAME VALUES RESULTING IN A SLIGHTLY LARGER NUMBER. 
        let nmsOut = [];

        // Most of the calculations below are to interpolate between neighbouring pixels to a target pixel as follows (very rough diagram):
        /*
            X    X   α1
                     __>
                   _/θ)
            β2   T   β1
            α2   X   X
        */
        // Must calculate the relative position of interpolation 
        
        //might get an error here because of the edge pixels ignored in sobel. is the width expected?
        for (let y = 0; y < filtered.height; y++)
        {
            for (let x = 0; x < filtered.width; x++)
            {
                let indexInSobelArr = (x, y) => y * filtered.width + x;
                let i = indexInSobelArr(x, y);
                let a = gradientAngles[i];
                let m = gradientMags[i];

                let horizontalComp = Math.cos(a);
                let verticalComp = Math.sin(a);            
                // TODO handle case where signs return two zeros 0;

                // Which quadrant the gradient points to relative to the current pixel
                let xTranslate = Math.sign(horizontalComp);
                let yTranslate = Math.sign(verticalComp);

                // Define alphas in the + ve and -ve gradient direction as we must always factor these in for interpolation
                let alpha1 = new Complex(x + xTranslate, y + yTranslate);
                let alpha2 = new Complex(x - xTranslate, y - yTranslate);
                let beta1, beta2;
                let interp;
                if (Math.abs(horizontalComp) > Math.abs(verticalComp))
                {
                    beta1 = new Complex(x + xTranslate, y);
                    beta2 = new Complex(x - xTranslate, y);
                    interp = (a, b) => a * Math.abs(verticalComp) + (1-Math.abs(verticalComp)) * b
                    //console.log(`gradient at angle: ${a} interpolated between [+ve] (${xTranslate}, ${yTranslate} & ${xTranslate}, 0); [-ve] (${-xTranslate}, ${-yTranslate} & ${-xTranslate}, 0)`)
                }
                else
                {
                    beta1 = new Complex(x, y + yTranslate);
                    beta2 = new Complex(x, y - yTranslate);
                    interp = (a, b) => a * Math.abs(horizontalComp) + (1-Math.abs(horizontalComp)) * b
                    //console.log(`gradient at angle: ${a} interpolated between [+ve] (${xTranslate}, ${yTranslate} & 0, ${yTranslate}); [-ve] (${-xTranslate}, ${-yTranslate} & 0, ${-yTranslate})`)
                }

                // Get the gradient values of all 4 points.
                // If the point to be interpolated against is outside the image, set it to 0 as to not effect the interpolation
                let withinbounds = (complex) => (complex.re >= 0) && (complex.re < filtered.width) && (complex.im >= 0) && (complex.im < filtered.height);
                let ag1 = withinbounds(alpha1) ? gradientMags[indexInSobelArr(alpha1.re, alpha1.im)] : 0;
                let bg1 = withinbounds(beta1) ? gradientMags[indexInSobelArr(beta1.re, beta1.im)] : 0;
                let ag2 = withinbounds(alpha2) ? gradientMags[indexInSobelArr(alpha2.re, alpha2.im)] : 0;
                let bg2 = withinbounds(beta2) ? gradientMags[indexInSobelArr(beta2.re, beta2.im)] : 0;

                g1 = interp(ag1, bg1);
                //console.log(`interpolated value between ${ag1}, ${bg1} to ${g1}`)
                g2 = interp(ag2, bg2);
                // if any of the neighbouring gradients are larger than the current, suppress it.
                if (g1 > m || g2 > m) 
                {
                    //console.log(`value ${m} suppressed against ${g1} and ${g2}`);
                    m = 0;
                }
                nmsOut[i] = m;
            }
        }
        
        imgMax = -Infinity;
        //overrite original image data - do we overrite all here? what about index 0 and w-1/h-1?
        filtered.loadPixels();
        for (let y = 0; y < filtered.height; y++)
        {
            for (let x = 0; x < filtered.width; x++)
            {
                i = y * filtered.width + x;
                // convert gradient to range 0 -> 255 for use in image
                let v = rangeStretch(nmsOut[i])
                setFilteredPixels(i, v, 255);
                if (imgMax < v) imgMax = v;
            }
        }
        if (imgMax > 255) imgMax = 255;
        filtered.updatePixels();

        //TODO keep the Non-maximum suppression separate as information is lost in the image.
        return "NMS"
    }

    function toThreshold()
    {
        let hv = hiThresholdSlider.value;
        let lv = loThresholdSlider.value;
        let hi = imgMax * hv;
        let lo = hi * lv;   //Make lo relative to high as we do not want lo > hi

        filtered.loadPixels();
        for (let y = 0; y < filtered.height; y++)
        {
            for (let x = 0; x < filtered.width; x++)
            {
                let i = y * filtered.width + x;
                let v = filtered.pixels[4 * i];
                if (v <= lo) v = 0;
                else if (v < hi) v = weakValue;
                else v = strongValue;

                setFilteredPixels(i, v, 255);
            }
        }
        filtered.updatePixels();

        return `Threshold (LO: ${lv} HI: ${hv})`
    }

    function toHysteresis()
    {
        // Might need to set a recursion limit here for BIG images, there is an implicit limit due to a finite number of pixels however.

        // Some optimisation can be done here, don't need to access and update img each time if keep track of pixels internally; might not be faster though.

        let w = function(x,y) 
        {
            if (x > 0 && y > 0  && x < filtered.width && y < filtered.height)
            {
                return filtered.pixels[4 * (y * filtered.width + x)] == weakValue;
            }
            return false;
        }
        let s = function(x,y) 
        { 
            let v = filtered.pixels[4 * (y * filtered.width + x)] == strongValue;
            return v;
        }

        filtered.loadPixels();
        let i;
        let passBacks = {output: []};
        let t = hysteresisPassSlider.value;
        for (let y = 0; y < filtered.height; y++)
        {
            for (let x = 0; x < filtered.width; x++)
            {
                i = y * filtered.width + x;
                if (s(x,y) && passBacks.output[i] == null)
                {
                    passBacks = trackEdges(x,y,w,t, passBacks.output);
                    // Reset recursion at the returned pixel
                    if (passBacks.tooMuchRecursion == true)
                    {
                        passBacks = trackEdges(passBacks.curX, passBacks.curY, w, t, passBacks.output);
                    }
                }
            }
        }

        let out = passBacks.output;
        for (let y = 0; y < filtered.height; y++)
        {
            for (let x = 0; x < filtered.width; x++)
            {
                i = y * filtered.width + x;
                if (out[i] != null)
                {
                    setFilteredPixels(i, strongValue, 255);
                }
                else if (filtered.pixels[4 * i] == weakValue)
                {
                    setFilteredPixels(i, 0, 255);
                }
            }
        }

        filtered.updatePixels();
        return `Hysteresis (tolerance = ${t}px)`;
    }

    function trackEdges(x, y, w, t, out)
    {
        let X, Y, i;
        let passBacks =
        {
            output: out,
            tooMuchRecursion: false,
            curX: x,
            curY: y
        };
        for (let dy = -t; dy <= t; dy++)
        {
            for (let dx = -t; dx <= t; dx++)
            {
                X = x+dx;
                Y = y+dy;
                i = Y * filtered.width + X;
                // no need to worry about dy,dx = 0 as the value is strong, not weak.
                if (w(X,Y) && out[i] == null)
                {
                    out[i] = 1;
                    try 
                    {
                        passBacks = trackEdges(X,Y,w,t, out);
                        // Exit out if the attempted call hit the recursion limit
                        if (passBacks.tooMuchRecursion) return passBacks;
                    }
                    catch (err)
                    {
                        // Return state of the recursion so it can continue from the bottom of the stack.
                        return {output: passBacks.output, tooMuchRecursion: true, curX: passBacks.curX, curY: passBacks.curY}
                    }
                }
                
            }
        }
        return passBacks;
    }

    function toSobel()
    {
        let gx = 
        [
            [ 1,  0, -1],
            [ 2,  0, -2],
            [ 1,  0, -1]
        ];

        let gy = 
        [
            [ 1,  2,  1],
            [ 0,  0,  0],
            [-1, -2, -1]
        ];

        filtered.loadPixels();
        let magnitudes = []
        let angles = [];
        let w = filtered.width;
        let h = filtered.height;
        let minV = Infinity;
        let maxV = -Infinity;

        //input 2 kernels for x and y directions to save on time complexity.

        //loop over img pixels, kernel position.
        // do not consider edge pixels as this may interpret image edge as high-gradient area. (possibly, not sure - ammend this)
        for (let y = 1; y < h - 1; y++)
        {
            for (let x = 1; x < w - 1; x++)
            {
                let i = y * w + x;
                let gxSum = 0;
                let gySum = 0;

                // sum up applied values on pixels overlapped by kernel
                for (let ky = -1; ky < 2; ky ++)
                {
                    for (let kx = -1; kx < 2; kx ++)
                    {
                        let xIndex = x + kx;
                        let yIndex = y + ky;
                        let value = filtered.pixels[4 * ((xIndex) + (yIndex) * w )]; //make sure to x4 as we are using grayscale values from alpha channel
                        gxSum += gx[ky + 1][kx + 1] * value;
                        gySum += gy[ky + 1][kx + 1] * value;
                    }
                }
                // assign gradient magnitude information
                let v = (Math.sqrt(gxSum * gxSum + gySum * gySum));
                magnitudes[i] = v;
                if (v < minV) minV = v;
                if (v > maxV) maxV = v;
                
                // assign gradient angle information
                angles[i] = Math.atan2(gySum, gxSum);
            }
        }
        // define the rangeStretch function here so it can be used again in NMS.
        rangeStretch = (val) => (val - minV) * (255/(maxV - minV))

        //overrite original image data - do we overrite all here? what about index 0 and w-1/h-1?
        for (let y = 0; y < h; y++)
        {
            for (let x = 0; x < w; x++)
            {
                i = y * w + x;
                // convert gradient to range 0 -> 255 for use in image
                let norm = rangeStretch(magnitudes[i])
                setFilteredPixels(i, norm, 255);
            }
        }
        filtered.updatePixels();

        //keep the sobel data. By putting the data into the image, we lose information.
        gradientMags = magnitudes;
        gradientAngles = angles;

        return "Sobel"
    }

    function toCoords() 
    {
        if (!sampleCheckbox.checked) return "Not sampled (Check box to sample)";

        coords = [];
        imgout = [];
        let hDivs = 10;
        let vDivs = 10;
        let divWidth = filtered.width/hDivs >> 0;
        let divHeight = filtered.height/vDivs >> 0;
        let sampleRate = sampleFrequencySlider.value; // 1 in n...

        filtered.loadPixels();
        let w = filtered.width;
        let h = filtered.height;

        let X, Y, i;
        for (let y = 0; y < h; y+=divHeight)
        {
            for (let x = 0; x < w; x+=divWidth)
            {
                let sampleCount = 0;
                for (let dy = 0; dy < divHeight; dy++)
                {
                    for (let dx = 0; dx < divWidth; dx++)
                    {
                        Y = y+dy;
                        X = x+dx;
                        i = Y * w + X;
                        // Stop from sampling outside image on bottom and right edge
                        if (X < filtered.width && Y < filtered.height)
                        {
                            if (filtered.pixels[4 * i] == strongValue)
                            {
                                if (sampleCount % sampleRate == 0)
                                {
                                    //coords.push(new Complex(X - w_o, Y - h_o));
                                    coords.push(new Complex(X , Y))
                                    setFilteredPixels(i, strongValue);
                                }
                                else
                                {
                                    setFilteredPixels(i, 0);
                                }
                                sampleCount++;
                            }
                        }
                    }
                }

            }
        }
        filtered.updatePixels();

        return "Sampling";
    }

    function tspSort()
    {
        if (!sampleCheckbox.checked) return "No sample data (Check box to sample)"

        // greedy search, using kd trees.
        // use an object as a hashmap for visited.
        let visited = {};
        let output = [];
        let pt = coords[0];

        let dist = function(a, b)
        {
            if (visited[a.hash()]) return Infinity;
            return Math.pow(a.re - b.re, 2) + Math.pow(a.im - b.im, 2);
        }

        filtered.loadPixels();
        let w_o = filtered.width/2;
        let h_o = filtered.height/2;
        let w =  filtered.width;
        let deltaHue = 360 / coords.length;

        let tree = construct2dTree(coords);
        for (let i = 0; i < coords.length; i++)
        {
            output[i] = new Complex(pt.re - w_o, pt.im - h_o);
            setFilteredPixelsUsingHSB(w * pt.im + pt.re,`hsl(${(i * deltaHue) >> 0}, 100%, 50%)`);
            visited[pt.hash()] = true;
            pt = getNearestNeighbour(tree, pt, dist);

            if ((i % (coords.length/100 >> 0)) == 0)
            {
                console.log(`Sort progress: ${i} of ${coords.length}`)
            }
        }
        filtered.updatePixels();
        coords = [...output];

        console.log("TSP done.")

        return "Greedy Best-First Sort";
    }

    function setFilteredPixels(i, value, alpha = -1)
    {
        filtered.pixels[4 * i] = value;
        filtered.pixels[4 * i + 1] = value;
        filtered.pixels[4 * i + 2] = value;
        if (alpha >= 0) filtered.pixels[4 * i + 3] = alpha;
    }

    function setFilteredPixelsUsingHSB(i, hsb, alpha = -1)
    {
        filtered.pixels[4 * i] = s.red(hsb);
        filtered.pixels[4 * i + 1] = s.blue(hsb);
        filtered.pixels[4 * i + 2] = s.green(hsb);
        if (alpha >= 0) filtered.pixels[4 * i + 3] = alpha;
    }
}

new p5(s2);



























function generateGaussianKernel()
{
    // Failed WIP for gaussian generation. need simpson integration for actual.
    // Create square array
    // let sum = 0;
    // kernel = [];
    // for (let j = 0; j < size; j++)
    // {
    //     let arr = [];
    //     for (let i = 0; i < size; i++)
    //     {
    //         let x = -size/2 + i * size / (size - 1);
    //         let y = -size/2 + j * size / (size - 1);
    //         value = exp((-(x * x + y * y)/(2 * sigma * sigma)))/(TWO_PI * sigma * sigma);
    //         arr[i] = value;
    //         sum += value;
    //     }
    //     kernel.push(arr);
    //     console.log(-size/2 + j * size /(size - 1));
    // }

    kernel = 
    [
        [1, 4, 7, 4, 1],
        [4, 16, 26 , 16 ,4],
        [7, 26, 41, 26, 7],
        [4, 16, 26 , 16 ,4],
        [1, 4, 7, 4, 1]
    ]

    // Normalise
    let size = 5;
    let sum = 273;
    for (let y = 0; y < size; y++)
    {
        for (let x = 0; x < size; x++)
        {
            kernel[y][x] /= sum;
        }
    }

    console.log(kernel);
    for (let row of kernel)
    {
        console.log(row);
    }
    console.log(sum)
    
    return kernel;
}
