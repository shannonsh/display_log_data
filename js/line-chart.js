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
    
    var numBuckets = document.body.clientWidth - 1000;
    var bucketSizes = {};
    // combine events together so each event has its own
    // dataset
    var dataNestUnsampled = d3.nest()
        .key(function(d) {return d[event];})
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

    var svg = d3.select("#" + svgID),
        margin = { top: 20, right: 100, bottom: 110, left: 50 },
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

    // var zoomRect = svg.append("rect")
    //     .attr("class", "zoom")
    //     .attr("width", width)
    //     .attr("height", height)
    //     .attr("fill", "transparent")
    //     .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    //     .call(zoom);

    // zoomRect.on("mousenter", function () {
    //     // console.log("entering");
    //     // body.style.overflow = "hidden";
    // })
    // .on("wheel", function() {
    //     d3.event.preventDefault();
    // })
    // .on("mouseout", function() {
    //     // console.log("leaving");
    //     // body.style.overflow = "auto";
    // })
    // // .on('mousemove', displayTooltip)

    
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
        var event = focus.append("g")
            .attr("id", d.key + "-data");
        event.attr("clip-path", "url(#clip)");
        event.selectAll(".bar")
            .data(d.values)
            .enter().append("circle")
                .attr("class", "bar " + d.key)
                .attr("r", 4)
                .attr("fill", function () { return colorAlpha(d.key) })
                .attr("stroke", function() { return color(d.key) })
                .style("opacity", 0.4)
                .attr("cx", function(d) { return x(d[time]); })
                .attr("cy", function(d) { return y(d[value]); })

        var event = context.append("g");
        event.attr("clip-path", "url(#clip)");
        event.selectAll(".bar")
            .data(d.values)
            .enter().append("circle")
            .attr("class", "barContext " + d.key)
            .attr("r", 3)
            .attr("fill", function () { return colorAlpha(d.key) })
            .attr("cx", function(d) { return x2(d[time]); })
            .attr("cy", function(d) { return y2(d[value]); })
    })
    focus.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

        // y axis label
    focus.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x",0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Size (bytes)");

        // legend
    var legend = focus.append("g")
        .attr("transform", "translate(" + (width + margin.right) + ", 5)")
        // .attr("x", width + margin.right)
        // .attr("dy", "1em")
    
    dataNest.forEach(function (event, i) {
        var pair = legend.append("g")
        var label = pair.append("text")
            .attr("text-anchor", "end")
            .text(event.key);
        var dim = label.node().getBBox();
        pair.append("circle")
            .attr("transform", "translate(" + (dim.x - 5) + "," + (dim.y/4) + ")")
            .attr("r", 4)
            .attr("fill", function () { return colorAlpha(event.key) })
            .attr("stroke", function () { return color(event.key) })
        pair.attr("transform", "translate(0," + (-dim.y * i) + ")")
            .on("click", function () {
                // from https://bl.ocks.org/d3noob/08af723fe615c08f9536f656b55755b4
                // Determine if current line is visible 
                var active   = event.active ? false : true,
                newOpacity = active ? 0 : 1; 
                // Hide or show the elements based on the ID
                d3.select("#" + event.key + "-data")
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
              "translate(" + ((width + margin.right + margin.left)/2) + " ," +
                             (height + margin.top + margin.bottom) + ")")
        .style("text-anchor", "middle")
        .text("Date");

    svg.append("rect")
        .attr("class", "zoom")
        .attr("width", width)
        .attr("height", height)
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .call(zoom);

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

    function brushed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
        var s = d3.event.selection || x2.range();
        x.domain(s.map(x2.invert, x2));
        dataNest.forEach(function(d, i) {
            focus.selectAll(".bar." + d.key)
                .attr("cx", function(d) { return x(d[time]) })
                .attr("cy", function(d) { return y(d[value]); })
        });
        focus.select(".axis--x").call(xAxis);
        svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
            .scale(width / (s[1] - s[0]))
            .translate(-s[0], 0));
    }

    function zoomed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
        var t = d3.event.transform;
        x.domain(t.rescaleX(x2).domain());
        dataNest.forEach(function(d, i) {
            focus.selectAll(".bar." + d.key)
                .attr("cx", function(d) { return x(d[time]) })
                .attr("cy", function(d) { return y(d[value]); })
        });
        focus.select(".axis--x").call(xAxis);
        context.select(".brush").call(brush.move, x.range().map(t.invertX, t));
        resample(x.range().map(t.invertX, t));
    }

    var bisector = d3.bisector(function(d) { return d[time]; });
    function resample(range) {
        dataNestUnsampled.forEach(function(event, i) {
            var data = event.values;
            // Calculate visible data for main chart
            var visibleData = data.slice(
                bisector.left(data, x.invert(range[0])),
                Math.min(data.length, bisector.right(data, x.invert(range[1])))
            );

            var bucketSize = Math.ceil(visibleData.length / numBuckets);
            sampler.bucketSize(bucketSize);

            dataNest[i].values = sampler(visibleData);

            focus.select("#" + event.key + "-data").selectAll(".bar")
                .data(dataNest[i].values)
                .attr("cx", function (d) { return x(d[time]); })
                .attr("cy", function (d) { return y(d[value]); })
        // var container = d3.select(this);

        // container.select('svg.main')
        //     .datum(visibleData)
        //     .call(mainChart);

        // container.select('svg.navigator')
        //     .datum(data.navigatorData)
        //     .call(navigatorChart);

        })
    }

    // var circle = svg.append('circle')
    // .attr('r', 5);

    // var bisector = d3.bisector(function(d){ return d[time]; }).left;
    // function displayTooltip() {
    //     // reference: https://www.pshrmn.com/tutorials/d3/mouse/
    //     var coordinates = d3.mouse(this);
    //     var domainX = x.invert(coordinates[0]);
        
    //     var pos = bisector(sampledData, domainX);
    //     // get the closest smaller and larger values in the data array
    //     var smaller = sampledData[pos - 1];
    //     var larger = sampledData[pos];
    //     // figure out which one is closer to the domain value
    //     var closest = domainX - smaller[time] < larger[time] - domainX ? smaller : larger;

    //     circle
    //     .attr('cx', x(closest[time]))
    //     .attr('cy', y(closest[value]));
    // }

    // svg.select(".area")
    //     .attr("fill", "steelblue")
    //     .attr("clip-path", "url(#clip");
    // svg.select(".zoom")
    //     .attr("cursor", "move")
    //     .attr("fill", "none")
    //     .attr("pointer-events", "all")
    
}