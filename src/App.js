import React, { useState, useEffect, Component } from 'react';
import * as d3 from 'd3';
import TIPS from './data/tips.csv';


class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      all_data: {},  // All data will be stored in this single object
      numericalColumns: ["total_bill", "tip", "size"],
      categoricalColumns: ["sex", "smoker", "day", "time"],
      //defaults
      selected_numerical:"total_bill",
      selected_radio:"sex",
    };
  }

  //when the component first mounts on the page
  componentDidMount() {
    d3.csv(TIPS).then(resolved_data => {
      this.setState({all_data: resolved_data},()=>{
        this.drawBarChart();
        this.drawCorrelationMatrix();
      });
      
    }).catch(error => console.error('Error loading the data: ', error));
  }

  componentDidUpdate(prevProps, prevState){
    //parse data and draw charts
    if (prevState.selected_numerical !== this.state.selected_numerical && this.state.all_data.length > 0) {
      this.drawBarChart();
      this.drawCorrelationMatrix();
    }
  }

  drawBarChart(){
    const { all_data, selected_numerical, selected_radio } = this.state;
    
    //check for empty data
    if (!all_data.length) return;


    console.log("All data: ", all_data)
    //parse data (I don't think this was needed)
    var data = all_data.map(item => ({
      ...item,
      [selected_numerical]: parseFloat(item[selected_numerical])
    }));

    //group data
    const grouped = all_data.reduce((acc, item) => {
      //initialize the group if it doesn't already exist
      if (!acc[item[selected_radio]]) {
        acc[item[selected_radio]] = [];
      }
      //push the current items selected_numerical value to the group
      acc[item[selected_radio]].push(parseFloat(item[selected_numerical]));
      return acc;
    }, {});

    //calculate the average for each group and return as dict with averages
    const averages = Object.keys(grouped).map(key => {
      const sum = grouped[key].reduce((sum, current) => sum + current, 0);
      const average = sum / grouped[key].length;
      return { [selected_radio]: key, average };
    });

    const dayOrder = {"Mon":1, "Tues":2, "Wed":3, "Thur":4, "Fri":5, "Sat":6, "Sun":7};

    //sort days to match assignment
    if (selected_radio === "day") {
      averages.sort((a, b) => dayOrder[a.day] - dayOrder[b.day]);
    }

      //you use item.value if accessing items directly from a dict with the column name
      //however, if using a variable name to access items (selected_numerical), use item[]
    console.log("DAta: ",data)
    const margin = { top: 20, right: 20, bottom: 50, left: 60},
        width = 300,
        height = 250;

    // setting axis scales
    const x = d3.scaleBand()
        .range([0, width])
        .domain(averages.map(item => item[selected_radio]))
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(averages, d => d.average)])
        .range([height, 0]);
        
    //clear previous data
    d3.select("#bar-chart").selectAll("*").remove();

    //select the SVG area and add axes
    const svg = d3.select("#bar-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    console.log("slected: ", selected_radio)
    console.log("Averages: ", averages)

    //Create the bars
    svg.selectAll(".bar")
        .data(averages)
        .join("rect")
        .attr("class", "bar")
        .attr("x", d => x(d[selected_radio]))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.average))
        .attr("height", d => height - y(d.average))
        .attr("fill", "grey")

    svg.selectAll("text.bar")
        .data(averages)
        .join("text")
        .attr("class", "bar")
        .attr("text-anchor", "middle")     // centers the text horizontally
        .attr("x", d => x(d[selected_radio]) + x.bandwidth() / 2)    // center text
        .attr("y", d => y(d.average) + 20)    // adjust y position to be inside the bar
        .text(d => d.average.toFixed(5))    // set text to be the numerical average value


    //add the x Axis
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("path, line")
      .style("stroke", "none");

    //maximum value for the y-axis
    const maxY = d3.max(averages, d => d.average);

    //tick values at increments of 5
    var tickValues = d3.range(0, maxY + 5, 1);
    if (selected_numerical === "total_bill"){
      tickValues = d3.range(0, maxY + 5, 5);
    }
    

    //create the y-axis with specified tick values
    const yAxis = d3.axisLeft(y)
        .tickValues(tickValues)
        .tickFormat(d3.format("d")); 

    //add the y Axis
    svg.append("g")
      .call(yAxis)
      .selectAll("path, line")
      .style("stroke", "none");

    //X-axis Label
    svg.append("text")
      .attr("text-anchor", "end")
      .attr("x", width / 2)
      .attr("y", height + margin.top + 20) 
      .text([selected_radio]);

    //Y-axis Label
    svg.append("text")
      .attr("text-anchor", "end")
      .attr("transform", "rotate(-90)")
      .attr("y",-40)
      .attr("x", -60)
      .text([selected_numerical] + " (average)");

  }

  //math calculations for correlation matrix
  calculateCorrelation(data, variables) {
    const n = data.length;
    const matrix = [];
  
    //initialize matrix with arrays
    variables.forEach((variable1, i) => {
      matrix[i] = [];
      variables.forEach((variable2, j) => {
        matrix[i][j] = 0;
      });
    });
  
    //calculate correlations
    variables.forEach((variable1, i) => {
      variables.forEach((variable2, j) => {
        if (i === j) {
          matrix[i][j] = 1;  //diagonal elements are always 1 (correlation with itself)
        } else if (j > i) { //avoid redundant calculations, calculate it for only one half and mirror it
          let mean1 = 0, mean2 = 0, num = 0, den1 = 0, den2 = 0;
          data.forEach(d => {
            mean1 += (d[variable1] === undefined ? 0 : +d[variable1]) / n;
            mean2 += (d[variable2] === undefined ? 0 : +d[variable2]) / n;
          });
          data.forEach(d => {
            const x = (d[variable1] === undefined ? 0 : +d[variable1]) - mean1;
            const y = (d[variable2] === undefined ? 0 : +d[variable2]) - mean2;
            num += x * y;
            den1 += x * x;
            den2 += y * y;
          });
          const corr = num / Math.sqrt(den1 * den2);
          matrix[i][j] = corr;
          matrix[j][i] = corr; //correlation matrices have symmetric property
        }
      });
    });
  
    return matrix;
  }
  drawScatterplot(xVar, yVar) {
    console.log("Drawing Scatterplot");
    console.log("Xvar: ", xVar);
    console.log("YVar: ", yVar);
    const { all_data, numericalColumns } = this.state;
    const data = all_data;

    //setup dimensions and margins
    const margin = { top: 10, right: 30, bottom: 60, left: 60 },
        width = 1000,
        height = 400;

    //remove any existing svg to redraw the scatterplot
    d3.select("#scatterplot").selectAll("svg").remove();

    const svg = d3.select("#scatterplot")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    //background rectangle
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "#f0f0f0");  

    //maximum value for the x-axis
    const maxX = d3.max(data, d => +d[xVar]);
    //tick values at increments of 5
    var tickValues = d3.range(0, maxX + 5, 1);
    if (xVar === "total_bill"){
      tickValues = d3.range(0, maxX + 5, 10);
    }

    //add X axis
    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => +d[xVar]))
        .range([0, width]);

    ///create the x-axis with specified tick values
    const xAxis = d3.axisBottom(x)
        .tickValues(tickValues)
        .tickFormat(d3.format("d")); 

    svg.append("g")
        .attr("transform", `translate(0,${height + 5})`)
        .call(xAxis)
        .selectAll("path, line")
        .style("stroke", "none");

    //maximum value for the y-axis
    const maxY = d3.max(data, d => +d[yVar]);
    //tick values at increments of 5
    var tickValues = d3.range(0, maxY + 5, 2);
    if (yVar === "total_bill"){
      tickValues = d3.range(0, maxY + 5, 5);
    }
    //add Y axis
    const y = d3.scaleLinear()
      .domain(d3.extent(data, d => +d[yVar]))
      .range([height, 0]);

    //create the y-axis with specified tick values
    const yAxis = d3.axisLeft(y)
        .tickValues(tickValues)
        .tickFormat(d3.format("d")); 

    svg.append("g")
      .call(yAxis)
      .selectAll("path, line")
      .style("stroke", "none");

    //X-axis Label
    svg.append("text")
      .attr("text-anchor", "end")
      .attr("x", width / 2)
      .attr("y", height + margin.top + 30)
      .text(xVar);

    //Y-axis Label
    svg.append("text")
      .attr("text-anchor", "end")
      .attr("transform", "rotate(-90)")
      .attr("y",-40)
      .attr("x", -180) //this is y position?
      .text(yVar);

    //add dots
    svg.append("g")
        .selectAll("dot")
        .data(data)
        .join("circle")
        .attr("cx", d => x(+d[xVar]))
        .attr("cy", d => y(+d[yVar]))
        .attr("r", 3)
        .style("fill", "#69b3a2");
    }  

  drawCorrelationMatrix() {
    const { all_data, numericalColumns } = this.state;
  
    if (!all_data.length) return;
  
    //bind scope of drawScatterplot function, outside of everything bc this scope issues with function call
    let drawScatter = this.drawScatterplot.bind(this);
    const correlations = this.calculateCorrelation(all_data, numericalColumns);
  
    const margin = { top: 50, right: 200, bottom: 50, left: 65 },
        width = 300,
        height = 300,
        gridSize = Math.floor(width / numericalColumns.length);
  
    d3.select("#correlation-matrix").selectAll("*").remove();
  
    const svg = d3.select("#correlation-matrix")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
  
    const colorScale = d3.scaleSequential((t) => d3.interpolateHcl("#0c0c84","#ffff00")(t))
        .domain([0.5, 1]);

    //vertical gradient for legend
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "gradient-color")
      .attr("x1", "0%")
      .attr("x2", "0%")
      .attr("y1", "100%")
      .attr("y2", "0%");

    colorScale.ticks(10).forEach((t, i, n) => {
      gradient.append("stop")
        .attr("offset", `${(i / n.length * 100)}%`)
        .attr("stop-color", colorScale(t));
    });

    //append legend bar
    const legendHeight = 300;
    const legendWidth = 40;
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width + margin.right - 150}, ${margin.top - 50})`);

    legend.append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#gradient-color)")

    //add legend labels
    const legendScale = d3.scaleLinear()
      .range([legendHeight, 0])
      .domain([0.5, 1]);

    //to match assignment
    function customTickFormat(d) {
        return d % 1 === 0 ? d.toString() : d.toFixed(1);
    }

    const legendAxis = d3.axisRight(legendScale)
      .ticks(6)
      .tickFormat(customTickFormat)

    legend.append("g")
      .attr("class", "legend-axis")
      .attr("transform", `translate(${legendWidth}, 0)`)
      .call(legendAxis)
      // Remove the vertical line
      .select("path")
      .style("stroke", "none")

    //remove tick lines
    legend.selectAll(".legend-axis line")
      .style("stroke", "none");
    
    console.log("Correlations: ", correlations)
    const rows = svg.selectAll(".row")
        .data(correlations)
        .join("g")
        .attr("class", "row")
        .attr("transform", (d, i) => `translate(0,${i * gridSize})`);
  
    rows.each(function(rowData, rowIndex) {
      const cells = d3.select(this).selectAll(".cell")
        .data(rowData)
        .join("g")
        .attr("class", "cell-group")
        .attr("transform", (d, columnIndex) => `translate(${columnIndex * gridSize}, 0)`);

      cells.append("rect")
        .attr("width", gridSize)
        .attr("height", gridSize)
        .style("fill", d => colorScale(d))
        //.attr("stroke", "black")
        //.attr("stroke-width", "0.5px");
        .on("click", (event, d) => { 
          const columnIndex = Array.from(event.currentTarget.parentNode.parentNode.children).indexOf(event.currentTarget.parentNode);
          drawScatter(numericalColumns[columnIndex], numericalColumns[rowIndex])
        });


      cells.append("text")
        .text(d => parseFloat(d.toFixed(2)).toString())  //formatting to 2 decimal places, and removed trailing zeros to match assignment
        .attr("x", gridSize / 2 )
        .attr("y", gridSize / 2)
        .attr("dy", ".35em")   //vertically center
        .attr("text-anchor", "middle")    //horizontally center
        //to change the text for cells based on color value (to match assignment)
        .style("fill", d => Math.abs(d) < 0.7 ? "white" : "black")
        .style("font-size", "12px"); 
    });
  
  
    //add axes labels
    const axisLabels = numericalColumns;
    svg.selectAll(".xLabel")
      .data(axisLabels)
      .join("text")
      .text(d => d)
      .attr("x", (d, i) => i * gridSize)
      .attr("y", gridSize * 3 + 25)
      .style("text-anchor", "middle")
      .style("font-size", "14px") 
      .attr("transform", "translate(" + gridSize / 2 + ", -6)");
  
    svg.selectAll(".yLabel")
      .data(axisLabels)
      .join("text")
      .text(d => d)
      .attr("x", 0)
      .attr("y", (d, i) => i * gridSize)
      .style("text-anchor", "end")
      .style("font-size", "14px") 
      .attr("transform", "translate(-6," + gridSize/2 + ")")
      .attr("dy", ".32em");
  }
  

  render(){
    return (
      <div>
        <div className="dropdown-container">
          <div className="dropdown">
            <span className="dropdown-label">Select Target:</span>
            <select className="dropdown-select" onChange={(event)=>this.setState({selected_numerical:event.target.value})} value={this.state.selected_numerical}>
              {this.state.numericalColumns.map(column => (
                <option key={column} value={column}>{column}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="graphs">
          <div className="bar-chart-container">
            {/* Radio buttons for categorical variables */}
            <div className="radio-btns">
              {this.state.categoricalColumns.map(column => (
                  <label key={column}>
                    <input
                      type="radio"
                      value={column}
                      checked={this.state.selected_radio === column}
                      onChange={(event)=>this.setState({selected_radio:event.target.value}, this.drawBarChart)}
                    />
                    {column}
                  </label>
                ))}
              </div>
            <svg id="bar-chart" width="500" height="300"></svg>
          </div>
          <div className="correlation-matrix-container">
            <svg id="correlation-matrix" width="550" height="300"></svg>
          </div>
          <div className="scatterplot-container">
          <svg id="scatterplot" width="1100" height="450"></svg>
        </div>
        </div>
      </div>
    );
  }
}

export default Dashboard;