// many thanks to Bostock for providing excellent examples:
// https://bl.ocks.org/mbostock/34f08d5e11952a80609169b7917d4172
function draw_chart(data, svgID, timeProperty, valueProperty, event) {
    var time = timeProperty;
    var value = valueProperty;
    // parse time stamps into date
    // due to limitations of the Javascript Date type,
    // precision is in milliseconds (not microseconds)
    var parseDate = d3.timeParse("%H:%M:%S.%f%Z");
    data.forEach(function(d) {
        d[time] = parseDate(d[time]);
        d[value] = +d[value];
        return d;
    })

    // downsample data for performance gain
    const sampler = fc.largestTriangleOneBucket();

    sampler.x(function(d) {return d[timeProperty]})
           .y(function(d) {return d[valueProperty]});
    var bucketSize = data.length/10000 < 1 ? 1 : Math.pow(10, Math.log(data.length/10000));
    sampler.bucketSize(bucketSize);
    console.log(bucketSize);
    
    var sampledData = sampler(data);
    
    var dataNest = d3.nest()
        .key(function(d) {return d[event];})
        .entries(sampledData);


    var svg = d3.select("#" + svgID),
        margin = { top: 20, right: 20, bottom: 110, left: 40 },
        margin2 = { top: 430, right: 20, bottom: 30, left: 40 },
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        height2 = +svg.attr("height") - margin2.top - margin2.bottom;



    // create functions for mapping time and values to 
    // x and y values for top and bottom graph
    var x = d3.scaleTime().range([0, width]),
        x2 = d3.scaleTime().range([0, width]),
        y = d3.scaleLinear().range([height, 0]),
        y2 = d3.scaleLinear().range([height2, 0]);

    var xAxis = d3.axisBottom(x),
        xAxis2 = d3.axisBottom(x2),
        yAxis = d3.axisLeft(y);

    var brush = d3.brushX()
        .extent([[0, 0], [width, height2]])
        .on("brush end", brushed);

    var zoom = d3.zoom()
        .scaleExtent([1, Infinity])
        .translateExtent([[0, 0], [width, height]])
        .extent([[0, 0], [width, height]])
        .on("zoom", zoomed);

    var area = d3.area()
        .curve(d3.curveStepAfter)
        .x(function (d) { return x(d[time]); })
        .y0(height)
        .y1(function (d) { return y(d[value]); });

    var area2 = d3.area()
        .curve(d3.curveStepAfter)
        .x(function (d) { return x2(d[time]); })
        .y0(height2)
        .y1(function (d) { return y2(d[value]); });

    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    var focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var context = svg.append("g")
        .attr("class", "context")
        .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

    x.domain(d3.extent(sampledData, function (d) { return d[time]; }));
    y.domain([0, d3.max(sampledData, function (d) { return +d[value]; })]);
    x2.domain(x.domain());
    y2.domain(y.domain());

    var alpha = 0.5;
    var schemeCategory10 = function(alpha) {
        return ["rgba(31,119,180," + alpha + ")",
        "rgba(255,127,14," + alpha + ")",
        "rgba(44,160,44," + alpha + ")",
        "rgba(214,39,40," + alpha + ")",
        "rgba(148,103,189," + alpha + ")",
        "rgba(140,86,75," + alpha + ")",
        "rgba(227,119,194," + alpha + ")",
        "rgba(127,127,127," + alpha + ")",
        "rgba(188,189,34," + alpha + ")",
        "rgba(23,190,207," + alpha + ")"];
    }

    var color = d3.scaleOrdinal(schemeCategory10(1));
    var colorAlpha = d3.scaleOrdinal(schemeCategory10(alpha));
    dataNest.forEach(function(d, i) {

    focus.append("path")
        .datum(d.values)
        .attr("class", "area")
        .attr("stroke", function() {
            return d.color = color(d.key);
        })
        .attr("fill", function() {
            return d.color = colorAlpha(d.key);
        })
        .attr("d", area);

    context.append("path")
        .datum(d.values)
        .attr("class", "area")
        .attr("stroke", function() {
            return d.color = color(d.key);
        })
        .attr("fill", function() {
            return d.color = colorAlpha(d.key);
        })
        .attr("d", area2);

    })
    focus.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    focus.append("g")
        .attr("class", "axis axis--y")
        .call(yAxis);

    context.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height2 + ")")
        .call(xAxis2);

    context.append("g")
        .attr("class", "brush")
        .call(brush)
        .call(brush.move, x.range());

    var zoomRect = svg.append("rect")
        .attr("class", "zoom")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "transparent")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .call(zoom);

    zoomRect.on("mousenter", function () {
        // console.log("entering");
        // body.style.overflow = "hidden";
    })
    .on("wheel", function() {
        d3.event.preventDefault();
    })
    .on("mouseout", function() {
        // console.log("leaving");
        // body.style.overflow = "auto";
    })
    .on('mousemove', displayTooltip)

    function brushed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
        var s = d3.event.selection || x2.range();
        x.domain(s.map(x2.invert, x2));
        focus.selectAll(".area").attr("d", area);
        focus.select(".axis--x").call(xAxis);
        svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
            .scale(width / (s[1] - s[0]))
            .translate(-s[0], 0));
    }

    function zoomed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
        var t = d3.event.transform;
        x.domain(t.rescaleX(x2).domain());
        focus.selectAll(".area").attr("d", area);
        focus.select(".axis--x").call(xAxis);
        context.select(".brush").call(brush.move, x.range().map(t.invertX, t));
    }

    var circle = svg.append('circle')
    .attr('r', 5);

    var bisector = d3.bisector(function(d){ return d[time]; }).left;
    function displayTooltip() {
        // reference: https://www.pshrmn.com/tutorials/d3/mouse/
        var coordinates = d3.mouse(this);
        var domainX = x.invert(coordinates[0]);
        
        var pos = bisector(sampledData, domainX);
        // get the closest smaller and larger values in the data array
        var smaller = sampledData[pos - 1];
        var larger = sampledData[pos];
        // figure out which one is closer to the domain value
        var closest = domainX - smaller[time] < larger[time] - domainX ? smaller : larger;

        circle
        .attr('cx', x(closest[time]))
        .attr('cy', y(closest[value]));
    }

    // svg.select(".area")
    //     .attr("fill", "steelblue")
    //     .attr("clip-path", "url(#clip");
    // svg.select(".zoom")
    //     .attr("cursor", "move")
    //     .attr("fill", "none")
    //     .attr("pointer-events", "all")
    
}