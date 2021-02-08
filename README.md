# FourierSketcher

# TODO
# General:
- WORKERS! STOP FREEZING ON ME FIREFOX!!
- Better CSS especially sliders. Perhaps have a tooltip value. Much of this could be done in ReactJs.
- Possibly switch to java & processing for better performance and easier exports? Consider possibilities of using shaders too

# ImageProcessing:
- DONE Check recursion resets work fine
- DONE Function for setting pixels in img data (awfully lot of repeated code)
- WIP (Currently greedy best-first) Travelling Salesman: heuristic for along gradient lines?
- DONE FIx sampling, currently duplicates some of the left of the image due to division into non-precise partitions?
- Better sampling method: Pixel density based approach. Sample proportional to the amount of strong pixels.

# Fourier
- Implement FFT.
- Dont draw vectors smaller than can bee seen (1 px or less)
- DONE Fix small visual artefacts from pointer starting in top left?
- DONE Fix DFT does not take into account order of pts.
- Interpolation # Settings
- Accuracy settings (# cycles)

# Export
- Framerate: points per second. Can use n points and framerate to calculate playback duration
- Resolution/Point scale settings
- Points rendered can give a percentage progress
- More efficient rendering system based on layers? Layer for sinusoids, layer for coords. coord layer can be simply added to, and sinusoids replaced.
