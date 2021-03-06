// many thanks to Bostock for providing excellent examples:
// https://bl.ocks.org/mbostock/34f08d5e11952a80609169b7917d4172
/*
* data: list of object with column values as properties
* svgID: the id of the svg element to draw the chart in
* timeProperty: column to display on x-axis
* valueProperty: column to display on y-axis
* eventProperty: categories of data (denoted by color). Errors are their own category
* parseDate: function to parse the date with
* isError: function to determine whether a given data point is an error
* 
*/
function draw_chart(data, svgID, timeProperty, valueProperty, eventProperty, parseDate, isError) {
    var time = timeProperty;
    var value = valueProperty;
    var event = eventProperty;
    

    function cleanID(id) {
        // credit: https://stackoverflow.com/questions/9635625/javascript-regex-to-remove-illegal-characters-from-dom-id
        return id.replace(/^[^a-z]+|[^\w:-]+/gi, "");
    }

    data.forEach(function (d) {
        d[time] = parseDate(d[time]);
        if(isError(d)) {
            d[value] = -1;
            d[event] += " error";
        } else {
            d[value] = +d[value];
        }
        return d;
    });



    // downsample data for performance gain
    const sampler = fc.largestTriangleThreeBucket();

    sampler.x(function (d) { return d[timeProperty] })
        .y(function (d) { return d[valueProperty] });

    // var numBuckets = document.body.clientWidth - 1000;
    var numBuckets = Math.min(1000, data.length / 10);
    console.log("numBuckets: " + numBuckets);
    var bucketSizes = {};
    // combine events together so each event has its own
    // dataset
    var dataNestUnsampled = d3.nest()
        .key(function (d) { return d[event]; })
        .entries(data);
    var dataNest = [];
    for (var i = 0; i < dataNestUnsampled.length; i++) {
        var eventData = {};
        eventData.key = dataNestUnsampled[i].key;
        var bucketSize = Math.max(dataNestUnsampled[i].values.length / numBuckets, 1);
        // var bucketSize = 1;
        sampler.bucketSize(bucketSize);
        console.log(bucketSize);
        eventData.values = sampler(dataNestUnsampled[i].values);
        dataNest.push(eventData);
    }

    var svg = d3.select("#" + svgID);
        svg.node().innerHTML = "";
    var margin = { top: 20, right: 100, bottom: 110, left: 50 },
        margin2 = { top: 430, right: 100, bottom: 30, left: 50 },
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        height2 = +svg.attr("height") - margin2.top - margin2.bottom;



    // create functions for mapping time and values to 
    // x and y values for top and bottom graph
    var x = d3.scaleTime().range([0, width])
    x2 = d3.scaleTime().range([0, width]),
        y = d3.scaleLinear().range([height, 0]),
        y2 = d3.scaleLinear().range([height2, 0]);

    x.domain([d3.min(data, function (d) { return d[time]; }), d3.max(data, function (d) { return d[time]; })]),
        // x.domain(d3.extent(sampledData, function (d) { return d[time]; }));
        y.domain([d3.min(data, function (d) { return +d[value]; }), d3.max(data, function (d) { return +d[value]; })]);
    x2.domain(x.domain());
    y2.domain(y.domain());

    var xAxis = d3.axisBottom(x),
        xAxis2 = d3.axisBottom(x2),
        yAxis = d3.axisLeft(y);

    var brush = d3.brushX()
        .extent([[0, 0], [width, height2]])
        .on("brush", brushed);

    var zoom = d3.zoom()
        .scaleExtent([1, Infinity])
        .translateExtent([[0, 0], [width, height]])
        .extent([[0, 0], [width, height]])
        .on("zoom", zoomed);

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

    var alpha = 0.5;
    var schemeCategory10 = function (alpha) {
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

    // draw circles for each data point
    // design idea from: https://bl.ocks.org/misanuk/fc39ecc400eed9a3300d807783ef7607
    dataNest.forEach(function (event, i) {
        // credit: https://stackoverflow.com/questions/9635625/javascript-regex-to-remove-illegal-characters-from-dom-id
        var cleanedKey = cleanID(event.key);
        var eventElem = focus.append("g")
            .attr("id", cleanedKey + "-data");
        eventElem.attr("clip-path", "url(#clip)");
        eventElem.selectAll(".bar")
            .data(event.values)
            .enter().append("circle")
            .attr("class", "bar " + cleanID(event.key))
            .attr("r", 4)
            .attr("fill", function () { return colorAlpha(event.key) })
            .attr("stroke", color(event.key))
            .style("opacity", 0.4)
            .attr("cx", function (d) { return x(d[time]); })
            .attr("cy", function (d) { return y(d[value]); })
      
        // context view displays actual data, not downsampled
        var eventElem = context.append("g");
        eventElem.attr("clip-path", "url(#clip)");
        eventElem.selectAll(".bar")
            .data(dataNestUnsampled[i].values)
            .enter().append("circle")
            .attr("class", "barContext " + cleanID(event.key))
            .attr("r", 1)
            .attr("fill", function () { return colorAlpha(event.key) })
            .attr("cx", function (d) { return x2(d[time]); })
            .attr("cy", function (d) { return y2(d[value]); })
    });

    // x axis label
    focus.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    // y axis label
    focus.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Size (bytes)");

    // legend
    var legend = focus.append("g")
        .attr("transform", "translate(" + (width + margin.right - 10) + ", 5)")
        .style("cursor", "pointer");

    // draw event types in legend
    dataNest.forEach(function (event, i) {
        var pair = legend.append("g")
        var label = pair.append("text")
            .attr("text-anchor", "end")
            .text(event.key);
        var dim = label.node().getBBox();
        pair.append("circle")
            .attr("transform", "translate(" + (dim.x + dim.width + 5) + "," + (dim.y / 4) + ")")
            .attr("r", 4)
            .attr("fill", function () { return colorAlpha(event.key) })
            .attr("stroke", function () { return color(event.key) })
        pair.attr("transform", "translate(0," + (-dim.y * i) + ")")
            .on("click", function () {
                // from https://bl.ocks.org/d3noob/08af723fe615c08f9536f656b55755b4
                // Determine if current line is visible 
                var active = event.active ? false : true,
                    newOpacity = active ? 0 : 1;
                // Hide or show the elements based on the ID
                d3.select("#" + cleanID(event.key) + "-data")
                    .transition().duration(100)
                    .style("opacity", newOpacity);
                this.querySelector("text").setAttribute("opacity", newOpacity + 0.5)
                // Update whether or not the elements are active
                event.active = active;
            })
    });

    // x axis label
    svg.append("text")
        .attr("transform",
        "translate(" + ((width + margin.right + margin.left) / 2) + " ," +
        (height + margin.top + margin.bottom) + ")")
        .style("text-anchor", "middle")
        .text("Date");

  
    var tooltip = focus.append('g')
        .style('opacity', 0.7);
    tooltip.append('circle')
        .attr('r', 4)
        .style('fill', 'none')
        .style('stroke', 'black');
    tooltip.append('line')
        .attr('class', 'x');
    tooltip.append('line')
        .attr('class', 'y');
    tooltip.selectAll('line')
        .style("fill", "none")
        .style("stroke", "black")
        .style("stroke-width", "1.5px")
        .style("stroke-dasharray", "3 3");

    tooltip.append('text')
        .attr('x', 9)
        .attr('dy', '.35em');

    function mousemove() {
        var x0 = x.invert(d3.mouse(this)[0]);
        var y0 = y.invert(d3.mouse(this)[1]);

        var x_coord = x(x0);
        var y_coord = y(y0);
        tooltip.attr('transform', 'translate(' + x_coord + ',' + y_coord + ")");

        tooltip.select('line.x')
            .attr('x1', 0)
            .attr('x2', -x_coord)
            .attr('y1', 0)
            .attr('y2', 0);

        tooltip.select('line.y')
            .attr('x1', 0)
            .attr('x2', 0)
            .attr('y1', 0)
            .attr('y2', height - y_coord);

        tooltip.select('text').text(parseInt(y0));
    }

    svg.append("rect")
        .attr("class", "zoom")
        .attr("width", width)
        .attr("height", height)
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .on("mouseover", function () {
            tooltip.style("display", "");
        })
        .on("mouseout", function () {
            tooltip.style("display", "none");
        })
        .on("mousemove", mousemove)
        .on("wheel", function () { // disable scrolling while zooming
            d3.event.stopPropagation();
            d3.event.preventDefault();
        })
        .call(zoom);

    // add y axis to top graph
    focus.append("g")
        .attr("class", "axis axis--y")
        .call(yAxis);

    // add y axis to bottom graph
    context.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height2 + ")")
        .call(xAxis2);

    // create brush box that highlights viewing area
    context.append("g")
        .attr("class", "brush")
        .call(brush)
        .call(brush.move, x.range());

    // pan graph side to side
    function brushed() {
        // ignore brush-by-zoom
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; 
        var s = d3.event.selection || x2.range();
        x.domain(s.map(x2.invert, x2)); // determine new x range
        resample(x.domain()); // stop drawing offscreen points
        focus.select(".axis--x").call(xAxis); // redraw x axis
        // modify zoom function to use updated x range
        svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
            .scale(width / (s[1] - s[0]))
            .translate(-s[0], 0));
    }

    // zoom in on graph
    function zoomed() {
        // ignore zoom-by-brush
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; 
        var t = d3.event.transform;
        x.domain(t.rescaleX(x2).domain()); // rescale x axis
        resample(x.domain()); // draw current view in more detail, don't draw offscreen points
        // remove redundant points
        dataNest.forEach(function (d, i) {
            focus.selectAll(".bar." + cleanID(d.key))
                .attr("cx", function (d) { return x(d[time]) })
                .attr("cy", function (d) { return y(d[value]); })
        });
        // redraw x axis
        focus.select(".axis--x").call(xAxis);
        // update brush function to updated view
        context.select(".brush").call(brush.move, x.range().map(t.invertX, t));

    }

    // create func that translates the approximate data point corresponding
    // to a given time
    var bisector = d3.bisector(function (d) { return d[time]; });

    // determines what data points need to be drawn based on the current
    // range of values visible to the user
    // reference: http://blog.scottlogic.com/2015/11/16/sampling-large-data-in-d3fc.html
    function resample(range) {
        svg.attr("data-range", '[' + range[0].getTime() + ',' + range[1].getTime() + ']');
        dataNestUnsampled.forEach(function (event, i) {
            var data = event.values;
            // Calculate visible data for main chart
            var bisector = d3.bisector(function (d) { return d[time]; });
            var visibleData = data.slice(
                bisector.left(data, range[0]),
                Math.min(data.length, bisector.right(data, range[1] - 1))
            );


            var bucketSize = Math.ceil(visibleData.length / numBuckets);
            sampler.bucketSize(bucketSize);

            dataNest[i].values = sampler(visibleData);

            focus.select("#" + cleanID(event.key) + "-data").selectAll(".bar")
                .data(dataNest[i].values)
                .attr("cx", function (d) { return x(d[time]); })
                .attr("cy", function (d) { return y(d[value]); })
        });
    }


}