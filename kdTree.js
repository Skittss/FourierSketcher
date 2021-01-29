function treeNode(coord, leftTree, rightTree)
{
    this.coord = coord;
    this.leftTree = leftTree;
    this.rightTree = rightTree;
}

function construct2dTree(pts, d = 0)
{
    if (pts.length == 0) return null;

    //pts takes complex numbers as coordinates
    let axis = d % 2;
    pts.sort((a, b) => a.getValueFromAxis(axis) - b.getValueFromAxis(axis));
    let median = pts.length / 2 >> 0;

    return new treeNode(
        pts[median], 
        construct2dTree(pts.slice(0, median), d+1),
        construct2dTree(pts.slice(median + 1, pts.length), d+1)
        );
}

function getNearestNeighbour(tree, pt, distanceFunc, imgWidth, imgHeight)
{
    var finalPt;
    var finalDist = Infinity;

    function findNextClosest(tree, pt, plane, distanceFunc, closestDist, closestPt = null, d = 0)
    {
        if (tree == null) return;

        let cur = tree.coord;
        let left = tree.leftTree;
        let right = tree.rightTree;
        let nearTree, farTree;

        let axis = d % 2;
        let lPlane, rPlane, nearPlane, farPlane;
        if (axis == 0)
        {
            lPlane = {topLeft: plane.topLeft, botRight: new Complex(cur.re, plane.botRight.im)};
            rPlane = {topLeft: new Complex(cur.re, plane.topLeft.im), botRight: plane.botRight};
        }
        else
        {
            lPlane = {topLeft: plane.topLeft, botRight: new Complex(plane.botRight.re, cur.im)};
            rPlane = {topLeft: new Complex(plane.topLeft.re, cur.im), botRight: plane.botRight};
        }

        let goLeft = pt.getValueFromAxis(axis) <= pt.getValueFromAxis(axis);
        nearTree = goLeft ? left : right;
        farTree = goLeft ? right : left;
        nearPlane = goLeft ? lPlane : rPlane;
        farPlane = goLeft ? rPlane : lPlane;

        let dist = (distanceFunc(cur, pt));
        if (dist < closestDist)
        {
            closestDist = dist;
            closestPt = cur;
        }

        findNextClosest(nearTree, pt, nearPlane, distanceFunc, closestDist, closestPt, d + 1)

        if (closestDist < finalDist)
        {
            finalDist = closestDist;
            finalPt = closestPt;
        }

        //only check neighbouring planes if it is possible there is a shorter pt...
        if (getClosestDistFromNeighbourPlane(pt, farPlane) < finalDist)
        {
            findNextClosest(farTree, pt, farPlane, distanceFunc, closestDist, closestPt, d + 1)
        }
    }

    var wholePlane = {topLeft: new Complex(0,0), botRight: new Complex(imgWidth, imgHeight)};

    findNextClosest(tree, pt, wholePlane, distanceFunc, Infinity);
    return finalPt;
}

function getClosestDistFromNeighbourPlane(pt, plane)
{
    let x = truncateToBounds(pt.re, plane.topLeft.re, plane.botRight.re);
    let y = truncateToBounds(pt.im, plane.topLeft.im, plane.botRight.im);
    return Math.pow(x - pt.re, 2) + Math.pow(y - pt.im, 2);
}

function truncateToBounds(value, lb, ub)
{
    if (value < lb) return lb;
    else if (value > ub) return ub;
    else return value;
}