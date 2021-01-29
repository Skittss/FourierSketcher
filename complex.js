function Complex(re, im)
{
  this.re = re;
  this.im = im;
}

Complex.prototype.hash = function()
{
  return `${this.re.toString()},${this.im.toString()}`;
}

Complex.prototype.add = function(o)
{
  return new Complex(this.re + o.re, this.im + o.im);
}

Complex.prototype.sub = function(o)
{
    return new Complex(this.re - o.re, this.im - o.im);
}

Complex.prototype.mult = function(o)
{
  let re = this.re * o.re - this.im * o.im;
  let im = this.re * o.im + this.im * o.re;
  return new Complex(re, im)
}

Complex.prototype.mag = function()
{
  return Math.sqrt(this.re * this.re + this.im * this.im);
}

Complex.prototype.getValueFromAxis = function(axis)
{
  if (axis == 0) return this.re;
  return this.im
}

function complexExp(x)
{
  return new Complex(Math.cos (x), Math.sin(x));
}