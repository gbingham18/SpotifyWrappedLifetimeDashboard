import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    importId: Number,
    selectedYear: Number,
    raceType: String
  }

  static targets = ["svg", "typeSelect"]

  connect() {
    this.raceTypeValue = this.raceTypeValue || "Artists"
    this.loadStreamGraph()
  }

  changeType(event) {
    this.raceTypeValue = event.target.value
    this.loadStreamGraph()
  }

  async loadStreamGraph() {
    const url = `/imports/${this.importIdValue}/summary/stream_graph_data?year=${this.selectedYearValue}&type=${this.raceTypeValue}`

    try {
      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        this.renderStreamGraph(data)
      } else {
        console.error("Error loading stream graph data:", data.error)
      }
    } catch (error) {
      console.error("Error fetching stream graph data:", error)
    }
  }

  renderStreamGraph(rawData) {
    const svg = d3.select(this.svgTarget)
    svg.selectAll("*").remove()

    const margin = { top: 20, right: 120, bottom: 30, left: 50 }
    const width = 900 - margin.left - margin.right
    const height = 500 - margin.top - margin.bottom

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Transform data
    const dates = Object.keys(rawData).sort()
    const allEntities = new Set()

    dates.forEach(date => {
      Object.keys(rawData[date]).forEach(entity => allEntities.add(entity))
    })

    // Get top 10 entities by total plays
    const entityTotals = {}
    allEntities.forEach(entity => {
      entityTotals[entity] = dates.reduce((sum, date) => {
        return sum + (rawData[date][entity] || 0)
      }, 0)
    })

    const topEntities = Object.entries(entityTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([entity]) => entity)

    // Transform data for stacking
    const dataByDate = dates.map(date => {
      const obj = { date: new Date(date) }
      topEntities.forEach(entity => {
        obj[entity] = rawData[date][entity] || 0
      })
      return obj
    })

    // Create stack
    const stack = d3.stack()
      .keys(topEntities)
      .offset(d3.stackOffsetWiggle)
      .order(d3.stackOrderInsideOut)

    const series = stack(dataByDate)

    // Scales
    const x = d3.scaleTime()
      .domain(d3.extent(dates, d => new Date(d)))
      .range([0, width])

    const y = d3.scaleLinear()
      .domain([
        d3.min(series, s => d3.min(s, d => d[0])),
        d3.max(series, s => d3.max(s, d => d[1]))
      ])
      .range([height, 0])

    const color = d3.scaleOrdinal()
      .domain(topEntities)
      .range(d3.schemeCategory10)

    // Area generator
    const area = d3.area()
      .x(d => x(d.data.date))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveBasis)

    // Draw streams
    g.selectAll(".layer")
      .data(series)
      .join("path")
      .attr("class", "layer")
      .attr("d", area)
      .attr("fill", d => color(d.key))
      .attr("opacity", 0.8)
      .on("mouseover", function(event, d) {
        d3.select(this).attr("opacity", 1)
        tooltip.style("display", "block")
          .html(`<strong>${d.key}</strong>`)
      })
      .on("mousemove", function(event) {
        tooltip.style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 0.8)
        tooltip.style("display", "none")
      })

    // Add axes
    const xAxis = d3.axisBottom(x)
      .ticks(d3.timeMonth.every(1))
      .tickFormat(d3.timeFormat("%b"))

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)

    // Add legend
    const legend = g.append("g")
      .attr("transform", `translate(${width + 10}, 0)`)

    topEntities.forEach((entity, i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`)

      legendRow.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", color(entity))
        .attr("opacity", 0.8)

      legendRow.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .attr("font-size", "11px")
        .attr("fill", "white")
        .text(entity.length > 15 ? entity.substring(0, 15) + "..." : entity)
    })

    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "streamgraph-tooltip")
      .style("position", "absolute")
      .style("display", "none")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
  }
}
